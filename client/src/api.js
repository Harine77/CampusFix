const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
let token = null;
export const setToken = (value) => { token = value; };

// OOP example: a typed API exception keeps HTTP context alongside the message.
export class ApiError extends Error {
  constructor(message, { status = null, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function request(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: { ...(!isFormData ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
    });
  } catch (cause) {
    throw new ApiError('Cannot reach the CampusFix API. Check that the server is running and the API URL is correct.', { cause });
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('campusfix:unauthorized'));
    throw new ApiError(data.error || 'Request failed. Please try again.', { status: response.status });
  }
  return data;
}

export async function requestBlob(path) {
  let response;
  try {
    response = await fetch(`${API}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch (cause) {
    throw new ApiError('Cannot reach the CampusFix API. Check that the server is running and the API URL is correct.', { cause });
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) window.dispatchEvent(new Event('campusfix:unauthorized'));
    throw new ApiError(data.error || 'The requested photo could not be loaded.', { status: response.status });
  }
  return response.blob();
}

export const api = {
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  complaints: (params = {}) => request(`/complaints?${new URLSearchParams(params)}`),
  complaint: (id) => request(`/complaints/${id}`),
  photo: (id) => requestBlob(`/complaints/${id}/photo`),
  // Complaint creation accepts FormData so optional photo evidence and form fields
  // reach Express/Multer together. request() selects the matching content type.
  create: (body) => request('/complaints', { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  assign: (id, staffId) => request(`/complaints/${id}/assign`, { method: 'POST', body: JSON.stringify({ staffId }) }),
  reject: (id, reason) => request(`/complaints/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  priority: (id, priority) => request(`/complaints/${id}/priority`, { method: 'PATCH', body: JSON.stringify({ priority }) }),
  status: (id, status, comment) => request(`/complaints/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, comment }) }),
  dashboard: () => request('/complaints/dashboard'),
  escalatedComplaints: (params = {}) => request(`/complaints/escalated?${new URLSearchParams(params)}`),
  staff: () => request('/complaints/staff')
};
