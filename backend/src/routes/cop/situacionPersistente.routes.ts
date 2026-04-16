import { Router } from 'express';
import {
  getTipos,
  getTiposEmergencia,
  getSituacionesPersistentes,
  getSituacionesPersistentesActivas,
  getSituacionPersistente,
  crearCompleta,
  actualizarSituacionPersistente,
  pausarSituacion,
  reactivarSituacion,
  finalizarSituacion,
  asignarUnidad,
  desasignarUnidad,
  getAsignaciones,
  getHistorialAsignaciones,
  getActualizaciones,
  agregarActualizacion,
  getObstruccion,
  getAutoridades,
  getSocorro,
  getMultimedia,
  deleteMultimedia,
  promover,
} from '../../controllers/cop/situacionPersistente.controller';
import { authenticate, authorize } from '../../middlewares/auth';

const router = Router();
router.use(authenticate);

// ── Catálogos (antes que rutas con parámetros) ──────────────────────────────
router.get('/tipos',                      getTipos);
router.get('/catalogo/tipos-emergencia',  getTiposEmergencia);
router.get('/activas',                    getSituacionesPersistentesActivas);

// ── Promover situación existente ────────────────────────────────────────────
router.post(
  '/promover/:situacionId',
  authorize('COP', 'OPERACIONES', 'ADMIN'),
  promover
);

// ── Crear completa (COP crea directamente sin situación origen) ─────────────
router.post(
  '/completa',
  authorize('COP', 'OPERACIONES', 'ADMIN'),
  crearCompleta
);

// ── Listado general ─────────────────────────────────────────────────────────
router.get('/', getSituacionesPersistentes);

// ── Detalle ─────────────────────────────────────────────────────────────────
router.get('/:id', getSituacionPersistente);

// ── Actualizar ──────────────────────────────────────────────────────────────
router.put(
  '/:id',
  authorize('COP', 'OPERACIONES', 'ADMIN'),
  actualizarSituacionPersistente
);

// ── Cambios de estado ───────────────────────────────────────────────────────
router.post('/:id/pausar',     authorize('COP', 'OPERACIONES', 'ADMIN'), pausarSituacion);
router.post('/:id/reactivar',  authorize('COP', 'OPERACIONES', 'ADMIN'), reactivarSituacion);
router.post('/:id/finalizar',  authorize('COP', 'OPERACIONES', 'ADMIN'), finalizarSituacion);

// ── Asignaciones ────────────────────────────────────────────────────────────
router.get( '/:id/asignaciones',          getAsignaciones);
router.get( '/:id/asignaciones/historial', getHistorialAsignaciones);
router.post('/:id/asignar',               authorize('COP', 'OPERACIONES', 'ADMIN'), asignarUnidad);
router.post('/:id/desasignar/:unidadId',  authorize('COP', 'OPERACIONES', 'ADMIN'), desasignarUnidad);

// ── Actualizaciones (timeline) ───────────────────────────────────────────────
router.get( '/:id/actualizaciones', getActualizaciones);
router.post('/:id/actualizaciones', agregarActualizacion);

// ── Sub-entidades ────────────────────────────────────────────────────────────
router.get('/:id/obstruccion',  getObstruccion);
router.get('/:id/autoridades',  getAutoridades);
router.get('/:id/socorro',      getSocorro);
router.get('/:id/multimedia',   getMultimedia);
router.delete(
  '/:id/multimedia/:multimediaId',
  authorize('COP', 'OPERACIONES', 'ADMIN'),
  deleteMultimedia
);

export default router;
