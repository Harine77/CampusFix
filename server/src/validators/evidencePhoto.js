import { ValidationError } from '../middleware/errors.js';

export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;

const supportedTypes = {
  'image/jpeg': { extension: 'jpg', matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  'image/png': { extension: 'png', matches: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { extension: 'webp', matches: (buffer) => buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' }
};

export function validateEvidencePhoto(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) throw new ValidationError('The uploaded photo could not be read.');
  if (file.size > MAX_EVIDENCE_BYTES || file.buffer.length > MAX_EVIDENCE_BYTES) throw new ValidationError('Photo evidence must be 5 MB or smaller.');
  if (file.size === 0 || file.buffer.length === 0) throw new ValidationError('The uploaded photo is empty.');

  const format = supportedTypes[file.mimetype];
  if (!format) throw new ValidationError('Photo evidence must be a JPEG, PNG, or WebP image.');
  if (!format.matches(file.buffer)) throw new ValidationError('The photo content does not match its declared image type.');
  return { mimeType: file.mimetype, extension: format.extension };
}
