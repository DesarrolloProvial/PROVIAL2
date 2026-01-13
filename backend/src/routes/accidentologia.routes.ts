import { Router } from 'express';
import { AccidentologiaController } from '../controllers/accidentologia.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// ============================================
// RUTAS DE HOJAS DE ACCIDENTOLOGÍA
// ============================================

// Obtener tipos para dropdowns (antes de las rutas con parámetros)
router.get('/tipos', AccidentologiaController.tiposAccidente);

// Estadísticas
router.get('/estadisticas', AccidentologiaController.estadisticas);

// CRUD de hojas
router.post('/', AccidentologiaController.crear);
router.get('/', AccidentologiaController.listar);
router.get('/:id', AccidentologiaController.obtenerPorId);
router.put('/:id', AccidentologiaController.actualizar);
router.put('/:id/estado', AccidentologiaController.cambiarEstado);

// Obtener por situación
router.get('/situacion/:situacionId', AccidentologiaController.obtenerPorSituacion);

// Obtener por incidente (relación 1:1)
router.get('/incidente/:incidenteId', AccidentologiaController.obtenerPorIncidente);

// Obtener datos completos para PDF/reporte
router.get('/completo/:incidenteId', AccidentologiaController.obtenerCompleto);

// ============================================
// RUTAS DE VEHÍCULOS
// ============================================

router.get('/:id/vehiculos', AccidentologiaController.listarVehiculos);
router.post('/:id/vehiculos', AccidentologiaController.agregarVehiculo);
router.put('/vehiculos/:vehiculoId', AccidentologiaController.actualizarVehiculo);
router.delete('/vehiculos/:vehiculoId', AccidentologiaController.eliminarVehiculo);

// ============================================
// RUTAS DE PERSONAS
// ============================================

router.get('/:id/personas', AccidentologiaController.listarPersonas);
router.post('/:id/personas', AccidentologiaController.agregarPersona);
router.put('/personas/:personaId', AccidentologiaController.actualizarPersona);
router.delete('/personas/:personaId', AccidentologiaController.eliminarPersona);

export default router;
