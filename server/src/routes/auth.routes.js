import { Router } from 'express';
import multer from 'multer';
import {
  register,
  login,
  refresh,
  me,
  oauthSession,
  updateProfile,
  uploadAvatar,
  changePassword,
  changeEmail,
} from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
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

// In-memory multipart parsing for the avatar upload (file lands in req.file).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/oauth/session', validate(oauthSessionSchema), oauthSession);
router.get('/me', requireAuth, me);
router.patch('/profile', requireAuth, validate(updateProfileSchema), updateProfile);
router.post('/profile/avatar', requireAuth, upload.single('avatar'), uploadAvatar);
router.post('/password', requireAuth, validate(changePasswordSchema), changePassword);
router.post('/email', requireAuth, validate(changeEmailSchema), changeEmail);

export default router;
