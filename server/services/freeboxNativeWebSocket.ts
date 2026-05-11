import WebSocket from 'ws';
import { freeboxApi } from './freeboxApi.js';
import { connectionWebSocket } from './connectionWebSocket.js';

// Freebox native WebSocket events (API v8+)
type FreeboxEvent =
  | 'vm_state_changed'
  | 'vm_disk_task_done'
  | 'lan_host_l3addr_reachable'
  | 'lan_host_l3addr_unreachable';

interface RegisterAction {
  action: 'register';
  events: FreeboxEvent[];
}

interface FreeboxNotification {
  action: 'notification' | 'register';
  success: boolean;
  source?: string;
  event?: string;
  result?: unknown;
}

// LAN host event data structure
interface LanHostEventData {
  id: string;
  primary_name?: string;
  host_type?: string;
  l3connectivities?: Array<{
    addr: string;
    af: 'ipv4' | 'ipv6';
    active: boolean;
    reachable: boolean;
  }>;
  vendor_name?: string;
  active?: boolean;
  reachable?: boolean;
  last_activity?: number;
  [key: string]: unknown;
}

// VM state change event data
interface VmStateChangeData {
  id: number;
  status: string;
  [key: string]: unknown;
}

// VM disk task event data
interface VmDiskTaskData {
  id: number;
  done: boolean;
  error: boolean;
  [key: string]: unknown;
}

class FreeboxNativeWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private shouldReconnect: boolean = false;
  private apiVersion: number = 8; // Default, will be updated

  /**
   * Start the native Freebox WebSocket connection
   * Only works with API v8+ (Delta, Pop, Ultra)
   */
  async start() {
    // Check API version - WebSocket events require v8+
    let versionInfo = freeboxApi.getVersionInfo();

    // If not cached yet, fetch it
    if (!versionInfo) {
      const apiResponse = await freeboxApi.getApiVersion();
      if (apiResponse.success && apiResponse.result) {
        versionInfo = apiResponse.result as { api_version?: string };
      }
    }

    if (versionInfo?.api_version) {
      this.apiVersion = parseInt(versionInfo.api_version.split('.')[0] || '8', 10);
    }

    if (this.apiVersion < 8) {
      console.log('[FBX-WS] Freebox API v8+ required for native WebSocket events. Current:', this.apiVersion);
      console.log('[FBX-WS] Native WebSocket disabled for this Freebox model (Revolution/Mini 4K)');
      return;
    }

    this.shouldReconnect = true;
    await this.connect();
  }

  /**
   * Connect to Freebox native WebSocket
   */
  private async connect() {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    if (!freeboxApi.isLoggedIn()) {
      console.log('[FBX-WS] Not logged in, skipping native WebSocket connection');
      return;
    }

    this.isConnecting = true;

    try {
      const sessionToken = freeboxApi.getSessionToken();
      const freeboxHost = process.env.FREEBOX_HOST || 'mafreebox.freebox.fr';

      // Build WebSocket URL - Freebox uses wss for HTTPS, ws for HTTP
      // The WebSocket endpoint is /api/v{version}/ws/event
      const wsUrl = `wss://${freeboxHost}/api/v${this.apiVersion}/ws/event`;

      console.log('[FBX-WS] Connecting to Freebox native WebSocket:', wsUrl);

      this.ws = new WebSocket(wsUrl, {
        headers: {
          'X-Fbx-App-Auth': sessionToken || ''
        },
        rejectUnauthorized: false // Freebox uses self-signed certificates
      });

      this.ws.on('open', () => {
        console.log('[FBX-WS] Connected to Freebox native WebSocket');
        this.isConnecting = false;
        this.registerEvents();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on('close', (code, reason) => {
        console.log('[FBX-WS] Disconnected:', code, reason.toString());
        this.isConnecting = false;
        this.ws = null;
        this.scheduleReconnect();
      });

      this.ws.on('error', (error) => {
        console.error('[FBX-WS] WebSocket error:', error.message);
        this.isConnecting = false;
      });

    } catch (error) {
      console.error('[FBX-WS] Failed to connect:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Register for Freebox events
   */
  private registerEvents() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const registerAction: RegisterAction = {
      action: 'register',
      events: [
        'lan_host_l3addr_reachable',
        'lan_host_l3addr_unreachable',
        'vm_state_changed',
        'vm_disk_task_done'
      ]
    };

    console.log('[FBX-WS] Registering for events:', registerAction.events);
    this.ws.send(JSON.stringify(registerAction));
  }

  /**
   * Handle incoming message from Freebox
   */
  private handleMessage(data: WebSocket.Data) {
    try {
      const message: FreeboxNotification = JSON.parse(data.toString());

      if (message.action === 'register') {
        if (message.success) {
          console.log('[FBX-WS] Successfully registered for events');
        } else {
          console.error('[FBX-WS] Failed to register for events');
        }
        return;
      }

      if (message.action === 'notification' && message.success) {
        this.handleNotification(message);
      }
    } catch (error) {
      console.error('[FBX-WS] Failed to parse message:', error);
    }
  }

  /**
   * Handle Freebox notification event
   */
  private handleNotification(notification: FreeboxNotification) {
    const { source, event, result } = notification;
    const fullEvent = `${source}_${event}`;

    console.log('[FBX-WS] Received event:', fullEvent);

    switch (fullEvent) {
      case 'lan_host_l3addr_reachable':
        this.handleLanHostReachable(result as LanHostEventData);
        break;
      case 'lan_host_l3addr_unreachable':
        this.handleLanHostUnreachable(result as LanHostEventData);
        break;
      case 'vm_state_changed':
        this.handleVmStateChanged(result as VmStateChangeData);
        break;
      case 'vm_disk_task_done':
        this.handleVmDiskTaskDone(result as VmDiskTaskData);
        break;
      default:
        console.log('[FBX-WS] Unknown event:', fullEvent);
    }
  }

  /**
   * Handle LAN host became reachable (device connected)
   */
  private handleLanHostReachable(host: LanHostEventData) {
    console.log('[FBX-WS] Device connected:', host.primary_name || host.id);

    // Broadcast to dashboard clients via our internal WebSocket
    connectionWebSocket.broadcastFreeboxEvent('lan_host_reachable', {
      id: host.id,
      name: host.primary_name || 'Unknown',
      host_type: host.host_type,
      vendor_name: host.vendor_name,
      active: true,
      timestamp: Date.now()
    });
  }

  /**
   * Handle LAN host became unreachable (device disconnected)
   */
  private handleLanHostUnreachable(host: LanHostEventData) {
    console.log('[FBX-WS] Device disconnected:', host.primary_name || host.id);

    // Broadcast to dashboard clients via our internal WebSocket
    connectionWebSocket.broadcastFreeboxEvent('lan_host_unreachable', {
      id: host.id,
      name: host.primary_name || 'Unknown',
      host_type: host.host_type,
      vendor_name: host.vendor_name,
      active: false,
      timestamp: Date.now()
    });
  }

  /**
   * Handle VM state changed
   */
  private handleVmStateChanged(vm: VmStateChangeData) {
    console.log('[FBX-WS] VM state changed:', vm.id, '->', vm.status);

    connectionWebSocket.broadcastFreeboxEvent('vm_state_changed', {
      id: vm.id,
      status: vm.status,
      timestamp: Date.now()
    });
  }

  /**
   * Handle VM disk task done
   */
  private handleVmDiskTaskDone(task: VmDiskTaskData) {
    console.log('[FBX-WS] VM disk task done:', task.id, 'error:', task.error);

    connectionWebSocket.broadcastFreeboxEvent('vm_disk_task_done', {
      id: task.id,
      done: task.done,
      error: task.error,
      timestamp: Date.now()
    });
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect() {
    if (!this.shouldReconnect) return;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    console.log('[FBX-WS] Reconnecting in 5 seconds...');
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 5000);
  }

  /**
   * Stop the WebSocket connection
   */
  stop() {
    console.log('[FBX-WS] Stopping native WebSocket service');
    this.shouldReconnect = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Called when user logs in
   */
  onLogin() {
    this.start();
  }

  /**
   * Called when user logs out
   */
  onLogout() {
    this.stop();
  }
}

export const freeboxNativeWebSocket = new FreeboxNativeWebSocketService();
