import { Request, Response } from 'express';
import { ElevationRequest, ApiError } from '../types';
import { ElevationService } from '../services/elevationService';

const elevationService = new ElevationService();

/**
 * Контроллер для работы с данными о высотах
 */
export class ElevationController {
  /**
   * Получает данные о высотах для переданных координат
   */
  async getElevation(req: Request, res: Response): Promise<void> {
    try {
      const { coordinates } = req.body as ElevationRequest;
      
      if (!coordinates || !Array.isArray(coordinates)) {
        const error: ApiError = { error: 'Invalid coordinates format' };
        res.status(400).json(error);
        return;
      }

      // Проверяем, что координаты валидны
      const validCoords = coordinates.filter(coord => 
        Array.isArray(coord) && 
        coord.length === 2 && 
        typeof coord[0] === 'number' && 
        typeof coord[1] === 'number' &&
        coord[0] >= -90 && coord[0] <= 90 && // широта
        coord[1] >= -180 && coord[1] <= 180   // долгота
      );

      if (validCoords.length === 0) {
        const error: ApiError = { error: 'No valid coordinates provided' };
        res.status(400).json(error);
        return;
      }

      console.log(`Requesting elevation data for ${validCoords.length} coordinates`);
      const data = await elevationService.getElevationData({ coordinates: validCoords });
      
      // Логируем результат для отладки
      if (data.results && data.results.length > 0) {
        const elevations = data.results.map(r => r.elevation);
        const minElev = Math.min(...elevations);
        const maxElev = Math.max(...elevations);
        console.log(`Elevation data received: min=${minElev}m, max=${maxElev}m, count=${elevations.length}`);
      }
      
      res.json(data);
      
    } catch (error) {
      console.error('Elevation API error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const apiError: ApiError = { 
        error: `Failed to fetch elevation data: ${errorMessage}`
      };
      res.status(500).json(apiError);
    }
  }
}
