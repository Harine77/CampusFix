import app from './app.js';
import { config } from './config/env.js';
import { pool } from './config/db.js';

const server = app.listen(config.port, () => console.log(`CampusFix API listening on http://localhost:${config.port}`));
async function shutdown() { server.close(async () => { await pool.end(); process.exit(0); }); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
