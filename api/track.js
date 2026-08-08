const { redis } = require('../lib/redis');

// POST /api/track
// body: { page: "/index.html", referrer: "" }
// Called from every page you want counted (see public/track-snippet.js).
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = req.body || {};
    const page = typeof body.page === 'string' ? body.page.slice(0, 200) : '/';
    const referrer = typeof body.referrer === 'string' ? body.referrer.slice(0, 300) : '';

    const ip =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    const userAgent = (req.headers['user-agent'] || '').slice(0, 300);

    const now = new Date();
    const day = now.toISOString().slice(0, 10); // YYYY-MM-DD

    const entry = {
      ts: now.toISOString(),
      page,
      referrer,
      ip,
      userAgent,
    };

    await Promise.all([
      redis.incr('visits:total'),
      redis.incr(`visits:day:${day}`),
      redis.incr(`visits:page:${page}`),
      redis.lpush('visits:log', JSON.stringify(entry)),
    ]);

    // Keep the raw log from growing forever — last 500 visits is plenty
    // for a small dashboard. Increase if you want a longer history.
    await redis.ltrim('visits:log', 0, 499);

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('track error', err);
    res.status(500).json({ error: 'Failed to record visit' });
  }
};
