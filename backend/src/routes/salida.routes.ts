import { Router } from 'express';
import {
  // Salidas
  getMiSalidaActiva,
  getMiSalidaHoy,
  iniciarSalida,
  iniciarSalidaCOP,
  finalizarSalida,
  finalizarMiSalida,
  finalizarJornadaCompleta,
  cambiarRuta,
  getSalida,
  getUnidadesEnSalida,
  getHistorialSalidas,
  getBitacoraUnidad,
  getBitacoraDia,
  getBitacoraTimeline,
  editarDatosSalida,
  // Relevos
  registrarRelevo,
  getRelevos
} from '../controllers/salida.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// ========================================
// SALIDAS
// ========================================

// Mi salida activa (Brigada)
router.get('/mi-salida-activa', authenticate, authorize('BRIGADA'), getMiSalidaActiva);

// Mi salida de hoy (activa o finalizada) con resumen de situaciones (Brigada)
router.get('/mi-salida-hoy', authenticate, authorize('BRIGADA'), getMiSalidaHoy);

// Iniciar salida (Brigada)
router.post('/iniciar', authenticate, authorize('BRIGADA'), iniciarSalida);

// Iniciar salida desde COP sin inspección 360 (COP, Operaciones, Admin)
router.post('/cop/iniciar-unidad', authenticate, authorize('COP', 'OPERACIONES', 'ADMIN'), iniciarSalidaCOP);

// Cambiar ruta de mi salida activa (Brigada) o de una unidad específica (COP)
router.post('/cambiar-ruta', authenticate, authorize('BRIGADA', 'COP', 'OPERACIONES', 'ADMIN'), cambiarRuta);

// Editar datos de salida (km y combustible iniciales) (Brigada)
router.patch('/editar-datos-salida', authenticate, authorize('BRIGADA'), editarDatosSalida);

// Finalizar mi salida activa (Brigada) - sin ID
router.post('/finalizar', authenticate, authorize('BRIGADA'), finalizarMiSalida);

// Finalizar jornada completa (Brigada) - limpia tablas operacionales
router.post('/finalizar-jornada', authenticate, authorize('BRIGADA'), finalizarJornadaCompleta);

// Finalizar salida por ID (Brigada, COP, Operaciones, Admin)
router.post('/:id/finalizar', authenticate, authorize('BRIGADA', 'COP', 'OPERACIONES', 'ADMIN'), finalizarSalida);

// Unidades en salida (COP, Operaciones, Admin)
router.get('/admin/unidades-en-salida', authenticate, authorize('COP', 'OPERACIONES', 'ADMIN'), getUnidadesEnSalida);

// Historial de salidas de una unidad
router.get('/historial/:unidadId', authenticate, getHistorialSalidas);

// Bitácora completa por unidad (salidas + situaciones + actividades + tripulación)
router.get('/bitacora/:unidadId', authenticate, authorize('COP', 'OPERACIONES', 'ADMIN', 'SUPER_ADMIN'), getBitacoraUnidad);

// Bitácora diaria — todas las unidades que salieron en una fecha (?fecha=YYYY-MM-DD&sede_id=X)
router.get('/bitacora-dia', authenticate, authorize('COP', 'OPERACIONES', 'ADMIN', 'SUPER_ADMIN', 'ENCARGADO_NOMINAS'), getBitacoraDia);

// Timeline completo de una salida específica
router.get('/bitacora-timeline/:salidaId', authenticate, authorize('COP', 'OPERACIONES', 'ADMIN', 'SUPER_ADMIN', 'ENCARGADO_NOMINAS'), getBitacoraTimeline);

// Obtener info de una salida por ID — debe ir AL FINAL para no interceptar rutas específicas
router.get('/:id', authenticate, getSalida);

// ========================================
// RELEVOS
// ========================================

// Registrar relevo (Brigada, COP, Operaciones)
router.post('/relevos', authenticate, authorize('BRIGADA', 'COP', 'OPERACIONES'), registrarRelevo);

// Obtener relevos de una situación
router.get('/relevos/:situacionId', authenticate, getRelevos);

export default router;
