import { Request, Response } from 'express';
import { GrupoModel } from '../../models/operaciones/grupo.model';
import { db } from '../../config/database';
import { normalizeId } from '../../utils/db.utils';

async function verificarJurisdiccionSede(
  targetUserId: number,
  operadorRole: string,
  operadorSedeId: number | undefined
): Promise<boolean> {
  if (operadorRole === 'ADMIN' || operadorRole === 'SUPER_ADMIN') return true;
  if (!operadorSedeId) return false;

  const target = await db.oneOrNone<{ sede_id: number }>(
    'SELECT sede_id FROM usuario WHERE id = $1',
    [targetUserId]
  );
  return target?.sede_id === operadorSedeId;
}

// ========================================
// CONSULTA DE ACCESO
// ========================================

export async function verificarAccesoApp(req: Request, res: Response) {
  try {
    const usuarioId = normalizeId(req.params.usuario_id);
    if (!usuarioId) return res.status(400).json({ error: 'ID de usuario inválido' });

    const resultado = await GrupoModel.verificarAccesoApp(usuarioId);
    return res.json(resultado);
  } catch (error) {
    console.error('Error en verificarAccesoApp:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// BRIGADAS
// ========================================

export async function getBrigadasActivas(_req: Request, res: Response) {
  try {
    const brigadas = await GrupoModel.getBrigadasActivas();
    return res.json({ total: brigadas.length, brigadas });
  } catch (error) {
    console.error('Error en getBrigadasActivas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getBrigadasPorGrupo(req: Request, res: Response) {
  try {
    const grupoId = normalizeId(req.params.grupo);
    if (!grupoId) return res.status(400).json({ error: 'ID de grupo inválido' });

    const brigadas = await GrupoModel.getBrigadasPorGrupo(grupoId);
    return res.json({ grupo: grupoId, total: brigadas.length, brigadas });
  } catch (error) {
    console.error('Error en getBrigadasPorGrupo:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// GESTIÓN DE ACCESO INDIVIDUAL
// ========================================

export async function toggleAccesoIndividual(req: Request, res: Response) {
  try {
    const usuarioId = normalizeId(req.params.usuario_id);
    if (!usuarioId) return res.status(400).json({ error: 'ID de usuario inválido' });

    const { acceso_app_activo, motivo } = req.body;

    if (!motivo || motivo.trim() === '') {
      return res.status(400).json({ error: 'El motivo es requerido para cambiar el acceso' });
    }

    const operador = req.user!;
    const tieneJurisdiccion = await verificarJurisdiccionSede(usuarioId, operador.rol, operador.sede);
    if (!tieneJurisdiccion) {
      return res.status(403).json({ error: 'No tiene permiso para modificar usuarios de otra sede' });
    }

    const usuarioActualizado = await GrupoModel.toggleAccesoIndividual(
      usuarioId,
      acceso_app_activo,
      motivo,
      operador.userId
    );

    return res.json({
      message: acceso_app_activo ? 'Acceso activado' : 'Acceso suspendido',
      usuario: usuarioActualizado,
    });
  } catch (error) {
    console.error('toggleAccesoIndividual:', error);

    if ((error as any).message?.includes('tiene asignación activa')) {
      return res.status(400).json({ error: (error as any).message });
    }

    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// DELEGACIONES DE PERMISO
// ========================================

export async function listarDelegaciones(_req: Request, res: Response) {
  try {
    const delegaciones = await db.any(`
      SELECT
        d.id,
        d.permiso,
        d.activo,
        d.created_at,
        d.revocado_en,
        ua.id          AS otorgado_a_id,
        ua.nombre_completo AS otorgado_a_nombre,
        ub.id          AS otorgado_por_id,
        ub.nombre_completo AS otorgado_por_nombre,
        ur.nombre_completo AS revocado_por_nombre
      FROM delegacion_permiso_cop d
      JOIN usuario ua ON d.otorgado_a   = ua.id
      JOIN usuario ub ON d.otorgado_por = ub.id
      LEFT JOIN usuario ur ON d.revocado_por = ur.id
      ORDER BY d.activo DESC, d.created_at DESC
    `);
    return res.json({ total: delegaciones.length, delegaciones });
  } catch (error) {
    console.error('Error en listarDelegaciones:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function otorgarDelegacion(req: Request, res: Response) {
  try {
    const { usuario_id, permiso = 'GESTIONAR_ACCESO' } = req.body;

    const targetId = normalizeId(usuario_id);
    if (!targetId) return res.status(400).json({ error: 'usuario_id inválido' });

    // Verificar que el destinatario sea COP
    const target = await db.oneOrNone<{ rol: string; nombre_completo: string }>(
      `SELECT u.nombre_completo, r.codigo AS rol
       FROM usuario u JOIN rol r ON u.rol_id = r.id
       WHERE u.id = $1`,
      [targetId]
    );

    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (target.rol !== 'COP') {
      return res.status(400).json({ error: 'Solo se puede delegar acceso a usuarios COP' });
    }

    // Evitar duplicados activos
    const existente = await db.oneOrNone(
      `SELECT id FROM delegacion_permiso_cop
       WHERE otorgado_a = $1 AND permiso = $2 AND activo = true`,
      [targetId, permiso]
    );
    if (existente) {
      return res.status(409).json({ error: 'Este usuario ya tiene una delegación activa para este permiso' });
    }

    const delegacion = await db.one(
      `INSERT INTO delegacion_permiso_cop (otorgado_a, otorgado_por, permiso)
       VALUES ($1, $2, $3)
       RETURNING id, otorgado_a, otorgado_por, permiso, activo, created_at`,
      [targetId, req.user!.userId, permiso]
    );

    return res.status(201).json({
      message: `Delegación otorgada a ${target.nombre_completo}`,
      delegacion,
    });
  } catch (error) {
    console.error('Error en otorgarDelegacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function revocarDelegacion(req: Request, res: Response) {
  try {
    const delegacionId = normalizeId(req.params.id);
    if (!delegacionId) return res.status(400).json({ error: 'ID de delegación inválido' });

    const delegacion = await db.oneOrNone(
      `SELECT id, activo FROM delegacion_permiso_cop WHERE id = $1`,
      [delegacionId]
    );

    if (!delegacion) return res.status(404).json({ error: 'Delegación no encontrada' });
    if (!delegacion.activo) return res.status(400).json({ error: 'La delegación ya está revocada' });

    await db.none(
      `UPDATE delegacion_permiso_cop
       SET activo = false, revocado_en = NOW(), revocado_por = $2
       WHERE id = $1`,
      [delegacionId, req.user!.userId]
    );

    return res.json({ message: 'Delegación revocada exitosamente' });
  } catch (error) {
    console.error('Error en revocarDelegacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
