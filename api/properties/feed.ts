import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../src/lib/db.server';
import { getCachedDataWithStatus } from '../../lib/redis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { category = 'All', search = '', page = '1', limit = '8' } = req.query;
  
  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 8;
  const offset = (pageNum - 1) * limitNum;

  // 1. Create a unique cache key based on query parameters
  const cacheKey = `properties_feed:${category}:${search}:${pageNum}:${limitNum}`;

  try {
    // 2. Use our Read-Through Caching utility
    const { data: properties, cached } = await getCachedDataWithStatus(cacheKey, async () => {
      console.log(`[DB DIRECT] Fetching properties for key: ${cacheKey}`);
      
      try {
        const searchPattern = search ? `%${search}%` : null;

        // Perform efficient join with users for owner details
        const data = await sql`
          SELECT 
            p.*,
            jsonb_build_object(
              'display_name', u.display_name,
              'username', u.username,
              'photo_url', u.photo_url
            ) as owner
          FROM properties p
          LEFT JOIN users u ON p.owner_id = u.id
          WHERE p.owner_is_locked = false
          ${category !== 'All' ? sql`AND p.type = ${category}` : sql``}
          ${search ? sql`AND (p.title ILIKE ${searchPattern} OR p.location ILIKE ${searchPattern})` : sql``}
          ORDER BY p.created_at DESC
          LIMIT ${limitNum} OFFSET ${offset}
        `;

        return data || [];
      } catch (dbError) {
        console.error('Direct DB Error:', dbError);
        throw dbError;
      }
    }, 60); // Cache for 60 seconds

    return res.status(200).json({
      properties: properties || [],
      cached,
      count: properties?.length || 0
    });
  } catch (error: any) {
    console.error('API Error in properties/feed:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
