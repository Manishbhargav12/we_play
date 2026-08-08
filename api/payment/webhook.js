const { redis } = require('../../lib/redis');
const { verifyWebhookSignature } = require('../../lib/cashfree');

// Cashfree signs the RAW request body, so we must read it before any
// JSON parsing happens — hence bodyParser is turned off below.
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// POST /api/payment/webhook
// Configure this exact URL in the Cashfree dashboard under
// Developers -> Webhooks, and it's also passed as `notify_url`
// on every order created in create-order.js.
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];

    if (!signature || !timestamp) {
      res.status(400).send('Missing signature headers');
      return;
    }

    const isValid = verifyWebhookSignature(rawBody, timestamp, signature);
    if (!isValid) {
      console.warn('Cashfree webhook signature mismatch');
      res.status(401).send('Invalid signature');
      return;
    }

    const event = JSON.parse(rawBody);
    const orderId = event?.data?.order?.order_id;
    const paymentStatus = event?.data?.payment?.payment_status; // e.g. SUCCESS, FAILED

    if (orderId) {
      const existingRaw = await redis.get(`order:${orderId}`);
      const existing = existingRaw
        ? typeof existingRaw === 'string'
          ? JSON.parse(existingRaw)
          : existingRaw
        : {};

      await redis.set(
        `order:${orderId}`,
        JSON.stringify({
          ...existing,
          status: paymentStatus || existing.status || 'UNKNOWN',
          updatedAt: new Date().toISOString(),
        })
      );
    }

    // Cashfree just needs a 200 to know the webhook was received.
    res.status(200).send('ok');
  } catch (err) {
    console.error('webhook error', err);
    res.status(500).send('error');
  }
};
