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
  obtenerUltimaAsignacion,
  reservarNumeroSalida,
  setDisponibilidadTransportes
} from '../controllers/unidades.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Listar unidades — solo Transportes y Admin (Operaciones ya no gestiona unidades)
router.get('/', authenticate, authorize('TRANSPORTES', 'ADMIN', 'ENCARGADO_NOMINAS'), listarUnidades);

// Listar tipos de unidad
router.get('/tipos', authenticate, authorize('TRANSPORTES', 'ADMIN', 'ENCARGADO_NOMINAS'), listarTiposUnidad);

// Listar unidades activas — acceso más amplio para selección en formularios
// COP y BRIGADA lo usan para monitoreo y reportes; Operaciones usa /operaciones/unidades/disponibles
router.get('/activas', authenticate, authorize('TRANSPORTES', 'ADMIN', 'ENCARGADO_NOMINAS', 'COP', 'BRIGADA'), listarUnidadesActivas);

// Reservar numero de situacion para salida activa (sistema offline-first)
// IMPORTANTE: Esta ruta debe ir ANTES de /:id para que no sea capturada como ID
router.get('/:codigo/reservar-numero-salida', authenticate, authorize('BRIGADA'), reservarNumeroSalida);

// Obtener unidad específica — COP puede ver para acceder a bitácora
router.get('/:id', authenticate, authorize('TRANSPORTES', 'ADMIN', 'ENCARGADO_NOMINAS', 'COP'), obtenerUnidad);

// Obtener última asignación de unidad
router.get('/:id/ultima-asignacion', authenticate, authorize('TRANSPORTES', 'ADMIN', 'ENCARGADO_NOMINAS'), obtenerUltimaAsignacion);

// Crear unidad — Transportes y Admin (Operaciones ya no tiene este permiso)
router.post('/', authenticate, authorize('TRANSPORTES', 'ADMIN'), crearUnidad);

// Editar, activar, desactivar y transferir — Transportes y Admin
router.put('/:id', authenticate, authorize('TRANSPORTES', 'ADMIN'), actualizarUnidad);
router.put('/:id/desactivar', authenticate, authorize('TRANSPORTES', 'ADMIN'), desactivarUnidad);
router.put('/:id/activar', authenticate, authorize('TRANSPORTES', 'ADMIN'), activarUnidad);
router.put('/:id/transferir', authenticate, authorize('TRANSPORTES', 'ADMIN'), transferirUnidad);

// Eliminar unidad (solo si no tiene historial) — solo Admin
router.delete('/:id', authenticate, authorize('ADMIN'), eliminarUnidad);

// Disponibilidad por Transportes — Transportes y Admin
router.put('/:id/disponibilidad-transportes', authenticate, authorize('TRANSPORTES', 'ADMIN', 'SUPER_ADMIN'), setDisponibilidadTransportes);

// Gestión de tripulación permanente
router.get('/:id/tripulacion', authenticate, authorize('TRANSPORTES', 'ADMIN', 'ENCARGADO_NOMINAS'), getTripulacionUnidad);
router.post('/:id/asignar-brigada', authenticate, authorize('TRANSPORTES', 'ADMIN'), asignarBrigadaUnidad);
router.delete('/:id/desasignar-brigada/:brigadaId', authenticate, authorize('TRANSPORTES', 'ADMIN'), desasignarBrigadaUnidad);

export default router;
