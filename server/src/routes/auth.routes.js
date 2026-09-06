import { Router } from 'express';
import { register, login, refresh, me, oauthSession } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  oauthSessionSchema,
} from '../validators/auth.validators.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/oauth/session', validate(oauthSessionSchema), oauthSession);
router.get('/me', requireAuth, me);

export default router;
