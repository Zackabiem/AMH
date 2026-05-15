import fs from 'fs';
import sql from './db.ts';

async function migrate() {
  try {
    console.log('Reading migration file...');
    const schemaSql = fs.readFileSync('supabase_logistics_schema.sql', 'utf8');
    console.log('Running migration...');
    // Execute raw SQL using postgres library
    await sql.unsafe(schemaSql);
    console.log('Migration successful: Logistics schema created');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
