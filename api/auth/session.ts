import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from '../../lib/redis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { userId } = req.query;

  if (req.method === 'GET') {
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    
    try {
      if (!redis) return res.status(503).json({ error: 'Redis not configured' });
      
      const session = await redis.get(`session:${userId}`);
      return res.status(200).json({ session });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    const { userId, session } = req.body;
    if (!userId || !session) return res.status(400).json({ error: 'User ID and session required' });

    try {
      if (!redis) return res.status(503).json({ error: 'Redis not configured' });
      
      // Store session for 7 days
      await redis.setex(`session:${userId}`, 7 * 24 * 60 * 60, session);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
