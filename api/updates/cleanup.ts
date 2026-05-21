import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl) {
    return res.status(200).json({ message: 'No Supabase URL configured, skipping cleanup', deletedCount: 0 });
  }

  try {
    // 1. Find all expired updates
    const { data: expiredUpdates, error: fetchError } = await supabase
      .from('store_updates')
      .select('id, media_public_id, media_type')
      .lte('expires_at', new Date().toISOString());

    if (fetchError) throw fetchError;

    if (!expiredUpdates || expiredUpdates.length === 0) {
      return res.status(200).json({ message: 'No expired updates found', deletedCount: 0 });
    }

    // 2. Delete media from Cloudinary
    const deletePromises = expiredUpdates
      .filter((update: any) => update.media_public_id)
      .map((update: any) => {
        const resourceType = update.media_type === 'video' ? 'video' : 'image';
        return cloudinary.uploader.destroy(update.media_public_id, { resource_type: resourceType })
          .catch(err => console.error(`Failed to delete Cloudinary asset ${update.media_public_id}:`, err));
      });

    await Promise.all(deletePromises);

    // 3. Delete from database
    const expiredIds = expiredUpdates.map((u: any) => u.id);
    const { error: deleteError } = await supabase
      .from('store_updates')
      .delete()
      .in('id', expiredIds);

    if (deleteError) throw deleteError;

    return res.status(200).json({ 
      message: 'Cleanup successful', 
      deletedCount: expiredIds.length 
    });
  } catch (error) {
    console.error('Error during status cleanup:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
