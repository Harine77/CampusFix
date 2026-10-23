import multer from 'multer';
import { ValidationError } from './errors.js';
import { MAX_EVIDENCE_BYTES } from '../validators/evidencePhoto.js';

const acceptedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const receiveSinglePhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_EVIDENCE_BYTES, files: 1, fields: 8, fieldSize: 6000 },
  fileFilter: (_req, file, callback) => {
    if (!acceptedMimeTypes.has(file.mimetype)) return callback(new ValidationError('Photo evidence must be a JPEG, PNG, or WebP image.'));
    callback(null, true);
  }
}).single('photo');

export function receiveComplaintPhoto(req, res, next) {
  receiveSinglePhoto(req, res, next);
}
