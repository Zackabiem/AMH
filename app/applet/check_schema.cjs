const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const raw = fs.readFileSync('src/lib/supabase.ts', 'utf-8');
const urlMatch = raw.match(/supabaseUrl = '(.*?)'/);
const keyMatch = raw.match(/supabaseAnonKey = '(.*?)'/);

const url = urlMatch ? urlMatch[1] : process.env.VITE_SUPABASE_URL;
const key = keyMatch ? keyMatch[1] : process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('orders').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Columns:', data.length > 0 ? Object.keys(data[0]) : 'no data');
  }
}
check();
