import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { listarDispositivos, actualizarEstadoDispositivo } from '../../controllers/admin/dispositivo.controller';

const router = Router();

// Todas las rutas requieren autenticación y rol admin
router.use(authenticate);

// GET  /api/admin/dispositivos
router.get('/', listarDispositivos);

// PATCH /api/admin/dispositivos/:id
router.patch('/:id', actualizarEstadoDispositivo);

export default router;
