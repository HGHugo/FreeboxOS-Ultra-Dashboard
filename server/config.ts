// Server configuration
export const config = {
  // Server
  port: process.env.SERVER_PORT || 3001,

  // Freebox API
  freebox: {
    // Default URLs - can be overridden by env vars
    url: process.env.FREEBOX_URL || 'https://mafreebox.freebox.fr',
    localIp: process.env.FREEBOX_LOCAL_IP || '192.168.1.254',

    // App registration details
    appId: process.env.FREEBOX_APP_ID || 'fr.freeboxos.dashboard',
    appName: process.env.FREEBOX_APP_NAME || 'Freebox Dashboard',
    appVersion: process.env.FREEBOX_APP_VERSION || '1.0.0',
    deviceName: process.env.FREEBOX_DEVICE_NAME || 'Dashboard Web App',

    // API version
    apiVersion: 'v4',

    // Timeouts
    requestTimeout: 10000,

    // Token storage file
    tokenFile: process.env.FREEBOX_TOKEN_FILE || '.freebox_token'
  }
};

// API endpoints
export const API_ENDPOINTS = {
  // API Version (no auth required)
  API_VERSION: '/api_version',

  // Auth
  LOGIN: '/login/',
  LOGIN_AUTHORIZE: '/login/authorize/',
  LOGIN_SESSION: '/login/session/',
  LOGIN_LOGOUT: '/login/logout/',

  // System
  SYSTEM: '/system/',
  SYSTEM_REBOOT: '/system/reboot/',

  // Connection
  CONNECTION: '/connection/',
  CONNECTION_CONFIG: '/connection/config/',
  CONNECTION_IPV6: '/connection/ipv6/config/',
  CONNECTION_LOGS: '/connection/logs/',
  CONNECTION_XDSL: '/connection/xdsl/',
  CONNECTION_FTTH: '/connection/ftth/',

  // RRD (monitoring data)
  RRD: '/rrd/',

  // WiFi
  WIFI_CONFIG: '/wifi/config/',
  WIFI_AP: '/wifi/ap/',
  WIFI_BSS: '/wifi/bss/',
  WIFI_STATIONS: '/wifi/stations/',
  WIFI_MAC_FILTER: '/wifi/mac_filter/',
  WIFI_PLANNING: '/wifi/planning/',
  WIFI_WPS: '/wifi/wps/',

  // LAN
  LAN_CONFIG: '/lan/config/',
  LAN_BROWSER: '/lan/browser/interfaces/',
  LAN_WOL: '/lan/wol/',

  // DHCP
  DHCP_CONFIG: '/dhcp/config/',
  DHCP_STATIC_LEASES: '/dhcp/static_lease/',
  DHCP_DYNAMIC_LEASES: '/dhcp/dynamic_lease/',

  // Downloads
  DOWNLOADS: '/downloads/',
  DOWNLOADS_STATS: '/downloads/stats/',
  DOWNLOADS_ADD: '/downloads/add/',
  DOWNLOADS_CONFIG: '/downloads/config/',

  // File System
  FS_LIST: '/fs/ls/',
  FS_INFO: '/fs/info/',
  FS_MKDIR: '/fs/mkdir/',
  FS_RENAME: '/fs/rename/',
  FS_REMOVE: '/fs/rm/',
  FS_COPY: '/fs/cp/',
  FS_MOVE: '/fs/mv/',
  FS_HASH: '/fs/hash/',
  FS_DOWNLOAD: '/dl/',

  // Storage
  STORAGE_DISK: '/storage/disk/',
  STORAGE_PARTITION: '/storage/partition/',
  STORAGE_CONFIG: '/storage/config/',

  // Shares
  SHARE_LINK: '/share_link/',

  // Phone / Calls
  CALL_LOG: '/call/log/',
  CALL_LOG_DELETE: '/call/log/delete_all/',
  CALL_LOG_MARK_READ: '/call/log/mark_all_as_read/',

  // Contacts
  CONTACTS: '/contact/',
  CONTACTS_NUMBERS: '/number/',

  // PVR (TV Recording)
  PVR_CONFIG: '/pvr/config/',
  PVR_PROGRAMMED: '/pvr/programmed/',
  PVR_FINISHED: '/pvr/finished/',
  PVR_MEDIA: '/pvr/media/',

  // TV
  TV_CHANNELS: '/tv/channels/',
  TV_BOUQUETS: '/tv/bouquets/',

  // Parental Control
  PARENTAL_CONFIG: '/parental/config/',
  PARENTAL_FILTER: '/parental/filter/',

  // Profiles (Network Access)
  PROFILE: '/profile/',
  PROFILE_NETWORK_CONTROL: '/network_control/',

  // VPN Server
  VPN_SERVER_CONFIG: '/vpn/config/',
  VPN_SERVER_USERS: '/vpn/user/',
  VPN_SERVER_CONNECTIONS: '/vpn/connection/',
  VPN_SERVER_IP_POOL: '/vpn/ip_pool/',

  // VPN Client
  VPN_CLIENT_CONFIG: '/vpn_client/config/',
  VPN_CLIENT_CONFIGS: '/vpn_client/',
  VPN_CLIENT_STATUS: '/vpn_client/status/',

  // FTP
  FTP_CONFIG: '/ftp/config/',

  // NAT / Port Forwarding
  NAT_DMZCONFIG: '/fw/dmz/',
  NAT_PORT_FORWARDING: '/fw/redir/',
  NAT_INCOMING: '/fw/incoming/',

  // UPnP IGD
  UPNP_IGD_CONFIG: '/upnpigd/config/',
  UPNP_IGD_REDIRECTIONS: '/upnpigd/redir/',

  // LCD Display
  LCD_CONFIG: '/lcd/config/',

  // Freeplug
  FREEPLUG: '/freeplug/',

  // Switch (ports)
  SWITCH_STATUS: '/switch/status/',
  SWITCH_PORT: '/switch/port/',

  // VM (may not be available on all models)
  VM: '/vm/',
  VM_DISTROS: '/vm/distros/',

  // AirMedia
  AIRMEDIA_CONFIG: '/airmedia/config/',
  AIRMEDIA_RECEIVERS: '/airmedia/receivers/',

  // Notifications
  NOTIFICATIONS: '/notifications/'
};