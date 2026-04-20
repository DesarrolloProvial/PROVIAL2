import { db } from '../../config/database';

export interface CreateReasignacionData {
  tipo: 'USUARIO' | 'UNIDAD';
  recurso_id: number;
  sede_origen_id: number;
  sede_destino_id: number;
  fecha_inicio: string;
  fecha_fin?: string | null;
  es_permanente: boolean;
  motivo?: string | null;
  autorizado_por: number;
}

export const ReasignacionModel = {
  async getActivas(tipo?: 'USUARIO' | 'UNIDAD'): Promise<any[]> {
    return db.any(
      `SELECT r.*,
              so.codigo AS sede_origen_codigo,
              so.nombre AS sede_origen_nombre,
              sd.codigo AS sede_destino_codigo,
              sd.nombre AS sede_destino_nombre,
              CASE
                WHEN r.tipo = 'USUARIO' THEN u.nombre_completo
                WHEN r.tipo = 'UNIDAD'  THEN un.codigo
              END AS recurso_nombre,
              ua.nombre_completo AS autorizado_por_nombre
       FROM reasignacion_sede r
       JOIN sede so ON r.sede_origen_id  = so.id
       JOIN sede sd ON r.sede_destino_id = sd.id
       LEFT JOIN usuario u   ON r.tipo = 'USUARIO' AND r.recurso_id = u.id
       LEFT JOIN unidad  un  ON r.tipo = 'UNIDAD'  AND r.recurso_id = un.id
       LEFT JOIN usuario ua  ON r.autorizado_por = ua.id
       WHERE r.estado = 'ACTIVA'
         ${tipo ? `AND r.tipo = '${tipo}'` : ''}
       ORDER BY r.created_at DESC`
    );
  },

  async getById(id: number): Promise<any | null> {
    return db.oneOrNone('SELECT * FROM reasignacion_sede WHERE id = $1', [id]);
  },

  async crear(data: CreateReasignacionData): Promise<any> {
    return db.one(
      `INSERT INTO reasignacion_sede
         (tipo, recurso_id, sede_origen_id, sede_destino_id,
          fecha_inicio, fecha_fin, es_permanente, motivo, autorizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        data.tipo,
        data.recurso_id,
        data.sede_origen_id,
        data.sede_destino_id,
        data.fecha_inicio,
        data.fecha_fin ?? null,
        data.es_permanente,
        data.motivo ?? null,
        data.autorizado_por,
      ]
    );
  },

  async finalizar(id: number): Promise<any> {
    return db.one(
      `UPDATE reasignacion_sede
       SET estado = 'FINALIZADA', fecha_fin = CURRENT_DATE, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
  },

  async cancelar(id: number): Promise<any> {
    return db.one(
      `UPDATE reasignacion_sede
       SET estado = 'CANCELADA', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
  },

  async tieneRolEnSalidaActiva(usuarioId: number): Promise<boolean> {
    const result = await db.oneOrNone(
      `SELECT id FROM salida_unidad
       WHERE estado = 'EN_SALIDA'
         AND tripulacion @> jsonb_build_array(jsonb_build_object('usuario_id', $1::int))
       LIMIT 1`,
      [usuarioId]
    );
    return result !== null;
  },

  async tieneUnidadEnSalidaActiva(unidadId: number): Promise<boolean> {
    const result = await db.oneOrNone(
      `SELECT id FROM salida_unidad WHERE unidad_id = $1 AND estado = 'EN_SALIDA' LIMIT 1`,
      [unidadId]
    );
    return result !== null;
  },

  async tieneReasignacionActiva(tipo: 'USUARIO' | 'UNIDAD', recursoId: number): Promise<boolean> {
    const result = await db.oneOrNone(
      `SELECT id FROM reasignacion_sede
       WHERE tipo = $1 AND recurso_id = $2 AND estado = 'ACTIVA'
       LIMIT 1`,
      [tipo, recursoId]
    );
    return result !== null;
  },
};
