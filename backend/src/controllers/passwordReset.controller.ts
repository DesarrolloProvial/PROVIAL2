import { Request, Response } from 'express';
import pool from '../config/database';
import bcrypt from 'bcryptjs';

// =====================================================
// CONTROLADOR DE RESTABLECIMIENTO DE CONTRASEÑA
// =====================================================

/**
 * Habilitar reset de contraseña para un usuario (Admin)
 * POST /api/admin/usuarios/:id/habilitar-reset-password
 */
export const habilitarResetPassword = async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = (req as any).user?.id;

  try {
    // Verificar que el usuario existe
    const userCheck = await pool.query(
      'SELECT id, username, nombre_completo FROM usuario WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = userCheck.rows[0];

    // Habilitar el reset
    await pool.query(`
      UPDATE usuario SET
        password_reset_required = TRUE,
        password_reset_by = $1,
        password_reset_enabled_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [adminId, id]);

    // Registrar en el log
    await pool.query(`
      INSERT INTO password_reset_log (usuario_id, habilitado_por, fecha_habilitacion)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
    `, [id, adminId]);

    res.json({
      success: true,
      message: `Reset de contraseña habilitado para ${usuario.nombre_completo || usuario.username}`,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre_completo
      }
    });
  } catch (error) {
    console.error('Error al habilitar reset:', error);
    res.status(500).json({ error: 'Error al habilitar reset de contraseña' });
  }
};

/**
 * Deshabilitar reset de contraseña (Admin)
 * DELETE /api/admin/usuarios/:id/habilitar-reset-password
 */
export const deshabilitarResetPassword = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await pool.query(`
      UPDATE usuario SET
        password_reset_required = FALSE,
        password_reset_by = NULL,
        password_reset_enabled_at = NULL
      WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'Reset de contraseña deshabilitado'
    });
  } catch (error) {
    console.error('Error al deshabilitar reset:', error);
    res.status(500).json({ error: 'Error al deshabilitar reset de contraseña' });
  }
};

/**
 * Verificar si un usuario necesita reset de contraseña (público)
 * POST /api/auth/verificar-reset
 */
export const verificarNecesitaReset = async (req: Request, res: Response) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username requerido' });
  }

  try {
    const result = await pool.query(`
      SELECT id, password_reset_required, chapa
      FROM usuario u
      LEFT JOIN brigada b ON b.usuario_id = u.id
      WHERE u.username = $1 AND u.activo = TRUE
    `, [username]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = result.rows[0];

    res.json({
      necesita_reset: usuario.password_reset_required || false,
      tiene_chapa: !!usuario.chapa
    });
  } catch (error) {
    console.error('Error al verificar reset:', error);
    res.status(500).json({ error: 'Error al verificar estado de contraseña' });
  }
};

/**
 * Completar reset de contraseña (usuario desde app móvil)
 * POST /api/auth/completar-reset
 */
export const completarResetPassword = async (req: Request, res: Response) => {
  const { username, chapa, nueva_password } = req.body;

  if (!username || !nueva_password) {
    return res.status(400).json({ error: 'Username y nueva contraseña son requeridos' });
  }

  if (nueva_password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    // Buscar usuario con verificación de chapa
    const result = await pool.query(`
      SELECT u.id, u.username, u.password_reset_required, b.chapa
      FROM usuario u
      LEFT JOIN brigada b ON b.usuario_id = u.id
      WHERE u.username = $1 AND u.activo = TRUE
    `, [username]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = result.rows[0];

    // Verificar que tiene reset habilitado
    if (!usuario.password_reset_required) {
      return res.status(400).json({ error: 'No tienes un reset de contraseña pendiente' });
    }

    // Verificar chapa si el usuario tiene una
    if (usuario.chapa && chapa !== usuario.chapa) {
      return res.status(400).json({ error: 'La chapa no coincide' });
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(nueva_password, 10);

    // Actualizar contraseña y limpiar flags de reset
    await pool.query(`
      UPDATE usuario SET
        password_hash = $1,
        password_reset_required = FALSE,
        password_reset_by = NULL,
        password_reset_enabled_at = NULL,
        password_last_reset = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [hashedPassword, usuario.id]);

    // Actualizar el log
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    await pool.query(`
      UPDATE password_reset_log
      SET fecha_completado = CURRENT_TIMESTAMP, ip_completado = $1
      WHERE usuario_id = $2 AND fecha_completado IS NULL
      ORDER BY fecha_habilitacion DESC
      LIMIT 1
    `, [ip, usuario.id]);

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.'
    });
  } catch (error) {
    console.error('Error al completar reset:', error);
    res.status(500).json({ error: 'Error al actualizar contraseña' });
  }
};

/**
 * Obtener usuarios con reset pendiente (Admin)
 * GET /api/admin/usuarios/reset-pendiente
 */
export const getUsuariosConResetPendiente = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.nombre_completo,
        b.chapa,
        s.nombre as sede_nombre,
        r.nombre as rol_nombre,
        u.password_reset_enabled_at,
        admin.nombre_completo as habilitado_por_nombre
      FROM usuario u
      LEFT JOIN brigada b ON b.usuario_id = u.id
      LEFT JOIN sede s ON u.sede_id = s.id
      LEFT JOIN rol r ON u.rol_id = r.id
      LEFT JOIN usuario admin ON u.password_reset_by = admin.id
      WHERE u.password_reset_required = TRUE
      ORDER BY u.password_reset_enabled_at DESC
    `);

    res.json({
      total: result.rows.length,
      usuarios: result.rows
    });
  } catch (error) {
    console.error('Error al obtener usuarios con reset:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

/**
 * Historial de resets de un usuario (Admin)
 * GET /api/admin/usuarios/:id/historial-reset
 */
export const getHistorialReset = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT
        prl.id,
        prl.fecha_habilitacion,
        prl.fecha_completado,
        prl.ip_completado,
        prl.metodo,
        admin.nombre_completo as habilitado_por
      FROM password_reset_log prl
      LEFT JOIN usuario admin ON prl.habilitado_por = admin.id
      WHERE prl.usuario_id = $1
      ORDER BY prl.fecha_habilitacion DESC
      LIMIT 20
    `, [id]);

    res.json({
      total: result.rows.length,
      historial: result.rows
    });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};
