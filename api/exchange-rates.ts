import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Use the REST API URL and Anon Key directly from env to avoid raw SQL TCP connection issues
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Gracefully handle missing Supabase connection in development
  if (!supabaseUrl) {
    console.warn('VITE_SUPABASE_URL is missing. Using default rates (1.0).');
    return res.status(200).json({ NGN: 1500, EUR: 0.92, GBP: 0.79 }); // Fallback defaults
  }

  try {
    // 1. Check DB for existing rates
    const { data: existingData, error: dbError } = await supabase
      .from('exchange_rates')
      .select('rates, last_updated')
      .eq('id', 'usd_rates')
      .single();

    if (dbError && dbError.code !== 'PGRST116') { // PGRST116 is "Rows not found"
      console.warn('DB check error for exchange rates:', dbError);
    }

    const existing = existingData;
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    // 2. If missing or stale, fetch from API
    if (!existing || new Date(existing.last_updated) < twelveHoursAgo) {
      const apiKey = process.env.EXCHANGERATE_API_KEY;
      if (!apiKey) {
        console.warn('EXCHANGERATE_API_KEY is not set. Using existing rates if available.');
        if (existing) return res.status(200).json(existing.rates);
        return res.status(200).json({ NGN: 1500, EUR: 0.92, GBP: 0.79 }); // Fallback Default
      }

      try {
        console.log('Fetching fresh exchange rates from ExchangeRate-API...');
        const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`);
        
        if (!response.ok) {
          throw new Error(`ExchangeRate-API responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (data.result === 'success') {
          console.log('Successfully fetched fresh rates. Updating database...');
          // Upsert into DB using Supabase REST API
          await supabase
            .from('exchange_rates')
            .upsert({ 
              id: 'usd_rates', 
              base_code: 'USD', 
              rates: data.conversion_rates, 
              last_updated: new Date().toISOString() 
            });
            
          return res.status(200).json(data.conversion_rates);
        } else {
          console.error('ExchangeRate-API returned error result:', data);
          if (existing) return res.status(200).json(existing.rates);
          return res.status(200).json({ NGN: 1500, EUR: 0.92, GBP: 0.79 }); // Fallback
        }
      } catch (fetchError) {
        console.error('Error during external API fetch:', fetchError);
        if (existing) return res.status(200).json(existing.rates);
        return res.status(200).json({ NGN: 1500, EUR: 0.92, GBP: 0.79 }); // Fallback
      }
    }

    // 3. Return existing rates
    return res.status(200).json(existing.rates);
  } catch (error) {
    console.error('Exchange rates API error:', error);
    // Return graceful fallback defaults instead of crashing client
    return res.status(200).json({ NGN: 1500, EUR: 0.92, GBP: 0.79 });
  }
}
