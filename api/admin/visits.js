const { redis } = require('../../lib/redis');
const { isAuthorized } = require('../../lib/adminAuth');

// GET /api/admin/visits
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
    const total = (await redis.get('visits:total')) || 0;

    // last 14 days of daily counts
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push(key);
    }
    const dailyCounts = await Promise.all(
      days.map((day) => redis.get(`visits:day:${day}`))
    );
    const daily = days.map((day, i) => ({
      day,
      count: Number(dailyCounts[i]) || 0,
    }));

    // most recent visits (already newest-first from lpush)
    const rawLog = await redis.lrange('visits:log', 0, 49);
    const recent = rawLog.map((item) => {
      try {
        return typeof item === 'string' ? JSON.parse(item) : item;
      } catch {
        return null;
      }
    }).filter(Boolean);

    res.status(200).json({
      total: Number(total) || 0,
      daily,
      recent,
    });
  } catch (err) {
    console.error('admin/visits error', err);
    res.status(500).json({ error: 'Failed to load visits' });
  }
};
