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
  const cacheKey = `products_feed:${category}:${search}:${pageNum}:${limitNum}`;

  try {
    // 2. Use our Read-Through Caching utility
    const { data: products, cached } = await getCachedDataWithStatus(cacheKey, async () => {
      console.log(`[DB DIRECT] Fetching products for key: ${cacheKey}`);
      
      try {
        const searchPattern = search ? `%${search}%` : null;
        
        // Using common table expressions or direct joins is much more efficient in direct Postgres
        const data = await sql`
          SELECT 
            p.*,
            s.currency
          FROM products p
          LEFT JOIN stores s ON p.store_id = s.id
          WHERE p.store_is_locked = false
          ${category !== 'All' && category !== 'Favorites' ? sql`AND p.category = ${category}` : sql``}
          ${search ? sql`AND (p.title ILIKE ${searchPattern} OR p.description ILIKE ${searchPattern})` : sql``}
          ORDER BY p.is_promoted DESC, p.created_at DESC
          LIMIT ${limitNum} OFFSET ${offset}
        `;

        // Map snake_case to camelCase
        return (data || []).map((p: any) => ({
          id: p.id,
          sellerId: p.seller_id,
          sellerName: p.seller_name,
          storeId: p.store_id,
          storeName: p.store_name,
          title: p.title,
          description: p.description,
          price: p.price,
          category: p.category,
          location: p.location,
          images: p.images,
          rating: p.rating,
          reviewCount: p.review_count,
          trustScore: p.trust_score,
          isPromoted: p.is_promoted,
          deliveryAvailable: p.delivery_available,
          likes: p.likes,
          tags: p.tags,
          quantity: p.quantity,
          sku: p.sku,
          createdAt: p.created_at,
          currency: p.currency || 'NGN'
        }));
      } catch (dbError) {
        console.error('Direct DB Error:', dbError);
        throw dbError;
      }
    }, 60); // Cache for 60 seconds

    return res.status(200).json({
      products: products || [],
      cached,
      count: products?.length || 0
    });
  } catch (error: any) {
    console.error('API Error in products/feed:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
