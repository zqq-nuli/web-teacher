import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Settings, AISettings, TTSSettings, GuideSettings } from '@/types';

const STORAGE_KEY = 'web-teacher-settings';

// Chrome Storage 适配器
const chromeStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const result = await browser.storage.local.get(name);
    return result[name] ? JSON.stringify(result[name]) : null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await browser.storage.local.set({ [name]: JSON.parse(value) });
  },
  removeItem: async (name: string): Promise<void> => {
    await browser.storage.local.remove(name);
  },
};

interface SettingsState extends Settings {
  // Actions
  setAISettings: (settings: Partial<AISettings>) => void;
  setTTSSettings: (settings: Partial<TTSSettings>) => void;
  setGuideSettings: (settings: Partial<GuideSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  ai: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o-mini',
    baseUrl: undefined,
  },
  tts: {
    provider: 'native',
    voice: undefined,
    rate: 1.0,
    enabled: true,
  },
  guide: {
    autoAdvance: false,
    autoAdvanceDelay: 3000,
    showProgress: true,
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setAISettings: (settings) =>
        set((state) => ({
          ai: { ...state.ai, ...settings },
        })),

      setTTSSettings: (settings) =>
        set((state) => ({
          tts: { ...state.tts, ...settings },
        })),

      setGuideSettings: (settings) =>
        set((state) => ({
          guide: { ...state.guide, ...settings },
        })),

      resetSettings: () => set(defaultSettings),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => chromeStorage),
    }
  )
);
