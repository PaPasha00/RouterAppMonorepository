import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import elevationRoutes from './routes/elevationRoutes';
import routeAnalysisRoutes from './routes/routeAnalysisRoutes';
import mapRoutes from './routes/mapRoutes';
import authRoutes from './routes/authRoutes';
import routeRoutes from './routes/routeRoutes';
// Инициализируем базу данных при запуске приложения
import './database/db';

// Загружаем переменные окружения
dotenv.config();

/**
 * Создает и настраивает Express приложение
 */
export function createApp(): express.Application {
  const app = express();

  // Middleware
  // Настройка CORS из переменных окружения
  const corsOptions = {
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
      : '*', // По умолчанию разрешаем все (для разработки)
    credentials: true,
  };
  app.use(cors(corsOptions));
  app.use(express.json());

  // Routes - порядок важен! Публичные маршруты должны быть перед защищенными
  app.use('/api', authRoutes);
  app.use('/api', routeAnalysisRoutes); // Публичный - анализ маршрута
  app.use('/api', elevationRoutes); // Публичный - данные о высотах
  app.use('/api/map', mapRoutes); // Публичный - карты
  app.use('/api', routeRoutes); // Защищенный - требует авторизацию

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  return app;
}
