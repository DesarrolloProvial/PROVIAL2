import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth';
import {
  listarCapas, crearCapa, actualizarCapa, eliminarCapa,
  getPuntosDeCapa, getTodosPuntos, crearPunto, actualizarPunto, eliminarPunto,
} from '../../controllers/cop/capaMapa.controller';

const router = Router();

const VIEW_ROLES = ['COP', 'OPERACIONES', 'MANDOS', 'ADMIN'];
const EDIT_ROLES = ['COP', 'OPERACIONES', 'ADMIN'];

// Capas
router.get('/',                authenticate, authorize(...VIEW_ROLES), listarCapas);
router.post('/',               authenticate, authorize(...EDIT_ROLES), crearCapa);
router.put('/:id',             authenticate, authorize(...EDIT_ROLES), actualizarCapa);
router.delete('/:id',          authenticate, authorize(...EDIT_ROLES), eliminarCapa);

// Puntos
router.get('/puntos',          authenticate, authorize(...VIEW_ROLES), getTodosPuntos);
router.get('/:id/puntos',      authenticate, authorize(...VIEW_ROLES), getPuntosDeCapa);
router.post('/:id/puntos',     authenticate, authorize(...EDIT_ROLES), crearPunto);
router.put('/puntos/:id',      authenticate, authorize(...EDIT_ROLES), actualizarPunto);
router.delete('/puntos/:id',   authenticate, authorize(...EDIT_ROLES), eliminarPunto);

export default router;
