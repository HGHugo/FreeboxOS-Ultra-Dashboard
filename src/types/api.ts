// Generic API response type
export interface ApiResponse<T = unknown> {
  success: boolean;
  result?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Auth types
export interface AuthStatus {
  isRegistered: boolean;
  isLoggedIn: boolean;
  permissions: Permissions;
}

export interface Permissions {
  settings?: boolean;
  contacts?: boolean;
  calls?: boolean;
  explorer?: boolean;
  downloader?: boolean;
  parental?: boolean;
  pvr?: boolean;
  vm?: boolean;
  camera?: boolean;
  profile?: boolean;
  player?: boolean;
  tv?: boolean;
  home?: boolean;
}

export interface RegistrationStatus {
  status: 'unknown' | 'pending' | 'timeout' | 'granted' | 'denied';
  challenge?: string;
}

// System types
export interface RebootSchedule {
  enabled: boolean;
  mapping: Record<number, string>; // Key: day (0-6), Value: "HH:MM"
}

// Sensor data format (API v8+)
export interface SystemSensor {
  id: string;      // e.g. "temp_cpu0", "temp_hdd", "t1", "cpu_ap"
  name: string;    // e.g. "Température CPU 0", "Disque dur"
  value: number;   // Temperature in °C
}

// Fan data format (API v8+)
export interface SystemFan {
  id: string;      // e.g. "main", "secondary-fan"
  name: string;    // e.g. "Ventilateur 1", "Ventilateur 2"
  value: number;   // RPM
}

export interface SystemInfo {
  firmware_version: string;
  mac: string;
  serial: string;
  uptime: string;
  uptime_val: number;
  board_name: string;
  // API v8+: sensors array for temperatures
  sensors?: SystemSensor[];
  // API v8+: fans array for fan speeds
  fans?: SystemFan[];
  // Temperature fields vary by model (legacy API < v8):
  // Ultra v9: temp_cpu0, temp_cpu1, temp_cpu2, temp_cpu3 (4 CPU cores)
  // Other models: temp_cpum, temp_sw, temp_cpub (legacy fields)
  temp_cpu0?: number;      // CPU core 0 (Ultra)
  temp_cpu1?: number;      // CPU core 1 (Ultra)
  temp_cpu2?: number;      // CPU core 2 (Ultra)
  temp_cpu3?: number;      // CPU core 3 (Ultra)
  temp_cpum?: number;      // CPU main (Delta/Pop/Revolution)
  temp_sw?: number;        // Switch (Delta/Pop/Revolution)
  temp_cpub?: number;      // CPU box (Delta/Pop/Revolution)
  fan_rpm?: number;        // Legacy fan RPM (now in fans array for v8+)
  box_authenticated: boolean;
  disk_status: string;
  box_flavor?: string;
  user_main_storage: string;
  // Added from api_version endpoint
  box_model_name?: string; // e.g. "Freebox v9 (r1)"
  device_name?: string;
  api_version?: string;
}

// Connection types
export interface ConnectionStatus {
  state: 'up' | 'down' | 'going_up' | 'going_down';
  type: string;
  media: string;
  ipv4: string;
  ipv6: string;
  rate_down: number;
  rate_up: number;
  bandwidth_down: number;
  bandwidth_up: number;
  bytes_down: number;
  bytes_up: number;
}

export interface RrdDataPoint {
  time: number;
  [key: string]: number;
}

export interface RrdResponse {
  date_start: number;
  date_end: number;
  data: RrdDataPoint[];
}

// WiFi types
export interface WifiConfig {
  enabled: boolean;
  mac_filter_state: 'disabled' | 'whitelist' | 'blacklist';
}

export interface WifiAp {
  id: number;
  name: string;
  status: {
    state: string;
    channel_width: number;
    primary_channel: number;
    secondary_channel: number;
    dfs_cac_remaining_time: number;
  };
  config: {
    band: '2.4g' | '5g' | '6g' | '60g';
    channel_width: string;
    primary_channel: number;
    secondary_channel: number;
  };
}

export interface WifiBss {
  id: string;
  phy_id: number;
  status: {
    state: string;
    sta_count: number;
    is_main_bss: boolean;
  };
  config: {
    enabled: boolean;
    use_default_config: boolean;
    ssid: string;
    hide_ssid: boolean;
    encryption: string;
  };
}

export interface WifiStation {
  id: string;
  mac: string;
  bssid: string;
  hostname: string;
  host?: LanHost;
  state: string;
  inactive: number;
  conn_duration: number;
  rx_rate: number;
  tx_rate: number;
  rx_bytes: number;
  tx_bytes: number;
  signal: number;
}

// LAN types
export interface LanInterface {
  name: string;
  host_count: number;
}

export interface LanHostAccessPoint {
  mac: string;
  type: 'gateway' | 'repeater';
  uid: string;
  connectivity_type: 'wifi' | 'ethernet';
  rx_bytes: number;
  tx_bytes: number;
  rx_rate: number;  // bytes/s
  tx_rate: number;  // bytes/s
  ethernet_information?: {
    duplex: string;
    speed: number;
    max_port_speed: number;
    link: string;
  };
  wifi_information?: {
    band: string;
    sess_duration: number;
    phy_rx_rate: number;
    phy_tx_rate: number;
    ssid: string;
    standard: string;
    bssid: string;
    signal: number;
  };
}

export interface LanHost {
  id: string;
  primary_name: string;
  host_type: string;
  primary_name_manual: boolean;
  l2ident: {
    id: string;
    type: string;
  };
  vendor_name: string;
  persistent: boolean;
  reachable: boolean;
  last_time_reachable: number;
  active: boolean;
  last_activity: number;
  first_activity: number;
  names: { name: string; source: string }[];
  l3connectivities: {
    addr: string;
    af: 'ipv4' | 'ipv6';
    active: boolean;
    reachable: boolean;
    last_activity: number;
    last_time_reachable: number;
  }[];
  interface?: string;
  access_point?: LanHostAccessPoint;
}

// Download types
export interface Download {
  id: number;
  type: 'bt' | 'http' | 'ftp' | 'nzb';
  name: string;
  status: 'queued' | 'starting' | 'downloading' | 'stopping' | 'stopped' | 'error' | 'done' | 'checking' | 'repairing' | 'extracting' | 'seeding' | 'retry';
  io_priority: 'low' | 'normal' | 'high';
  size: number;
  queue_pos: number;
  tx_bytes: number;
  rx_bytes: number;
  tx_rate: number;
  rx_rate: number;
  tx_pct: number;
  rx_pct: number;
  error: string;
  created_ts: number;
  eta: number;
  download_dir: string;
  stop_ratio: number;
  archive_password: string;
  info_hash: string;
  piece_length: number;
}

export interface DownloadStats {
  nb_tasks: number;
  nb_tasks_stopped: number;
  nb_tasks_active: number;
  nb_tasks_done: number;
  nb_tasks_error: number;
  rx_rate: number;
  tx_rate: number;
  nb_rss: number;
  nb_rss_items_unread: number;
}

export interface DownloadTracker {
  announce: string;
  is_enabled: boolean;
  is_backup: boolean;
  status: 'unannounced' | 'announcing' | 'announce_failed' | 'announced';
  interval: number;
  min_interval: number;
  reannounce_in: number;
  nseeders: number;
  nleechers: number;
}

export interface DownloadPeer {
  host: string;
  port: number;
  client: string;
  rx_rate: number;
  tx_rate: number;
  rx_pct: number;
  tx_pct: number;
  rx: number;
  tx: number;
  progress: number;
  state: 'disconnected' | 'connecting' | 'handshaking' | 'ready';
  origin: 'tracker' | 'incoming' | 'dht' | 'pex' | 'user';
  protocol: 'tcp' | 'tcp_obfuscated' | 'udp';
  country_code: string;
}

export interface DownloadFile {
  id: string;
  task_id: string;
  filepath: string;
  name: string;
  mimetype: string;
  size: number;
  rx: number;
  status: 'queued' | 'error' | 'done';
  error: string;
  priority: 'no_dl' | 'low' | 'normal' | 'high';
}

export interface DownloadBlacklistEntry {
  host: string;
  reason: 'not_blacklisted' | 'crypto_not_supported' | 'connect_fail' | 'hs_timeout' | 'hs_failed' | 'hs_crypt_failed' | 'hs_crypto_disabled' | 'torrent_not_found' | 'read_failed' | 'write_failed' | 'crap_received' | 'conn_closed' | 'timeout' | 'blocklist' | 'user';
  expire: number;
  global: boolean;
}

// VM types
export interface VirtualMachine {
  id: number;
  name: string;
  os: string;
  status: 'stopped' | 'starting' | 'running' | 'stopping';
  vcpus: number;
  memory: number;
  disk_path: string;
  disk_type: string;
  disk_size?: number;      // Total disk size in bytes
  enable_screen: boolean;
  // Extended stats (may not always be available)
  cpu_usage?: number;      // CPU usage percentage (0-100)
  memory_usage?: number;   // Memory usage in bytes
  disk_usage?: number;     // Disk usage in bytes
}

// TV Channel types
export interface TvChannel {
  uuid: string;
  name: string;
  short_name?: string;
  number?: number;
  logo_url?: string;
  quality?: string;
  bouquet?: string;
  available?: boolean;
  has_service?: boolean;
  has_abo?: boolean;
}

export interface TvBouquet {
  id: number;
  name: string;
  channels: string[]; // UUIDs
}

// PVR (Recording) types
export interface PvrRecording {
  id: number;
  name: string;
  path: string;
  media_id: number;
  duration: number;
  byte_size: number;
  channel_uuid: string;
  channel_name?: string;
  channel_type: string;
  channel_quality: string;
  broadcast_type: string;
  record_gen_id: number;
  start: number;
  end: number;
  sub_name?: string;
  episode?: number;
  season?: number;
  state?: 'finished' | 'starting' | 'running' | 'stopped' | 'failed';
  error?: string;
}

export interface PvrProgrammed {
  id: number;
  enabled: boolean;
  channel_uuid: string;
  channel_name?: string;
  channel_type: string;
  channel_quality: string;
  name: string;
  sub_name?: string;
  episode?: number;
  season?: number;
  start: number;
  end: number;
  margin_before: number;
  margin_after: number;
  repeat_monday?: boolean;
  repeat_tuesday?: boolean;
  repeat_wednesday?: boolean;
  repeat_thursday?: boolean;
  repeat_friday?: boolean;
  repeat_saturday?: boolean;
  repeat_sunday?: boolean;
  state?: 'waiting' | 'starting' | 'running' | 'finished' | 'error';
  record_gen_id?: number;
  media_id?: number;
}

export interface PvrConfig {
  margin_before: number;
  margin_after: number;
}

// EPG (Electronic Program Guide) types
export interface EpgProgram {
  id: string;
  date: number; // epoch timestamp
  duration: number; // in seconds
  title: string;
  desc?: string;
  picture?: string;
  picture_big?: string;
  category?: number;
  category_name?: string;
  prev?: string;
  next?: string;
}

// API returns: { "uuid-webtv-XXX": { "<timestamp>_<hash>": EpgProgram } }
export interface EpgByTimeResponse {
  [channelUuid: string]: {
    [programKey: string]: EpgProgram;
  };
}

// Call types
export interface CallEntry {
  id: number;
  type: 'accepted' | 'incoming' | 'missed' | 'outgoing';
  datetime: number;
  number: string;
  name?: string;
  duration: number;
  new: boolean;
  contact_id?: number;
}

// Contact types
export interface ContactNumber {
  id?: number;
  contact_id?: number;
  type: 'home' | 'work' | 'mobile' | 'fax' | 'other' | string;
  number: string;
  is_default?: boolean;
  is_own?: boolean;
}

export interface Contact {
  id: number;
  display_name: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  birthday?: string;
  notes?: string;
  photo_url?: string;
  last_update?: number;
  // Numbers can be included when fetching contact details
  numbers?: ContactNumber[];
}

// DHCP types
export interface DhcpConfig {
  enabled: boolean;
  gateway: string;
  netmask: string;
  ip_range_start: string;
  ip_range_end: string;
  always_broadcast: boolean;
  sticky_assign: boolean;
  dns: string[];
}

export interface DhcpStaticLease {
  id: string;
  mac: string;
  ip: string;
  comment?: string;
  hostname?: string;
  host?: LanHost;
}