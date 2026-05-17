import { Router } from 'express';
import { getStatus } from '../../controllers/common/cloudinary.controller';
import { authenticate } from '../../middlewares/auth';

const router = Router();

/**
 * GET /api/cloudinary/status
 * Verificar si Cloudinary está configurado (monitoreo de infraestructura)
 */
router.get('/status', authenticate, getStatus);

export default router;
