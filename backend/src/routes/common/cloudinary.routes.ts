import { Router } from 'express';
import { getSignature, getStatus } from '../controllers/cloudinary.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

/**
 * POST /api/cloudinary/sign
 * Generar signature para signed upload (cliente sube directo a Cloudinary)
 * Requiere autenticación
 */
router.post('/sign', authenticate, getSignature);

/**
 * GET /api/cloudinary/status
 * Verificar si Cloudinary está configurado (admin only)
 */
router.get('/status', authenticate, getStatus);

export default router;
