import sql from './db.ts';

async function run() {
  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS afro_credits NUMERIC DEFAULT 0;`;
    
    await sql`
      CREATE TABLE IF NOT EXISTS credit_transactions (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT REFERENCES users(id),
          amount NUMERIC NOT NULL,
          type TEXT NOT NULL, -- 'purchase', 'top_up', 'spend', 'bonus'
          description TEXT,
          reference_id TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Add properties lat and lng
    await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS lat NUMERIC;`;
    await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS lng NUMERIC;`;

    console.log('Migration successful: Added afro_credits to users and created credit_transactions');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

run();
