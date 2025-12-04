import { create } from 'zustand';
import { api } from '../api/client';
import { API_ROUTES } from '../utils/constants';
import type { LogEntry } from '../types';

interface HistoryState {
  logs: LogEntry[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchHistory: () => Promise<void>;
}

// Format timestamp
const formatTimestamp = (ts: number): string => {
  const date = new Date(ts * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Aujourd'hui ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return `Hier ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays < 7) {
    return `Il y a ${diffDays} jours`;
  } else {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
};

export const useHistoryStore = create<HistoryState>((set, get) => ({
  logs: [],
  isLoading: false,
  error: null,

  fetchHistory: async () => {
    // Only show loading on first fetch
    const { logs: existingLogs } = get();
    if (existingLogs.length === 0) {
      set({ isLoading: true });
    }

    try {
      // Fetch multiple sources in parallel - all are optional
      const [connectionLogsRes, callsRes, notificationsRes] = await Promise.allSettled([
        api.get<Array<{ date: number; type: string; msg: string }>>(API_ROUTES.CONNECTION_LOGS),
        api.get<Array<{ id: number; datetime: number; type: string; name: string; number: string }>>(API_ROUTES.CALLS),
        api.get<Array<{ id: string; created_at: number; type: string; title: string; body: string }>>(API_ROUTES.NOTIFICATIONS)
      ]);

      const logs: LogEntry[] = [];

      // Process connection logs
      if (connectionLogsRes.status === 'fulfilled' && connectionLogsRes.value.success && connectionLogsRes.value.result) {
        const connectionLogs = connectionLogsRes.value.result;
        for (const log of connectionLogs.slice(0, 10)) {
          logs.push({
            id: `conn-${log.date}`,
            type: log.type === 'error' ? 'error' : log.type === 'warning' ? 'warning' : 'info',
            message: log.msg || 'Événement réseau',
            timestamp: formatTimestamp(log.date),
            icon: log.type === 'up' ? 'wifi' : log.type === 'down' ? 'wifi-off' : 'refresh',
            rawTimestamp: log.date
          });
        }
      }

      // Process call logs
      if (callsRes.status === 'fulfilled' && callsRes.value.success && callsRes.value.result) {
        const calls = callsRes.value.result;
        for (const call of calls.slice(0, 5)) {
          const isIncoming = call.type === 'incoming' || call.type === 'missed';
          const isMissed = call.type === 'missed';
          logs.push({
            id: `call-${call.id}`,
            type: isMissed ? 'warning' : 'info',
            message: `${isIncoming ? 'Appel reçu' : 'Appel émis'} ${call.name || call.number}`,
            timestamp: formatTimestamp(call.datetime),
            icon: 'phone',
            rawTimestamp: call.datetime
          });
        }
      }

      // Process notifications
      if (notificationsRes.status === 'fulfilled' && notificationsRes.value.success && notificationsRes.value.result) {
        const notifications = notificationsRes.value.result;
        for (const notif of notifications.slice(0, 10)) {
          logs.push({
            id: `notif-${notif.id}`,
            type: notif.type === 'error' ? 'error' : notif.type === 'warning' ? 'warning' : 'info',
            message: notif.title || notif.body || 'Notification',
            timestamp: formatTimestamp(notif.created_at),
            icon: 'info',
            rawTimestamp: notif.created_at
          });
        }
      }

      // Sort by timestamp (newest first)
      logs.sort((a, b) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));

      // Limit to 20 entries
      set({ logs: logs.slice(0, 20), isLoading: false, error: null });

    } catch {
      set({ isLoading: false, error: 'Failed to fetch history' });
    }
  }
}));