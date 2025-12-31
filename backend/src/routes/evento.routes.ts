import { Router } from 'express';
import * as EventoController from '../controllers/evento.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Crear evento (COP, ADMIN, OPERACIONES)
router.post(
    '/',
    authorize('COP', 'ADMIN', 'OPERACIONES'),
    EventoController.createEvento
);

// Obtener eventos activos (Cualquiera autenticado)
router.get('/activos', EventoController.getEventosActivos);

// Obtener historial (todos)
router.get('/', EventoController.getAllEventos);

// Asignar unidad a evento
router.post(
    '/:id/asignar',
    authorize('COP', 'ADMIN', 'OPERACIONES'),
    EventoController.asignarUnidadEvento
);

// Actualizar evento
router.patch(
    '/:id',
    authorize('COP', 'ADMIN', 'OPERACIONES'),
    EventoController.updateEvento
);

export default router;
