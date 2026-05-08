import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../utils/constants';

const TOKEN_KEY = 'pharmachain_jwt';

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-attach stored JWT to every request
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (_) {}
  return config;
});

// ── Token helpers ───────────────────────────────────────────
export const saveToken  = (token) => SecureStore.setItemAsync(TOKEN_KEY, token);
export const getToken   = ()      => SecureStore.getItemAsync(TOKEN_KEY);
export const deleteToken= ()      => SecureStore.deleteItemAsync(TOKEN_KEY);

// ── Auth ────────────────────────────────────────────────────
export const authLogin    = (data) => api.post('/api/auth/login', data);
export const authRegister = (data) => api.post('/api/auth/register', data);

// ── Drugs ───────────────────────────────────────────────────
export const getDrugs   = ()         => api.get('/api/drugs');
export const getDrug    = (id)       => api.get(`/api/drugs/${id}`);
export const addDrug    = (data)     => api.post('/api/drugs', data);
export const updateDrug = (id, data) => api.put(`/api/drugs/${id}`, data);
export const deleteDrug = (id)       => api.delete(`/api/drugs/${id}`);

// ── QR ──────────────────────────────────────────────────────
export const generateQR     = (drugId, jwtToken) =>
  api.get(`/api/qr/${drugId}`, { params: { token: jwtToken } });
export const verifyQR       = (data) => api.post('/api/verify', data);
export const getQuotaStatus = ()     => api.get('/api/qr/quota-status');
export const resetQuota     = (data) => api.post('/api/qr/reset-quota', data);

// ── Transactions / Blockchain ───────────────────────────────
export const transferDrug  = (data)   => api.post('/api/transaction/transfer', data);
export const getChain      = ()       => api.get('/api/transaction/chain');
export const getHistory    = (drugId) => api.get(`/api/transaction/history/${drugId}`);
export const verifyChain   = ()       => api.get('/api/transaction/verify-chain');

// ── Audit ───────────────────────────────────────────────────
export const getAuditLogs = () => api.get('/api/audit');

// ── Error helper ─────────────────────────────────────────────
export const getErrorMessage = (err) => {
  if (err?.response?.data) {
    const d = err.response.data;
    if (typeof d === 'string') return d;
    if (d.message)  return d.message;
    if (d.title)    return d.title;
  }
  if (err?.message === 'Network Error') return 'Cannot connect to server';
  return err?.message ?? 'Unknown error';
};

export default api;
