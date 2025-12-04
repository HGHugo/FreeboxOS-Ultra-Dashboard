import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UptimeRecord {
  date: string; // YYYY-MM-DD
  status: 'up' | 'down' | 'partial' | 'unknown'; // partial = reboot detected during the day
  uptimeStart?: number; // uptime at start of day (seconds)
  uptimeEnd?: number; // uptime at end of day / last recorded (seconds)
  rebootDetected?: boolean;
  lastSeen?: number; // timestamp
}

interface UptimeState {
  // History of uptime records (last 30 days)
  history: UptimeRecord[];
  // Last known uptime value (to detect reboots)
  lastUptime: number | null;
  // Last update timestamp
  lastUpdate: number | null;
  // Current uptime from Freebox API (seconds)
  currentUptime: number | null;

  // Actions
  recordUptime: (uptimeSeconds: number) => void;
  getHistoryForDisplay: () => { date: string; status: 'up' | 'down' | 'partial' | 'unknown' }[];
}

const getToday = (): string => {
  return new Date().toISOString().split('T')[0];
};

const getDaysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

// Get date from timestamp
const getDateFromTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toISOString().split('T')[0];
};

export const useUptimeStore = create<UptimeState>()(
  persist(
    (set, get) => ({
      history: [],
      lastUptime: null,
      lastUpdate: null,
      currentUptime: null,

      recordUptime: (uptimeSeconds: number) => {
        const { history, lastUptime } = get();
        const today = getToday();
        const now = Date.now();

        // Detect reboot: if new uptime is significantly less than last known
        // (allowing for some margin due to timing)
        const rebootDetected = lastUptime !== null && uptimeSeconds < lastUptime - 60;

        // Calculate when the Freebox was last started
        const bootTimestamp = now - (uptimeSeconds * 1000);
        const bootDate = getDateFromTimestamp(bootTimestamp);

        // Find or create today's record
        let todayRecord = history.find(r => r.date === today);
        const isNewDay = !todayRecord;

        if (isNewDay) {
          // Create new record for today
          todayRecord = {
            date: today,
            status: 'up',
            uptimeStart: uptimeSeconds,
            uptimeEnd: uptimeSeconds,
            rebootDetected: false,
            lastSeen: now
          };
        } else {
          // Update existing record
          todayRecord = {
            ...todayRecord,
            uptimeEnd: uptimeSeconds,
            lastSeen: now
          };
        }

        // Mark as partial if reboot was detected
        if (rebootDetected) {
          todayRecord.status = 'partial';
          todayRecord.rebootDetected = true;
        }

        // Update history with today's record
        let newHistory = history.filter(r => r.date !== today);
        newHistory.push(todayRecord);

        // Mark days since last boot as 'up' if they don't have a record
        // This covers the gap when we weren't tracking
        for (let i = 29; i >= 0; i--) {
          const date = getDaysAgo(i);
          const existingRecord = newHistory.find(r => r.date === date);

          if (!existingRecord && date >= bootDate && date <= today) {
            // Day is within the current uptime period, mark as up
            newHistory.push({
              date,
              status: 'up',
              lastSeen: now
            });
          }
        }

        // Keep only last 30 days
        const thirtyDaysAgo = getDaysAgo(30);
        const filteredHistory = newHistory.filter(r => r.date >= thirtyDaysAgo);

        // Sort by date
        filteredHistory.sort((a, b) => a.date.localeCompare(b.date));

        set({
          history: filteredHistory,
          lastUptime: uptimeSeconds,
          lastUpdate: now,
          currentUptime: uptimeSeconds
        });
      },

      getHistoryForDisplay: () => {
        const { history, currentUptime, lastUpdate } = get();
        const result: { date: string; status: 'up' | 'down' | 'partial' | 'unknown' }[] = [];
        const today = getToday();

        // Calculate boot date from current uptime
        let bootDate: string | null = null;
        if (currentUptime !== null && lastUpdate !== null) {
          const bootTimestamp = lastUpdate - (currentUptime * 1000);
          bootDate = getDateFromTimestamp(bootTimestamp);
        }

        // Generate last 30 days
        for (let i = 29; i >= 0; i--) {
          const date = getDaysAgo(i);
          const record = history.find(r => r.date === date);

          if (record) {
            // We have actual data for this day
            result.push({ date: record.date, status: record.status === 'unknown' ? 'unknown' : record.status });
          } else if (bootDate && date >= bootDate && date <= today) {
            // Day is within current uptime period (since last boot)
            result.push({ date, status: 'up' });
          } else if (bootDate && date < bootDate) {
            // Day is before the last boot - we don't know the status
            result.push({ date, status: 'unknown' });
          } else {
            // No uptime data yet - unknown
            result.push({ date, status: 'unknown' });
          }
        }

        return result;
      }
    }),
    {
      name: 'freebox-uptime-history',
      version: 2 // Bumped version to reset storage
    }
  )
);