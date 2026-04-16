import { db } from '../../config/database';

export const DispositivoModel = {
  /**
   * Registra un dispositivo nuevo o actualiza su última actividad.
   * Retorna el estado actual del dispositivo (PENDIENTE / APROBADO / BLOQUEADO).
   */
  async registrarOActualizar(data: {
    device_id: string;
    usuario_id: number;
    device_model?: string;
    device_os?: string;
    device_os_version?: string;
    app_version?: string;
  }): Promise<{ id: number; estado: string }> {
    return db.one(
      `INSERT INTO dispositivo_autorizado
         (device_id, usuario_id, device_model, device_os, device_os_version, app_version, ultimo_acceso_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (device_id) DO UPDATE SET
         usuario_id        = EXCLUDED.usuario_id,
         device_model      = COALESCE(EXCLUDED.device_model,      dispositivo_autorizado.device_model),
         device_os         = COALESCE(EXCLUDED.device_os,         dispositivo_autorizado.device_os),
         device_os_version = COALESCE(EXCLUDED.device_os_version, dispositivo_autorizado.device_os_version),
         app_version       = COALESCE(EXCLUDED.app_version,       dispositivo_autorizado.app_version),
         ultimo_acceso_at  = NOW()
       RETURNING id, estado`,
      [
        data.device_id,
        data.usuario_id,
        data.device_model || null,
        data.device_os || null,
        data.device_os_version || null,
        data.app_version || null,
      ]
    );
  },

  /** Lista todos los dispositivos con info del usuario y del aprobador */
  async getAll(): Promise<any[]> {
    return db.manyOrNone(
      `SELECT
         da.id,
         da.device_id,
         da.device_model,
         da.device_os,
         da.device_os_version,
         da.app_version,
         da.estado,
         da.notas,
         da.created_at,
         da.ultimo_acceso_at,
         u.id            AS usuario_id,
         u.nombre_completo AS usuario_nombre,
         u.username      AS usuario_username,
         ap.nombre_completo AS aprobado_por_nombre
       FROM dispositivo_autorizado da
       LEFT JOIN usuario u  ON da.usuario_id   = u.id
       LEFT JOIN usuario ap ON da.aprobado_por  = ap.id
       ORDER BY
         CASE da.estado
           WHEN 'PENDIENTE' THEN 0
           WHEN 'APROBADO'  THEN 1
           WHEN 'BLOQUEADO' THEN 2
         END,
         da.ultimo_acceso_at DESC`
    );
  },

  /** Cambia el estado de un dispositivo (APROBADO / BLOQUEADO / PENDIENTE) */
  async updateEstado(
    id: number,
    estado: 'APROBADO' | 'BLOQUEADO' | 'PENDIENTE',
    aprobadoPor: number,
    notas?: string
  ): Promise<any> {
    return db.oneOrNone(
      `UPDATE dispositivo_autorizado
       SET estado       = $2,
           aprobado_por = $3,
           notas        = COALESCE($4, notas)
       WHERE id = $1
       RETURNING *`,
      [id, estado, aprobadoPor, notas || null]
    );
  },
};
