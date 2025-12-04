import { create } from 'zustand';
import { api } from '../api/client';
import { API_ROUTES } from '../utils/constants';
import type { CallEntry, Contact } from '../types/api';

interface PhoneState {
  // Data
  calls: CallEntry[];
  contacts: Contact[];

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCalls: () => Promise<void>;
  fetchContacts: () => Promise<void>;
  markCallsAsRead: () => Promise<void>;
  deleteCall: (id: number) => Promise<void>;
  deleteAllCalls: () => Promise<void>;
  createContact: (contact: Partial<Contact>) => Promise<void>;
  updateContact: (id: number, contact: Partial<Contact>) => Promise<void>;
  deleteContact: (id: number) => Promise<void>;
}

export const usePhoneStore = create<PhoneState>((set, get) => ({
  calls: [],
  contacts: [],
  isLoading: false,
  error: null,

  fetchCalls: async () => {
    const { calls: existingCalls } = get();
    if (existingCalls.length === 0) {
      set({ isLoading: true });
    }

    try {
      const response = await api.get<CallEntry[]>(API_ROUTES.CALLS);
      if (response.success && response.result) {
        set({ calls: response.result, isLoading: false, error: null });
      } else {
        // Silently fail - phone service may not be available
        set({ calls: [], isLoading: false, error: null });
      }
    } catch {
      // Silently fail - phone service may not be available
      set({ calls: [], isLoading: false, error: null });
    }
  },

  fetchContacts: async () => {
    const { contacts: existingContacts } = get();
    if (existingContacts.length === 0) {
      set({ isLoading: true });
    }

    try {
      const response = await api.get<Contact[]>(API_ROUTES.CONTACTS);
      if (response.success && response.result) {
        set({ contacts: response.result, isLoading: false, error: null });
      } else {
        // Silently fail - contacts may not be available
        set({ contacts: [], isLoading: false, error: null });
      }
    } catch {
      // Silently fail - contacts may not be available
      set({ contacts: [], isLoading: false, error: null });
    }
  },

  markCallsAsRead: async () => {
    try {
      await api.post(`${API_ROUTES.CALLS}/mark-read`, {});
      // Refresh calls after marking as read
      const { fetchCalls } = get();
      await fetchCalls();
    } catch {
      set({ error: 'Erreur lors du marquage des appels comme lus' });
    }
  },

  deleteCall: async (id: number) => {
    try {
      await api.delete(`${API_ROUTES.CALLS}/${id}`);
      // Remove from local state
      const { calls } = get();
      set({ calls: calls.filter(c => c.id !== id) });
    } catch {
      set({ error: 'Erreur lors de la suppression de l\'appel' });
    }
  },

  deleteAllCalls: async () => {
    try {
      await api.delete(API_ROUTES.CALLS);
      set({ calls: [] });
    } catch {
      set({ error: 'Erreur lors de la suppression des appels' });
    }
  },

  createContact: async (contact: Partial<Contact>) => {
    try {
      const response = await api.post<Contact>(API_ROUTES.CONTACTS, contact);
      if (response.success && response.result) {
        const { contacts } = get();
        set({ contacts: [...contacts, response.result] });
      }
    } catch {
      set({ error: 'Erreur lors de la création du contact' });
    }
  },

  updateContact: async (id: number, contact: Partial<Contact>) => {
    try {
      const response = await api.put<Contact>(`${API_ROUTES.CONTACTS}/${id}`, contact);
      if (response.success && response.result) {
        const { contacts } = get();
        set({ contacts: contacts.map(c => c.id === id ? response.result! : c) });
      }
    } catch {
      set({ error: 'Erreur lors de la mise à jour du contact' });
    }
  },

  deleteContact: async (id: number) => {
    try {
      await api.delete(`${API_ROUTES.CONTACTS}/${id}`);
      const { contacts } = get();
      set({ contacts: contacts.filter(c => c.id !== id) });
    } catch {
      set({ error: 'Erreur lors de la suppression du contact' });
    }
  }
}));