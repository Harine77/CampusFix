import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AppError,
  AuthenticationError,
  ConflictError,
  createHttpError,
  NotFoundError,
  ValidationError,
  errorHandler
} from '../src/middleware/errors.js';
import { canTransitionStatus } from '../src/domain/complaintWorkflow.js';

function captureResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('specific application errors inherit common status and safe metadata', () => {
  const error = new ValidationError('Invalid title.');
  assert.ok(error instanceof AppError);
  assert.equal(error.name, 'ValidationError');
  assert.equal(error.status, 400);
  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.equal(error.isOperational, true);
  assert.equal(new AuthenticationError('Sign in.').status, 401);
  assert.equal(new NotFoundError('Missing.').status, 404);
  assert.equal(new ConflictError('Duplicate.').status, 409);
});

test('HTTP error factory creates the matching typed error', () => {
  const error = createHttpError(403, 'Forbidden.');
  assert.ok(error instanceof AppError);
  assert.equal(error.name, 'AuthorizationError');
  assert.equal(error.status, 403);
  assert.equal(createHttpError(413, 'Too large.').status, 413);
});

test('status transition strategy allows only the defined next step', () => {
  assert.equal(canTransitionStatus('Assigned', 'In Progress'), true);
  assert.equal(canTransitionStatus('In Progress', 'Resolved'), true);
  assert.equal(canTransitionStatus('Assigned', 'Resolved'), false);
  assert.equal(canTransitionStatus('Resolved', 'In Progress'), false);
  assert.equal(canTransitionStatus('Rejected', 'Resolved'), false);
});

test('error handler returns safe client messages for known parsing and database failures', () => {
  for (const [error, expectedStatus, expectedMessage] of [
    [{ type: 'entity.parse.failed', message: 'parser detail' }, 400, 'The request body contains invalid JSON.'],
    [{ type: 'entity.too.large', message: 'parser detail' }, 413, 'The request body is too large.'],
    [{ code: '23505', detail: 'private database detail' }, 409, 'An account with this email already exists.']
  ]) {
    const response = captureResponse();
    errorHandler(error, {}, response, () => {});
    assert.equal(response.statusCode, expectedStatus);
    assert.deepEqual(response.body, { error: expectedMessage });
  }
});

test('error handler hides unexpected internal error details', () => {
  const response = captureResponse();
  const originalError = console.error;
  console.error = () => {};
  try {
    errorHandler(new Error('database password or SQL detail'), {}, response, () => {});
  } finally {
    console.error = originalError;
  }
  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { error: 'Something went wrong. Please try again.' });
});
