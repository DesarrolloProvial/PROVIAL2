import { Router } from 'express';
import {
  registrarIngreso,
  finalizarJornada,
  registrarSalidaDeSede,
  getMiIngresoActivo,
  getMisIngresosHoy,
  getHistorialIngresos,
  getIngreso,
  editarIngreso
} from '../../controllers/common/ingreso.controller';
import { authenticate, authorize } from '../../middlewares/auth';

const router = Router();

// ========================================
// REGISTRO DE INGRESOS
// ========================================

// Registrar ingreso a sede (Brigada)
router.post('/registrar', authenticate, authorize('BRIGADA'), registrarIngreso);

// Finalizar jornada laboral (Brigada) - requiere ingreso activo de tipo FINALIZACION_JORNADA
router.post('/finalizar-jornada', authenticate, authorize('BRIGADA'), finalizarJornada);

// Registrar salida de sede - volver a la calle (Brigada)
router.post('/:id/salir', authenticate, authorize('BRIGADA'), registrarSalidaDeSede);

// ========================================
// CONSULTAS DE INGRESOS
// ========================================

// Mi ingreso activo (Brigada)
router.get('/mi-ingreso-activo', authenticate, authorize('BRIGADA'), getMiIngresoActivo);

// Mis ingresos de hoy (Brigada) - para bitácora
router.get('/mis-ingresos-hoy', authenticate, authorize('BRIGADA'), getMisIngresosHoy);

// Historial de ingresos de una salida
router.get('/historial/:salidaId', authenticate, getHistorialIngresos);

// Obtener ingreso específico
router.get('/:id', authenticate, getIngreso);

// Editar ingreso (Brigada) - km, combustible, observaciones
router.patch('/:id', authenticate, authorize('BRIGADA'), editarIngreso);

export default router;
