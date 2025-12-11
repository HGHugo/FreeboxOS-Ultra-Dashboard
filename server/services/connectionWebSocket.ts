import { WebSocketServer, WebSocket } from 'ws';
import type { WebSocket as WsType } from 'ws';
import { freeboxApi } from './freeboxApi.js';
import { normalizeSystemInfo } from './apiNormalizer.js';

interface ConnectionStatus {
  type: string;
  state: string;
  media: string;
  ipv4: string;
  ipv4_port_range: [number, number];
  ipv6: string;
  rate_down: number;
  rate_up: number;
  bandwidth_down: number;
  bandwidth_up: number;
  bytes_down: number;
  bytes_up: number;
}

interface SystemStatus {
  temp_cpu0?: number;
  temp_cpu1?: number;
  temp_cpu2?: number;
  temp_cpu3?: number;
  temp_cpum?: number;
  temp_cpub?: number;
  temp_sw?: number;
  fan_rpm?: number;
  uptime_val?: number;
}

type ClientWebSocket = WsType & { isAlive?: boolean };

const CONNECTION_POLLING_INTERVAL = 1000; // 1 second for connection data
const SYSTEM_POLLING_INTERVAL = 5000; // 5 seconds for system data (less frequent)

class ConnectionWebSocketService {
  private wss: WebSocketServer | null = null;
  private connectionPollingInterval: NodeJS.Timeout | null = null;
  private systemPollingInterval: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the WebSocket server
   */
  init(server: import('http').Server) {
    console.log('[WS] Initializing WebSocket server...');

    this.wss = new WebSocketServer({ server, path: '/ws/connection' });

    console.log('[WS] WebSocket server created on path /ws/connection');

    this.wss.on('error', (error) => {
      console.error('[WS] Server error:', error);
    });

    this.wss.on('connection', (ws: ClientWebSocket, req) => {
      console.log('[WS] Client connected from:', req.socket.remoteAddress);
      ws.isAlive = true;

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('close', () => {
        console.log('[WS] Client disconnected');
        // Stop polling if no more clients
        if (this.wss && this.wss.clients.size === 0) {
          this.stopPolling();
        }
      });

      ws.on('error', (error) => {
        console.error('[WS] Client error:', error.message);
      });

      // Start polling if this is the first client
      if (this.wss && this.wss.clients.size === 1) {
        this.startPolling();
      }
    });

    // Ping clients to detect stale connections
    this.pingInterval = setInterval(() => {
      this.wss?.clients.forEach((ws) => {
        const client = ws as ClientWebSocket;
        if (client.isAlive === false) {
          return client.terminate();
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000);

    console.log('[WS] WebSocket server initialized on /ws/connection');
  }

  /**
   * Start polling Freebox API for connection and system status
   */
  private startPolling() {
    if (this.connectionPollingInterval) return;

    console.log('[WS] Starting connection and system status polling');

    // Connection status polling (every 1 second)
    this.connectionPollingInterval = setInterval(async () => {
      await this.fetchConnectionAndBroadcast();
    }, CONNECTION_POLLING_INTERVAL);

    // System status polling (every 5 seconds)
    this.systemPollingInterval = setInterval(async () => {
      await this.fetchSystemAndBroadcast();
    }, SYSTEM_POLLING_INTERVAL);

    // Fetch immediately
    this.fetchConnectionAndBroadcast();
    this.fetchSystemAndBroadcast();
  }

  /**
   * Stop polling
   */
  private stopPolling() {
    if (this.connectionPollingInterval) {
      console.log('[WS] Stopping connection status polling');
      clearInterval(this.connectionPollingInterval);
      this.connectionPollingInterval = null;
    }
    if (this.systemPollingInterval) {
      console.log('[WS] Stopping system status polling');
      clearInterval(this.systemPollingInterval);
      this.systemPollingInterval = null;
    }
  }

  /**
   * Fetch connection status from Freebox and broadcast to clients
   */
  private async fetchConnectionAndBroadcast() {
    if (!freeboxApi.isLoggedIn()) return;
    if (!this.wss || this.wss.clients.size === 0) return;

    try {
      const response = await freeboxApi.getConnectionStatus();
      if (response.success && response.result) {
        this.broadcast('connection_status', response.result as ConnectionStatus);
      }
    } catch {
      // Silent fail - don't spam logs
    }
  }

  /**
   * Fetch system status from Freebox and broadcast to clients
   */
  private async fetchSystemAndBroadcast() {
    if (!freeboxApi.isLoggedIn()) return;
    if (!this.wss || this.wss.clients.size === 0) return;

    try {
      const response = await freeboxApi.getSystemInfo();
      if (response.success && response.result) {
        // Use API normalizer for automatic compatibility with all Freebox models
        const normalized = normalizeSystemInfo(response.result as Record<string, unknown>);

        const systemStatus: SystemStatus = {
          temp_cpu0: normalized.temp_cpu0,
          temp_cpu1: normalized.temp_cpu1,
          temp_cpu2: normalized.temp_cpu2,
          temp_cpu3: normalized.temp_cpu3,
          temp_cpum: normalized.temp_cpum,
          temp_cpub: normalized.temp_cpub,
          temp_sw: normalized.temp_sw,
          fan_rpm: normalized.fan_rpm,
          uptime_val: normalized.uptime_val as number | undefined
        };

        this.broadcast('system_status', systemStatus);
      }
    } catch {
      // Silent fail - don't spam logs
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(type: string, data: ConnectionStatus | SystemStatus) {
    if (!this.wss) return;

    const message = JSON.stringify({ type, data });

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * Broadcast Freebox native WebSocket event to all dashboard clients
   * Used by freeboxNativeWebSocket service to relay events
   */
  broadcastFreeboxEvent(eventType: string, data: Record<string, unknown>) {
    if (!this.wss) return;

    const message = JSON.stringify({
      type: 'freebox_event',
      eventType,
      data
    });

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * Close WebSocket server and stop polling
   */
  close() {
    this.stopPolling();

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    console.log('[WS] WebSocket service closed');
  }

  /**
   * Called when user logs in - start polling if clients connected
   */
  onLogin() {
    if (this.wss && this.wss.clients.size > 0) {
      this.startPolling();
    }
  }

  /**
   * Called when user logs out - stop polling
   */
  onLogout() {
    this.stopPolling();
  }
}

export const connectionWebSocket = new ConnectionWebSocketService();
