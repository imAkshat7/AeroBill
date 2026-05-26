import { create } from 'zustand';
import { BusinessSettings } from '../types';
import { SettingsRepository } from '../db/repositories/SettingsRepository';

type SettingsState = {
  settings: BusinessSettings | null;
  isLoading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  updateSettings: (data: Partial<BusinessSettings>) => Promise<BusinessSettings>;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isLoading: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await SettingsRepository.get();
      set({ settings: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load business settings', isLoading: false });
    }
  },

  updateSettings: async (data: Partial<BusinessSettings>) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await SettingsRepository.update(data);
      set({ settings: updated, isLoading: false });
      return updated;
    } catch (err: any) {
      set({ error: err.message || 'Failed to update business settings', isLoading: false });
      throw err;
    }
  },
}));
