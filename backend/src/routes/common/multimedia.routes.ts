/**
 * Rutas de Multimedia
 * Manejo de fotos y videos de situaciones
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import multimediaController from '../controllers/multimedia.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// ========================================
// SUBIDA DE ARCHIVOS
// ========================================

/**
 * POST /api/multimedia/upload
 * Subir una foto genérica a Cloudinary (para inspecciones, daños, etc.)
 * Devuelve URL de Cloudinary directamente
 */
router.post(
  '/upload',
  authorize('BRIGADA', 'COP', 'ADMIN'),
  multimediaController.upload.single('foto'),
  multimediaController.subirFotoGenerica
);

/**
 * POST /api/multimedia/situacion/:situacionId/foto
 * Subir una foto a una situación
 */
router.post(
  '/situacion/:situacionId/foto',
  authorize('BRIGADA', 'COP', 'OPERACIONES', 'ADMIN'),
  multimediaController.upload.single('foto'),
  multimediaController.subirFoto
);

/**
 * POST /api/multimedia/situacion/:situacionId/video
 * Subir video a una situación
 */
router.post(
  '/situacion/:situacionId/video',
  authorize('BRIGADA', 'COP', 'OPERACIONES', 'ADMIN'),
  multimediaController.upload.single('video'),
  multimediaController.subirVideo
);

/**
 * POST /api/multimedia/situacion/:situacionId/batch
 * Guardar referencias de archivos subidos a Cloudinary (offline-first sync)
 */
router.post(
  '/situacion/:situacionId/batch',
  authorize('BRIGADA', 'COP', 'OPERACIONES', 'ADMIN'),
  multimediaController.guardarReferenciasCloudinary
);

// ========================================
// CONSULTA DE ARCHIVOS
// ========================================

/**
 * GET /api/multimedia/situacion/:situacionId
 * Obtener multimedia de una situación específica
 */
router.get(
  '/situacion/:situacionId',
  multimediaController.getMultimediaSituacion
);

/**
 * GET /api/multimedia/resumen?situacionIds=1,2,3
 * Obtener resumen de multimedia para varias situaciones (para mapa)
 */
router.get(
  '/resumen',
  multimediaController.getResumenMultimedia
);

/**
 * GET /api/multimedia/galeria
 * Galería de multimedia para Accidentología y Comunicación Social
 * Filtros: desde, hasta, tipoSituacion, soloIncompletas
 */
router.get(
  '/galeria',
  authorize('ACCIDENTOLOGIA', 'COMUNICACION_SOCIAL', 'COP', 'ADMIN', 'OPERACIONES'),
  multimediaController.getGaleria
);

/**
 * GET /api/multimedia/stats
 * Estadísticas de almacenamiento (solo admin/operaciones)
 */
router.get(
  '/stats',
  authorize('ADMIN', 'OPERACIONES'),
  multimediaController.getStats
);

// ========================================
// ACTIVIDAD MULTIMEDIA
// ========================================

router.post(
  '/actividad/:actividadId/foto',
  authorize('BRIGADA', 'COP', 'OPERACIONES', 'ADMIN', 'SUPER_ADMIN', 'TRANSPORTES'),
  multimediaController.upload.single('foto'),
  multimediaController.subirFotoActividad
);

router.post(
  '/actividad/:actividadId/video',
  authorize('BRIGADA', 'COP', 'OPERACIONES', 'ADMIN', 'SUPER_ADMIN', 'TRANSPORTES'),
  multimediaController.upload.single('video'),
  multimediaController.subirVideoActividad
);

router.get(
  '/actividad/:actividadId',
  multimediaController.getMultimediaActividad
);

// ========================================
// ELIMINACIÓN
// ========================================

/**
 * DELETE /api/multimedia/:id
 * Eliminar un archivo multimedia
 */
router.delete(
  '/:id',
  authorize('BRIGADA', 'COP', 'OPERACIONES', 'ADMIN'),
  multimediaController.eliminarMultimedia
);

export default router;
