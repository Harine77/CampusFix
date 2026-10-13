export class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function notFound(_req, _res, next) { next(new AppError(404, 'The requested resource was not found.')); }

export function errorHandler(error, _req, res, _next) {
  if (error.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' });
  if (error.code === '23503' || error.code === '23514' || error.code === '22P02') return res.status(400).json({ error: 'The submitted information is invalid.' });
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong. Please try again.' : error.message });
}
