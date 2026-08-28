import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json());
  if (env.nodeEnv !== 'test') app.use(morgan('dev'));

  // Routes
  app.use('/health', healthRoutes);
  app.use('/auth', authRoutes);

  // Fallbacks (order matters: 404 first, then the error handler)
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
