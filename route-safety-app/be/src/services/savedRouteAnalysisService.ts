import { v4 as uuidv4 } from 'uuid';
import db from '../database/db';
import { RouteAnalysisResponse } from '../types';

export interface SavedRouteAnalysis {
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

export interface CreateAnalysisData {
  routeId: string;
  userId: string;
  analysis: RouteAnalysisResponse;
  startDate?: string;
  endDate?: string;
  tourismType?: string;
}

/**
 * Создает новый анализ маршрута
 */
export function createRouteAnalysis(data: CreateAnalysisData): SavedRouteAnalysis {
  const id = uuidv4();
  const now = new Date().toISOString();

  const analysis: SavedRouteAnalysis = {
    id,
    routeId: data.routeId,
    userId: data.userId,
    analysis: data.analysis.analysis,
    analysisStructured: data.analysis.analysisStructured,
    stats: data.analysis.stats,
    terrainType: data.analysis.terrainType,
    geographicContext: data.analysis.geographicContext,
    formattedGeoContext: data.analysis.formattedGeoContext,
    dailyRoutes: data.analysis.dailyRoutes,
    totalDays: data.analysis.totalDays,
    startDate: data.startDate,
    endDate: data.endDate,
    tourismType: data.tourismType,
    createdAt: now,
  };

  // Логирование для проверки сохранения погоды
  console.log('[SAVE ANALYSIS SERVICE] Saving analysis with dailyRoutes:', {
    dailyRoutesCount: analysis.dailyRoutes ? (Array.isArray(analysis.dailyRoutes) ? analysis.dailyRoutes.length : 0) : 0,
    firstDayWeather: analysis.dailyRoutes && Array.isArray(analysis.dailyRoutes) && analysis.dailyRoutes.length > 0
      ? {
          day: analysis.dailyRoutes[0].day,
          date: analysis.dailyRoutes[0].date,
          hasWeather: !!analysis.dailyRoutes[0].weather,
          weatherData: analysis.dailyRoutes[0].weather,
        }
      : null,
  });

  const stmt = db.prepare(`
    INSERT INTO route_analyses (
      id, routeId, userId, analysis, analysisStructured, stats,
      terrainType, geographicContext, formattedGeoContext, dailyRoutes,
      totalDays, startDate, endDate, tourismType, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    analysis.id,
    analysis.routeId,
    analysis.userId,
    analysis.analysis,
    analysis.analysisStructured ? JSON.stringify(analysis.analysisStructured) : null,
    JSON.stringify(analysis.stats),
    analysis.terrainType,
    JSON.stringify(analysis.geographicContext),
    analysis.formattedGeoContext,
    analysis.dailyRoutes ? JSON.stringify(analysis.dailyRoutes) : null,
    analysis.totalDays,
    analysis.startDate || null,
    analysis.endDate || null,
    analysis.tourismType || null,
    analysis.createdAt
  );

  return analysis;
}

/**
 * Получает анализ маршрута по ID маршрута
 */
export function getAnalysisByRouteId(routeId: string, userId: string): SavedRouteAnalysis | null {
  const stmt = db.prepare('SELECT * FROM route_analyses WHERE routeId = ? AND userId = ? ORDER BY createdAt DESC LIMIT 1');
  const row = stmt.get(routeId, userId) as any;

  return row ? rowToAnalysis(row) : null;
}

/**
 * Получает анализ по ID
 */
export function getAnalysisById(analysisId: string, userId: string): SavedRouteAnalysis | null {
  const stmt = db.prepare('SELECT * FROM route_analyses WHERE id = ? AND userId = ?');
  const row = stmt.get(analysisId, userId) as any;

  return row ? rowToAnalysis(row) : null;
}

/**
 * Удаляет анализ маршрута
 */
export function deleteRouteAnalysis(analysisId: string, userId: string): boolean {
  const stmt = db.prepare('DELETE FROM route_analyses WHERE id = ? AND userId = ?');
  const result = stmt.run(analysisId, userId);

  return result.changes > 0;
}

/**
 * Преобразует строку БД в объект SavedRouteAnalysis
 */
function rowToAnalysis(row: any): SavedRouteAnalysis {
  let dailyRoutes;
  try {
    dailyRoutes = row.dailyRoutes ? JSON.parse(row.dailyRoutes) : undefined;
    
    // Логирование для проверки данных о погоде
    if (dailyRoutes && Array.isArray(dailyRoutes) && dailyRoutes.length > 0) {
      console.log('[LOAD ANALYSIS] Parsed dailyRoutes:', {
        count: dailyRoutes.length,
        firstDayWeather: dailyRoutes[0].weather ? {
          hasWeather: true,
          temperature: dailyRoutes[0].weather.temperature,
          conditions: dailyRoutes[0].weather.conditions,
          precipitation: dailyRoutes[0].weather.precipitation,
          windSpeed: dailyRoutes[0].weather.windSpeed,
        } : { hasWeather: false },
      });
    }
  } catch (error) {
    console.error('[LOAD ANALYSIS] Error parsing dailyRoutes:', error);
    dailyRoutes = undefined;
  }

  return {
    id: row.id,
    routeId: row.routeId,
    userId: row.userId,
    analysis: row.analysis,
    analysisStructured: row.analysisStructured ? JSON.parse(row.analysisStructured) : undefined,
    stats: JSON.parse(row.stats),
    terrainType: row.terrainType,
    geographicContext: JSON.parse(row.geographicContext),
    formattedGeoContext: row.formattedGeoContext,
    dailyRoutes,
    totalDays: row.totalDays,
    startDate: row.startDate,
    endDate: row.endDate,
    tourismType: row.tourismType,
    createdAt: row.createdAt,
  };
}

