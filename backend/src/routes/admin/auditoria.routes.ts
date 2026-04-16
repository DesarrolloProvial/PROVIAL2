import { Router } from 'express';
import {
  registrarCambio,
  getRegistroCambio,
  getHistorialCambios,
  getHistorialRegistro,
  getHistorialUsuario,
  getMiHistorial,
  getCambiosRealizadosPor,
  getEstadisticasCambios,
  buscarPorMotivo,
} from '../controllers/auditoria.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// ========================================
// RUTAS PARA BRIGADAS
// ========================================

// Mi historial de cambios (cambios que me afectan)
router.get('/mi-historial', authenticate, authorize('BRIGADA'), getMiHistorial);

// ========================================
// RUTAS PARA MANDOS/OPERACIONES/ADMIN
// ========================================

// Registrar cambio manualmente
router.post('/', authenticate, authorize('OPERACIONES', 'MANDOS', 'ADMIN'), registrarCambio);

// Obtener registro por ID
router.get('/registro/:id', authenticate, authorize('OPERACIONES', 'MANDOS', 'ADMIN'), getRegistroCambio);

// Historial completo con filtros
router.get('/', authenticate, authorize('OPERACIONES', 'MANDOS', 'ADMIN'), getHistorialCambios);

// Historial de un registro específico (tabla + id)
router.get('/historial/:tabla/:registro_id', authenticate, authorize('OPERACIONES', 'MANDOS', 'ADMIN'), getHistorialRegistro);

// Historial de cambios que afectan a un usuario
router.get('/usuario/:usuario_id', authenticate, authorize('OPERACIONES', 'MANDOS', 'ADMIN'), getHistorialUsuario);

// Cambios realizados por un usuario (como auditor)
router.get('/realizados-por/:usuario_id', authenticate, authorize('OPERACIONES', 'MANDOS', 'ADMIN'), getCambiosRealizadosPor);

// Estadísticas de cambios
router.get('/estadisticas', authenticate, authorize('ADMIN'), getEstadisticasCambios);

// Buscar por motivo
router.get('/buscar', authenticate, authorize('OPERACIONES', 'MANDOS', 'ADMIN'), buscarPorMotivo);

export default router;
