import { create } from 'zustand';
import { SettingsRepository } from '../db/repositories/SettingsRepository';

export type ThemeType = 'light' | 'dark' | 'system';

type ThemeState = {
  theme: ThemeType;
  _hasHydrated: boolean;
  loadTheme: () => Promise<void>;
  setTheme: (newTheme: ThemeType) => Promise<void>;
  setHasHydrated: (state: boolean) => void;
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  _hasHydrated: true, // Set to true initially as we sync directly from database on mount

  /**
   * Kept for backward compatibility with App.tsx which calls loadTheme().
   */
  loadTheme: async () => {
    // Loaded directly from SQLite database in App.tsx now.
  },

  setTheme: async (newTheme: ThemeType) => {
    set({ theme: newTheme });
    // Persist theme to SQLite via SettingsRepository.updateTheme
    try {
      await SettingsRepository.updateTheme(newTheme);
    } catch (err) {
      console.error('Failed to persist theme to DB:', err);
    }
  },

  setHasHydrated: (state: boolean) => {
    set({ _hasHydrated: state });
  },
}));
