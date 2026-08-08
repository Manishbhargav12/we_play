const { Redis } = require('@upstash/redis');

// Reads UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN from env.
// If you connected Upstash through the Vercel "Storage" tab, these
// are injected automatically — no code changes needed.
const redis = Redis.fromEnv();

module.exports = { redis };
