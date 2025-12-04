import { create } from 'zustand';
import { api } from '../api/client';
import { API_ROUTES } from '../utils/constants';
import type { LanHost } from '../types/api';
import type { Device } from '../types';

interface LanState {
  devices: Device[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchDevices: () => Promise<void>;
  wakeOnLan: (mac: string, interfaceName?: string) => Promise<boolean>;
}

// Map host type to device type
const mapHostType = (hostType: string): Device['type'] => {
  const typeMap: Record<string, Device['type']> = {
    smartphone: 'phone',
    phone: 'phone',
    tablet: 'tablet',
    laptop: 'laptop',
    computer: 'desktop',
    workstation: 'desktop',
    desktop: 'desktop',
    multimedia: 'tv',
    tv: 'tv',
    television: 'tv',
    gaming_console: 'tv',
    networking_device: 'repeater',
    printer: 'iot',
    car: 'car',
    other: 'other'
  };
  return typeMap[hostType?.toLowerCase()] || 'other';
};

export const useLanStore = create<LanState>((set, get) => ({
  devices: [],
  isLoading: false,
  error: null,

  fetchDevices: async () => {
    // Only show loading on first fetch (when devices array is empty)
    const { devices: existingDevices } = get();
    if (existingDevices.length === 0) {
      set({ isLoading: true });
    }

    try {
      const response = await api.get<LanHost[]>(API_ROUTES.LAN_DEVICES);

      if (response.success && response.result) {
        const devices: Device[] = response.result.map((host) => {
          // Get IPv4 address
          const ipv4 = host.l3connectivities?.find(
            (c) => c.af === 'ipv4' && c.active
          );

          const mac = host.l2ident?.id;

          // Get connection type from access_point.connectivity_type (most reliable)
          const connectionType: 'wifi' | 'ethernet' =
            host.access_point?.connectivity_type === 'wifi' ? 'wifi' : 'ethernet';

          // Get speed from access_point (bytes/s -> Mbps)
          let speedDown = 0;
          let speedUp = 0;
          if (host.access_point && host.active) {
            // rx_rate and tx_rate are in bytes per second
            speedDown = host.access_point.rx_rate ? (host.access_point.rx_rate * 8) / 1_000_000 : 0;
            speedUp = host.access_point.tx_rate ? (host.access_point.tx_rate * 8) / 1_000_000 : 0;
          }

          return {
            id: host.id,
            name: host.primary_name || host.vendor_name || 'Unknown Device',
            type: mapHostType(host.host_type),
            connection: connectionType,
            speedDown: Math.round(speedDown * 10) / 10,
            speedUp: Math.round(speedUp * 10) / 10,
            active: host.active && host.reachable,
            mac,
            ip: ipv4?.addr,
            vendor: host.vendor_name
          };
        });

        // Sort: active devices first, then by name
        devices.sort((a, b) => {
          if (a.active !== b.active) return a.active ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

        set({ devices, isLoading: false });
      } else {
        set({ isLoading: false, error: response.error?.message });
      }
    } catch {
      set({ isLoading: false, error: 'Failed to fetch devices' });
    }
  },

  wakeOnLan: async (mac: string, interfaceName = 'pub') => {
    try {
      const response = await api.post(API_ROUTES.LAN_WOL, {
        interface: interfaceName,
        mac
      });
      return response.success;
    } catch {
      set({ error: 'Wake on LAN failed' });
      return false;
    }
  }
}));