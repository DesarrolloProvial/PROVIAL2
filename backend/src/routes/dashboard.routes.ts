import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import DashboardController from '../controllers/dashboard.controller';

const router = Router();

// Todas las rutas requieren autenticacion
router.use(authenticate);

// Dashboard completo
router.get('/', DashboardController.obtenerDashboard);

// Estadísticas generales
router.get('/estadisticas', DashboardController.obtenerEstadisticas);

// Actividad reciente
router.get('/actividad-reciente', DashboardController.obtenerActividadReciente);

// Métricas por sede
router.get('/metricas-sede', DashboardController.obtenerMetricasSede);

// Resumen general
router.get('/resumen', DashboardController.obtenerResumen);

// Situaciones por tipo
router.get('/situaciones/tipo', DashboardController.obtenerSituacionesPorTipo);

// Situaciones por dia
router.get('/situaciones/dia', DashboardController.obtenerSituacionesPorDia);

// Estado de unidades
router.get('/unidades/estado', DashboardController.obtenerEstadoUnidades);

// Situaciones por hora
router.get('/situaciones/hora', DashboardController.obtenerSituacionesPorHora);

// Situaciones por departamento
router.get('/situaciones/departamento', DashboardController.obtenerSituacionesPorDepartamento);

// Comparativa mensual
router.get('/comparativa', DashboardController.obtenerComparativa);

// Rendimiento de brigadas
router.get('/brigadas/rendimiento', DashboardController.obtenerRendimientoBrigadas);

export default router;
