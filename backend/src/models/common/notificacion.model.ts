import { db } from '../../config/database';

export const NotificacionModel = {
  async listar(userId: number, soloNoLeidas: boolean, limite: number, offset: number): Promise<any[]> {
    let query = `
      SELECT id, tipo, titulo, mensaje, datos, leida, created_at
      FROM notificacion
      WHERE usuario_id = $1
    `;
    if (soloNoLeidas) query += ` AND leida = FALSE`;
    query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
    return db.any(query, [userId, limite, offset]);
  },

  async conteoNoLeidas(userId: number): Promise<number> {
    const row = await db.one(
      `SELECT COUNT(*) AS total FROM notificacion WHERE usuario_id = $1 AND leida = FALSE`,
      [userId]
    );
    return parseInt(row.total, 10);
  },

  async marcarTodasLeidas(userId: number): Promise<void> {
    await db.none(
      `UPDATE notificacion SET leida = TRUE WHERE usuario_id = $1 AND leida = FALSE`,
      [userId]
    );
  },
};
