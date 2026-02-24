import { Platform } from "react-native";
import Constants from "expo-constants";

// Принудительно сбрасываем кэш при изменении окружения
if (__DEV__) {
  // В режиме разработки не кэшируем, чтобы можно было менять URL
  (global as any).__API_URL_CACHE__ = null;
}

// Production сервер
const PRODUCTION_URL = "http://46.188.41.57:3011";
// Localhost для разработки
const LOCALHOST_URL = "http://localhost:3001";
// Android эмулятор
const ANDROID_EMULATOR_URL = "http://10.0.2.2:3001";

/**
 * Определяет базовый URL API в зависимости от окружения
 * 
 * Приоритет:
 * 1. Явная настройка через переменную окружения или app.config.js
 * 2. По умолчанию: localhost:3001 для локальной разработки
 */
function resolveBaseUrl(): string {
  // 1. Проверяем явную настройку из app.config.js (высший приоритет)
  const cfgUrl = (Constants as any)?.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL || 
                 (Constants as any)?.manifest?.extra?.EXPO_PUBLIC_API_BASE_URL;
  if (cfgUrl && cfgUrl !== null && cfgUrl !== undefined && cfgUrl !== "null" && cfgUrl !== "undefined") {
    const url = String(cfgUrl).trim().replace(/\/$/, "");
    if (url) {
      console.log('[API CONFIG] Используется URL из app.config.js:', url);
      return url;
    }
  }

  // 2. Проверяем переменную окружения
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envUrl && envUrl !== "null" && envUrl !== "undefined") {
    const url = envUrl.replace(/\/$/, "");
    if (url) {
      console.log('[API CONFIG] Используется URL из переменной окружения:', url);
      return url;
    }
  }

  // 3. В режиме разработки ВСЕГДА используем localhost:3001
  if (__DEV__) {
    if (Platform.OS === "android") {
      // Android эмулятор использует специальный адрес для доступа к localhost хоста
      const dbgHost = (Constants as any)?.expoConfig?.hostUri || 
                      (Constants as any)?.expoConfig?.debuggerHost;
      if (dbgHost && (dbgHost.includes("localhost") || dbgHost.includes("127.0.0.1"))) {
        console.log('[API CONFIG] Android эмулятор (DEV), используем 10.0.2.2:', ANDROID_EMULATOR_URL);
        return ANDROID_EMULATOR_URL;
      }
    }
    
    // В режиме разработки всегда localhost
    console.log('[API CONFIG] Режим разработки (__DEV__), используем localhost:', LOCALHOST_URL);
    return LOCALHOST_URL;
  }
  
  // 4. В production используем production URL
  console.log('[API CONFIG] Production режим, используем production URL:', PRODUCTION_URL);
  return PRODUCTION_URL;
}

// Кэшируем URL, чтобы не вычислять его каждый раз
let cachedBaseUrl: string | null = null;

function getBaseUrl(): string {
  // В режиме разработки всегда пересчитываем URL
  if (__DEV__) {
    cachedBaseUrl = null;
  }
  
  if (cachedBaseUrl === null) {
    cachedBaseUrl = resolveBaseUrl();
    console.log('[API CONFIG] Определен базовый URL:', cachedBaseUrl);
    console.log('[API CONFIG] Platform:', Platform.OS);
    const dbgHost = Constants.expoConfig?.debuggerHost || Constants.manifest?.debuggerHost;
    console.log('[API CONFIG] DebuggerHost:', dbgHost || 'не определен');
  }
  return cachedBaseUrl;
}

export const API_CONFIG = {
  get BASE_URL() {
    return getBaseUrl();
  },
  ENDPOINTS: {
    ANALYZE_ROUTE: "/api/analyze-route",
    ELEVATION: "/api/elevation",
    MAP_IMAGE: "/api/map/image",
  },
};

export function getApiUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>): string {
  const base = API_CONFIG.BASE_URL.replace(/\/$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = new URL(base + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
    });
  }
  return url.toString();
}

export async function apiPost<T>(endpoint: string, body: unknown, init?: RequestInit): Promise<T> {
  // Добавляем токен авторизации, если он есть
  const headers: HeadersInit = { "Content-Type": "application/json", ...(init?.headers || {}) };
  
  // Пытаемся получить токен из authService, если он доступен
  // НЕ добавляем токен для публичных эндпоинтов (analyze-route, elevation)
  const publicEndpoints = ["/api/analyze-route", "/api/elevation"];
  const isPublicEndpoint = publicEndpoints.some(ep => endpoint.includes(ep));
  
  if (!isPublicEndpoint) {
    try {
      const { getToken } = await import("../services/authService");
      const token = await getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (e) {
      // Игнорируем ошибки, если authService недоступен
    }
  }

  const url = getApiUrl(endpoint);
  console.log('[API] Отправка запроса:', {
    method: 'POST',
    url,
    endpoint,
    baseUrl: API_CONFIG.BASE_URL,
    platform: Platform.OS,
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
      ...init,
    });
    
    console.log('[API] Ответ получен:', {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      url,
    });
    
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] Ошибка ответа:', {
        status: res.status,
        statusText: res.statusText,
        text: text.substring(0, 200),
        url,
      });
      throw new Error(`API ${endpoint} failed: ${res.status} ${text.substring(0, 100)}`);
    }
    return (await res.json()) as T;
  } catch (error: any) {
    console.error('[API] Ошибка запроса:', {
      error: error?.message,
      url,
      endpoint,
      baseUrl: API_CONFIG.BASE_URL,
      platform: Platform.OS,
      stack: error?.stack?.substring(0, 200),
    });
    throw error;
  }
}
