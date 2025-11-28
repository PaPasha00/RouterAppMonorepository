// Используем AsyncStorage для React Native или localStorage для веба
// Импортируем AsyncStorage только для React Native (не для веба)
// Типы для AsyncStorage
interface AsyncStorageType {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

let AsyncStorage: AsyncStorageType | null = null;

// Пытаемся загрузить AsyncStorage только если мы не в веб-окружении
if (typeof window === 'undefined' || !window.localStorage) {
  try {
    // Используем require для условной загрузки
    // @ts-ignore - игнорируем ошибку типов для условного импорта
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
  } catch (e) {
    // Игнорируем ошибку, если модуль не доступен
    console.warn('[SETTINGS] AsyncStorage не доступен, будет использован fallback');
  }
}

const SETTINGS_KEY = '@route_safety_settings';
const DEFAULT_POINTS_PER_DAY = 20; // По умолчанию 20 очков в день

export interface Settings {
  pointsPerDay: number; // Максимальное количество очков в день
  usePointsSystem: boolean; // Использовать ли систему очков для разбивки маршрута
  includeAIRecommendations: boolean; // Включать ли рекомендации от ИИ в анализ
  showWaypointNames: boolean; // Показывать ли названия точек на карте
}

let cachedSettings: Settings | null = null;

// Универсальное хранилище для всех платформ
const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      // Для веба используем localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      // Для React Native используем AsyncStorage
      if (AsyncStorage) {
        return await AsyncStorage.getItem(key);
      }
      // Fallback: возвращаем null, если ни один вариант не доступен
      console.warn('[SETTINGS] Хранилище не доступно, возвращаем null');
      return null;
    } catch (error) {
      console.error('[SETTINGS] Ошибка чтения из хранилища:', error);
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      // Для веба используем localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      // Для React Native используем AsyncStorage
      if (AsyncStorage) {
        await AsyncStorage.setItem(key, value);
        return;
      }
      // Fallback: выбрасываем ошибку, если ни один вариант не доступен
      throw new Error('Хранилище не доступно');
    } catch (error) {
      console.error('[SETTINGS] Ошибка записи в хранилище:', error);
      throw error;
    }
  },
};

/**
 * Загружает настройки из хранилища
 */
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

  // Возвращаем настройки по умолчанию
  const defaultSettings: Settings = {
    pointsPerDay: DEFAULT_POINTS_PER_DAY,
    usePointsSystem: true,
    includeAIRecommendations: true,
    showWaypointNames: false,
  };
  cachedSettings = defaultSettings;
  return defaultSettings;
}

/**
 * Сохраняет настройки в хранилище
 */
export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    cachedSettings = settings;
    console.log('[SETTINGS] Настройки успешно сохранены:', settings);
  } catch (error) {
    console.error('[SETTINGS] Ошибка сохранения настроек:', error);
    throw error; // Пробрасываем ошибку, чтобы вызывающий код мог обработать её
  }
}

/**
 * Получает текущие настройки (синхронно, из кэша или хранилища)
 * ВНИМАНИЕ: Для React Native это может вернуть устаревшие данные, если кэш не обновлен.
 * Для получения актуальных данных используйте loadSettings().
 */
export function getSettings(): Settings {
  // Если кэш есть, возвращаем его
  if (cachedSettings) {
    return cachedSettings;
  }
  
  // Пытаемся загрузить из хранилища синхронно (только для веба)
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
  
  // Возвращаем настройки по умолчанию
  const defaultSettings: Settings = {
    pointsPerDay: DEFAULT_POINTS_PER_DAY,
    usePointsSystem: true,
    includeAIRecommendations: true,
    showWaypointNames: false,
  };
  cachedSettings = defaultSettings;
  return defaultSettings;
}

/**
 * Сбрасывает кэш настроек (вызывать после изменения настроек)
 */
export function clearSettingsCache(): void {
  cachedSettings = null;
}

