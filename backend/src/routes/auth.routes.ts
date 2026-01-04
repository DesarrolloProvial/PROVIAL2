import { Router } from 'express';
import { login, refresh, logout, me, checkResetStatus, resetPassword } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/refresh
router.post('/refresh', refresh);

// POST /api/auth/logout
router.post('/logout', logout);

// POST /api/auth/check-reset-status
router.post('/check-reset-status', checkResetStatus);

// POST /api/auth/reset-password
router.post('/reset-password', resetPassword);

// GET /api/auth/me (protegido)
router.get('/me', authenticate, me);

export default router;
