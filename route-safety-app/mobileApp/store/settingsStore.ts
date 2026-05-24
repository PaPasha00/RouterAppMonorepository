interface AsyncStorageType {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

let AsyncStorage: AsyncStorageType | null = null;

if (typeof window === 'undefined' || !window.localStorage) {
  try {
    // @ts-ignore — условный require для RN
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
  } catch {
    console.warn('[SETTINGS] AsyncStorage не доступен, будет использован fallback');
  }
}

const SETTINGS_KEY = '@route_safety_settings';
const DEFAULT_POINTS_PER_DAY = 20;

export interface Settings {
  pointsPerDay: number;
  usePointsSystem: boolean;
  includeAIRecommendations: boolean;
  showWaypointNames: boolean;
}

let cachedSettings: Settings | null = null;

const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      if (AsyncStorage) {
        return await AsyncStorage.getItem(key);
      }
      console.warn('[SETTINGS] Хранилище не доступно, возвращаем null');
      return null;
    } catch (error) {
      console.error('[SETTINGS] Ошибка чтения из хранилища:', error);
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      if (AsyncStorage) {
        await AsyncStorage.setItem(key, value);
        return;
      }
      throw new Error('Хранилище не доступно');
    } catch (error) {
      console.error('[SETTINGS] Ошибка записи в хранилище:', error);
      throw error;
    }
  },
};

export async function loadSettings(): Promise<Settings> {
  if (cachedSettings) {
    return cachedSettings;
  }

  try {
    const data = await storage.getItem(SETTINGS_KEY);
    if (data) {
      cachedSettings = JSON.parse(data);
      return cachedSettings!;
    }
  } catch (error) {
    console.error('[SETTINGS] Ошибка загрузки настроек:', error);
  }

  cachedSettings = defaultSettings();
  return cachedSettings;
}

function defaultSettings(): Settings {
  return {
    pointsPerDay: DEFAULT_POINTS_PER_DAY,
    usePointsSystem: true,
    includeAIRecommendations: true,
    showWaypointNames: false,
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    cachedSettings = settings;
    console.log('[SETTINGS] Настройки успешно сохранены:', settings);
  } catch (error) {
    console.error('[SETTINGS] Ошибка сохранения настроек:', error);
    throw error;
  }
}

/** Синхронно из кэша; на RN для актуальных данных — loadSettings() */
export function getSettings(): Settings {
  if (cachedSettings) {
    return cachedSettings;
  }
  
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem(SETTINGS_KEY);
      if (data) {
        cachedSettings = JSON.parse(data);
        return cachedSettings!;
      }
    }
  } catch (error) {
    console.error('[SETTINGS] Ошибка синхронной загрузки настроек:', error);
  }
  
  cachedSettings = defaultSettings();
  return cachedSettings;
}

export function clearSettingsCache(): void {
  cachedSettings = null;
}

