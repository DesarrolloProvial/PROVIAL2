/**
 * Controlador de Multimedia
 * Maneja subida y gestión de fotos y videos de situaciones
 */

import { Request, Response } from 'express';
import multer from 'multer';
import { MultimediaModel } from '../../models/common/multimedia.model';
import {
  uploadPhotoBuffer,
  uploadVideoBuffer,
  deleteByUrl,
  isCloudinaryConfiguredUnsigned
} from '../../services/common/cloudinary.service';
import {
  uploadPhoto as localUploadPhoto,
  uploadVideo as localUploadVideo,
  deleteFile as localDeleteFile
} from '../../services/common/storage.service';
import { db } from '../../config/database';
import { normalizeId } from '../../utils/db.utils';

const IS_LOCAL = process.env.STORAGE_TYPE === 'local';

// Tipos MIME permitidos — lista explícita para reducir superficie de ataque
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];

// Límites de tamaño por tipo (calibrar con la institución en pruebas)
const FOTO_MAX_BYTES = 10 * 1024 * 1024;   // 10 MB
const VIDEO_MAX_BYTES = 100 * 1024 * 1024; // 100 MB

// Adaptador unificado para fotos
async function subirFotoAdapter(
  buffer: Buffer,
  mimetype: string,
  originalname: string,
  entityId: number,
  orden: number,
  codigoEntidad?: string,
  infografiaNumero: number = 1
): Promise<{ success: boolean; url?: string; thumbnailUrl?: string; nombreArchivo?: string; width?: number; height?: number; size?: number; error?: string }> {
  if (IS_LOCAL) {
    const r = await localUploadPhoto({ buffer, originalname, mimetype }, entityId);
    return { ...r, nombreArchivo: r.filename };
  }
  const r = await uploadPhotoBuffer(buffer, entityId, orden, codigoEntidad, infografiaNumero);
  return { ...r, nombreArchivo: r.publicId };
}

// Adaptador unificado para videos
async function subirVideoAdapter(
  buffer: Buffer,
  mimetype: string,
  originalname: string,
  entityId: number,
  codigoEntidad?: string,
  infografiaNumero: number = 1
): Promise<{ success: boolean; url?: string; nombreArchivo?: string; size?: number; duration?: number; error?: string }> {
  if (IS_LOCAL) {
    const r = await localUploadVideo({ buffer, originalname, mimetype }, entityId);
    return { ...r, nombreArchivo: r.filename };
  }
  const r = await uploadVideoBuffer(buffer, entityId, codigoEntidad, infografiaNumero);
  return { ...r, nombreArchivo: r.publicId };
}

// Eliminar archivo — local o cloudinary según storage activo
async function eliminarArchivoAdapter(url: string): Promise<void> {
  if (IS_LOCAL) {
    await localDeleteFile(url);
  } else {
    await deleteByUrl(url);
  }
}

// Verificar que el storage activo está configurado
function storageDisponible(): boolean {
  if (IS_LOCAL) return true;
  return isCloudinaryConfiguredUnsigned();
}

const memStorage = multer.memoryStorage();

export const uploadFoto = multer({
  storage: memStorage,
  limits: { fileSize: FOTO_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de imagen no permitido: ${file.mimetype}. Use JPEG, PNG o WebP.`));
    }
  },
});

export const uploadVideo = multer({
  storage: memStorage,
  limits: { fileSize: VIDEO_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de video no permitido: ${file.mimetype}. Use MP4 o MOV.`));
    }
  },
});

// Alias para compatibilidad con la ruta genérica /upload
export const upload = uploadFoto;

export async function subirFoto(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autorizado' });

    const situacionIdNum = normalizeId(req.params.situacionId);
    if (!situacionIdNum) return res.status(400).json({ error: 'ID inválido' });

    const { latitud, longitud, infografia_numero, infografia_titulo, orden: ordenBody } = req.body;
    const infografiaNumero = infografia_numero ? parseInt(infografia_numero, 10) : 1;

    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

    const situacion = await db.oneOrNone(
      'SELECT id, tipo_situacion, codigo_situacion FROM situacion WHERE id = $1',
      [situacionIdNum]
    );
    if (!situacion) return res.status(404).json({ error: 'Situación no encontrada' });

    const ordenSiguiente = await MultimediaModel.getSiguienteOrdenFoto(situacionIdNum, infografiaNumero);
    if (ordenSiguiente > 3) {
      return res.status(400).json({
        error: 'Límite de fotos alcanzado',
        message: `Ya se subieron las 3 fotos permitidas para la infografía ${infografiaNumero}`
      });
    }

    // Usar el orden que envió el móvil si es válido (1-3); si no, usar auto-incremento
    const ordenBodyNum = ordenBody ? parseInt(ordenBody, 10) : NaN;
    const ordenFinal = (!isNaN(ordenBodyNum) && ordenBodyNum >= 1 && ordenBodyNum <= 3) ? ordenBodyNum : ordenSiguiente;

    // Verificar límite de infografías (máx 10 por situación)
    const esNuevaInfografia = !(await MultimediaModel.existeInfografia({ situacion_id: situacionIdNum, infografia_numero: infografiaNumero }));
    if (esNuevaInfografia) {
      const totalInfografias = await MultimediaModel.contarInfografias({ situacion_id: situacionIdNum });
      if (totalInfografias >= 10) {
        return res.status(400).json({ error: 'Límite de 10 infografías alcanzado para esta situación' });
      }
    }

    if (!storageDisponible()) {
      console.error('[MULTIMEDIA] Storage no configurado!');
      return res.status(500).json({ error: 'Servicio de almacenamiento no disponible' });
    }

    const result = await subirFotoAdapter(
      req.file.buffer, req.file.mimetype, req.file.originalname,
      situacionIdNum, ordenFinal, situacion.codigo_situacion, infografiaNumero
    );

    if (!result.success) {
      console.error('[MULTIMEDIA] Error subiendo foto:', result.error);
      return res.status(500).json({ error: result.error });
    }

    const multimediaId = await MultimediaModel.create({
      situacion_id: situacionIdNum,
      infografia_numero: infografiaNumero,
      infografia_titulo: infografia_titulo || null,
      tipo: 'FOTO',
      orden: ordenFinal,
      url_original: result.url!,
      url_thumbnail: result.thumbnailUrl,
      nombre_archivo: result.nombreArchivo || `foto_${ordenSiguiente}`,
      mime_type: req.file.mimetype,
      tamanio_bytes: result.size || req.file.size,
      ancho: result.width,
      alto: result.height,
      latitud: latitud ? parseFloat(latitud) : null,
      longitud: longitud ? parseFloat(longitud) : null,
      subido_por: req.user!.userId,
      estado: 'SUBIDO'
    });

    const completitud = await MultimediaModel.verificarCompletitud(situacionIdNum);

    console.log(`[MULTIMEDIA] Foto ${ordenFinal}/3 (Inf ${infografiaNumero}) subida para situación ${situacionIdNum}`);

    return res.status(201).json({
      message: `Foto ${ordenFinal} de 3 subida correctamente`,
      multimedia: {
        id: multimediaId,
        infografia_numero: infografiaNumero,
        orden: ordenFinal,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        size: result.size,
        width: result.width,
        height: result.height
      },
      completitud
    });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una foto en esa posición para esta infografía', codigo: 'ORDEN_DUPLICADO' });
    }
    console.error('Error al subir foto:', error);
    return res.status(500).json({ error: 'Error al subir la foto' });
  }
}

export async function subirVideo(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autorizado' });

    const situacionIdNum = normalizeId(req.params.situacionId);
    if (!situacionIdNum) return res.status(400).json({ error: 'ID inválido' });

    const { latitud, longitud, duracion_segundos, infografia_numero, infografia_titulo } = req.body;
    const infografiaNumero = infografia_numero ? parseInt(infografia_numero, 10) : 1;

    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

    const situacion = await db.oneOrNone(
      'SELECT id, tipo_situacion, codigo_situacion FROM situacion WHERE id = $1',
      [situacionIdNum]
    );
    if (!situacion) return res.status(404).json({ error: 'Situación no encontrada' });

    const existeVideo = await MultimediaModel.existeVideo(situacionIdNum, infografiaNumero);
    if (existeVideo) {
      return res.status(400).json({
        error: 'Ya existe un video',
        message: `Solo se permite un video por infografía. Elimina el existente en la infografía ${infografiaNumero} primero.`
      });
    }

    if (!storageDisponible()) {
      console.error('[MULTIMEDIA] Storage no configurado!');
      return res.status(500).json({ error: 'Servicio de almacenamiento no disponible' });
    }

    console.log(`[MULTIMEDIA] Subiendo video para situación ${situacionIdNum} Infografía ${infografiaNumero}...`);
    const result = await subirVideoAdapter(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      situacionIdNum,
      situacion.codigo_situacion,
      infografiaNumero
    );

    if (!result.success) {
      console.error('[MULTIMEDIA] Error subiendo video a Cloudinary:', result.error);
      return res.status(500).json({ error: result.error });
    }

    const multimediaId = await MultimediaModel.create({
      situacion_id: situacionIdNum,
      infografia_numero: infografiaNumero,
      infografia_titulo: infografia_titulo || null,
      tipo: 'VIDEO',
      url_original: result.url!,
      nombre_archivo: result.nombreArchivo || `video_${Date.now()}`,
      mime_type: req.file.mimetype,
      tamanio_bytes: result.size || req.file.size,
      duracion_segundos: duracion_segundos ? parseInt(duracion_segundos) : (result.duration ? Math.round(result.duration) : null),
      latitud: latitud ? parseFloat(latitud) : null,
      longitud: longitud ? parseFloat(longitud) : null,
      subido_por: req.user!.userId,
      estado: 'SUBIDO'
    });

    const completitud = await MultimediaModel.verificarCompletitud(situacionIdNum);

    console.log(`[MULTIMEDIA] Video subido para situación ${situacionIdNum} por usuario ${req.user!.userId}`);

    return res.status(201).json({
      message: 'Video subido correctamente',
      multimedia: {
        id: multimediaId,
        infografia_numero: infografiaNumero,
        url: result.url,
        size: result.size
      },
      completitud
    });
  } catch (error) {
    console.error('Error al subir video:', error);
    return res.status(500).json({ error: 'Error al subir el video' });
  }
}

export async function getMultimediaSituacion(req: Request, res: Response) {
  try {
    const situacionIdNum = normalizeId(req.params.situacionId);
    if (!situacionIdNum) return res.status(400).json({ error: 'ID inválido' });

    const multimedia = await MultimediaModel.getBySituacionId(situacionIdNum);
    const completitud = await MultimediaModel.verificarCompletitud(situacionIdNum);

    const fotos = multimedia.filter(m => m.tipo === 'FOTO');
    const videos = multimedia.filter(m => m.tipo === 'VIDEO');

    return res.json({ situacion_id: situacionIdNum, fotos, videos, completitud });
  } catch (error) {
    console.error('Error al obtener multimedia:', error);
    return res.status(500).json({ error: 'Error al obtener multimedia' });
  }
}

export async function getResumenMultimedia(req: Request, res: Response) {
  try {
    const { situacionIds } = req.query;
    if (!situacionIds || typeof situacionIds !== 'string') {
      return res.status(400).json({ error: 'Se requiere situacionIds como query param' });
    }
    const ids = situacionIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (ids.length === 0) return res.json({ resumen: [] });
    const resumen = await MultimediaModel.getResumenBySituaciones(ids);
    return res.json({ resumen });
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    return res.status(500).json({ error: 'Error al obtener resumen' });
  }
}

export async function eliminarMultimedia(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autorizado' });

    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const multimedia = await MultimediaModel.getById(id);
    if (!multimedia) return res.status(404).json({ error: 'Archivo no encontrado' });

    if (multimedia.subido_por !== req.user!.userId && req.user!.rol !== 'ADMIN') {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este archivo' });
    }

    await eliminarArchivoAdapter(multimedia.url_original);
    await MultimediaModel.delete(id);

    console.log(`[MULTIMEDIA] Archivo ${id} eliminado por usuario ${req.user!.userId}`);
    return res.json({ message: 'Archivo eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar multimedia:', error);
    return res.status(500).json({ error: 'Error al eliminar archivo' });
  }
}

export async function getGaleria(req: Request, res: Response) {
  try {
    const { desde, hasta, soloIncompletas, tipoSituacion, limit = '50', offset = '0' } = req.query;

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
  } catch (error) {
    console.error('Error al obtener galería:', error);
    return res.status(500).json({ error: 'Error al obtener galería' });
  }
}

export async function getStats(req: Request, res: Response) {
  try {
    if (!req.user || !['ADMIN', 'OPERACIONES'].includes(req.user!.rol)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

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
      storage: {
        provider: IS_LOCAL ? 'local' : 'cloudinary',
        configured: storageDisponible()
      },
      database: {
        total_archivos: parseInt(dbStats.total_archivos),
        total_fotos: parseInt(dbStats.total_fotos),
        total_videos: parseInt(dbStats.total_videos),
        total_mb: Math.round(parseInt(dbStats.total_bytes) / (1024 * 1024) * 100) / 100,
        situaciones_con_multimedia: parseInt(dbStats.situaciones_con_multimedia)
      }
    });
  } catch (error) {
    console.error('Error al obtener stats:', error);
    return res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
}

export async function subirFotoGenerica(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autorizado' });
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

    if (!storageDisponible()) {
      console.error('[MULTIMEDIA] Storage no configurado!');
      return res.status(500).json({ error: 'Servicio de almacenamiento no disponible' });
    }

    const result = await subirFotoAdapter(req.file.buffer, req.file.mimetype, req.file.originalname, 0, 1);
    if (!result.success) {
      console.error('[MULTIMEDIA] Error subiendo foto genérica:', result.error);
      return res.status(500).json({ error: result.error });
    }

    return res.status(201).json({
      success: true,
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
      publicId: result.nombreArchivo,
      size: result.size,
      width: result.width,
      height: result.height
    });
  } catch (error) {
    console.error('Error al subir foto genérica:', error);
    return res.status(500).json({ error: 'Error al subir la foto' });
  }
}

export async function subirFotoActividad(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autorizado' });

    const actividadIdNum = normalizeId(req.params.actividadId);
    if (!actividadIdNum) return res.status(400).json({ error: 'ID inválido' });

    const { infografia_numero, infografia_titulo, orden: ordenBody } = req.body;
    const infografiaNumero = infografia_numero ? parseInt(infografia_numero, 10) : 1;

    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

    const actividad = await db.oneOrNone('SELECT id FROM actividad WHERE id = $1', [actividadIdNum]);
    if (!actividad) return res.status(404).json({ error: 'Actividad no encontrada' });

    const ordenSiguiente = await MultimediaModel.getSiguienteOrdenFotoActividad(actividadIdNum, infografiaNumero);
    if (ordenSiguiente > 3) return res.status(400).json({ error: `Límite de fotos alcanzado para infografía ${infografiaNumero}` });

    const ordenBodyNum = ordenBody ? parseInt(ordenBody, 10) : NaN;
    const ordenFinalAct = (!isNaN(ordenBodyNum) && ordenBodyNum >= 1 && ordenBodyNum <= 3) ? ordenBodyNum : ordenSiguiente;

    // Verificar límite de infografías (máx 3 por actividad)
    const esNuevaInfAct = !(await MultimediaModel.existeInfografia({ actividad_id: actividadIdNum, infografia_numero: infografiaNumero }));
    if (esNuevaInfAct) {
      const totalInfAct = await MultimediaModel.contarInfografias({ actividad_id: actividadIdNum });
      if (totalInfAct >= 3) {
        return res.status(400).json({ error: 'Límite de 3 infografías alcanzado para esta actividad' });
      }
    }

    if (!storageDisponible()) return res.status(500).json({ error: 'Servicio de almacenamiento no disponible' });

    const result = await subirFotoAdapter(req.file.buffer, req.file.mimetype, req.file.originalname, actividadIdNum, ordenFinalAct, `ACT-${actividadIdNum}`, infografiaNumero);
    if (!result.success) return res.status(500).json({ error: result.error });

    const multimediaId = await MultimediaModel.create({
      actividad_id: actividadIdNum,
      infografia_numero: infografiaNumero,
      infografia_titulo: infografia_titulo || null,
      tipo: 'FOTO',
      orden: ordenFinalAct,
      url_original: result.url!,
      url_thumbnail: result.thumbnailUrl,
      nombre_archivo: result.nombreArchivo || `foto_${ordenSiguiente}`,
      mime_type: req.file.mimetype,
      tamanio_bytes: result.size || req.file.size,
      ancho: result.width,
      alto: result.height,
      subido_por: req.user!.userId,
      estado: 'SUBIDO'
    });

    return res.status(201).json({
      message: `Foto ${ordenFinalAct} de 3 subida`,
      multimedia: { id: multimediaId, infografia_numero: infografiaNumero, orden: ordenFinalAct, url: result.url, thumbnailUrl: result.thumbnailUrl }
    });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una foto en esa posición para esta infografía', codigo: 'ORDEN_DUPLICADO' });
    }
    console.error('Error al subir foto actividad:', error);
    return res.status(500).json({ error: 'Error al subir la foto' });
  }
}

export async function subirVideoActividad(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autorizado' });

    const actividadIdNum = normalizeId(req.params.actividadId);
    if (!actividadIdNum) return res.status(400).json({ error: 'ID inválido' });

    const { infografia_numero, infografia_titulo } = req.body;
    const infografiaNumero = infografia_numero ? parseInt(infografia_numero, 10) : 1;

    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

    const actividad = await db.oneOrNone('SELECT id FROM actividad WHERE id = $1', [actividadIdNum]);
    if (!actividad) return res.status(404).json({ error: 'Actividad no encontrada' });

    const existeVideoAct = await MultimediaModel.existeVideoActividad(actividadIdNum, infografiaNumero);
    if (existeVideoAct) {
      return res.status(400).json({ error: `Ya existe un video para la infografía ${infografiaNumero} de esta actividad` });
    }

    // Verificar límite de infografías (máx 3 por actividad)
    const esNuevaInfVideo = !(await MultimediaModel.existeInfografia({ actividad_id: actividadIdNum, infografia_numero: infografiaNumero }));
    if (esNuevaInfVideo) {
      const totalInfVideo = await MultimediaModel.contarInfografias({ actividad_id: actividadIdNum });
      if (totalInfVideo >= 3) {
        return res.status(400).json({ error: 'Límite de 3 infografías alcanzado para esta actividad' });
      }
    }

    if (!storageDisponible()) return res.status(500).json({ error: 'Servicio de almacenamiento no disponible' });

    const result = await subirVideoAdapter(req.file.buffer, req.file.mimetype, req.file.originalname, actividadIdNum, `ACT-${actividadIdNum}`, infografiaNumero);
    if (!result.success) return res.status(500).json({ error: result.error });

    const multimediaId = await MultimediaModel.create({
      actividad_id: actividadIdNum,
      infografia_numero: infografiaNumero,
      infografia_titulo: infografia_titulo || null,
      tipo: 'VIDEO',
      url_original: result.url!,
      nombre_archivo: result.nombreArchivo || `video_act_${actividadIdNum}`,
      mime_type: req.file.mimetype,
      tamanio_bytes: result.size || req.file.size,
      duracion_segundos: req.body.duracion_segundos ? parseInt(req.body.duracion_segundos) : null,
      subido_por: req.user!.userId,
      estado: 'SUBIDO'
    });

    return res.status(201).json({ message: 'Video subido', multimedia: { id: multimediaId, infografia_numero: infografiaNumero, url: result.url } });
  } catch (error) {
    console.error('Error al subir video actividad:', error);
    return res.status(500).json({ error: 'Error al subir el video' });
  }
}

export async function getMultimediaActividad(req: Request, res: Response) {
  try {
    const actividadIdNum = normalizeId(req.params.actividadId);
    if (!actividadIdNum) return res.status(400).json({ error: 'ID inválido' });

    const multimedia = await MultimediaModel.getByActividadId(actividadIdNum);
    const fotos = multimedia.filter(m => m.tipo === 'FOTO');
    const videos = multimedia.filter(m => m.tipo === 'VIDEO');
    return res.json({ actividad_id: actividadIdNum, fotos, videos });
  } catch (error) {
    console.error('Error al obtener multimedia actividad:', error);
    return res.status(500).json({ error: 'Error al obtener multimedia' });
  }
}

export default {
  upload,
  uploadFoto,
  uploadVideo,
  subirFoto,
  subirVideo,
  subirFotoGenerica,
  getMultimediaSituacion,
  getResumenMultimedia,
  eliminarMultimedia,
  getGaleria,
  getStats,
  subirFotoActividad,
  subirVideoActividad,
  getMultimediaActividad,
};
