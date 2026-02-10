/**
 * Modelo para gestión de multimedia de situaciones
 */

import { db } from '../config/database';

export interface MultimediaRecord {
  id: number;
  situacion_id: number;
  infografia_numero: number;
  infografia_titulo: string | null;
  tipo: 'FOTO' | 'VIDEO';
  orden: number | null;
  url_original: string;
  url_thumbnail: string | null;
  nombre_archivo: string;
  mime_type: string;
  tamanio_bytes: number;
  ancho: number | null;
  alto: number | null;
  duracion_segundos: number | null;
  latitud: number | null;
  longitud: number | null;
  subido_por: number;
  created_at: Date;
}

export interface CreateMultimediaParams {
  situacion_id: number;
  infografia_numero?: number;
  infografia_titulo?: string;
  tipo: 'FOTO' | 'VIDEO';
  orden?: number | null;
  url_original: string;
  url_thumbnail?: string | null;
  nombre_archivo: string;
  mime_type: string;
  tamanio_bytes: number;
  ancho?: number | null;
  alto?: number | null;
  duracion_segundos?: number | null;
  latitud?: number | null;
  longitud?: number | null;
  subido_por: number;
}

export interface MultimediaResumen {
  situacion_id: number;
  total_fotos: number;
  total_videos: number;
  tiene_video: boolean;
  thumbnails: string[];
  preview_url: string | null;
}

export const MultimediaModel = {
  /**
   * Crear registro de multimedia
   */
  async create(params: CreateMultimediaParams): Promise<number> {
    const result = await db.one(`
      INSERT INTO situacion_multimedia (
        situacion_id, infografia_numero, infografia_titulo, tipo, orden, url_original, url_thumbnail,
        nombre_archivo, mime_type, tamanio_bytes,
        ancho, alto, duracion_segundos,
        latitud, longitud, subido_por
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13,
        $14, $15, $16
      ) RETURNING id
    `, [
      params.situacion_id,
      params.infografia_numero || 1,
      params.infografia_titulo || null,
      params.tipo,
      params.orden || null,
      params.url_original,
      params.url_thumbnail || null,
      params.nombre_archivo,
      params.mime_type,
      params.tamanio_bytes,
      params.ancho || null,
      params.alto || null,
      params.duracion_segundos || null,
      params.latitud || null,
      params.longitud || null,
      params.subido_por
    ]);
    return result.id;
  },

  /**
   * Obtener multimedia de una situación
   */
  async getBySituacionId(situacionId: number): Promise<MultimediaRecord[]> {
    return db.any(`
      SELECT
        sm.*,
        u.nombre_completo as subido_por_nombre
      FROM situacion_multimedia sm
      LEFT JOIN usuario u ON sm.subido_por = u.id
      WHERE sm.situacion_id = $1
      ORDER BY sm.infografia_numero, sm.tipo, sm.orden, sm.created_at
    `, [situacionId]);
  },

  /**
   * Obtener resumen de multimedia para múltiples situaciones (para el mapa)
   */
  async getResumenBySituaciones(situacionIds: number[]): Promise<MultimediaResumen[]> {
    if (situacionIds.length === 0) return [];

    return db.any(`
      SELECT
        situacion_id,
        total_fotos,
        total_videos,
        tiene_video,
        thumbnails,
        preview_url
      FROM v_situacion_multimedia_resumen
      WHERE situacion_id = ANY($1)
    `, [situacionIds]);
  },

  /**
   * Verificar si la multimedia está completa para una situación
   * @deprecated Usar validación por infografía en el futuro
   */
  async verificarCompletitud(situacionId: number): Promise<{
    fotos_subidas: number;
    fotos_requeridas: number;
    video_subido: boolean;
    video_requerido: boolean;
    multimedia_completa: boolean;
  }> {
    const result = await db.one(`
      SELECT * FROM verificar_multimedia_completa($1)
    `, [situacionId]);
    return result;
  },

  /**
   * Obtener siguiente orden disponible para foto en una infografía específica
   */
  async getSiguienteOrdenFoto(situacionId: number, infografiaNumero: number = 1): Promise<number> {
    const result = await db.oneOrNone(`
      SELECT COALESCE(MAX(orden), 0) + 1 as siguiente
      FROM situacion_multimedia
      WHERE situacion_id = $1 AND infografia_numero = $2 AND tipo = 'FOTO'
    `, [situacionId, infografiaNumero]);
    return result?.siguiente || 1;
  },

  /**
   * Verificar si ya existe video para la situación e infografía
   */
  async existeVideo(situacionId: number, infografiaNumero: number = 1): Promise<boolean> {
    const result = await db.oneOrNone(`
      SELECT id FROM situacion_multimedia
      WHERE situacion_id = $1 AND infografia_numero = $2 AND tipo = 'VIDEO'
      LIMIT 1
    `, [situacionId, infografiaNumero]);
    return !!result;
  },

  /**
   * Eliminar registro de multimedia
   */
  async delete(id: number): Promise<{ url_original: string; url_thumbnail: string | null } | null> {
    return db.oneOrNone(`
      DELETE FROM situacion_multimedia
      WHERE id = $1
      RETURNING url_original, url_thumbnail
    `, [id]);
  },

  /**
   * Obtener multimedia por ID
   */
  async getById(id: number): Promise<MultimediaRecord | null> {
    return db.oneOrNone(`
      SELECT * FROM situacion_multimedia WHERE id = $1
    `, [id]);
  },

  /**
   * Obtener todas las situaciones con su estado de multimedia (para dashboard)
   */
  async getSituacionesConMultimedia(options: {
    desde?: Date;
    hasta?: Date;
    soloIncompletas?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    const { desde, hasta, soloIncompletas, limit = 50, offset = 0 } = options;

    let whereConditions = ['1=1'];
    const params: any[] = [];
    let paramCount = 0;

    if (desde) {
      paramCount++;
      whereConditions.push(`s.created_at >= $${paramCount}`);
      params.push(desde);
    }

    if (hasta) {
      paramCount++;
      whereConditions.push(`s.created_at <= $${paramCount}`);
      params.push(hasta);
    }

    // Solo situaciones que requieren multimedia
    whereConditions.push(`s.tipo_situacion IN ('INCIDENTE', 'ASISTENCIA_VEHICULAR', 'EMERGENCIA')`);

    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    const query = `
      WITH situacion_stats AS (
        SELECT
          s.id,
          s.numero_situacion,
          s.tipo_situacion,
          s.estado,
          s.created_at,
          s.ruta_id,
          r.codigo as ruta_codigo,
          s.km,
          COUNT(sm.id) FILTER (WHERE sm.tipo = 'FOTO') as fotos_subidas,
          BOOL_OR(sm.tipo = 'VIDEO') as tiene_video,
          (SELECT url_thumbnail FROM situacion_multimedia
           WHERE situacion_id = s.id AND tipo = 'FOTO'
           ORDER BY orden LIMIT 1) as preview_url
        FROM situacion s
        LEFT JOIN ruta r ON s.ruta_id = r.id
        LEFT JOIN situacion_multimedia sm ON s.id = sm.situacion_id
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY s.id, s.numero_situacion, s.tipo_situacion, s.estado,
                 s.created_at, s.ruta_id, r.codigo, s.km
      )
      SELECT *,
        CASE
          WHEN fotos_subidas >= 3 AND tiene_video THEN true
          ELSE false
        END as multimedia_completa
      FROM situacion_stats
      ${soloIncompletas ? 'WHERE fotos_subidas < 3 OR NOT COALESCE(tiene_video, false)' : ''}
      ORDER BY created_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;

    return db.any(query, params);
  }
};

export default MultimediaModel;
