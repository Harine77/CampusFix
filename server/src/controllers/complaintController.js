import * as complaints from '../services/complaintService.js';
import { createReadStream } from 'node:fs';
import { AppError } from '../middleware/errors.js';

export async function create(req, res) {
  const result = await complaints.create(req.body, req.user, req.file);
  if (result.duplicates) return res.status(200).json({ duplicates: result.duplicates });
  return res.status(201).json({ complaint: result.complaint });
}
export async function list(req, res) { res.json({ complaints: await complaints.list(req.query, req.user) }); }
export async function detail(req, res) { res.json({ complaint: await complaints.detail(req.params.id, req.user) }); }
export async function photo(req, res, next) {
  try {
    const evidence = await complaints.complaintPhoto(req.params.id, req.user);
    res.type(evidence.mimeType).set('Cache-Control', 'private, no-store');
    const stream = createReadStream(evidence.path);
    stream.on('error', (error) => {
      if (res.headersSent) return res.destroy(error);
      next(error.code === 'ENOENT' ? new AppError(404, 'Photo evidence is unavailable.') : error);
    });
    stream.pipe(res);
  } catch (error) { next(error); }
}
export async function assign(req, res) { res.json(await complaints.assign(req.params.id, req.body, req.user)); }
export async function updateStatus(req, res) { res.json(await complaints.changeStatus(req.params.id, req.body, req.user)); }
export async function reject(req, res) { res.json(await complaints.reject(req.params.id, req.body, req.user)); }
export async function updatePriority(req, res) { res.json(await complaints.priority(req.params.id, req.body, req.user)); }
export async function dashboard(_req, res) { res.json({ dashboard: await complaints.getDashboard() }); }
export async function escalated(req, res) { res.json({ complaints: await complaints.escalated(req.query) }); }
export async function staff(_req, res) { res.json({ staff: await complaints.getStaff() }); }
