import { Redis } from '@upstash/redis';

const cleanEnv = (val: string | undefined) => val?.replace(/^["']|["']$/g, '').trim();

const url = cleanEnv(process.env.UPSTASH_REDIS_REST_URL);
const token = cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN);

// Initialize Redis only if credentials are provided.
// This allows the app to run locally or before you add the secrets.
export const redis = (() => {
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch (error) {
    console.error('Failed to initialize Upstash Redis:', error);
    return null;
  }
})();

/**
 * A utility function for Read-Through Caching.
 * 
 * @param key The unique cache key (e.g., 'market_feeds_page_1')
 * @param fetcher The database query to run if the cache is empty
 * @param ttlSeconds Time to live in seconds (default: 60)
 * @returns The data (either from cache or fresh from the database)
 */
export async function getCachedData<T>(
  key: string, 
  fetcher: () => Promise<T>, 
  ttlSeconds: number = 60
): Promise<T> {
  // 1. If Redis isn't configured yet, bypass cache and go straight to DB
  if (!redis) {
    console.warn(`Upstash Redis not configured. Bypassing cache for key: ${key}`);
    return fetcher();
  }

  try {
    // 2. Check the cache
    const cached = await redis.get<T>(key);
    if (cached) {
      console.log(`Cache HIT for key: ${key}`);
      return cached;
    }

    // 3. Cache Miss: Fetch from database
    console.log(`Cache MISS for key: ${key}. Fetching from DB...`);
    const data = await fetcher();

    // 4. Save to cache in the background (don't await it to keep response fast)
    redis.setex(key, ttlSeconds, data).catch(err => 
      console.error(`Failed to set cache for key: ${key}`, err)
    );

    return data;
  } catch (error) {
    // Fallback: If Redis crashes or times out, still return the DB data so the app doesn't break
    console.error('Redis cache error:', error);
    return fetcher(); 
  }
}

export async function getCachedDataWithStatus<T>(
  key: string, 
  fetcher: () => Promise<T>, 
  ttlSeconds: number = 60
): Promise<{ data: T; cached: boolean }> {
  if (!redis) {
    return { data: await fetcher(), cached: false };
  }

  try {
    const cached = await redis.get<T>(key);
    if (cached) {
      console.log(`Cache HIT for key: ${key}`);
      return { data: cached, cached: true };
    }

    console.log(`Cache MISS for key: ${key}. Fetching from DB...`);
    const data = await fetcher();

    redis.setex(key, ttlSeconds, data).catch(err => 
      console.error(`Failed to set cache for key: ${key}`, err)
    );

    return { data, cached: false };
  } catch (error) {
    console.error('Redis cache error:', error);
    return { data: await fetcher(), cached: false }; 
  }
}

/**
 * A utility function to invalidate/delete a cache key.
 * Use this when data changes (e.g., a user adds a new product).
 */
export async function invalidateCache(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
    console.log(`Cache INVALIDATED for key: ${key}`);
  } catch (error) {
    console.error(`Failed to invalidate cache for key: ${key}`, error);
  }
}
