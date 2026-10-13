import pg from 'pg';
import { config } from './env.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl });
pool.on('error', (error) => console.error('Unexpected database pool error', error));

export async function inTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
