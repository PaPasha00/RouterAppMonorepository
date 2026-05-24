import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import elevationRoutes from './routes/elevationRoutes';
import routeAnalysisRoutes from './routes/routeAnalysisRoutes';
import mapRoutes from './routes/mapRoutes';
import authRoutes from './routes/authRoutes';
import routeRoutes from './routes/routeRoutes';
import './database/db';

dotenv.config();

export function createApp(): express.Application {
  const app = express();

  const corsOptions = {
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
      : '*',
    credentials: true,
  };
  app.use(cors(corsOptions));
  app.use(express.json());

  // Публичные маршруты — до защищённых
  app.use('/api', authRoutes);
  app.use('/api', routeAnalysisRoutes);
  app.use('/api', elevationRoutes);
  app.use('/api/map', mapRoutes);
  app.use('/api', routeRoutes);

  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  return app;
}
