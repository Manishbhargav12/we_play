const { redis } = require('../../lib/redis');
const { baseUrl, authHeaders } = require('../../lib/cashfree');

// POST /api/payment/create-order
// body: {
//   amount: 449,                 // rupees, matches the gold package price
//   packageName: "3000 Gold",
//   customerName: "Manish Bhargav",
//   customerPhone: "9999999999",
//   customerEmail: "you@example.com"   // optional
// }
//
// Returns: { orderId, paymentSessionId }
// The frontend passes paymentSessionId into the Cashfree JS SDK to
// open the checkout UI (see public/checkout.html).
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { amount, packageName, customerName, customerPhone, customerEmail } = req.body || {};

  if (!amount || Number(amount) <= 0) {
    res.status(400).json({ error: 'A valid amount is required' });
    return;
  }
  if (!customerPhone) {
    res.status(400).json({ error: 'customerPhone is required' });
    return;
  }

  const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const customerId = `cust_${customerPhone}`;

  const payload = {
    order_id: orderId,
    order_amount: Number(amount),
    order_currency: 'INR',
    customer_details: {
      customer_id: customerId,
      customer_name: customerName || 'Customer',
      customer_phone: customerPhone,
      customer_email: customerEmail || 'customer@example.com',
    },
    order_meta: {
      // Cashfree redirects the customer's browser here after checkout.
      // {order_id} is replaced automatically by Cashfree.
      return_url: `${process.env.SITE_URL}/payment-status.html?order_id={order_id}`,
      notify_url: `${process.env.SITE_URL}/api/payment/webhook`,
    },
    order_note: packageName || '',
  };

  try {
    const response = await fetch(`${baseUrl()}/orders`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Cashfree create order failed', data);
      res.status(response.status).json({ error: data.message || 'Cashfree order creation failed' });
      return;
    }

    // Save a lightweight record so the admin dashboard / webhook can
    // look the order up later. Status starts as PENDING and gets
    // updated by the webhook once Cashfree confirms payment.
    await redis.set(
      `order:${orderId}`,
      JSON.stringify({
        orderId,
        amount: Number(amount),
        packageName: packageName || '',
        customerName: customerName || '',
        customerPhone,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      })
    );
    await redis.lpush('orders:log', orderId);
    await redis.ltrim('orders:log', 0, 499);

    res.status(200).json({
      orderId,
      paymentSessionId: data.payment_session_id,
    });
  } catch (err) {
    console.error('create-order error', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
};
