import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import 'dotenv/config';

if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in server/.env first.');
const here = path.dirname(fileURLToPath(import.meta.url));
const schema = await fs.readFile(path.resolve(here, '../../../database/schema.sql'), 'utf8');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try { await pool.query(schema); console.log('CampusFix schema is ready.'); }
finally { await pool.end(); }
