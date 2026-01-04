import { Router } from 'express';
import {
  getSedes,
  getSede,
  getUnidadesDeSede,
  getPersonalDeSede,
  getMiSede,
  getConfiguracion
} from '../controllers/sede.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// ========================================
// CONSULTAS DE SEDES
// ========================================

// Obtener todas las sedes activas
router.get('/', authenticate, getSedes);

// Mi sede efectiva (considerando reasignaciones)
router.get('/mi-sede', authenticate, getMiSede);

// Obtener información de una sede específica
router.get('/:id', authenticate, getSede);

// Obtener configuración de una sede
router.get('/:id/configuracion', authenticate, getConfiguracion);

// Obtener unidades de una sede
router.get('/:id/unidades', authenticate, getUnidadesDeSede);

// Obtener personal de una sede
router.get('/:id/personal', authenticate, getPersonalDeSede);

export default router;
