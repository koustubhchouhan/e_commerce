import { Router } from 'express';
import { cacheStats } from '../middleware/cacheMetrics.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'novamarket-api',
    time: new Date().toISOString(),
    cache: cacheStats(),
  });
});

export default router;
