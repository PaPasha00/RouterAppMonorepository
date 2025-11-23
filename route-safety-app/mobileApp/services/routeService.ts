import { getApiUrl } from '../config/api';
import { getToken } from './authService';

export interface SavedRoute {
  id: string;
  userId: string;
  name: string;
  description?: string;
  coordinates: Array<{ latitude: number; longitude: number }>;
  waypointNames?: Record<number, string>;
  roadRouting: boolean;
  riverRouting: boolean;
  lengthKm: number;
  createdAt: string;
  updatedAt: string;
}

export interface RouteAnalysis {
  id: string;
  routeId: string;
  userId: string;
  analysis: string;
  analysisStructured?: any;
  stats: any;
  terrainType: string;
  geographicContext: any;
  formattedGeoContext: string;
  dailyRoutes?: any[];
  totalDays: number;
  startDate?: string;
  endDate?: string;
  tourismType?: string;
  createdAt: string;
}

export interface CreateRouteData {
  name: string;
  description?: string;
  coordinates: Array<{ latitude: number; longitude: number }>;
  waypointNames?: Record<number, string>;
  roadRouting: boolean;
  riverRouting: boolean;
  lengthKm: number;
}

export interface UpdateRouteData {
  name?: string;
  description?: string;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getToken();
  if (!token) {
    throw new Error('Пользователь не авторизован');
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Сохраняет маршрут
 */
export async function saveRoute(data: CreateRouteData): Promise<SavedRoute> {
  const headers = await getAuthHeaders();
  const response = await fetch(getApiUrl('/api/routes'), {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка сохранения маршрута' }));
    throw new Error(error.error || 'Ошибка сохранения маршрута');
  }

  const result = await response.json();
  return result.route;
}

/**
 * Получает все маршруты пользователя
 */
export async function getRoutes(): Promise<SavedRoute[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(getApiUrl('/api/routes'), {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка получения маршрутов' }));
    throw new Error(error.error || 'Ошибка получения маршрутов');
  }

  const result = await response.json();
  return result.routes;
}

/**
 * Получает маршрут по ID с анализом
 */
export async function getRoute(routeId: string): Promise<{ route: SavedRoute; analysis?: RouteAnalysis }> {
  const headers = await getAuthHeaders();
  const response = await fetch(getApiUrl(`/api/routes/${routeId}`), {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка получения маршрута' }));
    throw new Error(error.error || 'Ошибка получения маршрута');
  }

  return await response.json();
}

/**
 * Обновляет маршрут
 */
export async function updateRoute(routeId: string, data: UpdateRouteData): Promise<SavedRoute> {
  const headers = await getAuthHeaders();
  const response = await fetch(getApiUrl(`/api/routes/${routeId}`), {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка обновления маршрута' }));
    throw new Error(error.error || 'Ошибка обновления маршрута');
  }

  const result = await response.json();
  return result.route;
}

/**
 * Удаляет маршрут
 */
export async function deleteRoute(routeId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(getApiUrl(`/api/routes/${routeId}`), {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка удаления маршрута' }));
    throw new Error(error.error || 'Ошибка удаления маршрута');
  }
}

/**
 * Сохраняет анализ маршрута
 */
export async function saveRouteAnalysis(
  routeId: string,
  analysis: any,
  startDate?: string,
  endDate?: string,
  tourismType?: string
): Promise<RouteAnalysis> {
  console.log('[RouteService] Saving analysis:', {
    routeId,
    hasAnalysis: !!analysis,
    analysisKeys: analysis ? Object.keys(analysis) : null,
    hasAnalysisField: !!analysis?.analysis,
    hasStats: !!analysis?.stats,
    hasTerrainType: !!analysis?.terrainType,
    hasGeographicContext: !!analysis?.geographicContext,
    hasFormattedGeoContext: !!analysis?.formattedGeoContext,
    startDate,
    endDate,
    tourismType,
  });

  const headers = await getAuthHeaders();
  const body = { analysis, startDate, endDate, tourismType };
  
  console.log('[RouteService] Request body keys:', Object.keys(body));
  console.log('[RouteService] Analysis structure:', {
    analysisType: typeof analysis?.analysis,
    analysisLength: typeof analysis?.analysis === 'string' ? analysis.analysis.length : 'N/A',
    statsType: typeof analysis?.stats,
    terrainTypeValue: analysis?.terrainType,
    geographicContextType: typeof analysis?.geographicContext,
    formattedGeoContextType: typeof analysis?.formattedGeoContext,
    formattedGeoContextLength: typeof analysis?.formattedGeoContext === 'string' ? analysis.formattedGeoContext.length : 'N/A',
  });

  const response = await fetch(getApiUrl(`/api/routes/${routeId}/analysis`), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    let error;
    try {
      error = JSON.parse(errorText);
    } catch {
      error = { error: errorText || 'Ошибка сохранения анализа' };
    }
    console.error('[RouteService] Save analysis error:', {
      status: response.status,
      statusText: response.statusText,
      error,
      errorText,
    });
    throw new Error(error.error || 'Ошибка сохранения анализа');
  }

  const result = await response.json();
  return result.analysis;
}

