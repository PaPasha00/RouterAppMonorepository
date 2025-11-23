import { Platform } from "react-native";
import Constants from "expo-constants";

// Priority:
// 0) app.json expo.extra.EXPO_PUBLIC_API_BASE_URL
// 1) EXPO_PUBLIC_API_BASE_URL env (best for production and tunnels)
// 2) Derive IP from Expo debugger host in dev
// 3) Sensible platform defaults
function resolveBaseUrl(): string {
  const cfgUrl = (Constants as any)?.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL || (Constants as any)?.manifest?.extra?.EXPO_PUBLIC_API_BASE_URL;
  if (cfgUrl) return String(cfgUrl).trim().replace(/\/$/, "");

  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");

  // Try derive from debuggerHost (e.g., 192.168.1.10:19000)
  const dbgHost = (Constants as any)?.expoConfig?.hostUri || (Constants as any)?.expoConfig?.debuggerHost || (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost || (Constants as any)?.manifest?.debuggerHost;
  if (dbgHost && typeof dbgHost === "string" && dbgHost.includes(":")) {
    const host = dbgHost.split(":")[0];
    return `http://${host}:3001`;
  }

  // Fallbacks
  if (Platform.OS === "android") {
    // Android emulator special host to reach host machine
    return "http://10.0.2.2:3001";
  }
  return "http://localhost:3001";
}

export const API_CONFIG = {
  BASE_URL: resolveBaseUrl(),
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

  const res = await fetch(getApiUrl(endpoint), {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${endpoint} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}
