export interface NetworkStat {
  time: string;
  download: number;
  upload: number;
}

export interface Device {
  id: string;
  name: string;
  type: 'phone' | 'laptop' | 'desktop' | 'iot' | 'tv';
  connection: 'ethernet' | 'wifi';
  speedDown: number;
  speedUp: number;
  active: boolean;
}

export interface WifiNetwork {
  ssid: string;
  band: '2.4GHz' | '5GHz' | '6GHz';
  channelWidth: number;
  active: boolean;
  connectedDevices: number;
  load: number; // 0-100
}

export interface VirtualMachine {
  id: string;
  name: string;
  os: string;
  status: 'active' | 'stopped';
  cpuUsage: number;
  ramUsage: number;
  ramTotal: number;
  diskUsage: number;
  diskTotal: number;
}

export interface DownloadTask {
  id: string;
  name: string;
  size: string;
  progress: number; // 0-100
  speed: string;
  seeds?: number;
  peers?: number;
  status: 'downloading' | 'seeding' | 'paused';
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}