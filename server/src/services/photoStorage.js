import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
export const complaintPhotoDirectory = path.resolve(moduleDirectory, '../../uploads/complaints');
const generatedFilenamePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

export async function saveComplaintPhoto(file, imageFormat, directory = complaintPhotoDirectory) {
  await fs.mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}.${imageFormat.extension}`;
  await fs.writeFile(path.join(directory, filename), file.buffer, { flag: 'wx', mode: 0o600 });
  return filename;
}

export function complaintPhotoPath(filename, directory = complaintPhotoDirectory) {
  if (typeof filename !== 'string' || !generatedFilenamePattern.test(filename)) throw new Error('Invalid stored complaint photo name.');
  return path.join(directory, filename);
}

export async function removeComplaintPhoto(filename, directory = complaintPhotoDirectory) {
  await fs.unlink(complaintPhotoPath(filename, directory));
}

export function photoMimeType(filename) {
  const extension = path.extname(filename).toLowerCase();
  return extension === '.jpg' ? 'image/jpeg' : extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : null;
}
