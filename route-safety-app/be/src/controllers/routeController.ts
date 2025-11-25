import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  createRoute,
  getUserRoutes,
  getRouteById,
  updateRoute,
  deleteRoute,
} from '../services/routeService';
import {
  createRouteAnalysis,
  getAnalysisByRouteId,
} from '../services/savedRouteAnalysisService';

/**
 * Создает новый маршрут
 */
export async function saveRoute(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    const { name, description, coordinates, waypointNames, roadRouting, riverRouting, lengthKm } = req.body;

    if (!name || !coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      res.status(400).json({ error: 'Некорректные данные маршрута' });
      return;
    }

    const route = createRoute({
      userId: req.user.id,
      name,
      description,
      coordinates,
      waypointNames,
      roadRouting: Boolean(roadRouting),
      riverRouting: Boolean(riverRouting),
      lengthKm: Number(lengthKm),
    });

    res.status(201).json({ route });
  } catch (error) {
    console.error('Ошибка сохранения маршрута:', error);
    res.status(500).json({ error: 'Ошибка при сохранении маршрута' });
  }
}

/**
 * Получает все маршруты пользователя
 */
export function getRoutes(req: AuthRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    const routes = getUserRoutes(req.user.id);
    res.json({ routes });
  } catch (error) {
    console.error('Ошибка получения маршрутов:', error);
    res.status(500).json({ error: 'Ошибка при получении маршрутов' });
  }
}

/**
 * Получает маршрут по ID
 */
export function getRoute(req: AuthRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    const { id } = req.params;
    const route = getRouteById(id, req.user.id);

    if (!route) {
      res.status(404).json({ error: 'Маршрут не найден' });
      return;
    }

    // Получаем анализ, если есть
    const analysis = getAnalysisByRouteId(id, req.user.id);

    res.json({ route, analysis });
  } catch (error) {
    console.error('Ошибка получения маршрута:', error);
    res.status(500).json({ error: 'Ошибка при получении маршрута' });
  }
}

/**
 * Обновляет маршрут
 */
export function updateRouteHandler(req: AuthRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    const { id } = req.params;
    const { name, description } = req.body;

    const route = updateRoute(id, req.user.id, { name, description });

    if (!route) {
      res.status(404).json({ error: 'Маршрут не найден' });
      return;
    }

    res.json({ route });
  } catch (error) {
    console.error('Ошибка обновления маршрута:', error);
    res.status(500).json({ error: 'Ошибка при обновлении маршрута' });
  }
}

/**
 * Удаляет маршрут
 */
export function deleteRouteHandler(req: AuthRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    const { id } = req.params;
    const deleted = deleteRoute(id, req.user.id);

    if (!deleted) {
      res.status(404).json({ error: 'Маршрут не найден' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления маршрута:', error);
    res.status(500).json({ error: 'Ошибка при удалении маршрута' });
  }
}

/**
 * Сохраняет анализ маршрута
 */
export async function saveRouteAnalysis(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    // routeId берется из URL параметра, а не из body
    const routeId = req.params.id;
    const { analysis, startDate, endDate, tourismType } = req.body;

    console.log('[SAVE ANALYSIS] Request params and body:', {
      routeIdFromParams: routeId,
      hasAnalysis: !!analysis,
      analysisType: typeof analysis,
      analysisIsObject: analysis && typeof analysis === 'object',
      analysisKeys: analysis && typeof analysis === 'object' ? Object.keys(analysis) : null,
      startDate,
      endDate,
      tourismType,
    });

    if (!routeId) {
      console.error('[SAVE ANALYSIS] Missing routeId in URL params');
      res.status(400).json({ error: 'Некорректные данные анализа: отсутствует routeId в URL' });
      return;
    }

    if (!analysis) {
      console.error('[SAVE ANALYSIS] Missing analysis object');
      res.status(400).json({ error: 'Некорректные данные анализа: отсутствует объект analysis' });
      return;
    }

    if (typeof analysis !== 'object') {
      console.error('[SAVE ANALYSIS] Analysis is not an object:', typeof analysis);
      res.status(400).json({ error: 'Некорректные данные анализа: analysis должен быть объектом' });
      return;
    }

    // Валидация обязательных полей анализа
    console.log('[SAVE ANALYSIS] Received data:', {
      routeId,
      hasAnalysis: !!analysis,
      analysisKeys: analysis ? Object.keys(analysis) : null,
      hasAnalysisField: !!analysis?.analysis,
      hasStats: !!analysis?.stats,
      hasTerrainType: !!analysis?.terrainType,
      hasGeographicContext: !!analysis?.geographicContext,
      hasFormattedGeoContext: !!analysis?.formattedGeoContext,
      formattedGeoContextValue: analysis?.formattedGeoContext,
      formattedGeoContextType: typeof analysis?.formattedGeoContext,
      hasDailyRoutes: !!analysis?.dailyRoutes,
      dailyRoutesCount: analysis?.dailyRoutes ? (Array.isArray(analysis.dailyRoutes) ? analysis.dailyRoutes.length : 0) : 0,
      firstDayWeather: analysis?.dailyRoutes && Array.isArray(analysis.dailyRoutes) && analysis.dailyRoutes.length > 0
        ? {
            hasWeather: !!analysis.dailyRoutes[0].weather,
            weatherKeys: analysis.dailyRoutes[0].weather ? Object.keys(analysis.dailyRoutes[0].weather) : null,
            temperature: analysis.dailyRoutes[0].weather?.temperature,
            conditions: analysis.dailyRoutes[0].weather?.conditions,
          }
        : null,
    });

    // Проверяем обязательные поля с более детальными сообщениями
    const missingFields: string[] = [];
    
    if (!analysis.analysis || (typeof analysis.analysis === 'string' && analysis.analysis.trim().length === 0)) {
      missingFields.push('analysis (текст анализа)');
    }
    
    if (!analysis.stats || typeof analysis.stats !== 'object') {
      missingFields.push('stats (статистика маршрута)');
    }
    
    if (!analysis.terrainType || (typeof analysis.terrainType === 'string' && analysis.terrainType.trim().length === 0)) {
      missingFields.push('terrainType (тип местности)');
    }
    
    if (!analysis.geographicContext || typeof analysis.geographicContext !== 'object') {
      missingFields.push('geographicContext (географический контекст)');
    }

    if (missingFields.length > 0) {
      console.error('Отсутствуют обязательные поля анализа:', missingFields);
      console.error('Полученные данные:', {
        hasAnalysis: !!analysis.analysis,
        analysisType: typeof analysis.analysis,
        analysisValue: typeof analysis.analysis === 'string' ? analysis.analysis.substring(0, 100) : analysis.analysis,
        hasStats: !!analysis.stats,
        statsType: typeof analysis.stats,
        hasTerrainType: !!analysis.terrainType,
        terrainTypeValue: analysis.terrainType,
        hasGeographicContext: !!analysis.geographicContext,
        geographicContextType: typeof analysis.geographicContext,
        allKeys: Object.keys(analysis),
      });
      res.status(400).json({ 
        error: `Некорректные данные анализа: отсутствуют поля: ${missingFields.join(', ')}` 
      });
      return;
    }

    // formattedGeoContext может быть пустым, но должен быть строкой
    if (!analysis.formattedGeoContext || typeof analysis.formattedGeoContext !== 'string') {
      analysis.formattedGeoContext = analysis.geographicContext 
        ? JSON.stringify(analysis.geographicContext) 
        : 'Неизвестно';
    }

    // Убеждаемся, что есть dailyRoutes и totalDays
    if (!Array.isArray(analysis.dailyRoutes)) {
      analysis.dailyRoutes = [];
    }
    if (typeof analysis.totalDays !== 'number') {
      analysis.totalDays = analysis.dailyRoutes.length || 1;
    }

    // Проверяем, что маршрут принадлежит пользователю
    const route = getRouteById(routeId, req.user.id);
    if (!route) {
      res.status(404).json({ error: 'Маршрут не найден' });
      return;
    }

    const savedAnalysis = createRouteAnalysis({
      routeId,
      userId: req.user.id,
      analysis,
      startDate,
      endDate,
      tourismType,
    });

    res.status(201).json({ analysis: savedAnalysis });
  } catch (error) {
    console.error('Ошибка сохранения анализа:', error);
    res.status(500).json({ error: 'Ошибка при сохранении анализа' });
  }
}

