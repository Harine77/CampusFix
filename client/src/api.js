const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
let token = null;
export const setToken = (value) => { token = value; };
export async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { if (response.status === 401) window.dispatchEvent(new Event('campusfix:unauthorized')); throw new Error(data.error || 'Request failed. Please try again.'); }
  return data;
}
export const api = {
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  complaints: (params = {}) => request(`/complaints?${new URLSearchParams(params)}`),
  complaint: (id) => request(`/complaints/${id}`),
  create: (body) => request('/complaints', { method: 'POST', body: JSON.stringify(body) }),
  assign: (id, staffId) => request(`/complaints/${id}/assign`, { method: 'POST', body: JSON.stringify({ staffId }) }),
  reject: (id, reason) => request(`/complaints/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  priority: (id, priority) => request(`/complaints/${id}/priority`, { method: 'PATCH', body: JSON.stringify({ priority }) }),
  status: (id, status, comment) => request(`/complaints/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, comment }) }),
  dashboard: () => request('/complaints/dashboard'),
  staff: () => request('/complaints/staff')
};
