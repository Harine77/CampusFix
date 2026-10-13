import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistration } from '../src/validators/auth.js';
import { validateComplaint, validateComment, validatePriority } from '../src/validators/complaints.js';

test('registration trims and normalizes account data without accepting a role field', () => {
  const result = validateRegistration({ name: '  Mira Patel ', email: ' MIRA@EXAMPLE.EDU ', password: 'correct-horse-1', role: 'admin' });
  assert.deepEqual(result, { name: 'Mira Patel', email: 'mira@example.edu', password: 'correct-horse-1' });
});

test('registration rejects weak passwords and malformed email addresses', () => {
  assert.throws(() => validateRegistration({ name: 'Mira', email: 'mira@example.edu', password: 'short' }), { status: 400 });
  assert.throws(() => validateRegistration({ name: 'Mira', email: 'not-an-email', password: 'long-enough-password' }), { status: 400 });
});

test('complaint validator accepts a complete report and trims its text', () => {
  assert.deepEqual(validateComplaint({ title: '  Broken desk  ', description: '  A desk leg has come loose in the lecture hall.  ', category: 'Furniture', location: '  Arts Block  ' }), {
    title: 'Broken desk', description: 'A desk leg has come loose in the lecture hall.', category: 'Furniture', location: 'Arts Block'
  });
});

test('complaint validator rejects unsupported categories and incomplete descriptions', () => {
  assert.throws(() => validateComplaint({ title: 'Broken desk', description: 'Short', category: 'Other thing', location: 'Arts Block' }), { status: 400 });
  assert.throws(() => validateComplaint({ title: 'Broken desk', description: 'Short', category: 'Furniture', location: 'Arts Block' }), { status: 400 });
});

test('priority and progress comments are constrained', () => {
  assert.equal(validatePriority('Critical'), 'Critical');
  assert.throws(() => validatePriority('Urgent'), { status: 400 });
  assert.throws(() => validateComment(' '), { status: 400 });
  assert.equal(validateComment(' Work has started. '), 'Work has started.');
});
