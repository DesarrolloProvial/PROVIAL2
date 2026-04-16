import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import NotificacionesController from '../controllers/notificaciones.controller';

const router = Router();

// Todas las rutas requieren autenticacion
router.use(authenticate);

// Registro de token
router.post('/registrar-token', NotificacionesController.registrarToken);
router.post('/desactivar-token', NotificacionesController.desactivarToken);

// Listado y lectura
router.get('/', NotificacionesController.listar);
router.get('/conteo', NotificacionesController.conteoNoLeidas);
router.post('/:id/leer', NotificacionesController.marcarLeida);
router.post('/leer-todas', NotificacionesController.marcarTodasLeidas);

// Prueba (solo para desarrollo/admin)
router.post('/prueba', NotificacionesController.enviarPrueba);

export default router;
