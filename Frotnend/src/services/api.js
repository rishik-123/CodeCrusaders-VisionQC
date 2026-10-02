export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export async function apiRequest(path, options = {}) {
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...options.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || 'Unable to complete the request.');
    error.status = response.status;
    error.payload = payload;
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

export const productApi = {
  createProduct: (data) => apiRequest('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  getProducts: () => apiRequest('/api/products'),
  getProductById: (id) => apiRequest(`/api/products/${encodeURIComponent(id)}`),
  updateProduct: (id, data) => apiRequest(`/api/products/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => apiRequest(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export const dashboardApi = {
  get: () => apiRequest('/api/dashboard'),
};

export const copilotApi = {
  status: () => apiRequest('/api/copilot/status'),
  chat: (data) => apiRequest('/api/copilot/chat', { method: 'POST', body: JSON.stringify(data) }),
  conversations: () => apiRequest('/api/copilot/conversations'),
  conversation: (id) => apiRequest(`/api/copilot/conversations/${encodeURIComponent(id)}`),
  deleteConversation: (id) => apiRequest(`/api/copilot/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export const referenceApi = {
  createSession: (productId) => apiRequest('/api/reference-images/sessions', {
    method: 'POST', body: JSON.stringify({ product_id: productId }),
  }),
  captureImage: (sessionId, imageNumber, image) => {
    const form = new FormData();
    form.append('imageNumber', String(imageNumber));
    form.append('image', image, `image_${String(imageNumber).padStart(2, '0')}.jpg`);
    return apiRequest(`/api/reference-images/sessions/${encodeURIComponent(sessionId)}/capture`, { method: 'POST', body: form });
  },
  getSession: (sessionId) => apiRequest(`/api/reference-images/sessions/${encodeURIComponent(sessionId)}`),
  getProductSessions: (productId) => apiRequest(`/api/reference-images/products/${encodeURIComponent(productId)}`),
  completeSession: (sessionId) => apiRequest(`/api/reference-images/sessions/${encodeURIComponent(sessionId)}/complete`, { method: 'POST' }),
  cancelSession: (sessionId) => apiRequest(`/api/reference-images/sessions/${encodeURIComponent(sessionId)}/cancel`, { method: 'POST' }),
  imageUrl: (sessionId, imageId) => `${API_BASE_URL}/api/reference-images/sessions/${encodeURIComponent(sessionId)}/images/${encodeURIComponent(imageId)}`,
};
