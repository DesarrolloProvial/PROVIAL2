import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, refresh, logout, me, checkResetStatus, resetPassword } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Rate limiter para endpoints de autenticación (protege contra fuerza bruta)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 15,                   // máximo 15 intentos por ventana por IP
  message: { error: 'Demasiados intentos de login. Intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  message: { error: 'Demasiados intentos de reset. Intente de nuevo en 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/login
router.post('/login', loginLimiter, login);

// POST /api/auth/refresh
router.post('/refresh', refresh);

// POST /api/auth/logout
router.post('/logout', logout);

// POST /api/auth/check-reset-status
router.post('/check-reset-status', resetLimiter, checkResetStatus);

// POST /api/auth/reset-password
router.post('/reset-password', resetLimiter, resetPassword);

// GET /api/auth/me (protegido)
router.get('/me', authenticate, me);

export default router;
