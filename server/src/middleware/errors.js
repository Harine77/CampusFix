export class AppError extends Error {
  constructor(status, message, { code = 'APP_ERROR', cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace?.(this, new.target);
  }
}

// Specific errors inherit from AppError so callers can communicate intent
// while the HTTP boundary still handles every expected failure consistently.
export class ValidationError extends AppError {
  constructor(message, options) { super(400, message, { ...options, code: 'VALIDATION_ERROR' }); }
}
export class AuthenticationError extends AppError {
  constructor(message, options) { super(401, message, { ...options, code: 'AUTHENTICATION_ERROR' }); }
}
export class AuthorizationError extends AppError {
  constructor(message, options) { super(403, message, { ...options, code: 'AUTHORIZATION_ERROR' }); }
}
export class NotFoundError extends AppError {
  constructor(message, options) { super(404, message, { ...options, code: 'NOT_FOUND' }); }
}
export class ConflictError extends AppError {
  constructor(message, options) { super(409, message, { ...options, code: 'CONFLICT' }); }
}

// FACTORY PATTERN: callers ask for an HTTP error by status; this factory
// returns the matching typed error so the error handler gets consistent metadata.
export function createHttpError(status, message, options = {}) {
  const errorTypes = {
    400: ValidationError,
    401: AuthenticationError,
    403: AuthorizationError,
    404: NotFoundError,
    409: ConflictError
  };
  const ErrorType = errorTypes[status];
  return ErrorType ? new ErrorType(message, options) : new AppError(status, message, options);
}

export function notFound(_req, _res, next) { next(new NotFoundError('The requested resource was not found.')); }

export function errorHandler(error, _req, res, _next) {
  // Translate known PostgreSQL/parser failures into safe application errors.
  if (error.code === '23505') error = createHttpError(409, 'An account with this email already exists.', { cause: error });
  else if (['23503', '23514', '22P02'].includes(error.code)) error = createHttpError(400, 'The submitted information is invalid.', { cause: error });
  else if (error.type === 'entity.parse.failed') error = createHttpError(400, 'The request body contains invalid JSON.', { cause: error });
  else if (error.type === 'entity.too.large') error = createHttpError(413, 'The request body is too large.', { code: 'PAYLOAD_TOO_LARGE', cause: error });

  if (!(error instanceof AppError)) {
    console.error(error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
  if (error.status >= 500) console.error(error);
  return res.status(error.status).json({ error: error.status >= 500 ? 'Something went wrong. Please try again.' : error.message });
}
