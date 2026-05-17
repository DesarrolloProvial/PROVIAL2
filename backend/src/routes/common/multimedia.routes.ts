/**
 * Rutas de Multimedia
 * Manejo de fotos y videos de situaciones y actividades
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../middlewares/auth';
import multimediaController from '../../controllers/common/multimedia.controller';
import { uploadFoto, uploadVideo } from '../../controllers/common/multimedia.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// ── Helpers para manejar errores de multer con mensajes explícitos ────────────

function withFoto(req: Request, res: Response, next: NextFunction) {
  uploadFoto.single('foto')(req, res, (err: any) => {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'La foto supera el límite de 10 MB', codigo: 'ARCHIVO_DEMASIADO_GRANDE', limite_mb: 10 });
    }
    if (err) return res.status(400).json({ error: err.message, codigo: 'ARCHIVO_RECHAZADO' });
    next();
  });
}

function withVideo(req: Request, res: Response, next: NextFunction) {
  uploadVideo.single('video')(req, res, (err: any) => {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'El video supera el límite de 100 MB', codigo: 'ARCHIVO_DEMASIADO_GRANDE', limite_mb: 100 });
    }
    if (err) return res.status(400).json({ error: err.message, codigo: 'ARCHIVO_RECHAZADO' });
    next();
  });
}

// ── Subida de archivos ─────────────────────────────────────────────────────────

router.post(
  '/upload',
  authorize('BRIGADA', 'COP', 'ADMIN'),
  withFoto,
  multimediaController.subirFotoGenerica
);

router.post(
  '/situacion/:situacionId/foto',
  authorize('BRIGADA', 'COP', 'OPERACIONES', 'ADMIN'),
  withFoto,
  multimediaController.subirFoto
);

router.post(
  '/situacion/:situacionId/video',
  authorize('BRIGADA', 'COP', 'OPERACIONES', 'ADMIN'),
  withVideo,
  multimediaController.subirVideo
);

// ── Consulta ──────────────────────────────────────────────────────────────────

router.get(
  '/situacion/:situacionId',
  multimediaController.getMultimediaSituacion
);

router.get(
  '/resumen',
  multimediaController.getResumenMultimedia
);

router.get(
  '/galeria',
  authorize('ACCIDENTOLOGIA', 'COMUNICACION_SOCIAL', 'COP', 'ADMIN', 'OPERACIONES'),
  multimediaController.getGaleria
);

router.get(
  '/stats',
  authorize('ADMIN', 'OPERACIONES'),
  multimediaController.getStats
);

// ── Actividades ───────────────────────────────────────────────────────────────

router.post(
  '/actividad/:actividadId/foto',
  authorize('BRIGADA', 'COP', 'OPERACIONES', 'ADMIN', 'SUPER_ADMIN', 'TRANSPORTES'),
  withFoto,
  multimediaController.subirFotoActividad
);

router.post(
  '/actividad/:actividadId/video',
  authorize('BRIGADA', 'COP', 'OPERACIONES', 'ADMIN', 'SUPER_ADMIN', 'TRANSPORTES'),
  withVideo,
  multimediaController.subirVideoActividad
);

router.get(
  '/actividad/:actividadId',
  multimediaController.getMultimediaActividad
);

// ── Eliminación ───────────────────────────────────────────────────────────────

router.delete(
  '/:id',
  authorize('BRIGADA', 'COP', 'OPERACIONES', 'ADMIN'),
  multimediaController.eliminarMultimedia
);

export default router;
