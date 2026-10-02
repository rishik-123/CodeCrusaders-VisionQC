const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || 'Unable to complete the request.');
    error.status = response.status;
    throw error;
  }
  return payload;
}

export const authApi = {
  me: () => apiRequest('/api/auth/me'),
  login: (credentials) => apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (details) => apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify(details) }),
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
};
