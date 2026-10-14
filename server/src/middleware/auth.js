import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AuthenticationError, AuthorizationError } from './errors.js';

export function authenticate(req, _res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new AuthenticationError('Please sign in to continue.'));
  try { req.user = jwt.verify(token, config.jwtSecret); next(); }
  catch { next(new AuthenticationError('Your session has expired. Please sign in again.')); }
}

export function allowRoles(...roles) {
  return (req, _res, next) => roles.includes(req.user?.role) ? next() : next(new AuthorizationError('You do not have permission to do that.'));
}
