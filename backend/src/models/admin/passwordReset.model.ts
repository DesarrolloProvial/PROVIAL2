import { db } from '../../config/database';

export const PasswordResetModel = {
  async getUsuarioById(id: number): Promise<any | null> {
    return db.oneOrNone(
      'SELECT id, username, nombre_completo FROM usuario WHERE id = $1',
      [id]
    );
  },

  async habilitarReset(usuarioId: number, adminId: number): Promise<void> {
    return db.tx(async t => {
      await t.none(`
        UPDATE usuario SET
          password_reset_required = TRUE,
          password_reset_by = $1,
          password_reset_enabled_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [adminId, usuarioId]);

      await t.none(`
        INSERT INTO password_reset_log (usuario_id, habilitado_por, fecha_habilitacion)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
      `, [usuarioId, adminId]);
    });
  },

  async deshabilitarReset(usuarioId: number): Promise<void> {
    return db.none(`
      UPDATE usuario SET
        password_reset_required = FALSE,
        password_reset_by = NULL,
        password_reset_enabled_at = NULL
      WHERE id = $1
    `, [usuarioId]);
  },

  async getUsuarioPorUsername(username: string): Promise<any | null> {
    return db.oneOrNone(
      'SELECT id, password_reset_required, chapa FROM usuario WHERE username = $1 AND activo = TRUE',
      [username]
    );
  },

  async getUsuarioParaReset(username: string): Promise<any | null> {
    return db.oneOrNone(
      'SELECT id, username, password_reset_required, chapa FROM usuario WHERE username = $1 AND activo = TRUE',
      [username]
    );
  },

  async completarReset(usuarioId: number, hashedPassword: string, ip: string): Promise<void> {
    return db.tx(async t => {
      await t.none(`
        UPDATE usuario SET
          password_hash = $1,
          password_reset_required = FALSE,
          password_reset_by = NULL,
          password_reset_enabled_at = NULL,
          password_last_reset = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [hashedPassword, usuarioId]);

      await t.none(`
        UPDATE password_reset_log
        SET fecha_completado = CURRENT_TIMESTAMP, ip_completado = $1
        WHERE id = (
          SELECT id FROM password_reset_log
          WHERE usuario_id = $2 AND fecha_completado IS NULL
          ORDER BY fecha_habilitacion DESC
          LIMIT 1
        )
      `, [ip, usuarioId]);
    });
  },

  async getUsuariosConResetPendiente(): Promise<any[]> {
    return db.any(`
      SELECT
        u.id, u.username, u.nombre_completo, u.chapa,
        s.nombre as sede_nombre,
        r.nombre as rol_nombre,
        u.password_reset_enabled_at,
        admin.nombre_completo as habilitado_por_nombre
      FROM usuario u
      LEFT JOIN sede s ON u.sede_id = s.id
      LEFT JOIN rol r ON u.rol_id = r.id
      LEFT JOIN usuario admin ON u.password_reset_by = admin.id
      WHERE u.password_reset_required = TRUE
      ORDER BY u.password_reset_enabled_at DESC
    `);
  },

  async getHistorialReset(usuarioId: number): Promise<any[]> {
    return db.any(`
      SELECT
        prl.id, prl.fecha_habilitacion, prl.fecha_completado,
        prl.ip_completado, prl.metodo,
        admin.nombre_completo as habilitado_por
      FROM password_reset_log prl
      LEFT JOIN usuario admin ON prl.habilitado_por = admin.id
      WHERE prl.usuario_id = $1
      ORDER BY prl.fecha_habilitacion DESC
      LIMIT 20
    `, [usuarioId]);
  },
};
