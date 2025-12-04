import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { config, API_ENDPOINTS } from '../config.js';

// Freebox uses self-signed certificates, so we need to disable TLS verification
// This is safe since we're only communicating with the local Freebox
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

interface TokenData {
  appToken: string;
  trackId?: number;
  status?: string;
}

interface SessionData {
  sessionToken: string;
  challenge: string;
  permissions: Record<string, boolean>;
}

interface FreeboxApiResponse<T = unknown> {
  success: boolean;
  result?: T;
  error_code?: string;
  msg?: string;
}

class FreeboxApiService {
  private baseUrl: string;
  private appToken: string | null = null;
  private sessionToken: string | null = null;
  private challenge: string | null = null;
  private permissions: Record<string, boolean> = {};

  constructor() {
    this.baseUrl = config.freebox.url;
    this.loadToken();
  }

  // Set the base URL (for switching between mafreebox.freebox.fr and local IP)
  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  // Get current base URL
  getBaseUrl(): string {
    return this.baseUrl;
  }

  // Load app_token from file
  private loadToken() {
    const tokenPath = path.join(process.cwd(), config.freebox.tokenFile);
    if (fs.existsSync(tokenPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(tokenPath, 'utf-8')) as TokenData;
        this.appToken = data.appToken;
        console.log('[FreeboxAPI] Loaded app_token from file');
      } catch {
        console.log('[FreeboxAPI] Failed to load token file');
      }
    }
  }

  // Save app_token to file
  private saveToken(appToken: string) {
    const tokenPath = path.join(process.cwd(), config.freebox.tokenFile);
    fs.writeFileSync(tokenPath, JSON.stringify({ appToken }), 'utf-8');
    this.appToken = appToken;
    console.log('[FreeboxAPI] Saved app_token to file');
  }

  // Build full API URL
  private buildUrl(endpoint: string, apiVersion = config.freebox.apiVersion): string {
    // WiFi uses v2 API
    const version = endpoint.startsWith('/wifi') ? 'v2' : apiVersion;
    return `${this.baseUrl}/api/${version}${endpoint}`;
  }

  // Make HTTP request to Freebox
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    authenticated = true
  ): Promise<FreeboxApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (authenticated && this.sessionToken) {
      headers['X-Fbx-App-Auth'] = this.sessionToken;
    }

    const options: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.freebox.requestTimeout);

      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error(`[FreeboxAPI] Non-JSON response: ${method} ${url}`, text.substring(0, 200));
        return {
          success: false,
          error_code: 'invalid_response',
          msg: `API returned non-JSON response (${response.status})`
        };
      }

      const data = await response.json() as FreeboxApiResponse<T>;
      return data;
    } catch (error) {
      console.error(`[FreeboxAPI] Request failed: ${method} ${url}`, error);
      // Return error response instead of throwing
      return {
        success: false,
        error_code: 'request_failed',
        msg: error instanceof Error ? error.message : 'Request failed'
      };
    }
  }

  // HMAC-SHA1 password computation
  private computePassword(challenge: string): string {
    if (!this.appToken) {
      throw new Error('No app_token available');
    }
    return crypto.createHmac('sha1', this.appToken).update(challenge).digest('hex');
  }

  // ==================== AUTH ====================

  // Step 1: Register app (requires physical validation on Freebox)
  async register(): Promise<{ trackId: number; appToken: string }> {
    const response = await this.request<{ app_token: string; track_id: number }>(
      'POST',
      API_ENDPOINTS.LOGIN_AUTHORIZE,
      {
        app_id: config.freebox.appId,
        app_name: config.freebox.appName,
        app_version: config.freebox.appVersion,
        device_name: config.freebox.deviceName
      },
      false
    );

    if (!response.success || !response.result) {
      throw new Error(response.msg || 'Registration failed');
    }

    // Save app_token immediately
    this.saveToken(response.result.app_token);

    return {
      trackId: response.result.track_id,
      appToken: response.result.app_token
    };
  }

  // Step 2: Check registration status
  async checkRegistrationStatus(trackId: number): Promise<{
    status: 'unknown' | 'pending' | 'timeout' | 'granted' | 'denied';
    challenge?: string;
  }> {
    const response = await this.request<{
      status: 'unknown' | 'pending' | 'timeout' | 'granted' | 'denied';
      challenge?: string;
    }>('GET', `${API_ENDPOINTS.LOGIN_AUTHORIZE}${trackId}`, undefined, false);

    if (!response.success || !response.result) {
      throw new Error(response.msg || 'Failed to check registration status');
    }

    if (response.result.challenge) {
      this.challenge = response.result.challenge;
    }

    return response.result;
  }

  // Step 3: Get challenge (for login)
  async getChallenge(): Promise<string> {
    const response = await this.request<{
      logged_in: boolean;
      challenge: string;
    }>('GET', API_ENDPOINTS.LOGIN, undefined, false);

    if (!response.success || !response.result) {
      throw new Error(response.msg || 'Failed to get challenge');
    }

    this.challenge = response.result.challenge;
    return this.challenge;
  }

  // Step 4: Open session
  async login(): Promise<SessionData> {
    if (!this.appToken) {
      throw new Error('No app_token available. Please register first.');
    }

    // Get fresh challenge
    await this.getChallenge();

    if (!this.challenge) {
      throw new Error('No challenge available');
    }

    const password = this.computePassword(this.challenge);

    const response = await this.request<{
      session_token: string;
      challenge: string;
      permissions: Record<string, boolean>;
    }>(
      'POST',
      API_ENDPOINTS.LOGIN_SESSION,
      {
        app_id: config.freebox.appId,
        app_version: config.freebox.appVersion,
        password
      },
      false
    );

    if (!response.success || !response.result) {
      throw new Error(response.msg || response.error_code || 'Login failed');
    }

    this.sessionToken = response.result.session_token;
    this.challenge = response.result.challenge;
    this.permissions = response.result.permissions;

    console.log('[FreeboxAPI] Login successful');

    return {
      sessionToken: this.sessionToken,
      challenge: this.challenge,
      permissions: this.permissions
    };
  }

  // Logout
  async logout(): Promise<void> {
    if (this.sessionToken) {
      await this.request('POST', API_ENDPOINTS.LOGIN_LOGOUT, undefined, true);
      this.sessionToken = null;
      console.log('[FreeboxAPI] Logged out');
    }
  }

  // Check if session is valid
  async checkSession(): Promise<boolean> {
    try {
      const response = await this.request<{ logged_in: boolean }>('GET', API_ENDPOINTS.LOGIN);
      return response.success && response.result?.logged_in === true;
    } catch {
      return false;
    }
  }

  // Check if registered
  isRegistered(): boolean {
    return this.appToken !== null;
  }

  // Check if logged in
  isLoggedIn(): boolean {
    return this.sessionToken !== null;
  }

  // Get permissions
  getPermissions(): Record<string, boolean> {
    return this.permissions;
  }

  // ==================== SYSTEM ====================

  // Get API version info (no auth required) - includes box model name
  async getApiVersion(): Promise<FreeboxApiResponse> {
    const url = `${this.baseUrl}${API_ENDPOINTS.API_VERSION}`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.freebox.requestTimeout);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await response.json();
      // api_version endpoint returns data directly, not wrapped in {success, result}
      return { success: true, result: data };
    } catch (error) {
      console.error('[FreeboxAPI] Failed to get API version:', error);
      return { success: false, msg: 'Failed to get API version' };
    }
  }

  async getSystemInfo(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.SYSTEM);
  }

  async reboot(): Promise<FreeboxApiResponse> {
    return this.request('POST', API_ENDPOINTS.SYSTEM_REBOOT);
  }

  // ==================== CONNECTION ====================

  async getConnectionStatus(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.CONNECTION);
  }

  async getConnectionConfig(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.CONNECTION_CONFIG);
  }

  async updateConnectionConfig(data: unknown): Promise<FreeboxApiResponse> {
    return this.request('PUT', API_ENDPOINTS.CONNECTION_CONFIG, data);
  }

  async getIpv6Config(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.CONNECTION_IPV6);
  }

  async updateIpv6Config(data: unknown): Promise<FreeboxApiResponse> {
    return this.request('PUT', API_ENDPOINTS.CONNECTION_IPV6, data);
  }

  async getFtthInfo(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.CONNECTION_FTTH);
  }

  async getConnectionLogs(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.CONNECTION_LOGS);
  }

  // ==================== RRD (Monitoring) ====================

  async getRrdData(
    db: 'net' | 'temp' | 'dsl' | 'switch',
    dateStart?: number,
    dateEnd?: number,
    fields?: string[]
  ): Promise<FreeboxApiResponse> {
    const body: Record<string, unknown> = { db };
    if (dateStart) body.date_start = dateStart;
    if (dateEnd) body.date_end = dateEnd;
    if (fields) body.fields = fields;

    return this.request('POST', API_ENDPOINTS.RRD, body);
  }

  // ==================== WIFI ====================

  async getWifiConfig(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.WIFI_CONFIG);
  }

  async setWifiConfig(enabled: boolean): Promise<FreeboxApiResponse> {
    return this.request('PUT', API_ENDPOINTS.WIFI_CONFIG, { enabled });
  }

  async getWifiAps(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.WIFI_AP);
  }

  async getWifiApStations(apId: number): Promise<FreeboxApiResponse> {
    return this.request('GET', `${API_ENDPOINTS.WIFI_AP}${apId}/stations/`);
  }

  async getWifiBss(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.WIFI_BSS);
  }

  async getWifiStations(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.WIFI_STATIONS);
  }

  async getWifiMacFilter(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.WIFI_MAC_FILTER);
  }

  async getWifiPlanning(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.WIFI_PLANNING);
  }

  async updateWifiPlanning(data: unknown): Promise<FreeboxApiResponse> {
    return this.request('PUT', API_ENDPOINTS.WIFI_PLANNING, data);
  }

  async getWpsStatus(): Promise<FreeboxApiResponse> {
    return this.request('GET', '/wifi/wps/sessions/');
  }

  async startWps(): Promise<FreeboxApiResponse> {
    // WPS session start - POST to create a new WPS session
    // bss_id 0 = main 2.4GHz, 1 = 5GHz, etc.
    return this.request('POST', '/wifi/wps/sessions/', { bss_id: 0 });
  }

  async stopWps(): Promise<FreeboxApiResponse> {
    // WPS session stop - DELETE current session
    return this.request('DELETE', '/wifi/wps/sessions/');
  }

  // ==================== LAN ====================

  async getLanConfig(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.LAN_CONFIG);
  }

  async updateLanConfig(data: unknown): Promise<FreeboxApiResponse> {
    return this.request('PUT', API_ENDPOINTS.LAN_CONFIG, data);
  }

  async getLanBrowserInterfaces(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.LAN_BROWSER);
  }

  async getLanHosts(interfaceName: string): Promise<FreeboxApiResponse> {
    return this.request('GET', `${API_ENDPOINTS.LAN_BROWSER.replace('interfaces/', '')}${interfaceName}/`);
  }

  async wakeOnLan(interfaceName: string, mac: string, password?: string): Promise<FreeboxApiResponse> {
    return this.request('POST', `${API_ENDPOINTS.LAN_WOL}${interfaceName}/`, { mac, password });
  }

  // ==================== DHCP ====================

  async getDhcpConfig(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.DHCP_CONFIG);
  }

  async updateDhcpConfig(data: unknown): Promise<FreeboxApiResponse> {
    return this.request('PUT', API_ENDPOINTS.DHCP_CONFIG, data);
  }

  async getDhcpLeases(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.DHCP_DYNAMIC_LEASES);
  }

  async getDhcpStaticLeases(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.DHCP_STATIC_LEASES);
  }

  async createDhcpStaticLease(data: unknown): Promise<FreeboxApiResponse> {
    return this.request('POST', API_ENDPOINTS.DHCP_STATIC_LEASES, data);
  }

  async deleteDhcpStaticLease(id: string): Promise<FreeboxApiResponse> {
    return this.request('DELETE', `${API_ENDPOINTS.DHCP_STATIC_LEASES}${id}`);
  }

  // ==================== DOWNLOADS ====================

  async getDownloads(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.DOWNLOADS);
  }

  async getDownload(id: number): Promise<FreeboxApiResponse> {
    return this.request('GET', `${API_ENDPOINTS.DOWNLOADS}${id}`);
  }

  async getDownloadTrackers(id: number): Promise<FreeboxApiResponse> {
    return this.request('GET', `${API_ENDPOINTS.DOWNLOADS}${id}/trackers`);
  }

  async getDownloadPeers(id: number): Promise<FreeboxApiResponse> {
    return this.request('GET', `${API_ENDPOINTS.DOWNLOADS}${id}/peers`);
  }

  async updateDownload(id: number, data: { status?: string; io_priority?: string }): Promise<FreeboxApiResponse> {
    return this.request('PUT', `${API_ENDPOINTS.DOWNLOADS}${id}`, data);
  }

  async deleteDownload(id: number, deleteFiles = false): Promise<FreeboxApiResponse> {
    return this.request('DELETE', `${API_ENDPOINTS.DOWNLOADS}${id}?delete_files=${deleteFiles}`);
  }

  async addDownload(downloadUrl: string, downloadDir?: string): Promise<FreeboxApiResponse> {
    return this.request('POST', API_ENDPOINTS.DOWNLOADS_ADD, {
      download_url: downloadUrl,
      download_dir: downloadDir
    });
  }

  async getDownloadStats(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.DOWNLOADS_STATS);
  }

  async getDownloadConfig(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.DOWNLOADS_CONFIG);
  }

  async updateDownloadConfig(data: unknown): Promise<FreeboxApiResponse> {
    return this.request('PUT', API_ENDPOINTS.DOWNLOADS_CONFIG, data);
  }

  // ==================== FILE SYSTEM ====================

  async listFiles(path: string): Promise<FreeboxApiResponse> {
    const encodedPath = Buffer.from(path).toString('base64');
    return this.request('GET', `${API_ENDPOINTS.FS_LIST}${encodedPath}`);
  }

  async getFileInfo(path: string): Promise<FreeboxApiResponse> {
    const encodedPath = Buffer.from(path).toString('base64');
    return this.request('GET', `${API_ENDPOINTS.FS_INFO}${encodedPath}`);
  }

  async createDirectory(parent: string, dirname: string): Promise<FreeboxApiResponse> {
    const encodedParent = Buffer.from(parent).toString('base64');
    return this.request('POST', `${API_ENDPOINTS.FS_MKDIR}${encodedParent}`, { dirname });
  }

  async renameFile(src: string, dst: string): Promise<FreeboxApiResponse> {
    const encodedSrc = Buffer.from(src).toString('base64');
    return this.request('POST', `${API_ENDPOINTS.FS_RENAME}${encodedSrc}`, { dst });
  }

  async removeFiles(files: string[]): Promise<FreeboxApiResponse> {
    const encodedFiles = files.map(f => Buffer.from(f).toString('base64'));
    return this.request('POST', API_ENDPOINTS.FS_REMOVE, { files: encodedFiles });
  }

  async copyFiles(files: string[], dst: string, mode: string = 'overwrite'): Promise<FreeboxApiResponse> {
    const encodedFiles = files.map(f => Buffer.from(f).toString('base64'));
    const encodedDst = Buffer.from(dst).toString('base64');
    return this.request('POST', API_ENDPOINTS.FS_COPY, { files: encodedFiles, dst: encodedDst, mode });
  }

  async moveFiles(files: string[], dst: string, mode: string = 'overwrite'): Promise<FreeboxApiResponse> {
    const encodedFiles = files.map(f => Buffer.from(f).toString('base64'));
    const encodedDst = Buffer.from(dst).toString('base64');
    return this.request('POST', API_ENDPOINTS.FS_MOVE, { files: encodedFiles, dst: encodedDst, mode });
  }

  // ==================== STORAGE ====================

  async getDisks(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.STORAGE_DISK);
  }

  async getStorageInfo(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.STORAGE_CONFIG);
  }

  // ==================== CALLS ====================

  async getCallLog(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.CALL_LOG);
  }

  async markCallsAsRead(): Promise<FreeboxApiResponse> {
    return this.request('POST', API_ENDPOINTS.CALL_LOG_MARK_READ);
  }

  async deleteAllCalls(): Promise<FreeboxApiResponse> {
    return this.request('POST', API_ENDPOINTS.CALL_LOG_DELETE);
  }

  async deleteCall(id: number): Promise<FreeboxApiResponse> {
    return this.request('DELETE', `${API_ENDPOINTS.CALL_LOG}${id}`);
  }

  // ==================== CONTACTS ====================

  async getContacts(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.CONTACTS);
  }

  async getContact(id: number): Promise<FreeboxApiResponse> {
    return this.request('GET', `${API_ENDPOINTS.CONTACTS}${id}`);
  }

  async createContact(data: unknown): Promise<FreeboxApiResponse> {
    return this.request('POST', API_ENDPOINTS.CONTACTS, data);
  }

  async updateContact(id: number, data: unknown): Promise<FreeboxApiResponse> {
    return this.request('PUT', `${API_ENDPOINTS.CONTACTS}${id}`, data);
  }

  async deleteContact(id: number): Promise<FreeboxApiResponse> {
    return this.request('DELETE', `${API_ENDPOINTS.CONTACTS}${id}`);
  }

  // ==================== TV / PVR ====================

  async getTvChannels(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.TV_CHANNELS);
  }

  async getTvBouquets(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.TV_BOUQUETS);
  }

  async getPvrConfig(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.PVR_CONFIG);
  }

  async updatePvrConfig(data: unknown): Promise<FreeboxApiResponse> {
    return this.request('PUT', API_ENDPOINTS.PVR_CONFIG, data);
  }

  async getPvrProgrammed(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.PVR_PROGRAMMED);
  }

  async createPvrProgrammed(data: unknown): Promise<FreeboxApiResponse> {
    return this.request('POST', API_ENDPOINTS.PVR_PROGRAMMED, data);
  }

  async deletePvrProgrammed(id: number): Promise<FreeboxApiResponse> {
    return this.request('DELETE', `${API_ENDPOINTS.PVR_PROGRAMMED}${id}`);
  }

  async getPvrFinished(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.PVR_FINISHED);
  }

  async deletePvrFinished(id: number): Promise<FreeboxApiResponse> {
    return this.request('DELETE', `${API_ENDPOINTS.PVR_FINISHED}${id}`);
  }

  // ==================== PARENTAL / PROFILES ====================

  async getProfiles(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.PROFILE);
  }

  async getProfile(id: number): Promise<FreeboxApiResponse> {
    return this.request('GET', `${API_ENDPOINTS.PROFILE}${id}`);
  }

  async createProfile(data: unknown): Promise<FreeboxApiResponse> {
    return this.request('POST', API_ENDPOINTS.PROFILE, data);
  }

  async updateProfile(id: number, data: unknown): Promise<FreeboxApiResponse> {
    return this.request('PUT', `${API_ENDPOINTS.PROFILE}${id}`, data);
  }

  async deleteProfile(id: number): Promise<FreeboxApiResponse> {
    return this.request('DELETE', `${API_ENDPOINTS.PROFILE}${id}`);
  }

  async getNetworkControl(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.PROFILE_NETWORK_CONTROL);
  }

  async updateNetworkControl(hostId: string, data: unknown): Promise<FreeboxApiResponse> {
    return this.request('PUT', `${API_ENDPOINTS.PROFILE_NETWORK_CONTROL}${hostId}`, data);
  }

  async getParentalConfig(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.PARENTAL_CONFIG);
  }

  async updateParentalConfig(data: unknown): Promise<FreeboxApiResponse> {
    return this.request('PUT', API_ENDPOINTS.PARENTAL_CONFIG, data);
  }

  async getParentalFilters(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.PARENTAL_FILTER);
  }

  async getParentalFilter(id: number): Promise<FreeboxApiResponse> {
    return this.request('GET', `${API_ENDPOINTS.PARENTAL_FILTER}${id}`);
  }

  async createParentalFilter(data: unknown): Promise<FreeboxApiResponse> {
    return this.request('POST', API_ENDPOINTS.PARENTAL_FILTER, data);
  }

  async updateParentalFilter(id: number, data: unknown): Promise<FreeboxApiResponse> {
    return this.request('PUT', `${API_ENDPOINTS.PARENTAL_FILTER}${id}`, data);
  }

  async deleteParentalFilter(id: number): Promise<FreeboxApiResponse> {
    return this.request('DELETE', `${API_ENDPOINTS.PARENTAL_FILTER}${id}`);
  }

  async getParentalFilterPlanning(id: number): Promise<FreeboxApiResponse> {
    return this.request('GET', `${API_ENDPOINTS.PARENTAL_FILTER}${id}/planning`);
  }

  async updateParentalFilterPlanning(id: number, data: unknown): Promise<FreeboxApiResponse> {
    return this.request('PUT', `${API_ENDPOINTS.PARENTAL_FILTER}${id}/planning`, data);
  }

  // ==================== VPN SERVER ====================

  // Get list of all VPN servers (openvpn_routed, openvpn_bridge, pptp)
  async getVpnServers(): Promise<FreeboxApiResponse> {
    return this.request('GET', '/vpn/');
  }

  // Get specific VPN server by ID
  async getVpnServer(serverId: string): Promise<FreeboxApiResponse> {
    return this.request('GET', `/vpn/${serverId}`);
  }

  // Get VPN server config by ID
  async getVpnServerConfig(serverId?: string): Promise<FreeboxApiResponse> {
    if (serverId) {
      return this.request('GET', `/vpn/${serverId}/config/`);
    }
    // Legacy: return list of servers
    return this.request('GET', '/vpn/');
  }

  // Update VPN server config by ID
  async updateVpnServerConfig(serverId: string, data: unknown): Promise<FreeboxApiResponse> {
    return this.request('PUT', `/vpn/${serverId}/config/`, data);
  }

  // Start VPN server
  async startVpnServer(serverId: string): Promise<FreeboxApiResponse> {
    return this.request('PUT', `/vpn/${serverId}`, { state: 'started' });
  }

  // Stop VPN server
  async stopVpnServer(serverId: string): Promise<FreeboxApiResponse> {
    return this.request('PUT', `/vpn/${serverId}`, { state: 'stopped' });
  }

  async getVpnUsers(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.VPN_SERVER_USERS);
  }

  async createVpnUser(data: unknown): Promise<FreeboxApiResponse> {
    return this.request('POST', API_ENDPOINTS.VPN_SERVER_USERS, data);
  }

  async deleteVpnUser(login: string): Promise<FreeboxApiResponse> {
    return this.request('DELETE', `${API_ENDPOINTS.VPN_SERVER_USERS}${login}`);
  }

  async getVpnConnections(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.VPN_SERVER_CONNECTIONS);
  }

  // ==================== VPN CLIENT ====================

  async getVpnClientConfigs(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.VPN_CLIENT_CONFIGS);
  }

  async getVpnClientStatus(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.VPN_CLIENT_STATUS);
  }

  // ==================== NAT / PORT FORWARDING ====================

  async getPortForwardingRules(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.NAT_PORT_FORWARDING);
  }

  async createPortForwardingRule(data: unknown): Promise<FreeboxApiResponse> {
    return this.request('POST', API_ENDPOINTS.NAT_PORT_FORWARDING, data);
  }

  async updatePortForwardingRule(id: number, data: unknown): Promise<FreeboxApiResponse> {
    return this.request('PUT', `${API_ENDPOINTS.NAT_PORT_FORWARDING}${id}`, data);
  }

  async deletePortForwardingRule(id: number): Promise<FreeboxApiResponse> {
    return this.request('DELETE', `${API_ENDPOINTS.NAT_PORT_FORWARDING}${id}`);
  }

  async getDmzConfig(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.NAT_DMZCONFIG);
  }

  async updateDmzConfig(data: unknown): Promise<FreeboxApiResponse> {
    return this.request('PUT', API_ENDPOINTS.NAT_DMZCONFIG, data);
  }

  // ==================== FTP ====================

  async getFtpConfig(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.FTP_CONFIG);
  }

  async updateFtpConfig(data: unknown): Promise<FreeboxApiResponse> {
    return this.request('PUT', API_ENDPOINTS.FTP_CONFIG, data);
  }

  // ==================== SWITCH / PORTS ====================

  async getSwitchStatus(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.SWITCH_STATUS);
  }

  async getSwitchPorts(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.SWITCH_PORT);
  }

  // ==================== LCD ====================

  async getLcdConfig(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.LCD_CONFIG);
  }

  async updateLcdConfig(data: unknown): Promise<FreeboxApiResponse> {
    return this.request('PUT', API_ENDPOINTS.LCD_CONFIG, data);
  }

  // ==================== FREEPLUGS ====================

  async getFreeplugs(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.FREEPLUG);
  }

  // ==================== VM ====================

  async getVms(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.VM);
  }

  async getVm(id: number): Promise<FreeboxApiResponse> {
    return this.request('GET', `${API_ENDPOINTS.VM}${id}`);
  }

  async createVm(data: unknown): Promise<FreeboxApiResponse> {
    return this.request('POST', API_ENDPOINTS.VM, data);
  }

  async updateVm(id: number, data: unknown): Promise<FreeboxApiResponse> {
    return this.request('PUT', `${API_ENDPOINTS.VM}${id}`, data);
  }

  async deleteVm(id: number): Promise<FreeboxApiResponse> {
    return this.request('DELETE', `${API_ENDPOINTS.VM}${id}`);
  }

  async startVm(id: number): Promise<FreeboxApiResponse> {
    return this.request('POST', `${API_ENDPOINTS.VM}${id}/start`);
  }

  async stopVm(id: number): Promise<FreeboxApiResponse> {
    return this.request('POST', `${API_ENDPOINTS.VM}${id}/stop`);
  }

  async restartVm(id: number): Promise<FreeboxApiResponse> {
    return this.request('POST', `${API_ENDPOINTS.VM}${id}/restart`);
  }

  async getVmDistros(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.VM_DISTROS);
  }

  // ==================== NOTIFICATIONS ====================

  async getNotifications(): Promise<FreeboxApiResponse> {
    return this.request('GET', API_ENDPOINTS.NOTIFICATIONS);
  }
}

// Singleton instance
export const freeboxApi = new FreeboxApiService();