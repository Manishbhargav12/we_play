const { redis } = require('../../lib/redis');
const { isAuthorized } = require('../../lib/adminAuth');

// GET /api/admin/orders
// Header required: x-admin-password: <ADMIN_PASSWORD>
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isAuthorized(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const orderIds = await redis.lrange('orders:log', 0, 99);
    const rawOrders = await Promise.all(
      orderIds.map((id) => redis.get(`order:${id}`))
    );
    const orders = rawOrders
      .map((o) => {
        if (!o) return null;
        try {
          return typeof o === 'string' ? JSON.parse(o) : o;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    res.status(200).json({ orders });
  } catch (err) {
    console.error('admin/orders error', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
};
