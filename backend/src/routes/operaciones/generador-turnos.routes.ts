import { Router } from 'express';
import { GeneradorTurnosController } from '../controllers/generador-turnos.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

/**
 * @route   POST /api/generador-turnos/sugerencias
 * @desc    Generar sugerencias de asignaciones automáticas
 * @access  OPERACIONES, ADMIN
 */
router.post(
  '/sugerencias',
  authenticate,
  authorize('OPERACIONES', 'ADMIN'),
  GeneradorTurnosController.generarSugerencias
);

export default router;
