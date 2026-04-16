/**
 * Rutas para Modo de Pruebas
 *
 * ⚠️ ADVERTENCIA: Estos endpoints eliminan datos REALES del backend
 * Solo deben usarse en desarrollo/testing
 */

import express from 'express';
import {
  resetSalidaActiva,
  resetIngresosActivos,
  resetSituacionesHoy,
  resetTodoUsuario
} from '../controllers/testModeController';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Endpoint de prueba simple (GET para debug)
router.get('/ping', (_req, res) => {
  console.log('🧪 [TEST MODE] PING GET recibido');
  res.json({ message: 'pong', method: 'GET', timestamp: new Date().toISOString() });
});

router.post('/ping', (_req, res) => {
  console.log('🧪 [TEST MODE] PING POST recibido');
  res.json({ message: 'pong', method: 'POST', timestamp: new Date().toISOString() });
});

/**
 * POST /api/test-mode/reset-salida
 * Finaliza la salida activa del usuario
 */
router.post('/reset-salida', (req, _res, next) => {
  console.log('🧪 [TEST MODE ROUTE] POST /test-mode/reset-salida recibido');
  console.log('🧪 [TEST MODE ROUTE] User:', req.user);
  next();
}, resetSalidaActiva);

/**
 * POST /api/test-mode/reset-ingresos
 * Elimina ingresos activos del usuario del backend
 */
router.post('/reset-ingresos', resetIngresosActivos);

/**
 * POST /api/test-mode/reset-situaciones
 * Elimina situaciones de hoy del usuario del backend
 */
router.post('/reset-situaciones', resetSituacionesHoy);

/**
 * POST /api/test-mode/reset-all
 * Finaliza salida y elimina ingresos/situaciones del backend
 */
router.post('/reset-all', resetTodoUsuario);

export default router;
