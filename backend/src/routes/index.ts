import { Router } from 'express';
import authRoutes from './common/auth.routes';
import turnoRoutes from './common/turno.routes';
// import incidenteRoutes from './incidente.routes'; // OBSOLETO: Tabla incidente eliminada en migración 105
import situacionesRoutes from './cop/situaciones.routes';
import gruposRoutes from './operaciones/grupos.routes';
import movimientosRoutes from './operaciones/movimientos.routes';
import auditoriaRoutes from './admin/auditoria.routes';
import geografiaRoutes from './common/geografia.routes';
import salidaRoutes from './cop/salida.routes';
import ingresoRoutes from './common/ingreso.routes';
import sedeRoutes from './common/sede.routes';
import reasignacionRoutes from './operaciones/reasignacion.routes';
import intelligenceRoutes from './accidentologia/intelligence.routes';
import operacionesRoutes from './operaciones/operaciones.routes';
import generadorTurnosRoutes from './operaciones/generador-turnos.routes';

import testModeRoutes from './admin/testMode.routes';
import brigadasRoutes from './operaciones/brigadas.routes';
import unidadesRoutes from './transportes/unidades.routes';
import multimediaRoutes from './common/multimedia.routes';
import asignacionAvanzadaRoutes from './operaciones/asignacionAvanzada.routes';
import ubicacionBrigadaRoutes from './cop/ubicacionBrigada.routes';
// import situacionPersistenteRoutes from './situacionPersistente.routes'; // ELIMINADO: Tabla eliminada en migración 108
import administracionRoutes from './admin/administracion.routes';
import inspeccion360Routes from './transportes/inspeccion360.routes';
import notificacionesRoutes from './common/notificaciones.routes';
import aprobacionesRoutes from './mobile/aprobaciones.routes';
import reportesRoutes from './common/reportes.routes';
import dashboardRoutes from './admin/dashboard.routes';
import accidentologiaRoutes from './accidentologia/accidentologia.routes';
import comunicacionSocialRoutes from './comunicacion/comunicacionSocial.routes';
import passwordResetRoutes from './admin/passwordReset.routes';
import rolesRoutes from './admin/roles.routes';
import cloudinaryRoutes from './common/cloudinary.routes';
import actividadRoutes from './cop/actividad.routes';
import importExcelRoutes from './admin/importExcel.routes';
import estadisticasRoutes from './accidentologia/estadisticas.routes';
import capaMapaRoutes from './cop/capaMapa.routes';
import dispositivoRoutes from './admin/dispositivo.routes';
import reparacionesRoutes from './transportes/reparaciones.routes';
import situacionesPersistentesRoutes from './cop/situacionPersistente.routes';

const router = Router();

// Rutas de autenticación
router.use('/auth', authRoutes);

// Rutas de turnos y asignaciones
router.use('/turnos', turnoRoutes);

// Rutas de incidentes - OBSOLETO: Funcionalidad integrada en /situaciones (migración 105)
// router.use('/incidentes', incidenteRoutes);

// Rutas de situaciones operativas
router.use('/situaciones', situacionesRoutes);

// Rutas de grupos y calendario
router.use('/grupos', gruposRoutes);

// Rutas de movimientos de brigadas
router.use('/movimientos', movimientosRoutes);

// Rutas de auditoría
router.use('/auditoria', auditoriaRoutes);

// Rutas de geografía (departamentos/municipios)
router.use('/geografia', geografiaRoutes);

// Rutas de salidas y asignaciones permanentes
router.use('/salidas', salidaRoutes);

// Rutas de ingresos a sede
router.use('/ingresos', ingresoRoutes);

// Rutas de sedes
router.use('/sedes', sedeRoutes);

// Rutas de reasignaciones entre sedes
router.use('/reasignaciones', reasignacionRoutes);

// Rutas de inteligencia y análisis
router.use('/intelligence', intelligenceRoutes);

// Rutas del módulo de operaciones
router.use('/operaciones', operacionesRoutes);

// Rutas del generador automático de turnos
router.use('/generador-turnos', generadorTurnosRoutes);




// Rutas de modo de pruebas (eliminación de datos de testing)
router.use('/test-mode', testModeRoutes);

// Rutas de gestión de brigadas
router.use('/brigadas', brigadasRoutes);

// Rutas de gestión de unidades
router.use('/unidades', unidadesRoutes);

// Rutas de multimedia (fotos y videos de situaciones)
router.use('/multimedia', multimediaRoutes);

// Rutas de asignaciones avanzadas (por sede, borradores, situaciones fijas)
router.use('/asignaciones-avanzadas', asignacionAvanzadaRoutes);

// Rutas de ubicación de brigadas (préstamos, divisiones, cambios)
router.use('/ubicacion-brigadas', ubicacionBrigadaRoutes);

// Rutas de situaciones persistentes - ELIMINADO: Tabla eliminada en migración 108
// router.use('/situaciones-persistentes', situacionPersistenteRoutes);

// Rutas de administración del sistema (SUPER_ADMIN, ADMIN_COP)
router.use('/admin', administracionRoutes);

// Rutas de inspección 360 vehicular
router.use('/inspeccion360', inspeccion360Routes);

// Rutas de notificaciones push
router.use('/notificaciones', notificacionesRoutes);

// Rutas de aprobaciones de tripulacion
router.use('/aprobaciones', aprobacionesRoutes);

// Rutas de reportes (PDF/Excel)
router.use('/reportes', reportesRoutes);

// Dashboard ejecutivo
router.use('/dashboard', dashboardRoutes);

// Módulo de Accidentología (hojas de accidente)
router.use('/accidentologia', accidentologiaRoutes);

// Comunicación Social (plantillas y publicaciones)
router.use('/comunicacion-social', comunicacionSocialRoutes);

// Sistema de reset de contraseña (rutas públicas y admin)
router.use('/', passwordResetRoutes);

// Gestión de Roles y Permisos
router.use('/roles', rolesRoutes);

// Cloudinary signed uploads
router.use('/cloudinary', cloudinaryRoutes);

// Actividades operativas (patrullaje, puesto fijo, comida, etc.)
router.use('/actividades', actividadRoutes);

// Importación de datos Excel (Estadísticas históricas)
router.use('/admin', importExcelRoutes);

// Estadísticas de accidentología
router.use('/estadisticas', estadisticasRoutes);

// Capas del mapa COP (puntos de interés geolocalizados)
router.use('/capas-mapa', capaMapaRoutes);

// Gestión de dispositivos móviles autorizados
router.use('/admin/dispositivos', dispositivoRoutes);

// Reparaciones de unidades (períodos en taller)
router.use('/reparaciones', reparacionesRoutes);

// Situaciones persistentes (situaciones de larga duración: derrumbes, obras, accidentes multi-día)
router.use('/situaciones-persistentes', situacionesPersistentesRoutes);

export default router;
