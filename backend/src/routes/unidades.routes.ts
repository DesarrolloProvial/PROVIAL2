import { Router } from 'express';
import {
  listarUnidades,
  listarTiposUnidad,
  listarUnidadesActivas,
  obtenerUnidad,
  crearUnidad,
  actualizarUnidad,
  desactivarUnidad,
  activarUnidad,
  transferirUnidad,
  eliminarUnidad,
  asignarBrigadaUnidad,
  desasignarBrigadaUnidad,
  getTripulacionUnidad,
  obtenerUltimaAsignacion
} from '../controllers/unidades.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Listar unidades (Operaciones, Admin, Encargado Nóminas)
// ENCARGADO_NOMINAS: Si puede_ver_todas_sedes=true ve todas, sino solo su sede
router.get('/', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'), listarUnidades);

// Listar tipos de unidad
router.get('/tipos', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'), listarTiposUnidad);

// Listar unidades activas
router.get('/activas', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS', 'COP'), listarUnidadesActivas);

// Obtener unidad específica
router.get('/:id', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'), obtenerUnidad);

// Obtener última asignación de unidad
router.get('/:id/ultima-asignacion', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'), obtenerUltimaAsignacion);

// Crear unidad (Admin)
router.post('/', authenticate, authorize('ADMIN'), crearUnidad);

// Actualizar unidad
router.put('/:id', authenticate, authorize('OPERACIONES', 'ADMIN'), actualizarUnidad);

// Desactivar unidad
router.put('/:id/desactivar', authenticate, authorize('OPERACIONES', 'ADMIN'), desactivarUnidad);

// Activar unidad
router.put('/:id/activar', authenticate, authorize('OPERACIONES', 'ADMIN'), activarUnidad);

// Transferir unidad a otra sede
router.put('/:id/transferir', authenticate, authorize('OPERACIONES', 'ADMIN'), transferirUnidad);

// Eliminar unidad (solo si no tiene historial)
router.delete('/:id', authenticate, authorize('ADMIN'), eliminarUnidad);

// Gestión de tripulación permanente (lectura para ENCARGADO_NOMINAS)
router.get('/:id/tripulacion', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'), getTripulacionUnidad);
router.post('/:id/asignar-brigada', authenticate, authorize('OPERACIONES', 'ADMIN'), asignarBrigadaUnidad);
router.delete('/:id/desasignar-brigada/:brigadaId', authenticate, authorize('OPERACIONES', 'ADMIN'), desasignarBrigadaUnidad);

export default router;
