import { Router } from 'express';
import { register, login, getCurrentUser } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Публичные маршруты
router.post('/auth/register', register);
router.post('/auth/login', login);

// Защищенные маршруты
router.get('/auth/me', authenticateToken, getCurrentUser);

export default router;

