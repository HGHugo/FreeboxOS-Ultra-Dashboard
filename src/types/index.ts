// Re-export all API types
export * from './api';

// UI-specific types
export interface NetworkStat {
  time: string;
  download: number;
  upload: number;
}

export interface Device {
  id: string;
  name: string;
  type: 'phone' | 'laptop' | 'desktop' | 'iot' | 'tv' | 'tablet' | 'car' | 'repeater' | 'other';
  connection: 'ethernet' | 'wifi';
  speedDown: number;
  speedUp: number;
  active: boolean;
  mac?: string;
  ip?: string;
  vendor?: string;
}

export interface WifiNetwork {
  id: string;
  ssid: string;
  band: '2.4GHz' | '5GHz' | '6GHz';
  channelWidth: number;
  channel: number;
  active: boolean;
  connectedDevices: number;
  load: number;
}

export interface VM {
  id: string;
  name: string;
  os: string;
  status: 'running' | 'stopped' | 'starting' | 'stopping';
  cpuUsage: number;
  ramUsage: number;
  ramTotal: number;
  diskUsage: number;
  diskTotal: number;
}

export interface DownloadTask {
  id: string;
  name: string;
  size: number;
  downloaded: number;
  uploaded: number;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  seeds?: number;
  peers?: number;
  eta: number;
  status: 'downloading' | 'seeding' | 'paused' | 'queued' | 'error' | 'done';
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  icon?: string;
  data?: Record<string, unknown>;
  rawTimestamp?: number;
}

export interface SpeedTestResult {
  download: number;
  upload: number;
  ping: number;
  jitter: number;
  type: string;
  timestamp: string;
}