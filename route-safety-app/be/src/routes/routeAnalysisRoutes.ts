import { Router } from 'express';
import { RouteAnalysisController } from '../controllers/routeAnalysisController';

const router = Router();
const routeAnalysisController = new RouteAnalysisController();

/**
 * Маршруты для анализа маршрутов
 */
router.post('/analyze-route', (req, res) => {
  routeAnalysisController.analyzeRoute(req, res);
});

export default router;
