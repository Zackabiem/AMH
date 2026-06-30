import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 
  (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : undefined) ||
  (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.SUPABASE_URL : undefined) ||
  (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.NEXT_PUBLIC_SUPABASE_URL : undefined) ||
  (typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_URL : undefined) ||
  (typeof process !== 'undefined' && process.env ? process.env.SUPABASE_URL : undefined) ||
  (typeof process !== 'undefined' && process.env ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined) ||
  ((typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_PROJECT_ID) ? `https://${import.meta.env.VITE_PROJECT_ID}.supabase.co` : undefined) ||
  ((typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROJECT_ID) ? `https://${import.meta.env.PROJECT_ID}.supabase.co` : undefined) ||
  ((typeof process !== 'undefined' && process.env && process.env.VITE_PROJECT_ID) ? `https://${process.env.VITE_PROJECT_ID}.supabase.co` : undefined) ||
  ((typeof process !== 'undefined' && process.env && process.env.PROJECT_ID) ? `https://${process.env.PROJECT_ID}.supabase.co` : undefined) ||
  'https://placeholder.supabase.co';

const supabaseAnonKey = 
  (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY : undefined) ||
  (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : undefined) ||
  (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.SUPABASE_ANON_KEY : undefined) ||
  (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined) ||
  (typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY : undefined) ||
  (typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_ANON_KEY : undefined) ||
  (typeof process !== 'undefined' && process.env ? process.env.SUPABASE_ANON_KEY : undefined) ||
  (typeof process !== 'undefined' && process.env ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined) ||
  'placeholder';

if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder') {
  console.warn('Supabase URL or Key is missing. Please check your environment variables.');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      storageKey: 'amh-auth-token',
      // In some environments, navigator.locks is flaky. 
      // We can't easily disable it in the default storage, 
      // but we can ensure we have a stable storage key.
    }
  }
);
