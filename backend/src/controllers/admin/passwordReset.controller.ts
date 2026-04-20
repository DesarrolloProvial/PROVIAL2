import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PasswordResetModel } from '../../models/admin/passwordReset.model';
import { normalizeId } from '../../utils/db.utils';

export const habilitarResetPassword = async (req: Request, res: Response) => {
  const id = normalizeId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  const adminId = req.user!.userId;

  try {
    const usuario = await PasswordResetModel.getUsuarioById(id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    await PasswordResetModel.habilitarReset(id, adminId);

    return res.json({
      success: true,
      message: `Reset de contraseña habilitado para ${usuario.nombre_completo || usuario.username}`,
      usuario: { id: usuario.id, username: usuario.username, nombre: usuario.nombre_completo }
    });
  } catch (error) {
    console.error('Error al habilitar reset:', error);
    return res.status(500).json({ error: 'Error al habilitar reset de contraseña' });
  }
};

export const deshabilitarResetPassword = async (req: Request, res: Response) => {
  const id = normalizeId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });

  try {
    await PasswordResetModel.deshabilitarReset(id);
    return res.json({ success: true, message: 'Reset de contraseña deshabilitado' });
  } catch (error) {
    console.error('Error al deshabilitar reset:', error);
    return res.status(500).json({ error: 'Error al deshabilitar reset de contraseña' });
  }
};

export const verificarNecesitaReset = async (req: Request, res: Response) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username requerido' });

  try {
    const usuario = await PasswordResetModel.getUsuarioPorUsername(username);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    return res.json({
      necesita_reset: usuario.password_reset_required || false,
      tiene_chapa: !!usuario.chapa
    });
  } catch (error) {
    console.error('Error al verificar reset:', error);
    return res.status(500).json({ error: 'Error al verificar estado de contraseña' });
  }
};

export const completarResetPassword = async (req: Request, res: Response) => {
  const { username, chapa, nueva_password } = req.body;
  if (!username || !nueva_password) return res.status(400).json({ error: 'Username y nueva contraseña son requeridos' });
  if (nueva_password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  try {
    const usuario = await PasswordResetModel.getUsuarioParaReset(username);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (!usuario.password_reset_required) return res.status(400).json({ error: 'No tienes un reset de contraseña pendiente' });
    if (usuario.chapa && chapa !== usuario.chapa) return res.status(400).json({ error: 'La chapa no coincide' });

    const hashedPassword = await bcrypt.hash(nueva_password, 10);
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';

    await PasswordResetModel.completarReset(usuario.id, hashedPassword, ip);

    return res.json({ success: true, message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error al completar reset:', error);
    return res.status(500).json({ error: 'Error al actualizar contraseña' });
  }
};

export const getUsuariosConResetPendiente = async (_req: Request, res: Response) => {
  try {
    const usuarios = await PasswordResetModel.getUsuariosConResetPendiente();
    return res.json({ total: usuarios.length, usuarios });
  } catch (error) {
    console.error('Error al obtener usuarios con reset:', error);
    return res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

export const getHistorialReset = async (req: Request, res: Response) => {
  const id = normalizeId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });

  try {
    const historial = await PasswordResetModel.getHistorialReset(id);
    return res.json({ total: historial.length, historial });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return res.status(500).json({ error: 'Error al obtener historial' });
  }
};
