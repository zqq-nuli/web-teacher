import type { Settings } from '@/types';

type StorageChanges = Parameters<Parameters<typeof browser.storage.onChanged.addListener>[0]>[0];

const STORAGE_KEYS = {
  SETTINGS: 'web-teacher-settings',
  PROGRESS: 'web-teacher-progress',
  HISTORY: 'web-teacher-history',
} as const;

/**
 * 获取存储的设置
 */
export async function getSettings(): Promise<Settings | null> {
  const result = await browser.storage.local.get(STORAGE_KEYS.SETTINGS);
  return (result[STORAGE_KEYS.SETTINGS] as Settings) || null;
}

/**
 * 保存设置
 */
export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
}

/**
 * 获取默认设置
 */
export function getDefaultSettings(): Settings {
  return {
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
}

/**
 * 创建Zustand的storage适配器
 */
export function createChromeStorageAdapter<T>(key: string) {
  return {
    getItem: async (): Promise<string | null> => {
      const result = await browser.storage.local.get(key);
      return result[key] ? JSON.stringify(result[key]) : null;
    },
    setItem: async (_name: string, value: string): Promise<void> => {
      await browser.storage.local.set({ [key]: JSON.parse(value) });
    },
    removeItem: async (): Promise<void> => {
      await browser.storage.local.remove(key);
    },
  };
}

/**
 * 监听存储变化
 */
export function onStorageChange(
  key: string,
  callback: (newValue: unknown, oldValue: unknown) => void
) {
  const listener = (
    changes: StorageChanges,
    areaName: string
  ) => {
    if (areaName === 'local' && changes[key]) {
      callback(changes[key].newValue, changes[key].oldValue);
    }
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
