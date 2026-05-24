import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config';

async function getBaseUrl() {
  const saved = await AsyncStorage.getItem('api_base');
  return saved || API_BASE;
}

async function headers(withAuth = true) {
  const h = { 'Content-Type': 'application/json' };
  if (withAuth) {
    const token = await AsyncStorage.getItem('token');
    if (token) h['Authorization'] = `Bearer ${token}`;
  }
  return h;
}

async function request(path, options = {}) {
  const base = await getBaseUrl();
  const url  = `${base}${path}`;
  const h    = await headers(options.auth !== false);
  const res  = await fetch(url, { ...options, headers: h });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ── Auth ──────────────────────────────────────────────────────
export const login = (username, password) =>
  request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    auth: false,
  });

// ── Drugs ─────────────────────────────────────────────────────
export const getDrugs  = ()    => request('/api/drugs/');
export const getDrug   = (id)  => request(`/api/drugs/${id}`);
export const addDrug   = (body)=> request('/api/drugs/', { method: 'POST', body: JSON.stringify(body) });
export const deleteDrug= (id)  => request(`/api/drugs/${id}`, { method: 'DELETE' });

// ── Transactions ──────────────────────────────────────────────
export const transferDrug   = (body) => request('/api/transaction/transfer', { method: 'POST', body: JSON.stringify(body) });
export const getChain       = (id)   => request(`/api/transaction/chain/${id}`);
export const getRecentTrans = ()     => request('/api/transaction/recent');
export const getRiskAnalysis= (id)   => request(`/api/transaction/risk-analysis/${id}`);
export const getSupplyAdvisor= ()    => request('/api/transaction/supply-advisor');
export const tamperChain    = (id)   => request(`/api/transaction/tamper/${id}`, { method: 'POST' });
export const restoreChain   = (id)   => request(`/api/transaction/restore/${id}`, { method: 'POST' });

// ── Verify ────────────────────────────────────────────────────
export const verifyDrug = (id)  => request(`/api/verify/${id}`);
export const verifyQR   = (data)=> request('/api/verify/qr', { method: 'POST', body: JSON.stringify({ qrData: data }) });

// ── Audit ─────────────────────────────────────────────────────
export const getAuditLogs = () => request('/api/audit/');

// ── QR ────────────────────────────────────────────────────────
export const generateQR     = (drugId) => request('/api/qr/generate', { method: 'POST', body: JSON.stringify({ drugId }) });
export const getQRQuotas    = ()        => request('/api/qr/quotas');
export const getQRIssuances = ()        => request('/api/qr/issuances');
export const getQRScanLogs  = ()        => request('/api/qr/scanlogs');
export const setQRQuota     = (body)    => request('/api/qr/set-quota', { method: 'POST', body: JSON.stringify(body) });

// ── Attack Scenarios ──────────────────────────────────────────
export const getAttackScenarios = ()       => request('/api/transaction/attack-scenarios');
export const getInventoryStatus = (drugId) => request(`/api/transaction/inventory-status/${drugId}`);

// ── Drug Info (AI) ────────────────────────────────────────────
export const getDrugInfo = (name, level) =>
  request('/api/druginfo', { method: 'POST', body: JSON.stringify({ drugName: name, level }) });

// ── Patient Chat (AI) ─────────────────────────────────────────
export const sendChat = (message, drugId) =>
  request('/api/chat', { method: 'POST', body: JSON.stringify({ message, drugId }) });

// ── Inventory Management ──────────────────────────────────────
export const getInventoryItems     = (p = {}) => request(`/api/inventory?${new URLSearchParams(p)}`);
export const addInventoryItem      = (body)   => request('/api/inventory', { method: 'POST', body: JSON.stringify(body) });
export const getInventoryItem      = (id)     => request(`/api/inventory/${id}`);
export const updateInventoryItem   = (id, b)  => request(`/api/inventory/${id}`, { method: 'PUT',  body: JSON.stringify(b) });
export const deleteInventoryItem   = (id)     => request(`/api/inventory/${id}`, { method: 'DELETE' });
export const restockInventoryItem  = (id, b)  => request(`/api/inventory/${id}/restock`, { method: 'POST', body: JSON.stringify(b) });
export const processInventorySale  = (body)   => request('/api/inventory/sales', { method: 'POST', body: JSON.stringify(body) });
export const getInventorySales     = (p = {}) => request(`/api/inventory/sales?${new URLSearchParams(p)}`);
export const getInventoryMovements = (itemId) => request(`/api/inventory/movements/${itemId}`);
export const getInventorySummaryReport = (p = {}) => request(`/api/inventory/reports/summary?${new URLSearchParams(p)}`);
export const getInventoryTopSelling    = (p = {}) => request(`/api/inventory/reports/top-selling?${new URLSearchParams(p)}`);
export const getInventoryAlerts        = ()        => request('/api/inventory/alerts');
