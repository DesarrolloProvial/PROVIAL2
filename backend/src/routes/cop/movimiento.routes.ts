import { Router } from 'express';
import {
  createMovimiento,
  getMovimiento,
  finalizarMovimiento,
  getMovimientosActivos,
  getMisMovimientosActivos,
  getHistorialMovimientos,
  getComposicionUnidades,
  getComposicionUnidad,
  updateMovimiento,
  deleteMovimiento,
} from '../../controllers/cop/movimiento.controller';
import { authenticate, authorize } from '../../middlewares/auth';

const router = Router();

// ── Brigada: solo sus propios movimientos (app móvil) ───────────────────────

router.get(
  '/mis-movimientos/activos',
  authenticate,
  authorize('BRIGADA'),
  getMisMovimientosActivos
);

// ── COP / gestión operativa en tiempo real ───────────────────────────────────

router.post(
  '/',
  authenticate,
  authorize('COP', 'MANDOS', 'ADMIN', 'SUPER_ADMIN'),
  createMovimiento
);

router.get(
  '/composicion/unidades',
  authenticate,
  authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN', 'SUPER_ADMIN'),
  getComposicionUnidades
);

router.get(
  '/composicion/unidad/:unidad_id',
  authenticate,
  authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN', 'SUPER_ADMIN'),
  getComposicionUnidad
);

router.get(
  '/usuario/:usuario_id/activos',
  authenticate,
  authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN', 'SUPER_ADMIN'),
  getMovimientosActivos
);

router.get(
  '/',
  authenticate,
  authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN', 'SUPER_ADMIN'),
  getHistorialMovimientos
);

router.get(
  '/:id',
  authenticate,
  authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN', 'SUPER_ADMIN'),
  getMovimiento
);

router.patch(
  '/:id/finalizar',
  authenticate,
  authorize('COP', 'MANDOS', 'ADMIN', 'SUPER_ADMIN'),
  finalizarMovimiento
);

router.patch(
  '/:id',
  authenticate,
  authorize('COP', 'MANDOS', 'ADMIN', 'SUPER_ADMIN'),
  updateMovimiento
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  deleteMovimiento
);

export default router;
