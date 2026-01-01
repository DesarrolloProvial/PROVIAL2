import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import AprobacionesController from '../controllers/aprobaciones.controller';

const router = Router();

// Todas las rutas requieren autenticacion
router.use(authenticate);

// Crear solicitudes de aprobacion
router.post('/confirmar-presencia', AprobacionesController.crearConfirmacionPresencia);
router.post('/fin-jornada', AprobacionesController.crearAprobacionFinJornada);
router.post('/inspeccion-360', AprobacionesController.crearAprobacion360);

// Obtener mis aprobaciones pendientes
router.get('/pendientes', AprobacionesController.misPendientes);

// Obtener historial de aprobaciones
router.get('/historial', AprobacionesController.obtenerHistorial);

// Verificar estado de presencia para una salida
router.get('/salida/:salidaId/presencia', AprobacionesController.verificarPresencia);

// Obtener detalle de una aprobacion
router.get('/:id', AprobacionesController.obtenerDetalle);

// Responder a una aprobacion
router.post('/:id/responder', AprobacionesController.responder);

// Cancelar aprobacion
router.post('/:id/cancelar', AprobacionesController.cancelar);

export default router;
