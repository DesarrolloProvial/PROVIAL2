import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import {
  habilitarResetPassword,
  deshabilitarResetPassword,
  verificarNecesitaReset,
  completarResetPassword,
  getUsuariosConResetPendiente,
  getHistorialReset,
} from '../controllers/passwordReset.controller';

const router = Router();

// =====================================================
// RUTAS PÚBLICAS (sin autenticación)
// =====================================================

// Verificar si un usuario necesita reset
router.post('/auth/verificar-reset', verificarNecesitaReset);

// Completar el reset de contraseña
router.post('/auth/completar-reset', completarResetPassword);

// =====================================================
// RUTAS DE ADMINISTRACIÓN (requieren autenticación)
// =====================================================

// Obtener usuarios con reset pendiente
router.get(
  '/admin/usuarios/reset-pendiente',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN', 'ENCARGADO_NOMINAS'),
  getUsuariosConResetPendiente
);

// Habilitar reset para un usuario
router.post(
  '/admin/usuarios/:id/habilitar-reset-password',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN', 'ENCARGADO_NOMINAS'),
  habilitarResetPassword
);

// Deshabilitar reset para un usuario
router.delete(
  '/admin/usuarios/:id/habilitar-reset-password',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN', 'ENCARGADO_NOMINAS'),
  deshabilitarResetPassword
);

// Obtener historial de resets de un usuario
router.get(
  '/admin/usuarios/:id/historial-reset',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  getHistorialReset
);

export default router;
