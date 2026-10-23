import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';

const enabled = process.env.CAMPUSFIX_INTEGRATION_TEST === '1';

test('complaint photo access and duplicate confirmation work through Express and PostgreSQL', { skip: !enabled }, async () => {
  const [{ default: app }, { pool }, { removeComplaintPhoto }] = await Promise.all([
    import('../src/app.js'),
    import('../src/config/db.js'),
    import('../src/services/photoStorage.js')
  ]);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const suffix = randomUUID();
  const users = [];
  const complaints = [];

  async function register(label) {
    const response = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Evidence ${label}`, email: `campusfix-${label}-${suffix}@example.test`, password: 'feature-test-password' })
    });
    assert.equal(response.status, 201);
    const result = await response.json();
    users.push(result.user.id);
    return result.token;
  }

  function reportForm({ photo = false, confirm = false, title = 'Projector lamp flickering in Hall 7', description = 'The projector lamp flickers during lectures in the north hall room seven and the image disappears.', category = 'Classroom Equipment', location = 'North Hall, Room 7' } = {}) {
    const form = new FormData();
    form.set('title', title);
    form.set('description', description);
    form.set('category', category);
    form.set('location', location);
    if (confirm) form.set('confirmDuplicates', 'true');
    if (photo) form.append('photo', new Blob([Buffer.from([0xff, 0xd8, 0xff, 0x01])], { type: 'image/jpeg' }), 'student-file-name.jpg');
    return form;
  }

  async function create(token, form) {
    return fetch(`${baseUrl}/complaints`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  }

  try {
    const firstToken = await register('first');
    const spoofedForm = reportForm();
    spoofedForm.append('photo', new Blob(['this is not an image'], { type: 'image/jpeg' }), 'spoof.jpg');
    const spoofedResponse = await create(firstToken, spoofedForm);
    assert.equal(spoofedResponse.status, 400);
    assert.match((await spoofedResponse.json()).error, /does not match/);

    const firstResponse = await create(firstToken, reportForm({ photo: true }));
    assert.equal(firstResponse.status, 201);
    const firstCreated = await firstResponse.json();
    const firstId = firstCreated.complaint.id;
    complaints.push(firstId);
    assert.equal(firstCreated.complaint.has_photo, true);

    const photoResponse = await fetch(`${baseUrl}/complaints/${firstId}/photo`, { headers: { Authorization: `Bearer ${firstToken}` } });
    assert.equal(photoResponse.status, 200);
    assert.equal(photoResponse.headers.get('content-type'), 'image/jpeg');
    assert.deepEqual(Buffer.from(await photoResponse.arrayBuffer()), Buffer.from([0xff, 0xd8, 0xff, 0x01]));
    const secondToken = await register('second');
    const forbiddenPhoto = await fetch(`${baseUrl}/complaints/${firstId}/photo`, { headers: { Authorization: `Bearer ${secondToken}` } });
    assert.equal(forbiddenPhoto.status, 403);

    const warningResponse = await create(secondToken, reportForm());
    assert.equal(warningResponse.status, 200);
    const warning = await warningResponse.json();
    assert.equal(warning.duplicates.length, 1);
    assert.equal(String(warning.duplicates[0].id), String(firstId));
    assert.equal(warning.duplicates[0].title, 'Projector lamp flickering in Hall 7');
    assert.equal(warning.duplicates[0].location, 'North Hall, Room 7');
    assert.equal(warning.duplicates[0].status, 'Submitted');
    assert.equal('description' in warning.duplicates[0], false);
    assert.equal('reporter_name' in warning.duplicates[0], false);

    const continuedResponse = await create(secondToken, reportForm({ confirm: true }));
    assert.equal(continuedResponse.status, 201);
    const continued = await continuedResponse.json();
    complaints.push(continued.complaint.id);

    await pool.query("UPDATE complaints SET status='Resolved', resolution_comment='Integration cleanup' WHERE id=$1", [firstId]);
    await pool.query("UPDATE complaints SET status='Rejected', rejection_reason='Integration cleanup' WHERE id=$1", [continued.complaint.id]);
    const resolvedWarningResponse = await create(secondToken, reportForm());
    assert.equal(resolvedWarningResponse.status, 200);
    const resolvedWarning = await resolvedWarningResponse.json();
    assert.equal(resolvedWarning.duplicates.length, 1);
    assert.equal(String(resolvedWarning.duplicates[0].id), String(firstId));
    assert.equal(resolvedWarning.duplicates[0].status, 'Resolved');

    const afterResolvedConfirmation = await create(secondToken, reportForm({ confirm: true }));
    assert.equal(afterResolvedConfirmation.status, 201);
    complaints.push((await afterResolvedConfirmation.json()).complaint.id);

    const furnitureReport = { title: 'Broken chair support in Annex 12', description: 'The chair leg is cracked and makes the seat unsafe to use in the annex study room.', category: 'Furniture', location: 'Annex 12, Study Room' };
    const rejectedFixtureResponse = await create(secondToken, reportForm(furnitureReport));
    assert.equal(rejectedFixtureResponse.status, 201);
    const rejectedFixture = await rejectedFixtureResponse.json();
    complaints.push(rejectedFixture.complaint.id);
    await pool.query("UPDATE complaints SET status='Rejected', rejection_reason='Integration cleanup' WHERE id=$1", [rejectedFixture.complaint.id]);
    const rejectedOnlyResponse = await create(secondToken, reportForm(furnitureReport));
    assert.equal(rejectedOnlyResponse.status, 201);
    complaints.push((await rejectedOnlyResponse.json()).complaint.id);
  } finally {
    if (complaints.length) {
      const photos = await pool.query('SELECT photo_filename FROM complaints WHERE id=ANY($1::bigint[]) AND photo_filename IS NOT NULL', [complaints]);
      await Promise.allSettled(photos.rows.map(({ photo_filename }) => removeComplaintPhoto(photo_filename)));
      await pool.query('DELETE FROM complaints WHERE id=ANY($1::bigint[])', [complaints]);
    }
    if (users.length) await pool.query('DELETE FROM users WHERE id=ANY($1::bigint[])', [users]);
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
