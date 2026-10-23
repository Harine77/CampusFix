import test from 'node:test';
import assert from 'node:assert/strict';
import { duplicateDecision, findSimilarComplaints, normalizeKeywords } from '../src/domain/duplicateDetection.js';
import { canAccessComplaint } from '../src/domain/complaintAccess.js';

const report = {
  category: 'Electrical',
  title: 'Ceiling light flickering',
  description: 'The lamp flickers throughout evening classes in block A.',
  location: 'North Block, Room 204'
};

test('duplicate matcher normalizes punctuation/case and scores similar unresolved reports', () => {
  const matches = findSimilarComplaints(report, [{
    id: '31', category: 'Electrical', title: 'Ceiling light flickering!',
    description: 'The lamp flickers throughout evening classes in block A',
    location: 'north block room 204', status: 'In Progress', reporter_name: 'Private Name'
  }]);
  assert.equal(matches.length, 1);
  assert.deepEqual(Object.keys(matches[0]).sort(), ['id', 'location', 'similarity', 'status', 'title']);
  assert.equal(matches[0].id, '31');
  assert.equal(matches[0].similarity, 1);
  assert.deepEqual(normalizeKeywords('NORTH Block, Room 204!'), ['north', 'block', 'room', '204']);
});

test('duplicate matcher includes resolved reports for confirmation but excludes rejected and unrelated reports', () => {
  const base = { id: '32', title: report.title, description: report.description, category: 'Electrical', location: report.location };
  const candidates = [
    { ...base, status: 'Resolved' },
    { ...base, id: '33', status: 'Rejected' },
    { ...base, id: '34', category: 'Plumbing', status: 'Submitted' },
    { ...base, id: '35', location: 'South Campus, Cafeteria', status: 'Submitted' }
  ];
  const matches = findSimilarComplaints(report, candidates);
  assert.deepEqual(matches.map(({ id, status }) => ({ id, status })), [{ id: '32', status: 'Resolved' }]);
});

test('duplicate gate warns first and permits explicit student continuation', () => {
  const matches = findSimilarComplaints(report, [{
    id: '31', category: 'Electrical', title: report.title, description: report.description,
    location: report.location, status: 'Submitted'
  }]);
  assert.equal(duplicateDecision(matches, false), 'warn');
  assert.equal(duplicateDecision(matches, true), 'create');
  assert.equal(duplicateDecision([], false), 'create');
});

test('complaint access policy limits photo/detail visibility to reporter, assignee, or admin', () => {
  const complaint = { reporter_id: '12', assigned_staff_id: '28' };
  assert.equal(canAccessComplaint(complaint, { id: 12, role: 'student' }), true);
  assert.equal(canAccessComplaint(complaint, { id: 13, role: 'student' }), false);
  assert.equal(canAccessComplaint(complaint, { id: 28, role: 'staff' }), true);
  assert.equal(canAccessComplaint(complaint, { id: 29, role: 'staff' }), false);
  assert.equal(canAccessComplaint(complaint, { id: 1, role: 'admin' }), true);
  assert.equal(canAccessComplaint(complaint, { id: 1, role: 'guest' }), false);
});
