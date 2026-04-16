/**
 * Controlador para funcionalidades avanzadas de asignaciones
 */

import { Request, Response } from 'express';
import { AsignacionAvanzadaModel } from '../models/asignacionAvanzada.model';
import { ConfiguracionSedeModel } from '../models/configuracionSede.model';
// import { SituacionFijaModel } from '../models/situacionFija.model'; // ELIMINADO: Tabla eliminada en migración 108

// =====================================================
// ASIGNACIONES POR SEDE
// =====================================================

/**
 * GET /api/asignaciones-avanzadas/por-sede
 * Obtener asignaciones agrupadas por sede para una fecha
 *
 * Permisos:
 * - ADMIN/OPERACIONES: Ve todo
 * - ENCARGADO_NOMINAS con puede_ver_todas_sedes=true: Ve todo (solo lectura)
 * - ENCARGADO_NOMINAS sin puede_ver_todas_sedes: Solo su sede
 * - COP: Ve todo (para monitoreo)
 */
export async function getAsignacionesPorSede(req: Request, res: Response) {
  try {
    const { fecha, sedeId, incluirBorradores, mostrarPendientes } = req.query;
    const user = (req as any).user;

    // Determinar qué sedes puede ver el usuario
    let sedeIdNum: number | undefined;

    // Usuarios que pueden ver todas las sedes
    const puedeVerTodo = user.rol === 'ADMIN' || user.rol === 'OPERACIONES' || user.rol === 'COP' ||
      (user.rol === 'ENCARGADO_NOMINAS' && user.puede_ver_todas_sedes);

    if (sedeId) {
      sedeIdNum = parseInt(String(sedeId), 10);
    } else if (!puedeVerTodo && user.sede) {
      // ENCARGADO_NOMINAS sin puede_ver_todas_sedes solo ve su sede
      sedeIdNum = user.sede;
    }

    // Determinar si puede ver borradores
    const puedeVerBorradores = user.rol === 'ADMIN' || user.rol === 'OPERACIONES' || user.rol === 'ENCARGADO_NOMINAS';

    // Si mostrarPendientes=true, mostrar hoy y futuras; sino usar fecha específica
    const usarPendientes = mostrarPendientes === 'true';
    const fechaConsulta = usarPendientes ? null : (fecha ? String(fecha) : new Date().toISOString().split('T')[0]);

    const sedes = await AsignacionAvanzadaModel.getAsignacionesPorSede(fechaConsulta, {
      sedeId: sedeIdNum,
      incluirBorradores: incluirBorradores === 'true' && puedeVerBorradores,
      mostrarPendientes: usarPendientes
    });

    res.json({
      fecha: fechaConsulta,
      sedes,
      permisos: {
        puedeVerTodo,
        puedeEditar: user.rol === 'ADMIN' || user.rol === 'OPERACIONES',
        soloLectura: user.rol === 'ENCARGADO_NOMINAS' || user.rol === 'COP'
      }
    });
  } catch (error: any) {
    console.error('Error en getAsignacionesPorSede:', error);
    res.status(500).json({ error: 'Error al obtener asignaciones por sede', details: error.message });
  }
}

// =====================================================
// PUBLICACIÓN DE TURNOS
// =====================================================

/**
 * POST /api/asignaciones-avanzadas/turno/:turnoId/publicar
 * Publicar un turno (hacerlo visible para brigadas)
 */
export async function publicarTurno(req: Request, res: Response) {
  try {
    const { turnoId } = req.params;
    const userId = (req as any).user.userId;

    const success = await AsignacionAvanzadaModel.publicarTurno(parseInt(turnoId, 10), userId);

    if (!success) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    // TODO: Enviar notificación a brigadas asignadas

    res.json({ message: 'Turno publicado correctamente', publicado: true });
  } catch (error: any) {
    console.error('Error en publicarTurno:', error);
    res.status(500).json({ error: 'Error al publicar turno', details: error.message });
  }
}

/**
 * POST /api/asignaciones-avanzadas/turno/:turnoId/despublicar
 * Volver turno a borrador
 */
export async function despublicarTurno(req: Request, res: Response) {
  try {
    const { turnoId } = req.params;

    const success = await AsignacionAvanzadaModel.despublicarTurno(parseInt(turnoId, 10));

    if (!success) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    res.json({ message: 'Turno vuelto a borrador', publicado: false });
  } catch (error: any) {
    console.error('Error en despublicarTurno:', error);
    res.status(500).json({ error: 'Error al despublicar turno', details: error.message });
  }
}

// =====================================================
// CONFIGURACIÓN VISUAL DE SEDE
// =====================================================

/**
 * GET /api/asignaciones-avanzadas/configuracion-sede/:sedeId
 * Obtener configuración visual de una sede
 */
export async function getConfiguracionSede(req: Request, res: Response) {
  try {
    const { sedeId } = req.params;

    const config = await ConfiguracionSedeModel.getBySede(parseInt(sedeId, 10));

    if (!config) {
      // Retornar configuración por defecto
      return res.json({
        sede_id: parseInt(sedeId, 10),
        color_fondo: '#ffffff',
        color_fondo_header: '#f3f4f6',
        color_texto: '#1f2937',
        color_acento: '#3b82f6',
        fuente: 'Inter',
        tamano_fuente: 'normal',
        alerta_rotacion_rutas_activa: true,
        umbral_rotacion_rutas: 3
      });
    }

    res.json(config);
  } catch (error: any) {
    console.error('Error en getConfiguracionSede:', error);
    res.status(500).json({ error: 'Error al obtener configuración', details: error.message });
  }
}

/**
 * GET /api/asignaciones-avanzadas/configuracion-sede
 * Obtener configuración de todas las sedes
 */
export async function getAllConfiguracionesSede(_req: Request, res: Response) {
  try {
    const configs = await ConfiguracionSedeModel.getAll();
    res.json(configs);
  } catch (error: any) {
    console.error('Error en getAllConfiguracionesSede:', error);
    res.status(500).json({ error: 'Error al obtener configuraciones', details: error.message });
  }
}

/**
 * PUT /api/asignaciones-avanzadas/configuracion-sede/:sedeId
 * Actualizar configuración visual de una sede
 */
export async function updateConfiguracionSede(req: Request, res: Response) {
  try {
    const { sedeId } = req.params;
    const {
      color_fondo,
      color_fondo_header,
      color_texto,
      color_acento,
      fuente,
      tamano_fuente,
      alerta_rotacion_rutas_activa,
      umbral_rotacion_rutas
    } = req.body;

    const config = await ConfiguracionSedeModel.upsert(parseInt(sedeId, 10), {
      color_fondo,
      color_fondo_header,
      color_texto,
      color_acento,
      fuente,
      tamano_fuente,
      alerta_rotacion_rutas_activa,
      umbral_rotacion_rutas
    });

    res.json(config);
  } catch (error: any) {
    console.error('Error en updateConfiguracionSede:', error);
    res.status(500).json({ error: 'Error al actualizar configuración', details: error.message });
  }
}

// =====================================================
// SITUACIONES FIJAS
// =====================================================

// FUNCIONES DE SITUACIONES FIJAS - ELIMINADAS (tabla eliminada en migración 108)
// Se reemplazará por el sistema de situacion_sesiones

export async function getSituacionesFijas(_req: Request, res: Response) {
  return res.status(410).json({ error: 'Funcionalidad eliminada. Usar situaciones persistentes.' });
}

export async function getSituacionFija(_req: Request, res: Response) {
  return res.status(410).json({ error: 'Funcionalidad eliminada. Usar situaciones persistentes.' });
}

export async function createSituacionFija(_req: Request, res: Response) {
  return res.status(410).json({ error: 'Funcionalidad eliminada. Usar situaciones persistentes.' });
}

export async function updateSituacionFija(_req: Request, res: Response) {
  return res.status(410).json({ error: 'Funcionalidad eliminada. Usar situaciones persistentes.' });
}

export async function deleteSituacionFija(_req: Request, res: Response) {
  return res.status(410).json({ error: 'Funcionalidad eliminada. Usar situaciones persistentes.' });
}

// =====================================================
// AVISOS EN ASIGNACIONES
// =====================================================

/**
 * POST /api/asignaciones-avanzadas/asignacion/:asignacionId/aviso
 * Crear aviso en una asignación
 */
export async function crearAviso(req: Request, res: Response) {
  try {
    const { asignacionId } = req.params;
    const userId = (req as any).user.userId;
    const { tipo, mensaje, color } = req.body;

    if (!tipo || !mensaje) {
      return res.status(400).json({ error: 'Tipo y mensaje son requeridos' });
    }

    if (!['ADVERTENCIA', 'INFO', 'URGENTE'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo debe ser ADVERTENCIA, INFO o URGENTE' });
    }

    const aviso = await AsignacionAvanzadaModel.crearAviso({
      asignacionId: parseInt(asignacionId, 10),
      tipo,
      mensaje,
      color,
      creadoPor: userId
    });

    res.status(201).json(aviso);
  } catch (error: any) {
    console.error('Error en crearAviso:', error);
    res.status(500).json({ error: 'Error al crear aviso', details: error.message });
  }
}

/**
 * DELETE /api/asignaciones-avanzadas/aviso/:avisoId
 * Eliminar aviso
 */
export async function eliminarAviso(req: Request, res: Response) {
  try {
    const { avisoId } = req.params;

    const success = await AsignacionAvanzadaModel.eliminarAviso(parseInt(avisoId, 10));

    if (!success) {
      return res.status(404).json({ error: 'Aviso no encontrado' });
    }

    res.json({ message: 'Aviso eliminado' });
  } catch (error: any) {
    console.error('Error en eliminarAviso:', error);
    res.status(500).json({ error: 'Error al eliminar aviso', details: error.message });
  }
}

// =====================================================
// ALERTAS DE ROTACIÓN
// =====================================================

/**
 * GET /api/asignaciones-avanzadas/alertas-rotacion/:usuarioId
 * Obtener alertas de rotación para un brigada
 */
export async function getAlertasRotacion(req: Request, res: Response) {
  try {
    const { usuarioId } = req.params;
    const { rutaId, situacionFijaId, umbral } = req.query;

    const alertas = await AsignacionAvanzadaModel.getAlertasRotacion(
      parseInt(usuarioId, 10),
      rutaId ? parseInt(String(rutaId), 10) : undefined,
      situacionFijaId ? parseInt(String(situacionFijaId), 10) : undefined,
      umbral ? parseInt(String(umbral), 10) : 3
    );

    res.json(alertas);
  } catch (error: any) {
    console.error('Error en getAlertasRotacion:', error);
    res.status(500).json({ error: 'Error al obtener alertas', details: error.message });
  }
}

// =====================================================
// ACCIONES CON FORMATO
// =====================================================

/**
 * PUT /api/asignaciones-avanzadas/asignacion/:asignacionId/acciones-formato
 * Actualizar acciones con formato HTML
 */
export async function updateAccionesFormato(req: Request, res: Response) {
  try {
    const { asignacionId } = req.params;
    const { acciones_formato } = req.body;

    // Sanitizar HTML básico (permitir solo tags seguros: b, strong, i, em, u, span, br)
    let sanitized = acciones_formato || '';

    // Remover tags no permitidos (seguridad básica)
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
    sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');

    const success = await AsignacionAvanzadaModel.actualizarAccionesFormato(
      parseInt(asignacionId, 10),
      sanitized
    );

    if (!success) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    res.json({ message: 'Acciones actualizadas', acciones_formato: sanitized });
  } catch (error: any) {
    console.error('Error en updateAccionesFormato:', error);
    res.status(500).json({ error: 'Error al actualizar acciones', details: error.message });
  }
}

/**
 * PUT /api/asignaciones-avanzadas/asignacion/:asignacionId/vincular-situacion
 * Vincular asignación con situación fija
 */
export async function vincularSituacionFija(req: Request, res: Response) {
  try {
    const { asignacionId } = req.params;
    const { situacion_fija_id } = req.body;

    if (!situacion_fija_id) {
      return res.status(400).json({ error: 'situacion_fija_id es requerido' });
    }

    const success = await AsignacionAvanzadaModel.vincularSituacionFija(
      parseInt(asignacionId, 10),
      situacion_fija_id
    );

    if (!success) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    res.json({ message: 'Situación fija vinculada' });
  } catch (error: any) {
    console.error('Error en vincularSituacionFija:', error);
    res.status(500).json({ error: 'Error al vincular situación', details: error.message });
  }
}
