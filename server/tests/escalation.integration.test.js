import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

const enabled = process.env.CAMPUSFIX_INTEGRATION_TEST === '1';

test('scheduled escalation is idempotent and admin list is filtered and protected', { skip: !enabled }, async () => {
  const [{ default: app }, { pool }, { config }, { startEscalationScheduler }] = await Promise.all([
    import('../src/app.js'), import('../src/config/db.js'), import('../src/config/env.js'), import('../src/services/escalationScheduler.js')
  ]);
  const suffix = randomUUID();
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const users = [];
  const complaintIds = [];
  let stopScheduler = () => {};

  async function createUser(role) {
    const { rows } = await pool.query('INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id,name,role', [`Escalation ${role}`, `escalation-${role}-${suffix}@example.test`, 'integration-test-hash', role]);
    users.push(rows[0].id);
    return rows[0];
  }

  async function createComplaint(reporterId, { status = 'Submitted', daysOld = 0, priority = 'Medium', isEscalated = false } = {}) {
    const { rows } = await pool.query(`
      INSERT INTO complaints (title,description,category,location,priority,status,reporter_id,
        resolution_comment,rejection_reason,is_escalated,escalated_at,created_at)
      VALUES ($1,$2,'Electrical','Escalation Test Hall',$3,$4,$5,$6,$7,$8,
        CASE WHEN $8 THEN NOW() - INTERVAL '9 days' ELSE NULL END,
        NOW() - make_interval(days => $9::int))
      RETURNING id
    `, [`Escalation test ${suffix.slice(0, 8)}`, 'Integration fixture for overdue complaint escalation checks.', priority, status, reporterId,
      status === 'Resolved' ? 'Fixture resolved' : null, status === 'Rejected' ? 'Fixture rejected' : null, isEscalated, daysOld]);
    complaintIds.push(rows[0].id);
    return rows[0].id;
  }

  async function waitForEscalations(expectedCount) {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM complaints WHERE id=ANY($1::bigint[]) AND is_escalated=TRUE', [complaintIds]);
      if (rows[0].count >= expectedCount) return;
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    assert.fail(`Timed out waiting for ${expectedCount} complaints to be escalated.`);
  }

  try {
    const student = await createUser('student');
    const admin = await createUser('admin');
    const staff = await createUser('staff');
    const youngId = await createComplaint(student.id, { daysOld: 2 });
    const submittedId = await createComplaint(student.id, { daysOld: 9, priority: 'Critical' });
    const assignedId = await createComplaint(student.id, { status: 'Assigned', daysOld: 12, priority: 'High' });
    const inProgressId = await createComplaint(student.id, { status: 'In Progress', daysOld: 14, priority: 'Low' });
    const resolvedId = await createComplaint(student.id, { status: 'Resolved', daysOld: 20 });
    const rejectedId = await createComplaint(student.id, { status: 'Rejected', daysOld: 21 });
    const alreadyId = await createComplaint(student.id, { daysOld: 18, isEscalated: true });
    await pool.query("INSERT INTO complaint_history (complaint_id, event_type, new_value) VALUES ($1,'escalation','Escalated')", [alreadyId]);

    // The sweep timer must detect these without any dashboard request being made.
    stopScheduler = startEscalationScheduler({ thresholdDays: 7, intervalMs: 30 });
    await waitForEscalations(4);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const { rows: states } = await pool.query('SELECT id,status,is_escalated,escalated_at FROM complaints WHERE id=ANY($1::bigint[])', [complaintIds]);
    const byId = new Map(states.map((row) => [String(row.id), row]));
    assert.equal(byId.get(String(youngId)).is_escalated, false);
    for (const id of [submittedId, assignedId, inProgressId, alreadyId]) assert.equal(byId.get(String(id)).is_escalated, true);
    for (const id of [resolvedId, rejectedId]) assert.equal(byId.get(String(id)).is_escalated, false);
    const originalEscalatedAt = byId.get(String(submittedId)).escalated_at.toISOString();
    const { rows: audit } = await pool.query("SELECT COUNT(*)::int AS count FROM complaint_history WHERE complaint_id=$1 AND event_type='escalation'", [submittedId]);
    assert.equal(audit[0].count, 1);
    const { rows: alreadyAudit } = await pool.query("SELECT COUNT(*)::int AS count FROM complaint_history WHERE complaint_id=$1 AND event_type='escalation'", [alreadyId]);
    assert.equal(alreadyAudit[0].count, 1);
    assert.equal(byId.get(String(submittedId)).escalated_at.toISOString(), originalEscalatedAt);

    const studentToken = jwt.sign({ id: student.id, role: 'student', name: student.name }, config.jwtSecret);
    const adminToken = jwt.sign({ id: admin.id, role: 'admin', name: admin.name }, config.jwtSecret);
    const staffToken = jwt.sign({ id: staff.id, role: 'staff', name: staff.name }, config.jwtSecret);
    const anonymousResponse = await fetch(`${baseUrl}/complaints/escalated`);
    assert.equal(anonymousResponse.status, 401);
    const studentResponse = await fetch(`${baseUrl}/complaints/escalated`, { headers: { Authorization: `Bearer ${studentToken}` } });
    assert.equal(studentResponse.status, 403);

    const filteredResponse = await fetch(`${baseUrl}/complaints/escalated?priority=Critical&status=Submitted&sort=age_desc`, { headers: { Authorization: `Bearer ${adminToken}` } });
    assert.equal(filteredResponse.status, 200);
    const filtered = await filteredResponse.json();
    assert.equal(filtered.complaints.length, 1);
    assert.equal(String(filtered.complaints[0].id), String(submittedId));
    assert.ok(filtered.complaints[0].days_pending >= 9);
    assert.ok(filtered.complaints[0].escalated_at);

    const allResponse = await fetch(`${baseUrl}/complaints/escalated?sort=age_asc`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const all = await allResponse.json();
    const returnedIds = new Set(all.complaints.map((row) => String(row.id)));
    assert.equal(returnedIds.has(String(resolvedId)), false);
    assert.equal(returnedIds.has(String(rejectedId)), false);
    assert.equal(returnedIds.has(String(submittedId)), true);
    const fixtureOrder = all.complaints.map((row) => String(row.id)).filter((id) => [submittedId, assignedId, inProgressId, alreadyId].map(String).includes(id));
    assert.deepEqual(fixtureOrder, [submittedId, assignedId, inProgressId, alreadyId].map(String));

    // Existing assignment and staff resolution flow still works for an escalated complaint.
    const workflowId = await createComplaint(student.id, { daysOld: 10, priority: 'Medium' });
    await waitForEscalations(5);
    const assignResponse = await fetch(`${baseUrl}/complaints/${workflowId}/assign`, {
      method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId: staff.id })
    });
    assert.equal(assignResponse.status, 200);
    const progressResponse = await fetch(`${baseUrl}/complaints/${workflowId}/status`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'In Progress', comment: 'Starting the repair now.' })
    });
    assert.equal(progressResponse.status, 200);
    const resolutionResponse = await fetch(`${baseUrl}/complaints/${workflowId}/status`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Resolved', comment: 'Replaced the faulty light fitting.' })
    });
    assert.equal(resolutionResponse.status, 200);
    const { rows: workflowState } = await pool.query('SELECT status,is_escalated,escalated_at FROM complaints WHERE id=$1', [workflowId]);
    assert.equal(workflowState[0].status, 'Resolved');
    assert.equal(workflowState[0].is_escalated, true);
    assert.ok(workflowState[0].escalated_at);
    const { rows: historyEvents } = await pool.query("SELECT event_type,new_value FROM complaint_history WHERE complaint_id=$1 ORDER BY id", [workflowId]);
    assert.ok(historyEvents.some((event) => event.event_type === 'escalation'));
    assert.ok(historyEvents.some((event) => event.event_type === 'assignment'));
    assert.ok(historyEvents.some((event) => event.event_type === 'status' && event.new_value === 'Resolved'));
    const resolvedList = await fetch(`${baseUrl}/complaints/escalated`, { headers: { Authorization: `Bearer ${adminToken}` } }).then((response) => response.json());
    assert.equal(resolvedList.complaints.some((row) => String(row.id) === String(workflowId)), false);
  } finally {
    stopScheduler();
    if (complaintIds.length) await pool.query('DELETE FROM complaints WHERE id=ANY($1::bigint[])', [complaintIds]);
    if (users.length) await pool.query('DELETE FROM users WHERE id=ANY($1::bigint[])', [users]);
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
