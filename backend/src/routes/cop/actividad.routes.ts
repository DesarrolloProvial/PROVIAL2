import { Router } from 'express';
import {
  listActividades,
  createActividad,
  updateActividad,
  cerrarActividad,
  getActividad,
  getMiUnidadHoy,
  addObservacion,
} from '../controllers/actividad.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Actividades de mi unidad hoy (app móvil) - BRIGADAS
router.get('/mi-unidad/hoy', authenticate, authorize('BRIGADA'), getMiUnidadHoy);

// Listar actividades con filtros (COP/OPERACIONES/MANDOS/ADMIN)
router.get('/', authenticate, authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'), listActividades);

// Crear actividad
router.post('/', authenticate, createActividad);

// Actualizar actividad
router.patch('/:id', authenticate, updateActividad);

// Cerrar actividad
router.patch('/:id/cerrar', authenticate, cerrarActividad);

// Obtener actividad por ID
router.get('/:id', authenticate, getActividad);

// Agregar observación (timeline)
router.post('/:id/observaciones', authenticate, addObservacion);

export default router;
