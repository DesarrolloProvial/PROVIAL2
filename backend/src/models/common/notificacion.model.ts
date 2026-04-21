import { db } from '../../config/database';

export interface GuardarNotificacionData {
  usuarioId?: number | null;
  tipo: string;
  titulo: string;
  mensaje: string;
  datos?: Record<string, any>;
}

export const NotificacionModel = {
  // ── Tokens de dispositivo ──────────────────────────────────────────────

  async registrarToken(
    usuarioId: number,
    fcmToken: string,
    plataforma: 'ios' | 'android' | 'web',
    modeloDispositivo?: string,
    versionApp?: string,
  ): Promise<void> {
    await db.none(`
      INSERT INTO dispositivo_push (usuario_id, push_token, plataforma, modelo_dispositivo, version_app)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (usuario_id, push_token) DO UPDATE SET
        plataforma = EXCLUDED.plataforma,
        modelo_dispositivo = EXCLUDED.modelo_dispositivo,
        version_app = EXCLUDED.version_app,
        activo = TRUE,
        ultimo_uso = NOW(),
        updated_at = NOW()
    `, [usuarioId, fcmToken, plataforma, modeloDispositivo, versionApp]);
  },

  async desactivarToken(fcmToken: string): Promise<void> {
    await db.none(
      `UPDATE dispositivo_push SET activo = FALSE, updated_at = NOW() WHERE push_token = $1`,
      [fcmToken],
    );
  },

  async obtenerTokensUsuario(usuarioId: number): Promise<string[]> {
    const rows = await db.any<{ push_token: string }>(
      `SELECT push_token FROM dispositivo_push WHERE usuario_id = $1 AND activo = TRUE`,
      [usuarioId],
    );
    return rows.map(r => r.push_token);
  },

  async obtenerTokensTripulacion(salidaId: number): Promise<Array<{
    usuarioId: number;
    fcmToken: string;
    nombreCompleto: string;
  }>> {
    const rows = await db.any<{
      usuario_id: number;
      push_token: string;
      nombre_completo: string;
    }>(`
      SELECT DISTINCT u.id AS usuario_id, d.push_token, u.nombre_completo
      FROM salida_unidad su
      JOIN asignacion_unidad au ON su.id = au.salida_id OR (au.unidad_id = su.unidad_id AND au.fecha = CURRENT_DATE)
      JOIN tripulacion_turno tt ON au.id = tt.asignacion_id
      JOIN usuario u ON tt.usuario_id = u.id
      JOIN dispositivo_push d ON u.id = d.usuario_id AND d.activo = TRUE
      WHERE su.id = $1
    `, [salidaId]);

    return rows
      .map(r => ({ usuarioId: r.usuario_id, fcmToken: r.push_token, nombreCompleto: r.nombre_completo }))
      .filter(t => t.fcmToken);
  },

  async obtenerUsuariosPorRol(rol: string, sedeId?: number): Promise<number[]> {
    const rows = await db.any<{ id: number }>(`
      SELECT DISTINCT u.id
      FROM usuario u
      JOIN dispositivo_push d ON u.id = d.usuario_id AND d.activo = TRUE
      WHERE u.rol = $1 AND u.activo = TRUE
      ${sedeId ? 'AND (u.sede_id = $2 OR u.puede_ver_todas_sedes = TRUE)' : ''}
    `, sedeId ? [rol, sedeId] : [rol]);
    return rows.map(r => r.id);
  },

  // ── Historial de notificaciones ────────────────────────────────────────

  async guardarNotificacion(
    data: GuardarNotificacionData,
    enviada: boolean,
    error?: string | null,
  ): Promise<void> {
    try {
      await db.none(`
        INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje, datos, enviada, error)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        data.usuarioId ?? null,
        data.tipo,
        data.titulo,
        data.mensaje,
        data.datos ? JSON.stringify(data.datos) : null,
        enviada,
        error ?? null,
      ]);
    } catch (err) {
      console.error('Error guardando notificación:', err);
    }
  },

  async marcarLeida(notificacionId: number, usuarioId: number): Promise<void> {
    await db.none(
      `UPDATE notificacion SET leida = TRUE WHERE id = $1 AND usuario_id = $2`,
      [notificacionId, usuarioId],
    );
  },

  async marcarTodasLeidas(userId: number): Promise<void> {
    await db.none(
      `UPDATE notificacion SET leida = TRUE WHERE usuario_id = $1 AND leida = FALSE`,
      [userId],
    );
  },

  async listar(userId: number, soloNoLeidas: boolean, limite: number, offset: number): Promise<any[]> {
    let query = `
      SELECT id, tipo, titulo, mensaje, datos, leida, created_at
      FROM notificacion WHERE usuario_id = $1
    `;
    if (soloNoLeidas) query += ` AND leida = FALSE`;
    query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
    return db.any(query, [userId, limite, offset]);
  },

  async conteoNoLeidas(userId: number): Promise<number> {
    const row = await db.one<{ total: string }>(
      `SELECT COUNT(*) AS total FROM notificacion WHERE usuario_id = $1 AND leida = FALSE`,
      [userId],
    );
    return parseInt(row.total, 10);
  },
};
