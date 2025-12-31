import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';

// Interfaz para sub-rol COP
export interface SubRolCop {
  id: number;
  codigo: string;
  nombre: string;
  puede_crear_persistentes: boolean;
  puede_cerrar_persistentes: boolean;
  puede_promover_situaciones: boolean;
  puede_asignar_unidades: boolean;
  puede_gestionar_usuarios: boolean;
  puede_gestionar_grupos: boolean;
  puede_ver_todos_departamentos: boolean;
  solo_lectura: boolean;
}

// Extender Request para incluir subRolCop
declare global {
  namespace Express {
    interface Request {
      subRolCop?: SubRolCop;
    }
  }
}

// Tipos de permisos disponibles
export type CopPermission =
  | 'puede_crear_persistentes'
  | 'puede_cerrar_persistentes'
  | 'puede_promover_situaciones'
  | 'puede_asignar_unidades';

/**
 * Middleware para autorizar acciones basadas en sub-rol COP
 *
 * @param requiredPermissions - Permisos requeridos (se necesitan TODOS)
 * @returns Middleware function
 *
 * @example
 * // Requiere permiso para crear persistentes
 * router.post('/crear', authenticate, authorizeCopSubRol('puede_crear_persistentes'), controller.crear);
 *
 * // Requiere permisos para crear Y cerrar
 * router.post('/gestionar', authenticate, authorizeCopSubRol('puede_crear_persistentes', 'puede_cerrar_persistentes'), controller.gestionar);
 */
export function authorizeCopSubRol(...requiredPermissions: CopPermission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      // ADMIN siempre tiene acceso total
      if (req.user.rol === 'ADMIN') {
        return next();
      }

      // Solo aplica a usuarios COP
      if (req.user.rol !== 'COP') {
        return res.status(403).json({
          error: 'Acceso denegado',
          message: 'Esta accion solo esta disponible para usuarios del COP',
        });
      }

      // Obtener sub-rol del usuario
      const subRol = await db.oneOrNone<SubRolCop>(`
        SELECT src.*
        FROM sub_rol_cop src
        JOIN usuario u ON u.sub_rol_cop_id = src.id
        WHERE u.id = $1 AND src.activo = TRUE
      `, [req.user.userId]);

      if (!subRol) {
        return res.status(403).json({
          error: 'Sin sub-rol asignado',
          message: 'Tu usuario COP no tiene un sub-rol configurado. Contacta al administrador.',
        });
      }

      // Verificar si es solo lectura
      if (subRol.solo_lectura && requiredPermissions.length > 0) {
        return res.status(403).json({
          error: 'Usuario de solo lectura',
          message: 'Tu rol de Operador solo permite visualizar informacion, no realizar acciones.',
        });
      }

      // Verificar permisos requeridos (todos deben cumplirse)
      for (const perm of requiredPermissions) {
        if (subRol[perm] !== true) {
          const permissionNames: Record<CopPermission, string> = {
            puede_crear_persistentes: 'crear situaciones persistentes',
            puede_cerrar_persistentes: 'cerrar situaciones persistentes',
            puede_promover_situaciones: 'promover situaciones a persistentes',
            puede_asignar_unidades: 'asignar unidades',
          };

          return res.status(403).json({
            error: 'Sin permisos suficientes',
            message: `Tu rol de ${subRol.nombre} no tiene permiso para ${permissionNames[perm]}.`,
            required_permission: perm,
          });
        }
      }

      // Agregar sub-rol a request para uso posterior
      req.subRolCop = subRol;
      return next();
    } catch (error) {
      console.error('Error en authorizeCopSubRol:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}

/**
 * Middleware para denegar acceso a usuarios de solo lectura
 * Usar despues de authorizeCopSubRol si ya se obtuvo el sub-rol
 */
export function denyReadOnly(req: Request, res: Response, next: NextFunction) {
  // ADMIN siempre tiene acceso
  if (req.user?.rol === 'ADMIN') {
    return next();
  }

  // No aplica si no es COP
  if (req.user?.rol !== 'COP') {
    return next();
  }

  const subRol = req.subRolCop;
  if (subRol?.solo_lectura) {
    return res.status(403).json({
      error: 'Usuario de solo lectura',
      message: 'Los operadores no pueden realizar esta accion.',
    });
  }

  return next();
}

/**
 * Middleware para verificar si el usuario puede ver situaciones persistentes
 * Todos los COP pueden ver, pero solo algunos pueden modificar
 */
export async function canViewPersistentes(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  // ADMIN, COP, OPERACIONES y MANDOS pueden ver
  const rolesPermitidos = ['ADMIN', 'COP', 'OPERACIONES', 'MANDOS'];

  if (!rolesPermitidos.includes(req.user.rol)) {
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'No tienes permisos para ver situaciones persistentes.',
    });
  }

  return next();
}

/**
 * Helper para obtener el sub-rol COP de un usuario
 * Util para obtener permisos sin middleware
 */
export async function getSubRolCop(userId: number): Promise<SubRolCop | null> {
  return db.oneOrNone<SubRolCop>(`
    SELECT src.*
    FROM sub_rol_cop src
    JOIN usuario u ON u.sub_rol_cop_id = src.id
    WHERE u.id = $1 AND src.activo = TRUE
  `, [userId]);
}

/**
 * Verifica si un usuario tiene un permiso especifico
 */
export async function userHasCopPermission(
  userId: number,
  rol: string,
  permission: CopPermission
): Promise<boolean> {
  // ADMIN siempre tiene permiso
  if (rol === 'ADMIN') return true;

  // No COP no tiene permisos COP
  if (rol !== 'COP') return false;

  const subRol = await getSubRolCop(userId);
  if (!subRol) return false;

  return subRol[permission] === true;
}
