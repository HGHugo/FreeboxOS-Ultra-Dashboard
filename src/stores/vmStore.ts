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

interface VmState {
  vms: VM[];
  isLoading: boolean;
  hasInitialized: boolean;
  error: string | null;

  // Actions
  fetchVms: () => Promise<void>;
  startVm: (id: string) => Promise<void>;
  stopVm: (id: string) => Promise<void>;
  restartVm: (id: string) => Promise<void>;
  deleteVm: (id: string) => Promise<void>;
  createVm: (params: CreateVmParams) => Promise<boolean>;
}

export const useVmStore = create<VmState>((set, get) => ({
  vms: [],
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
        const vms: VM[] = response.result.map((vm) => ({
          id: vm.id.toString(),
          name: vm.name,
          os: vm.os?.toUpperCase() || 'UNKNOWN',
          status: vm.status as VM['status'], // running, stopped, starting, stopping
          cpuUsage: vm.cpu_usage || 0,
          ramUsage: vm.memory_usage ? vm.memory_usage / (1024 * 1024 * 1024) : 0, // Convert to GB
          ramTotal: vm.memory ? vm.memory / (1024 * 1024 * 1024) : 0, // Convert to GB
          diskUsage: vm.disk_usage ? vm.disk_usage / (1024 * 1024 * 1024) : 0, // Convert to GB
          diskTotal: 4 // Default 4TB, not available from API
        }));

        set({ vms, isLoading: false, hasInitialized: true });
      } else {
        set({ isLoading: false, hasInitialized: true, error: response.error?.message });
      }
    } catch {
      set({ isLoading: false, hasInitialized: true, error: 'Failed to fetch VMs' });
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