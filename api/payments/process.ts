import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!supabaseUrl) {
    return res.status(500).json({ error: 'Database connection missing. Please configure VITE_SUPABASE_URL' });
  }

  console.log("Payment process request received:", req.body);
  const { targetId, targetType, amount, sellerId, accountNumber } = req.body;

  if (!targetId || !targetType || !amount || !sellerId) {
    console.warn("Payment process failed: Missing required fields", req.body);
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    let targetData;

    if (targetType === 'store') {
      const { data: stores, error } = await supabase.from('stores').select('*').eq('id', targetId);
      if (error || !stores || stores.length === 0) {
        console.warn(`Payment process failed: Store not found for id ${targetId}`);
        return res.status(404).json({ error: "Store not found" });
      }
      targetData = stores[0];
      if (targetData.owner_id !== sellerId) {
        console.warn(`Payment process failed: Unauthorized. Store owner ${targetData.owner_id} !== sellerId ${sellerId}`);
        return res.status(403).json({ error: "Unauthorized" });
      }
    } else if (targetType === 'user') {
      const { data: users, error } = await supabase.from('users').select('*').eq('id', targetId);
      if (error || !users || users.length === 0) {
        console.warn(`Payment process failed: User not found for id ${targetId}`);
        return res.status(404).json({ error: "User not found" });
      }
      targetData = users[0];
      if (targetData.id !== sellerId) {
        console.warn(`Payment process failed: Unauthorized. User id ${targetData.id} !== sellerId ${sellerId}`);
        return res.status(403).json({ error: "Unauthorized" });
      }
    } else {
      console.warn(`Payment process failed: Invalid target type ${targetType}`);
      return res.status(400).json({ error: "Invalid target type" });
    }

    const currentDebt = Number(targetData.total_debt) || 0;
    const newDebt = Math.max(0, currentDebt - amount);
    const threshold = Number(targetData.lock_threshold) || 50;
    const isLocked = newDebt >= threshold;

    // Update target status
    if (targetType === 'store') {
      await supabase
        .from('stores')
        .update({ total_debt: newDebt, is_locked: isLocked, updated_at: new Date().toISOString() })
        .eq('id', targetId);
    } else {
      await supabase
        .from('users')
        .update({ total_debt: newDebt, is_locked: isLocked, updated_at: new Date().toISOString() })
        .eq('id', targetId);
    }

    // Create ledger entry
    const description = accountNumber 
      ? `Manual payment of $${amount.toFixed(2)} from account ${accountNumber}`
      : `Payment of $${amount.toFixed(2)} received`;

    await supabase.from('commission_ledger').insert({
      target_id: targetId,
      target_type: targetType,
      type: 'payment',
      amount: amount,
      description: description,
      created_at: new Date().toISOString()
    });

    // If store/user is unlocked, update associated listings
    if (!isLocked && targetData.is_locked) {
      if (targetType === 'store') {
        await supabase
          .from('products')
          .update({ store_is_locked: false, updated_at: new Date().toISOString() })
          .eq('store_id', targetId);
      } else if (targetType === 'user') {
        await supabase
          .from('properties')
          .update({ owner_is_locked: false, updated_at: new Date().toISOString() })
          .eq('owner_id', targetId);
      }
    }

    console.log(`Payment processed successfully for ${targetType} ${targetId}. New debt: ${newDebt}`);
    return res.status(200).json({ 
      success: true, 
      newDebt, 
      isLocked,
      targetId 
    });
  } catch (error: any) {
    console.error("Payment processing error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
