import { db } from '../../config/database';
import { JWTPayload } from '../../utils/jwt';

export interface CreateReparacionData {
  unidad_id: number;
  motivo: string;
  descripcion?: string | null;
  fecha_inicio?: string | null;
  registrado_por: number;
}

export const ReparacionModel = {
  async getPorUnidad(unidadId: number): Promise<any[]> {
    return db.any(
      `SELECT
         r.id,
         r.unidad_id,
         u.codigo AS unidad_codigo,
         r.motivo,
         r.descripcion,
         r.fecha_inicio,
         r.fecha_fin,
         r.estado,
         (CURRENT_DATE - r.fecha_inicio) AS dias_en_taller,
         r.registrado_por,
         usr.nombre AS registrado_por_nombre,
         r.created_at,
         r.updated_at
       FROM unidad_reparacion r
       JOIN unidad u ON r.unidad_id = u.id
       LEFT JOIN usuario usr ON r.registrado_por = usr.id
       WHERE r.unidad_id = $1
       ORDER BY r.fecha_inicio DESC`,
      [unidadId]
    );
  },

  async getActivas(sedeId?: number): Promise<any[]> {
    return db.any(
      `SELECT
         r.id,
         r.unidad_id,
         u.codigo AS unidad_codigo,
         u.tipo_unidad,
         u.sede_id,
         s.nombre AS sede_nombre,
         r.motivo,
         r.descripcion,
         r.fecha_inicio,
         r.fecha_fin,
         r.estado,
         (CURRENT_DATE - r.fecha_inicio) AS dias_en_taller,
         r.registrado_por,
         usr.nombre AS registrado_por_nombre,
         r.created_at
       FROM unidad_reparacion r
       JOIN unidad u ON r.unidad_id = u.id
       LEFT JOIN sede s ON u.sede_id = s.id
       LEFT JOIN usuario usr ON r.registrado_por = usr.id
       WHERE r.estado = 'EN_REPARACION'
         AND ($1::int IS NULL OR u.sede_id = $1)
       ORDER BY r.fecha_inicio ASC`,
      [sedeId ?? null]
    );
  },

  async getById(id: number): Promise<any | null> {
    return db.oneOrNone(
      `SELECT id, unidad_id, estado FROM unidad_reparacion WHERE id = $1`,
      [id]
    );
  },

  async tieneReparacionActiva(unidadId: number): Promise<boolean> {
    const row = await db.oneOrNone(
      `SELECT id FROM unidad_reparacion WHERE unidad_id = $1 AND estado = 'EN_REPARACION'`,
      [unidadId]
    );
    return !!row;
  },

  async crear(data: CreateReparacionData): Promise<any> {
    const reparacion = await db.one(
      `INSERT INTO unidad_reparacion
         (unidad_id, motivo, descripcion, fecha_inicio, estado, registrado_por)
       VALUES
         ($/unidad_id/, $/motivo/, $/descripcion/, $/fecha_inicio/, 'EN_REPARACION', $/registrado_por/)
       RETURNING *`,
      {
        unidad_id: data.unidad_id,
        motivo: data.motivo,
        descripcion: data.descripcion ?? null,
        fecha_inicio: data.fecha_inicio ?? new Date().toISOString().split('T')[0],
        registrado_por: data.registrado_por,
      }
    );
    await db.none(
      `UPDATE unidad SET disponible_transportes = false, updated_at = NOW() WHERE id = $1`,
      [data.unidad_id]
    );
    return reparacion;
  },

  async completar(id: number, fechaFin?: string): Promise<any> {
    return db.one(
      `UPDATE unidad_reparacion
       SET estado = 'COMPLETADA',
           fecha_fin = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, fechaFin ?? new Date().toISOString().split('T')[0]]
    );
  },

  async cancelar(id: number): Promise<any> {
    return db.one(
      `UPDATE unidad_reparacion
       SET estado = 'CANCELADA',
           fecha_fin = CURRENT_DATE,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
  },

  async getHistorialUnificado(
    unidadId: number,
    desde: string,
    hasta: string,
    tipos: string[]
  ): Promise<any[]> {
    const parts: string[] = [];

    if (tipos.includes('combustible')) {
      parts.push(`
        SELECT
          'COMBUSTIBLE' AS categoria,
          cr.id,
          cr.created_at AS fecha,
          jsonb_build_object(
            'tipo',            cr.tipo,
            'nivel_anterior',  cr.nivel_anterior,
            'nivel_nuevo',     cr.nivel_nuevo,
            'odometro_actual', cr.odometro_actual,
            'km_recorridos',   cr.km_recorridos,
            'observaciones',   cr.observaciones,
            'usuario',         u.nombre_completo
          ) AS datos
        FROM combustible_registro cr
        LEFT JOIN usuario u ON cr.registrado_por = u.id
        WHERE cr.unidad_id = $/unidadId/
          AND cr.created_at::date BETWEEN $/desde/::date AND $/hasta/::date
      `);
    }

    if (tipos.includes('salidas')) {
      parts.push(`
        SELECT
          'SALIDA' AS categoria,
          su.id,
          su.fecha_hora_salida AS fecha,
          jsonb_build_object(
            'estado',                su.estado,
            'km_inicial',            su.km_inicial,
            'km_final',              su.km_final,
            'km_recorridos',         su.km_recorridos,
            'fecha_regreso',         su.fecha_hora_regreso,
            'observaciones_salida',  su.observaciones_salida,
            'observaciones_regreso', su.observaciones_regreso
          ) AS datos
        FROM salida_unidad su
        WHERE su.unidad_id = $/unidadId/
          AND su.fecha_hora_salida::date BETWEEN $/desde/::date AND $/hasta/::date
      `);
    }

    if (tipos.includes('reparaciones')) {
      parts.push(`
        SELECT
          'REPARACION' AS categoria,
          r.id,
          r.fecha_inicio::timestamptz AS fecha,
          jsonb_build_object(
            'motivo',         r.motivo,
            'descripcion',    r.descripcion,
            'fecha_fin',      r.fecha_fin,
            'estado',         r.estado,
            'dias_en_taller', (CURRENT_DATE - r.fecha_inicio),
            'usuario',        u.nombre_completo
          ) AS datos
        FROM unidad_reparacion r
        LEFT JOIN usuario u ON r.registrado_por = u.id
        WHERE r.unidad_id = $/unidadId/
          AND r.fecha_inicio BETWEEN $/desde/::date AND $/hasta/::date
      `);
    }

    if (parts.length === 0) return [];

    const query = parts.join('\nUNION ALL\n') + '\nORDER BY fecha DESC';
    return db.any(query, { unidadId, desde, hasta });
  },
};
