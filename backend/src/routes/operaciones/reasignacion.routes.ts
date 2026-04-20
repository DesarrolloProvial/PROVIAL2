import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth';
import {
  crearReasignacionUsuario,
  getReasignacionesUsuario,
  finalizarReasignacionUsuario,
  cancelarReasignacionUsuario,
} from '../../controllers/operaciones/reasignacion.controller';

const router = Router();
router.use(authenticate);

// Lectura: roles operativos y de supervisión
router.get(
  '/activas',
  authorize('COP', 'OPERACIONES', 'ADMIN', 'MANDOS', 'TRANSPORTES'),
  getReasignacionesUsuario
);

// Escritura: solo alto mando (SUPER_ADMIN siempre pasa por el middleware authorize)
router.post('/', authorize('ADMIN'), crearReasignacionUsuario);
router.post('/:id/finalizar', authorize('ADMIN'), finalizarReasignacionUsuario);
router.post('/:id/cancelar', authorize('ADMIN'), cancelarReasignacionUsuario);

export default router;
