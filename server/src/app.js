import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import sellerRoutes from './routes/seller.routes.js';
import sellerApplicationsRoutes from './routes/sellerApplications.routes.js';
import adminRoutes from './routes/admin.routes.js';
import orderRoutes from './routes/order.routes.js';
import contactRoutes from './routes/contact.routes.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(
    helmet({
      // The API only ever returns JSON, so a strict policy is safe. The SPA's
      // own host must send an equivalent header for the HTML document.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'", 'https:'],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(cookieParser());
  app.use(express.json());
  if (env.nodeEnv !== 'test') app.use(morgan('dev'));

  // Routes
  app.use('/health', healthRoutes);
  app.use('/auth', authRoutes);
  app.use(catalogRoutes);
  app.use(sellerRoutes);
  app.use(sellerApplicationsRoutes);
  app.use(adminRoutes);
  app.use(orderRoutes);
  app.use(contactRoutes);

  // Fallbacks (order matters: 404 first, then the error handler)
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
