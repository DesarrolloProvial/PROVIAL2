import { Router } from 'express';
import {
  // Asignaciones permanentes
  getMiUnidad,
  asignarBrigadaAUnidad,
  getTripulacion,
  // Salidas
  getMiSalidaActiva,
  getMiSalidaHoy,
  iniciarSalida,
  finalizarSalida,
  finalizarMiSalida,
  finalizarJornadaCompleta,
  cambiarRuta,
  getSalida,
  getUnidadesEnSalida,
  getHistorialSalidas,
  editarDatosSalida,
  // Relevos
  registrarRelevo,
  getRelevos
} from '../controllers/salida.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// ========================================
// ASIGNACIONES PERMANENTES
// ========================================

// Mi unidad asignada (Brigada)
router.get('/mi-unidad', authenticate, authorize('BRIGADA'), getMiUnidad);

// Asignar brigadista a unidad (Operaciones/Admin)
router.post('/asignar-brigada', authenticate, authorize('OPERACIONES', 'ADMIN'), asignarBrigadaAUnidad);

// Tripulación de una unidad
router.get('/tripulacion/:unidadId', authenticate, getTripulacion);

// ========================================
// SALIDAS
// ========================================

// Mi salida activa (Brigada)
router.get('/mi-salida-activa', authenticate, authorize('BRIGADA'), getMiSalidaActiva);

// Mi salida de hoy (activa o finalizada) con resumen de situaciones (Brigada)
router.get('/mi-salida-hoy', authenticate, authorize('BRIGADA'), getMiSalidaHoy);

// Iniciar salida (Brigada)
router.post('/iniciar', authenticate, authorize('BRIGADA'), iniciarSalida);

// Cambiar ruta de mi salida activa (Brigada)
router.post('/cambiar-ruta', authenticate, authorize('BRIGADA'), cambiarRuta);

// Editar datos de salida (km y combustible iniciales) (Brigada)
router.patch('/editar-datos-salida', authenticate, authorize('BRIGADA'), editarDatosSalida);

// Finalizar mi salida activa (Brigada) - sin ID
router.post('/finalizar', authenticate, authorize('BRIGADA'), finalizarMiSalida);

// Finalizar jornada completa (Brigada) - limpia tablas operacionales
router.post('/finalizar-jornada', authenticate, authorize('BRIGADA'), finalizarJornadaCompleta);

// Finalizar salida por ID (Brigada, COP, Operaciones, Admin)
router.post('/:id/finalizar', authenticate, authorize('BRIGADA', 'COP', 'OPERACIONES', 'ADMIN'), finalizarSalida);

// Obtener info de una salida
router.get('/:id', authenticate, getSalida);

// Unidades en salida (COP, Operaciones, Admin)
router.get('/admin/unidades-en-salida', authenticate, authorize('COP', 'OPERACIONES', 'ADMIN'), getUnidadesEnSalida);

// Historial de salidas de una unidad
router.get('/historial/:unidadId', authenticate, getHistorialSalidas);

// ========================================
// RELEVOS
// ========================================

// Registrar relevo (Brigada, COP, Operaciones)
router.post('/relevos', authenticate, authorize('BRIGADA', 'COP', 'OPERACIONES'), registrarRelevo);

// Obtener relevos de una situación
router.get('/relevos/:situacionId', authenticate, getRelevos);

export default router;
