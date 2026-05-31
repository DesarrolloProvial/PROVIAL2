import { Router } from 'express';
import {
  getMiSalidaActiva,
  getMiSalidaHoy,
  iniciarSalida,
  iniciarSalidaCOP,
  iniciarSalidaEmergencia,
  finalizarSalida,
  cambiarRuta,
  getSalida,
  getUnidadesEnSalida,
  getHistorialSalidas,
  getBitacoraUnidad,
  getBitacoraDia,
  getBitacoraTimeline,
  editarDatosSalida,
  registrarRelevo,
  getRelevos,
} from '../../controllers/common/salida.controller';
import { authenticate, authorize } from '../../middlewares/auth';

const router = Router();

// ── Brigada ──────────────────────────────────────────────────────────────────

router.get('/mi-salida-activa', authenticate, authorize('BRIGADA'), getMiSalidaActiva);
router.get('/mi-salida-hoy',    authenticate, authorize('BRIGADA'), getMiSalidaHoy);
router.post('/iniciar',         authenticate, authorize('BRIGADA'), iniciarSalida);
router.post('/cambiar-ruta',    authenticate, authorize('BRIGADA', 'COP', 'OPERACIONES', 'ADMIN'), cambiarRuta);
router.patch('/editar-datos-salida', authenticate, authorize('BRIGADA'), editarDatosSalida);

// ── COP (inicio y cierre administrativo) ────────────────────────────────────

// Iniciar salida desde asignación publicada (COP da salida igual que brigada desde móvil)
router.post('/cop/iniciar-unidad', authenticate, authorize('COP', 'OPERACIONES', 'ADMIN'), iniciarSalidaCOP);

// Iniciar salida de emergencia: crea turno+asignacion+tripulacion+salida en una sola transacción
router.post('/cop/salida-emergencia', authenticate, authorize('COP', 'OPERACIONES', 'ADMIN'), iniciarSalidaEmergencia);

// Finalizar salida por ID — override administrativo (COP/Admin únicamente)
// Brigada finaliza su jornada por POST /ingresos/finalizar-jornada
router.post('/:id/finalizar', authenticate, authorize('COP', 'ADMIN', 'SUPER_ADMIN'), finalizarSalida);

// ── Consultas ────────────────────────────────────────────────────────────────

router.get('/admin/unidades-en-salida', authenticate, authorize('COP', 'OPERACIONES', 'ADMIN'), getUnidadesEnSalida);
router.get('/historial/:unidadId',      authenticate, getHistorialSalidas);
router.get('/bitacora/:unidadId',       authenticate, authorize('COP', 'OPERACIONES', 'ADMIN', 'SUPER_ADMIN'), getBitacoraUnidad);
router.get('/bitacora-dia',             authenticate, authorize('COP', 'OPERACIONES', 'ADMIN', 'SUPER_ADMIN', 'ENCARGADO_NOMINAS'), getBitacoraDia);
router.get('/bitacora-timeline/:salidaId', authenticate, authorize('COP', 'OPERACIONES', 'ADMIN', 'SUPER_ADMIN', 'ENCARGADO_NOMINAS'), getBitacoraTimeline);

// Debe ir AL FINAL para no interceptar rutas específicas
router.get('/:id', authenticate, getSalida);

// ── Relevos ──────────────────────────────────────────────────────────────────

router.post('/relevos',              authenticate, authorize('BRIGADA', 'COP', 'OPERACIONES'), registrarRelevo);
router.get('/relevos/:situacionId',  authenticate, getRelevos);

export default router;
