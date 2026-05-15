import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const raw = fs.readFileSync('src/lib/supabase.ts', 'utf-8');
const urlMatch = raw.match(/supabaseUrl = '(.*?)'/);
const keyMatch = raw.match(/supabaseAnonKey = '(.*?)'/);

const url = urlMatch ? urlMatch[1] : process.env.VITE_SUPABASE_URL;
const key = keyMatch ? keyMatch[1] : process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url || '', key || '');

async function check() {
  const { data, error } = await supabase.from('orders').select('*').overlaps('seller_ids', ['some-store-id']);
  if (error) {
    console.error('Error details:', error);
  } else {
    console.log('Success overlaps query:', data);
  }
}
check();
