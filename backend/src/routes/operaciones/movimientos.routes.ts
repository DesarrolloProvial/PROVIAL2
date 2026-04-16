import { Router } from 'express';
import {
  createMovimiento,
  getMovimiento,
  finalizarMovimiento,
  getMovimientosActivos,
  getMisMovimientosActivos,
  getHistorialMovimientos,
  getComposicionUnidades,
  getComposicionUnidad,
  updateMovimiento,
  deleteMovimiento,
} from '../controllers/movimiento.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// ========================================
// RUTAS PARA BRIGADAS
// ========================================

// Mis movimientos activos
router.get('/mis-movimientos/activos', authenticate, authorize('BRIGADA'), getMisMovimientosActivos);

// ========================================
// RUTAS PARA COP/OPERACIONES/MANDOS
// ========================================

// Crear movimiento
router.post('/', authenticate, authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'), createMovimiento);

// Obtener movimiento por ID
router.get('/:id', authenticate, authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'), getMovimiento);

// Finalizar movimiento
router.patch('/:id/finalizar', authenticate, authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'), finalizarMovimiento);

// Movimientos activos de un usuario
router.get('/usuario/:usuario_id/activos', authenticate, authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'), getMovimientosActivos);

// Historial de movimientos (con filtros)
router.get('/', authenticate, authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'), getHistorialMovimientos);

// Composición actual de todas las unidades
router.get('/composicion/unidades', authenticate, authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'), getComposicionUnidades);

// Composición de una unidad específica
router.get('/composicion/unidad/:unidad_id', authenticate, authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'), getComposicionUnidad);

// Actualizar movimiento
router.patch('/:id', authenticate, authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'), updateMovimiento);

// Eliminar movimiento (solo si no ha finalizado)
router.delete('/:id', authenticate, authorize('OPERACIONES', 'ADMIN'), deleteMovimiento);

export default router;
