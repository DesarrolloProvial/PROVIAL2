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
  reservarNumeroSalida
} from '../controllers/unidades.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Listar unidades (Operaciones, Admin, Encargado Nóminas)
// ENCARGADO_NOMINAS: Si puede_ver_todas_sedes=true ve todas, sino solo su sede
router.get('/', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS', 'TRANSPORTES'), listarUnidades);

// Listar tipos de unidad
router.get('/tipos', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS', 'TRANSPORTES'), listarTiposUnidad);

// Listar unidades activas
router.get('/activas', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS', 'COP', 'BRIGADA', 'TRANSPORTES'), listarUnidadesActivas);

// Reservar numero de situacion para salida activa (sistema offline-first)
// IMPORTANTE: Esta ruta debe ir ANTES de /:id para que no sea capturada como ID
router.get('/:codigo/reservar-numero-salida', authenticate, authorize('BRIGADA'), reservarNumeroSalida);

// Obtener unidad específica (COP puede ver para acceder a bitácora)
router.get('/:id', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS', 'COP', 'TRANSPORTES'), obtenerUnidad);

// Obtener última asignación de unidad
router.get('/:id/ultima-asignacion', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS', 'TRANSPORTES'), obtenerUltimaAsignacion);

// Crear unidad (solo Admin - Transportes no crea unidades)
router.post('/', authenticate, authorize('ADMIN'), crearUnidad);

// Actualizar unidad (Transportes puede editar datos de unidades)
router.put('/:id', authenticate, authorize('OPERACIONES', 'ADMIN', 'TRANSPORTES'), actualizarUnidad);

// Desactivar/Activar unidad
router.put('/:id/desactivar', authenticate, authorize('OPERACIONES', 'ADMIN', 'TRANSPORTES'), desactivarUnidad);
router.put('/:id/activar', authenticate, authorize('OPERACIONES', 'ADMIN', 'TRANSPORTES'), activarUnidad);

// Transferir unidad a otra sede
router.put('/:id/transferir', authenticate, authorize('OPERACIONES', 'ADMIN', 'TRANSPORTES'), transferirUnidad);

// Eliminar unidad (solo Admin)
router.delete('/:id', authenticate, authorize('ADMIN'), eliminarUnidad);

// Gestión de tripulación
router.get('/:id/tripulacion', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS', 'TRANSPORTES'), getTripulacionUnidad);
router.post('/:id/asignar-brigada', authenticate, authorize('OPERACIONES', 'ADMIN', 'TRANSPORTES'), asignarBrigadaUnidad);
router.delete('/:id/desasignar-brigada/:brigadaId', authenticate, authorize('OPERACIONES', 'ADMIN', 'TRANSPORTES'), desasignarBrigadaUnidad);

export default router;
