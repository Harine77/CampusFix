import * as model from '../models/complaintModel.js';
import { AppError } from '../middleware/errors.js';
import { priorities, validateComplaint, validatePriority, validateComment } from '../validators/complaints.js';
import { validateEvidencePhoto } from '../validators/evidencePhoto.js';
import { findSimilarComplaints, duplicateDecision } from '../domain/duplicateDetection.js';
import { canAccessComplaint } from '../domain/complaintAccess.js';
import { complaintPhotoPath, photoMimeType, removeComplaintPhoto, saveComplaintPhoto } from './photoStorage.js';

const idValue = (raw) => { const value = Number(raw); if (!Number.isSafeInteger(value) || value < 1) throw new AppError(400, 'Invalid complaint ID.'); return value; };

export async function create(body, user, file) {
  const input = validateComplaint(body);
  const imageFormat = file ? validateEvidencePhoto(file) : null;
  const candidates = await model.findDuplicateCandidates(input.category);
  const duplicates = findSimilarComplaints(input, candidates);
  const confirmed = body.confirmDuplicates === true || body.confirmDuplicates === 'true';
  if (duplicateDecision(duplicates, confirmed) === 'warn') return { duplicates };

  let photoFilename = null;
  if (file) photoFilename = await saveComplaintPhoto(file, imageFormat);
  try {
    return { complaint: await model.createComplaint(input, user.id, photoFilename) };
  } catch (error) {
    if (photoFilename) {
      try { await removeComplaintPhoto(photoFilename); }
      catch (cleanupError) { console.error('Could not remove unreferenced complaint photo.', cleanupError); }
    }
    throw error;
  }
}
export async function list(query, user) { return model.listComplaints(user, query); }

function assertComplaintAccess(complaint, user) {
  if (!canAccessComplaint(complaint, user)) {
    throw new AppError(403, 'You do not have permission to view this complaint.');
  }
}

export async function detail(rawId, user) {
  const id = idValue(rawId); const row = await model.getComplaint(id);
  if (!row) throw new AppError(404, 'Complaint not found.');
  assertComplaintAccess(row, user);
  return row;
}

export async function complaintPhoto(rawId, user) {
  const record = await model.getComplaintPhotoRecord(idValue(rawId));
  if (!record) throw new AppError(404, 'Complaint not found.');
  assertComplaintAccess(record, user);
  if (!record.photo_filename) throw new AppError(404, 'This complaint has no photo evidence.');
  const mimeType = photoMimeType(record.photo_filename);
  if (!mimeType) throw new AppError(404, 'Photo evidence is unavailable.');
  return { path: complaintPhotoPath(record.photo_filename), mimeType };
}
export async function assign(rawId, body, user) {
  const staffId = Number(body.staffId); if (!Number.isSafeInteger(staffId) || staffId < 1) throw new AppError(400, 'Choose a staff member.');
  if (!/^\d+$/.test(String(body.staffId))) throw new AppError(400, 'Choose a staff member.');
  const result = await model.assignComplaint(idValue(rawId), staffId, user.id);
  if (!result) throw new AppError(404, 'Complaint not found.');
  if (result.invalidStaff) throw new AppError(400, 'Choose an active maintenance staff member.');
  if (result.invalidStatus) throw new AppError(409, 'Resolved or rejected complaints cannot be assigned.');
  return { ok: true };
}
export async function changeStatus(rawId, body, user) {
  if (!['In Progress', 'Resolved'].includes(body.status)) throw new AppError(400, 'Choose a valid next status.');
  const comment = validateComment(body.comment, body.status === 'Resolved' ? 'Resolution note' : 'Progress note');
  const result = await model.updateStatus(idValue(rawId), user.id, user.id, body.status, comment);
  if (result.missing) throw new AppError(404, 'Complaint not found.');
  if (result.forbidden) throw new AppError(403, 'Only the assigned staff member can update this complaint.');
  if (result.invalidStatus) throw new AppError(409, `This complaint cannot move from ${result.current} to ${body.status}.`);
  return { ok: true };
}
export async function reject(rawId, body, user) {
  const reason = validateComment(body.reason, 'Rejection reason');
  const result = await model.rejectComplaint(idValue(rawId), user.id, reason);
  if (result.missing) throw new AppError(404, 'Complaint not found.');
  if (result.invalidStatus) throw new AppError(409, 'Resolved or rejected complaints cannot be rejected.');
  return { ok: true };
}
export async function priority(rawId, body, user) {
  const ok = await model.updatePriority(idValue(rawId), user.id, validatePriority(body.priority));
  if (!ok) throw new AppError(404, 'Complaint not found.');
  return { ok: true };
}
export const getDashboard = () => model.dashboard();
export const getStaff = () => model.listStaff();

export async function escalated(filters = {}) {
  const statuses = ['Submitted', 'Assigned', 'In Progress'];
  if (filters.priority && !priorities.includes(filters.priority)) throw new AppError(400, 'Choose a valid priority filter.');
  if (filters.status && !statuses.includes(filters.status)) throw new AppError(400, 'Choose a valid active status filter.');
  const sort = filters.sort || 'age_desc';
  if (!['age_desc', 'age_asc'].includes(sort)) throw new AppError(400, 'Choose a valid age sort.');
  return model.listEscalatedComplaints({ priority: filters.priority, status: filters.status, sort });
}
