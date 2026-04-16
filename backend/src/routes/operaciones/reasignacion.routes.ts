import { Router } from 'express';
import {
  crearReasignacion,
  getReasignacionesActivas,
  finalizarReasignacion
} from '../controllers/reasignacion.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// ========================================
// REASIGNACIONES DE PERSONAL Y UNIDADES
// ========================================

// Obtener reasignaciones activas (COP, Operaciones, Admin)
router.get('/activas', authenticate, authorize('COP', 'OPERACIONES', 'ADMIN'), getReasignacionesActivas);

// Crear reasignación (Operaciones, Admin, COP)
router.post('/', authenticate, authorize('OPERACIONES', 'ADMIN', 'COP'), crearReasignacion);

// Finalizar reasignación (Operaciones, Admin, COP)
router.post('/:id/finalizar', authenticate, authorize('OPERACIONES', 'ADMIN', 'COP'), finalizarReasignacion);

export default router;
