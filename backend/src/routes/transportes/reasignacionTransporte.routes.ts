import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth';
import {
  crearReasignacionUnidad,
  getReasignacionesUnidad,
  finalizarReasignacionUnidad,
  cancelarReasignacionUnidad,
} from '../../controllers/transportes/reasignacionTransporte.controller';

const router = Router();
router.use(authenticate);

// Lectura: roles con visibilidad de flota
router.get(
  '/activas',
  authorize('COP', 'OPERACIONES', 'ADMIN', 'MANDOS', 'TRANSPORTES'),
  getReasignacionesUnidad
);

// Escritura: solo alto mando (SUPER_ADMIN siempre pasa por el middleware authorize)
router.post('/', authorize('ADMIN', 'TRANSPORTES'), crearReasignacionUnidad);
router.post('/:id/finalizar', authorize('ADMIN', 'TRANSPORTES'), finalizarReasignacionUnidad);
router.post('/:id/cancelar', authorize('ADMIN', 'TRANSPORTES'), cancelarReasignacionUnidad);

export default router;
