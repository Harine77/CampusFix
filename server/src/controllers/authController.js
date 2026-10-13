import * as auth from '../services/authService.js';

export async function register(req, res) { res.status(201).json(await auth.register(req.body)); }
export async function login(req, res) { res.json(await auth.login(req.body)); }
export async function me(req, res) { const { id, role, name } = req.user; res.json({ user: { id, role, name } }); }
