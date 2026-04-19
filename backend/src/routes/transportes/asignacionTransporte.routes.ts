import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth';
import {
  getBorradoresPendientes,
  getUnidadesDisponibles,
  asignarUnidad
} from '../../controllers/transportes/asignacionTransporte.controller';

const router = Router();

// Todas las rutas de este módulo requieren autenticación
router.use(authenticate);

// Permisos estándar: Transportes, Admin, y Encargado de Nóminas (solo vista ocasional, aunque principalmente Transportes)
const permisosTransportes = ['TRANSPORTES', 'ADMIN', 'SUPER_ADMIN', 'ADMIN_TRANSPORTES'];

// GET /api/transportes/asignaciones/pendientes
// Obtener borradores (turnos sin unidad asignada)
router.get('/pendientes', authorize(...permisosTransportes), getBorradoresPendientes);

// GET /api/transportes/asignaciones/unidades-disponibles
// Obtener unidades operativas (no en taller) y listadas como disponibles
router.get('/unidades-disponibles', authorize(...permisosTransportes), getUnidadesDisponibles);

// PUT /api/transportes/asignaciones/:asignacionId/unidad
// Asignar (o reasignar) una unidad a un borrador
router.put('/:asignacionId/unidad', authorize('TRANSPORTES', 'ADMIN', 'SUPER_ADMIN', 'ADMIN_TRANSPORTES'), asignarUnidad);

export default router;
