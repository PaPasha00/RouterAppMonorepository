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

    const analysis = getAnalysisByRouteId(id, req.user.id);

    res.json({ route, analysis });
  } catch (error) {
    console.error('Ошибка получения маршрута:', error);
    res.status(500).json({ error: 'Ошибка при получении маршрута' });
  }
}

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

export async function saveRouteAnalysis(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    const routeId = req.params.id;
    const { analysis, startDate, endDate, tourismType } = req.body;

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

    if (!analysis.formattedGeoContext || typeof analysis.formattedGeoContext !== 'string') {
      analysis.formattedGeoContext = analysis.geographicContext 
        ? JSON.stringify(analysis.geographicContext) 
        : 'Неизвестно';
    }

    if (!Array.isArray(analysis.dailyRoutes)) {
      analysis.dailyRoutes = [];
    }
    if (typeof analysis.totalDays !== 'number') {
      analysis.totalDays = analysis.dailyRoutes.length || 1;
    }

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

