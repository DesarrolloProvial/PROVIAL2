import { Router } from 'express';
import authRoutes from './auth.routes';
import turnoRoutes from './turno.routes';
// import incidenteRoutes from './incidente.routes'; // OBSOLETO: Tabla incidente eliminada en migración 105
import situacionesRoutes from './situaciones.routes';
import gruposRoutes from './grupos.routes';
import movimientosRoutes from './movimientos.routes';
import auditoriaRoutes from './auditoria.routes';
import geografiaRoutes from './geografia.routes';
import salidaRoutes from './salida.routes';
import ingresoRoutes from './ingreso.routes';
import sedeRoutes from './sede.routes';
import reasignacionRoutes from './reasignacion.routes';
import intelligenceRoutes from './intelligence.routes';
import operacionesRoutes from './operaciones.routes';
import generadorTurnosRoutes from './generador-turnos.routes';
import asignacionesRoutes from './asignaciones';
import solicitudesSalidaRoutes from './solicitudesSalida';
import testModeRoutes from './testMode.routes';
import brigadasRoutes from './brigadas.routes';
import unidadesRoutes from './unidades.routes';
import eventoRoutes from './evento.routes';
import multimediaRoutes from './multimedia.routes';
import asignacionAvanzadaRoutes from './asignacionAvanzada.routes';
import ubicacionBrigadaRoutes from './ubicacionBrigada.routes';
// import situacionPersistenteRoutes from './situacionPersistente.routes'; // ELIMINADO: Tabla eliminada en migración 108
import administracionRoutes from './administracion.routes';
import inspeccion360Routes from './inspeccion360.routes';
import notificacionesRoutes from './notificaciones.routes';
import aprobacionesRoutes from './aprobaciones.routes';
import reportesRoutes from './reportes.routes';
import dashboardRoutes from './dashboard.routes';
import alertasRoutes from './alertas.routes';
import accidentologiaRoutes from './accidentologia.routes';
import comunicacionSocialRoutes from './comunicacionSocial.routes';
import passwordResetRoutes from './passwordReset.routes';
import rolesRoutes from './roles.routes';
import cloudinaryRoutes from './cloudinary.routes';
import draftsRoutes from './drafts.routes';
import actividadRoutes from './actividad.routes';


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

// Rutas de asignaciones programadas (protocolos de salida)
router.use('/asignaciones', asignacionesRoutes);

// Rutas de solicitudes de salida y autorizaciones
router.use('/solicitudes-salida', solicitudesSalidaRoutes);

// Rutas de modo de pruebas (eliminación de datos de testing)
router.use('/test-mode', testModeRoutes);

// Rutas de gestión de brigadas
router.use('/brigadas', brigadasRoutes);

// Rutas de gestión de unidades
router.use('/unidades', unidadesRoutes);

// Rutas de eventos persistentes/situaciones de larga duración
router.use('/eventos', eventoRoutes);

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

// Sistema de alertas
router.use('/alertas', alertasRoutes);

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

// Drafts offline-first
router.use('/drafts', draftsRoutes);

// Actividades operativas (patrullaje, puesto fijo, comida, etc.)
router.use('/actividades', actividadRoutes);


export default router;
