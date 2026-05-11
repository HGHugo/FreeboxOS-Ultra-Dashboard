// Color palette (from Figma)
export const COLORS = {
  // Backgrounds
  bgPrimary: '#050505',
  bgSecondary: '#0a0a0a',
  bgCard: '#121212',
  bgCardInner: '#151515',
  bgItem: '#1a1a1a',
  bgItemHover: '#1f1f1f',
  bgHeader: '#111111',

  // Borders
  border: '#374151',
  borderLight: '#4b5563',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#e5e7eb',
  textMuted: '#9ca3af',
  textDark: '#6b7280',

  // Accents
  blue: '#3b82f6',
  green: '#10b981',
  cyan: '#06b6d4',
  orange: '#f97316',
  red: '#ef4444',
  purple: '#a855f7',

  // Status colors
  success: '#10b981',
  warning: '#f97316',
  error: '#ef4444',
  info: '#3b82f6'
} as const;

// Polling intervals (in ms)
export const POLLING_INTERVALS = {
  connection: 1000,      // Real-time speed
  system: 30000,         // Temperature, fan
  devices: 10000,        // LAN devices
  downloads: 5000,       // Download progress
  wifi: 15000,           // WiFi status
  vm: 10000              // VM status
} as const;

// API endpoints (relative to proxy)
export const API_ROUTES = {
  // Auth
  AUTH_REGISTER: '/api/auth/register',
  AUTH_STATUS: '/api/auth/status',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_CHECK: '/api/auth/check',
  AUTH_SET_URL: '/api/auth/set-url',
  AUTH_GET_URL: '/api/auth/url',
  AUTH_RESET: '/api/auth/reset',

  // System
  SYSTEM: '/api/system',
  SYSTEM_REBOOT: '/api/system/reboot',
  SYSTEM_REBOOT_SCHEDULE: '/api/system/reboot/schedule',

  // Connection
  CONNECTION: '/api/connection',
  CONNECTION_CONFIG: '/api/connection/config',
  CONNECTION_HISTORY: '/api/connection/history',
  CONNECTION_TEMP_HISTORY: '/api/connection/temp-history',

  // WiFi
  WIFI_CONFIG: '/api/wifi/config',
  WIFI_APS: '/api/wifi/aps',
  WIFI_BSS: '/api/wifi/bss',
  WIFI_FULL: '/api/wifi/full',
  WIFI_STATIONS: '/api/wifi/stations',
  WIFI_PLANNING: '/api/wifi/planning',
  WIFI_MAC_FILTER: '/api/wifi/mac-filter',
  WIFI_WPS: '/api/wifi/wps',
  // WiFi v13+ features
  WIFI_TEMP_DISABLE: '/api/wifi/temp-disable',
  // WiFi v14+ features
  WIFI_GUEST_CONFIG: '/api/wifi/guest/config',
  WIFI_GUEST_KEYS: '/api/wifi/guest/keys',
  WIFI_MLO_CONFIG: '/api/wifi/mlo/config',

  // LAN
  LAN_CONFIG: '/api/lan/config',
  LAN_INTERFACES: '/api/lan/interfaces',
  LAN_DEVICES: '/api/lan/devices',
  LAN_WOL: '/api/lan/wol',

  // Downloads
  DOWNLOADS: '/api/downloads',
  DOWNLOADS_STATS: '/api/downloads/stats',

  // VM
  VM: '/api/vm',

  // Calls
  CALLS: '/api/calls',

  // Contacts
  CONTACTS: '/api/contacts',

  // File System
  FS: '/api/fs',

  // TV / PVR
  TV_CHANNELS: '/api/tv/channels',
  TV_BOUQUETS: '/api/tv/bouquets',
  TV_RECORDINGS: '/api/tv/recordings',
  TV_PROGRAMMED: '/api/tv/programmed',
  TV_PVR_CONFIG: '/api/tv/pvr/config',
  PVR_PROGRAMMED: '/api/tv/pvr/programmed',
  PVR_FINISHED: '/api/tv/pvr/finished',
  TV_EPG_BY_TIME: '/api/tv/epg/by_time',

  // Parental / Profiles
  PROFILES: '/api/parental/profiles',
  NETWORK_CONTROL: '/api/parental/network-control',
  PARENTAL_CONFIG: '/api/parental/config',
  PARENTAL_FILTERS: '/api/parental/filters',

  // Settings
  SETTINGS_DHCP: '/api/settings/dhcp',
  DHCP_STATIC_LEASES: '/api/dhcp/static-leases',
  SETTINGS_FTP: '/api/settings/ftp',
  SETTINGS_VPN_SERVER: '/api/settings/vpn/server',
  SETTINGS_VPN_CLIENT: '/api/settings/vpn/client',
  SETTINGS_NAT: '/api/settings/nat',
  SETTINGS_SWITCH: '/api/settings/switch',
  SETTINGS_LCD: '/api/settings/lcd',
  SETTINGS_LAN: '/api/settings/lan',
  SETTINGS_CONNECTION: '/api/settings/connection',

  // Connection Logs
  CONNECTION_LOGS: '/api/connection/logs',

  // Notifications
  NOTIFICATIONS: '/api/notifications'
} as const;

// Device type icons mapping
export const DEVICE_ICONS: Record<string, string> = {
  smartphone: 'phone',
  phone: 'phone',
  tablet: 'tablet',
  laptop: 'laptop',
  computer: 'desktop',
  desktop: 'desktop',
  tv: 'tv',
  multimedia: 'tv',
  gaming_console: 'gamepad',
  printer: 'printer',
  networking_device: 'iot',
  workstation: 'desktop',
  car: 'car',
  other: 'other'
};

// Format helpers
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

export const formatSpeed = (bytesPerSec: number): string => {
  // Convert bytes/s to bits/s (multiply by 8) for network speed display
  // Network speeds are measured in bits, using Freebox format: kb/s, Mb/s, Gb/s
  const bitsPerSec = bytesPerSec * 8;

  if (bitsPerSec === 0) return '0 b/s';

  // Use decimal units (1000) for network speeds, not binary (1024)
  // Freebox uses lowercase 'k' and 'b/s' format
  const k = 1000;
  const sizes = ['b/s', 'kb/s', 'Mb/s', 'Gb/s'];
  const i = Math.floor(Math.log(bitsPerSec) / Math.log(k));
  const value = bitsPerSec / Math.pow(k, i);

  // Use 1 decimal for values < 10, 0 decimals otherwise
  const decimals = value < 10 ? 1 : 0;
  return parseFloat(value.toFixed(decimals)) + ' ' + sizes[i];
};

export const formatBitrate = (bitsPerSec: number): string => {
  if (bitsPerSec === 0) return '0 b/s';
  const k = 1000;
  const sizes = ['b/s', 'kb/s', 'Mb/s', 'Gb/s'];
  const i = Math.floor(Math.log(bitsPerSec) / Math.log(k));
  const value = bitsPerSec / Math.pow(k, i);
  const decimals = value < 10 ? 1 : 0;
  return parseFloat(value.toFixed(decimals)) + ' ' + sizes[i];
};

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

export const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}j ${hours}h`;
  return `${hours}h`;
};

export const formatTemperature = (celsius: number): string => {
  return `${celsius}°C`;
};

export const formatPercent = (value: number, decimals = 0): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatDate = (timestamp: number | string): string => {
  const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export const formatTime = (timestamp: number | string): string => {
  const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp);
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};