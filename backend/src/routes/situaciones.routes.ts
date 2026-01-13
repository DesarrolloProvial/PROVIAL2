import { Router } from 'express';
import {
  createSituacion,
  getSituacion,
  listSituaciones,
  listSituacionesActivas,
  getTiposSituacion,
  getMiUnidadHoy,
  getBitacoraUnidad,
  getMapaSituaciones,
  updateSituacion,
  cerrarSituacion,
  deleteSituacion,
  createDetalle,
  getDetalles,
  updateDetalle,
  deleteDetalle,
  getResumenUnidades,
  cambiarTipoSituacion,
  getCatalogo,
} from '../controllers/situacion.controller';
import { authenticate, authorize, canEditSituacion } from '../middlewares/auth';

const router = Router();

// ========================================
// RUTAS ESPECIFICAS (DEBEN IR ANTES DE LAS RUTAS CON PARAMETROS)
// ========================================

// Situaciones de mi unidad hoy (app móvil) - BRIGADAS
router.get('/mi-unidad/hoy', authenticate, authorize('BRIGADA'), getMiUnidadHoy);

// Bitácora completa de una unidad - COP y ENCARGADOS
router.get('/bitacora/:unidad_id', authenticate, authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'), getBitacoraUnidad);

// Mapa - Última situación por unidad
router.get('/mapa/unidades', authenticate, getMapaSituaciones);

// Resumen de unidades (dashboard)
router.get('/resumen/unidades', authenticate, getResumenUnidades);

// Tipos de situación
router.get('/tipos', authenticate, getTiposSituacion);

// Catálogo completo de situaciones (nuevo catálogo dinámico)
router.get('/catalogo', authenticate, getCatalogo);

// Situaciones activas
router.get('/activas', authenticate, listSituacionesActivas);

// ========================================
// RUTAS GENERALES CON PARAMETROS (DEBEN IR DESPUES DE LAS RUTAS ESPECIFICAS)
// ========================================

// Crear situación (cualquier usuario autenticado)
router.post('/', authenticate, createSituacion);

// Listar situaciones (con filtros)
router.get('/', authenticate, listSituaciones);

// Obtener situación por ID o UUID
router.get('/:id', authenticate, getSituacion);

// ========================================
// RUTAS DE ACTUALIZACIÓN
// ========================================

// Actualizar situación (tripulación asignada, COP y admin)
router.patch('/:id', authenticate, canEditSituacion, updateSituacion);

// Cerrar situación (tripulación asignada, COP y admin)
router.patch('/:id/cerrar', authenticate, canEditSituacion, cerrarSituacion);

// Cambiar tipo de situación (INCIDENTE <-> ASISTENCIA_VEHICULAR)
router.patch('/:id/cambiar-tipo', authenticate, canEditSituacion, cambiarTipoSituacion);

// ========================================
// GESTIÓN DE DETALLES
// ========================================

// Crear detalle de situación (tripulación asignada, COP y admin)
router.post('/:id/detalles', authenticate, canEditSituacion, createDetalle);

// Listar detalles de una situación
router.get('/:id/detalles', authenticate, getDetalles);

// Actualizar detalle (tripulación asignada, COP y admin)
router.patch('/detalles/:id', authenticate, authorize('BRIGADA', 'COP', 'ADMIN'), updateDetalle);

// Eliminar detalle (tripulación asignada, COP y admin)
router.delete('/detalles/:id', authenticate, authorize('BRIGADA', 'COP', 'ADMIN'), deleteDetalle);

// ========================================
// RUTAS DE ADMINISTRACIÓN
// ========================================

// Eliminar situación (solo admin)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteSituacion);

export default router;
