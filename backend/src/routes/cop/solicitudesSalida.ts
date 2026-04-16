/**
 * Rutas para Solicitudes de Salida y Autorizaciones
 */

import express from 'express';
import {
    crearSolicitudSalida,
    autorizarSolicitud,
    aprobarSalidaManualmente,
    listarSolicitudes,
    obtenerSolicitudPendiente
} from '../controllers/solicitudesSalidaController';
import { authenticate, authorize } from '../middlewares/auth';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * POST /api/solicitudes-salida
 * Crear solicitud de salida (Brigadas)
 */
router.post('/', crearSolicitudSalida);

/**
 * GET /api/solicitudes-salida/pendiente
 * Obtener solicitud pendiente de autorización para el brigada
 */
router.get('/pendiente', obtenerSolicitudPendiente);

/**
 * GET /api/solicitudes-salida
 * Listar solicitudes (Operaciones/COP/Admin)
 */
router.get(
    '/',
    authorize('OPERACIONES', 'ADMIN', 'COP'),
    listarSolicitudes
);

/**
 * POST /api/solicitudes-salida/:id/autorizar
 * Autorizar o rechazar una solicitud (Brigadas de la tripulación)
 */
router.post('/:id/autorizar', autorizarSolicitud);

/**
 * POST /api/solicitudes-salida/:id/aprobar-manual
 * Aprobar salida manualmente sin consenso (COP/Operaciones)
 */
router.post(
    '/:id/aprobar-manual',
    authorize('COP', 'OPERACIONES', 'ADMIN'),
    aprobarSalidaManualmente
);

export default router;
