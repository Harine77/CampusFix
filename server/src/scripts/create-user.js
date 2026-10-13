import readline from 'node:readline/promises';
import { emitKeypressEvents } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import 'dotenv/config';

const role = process.argv[2];
if (!['admin', 'staff'].includes(role)) throw new Error('Run this script through npm run admin:create or npm run staff:create.');
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in server/.env first.');
const rl = readline.createInterface({ input, output });
try {
  const name = (await rl.question(`${role === 'admin' ? 'Administrator' : 'Staff member'} name: `)).trim();
  const email = (await rl.question('Email: ')).trim().toLowerCase();
  rl.close();
  if (!input.isTTY) throw new Error('Run account provisioning from an interactive terminal so the password can be entered privately.');
  emitKeypressEvents(input);
  input.setRawMode(true);
  input.resume();
  output.write('Password (8–72 characters): ');
  const password = await new Promise((resolve) => {
    let value = '';
    const onKey = (character, key = {}) => {
      if (key.ctrl && key.name === 'c') { input.setRawMode(false); process.exit(130); }
      if (key.name === 'return' || key.name === 'enter') {
        input.off('keypress', onKey);
        input.setRawMode(false);
        output.write('\n');
        resolve(value);
      } else if (key.name === 'backspace') {
        value = value.slice(0, -1);
      } else if (!key.ctrl && character && value.length < 72) {
        value += character;
      }
    };
    input.on('keypress', onKey);
  });
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 72) throw new Error('Invalid name, email, or password length.');
  const hash = await bcrypt.hash(password, 12);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query('INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id,email,role', [name,email,hash,role]);
    console.log(`${role} account ${rows[0].email} created (ID ${rows[0].id}).`);
  } finally { await pool.end(); }
} finally { rl.close(); if (input.isTTY && input.isRaw) input.setRawMode(false); }
