import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  const value = import.meta.env[key] || (typeof process !== 'undefined' ? process.env[key] : undefined);
  return (value === 'undefined' || value === 'null') ? undefined : value;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 
  ((getEnv('VITE_PROJECT_ID') || getEnv('PROJECT_ID')) ? `https://${getEnv('VITE_PROJECT_ID') || getEnv('PROJECT_ID')}.supabase.co` : 'https://placeholder.supabase.co');

const supabaseAnonKey = getEnv('VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY') || 
  getEnv('VITE_SUPABASE_ANON_KEY') || 
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
