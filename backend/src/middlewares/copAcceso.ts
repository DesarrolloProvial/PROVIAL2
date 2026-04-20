import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';

/**
 * Verifica si el usuario COP tiene permiso para gestionar accesos.
 * Pasan: ADMIN_COP (sub-rol permanente) | usuarios con delegación activa | ADMIN/SUPER_ADMIN globales
 */
export async function canGestionarAcceso(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;

    // ADMIN/SUPER_ADMIN globales siempre pasan (auth.ts ya les da bypass,
    // pero lo dejamos explícito por claridad)
    if (user.rol === 'ADMIN' || user.rol === 'SUPER_ADMIN') return next();

    // Solo aplica a usuarios COP
    if (user.rol !== 'COP') {
      return res.status(403).json({
        error: 'Solo usuarios COP o Administradores pueden gestionar accesos',
      });
    }

    // Caso 1: tiene sub-rol ADMIN_COP de forma permanente
    if (user.sub_rol_cop_codigo === 'ADMIN_COP') return next();

    // Caso 2: tiene una delegación activa en la tabla delegacion_permiso_cop
    const delegacion = await db.oneOrNone(
      `SELECT id FROM delegacion_permiso_cop
       WHERE otorgado_a = $1
         AND activo = true
         AND permiso = 'GESTIONAR_ACCESO'`,
      [user.userId]
    );

    if (delegacion) return next();

    return res.status(403).json({
      error: 'No tiene permiso para gestionar accesos. Solicite delegación al Administrador COP de turno.',
    });
  } catch (error) {
    console.error('Error en canGestionarAcceso middleware:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Verifica si el usuario actual es ADMIN_COP (puede delegar permisos).
 * Solo el ADMIN_COP real (no delegado) puede otorgar/revocar delegaciones.
 */
export function isAdminCop(req: Request, res: Response, next: NextFunction) {
  const user = req.user!;

  if (user.rol === 'ADMIN' || user.rol === 'SUPER_ADMIN') return next();

  if (user.rol === 'COP' && user.sub_rol_cop_codigo === 'ADMIN_COP') return next();

  return res.status(403).json({
    error: 'Solo el Administrador COP puede otorgar o revocar delegaciones',
  });
}
