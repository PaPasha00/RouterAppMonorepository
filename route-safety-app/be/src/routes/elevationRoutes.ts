import { Router } from 'express';
import { ElevationController } from '../controllers/elevationController';

const router = Router();
const elevationController = new ElevationController();

/**
 * Маршруты для работы с данными о высотах
 */
router.post('/elevation', (req, res) => {
  elevationController.getElevation(req, res);
});

export default router;
