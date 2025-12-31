/**
 * Rutas para funcionalidades avanzadas de asignaciones
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import {
  getAsignacionesPorSede,
  publicarTurno,
  despublicarTurno,
  getConfiguracionSede,
  getAllConfiguracionesSede,
  updateConfiguracionSede,
  getSituacionesFijas,
  getSituacionFija,
  createSituacionFija,
  updateSituacionFija,
  deleteSituacionFija,
  crearAviso,
  eliminarAviso,
  getAlertasRotacion,
  updateAccionesFormato,
  vincularSituacionFija
} from '../controllers/asignacionAvanzada.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// =====================================================
// ASIGNACIONES POR SEDE
// =====================================================

// Obtener asignaciones agrupadas por sede
// ENCARGADO_NOMINAS puede ver (solo lectura), otros pueden ver y editar
router.get('/por-sede', authorize('ADMIN', 'OPERACIONES', 'COP', 'ENCARGADO_NOMINAS'), getAsignacionesPorSede);

// =====================================================
// PUBLICACIÓN DE TURNOS
// =====================================================

// Publicar turno (hacerlo visible para brigadas)
router.post('/turno/:turnoId/publicar', authorize('ADMIN', 'OPERACIONES'), publicarTurno);

// Despublicar turno (volver a borrador)
router.post('/turno/:turnoId/despublicar', authorize('ADMIN', 'OPERACIONES'), despublicarTurno);

// =====================================================
// CONFIGURACIÓN VISUAL DE SEDE
// =====================================================

// Obtener todas las configuraciones (ENCARGADO_NOMINAS solo lectura)
router.get('/configuracion-sede', authorize('ADMIN', 'OPERACIONES', 'ENCARGADO_NOMINAS'), getAllConfiguracionesSede);

// Obtener configuración de una sede (ENCARGADO_NOMINAS solo lectura)
router.get('/configuracion-sede/:sedeId', authorize('ADMIN', 'OPERACIONES', 'ENCARGADO_NOMINAS'), getConfiguracionSede);

// Actualizar configuración de sede (solo ADMIN/OPERACIONES pueden editar)
router.put('/configuracion-sede/:sedeId', authorize('ADMIN', 'OPERACIONES'), updateConfiguracionSede);

// =====================================================
// SITUACIONES FIJAS
// =====================================================

// Obtener todas las situaciones fijas (ENCARGADO_NOMINAS solo lectura)
router.get('/situaciones-fijas', authorize('ADMIN', 'OPERACIONES', 'ENCARGADO_NOMINAS'), getSituacionesFijas);

// Obtener situación fija por ID (ENCARGADO_NOMINAS solo lectura)
router.get('/situaciones-fijas/:id', authorize('ADMIN', 'OPERACIONES', 'ENCARGADO_NOMINAS'), getSituacionFija);

// Crear situación fija
router.post('/situaciones-fijas', authorize('ADMIN', 'OPERACIONES'), createSituacionFija);

// Actualizar situación fija
router.put('/situaciones-fijas/:id', authorize('ADMIN', 'OPERACIONES'), updateSituacionFija);

// Desactivar situación fija
router.delete('/situaciones-fijas/:id', authorize('ADMIN', 'OPERACIONES'), deleteSituacionFija);

// =====================================================
// AVISOS EN ASIGNACIONES
// =====================================================

// Crear aviso en asignación
router.post('/asignacion/:asignacionId/aviso', authorize('ADMIN', 'OPERACIONES'), crearAviso);

// Eliminar aviso
router.delete('/aviso/:avisoId', authorize('ADMIN', 'OPERACIONES'), eliminarAviso);

// =====================================================
// ALERTAS DE ROTACIÓN
// =====================================================

// Obtener alertas de rotación para un brigada (ENCARGADO_NOMINAS solo lectura)
router.get('/alertas-rotacion/:usuarioId', authorize('ADMIN', 'OPERACIONES', 'ENCARGADO_NOMINAS'), getAlertasRotacion);

// =====================================================
// ACCIONES Y SITUACIONES
// =====================================================

// Actualizar acciones con formato
router.put('/asignacion/:asignacionId/acciones-formato', authorize('ADMIN', 'OPERACIONES'), updateAccionesFormato);

// Vincular asignación con situación fija
router.put('/asignacion/:asignacionId/vincular-situacion', authorize('ADMIN', 'OPERACIONES'), vincularSituacionFija);

export default router;
