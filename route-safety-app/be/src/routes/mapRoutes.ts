import { Router } from 'express';
import { getMapImage, getMapTile, getMapProviders } from '../controllers/mapController';

const router = Router();

// GET /api/map/image - получить изображение карты
router.get('/image', getMapImage);

// GET /api/map/tile - получить тайл карты
router.get('/tile', getMapTile);

// GET /api/map/providers - получить список доступных провайдеров
router.get('/providers', getMapProviders);

export default router;
