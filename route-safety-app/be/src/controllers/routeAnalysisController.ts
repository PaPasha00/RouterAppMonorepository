import { Request, Response } from 'express';
import { RouteAnalysisRequest, ApiError } from '../types';
import { RouteAnalysisService } from '../services/routeAnalysisService';

const routeAnalysisService = new RouteAnalysisService();

/**
 * Контроллер для анализа маршрутов
 */
export class RouteAnalysisController {
  /**
   * Анализирует маршрут и возвращает детальный отчет
   */
  async analyzeRoute(req: Request, res: Response): Promise<void> {
    try {
      const raw = (req.body || {}) as any;

      // Нормализация координат: поддержка как coordinates: [ [lat,lng], ... ], так и points: [{lat,lng}, ...]
      const coordinates: [number, number][] = Array.isArray(raw.coordinates)
        ? raw.coordinates
        : Array.isArray(raw.points)
        ? raw.points.map((p: any) => [Number(p.lat), Number(p.lng)])
        : [];

      if (!coordinates || coordinates.length < 2) {
        res.status(400).json({ error: 'Недостаточно точек маршрута' });
        return;
      }

      // Подсчёт протяженности, если не передана
      function haversineKm(a: [number, number], b: [number, number]): number {
        const R = 6371;
        const toRad = (d: number) => (d * Math.PI) / 180;
        const dLat = toRad(b[0] - a[0]);
        const dLon = toRad(b[1] - a[1]);
        const la1 = toRad(a[0]);
        const la2 = toRad(b[0]);
        const s =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
      }

      let lengthKm = raw.lengthKm as number | undefined;
      if (lengthKm == null) {
        let sum = 0;
        for (let i = 1; i < coordinates.length; i++) sum += haversineKm(coordinates[i - 1], coordinates[i]);
        lengthKm = Math.round(sum * 100) / 100;
      }

      const requestData: RouteAnalysisRequest = {
        ...raw,
        coordinates,
        lengthKm,
        lengthMeters: raw.lengthMeters ?? Math.round((lengthKm || 0) * 1000),
        elevationGain: raw.elevationGain ?? 0,
      } as RouteAnalysisRequest;

      console.log('[ANALYZE:REQ]', {
        points: coordinates.length,
        lengthKm: requestData.lengthKm,
        tourismType: (raw as any).tourismType,
        dates: `${(raw as any).startDate}→${(raw as any).endDate}`,
      });

      const result = await routeAnalysisService.analyzeRoute(requestData);
      res.json(result);
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      console.error('[ANALYZE:ERR]', error?.message, status, data);

      const apiError: ApiError = {
        error: status
          ? `AI provider error ${status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`
          : 'Не удалось проанализировать маршрут'
      };
      res.status(status || 500).json(apiError);
    }
  }
}
