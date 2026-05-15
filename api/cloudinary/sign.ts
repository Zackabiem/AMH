import { v2 as cloudinary } from 'cloudinary';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Configure Cloudinary with environment variables
  cloudinary.config({
    cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  try {
    const { folder = 'general' } = req.body || {};
    const timestamp = Math.round((new Date).getTime() / 1000);
    
    // Parameters to sign
    const paramsToSign = {
      timestamp,
      folder,
    };

    // Generate the signature securely on the backend
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET as string
    );

    return res.status(200).json({
      signature,
      timestamp,
      folder,
      cloudName: process.env.VITE_CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    });
  } catch (error: any) {
    console.error("Cloudinary signature error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
