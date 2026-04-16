import { Request, Response } from 'express';
import { GrupoModel } from '../models/grupo.model';

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
    const { grupo } = req.params;
    const { fecha } = req.query;

    const fechaConsulta = fecha ? new Date(fecha as string) : new Date();

    const estadoGrupo = await GrupoModel.getEstadoGrupo(parseInt(grupo, 10), fechaConsulta);

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
    const { grupo } = req.params;
    const { fecha_inicio, fecha_fin } = req.query;

    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        error: 'Se requieren fecha_inicio y fecha_fin',
      });
    }

    const calendario = await GrupoModel.getCalendarioGrupo(
      parseInt(grupo, 10),
      new Date(fecha_inicio as string),
      new Date(fecha_fin as string)
    );

    return res.json({
      grupo: parseInt(grupo, 10),
      fecha_inicio,
      fecha_fin,
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
    const { grupo } = req.params;
    const { fecha_inicio, fecha_fin, estado, observaciones } = req.body;

    if (!fecha_inicio || !estado) {
      return res.status(400).json({
        error: 'fecha_inicio y estado son requeridos',
      });
    }

    // Si no se envía fecha_fin, se asume que es solo para fecha_inicio
    const fin = fecha_fin ? new Date(fecha_fin) : new Date(fecha_inicio);
    const inicio = new Date(fecha_inicio);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return res.status(400).json({
        error: 'Fechas inválidas',
      });
    }

    if (estado !== 'TRABAJO' && estado !== 'DESCANSO') {
      return res.status(400).json({
        error: 'El estado debe ser TRABAJO o DESCANSO',
      });
    }

    await GrupoModel.setEstadoGrupoRango(
      parseInt(grupo, 10),
      inicio,
      fin,
      estado,
      observaciones
    );

    return res.json({
      message: 'Estado del grupo actualizado exitosamente',
      grupo: parseInt(grupo, 10),
      fecha_inicio: inicio.toISOString().split('T')[0],
      fecha_fin: fin.toISOString().split('T')[0],
      estado,
    });
  } catch (error: any) {
    console.error('Error en setEstadoGrupo:', error);
    console.error('Stack:', error.stack);
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
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
    const { grupo, fecha } = req.params;
    const { estado, observaciones } = req.body;

    const calendarioActualizado = await GrupoModel.updateCalendario(
      parseInt(grupo, 10),
      new Date(fecha),
      { estado, observaciones }
    );

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
    const { usuario_id } = req.params;

    const resultado = await GrupoModel.verificarAccesoApp(parseInt(usuario_id, 10));

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
    const userId = req.user!.userId;

    const resultado = await GrupoModel.verificarAccesoApp(userId);

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

    return res.json({
      total: brigadas.length,
      brigadas,
    });
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
    const { grupo } = req.params;

    const brigadas = await GrupoModel.getBrigadasPorGrupo(parseInt(grupo, 10));

    return res.json({
      grupo: parseInt(grupo, 10),
      total: brigadas.length,
      brigadas,
    });
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
    const { usuario_id } = req.params;
    const { acceso_app_activo, motivo } = req.body;

    if (motivo === undefined || motivo === null || motivo.trim() === '') {
      return res.status(400).json({
        error: 'El motivo es requerido para cambiar el acceso',
      });
    }

    const userId = req.user!.userId;

    const usuarioActualizado = await GrupoModel.toggleAccesoIndividual(
      parseInt(usuario_id, 10),
      acceso_app_activo,
      motivo,
      userId
    );

    // TODO: Registrar en auditoría via función registrar_cambio
    // Este cambio será registrado automáticamente por triggers

    return res.json({
      message: acceso_app_activo ? 'Acceso activado' : 'Acceso suspendido',
      usuario: usuarioActualizado,
    });
  } catch (error: any) {
    console.error('Error en toggleAccesoIndividual:', error);

    // Si es error de validación del trigger
    if (error.message && error.message.includes('tiene asignación activa')) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// ACTUALIZAR GRUPO DE BRIGADA
// ========================================

export async function actualizarGrupoBrigada(req: Request, res: Response) {
  try {
    const { usuario_id } = req.params;
    const { nuevo_grupo, fecha_inicio_ciclo, motivo } = req.body;

    if (!nuevo_grupo || !fecha_inicio_ciclo || !motivo) {
      return res.status(400).json({
        error: 'nuevo_grupo, fecha_inicio_ciclo y motivo son requeridos',
      });
    }

    const userId = req.user!.userId;

    const usuarioActualizado = await GrupoModel.actualizarGrupoBrigada(
      parseInt(usuario_id, 10),
      parseInt(nuevo_grupo, 10),
      new Date(fecha_inicio_ciclo),
      motivo,
      userId
    );

    return res.json({
      message: 'Grupo actualizado exitosamente',
      usuario: usuarioActualizado,
    });
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
    const { usuario_id } = req.params;
    const { exento } = req.body;

    const usuarioActualizado = await GrupoModel.toggleExentoGrupos(parseInt(usuario_id, 10), exento);

    return res.json({
      message: exento ? 'Usuario marcado como exento de grupos' : 'Exención de grupos removida',
      usuario: usuarioActualizado,
    });
  } catch (error) {
    console.error('Error en toggleExentoGrupos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
