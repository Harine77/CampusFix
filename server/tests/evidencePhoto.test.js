import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MAX_EVIDENCE_BYTES, validateEvidencePhoto } from '../src/validators/evidencePhoto.js';
import { complaintPhotoPath, removeComplaintPhoto, saveComplaintPhoto } from '../src/services/photoStorage.js';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = Buffer.from('RIFF0000WEBP', 'ascii');

test('photo validator accepts JPEG, PNG and WebP signatures that match declared types', () => {
  assert.deepEqual(validateEvidencePhoto({ mimetype: 'image/jpeg', size: jpeg.length, buffer: jpeg }), { mimeType: 'image/jpeg', extension: 'jpg' });
  assert.deepEqual(validateEvidencePhoto({ mimetype: 'image/png', size: png.length, buffer: png }), { mimeType: 'image/png', extension: 'png' });
  assert.deepEqual(validateEvidencePhoto({ mimetype: 'image/webp', size: webp.length, buffer: webp }), { mimeType: 'image/webp', extension: 'webp' });
});

test('photo validator rejects unsupported MIME, spoofed signatures, empty and oversized files', () => {
  assert.throws(() => validateEvidencePhoto({ mimetype: 'image/gif', size: 3, buffer: Buffer.from('GIF') }), { status: 400 });
  assert.throws(() => validateEvidencePhoto({ mimetype: 'image/png', size: jpeg.length, buffer: jpeg }), { status: 400 });
  assert.throws(() => validateEvidencePhoto({ mimetype: 'image/jpeg', size: 0, buffer: Buffer.alloc(0) }), { status: 400 });
  const tooLarge = Buffer.alloc(MAX_EVIDENCE_BYTES + 1);
  assert.throws(() => validateEvidencePhoto({ mimetype: 'image/jpeg', size: tooLarge.length, buffer: tooLarge }), { status: 400 });
});

test('photo storage generates a safe random name and removes the stored file', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'campusfix-photo-'));
  try {
    const filename = await saveComplaintPhoto({ buffer: png }, { extension: 'png' }, directory);
    assert.match(filename, /^[0-9a-f-]{36}\.png$/i);
    assert.deepEqual(await fs.readFile(complaintPhotoPath(filename, directory)), png);
    assert.throws(() => complaintPhotoPath('../private.png', directory));
    await removeComplaintPhoto(filename, directory);
    await assert.rejects(fs.access(path.join(directory, filename)));
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
