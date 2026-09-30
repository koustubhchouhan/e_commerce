import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  me,
  oauthSession,
  updateProfile,
  uploadAvatar,
  changePassword,
  changeEmail,
} from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit, userKey } from '../middleware/rateLimit.js';
import { imageUploadSingle, AVATAR_POLICY } from '../middleware/upload.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  oauthSessionSchema,
  updateProfileSchema,
  changePasswordSchema,
  changeEmailSchema,
} from '../validators/auth.validators.js';

const router = Router();

// Anonymous endpoints are throttled by client IP; the sensitive signed-in ones
// by account. Budgets are intentionally generous enough for a person retrying,
// but small enough to blunt credential stuffing and account-creation spam.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  name: 'auth:register',
  message: 'Too many accounts created from this address. Please try again later.',
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  name: 'auth:login',
  message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
});
const refreshLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, name: 'auth:refresh' });
const oauthLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, name: 'auth:oauth' });
const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  name: 'auth:account',
  keyGenerator: userKey,
  message: 'Too many attempts on this account. Please try again later.',
});

router.post('/register', registerLimiter, validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/refresh', refreshLimiter, validate(refreshSchema), refresh);
router.post('/logout', logout);
router.post('/oauth/session', oauthLimiter, validate(oauthSessionSchema), oauthSession);
router.get('/me', requireAuth, me);
router.patch('/profile', requireAuth, validate(updateProfileSchema), updateProfile);
router.post('/profile/avatar', requireAuth, ...imageUploadSingle('avatar', AVATAR_POLICY), uploadAvatar);
router.post('/password', requireAuth, accountLimiter, validate(changePasswordSchema), changePassword);
router.post('/email', requireAuth, accountLimiter, validate(changeEmailSchema), changeEmail);

export default router;
