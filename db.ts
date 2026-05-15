import postgres from 'postgres';

// This direct connection is explicitly reserved for Database Administrator (DBA) tasks
// such as schema migrations, CREATE TABLE, and ALTER TABLE scripts during development.
// It is NOT used by the Vercel API routes to prevent serverless connection timeouts.

const sql = postgres(process.env.POSTGRES_URL || process.env.DATABASE_URL || '');

export default sql;
