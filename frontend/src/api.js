import axios from 'axios';
import { clearAccessKey, getAccessKey } from './security.js';

// In production (Netlify), VITE_API_URL is empty and Netlify's redirect
// proxy handles /api/* → Railway backend. In dev, Vite proxy does the same.
// If you ever want to point directly at a backend URL, set VITE_API_URL.
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const accessKey = getAccessKey();
  if (accessKey) config.headers['X-CareerOS-Key'] = accessKey;
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      clearAccessKey();
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const getJobs      = (params = {}) => api.get('/jobs', { params });
export const getJob       = (id) => api.get(`/jobs/${id}`);
export const scoreJob     = (id) => api.post(`/jobs/${id}/score`);
export const createPacket = (id) => api.post(`/jobs/${id}/packet`);
export const approveJob   = (id, notes) => api.post(`/jobs/${id}/approve`, { notes });
export const rejectJob    = (id, notes) => api.post(`/jobs/${id}/reject`,  { notes });
export const saveJob      = (id, notes) => api.post(`/jobs/${id}/save`,    { notes });
export const selfApplied  = (id, notes) => api.post(`/jobs/${id}/self-applied`, { notes });
export const ingestSample = () => api.post('/jobs/ingest/sample');
export const triggerScan  = () => api.post('/jobs/scan');

// ── Packets ───────────────────────────────────────────────────────────────────
export const getPackets = () => api.get('/packets');
export const getPacket  = (id) => api.get(`/packets/${id}`);

// ── Logs ──────────────────────────────────────────────────────────────────────
export const getLogs = (params = {}) => api.get('/logs', { params });

// ── Health ────────────────────────────────────────────────────────────────────
export const getHealth = () => axios.get('/health');

export default api;
