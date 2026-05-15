import { Redis } from '@upstash/redis';
import { redis } from '../../lib/redis';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!redis) {
      return res.status(200).json({ message: 'Redis not configured, no cache to clear' });
    }

    const keys = await redis.keys('properties_feed:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Cleared ${keys.length} property feed cache keys`);
    }

    return res.status(200).json({ message: 'Cache cleared successfully', clearedCount: keys.length });
  } catch (error: any) {
    console.error('Error clearing cache:', error);
    return res.status(500).json({ error: 'Failed to clear cache', details: error.message });
  }
}
