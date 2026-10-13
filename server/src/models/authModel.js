import { pool } from '../config/db.js';

export async function findUserByEmail(email) {
  const { rows } = await pool.query('SELECT id, name, email, password_hash, role FROM users WHERE email = $1', [email]);
  return rows[0];
}
export async function createUser({ name, email, passwordHash }) {
  const { rows } = await pool.query("INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'student') RETURNING id, name, email, role", [name, email, passwordHash]);
  return rows[0];
}
