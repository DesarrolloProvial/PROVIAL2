import { Router } from 'express';
import {
  getReparacionesPorUnidad,
  getReparacionesActivas,
  crearReparacion,
  completarReparacion,
  cancelarReparacion,
  getHistorialUnificado,
} from '../../controllers/transportes/reparaciones.controller';
import { authenticate, authorize } from '../../middlewares/auth';

const router = Router();

// GET /api/reparaciones/activas
router.get(
  '/activas',
  authenticate,
  authorize('TRANSPORTES', 'ADMIN', 'SUPER_ADMIN'),
  getReparacionesActivas
);

// GET /api/reparaciones/historial/:unidadId?desde=&hasta=&tipos=
router.get(
  '/historial/:unidadId',
  authenticate,
  authorize('TRANSPORTES', 'ADMIN', 'SUPER_ADMIN'),
  getHistorialUnificado
);

// GET /api/reparaciones/unidad/:id
router.get(
  '/unidad/:id',
  authenticate,
  authorize('TRANSPORTES', 'ADMIN', 'SUPER_ADMIN'),
  getReparacionesPorUnidad
);

// POST /api/reparaciones
router.post(
  '/',
  authenticate,
  authorize('TRANSPORTES', 'ADMIN', 'SUPER_ADMIN'),
  crearReparacion
);

// PUT /api/reparaciones/:id/completar
router.put(
  '/:id/completar',
  authenticate,
  authorize('TRANSPORTES', 'ADMIN', 'SUPER_ADMIN'),
  completarReparacion
);

// PUT /api/reparaciones/:id/cancelar
router.put(
  '/:id/cancelar',
  authenticate,
  authorize('TRANSPORTES', 'ADMIN', 'SUPER_ADMIN'),
  cancelarReparacion
);

export default router;
