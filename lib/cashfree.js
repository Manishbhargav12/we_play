const crypto = require('crypto');

function baseUrl() {
  return process.env.CASHFREE_ENV === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-version': '2023-08-01',
    'x-client-id': process.env.CASHFREE_APP_ID,
    'x-client-secret': process.env.CASHFREE_SECRET_KEY,
  };
}

// Verifies the `x-webhook-signature` header Cashfree sends with every
// webhook call, so you know the request really came from Cashfree
// and not someone spoofing a "payment successful" POST.
// Docs: https://www.cashfree.com/docs/payments/online/webhooks
function verifyWebhookSignature(rawBody, timestamp, signature) {
  const secret = process.env.CASHFREE_SECRET_KEY;
  const signedPayload = timestamp + rawBody;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('base64');
  return expected === signature;
}

module.exports = { baseUrl, authHeaders, verifyWebhookSignature };
