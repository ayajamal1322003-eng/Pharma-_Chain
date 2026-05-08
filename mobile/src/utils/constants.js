// ─────────────────────────────────────────────────────────────
//  API base URL — change to your machine's local IP when testing
//  on a physical device (Expo Go needs your real network IP).
//
//  Examples:
//    Local Windows dev  : 'http://192.168.1.X:7036'
//    Android emulator   : 'http://10.0.2.2:7036'
//    ngrok tunnel       : 'https://abc123.ngrok-free.app'
// ─────────────────────────────────────────────────────────────
export const API_BASE_URL = 'http://192.168.1.100:7036';

export const COLORS = {
  primary:      '#0d9488',
  primaryDark:  '#0f766e',
  primaryLight: '#14b8a6',
  accent:       '#134e4a',
  background:   '#f0fdf4',
  surface:      '#ffffff',
  text:         '#1f2937',
  textLight:    '#6b7280',
  textMuted:    '#9ca3af',
  border:       '#e5e7eb',
  error:        '#ef4444',
  errorBg:      '#fef2f2',
  success:      '#22c55e',
  successBg:    '#f0fdf4',
  warning:      '#f59e0b',
  warningBg:    '#fffbeb',
  info:         '#3b82f6',
  infoBg:       '#eff6ff',
};

export const ROLES = {
  FACTORY:      'Factory',
  DISTRIBUTOR:  'Distributor',
  PHARMACY:     'Pharmacy',
  CUSTOMER:     'Customer',
  ADMIN:        'Admin',
  LEDGER_ADMIN: 'LedgerAdmin',
};

// Roles allowed to add drugs
export const CAN_ADD_DRUG = [ROLES.FACTORY, ROLES.ADMIN];

// Roles allowed to transfer drugs
export const CAN_TRANSFER = [ROLES.FACTORY, ROLES.DISTRIBUTOR, ROLES.PHARMACY];

// Roles allowed to generate QR codes
export const CAN_GENERATE_QR = [
  ROLES.FACTORY, ROLES.DISTRIBUTOR, ROLES.PHARMACY, ROLES.ADMIN,
];

// Admin-only roles
export const ADMIN_ROLES = [ROLES.ADMIN, ROLES.LEDGER_ADMIN];

export const ROLE_COLORS = {
  [ROLES.FACTORY]:      { bg: '#dbeafe', text: '#1d4ed8' },
  [ROLES.DISTRIBUTOR]:  { bg: '#fef9c3', text: '#a16207' },
  [ROLES.PHARMACY]:     { bg: '#dcfce7', text: '#166534' },
  [ROLES.CUSTOMER]:     { bg: '#f3e8ff', text: '#7e22ce' },
  [ROLES.ADMIN]:        { bg: '#fee2e2', text: '#991b1b' },
  [ROLES.LEDGER_ADMIN]: { bg: '#e0e7ff', text: '#3730a3' },
};
