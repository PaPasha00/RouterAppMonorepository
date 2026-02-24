import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  saveRoute,
  getRoutes,
  getRoute,
  updateRouteHandler,
  deleteRouteHandler,
  saveRouteAnalysis,
} from '../controllers/routeController';

const router = Router();

// Все маршруты требуют авторизации
router.use(authenticateToken);

router.post('/routes', saveRoute);
router.get('/routes', getRoutes);
router.get('/routes/:id', getRoute);
router.put('/routes/:id', updateRouteHandler);
router.delete('/routes/:id', deleteRouteHandler);
router.post('/routes/:id/analysis', saveRouteAnalysis);

export default router;

