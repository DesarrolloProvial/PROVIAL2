import { Request, Response, NextFunction } from 'express';
import { getSubRolCop } from './subRolCop';

/**
 * Middleware que requiere rol SUPER_ADMIN
 * Solo permite acceso a usuarios con rol SUPER_ADMIN
 */
export function authorizeSuperAdmin() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    if (req.user.rol !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'Esta funcion requiere permisos de Super Administrador'
      });
    }

    return next();
  };
}

/**
 * Middleware que permite acceso a SUPER_ADMIN, ADMIN, o COP con sub-rol ADMIN_COP
 * Usado para funciones administrativas que pueden ser realizadas por varios roles
 */
export function authorizeAdminOrSuperAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const rolesPermitidos = ['SUPER_ADMIN', 'ADMIN'];

    // SUPER_ADMIN y ADMIN tienen acceso directo
    if (rolesPermitidos.includes(req.user.rol)) {
      return next();
    }

    // COP con sub-rol ADMIN_COP tambien tiene acceso
    if (req.user.rol === 'COP') {
      try {
        const subRol = await getSubRolCop(req.user.userId);
        if (subRol && subRol.codigo === 'ADMIN_COP') {
          req.subRolCop = subRol;
          return next();
        }
      } catch {
        // Error al obtener sub-rol, denegar acceso
      }
    }

    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'No tienes permisos para realizar esta accion'
    });
  };
}

/**
 * Middleware que permite acceso a SUPER_ADMIN, ADMIN, o COP con permisos de gestion
 * Usado para gestionar usuarios y grupos
 */
export function authorizeGestionUsuarios() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // SUPER_ADMIN y ADMIN tienen acceso total
    if (['SUPER_ADMIN', 'ADMIN'].includes(req.user.rol)) {
      return next();
    }

    // COP con permiso puede_gestionar_usuarios
    if (req.user.rol === 'COP') {
      try {
        const subRol = await getSubRolCop(req.user.userId);
        if (subRol && subRol.puede_gestionar_usuarios) {
          req.subRolCop = subRol;
          return next();
        }
      } catch {
        // Error al obtener sub-rol
      }
    }

    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'No tienes permisos para gestionar usuarios'
    });
  };
}

/**
 * Middleware que permite acceso a SUPER_ADMIN, ADMIN, o COP con permisos de grupos
 * Usado para activar/desactivar grupos
 */
export function authorizeGestionGrupos() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // SUPER_ADMIN y ADMIN tienen acceso total
    if (['SUPER_ADMIN', 'ADMIN'].includes(req.user.rol)) {
      return next();
    }

    // COP con permiso puede_gestionar_grupos
    if (req.user.rol === 'COP') {
      try {
        const subRol = await getSubRolCop(req.user.userId);
        if (subRol && subRol.puede_gestionar_grupos) {
          req.subRolCop = subRol;
          return next();
        }
      } catch {
        // Error al obtener sub-rol
      }
    }

    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'No tienes permisos para gestionar grupos'
    });
  };
}

/**
 * Verifica si el usuario puede ver todos los departamentos
 * SUPER_ADMIN y ADMIN pueden, COP solo si tiene el permiso
 */
export async function puedeVerTodosDepartamentos(req: Request): Promise<boolean> {
  if (!req.user) return false;

  if (['SUPER_ADMIN', 'ADMIN'].includes(req.user.rol)) {
    return true;
  }

  if (req.user.rol === 'COP') {
    try {
      const subRol = req.subRolCop || await getSubRolCop(req.user.userId);
      return subRol?.puede_ver_todos_departamentos === true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Verifica si el usuario es SUPER_ADMIN
 */
export function esSuperAdmin(req: Request): boolean {
  return req.user?.rol === 'SUPER_ADMIN';
}

/**
 * Verifica si el usuario tiene permisos administrativos
 * (SUPER_ADMIN, ADMIN, o COP con ADMIN_COP)
 */
export async function esAdministrador(req: Request): Promise<boolean> {
  if (!req.user) return false;

  if (['SUPER_ADMIN', 'ADMIN'].includes(req.user.rol)) {
    return true;
  }

  if (req.user.rol === 'COP') {
    try {
      const subRol = req.subRolCop || await getSubRolCop(req.user.userId);
      return subRol?.codigo === 'ADMIN_COP';
    } catch {
      return false;
    }
  }

  return false;
}
