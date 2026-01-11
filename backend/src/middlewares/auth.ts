import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';

// Extender Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Middleware de autenticación
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado: Token no proporcionado' });
  }

  const token = authHeader.substring(7); // Remover "Bearer "
  const payload = verifyAccessToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'No autorizado: Token inválido o expirado' });
  }

  req.user = payload;
  return next();
}

// Middleware de autorización por roles
// SUPER_ADMIN siempre tiene acceso a todo
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // SUPER_ADMIN siempre tiene acceso
    if (req.user.rol === 'SUPER_ADMIN') {
      return next();
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        error: 'Acceso denegado',
        mensaje: `Esta acción requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`,
      });
    }

    return next();
  };
}

// Middleware para verificar si puede editar situación
// Permite: COP, ADMIN, o miembros de la tripulación (si la situación es de hoy)
export async function canEditSituacion(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { id } = req.params;

    // Importar dinámicamente para evitar dependencias circulares
    const { SituacionModel } = await import('../models/situacion.model');
    const { TurnoModel } = await import('../models/turno.model');

    // Obtener la situación
    const situacion = await SituacionModel.getById(parseInt(id, 10));

    if (!situacion) {
      return res.status(404).json({ error: 'Situación no encontrada' });
    }

    // COP y ADMIN pueden editar cualquier situación
    if (req.user.rol === 'COP' || req.user.rol === 'ADMIN') {
      return next();
    }

    // Permitir si es el CREADOR de la situación (bypasea validación de tripulación estricta)
    if (situacion.creado_por === req.user.userId) {
      // Aún verificamos la fecha para evitar editar cosas muy viejas, pero somos más flexibles (24h)
      const now = new Date();
      const situacionTime = new Date(situacion.created_at);
      const diffHours = (now.getTime() - situacionTime.getTime()) / (1000 * 60 * 60);

      if (diffHours < 24) {
        return next();
      }
    }

    // Verificar si la situación fue creada hoy (no ha finalizado el día)
    // FIX: Usar comparación de fecha local o permitir margen de error para turnos nocturnos
    const today = new Date().toISOString().split('T')[0];
    const situacionDate = new Date(situacion.created_at).toISOString().split('T')[0];

    // Si no es el creador, mantenemos la restricción de día estricto o lo relajamos también?
    // Por seguridad, mantenemos estricto para otros miembros, pero si es creador ya pasó arriba.

    if (situacionDate !== today) {
      // Permitir si es turno nocturno (diferencia < 12 horas)
      const now = new Date();
      const situacionTime = new Date(situacion.created_at);
      const diffHours = (now.getTime() - situacionTime.getTime()) / (1000 * 60 * 60);

      if (diffHours > 12) {
        return res.status(403).json({
          error: 'No puedes editar situaciones de días anteriores',
        });
      }
    }

    // Verificar si el usuario es miembro de la tripulación
    const esMiembro = await TurnoModel.esMiembroTripulacion(req.user.userId, situacion.unidad_id);

    if (!esMiembro) {
      return res.status(403).json({
        error: 'No tienes permiso para editar esta situación',
        mensaje: 'Solo los miembros de la tripulación asignada pueden editar situaciones de su unidad',
      });
    }

    return next();
  } catch (error) {
    console.error('Error en canEditSituacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
