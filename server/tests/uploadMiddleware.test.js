import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { receiveComplaintPhoto } from '../src/middleware/complaintPhotoUpload.js';
import { errorHandler } from '../src/middleware/errors.js';
import { MAX_EVIDENCE_BYTES } from '../src/validators/evidencePhoto.js';

async function withUploadServer(run) {
  const app = express();
  app.post('/upload', receiveComplaintPhoto, (req, res) => res.json({ name: req.file?.originalname, size: req.file?.size, type: req.file?.mimetype }));
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await run(`http://127.0.0.1:${server.address().port}/upload`); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test('multipart upload middleware accepts one supported photo within the size limit', async () => {
  await withUploadServer(async (url) => {
    const form = new FormData();
    form.append('photo', new Blob([Buffer.from([0xff, 0xd8, 0xff, 0x00])], { type: 'image/jpeg' }), 'student-name.jpg');
    const response = await fetch(url, { method: 'POST', body: form });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { name: 'student-name.jpg', size: 4, type: 'image/jpeg' });
  });
});

test('multipart upload middleware rejects unsupported image types', async () => {
  await withUploadServer(async (url) => {
    const form = new FormData();
    form.append('photo', new Blob(['GIF89a'], { type: 'image/gif' }), 'not-accepted.gif');
    const response = await fetch(url, { method: 'POST', body: form });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /JPEG, PNG, or WebP/);
  });
});

test('multipart upload middleware enforces the 5 MB limit', async () => {
  await withUploadServer(async (url) => {
    const form = new FormData();
    form.append('photo', new Blob([Buffer.alloc(MAX_EVIDENCE_BYTES + 1)], { type: 'image/jpeg' }), 'large.jpg');
    const response = await fetch(url, { method: 'POST', body: form });
    assert.equal(response.status, 413);
    assert.match((await response.json()).error, /5 MB/);
  });
});
