import { Router } from 'express';
import { getSettings } from '../controllers/settings.controller.js';
import { publicCache } from '../middleware/cache.js';

const router = Router();

// Public read so checkout can display the exact delivery numbers that
// create_orders() will charge. Short cache so admin changes surface quickly.
router.get('/settings', publicCache(60, 300), getSettings);

export default router;
