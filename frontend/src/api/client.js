import axios from 'axios'

// VITE_API_URL should be the backend root URL (no trailing slash, no /api)
// e.g. https://your-backend.up.railway.app
// Leave unset in local dev — the Vite proxy will handle /api automatically.
const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL ?? '') + '/api',
  timeout: 120000, // 2 min — LLM calls can take time
  headers: { 'Content-Type': 'application/json' },
})

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nykaa_auth_token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const login = (username, password) =>
  api.post('/auth/login', { username, password }).then(r => r.data)

export const register = (username, password) =>
  api.post('/auth/register', { username, password }).then(r => r.data)

export const logout = () =>
  api.post('/auth/logout').then(r => r.data)

export const authMe = () =>
  api.get('/auth/me').then(r => r.data)

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const checkHealth = () => api.get('/health').then(r => r.data)

export const loadDefault = () =>
  api.post('/load-default').then(r => r.data)

export const uploadCsv = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/upload-csv', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export const getSchema = () =>
  api.get('/schema').then(r => r.data)

export const runQuery = (question, sessionId) =>
  api.post('/query', { question, session_id: sessionId }).then(r => r.data)

export const clearHistory = () =>
  api.post('/clear-history').then(r => r.data)

// ─── Models ───────────────────────────────────────────────────────────────────

export const getModels = () =>
  api.get('/models').then(r => r.data)

export const setModel = (model) =>
  api.post('/set-model', { model }).then(r => r.data)

// ─── Suggestions ──────────────────────────────────────────────────────────────

export const getSuggestions = () =>
  api.get('/suggestions').then(r => r.data)

// ─── Chat Sessions ────────────────────────────────────────────────────────────

export const getChatSessions = () =>
  api.get('/sessions').then(r => r.data)

export const getChatSessionMessages = (sessionId) =>
  api.get(`/sessions/${sessionId}/messages`).then(r => r.data)

export const deleteChatSession = (sessionId) =>
  api.delete(`/sessions/${sessionId}`).then(r => r.data)

// ─── User History (legacy) ────────────────────────────────────────────────────

export const getUserHistory = () =>
  api.get('/history').then(r => r.data)

export default api
