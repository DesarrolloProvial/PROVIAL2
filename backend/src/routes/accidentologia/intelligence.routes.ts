import { Router } from 'express';
import {
  getVehiculoHistorial,
  getPilotoHistorial,
  getTopReincidentes,
  getStats,
  getVehiculosReincidentes,
  getVehiculoByPlaca,
  getPilotosProblematicos,
  getPilotoByLicencia,
  getPuntosCalientes,
  getMapaCalor,
  getTendenciasTemporales,
  getAnalisisDiaSemana,
  getAnalisisFranjaHoraria,
  getDashboard,
  refreshViews
} from '../controllers/intelligence.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// ========================================
// DASHBOARD
// ========================================

// Dashboard general - COP, OPERACIONES, MANDOS, ADMIN
router.get(
  '/dashboard',
  authenticate,
  authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'),
  getDashboard
);

// Estadísticas generales
router.get(
  '/stats',
  authenticate,
  authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'),
  getStats
);

// Top 10 reincidentes (vehículos y pilotos)
router.get(
  '/top-reincidentes',
  authenticate,
  authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'),
  getTopReincidentes
);

// ========================================
// HISTORIAL COMPLETO (para PlacaInput y pantallas de detalle)
// ========================================

// Historial completo de vehículo por placa (disponible para brigadas)
router.get(
  '/vehiculo/:placa',
  authenticate,
  getVehiculoHistorial
);

// Historial completo de piloto por licencia (disponible para brigadas)
router.get(
  '/piloto/:licencia',
  authenticate,
  getPilotoHistorial
);

// ========================================
// VEHÍCULOS REINCIDENTES (vista simplificada)
// ========================================

// Listar vehículos reincidentes
router.get(
  '/vehiculos-reincidentes',
  authenticate,
  authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'),
  getVehiculosReincidentes
);

// Buscar vehículo por placa (disponible para brigadas también)
router.get(
  '/vehiculos-reincidentes/:placa',
  authenticate,
  getVehiculoByPlaca
);

// ========================================
// PILOTOS PROBLEMÁTICOS
// ========================================

// Listar pilotos problemáticos
router.get(
  '/pilotos-problematicos',
  authenticate,
  authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'),
  getPilotosProblematicos
);

// Buscar piloto por licencia (disponible para brigadas también)
router.get(
  '/pilotos-problematicos/:licencia',
  authenticate,
  getPilotoByLicencia
);

// ========================================
// PUNTOS CALIENTES (HOTSPOTS)
// ========================================

// Listar puntos calientes
router.get(
  '/puntos-calientes',
  authenticate,
  authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'),
  getPuntosCalientes
);

// Mapa de calor
router.get(
  '/mapa-calor',
  authenticate,
  authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'),
  getMapaCalor
);

// ========================================
// TENDENCIAS TEMPORALES
// ========================================

// Tendencias temporales
router.get(
  '/tendencias-temporales',
  authenticate,
  authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'),
  getTendenciasTemporales
);

// Análisis por día de la semana
router.get(
  '/analisis/dia-semana',
  authenticate,
  authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'),
  getAnalisisDiaSemana
);

// Análisis por franja horaria
router.get(
  '/analisis/franja-horaria',
  authenticate,
  authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'),
  getAnalisisFranjaHoraria
);

// ========================================
// UTILIDADES
// ========================================

// Refrescar vistas materializadas - Solo ADMIN
router.post(
  '/refresh',
  authenticate,
  authorize('ADMIN'),
  refreshViews
);

export default router;
