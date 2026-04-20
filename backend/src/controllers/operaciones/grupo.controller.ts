import { Request, Response } from 'express';
import { GrupoModel } from '../../models/operaciones/grupo.model';
import { db } from '../../config/database';

// ========================================
// UTILIDADES INTERNAS
// ========================================

/** Parsea un ID de string, retorna null si no es un entero positivo válido */
function normalizeId(value: any): number | null {
  const n = parseInt(value, 10);
  return !isNaN(n) && n > 0 ? n : null;
}

/** Parsea una fecha de string, retorna null si es inválida */
function parseDate(value: any): Date | null {
  if (!value) return null;
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? null : d;
}

/** Verifica que el usuario objetivo pertenezca a la misma sede del operador (o que sea ADMIN) */
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
// OBTENER ESTADO DE GRUPOS HOY
// ========================================

export async function getEstadoGruposHoy(_req: Request, res: Response) {
  try {
    const estadoGrupos = await GrupoModel.getEstadoGruposHoy();
    return res.json({
      fecha: new Date().toISOString().split('T')[0],
      grupos: estadoGrupos,
    });
  } catch (error) {
    console.error('Error en getEstadoGruposHoy:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER ESTADO DE UN GRUPO ESPECÍFICO
// ========================================

export async function getEstadoGrupo(req: Request, res: Response) {
  try {
    const grupoId = normalizeId(req.params.grupo);
    if (!grupoId) return res.status(400).json({ error: 'ID de grupo inválido' });

    const fechaConsulta = parseDate(req.query.fecha) ?? new Date();

    const estadoGrupo = await GrupoModel.getEstadoGrupo(grupoId, fechaConsulta);

    if (!estadoGrupo) {
      return res.status(404).json({
        error: 'No se encontró información del grupo para la fecha indicada',
      });
    }

    return res.json({ grupo: estadoGrupo });
  } catch (error) {
    console.error('Error en getEstadoGrupo:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER CALENDARIO DE UN GRUPO
// ========================================

export async function getCalendarioGrupo(req: Request, res: Response) {
  try {
    const grupoId = normalizeId(req.params.grupo);
    if (!grupoId) return res.status(400).json({ error: 'ID de grupo inválido' });

    const fechaInicio = parseDate(req.query.fecha_inicio);
    const fechaFin = parseDate(req.query.fecha_fin);

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Se requieren fecha_inicio y fecha_fin válidas' });
    }

    const calendario = await GrupoModel.getCalendarioGrupo(grupoId, fechaInicio, fechaFin);

    return res.json({
      grupo: grupoId,
      fecha_inicio: req.query.fecha_inicio,
      fecha_fin: req.query.fecha_fin,
      calendario,
    });
  } catch (error) {
    console.error('Error en getCalendarioGrupo:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// ESTABLECER ESTADO DE GRUPO (MANUAL)
// ========================================

export async function setEstadoGrupo(req: Request, res: Response) {
  try {
    const grupoId = normalizeId(req.params.grupo);
    if (!grupoId) return res.status(400).json({ error: 'ID de grupo inválido' });

    const { fecha_inicio, fecha_fin, estado, observaciones } = req.body;

    if (!fecha_inicio || !estado) {
      return res.status(400).json({ error: 'fecha_inicio y estado son requeridos' });
    }

    const inicio = parseDate(fecha_inicio);
    const fin = fecha_fin ? parseDate(fecha_fin) : parseDate(fecha_inicio);

    if (!inicio || !fin) {
      return res.status(400).json({ error: 'Fechas inválidas' });
    }

    if (estado !== 'TRABAJO' && estado !== 'DESCANSO') {
      return res.status(400).json({ error: 'El estado debe ser TRABAJO o DESCANSO' });
    }

    await GrupoModel.setEstadoGrupoRango(grupoId, inicio, fin, estado, observaciones);

    return res.json({
      message: 'Estado del grupo actualizado exitosamente',
      grupo: grupoId,
      fecha_inicio: inicio.toISOString().split('T')[0],
      fecha_fin: fin.toISOString().split('T')[0],
      estado,
    });
  } catch (error: any) {
    console.error('Error en setEstadoGrupo:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
}

// ========================================
// GENERAR CALENDARIO DE GRUPOS (DEPRECATED)
// ========================================

export async function generarCalendario(_req: Request, res: Response) {
  return res.status(410).json({
    error: 'Este endpoint ha sido deprecado. Utilice la gestión manual de grupos.'
  });
}

// ========================================
// ACTUALIZAR ENTRADA DE CALENDARIO
// ========================================

export async function updateCalendario(req: Request, res: Response) {
  try {
    const grupoId = normalizeId(req.params.grupo);
    if (!grupoId) return res.status(400).json({ error: 'ID de grupo inválido' });

    const fecha = parseDate(req.params.fecha);
    if (!fecha) return res.status(400).json({ error: 'Fecha inválida' });

    const { estado, observaciones } = req.body;

    const calendarioActualizado = await GrupoModel.updateCalendario(grupoId, fecha, { estado, observaciones });

    return res.json({
      message: 'Entrada de calendario actualizada',
      calendario: calendarioActualizado,
    });
  } catch (error) {
    console.error('Error en updateCalendario:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// VERIFICAR ACCESO APP DE UN USUARIO
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
// VERIFICAR MI PROPIO ACCESO (BRIGADA)
// ========================================

export async function verificarMiAcceso(req: Request, res: Response) {
  try {
    const resultado = await GrupoModel.verificarAccesoApp(req.user!.userId);
    return res.json(resultado);
  } catch (error) {
    console.error('Error en verificarMiAcceso:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER BRIGADAS ACTIVAS
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

// ========================================
// OBTENER BRIGADAS POR GRUPO
// ========================================

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
// SUSPENDER/ACTIVAR ACCESO INDIVIDUAL
// ========================================

export async function toggleAccesoIndividual(req: Request, res: Response) {
  try {
    const usuarioId = normalizeId(req.params.usuario_id);
    if (!usuarioId) return res.status(400).json({ error: 'ID de usuario inválido' });

    const { acceso_app_activo, motivo } = req.body;

    if (!motivo || motivo.trim() === '') {
      return res.status(400).json({ error: 'El motivo es requerido para cambiar el acceso' });
    }

    // Verificar jurisdicción: operador solo puede modificar su propia sede
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
  } catch (error: any) {
    console.error('Error en toggleAccesoIndividual:', error);

    if (error.message?.includes('tiene asignación activa')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// ACTUALIZAR GRUPO DE BRIGADA
// ========================================

export async function actualizarGrupoBrigada(req: Request, res: Response) {
  try {
    const usuarioId = normalizeId(req.params.usuario_id);
    if (!usuarioId) return res.status(400).json({ error: 'ID de usuario inválido' });

    const { nuevo_grupo, fecha_inicio_ciclo, motivo } = req.body;

    if (!nuevo_grupo || !fecha_inicio_ciclo || !motivo) {
      return res.status(400).json({
        error: 'nuevo_grupo, fecha_inicio_ciclo y motivo son requeridos',
      });
    }

    const fechaCiclo = parseDate(fecha_inicio_ciclo);
    if (!fechaCiclo) return res.status(400).json({ error: 'fecha_inicio_ciclo inválida' });

    const nuevoGrupoId = normalizeId(nuevo_grupo);
    if (!nuevoGrupoId) return res.status(400).json({ error: 'nuevo_grupo inválido' });

    // Verificar jurisdicción: operador solo puede modificar su propia sede
    const operador = req.user!;
    const tieneJurisdiccion = await verificarJurisdiccionSede(usuarioId, operador.rol, operador.sede);
    if (!tieneJurisdiccion) {
      return res.status(403).json({ error: 'No tiene permiso para cambiar el grupo de usuarios de otra sede' });
    }

    const usuarioActualizado = await GrupoModel.actualizarGrupoBrigada(
      usuarioId,
      nuevoGrupoId,
      fechaCiclo,
      motivo,
      operador.userId
    );

    return res.json({ message: 'Grupo actualizado exitosamente', usuario: usuarioActualizado });
  } catch (error) {
    console.error('Error en actualizarGrupoBrigada:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// MARCAR/DESMARCAR EXENTO DE GRUPOS
// ========================================

export async function toggleExentoGrupos(req: Request, res: Response) {
  try {
    const usuarioId = normalizeId(req.params.usuario_id);
    if (!usuarioId) return res.status(400).json({ error: 'ID de usuario inválido' });

    const { exento } = req.body;

    // Solo ADMIN puede marcar exenciones
    if (req.user!.rol !== 'ADMIN' && req.user!.rol !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Solo los administradores pueden gestionar exenciones de grupos' });
    }

    const usuarioActualizado = await GrupoModel.toggleExentoGrupos(usuarioId, exento);

    return res.json({
      message: exento ? 'Usuario marcado como exento de grupos' : 'Exención de grupos removida',
      usuario: usuarioActualizado,
    });
  } catch (error) {
    console.error('Error en toggleExentoGrupos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
