import * as model from '../models/complaintModel.js';
import { AppError } from '../middleware/errors.js';
import { validateComplaint, validatePriority, validateComment } from '../validators/complaints.js';

const idValue = (raw) => { const value = Number(raw); if (!Number.isSafeInteger(value) || value < 1) throw new AppError(400, 'Invalid complaint ID.'); return value; };

export async function create(body, user) { return model.createComplaint(validateComplaint(body), user.id); }
export async function list(query, user) { return model.listComplaints(user, query); }
export async function detail(rawId, user) {
  const id = idValue(rawId); const row = await model.getComplaint(id);
  if (!row) throw new AppError(404, 'Complaint not found.');
  if (user.role === 'student' && row.reporter_id !== user.id || user.role === 'staff' && row.assigned_staff_id !== user.id) throw new AppError(403, 'You do not have permission to view this complaint.');
  return row;
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
