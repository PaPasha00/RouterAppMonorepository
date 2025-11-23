// Используем localStorage для веба или встроенное хранилище для мобильных платформ
const SETTINGS_KEY = '@route_safety_settings';
const DEFAULT_POINTS_PER_DAY = 20; // По умолчанию 20 очков в день

export interface Settings {
  pointsPerDay: number; // Максимальное количество очков в день
  usePointsSystem: boolean; // Использовать ли систему очков для разбивки маршрута
  includeAIRecommendations: boolean; // Включать ли рекомендации от ИИ в анализ
  showWaypointNames: boolean; // Показывать ли названия точек на карте
}

let cachedSettings: Settings | null = null;

// Простая реализация хранилища для всех платформ
const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      // Для React Native можно использовать AsyncStorage, но пока используем память
      return null;
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      // Для React Native можно использовать AsyncStorage, но пока используем память
    } catch {
      // Игнорируем ошибки
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
  } catch (error) {
    console.error('[SETTINGS] Ошибка сохранения настроек:', error);
  }
}

/**
 * Получает текущие настройки (синхронно, из кэша или хранилища)
 */
export function getSettings(): Settings {
  // Если кэш есть, возвращаем его
  if (cachedSettings) {
    return cachedSettings;
  }
  
  // Пытаемся загрузить из хранилища синхронно (для веба)
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

