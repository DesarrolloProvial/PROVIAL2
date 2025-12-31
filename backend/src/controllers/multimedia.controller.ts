/**
 * Controlador de Multimedia
 * Maneja subida y gestión de fotos y videos de situaciones
 */

import { Request, Response } from 'express';
import multer from 'multer';
import { MultimediaModel } from '../models/multimedia.model';
import { uploadPhoto, uploadVideo, deleteFile, getStorageStats } from '../services/storage.service';
import { db } from '../config/database';

// Configuración de multer para manejo de archivos en memoria
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB máximo (antes de compresión)
    files: 4 // Máximo 4 archivos (3 fotos + 1 video)
  },
  fileFilter: (_req, file, cb) => {
    // Aceptar imágenes y videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes y videos'));
    }
  }
});

/**
 * POST /api/multimedia/situacion/:situacionId/foto
 * Subir una foto a una situación
 */
export async function subirFoto(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { situacionId } = req.params;
    const { latitud, longitud } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    // Verificar que la situación existe
    const situacion = await db.oneOrNone(
      'SELECT id, tipo_situacion FROM situacion WHERE id = $1',
      [situacionId]
    );

    if (!situacion) {
      return res.status(404).json({ error: 'Situación no encontrada' });
    }

    // Verificar límite de fotos
    const ordenSiguiente = await MultimediaModel.getSiguienteOrdenFoto(parseInt(situacionId));
    if (ordenSiguiente > 3) {
      return res.status(400).json({
        error: 'Límite de fotos alcanzado',
        message: 'Ya se subieron las 3 fotos permitidas para esta situación'
      });
    }

    // Subir foto con compresión
    const result = await uploadPhoto(
      {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype
      },
      parseInt(situacionId)
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Guardar referencia en BD
    const multimediaId = await MultimediaModel.create({
      situacion_id: parseInt(situacionId),
      tipo: 'FOTO',
      orden: ordenSiguiente,
      url_original: result.url!,
      url_thumbnail: result.thumbnailUrl,
      nombre_archivo: result.filename!,
      mime_type: req.file.mimetype,
      tamanio_bytes: result.size!,
      ancho: result.width,
      alto: result.height,
      latitud: latitud ? parseFloat(latitud) : null,
      longitud: longitud ? parseFloat(longitud) : null,
      subido_por: req.user.userId
    });

    // Verificar completitud
    const completitud = await MultimediaModel.verificarCompletitud(parseInt(situacionId));

    console.log(`[MULTIMEDIA] Foto ${ordenSiguiente}/3 subida para situación ${situacionId} por usuario ${req.user.userId}`);

    return res.status(201).json({
      message: `Foto ${ordenSiguiente} de 3 subida correctamente`,
      multimedia: {
        id: multimediaId,
        orden: ordenSiguiente,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        size: result.size,
        width: result.width,
        height: result.height
      },
      completitud
    });
  } catch (error: any) {
    console.error('Error al subir foto:', error);
    return res.status(500).json({ error: 'Error al subir la foto' });
  }
}

/**
 * POST /api/multimedia/situacion/:situacionId/video
 * Subir video a una situación
 */
export async function subirVideo(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { situacionId } = req.params;
    const { latitud, longitud, duracion_segundos } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    // Verificar que la situación existe
    const situacion = await db.oneOrNone(
      'SELECT id, tipo_situacion FROM situacion WHERE id = $1',
      [situacionId]
    );

    if (!situacion) {
      return res.status(404).json({ error: 'Situación no encontrada' });
    }

    // Verificar si ya existe video
    const existeVideo = await MultimediaModel.existeVideo(parseInt(situacionId));
    if (existeVideo) {
      return res.status(400).json({
        error: 'Ya existe un video',
        message: 'Solo se permite un video por situación. Elimina el existente primero.'
      });
    }

    // Subir video
    const result = await uploadVideo(
      {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype
      },
      parseInt(situacionId)
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Guardar referencia en BD
    const multimediaId = await MultimediaModel.create({
      situacion_id: parseInt(situacionId),
      tipo: 'VIDEO',
      url_original: result.url!,
      nombre_archivo: result.filename!,
      mime_type: req.file.mimetype,
      tamanio_bytes: result.size!,
      duracion_segundos: duracion_segundos ? parseInt(duracion_segundos) : null,
      latitud: latitud ? parseFloat(latitud) : null,
      longitud: longitud ? parseFloat(longitud) : null,
      subido_por: req.user.userId
    });

    // Verificar completitud
    const completitud = await MultimediaModel.verificarCompletitud(parseInt(situacionId));

    console.log(`[MULTIMEDIA] Video subido para situación ${situacionId} por usuario ${req.user.userId}`);

    return res.status(201).json({
      message: 'Video subido correctamente',
      multimedia: {
        id: multimediaId,
        url: result.url,
        size: result.size
      },
      completitud
    });
  } catch (error: any) {
    console.error('Error al subir video:', error);
    return res.status(500).json({ error: 'Error al subir el video' });
  }
}

/**
 * GET /api/multimedia/situacion/:situacionId
 * Obtener multimedia de una situación
 */
export async function getMultimediaSituacion(req: Request, res: Response) {
  try {
    const { situacionId } = req.params;

    const multimedia = await MultimediaModel.getBySituacionId(parseInt(situacionId));
    const completitud = await MultimediaModel.verificarCompletitud(parseInt(situacionId));

    const fotos = multimedia.filter(m => m.tipo === 'FOTO');
    const videos = multimedia.filter(m => m.tipo === 'VIDEO');

    return res.json({
      situacion_id: parseInt(situacionId),
      fotos,
      videos,
      completitud
    });
  } catch (error: any) {
    console.error('Error al obtener multimedia:', error);
    return res.status(500).json({ error: 'Error al obtener multimedia' });
  }
}

/**
 * GET /api/multimedia/resumen
 * Obtener resumen de multimedia para varias situaciones (para mapa)
 */
export async function getResumenMultimedia(req: Request, res: Response) {
  try {
    const { situacionIds } = req.query;

    if (!situacionIds || typeof situacionIds !== 'string') {
      return res.status(400).json({ error: 'Se requiere situacionIds como query param' });
    }

    const ids = situacionIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

    if (ids.length === 0) {
      return res.json({ resumen: [] });
    }

    const resumen = await MultimediaModel.getResumenBySituaciones(ids);
    return res.json({ resumen });
  } catch (error: any) {
    console.error('Error al obtener resumen:', error);
    return res.status(500).json({ error: 'Error al obtener resumen' });
  }
}

/**
 * DELETE /api/multimedia/:id
 * Eliminar un archivo multimedia
 */
export async function eliminarMultimedia(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { id } = req.params;

    // Obtener info del archivo
    const multimedia = await MultimediaModel.getById(parseInt(id));
    if (!multimedia) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    // Verificar permisos (solo quien subió o admin)
    if (multimedia.subido_por !== req.user.userId && req.user.rol !== 'ADMIN') {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este archivo' });
    }

    // Eliminar archivos del storage
    await deleteFile(multimedia.url_original);
    if (multimedia.url_thumbnail) {
      await deleteFile(multimedia.url_thumbnail);
    }

    // Eliminar de BD
    await MultimediaModel.delete(parseInt(id));

    console.log(`[MULTIMEDIA] Archivo ${id} eliminado por usuario ${req.user.userId}`);

    return res.json({ message: 'Archivo eliminado correctamente' });
  } catch (error: any) {
    console.error('Error al eliminar multimedia:', error);
    return res.status(500).json({ error: 'Error al eliminar archivo' });
  }
}

/**
 * GET /api/multimedia/galeria
 * Galería de multimedia para Accidentología y Comunicación Social
 */
export async function getGaleria(req: Request, res: Response) {
  try {
    const {
      desde,
      hasta,
      soloIncompletas,
      tipoSituacion,
      limit = '50',
      offset = '0'
    } = req.query;

    // Construir filtros
    let whereConditions = ["s.tipo_situacion IN ('INCIDENTE', 'ASISTENCIA_VEHICULAR', 'EMERGENCIA')"];
    const params: any[] = [];
    let paramCount = 0;

    if (desde) {
      paramCount++;
      whereConditions.push(`s.created_at >= $${paramCount}`);
      params.push(new Date(desde as string));
    }

    if (hasta) {
      paramCount++;
      whereConditions.push(`s.created_at <= $${paramCount}`);
      params.push(new Date(hasta as string));
    }

    if (tipoSituacion) {
      paramCount++;
      whereConditions.push(`s.tipo_situacion = $${paramCount}`);
      params.push(tipoSituacion);
    }

    paramCount++;
    params.push(parseInt(limit as string));
    paramCount++;
    params.push(parseInt(offset as string));

    const query = `
      SELECT
        s.id as situacion_id,
        s.numero_situacion,
        s.tipo_situacion,
        s.estado,
        s.descripcion,
        s.observaciones,
        s.created_at,
        r.codigo as ruta_codigo,
        s.km,
        s.sentido,
        s.latitud,
        s.longitud,
        u.codigo as unidad_codigo,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', sm.id,
            'tipo', sm.tipo,
            'orden', sm.orden,
            'url_original', sm.url_original,
            'url_thumbnail', sm.url_thumbnail,
            'created_at', sm.created_at
          ) ORDER BY sm.tipo, sm.orden)
          FROM situacion_multimedia sm WHERE sm.situacion_id = s.id),
          '[]'
        ) as multimedia,
        (SELECT COUNT(*) FROM situacion_multimedia WHERE situacion_id = s.id AND tipo = 'FOTO') as total_fotos,
        (SELECT COUNT(*) FROM situacion_multimedia WHERE situacion_id = s.id AND tipo = 'VIDEO') as total_videos
      FROM situacion s
      LEFT JOIN ruta r ON s.ruta_id = r.id
      LEFT JOIN unidad u ON s.unidad_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ${soloIncompletas === 'true' ? `
        AND (
          (SELECT COUNT(*) FROM situacion_multimedia WHERE situacion_id = s.id AND tipo = 'FOTO') < 3
          OR NOT EXISTS (SELECT 1 FROM situacion_multimedia WHERE situacion_id = s.id AND tipo = 'VIDEO')
        )
      ` : ''}
      ORDER BY s.created_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;

    const situaciones = await db.any(query, params);

    // Contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM situacion s
      WHERE ${whereConditions.slice(0, -2).join(' AND ') || '1=1'}
      ${soloIncompletas === 'true' ? `
        AND (
          (SELECT COUNT(*) FROM situacion_multimedia WHERE situacion_id = s.id AND tipo = 'FOTO') < 3
          OR NOT EXISTS (SELECT 1 FROM situacion_multimedia WHERE situacion_id = s.id AND tipo = 'VIDEO')
        )
      ` : ''}
    `;
    const countResult = await db.one(countQuery, params.slice(0, -2));

    return res.json({
      situaciones,
      total: parseInt(countResult.total),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error: any) {
    console.error('Error al obtener galería:', error);
    return res.status(500).json({ error: 'Error al obtener galería' });
  }
}

/**
 * GET /api/multimedia/stats
 * Estadísticas de almacenamiento (solo admin/operaciones)
 */
export async function getStats(req: Request, res: Response) {
  try {
    if (!req.user || !['ADMIN', 'OPERACIONES'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const storageStats = getStorageStats();

    const dbStats = await db.one(`
      SELECT
        COUNT(*) as total_archivos,
        COUNT(*) FILTER (WHERE tipo = 'FOTO') as total_fotos,
        COUNT(*) FILTER (WHERE tipo = 'VIDEO') as total_videos,
        COALESCE(SUM(tamanio_bytes), 0) as total_bytes,
        COUNT(DISTINCT situacion_id) as situaciones_con_multimedia
      FROM situacion_multimedia
    `);

    return res.json({
      storage: storageStats,
      database: {
        total_archivos: parseInt(dbStats.total_archivos),
        total_fotos: parseInt(dbStats.total_fotos),
        total_videos: parseInt(dbStats.total_videos),
        total_mb: Math.round(parseInt(dbStats.total_bytes) / (1024 * 1024) * 100) / 100,
        situaciones_con_multimedia: parseInt(dbStats.situaciones_con_multimedia)
      }
    });
  } catch (error: any) {
    console.error('Error al obtener stats:', error);
    return res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
}

export default {
  upload,
  subirFoto,
  subirVideo,
  getMultimediaSituacion,
  getResumenMultimedia,
  eliminarMultimedia,
  getGaleria,
  getStats
};
