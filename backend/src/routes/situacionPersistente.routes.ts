import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { authorizeCopSubRol, canViewPersistentes } from '../middlewares/subRolCop';
import * as controller from '../controllers/situacionPersistente.controller';

const router = Router();

// ========================================
// CATÁLOGOS
// ========================================

// Obtener tipos de situaciones disponibles
router.get('/tipos', authenticate, controller.getTipos);

// Obtener catálogo de tipos de emergencia vial
router.get('/catalogo/tipos-emergencia', authenticate, controller.getTiposEmergencia);

// ========================================
// CONSULTAS GENERALES
// ========================================

// Listar situaciones activas
router.get('/activas', authenticate, controller.getActivas);

// ========================================
// CONSULTAS PARA BRIGADAS (deben ir antes de /:id)
// ========================================

// Obtener situaciones donde mi unidad está asignada
router.get('/brigada/mis-situaciones', authenticate, controller.getMisSituaciones);

// Verificar si mi unidad está asignada
router.get('/brigada/verificar-asignacion', authenticate, controller.verificarAsignacion);

// ========================================
// CONSULTAS POR ID/UUID
// ========================================

// Listar todas las situaciones con filtros
router.get('/', authenticate, controller.getAll);

// Obtener situación por UUID (debe ir antes de /:id para evitar confusión)
router.get('/uuid/:uuid', authenticate, controller.getByUuid);

// Obtener situación por ID
router.get('/:id', authenticate, controller.getById);

// ========================================
// PROMOCIÓN DE SITUACIONES
// ========================================

// Promover situación normal a persistente (requiere permiso especial)
router.post(
  '/promover/:situacionId',
  authenticate,
  authorizeCopSubRol('puede_promover_situaciones'),
  controller.promover
);

// ========================================
// CRUD (Solo COP con permisos)
// ========================================

// Crear nueva situación persistente (simple)
router.post('/', authenticate, authorizeCopSubRol('puede_crear_persistentes'), controller.crear);

// Crear situación persistente completa (con obstrucción, autoridades, socorro)
router.post(
  '/completa',
  authenticate,
  authorizeCopSubRol('puede_crear_persistentes'),
  controller.crearCompleta
);

// Actualizar situación (simple) - requiere permiso de crear (implica editar)
router.put('/:id', authenticate, authorizeCopSubRol('puede_crear_persistentes'), controller.actualizar);

// Actualizar situación completa (con obstrucción, autoridades, socorro)
router.put(
  '/:id/completa',
  authenticate,
  authorizeCopSubRol('puede_crear_persistentes'),
  controller.actualizarCompleta
);

// Finalizar situación (requiere permiso especial)
router.post(
  '/:id/finalizar',
  authenticate,
  authorizeCopSubRol('puede_cerrar_persistentes'),
  controller.finalizar
);

// Pausar situación (requiere permiso de crear)
router.post('/:id/pausar', authenticate, authorizeCopSubRol('puede_crear_persistentes'), controller.pausar);

// Reactivar situación (requiere permiso de crear)
router.post('/:id/reactivar', authenticate, authorizeCopSubRol('puede_crear_persistentes'), controller.reactivar);

// ========================================
// ASIGNACIÓN DE UNIDADES
// ========================================

// Obtener asignaciones activas de una situación
router.get('/:id/asignaciones', authenticate, controller.getAsignaciones);

// Obtener historial de asignaciones
router.get('/:id/asignaciones/historial', authenticate, controller.getHistorialAsignaciones);

// Asignar unidad a situación (requiere permiso de asignar unidades)
router.post('/:id/asignar', authenticate, authorizeCopSubRol('puede_asignar_unidades'), controller.asignarUnidad);

// Desasignar unidad de situación (requiere permiso de asignar unidades)
router.post('/:id/desasignar/:unidadId', authenticate, authorizeCopSubRol('puede_asignar_unidades'), controller.desasignarUnidad);

// ========================================
// ACTUALIZACIONES
// ========================================

// Obtener actualizaciones de una situación
router.get('/:id/actualizaciones', authenticate, controller.getActualizaciones);

// Agregar actualización a situación (brigadas pueden agregar)
router.post('/:id/actualizaciones', authenticate, controller.agregarActualizacion);

// Editar actualización
router.put('/:id/actualizaciones/:actualizacionId', authenticate, controller.editarActualizacion);

// ========================================
// DETALLES DE EMERGENCIA (obstrucción, autoridades, socorro)
// ========================================

// Obtener obstrucción de una situación
router.get('/:id/obstruccion', authenticate, canViewPersistentes, controller.getObstruccion);

// Obtener autoridades de una situación
router.get('/:id/autoridades', authenticate, canViewPersistentes, controller.getAutoridades);

// Obtener socorro de una situación
router.get('/:id/socorro', authenticate, canViewPersistentes, controller.getSocorro);

// ========================================
// MULTIMEDIA
// ========================================

// Subir archivo multimedia
router.post(
  '/:id/multimedia',
  authenticate,
  authorizeCopSubRol('puede_crear_persistentes'),
  controller.subirMultimedia
);

// Obtener multimedia de una situación
router.get('/:id/multimedia', authenticate, canViewPersistentes, controller.getMultimedia);

// Obtener resumen de multimedia
router.get('/:id/multimedia/resumen', authenticate, canViewPersistentes, controller.getMultimediaResumen);

// Eliminar archivo multimedia
router.delete(
  '/:id/multimedia/:multimediaId',
  authenticate,
  authorizeCopSubRol('puede_crear_persistentes'),
  controller.deleteMultimedia
);

export default router;
