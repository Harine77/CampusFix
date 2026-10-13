import * as complaints from '../services/complaintService.js';

export async function create(req, res) { res.status(201).json({ complaint: await complaints.create(req.body, req.user) }); }
export async function list(req, res) { res.json({ complaints: await complaints.list(req.query, req.user) }); }
export async function detail(req, res) { res.json({ complaint: await complaints.detail(req.params.id, req.user) }); }
export async function assign(req, res) { res.json(await complaints.assign(req.params.id, req.body, req.user)); }
export async function updateStatus(req, res) { res.json(await complaints.changeStatus(req.params.id, req.body, req.user)); }
export async function reject(req, res) { res.json(await complaints.reject(req.params.id, req.body, req.user)); }
export async function updatePriority(req, res) { res.json(await complaints.priority(req.params.id, req.body, req.user)); }
export async function dashboard(_req, res) { res.json({ dashboard: await complaints.getDashboard() }); }
export async function staff(_req, res) { res.json({ staff: await complaints.getStaff() }); }
