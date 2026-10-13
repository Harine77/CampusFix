import { AppError } from '../middleware/errors.js';

export function validateRegistration(body) {
  const { name, email, password } = body;
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) throw new AppError(400, 'Enter a name between 2 and 100 characters.');
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new AppError(400, 'Enter a valid email address.');
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) throw new AppError(400, 'Password must be 8–72 characters.');
  return { name: name.trim(), email: email.trim().toLowerCase(), password };
}
