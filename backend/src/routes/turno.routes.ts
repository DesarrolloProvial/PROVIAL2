import { Router } from 'express';
import {
  getTurnoHoy,
  getTurnoByFecha,
  getAsignacionesPendientes,
  getMiAsignacionHoy,
  createTurno,
  createAsignacion,
  updateAsignacion,
  deleteAsignacion,
  marcarSalida,
  marcarEntrada,
  createReporteHorario,
  getReportesHorarios,
  cambiarRutaActiva,
  registrarCombustible,
  liberarNomina
} from '../controllers/turno.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Rutas públicas (requieren autenticación básica)
router.get('/hoy', authenticate, getTurnoHoy);
router.get('/fecha/:fecha', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'), getTurnoByFecha);
router.get('/pendientes', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'), getAsignacionesPendientes);
router.get('/mi-asignacion-hoy', authenticate, getMiAsignacionHoy);

// Crear turno (Operaciones, Admin y Encargado Nóminas)
router.post('/', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'), createTurno);

// Crear asignación (Operaciones, Admin y Encargado Nóminas)
router.post('/:id/asignaciones', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'), createAsignacion);

// Actualizar y eliminar asignación (Operaciones, Admin y Encargado Nóminas)
router.put('/asignaciones/:id', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'), updateAsignacion);
router.delete('/asignaciones/:id', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'), deleteAsignacion);

// Marcar salida/entrada (Brigadas)
router.post('/marcar-salida', authenticate, authorize('BRIGADA'), marcarSalida);
router.post('/marcar-entrada', authenticate, authorize('BRIGADA'), marcarEntrada);

// Cambiar ruta activa (Brigadas)
router.post('/cambiar-ruta', authenticate, authorize('BRIGADA'), cambiarRutaActiva);

// Registrar combustible (Brigadas)
router.post('/registrar-combustible', authenticate, authorize('BRIGADA'), registrarCombustible);

// Reportes horarios
router.post('/reportes-horarios', authenticate, authorize('BRIGADA'), createReporteHorario);
router.get('/reportes-horarios/:asignacionId', authenticate, getReportesHorarios);

// Liberar nómina (Encargado Nóminas y Super Admin)
router.post('/:turnoId/liberar-nomina', authenticate, authorize('ENCARGADO_NOMINAS', 'SUPER_ADMIN'), liberarNomina);

export default router;
