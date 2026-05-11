import { create } from 'zustand';
import { api } from '../api/client';
import { API_ROUTES } from '../utils/constants';
import type { VirtualMachine } from '../types/api';
import type { VM } from '../types';

interface CreateVmParams {
  name: string;
  os: string;
  memory: number; // in MB
  vcpus: number;
  disk_path?: string;
  disk_type?: 'qcow2' | 'raw';
  enable_screen?: boolean;
  enable_cloudinit?: boolean;
}

// VmSystemInfo from Freebox API /vm/info/
// This is the ONLY source of VM resource stats (no per-VM stats available)
export interface VmSystemInfo {
  total_memory: number;  // Total memory available for VMs (in MB)
  used_memory: number;   // Memory currently used by VMs (in MB)
  total_cpus: number;    // Total vCPUs available
  used_cpus: number;     // vCPUs currently allocated
  usb_used: boolean;     // USB passthrough in use
  usb_ports: string[];   // Available USB ports
}

interface VmState {
  vms: VM[];
  systemInfo: VmSystemInfo | null;
  isLoading: boolean;
  hasInitialized: boolean;
  error: string | null;

  // Actions
  fetchVms: () => Promise<void>;
  fetchSystemInfo: () => Promise<void>;
  startVm: (id: string) => Promise<void>;
  stopVm: (id: string) => Promise<void>;
  restartVm: (id: string) => Promise<void>;
  deleteVm: (id: string) => Promise<void>;
  createVm: (params: CreateVmParams) => Promise<boolean>;
}

export const useVmStore = create<VmState>((set, get) => ({
  vms: [],
  systemInfo: null,
  isLoading: false,
  hasInitialized: false,
  error: null,

  fetchVms: async () => {
    // Only show loading on first fetch to avoid flickering
    const { hasInitialized } = get();
    if (!hasInitialized) {
      set({ isLoading: true });
    }

    try {
      const response = await api.get<VirtualMachine[]>(API_ROUTES.VM);

      if (response.success && response.result) {
        // Note: Freebox API provides allocated resources per VM (vcpus, memory)
        // but NOT real-time usage stats (cpu_usage, memory_usage, disk_usage)
        // Global usage stats come from /vm/info/ endpoint (VmSystemInfo)
        const vms: VM[] = response.result.map((vm) => ({
          id: vm.id.toString(),
          name: vm.name,
          os: vm.os?.toUpperCase() || 'UNKNOWN',
          status: vm.status as VM['status'], // running, stopped, starting, stopping
          vcpus: vm.vcpus || 1,
          cpuUsage: 0, // Real-time usage not available - use systemInfo for global stats
          ramUsage: 0, // Real-time usage not available - use systemInfo for global stats
          ramTotal: vm.memory ? vm.memory / 1024 : 0, // memory is in MB, convert to GB
          diskUsage: 0, // Real-time usage not available
          diskTotal: vm.disk_size ? vm.disk_size / (1024 * 1024 * 1024) : 0 // disk_size is in bytes, convert to GB
        }));

        set({ vms, isLoading: false, hasInitialized: true });
      } else {
        set({ isLoading: false, hasInitialized: true, error: response.error?.message });
      }
    } catch {
      set({ isLoading: false, hasInitialized: true, error: 'Failed to fetch VMs' });
    }
  },

  fetchSystemInfo: async () => {
    try {
      const response = await api.get<VmSystemInfo>(`${API_ROUTES.VM}/info`);
      if (response.success && response.result) {
        set({ systemInfo: response.result });
      }
    } catch {
      // Silent fail - system info is optional
      console.log('[VM] Failed to fetch system info');
    }
  },

  startVm: async (id: string) => {
    try {
      await api.post(`${API_ROUTES.VM}/${id}/start`);
      // Refresh VM list
      const store = useVmStore.getState();
      store.fetchVms();
    } catch {
      set({ error: 'Failed to start VM' });
    }
  },

  stopVm: async (id: string) => {
    try {
      await api.post(`${API_ROUTES.VM}/${id}/stop`);
      // Refresh VM list
      const store = useVmStore.getState();
      store.fetchVms();
    } catch {
      set({ error: 'Failed to stop VM' });
    }
  },

  restartVm: async (id: string) => {
    try {
      await api.post(`${API_ROUTES.VM}/${id}/restart`);
      // Refresh VM list
      const store = useVmStore.getState();
      store.fetchVms();
    } catch {
      set({ error: 'Failed to restart VM' });
    }
  },

  deleteVm: async (id: string) => {
    try {
      await api.delete(`${API_ROUTES.VM}/${id}`);
      // Remove from local state
      const { vms } = get();
      set({ vms: vms.filter(vm => vm.id !== id) });
    } catch {
      set({ error: 'Failed to delete VM' });
    }
  },

  createVm: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post(API_ROUTES.VM, params);
      if (response.success) {
        // Refresh VM list
        const store = useVmStore.getState();
        await store.fetchVms();
        set({ isLoading: false });
        return true;
      } else {
        set({ isLoading: false, error: response.error?.message || 'Failed to create VM' });
        return false;
      }
    } catch {
      set({ isLoading: false, error: 'Failed to create VM' });
      return false;
    }
  }
}));