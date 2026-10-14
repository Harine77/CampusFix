import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { findUserByEmail, createUser } from '../models/authModel.js';
import { AuthenticationError } from '../middleware/errors.js';
import { validateRegistration } from '../validators/auth.js';

const publicUser = ({ password_hash, ...user }) => user;
function issueToken(user) { return jwt.sign({ id: user.id, role: user.role, name: user.name }, config.jwtSecret, { expiresIn: config.jwtExpiresIn, issuer: 'campusfix' }); }

export async function register(body) {
  const input = validateRegistration(body);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await createUser({ ...input, passwordHash });
  return { user, token: issueToken(user) };
}

export async function login(body) {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const user = await findUserByEmail(email);
  if (!user || !await bcrypt.compare(password, user.password_hash)) throw new AuthenticationError('Email or password is incorrect.');
  return { user: publicUser(user), token: issueToken(user) };
}
