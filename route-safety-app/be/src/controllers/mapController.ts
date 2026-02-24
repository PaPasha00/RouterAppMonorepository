import { Request, Response } from 'express';
import { MapService, MapRequest } from '../services/mapService';

const mapService = new MapService();

export const getMapImage = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, zoom, width, height, provider } = req.query;

    // Валидация параметров
    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Требуются параметры latitude и longitude'
      });
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        error: 'Некорректные координаты'
      });
    }

    if (lat < -90 || lat > 90) {
      return res.status(400).json({
        error: 'Широта должна быть от -90 до 90'
      });
    }

    if (lng < -180 || lng > 180) {
      return res.status(400).json({
        error: 'Долгота должна быть от -180 до 180'
      });
    }

    const request: MapRequest = {
      latitude: lat,
      longitude: lng,
      zoom: zoom ? parseInt(zoom as string) : 15,
      width: width ? parseInt(width as string) : 400,
      height: height ? parseInt(height as string) : 300,
      provider: (provider as 'google' | 'yandex' | 'osm') || 'osm'
    };

    const result = await mapService.getMapImage(request);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Ошибка получения карты:', error);
    res.status(500).json({
      error: 'Не удалось получить изображение карты',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
};

export const getMapTile = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, zoom, provider } = req.query;

    if (!latitude || !longitude || !zoom) {
      return res.status(400).json({
        error: 'Требуются параметры latitude, longitude и zoom'
      });
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const zoomLevel = parseInt(zoom as string);

    if (isNaN(lat) || isNaN(lng) || isNaN(zoomLevel)) {
      return res.status(400).json({
        error: 'Некорректные параметры'
      });
    }

    const tileUrl = await mapService.getMapTile(
      lat,
      lng,
      zoomLevel,
      (provider as 'google' | 'yandex' | 'osm') || 'osm'
    );

    res.json({
      success: true,
      tileUrl
    });
  } catch (error) {
    console.error('Ошибка получения тайла карты:', error);
    res.status(500).json({
      error: 'Не удалось получить тайл карты',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
};

export const getMapProviders = async (req: Request, res: Response) => {
  try {
    const providers = [
      {
        id: 'osm',
        name: 'OpenStreetMap',
        description: 'Бесплатная карта с открытым исходным кодом',
        available: true
      },
      {
        id: 'google',
        name: 'Google Maps',
        description: 'Спутниковые снимки Google',
        available: !!process.env.GOOGLE_MAPS_API_KEY
      },
      {
        id: 'yandex',
        name: 'Yandex Maps',
        description: 'Российские карты и спутниковые снимки',
        available: true
      }
    ];

    res.json({
      success: true,
      providers
    });
  } catch (error) {
    console.error('Ошибка получения провайдеров:', error);
    res.status(500).json({
      error: 'Не удалось получить список провайдеров'
    });
  }
};
