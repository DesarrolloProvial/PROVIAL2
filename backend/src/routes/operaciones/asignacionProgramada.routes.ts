import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth';
import {
  crearAsignacionProgramada,
  getAsignaciones,
  getAsignacion,
  getMiAsignacion,
  cancelarAsignacion,
} from '../../controllers/operaciones/asignacionProgramada.controller';

const router = Router();

// Crear asignación programada (Operaciones crea, Transportes asigna unidad después)
router.post('/', authenticate, authorize('OPERACIONES', 'ADMIN', 'SUPER_ADMIN'), crearAsignacionProgramada);

// Listar asignaciones (filtradas por sede del usuario)
router.get('/', authenticate, authorize('OPERACIONES', 'ADMIN', 'SUPER_ADMIN', 'TRANSPORTES'), getAsignaciones);

// Mi asignación (brigada ve la suya)
router.get('/mi-asignacion', authenticate, getMiAsignacion);

// Detalle de una asignación
router.get('/:id', authenticate, getAsignacion);

// Cancelar asignación
router.put('/:id/cancelar', authenticate, authorize('OPERACIONES', 'ADMIN', 'SUPER_ADMIN'), cancelarAsignacion);

export default router;
