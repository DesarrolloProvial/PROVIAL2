import { Router } from 'express';
import {
  createActividad,
  cerrarActividad,
  getActividad,
  getMiUnidadHoy,
} from '../controllers/actividad.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Actividades de mi unidad hoy (app móvil) - BRIGADAS
router.get('/mi-unidad/hoy', authenticate, authorize('BRIGADA'), getMiUnidadHoy);

// Crear actividad
router.post('/', authenticate, createActividad);

// Cerrar actividad
router.patch('/:id/cerrar', authenticate, cerrarActividad);

// Obtener actividad por ID
router.get('/:id', authenticate, getActividad);

export default router;
