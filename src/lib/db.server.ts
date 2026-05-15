import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

/**
 * Direct PostgreSQL client using the 'postgres' library.
 * This should ONLY be used in server-side code (API routes, server.ts).
 */
export const sql = postgres(databaseUrl, {
  ssl: 'require', 
  max: 10,
  idle_timeout: 20,
  connect_timeout: 30,
});

export default sql;
