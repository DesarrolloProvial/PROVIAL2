/**
 * Controlador para funcionalidades avanzadas de asignaciones
 */

import { Request, Response } from 'express';
import { AsignacionAvanzadaModel } from '../../models/operaciones/asignacionAvanzada.model';
import { ConfiguracionSedeModel } from '../../models/operaciones/configuracionSede.model';
import { normalizeId } from '../../utils/db.utils';

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
    const user = req.user!;

    // Determinar qué sedes puede ver el usuario
    let sedeIdNum: number | undefined;

    // Usuarios que pueden ver todas las sedes
    const puedeVerTodo = user.rol === 'ADMIN' || user.rol === 'OPERACIONES' || user.rol === 'COP' ||
      (user.rol === 'ENCARGADO_NOMINAS' && user.puede_ver_todas_sedes);

    if (sedeId) {
      sedeIdNum = normalizeId(sedeId) || undefined;
    } else if (!puedeVerTodo && user.sede) {
      // ENCARGADO_NOMINAS sin puede_ver_todas_sedes solo ve su sede
      sedeIdNum = user.sede;
    }

    // Determinar si puede ver borradores
    const puedeVerBorradores = ['ADMIN', 'OPERACIONES', 'ENCARGADO_NOMINAS', 'TRANSPORTES'].includes(user.rol);

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
  } catch (error) {
    console.error('getAsignacionesPorSede:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
    const turnoId = normalizeId(req.params.turnoId);
    if (!turnoId) return res.status(400).json({ error: 'ID de turno inválido' });

    const userId = req.user!.userId;

    const success = await AsignacionAvanzadaModel.publicarTurno(turnoId, userId);

    if (!success) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    // TODO: Enviar notificación a brigadas asignadas

    res.json({ message: 'Turno (plantilla) publicado correctamente. Las patrullas ya son visibles.', publicado: true });
  } catch (error) {
    console.error('publicarTurno:', error);

    if ((error as any).message === 'MISSING_UNITS') {
      return res.status(400).json({
        error: 'Incapaz de publicar turno. Existen patrullas sin unidad asignada. Transportes debe designar los vehículos pendientes antes de liberar la salida.'
      });
    }

    if ((error as any).message === 'EMPTY_TURNO') {
      return res.status(400).json({
        error: 'No se puede publicar un turno vacío. Debes crear al menos una asignación operativa.'
      });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/asignaciones-avanzadas/turno/:turnoId/despublicar
 * Volver turno a borrador
 */
export async function despublicarTurno(req: Request, res: Response) {
  try {
    const turnoId = normalizeId(req.params.turnoId);
    if (!turnoId) return res.status(400).json({ error: 'ID de turno inválido' });

    const success = await AsignacionAvanzadaModel.despublicarTurno(turnoId);

    if (!success) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    res.json({ message: 'Turno vuelto a borrador', publicado: false });
  } catch (error) {
    console.error('despublicarTurno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
    const sedeId = normalizeId(req.params.sedeId);
    if (!sedeId) return res.status(400).json({ error: 'ID de sede inválido' });

    const config = await ConfiguracionSedeModel.getBySede(sedeId);

    if (!config) {
      // Retornar configuración por defecto
      return res.json({
        sede_id: sedeId,
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
  } catch (error) {
    console.error('getConfiguracionSede:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
  } catch (error) {
    console.error('getAllConfiguracionesSede:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * PUT /api/asignaciones-avanzadas/configuracion-sede/:sedeId
 * Actualizar configuración visual de una sede
 */
export async function updateConfiguracionSede(req: Request, res: Response) {
  try {
    const sedeId = normalizeId(req.params.sedeId);
    if (!sedeId) return res.status(400).json({ error: 'ID de sede inválido' });

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

    const config = await ConfiguracionSedeModel.upsert(sedeId, {
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
  } catch (error) {
    console.error('updateConfiguracionSede:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
    const usuarioId = normalizeId(req.params.usuarioId);
    if (!usuarioId) return res.status(400).json({ error: 'ID de usuario inválido' });

    const { rutaId, umbral, fecha } = req.query;

    const alertas = await AsignacionAvanzadaModel.getAlertasRotacion(
      usuarioId,
      rutaId ? normalizeId(String(rutaId)) || undefined : undefined,
      umbral ? parseInt(String(umbral), 10) : 3,
      fecha ? String(fecha) : undefined
    );

    res.json(alertas);
  } catch (error) {
    console.error('getAlertasRotacion:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// =====================================================
// ACCIONES CON FORMATO
// =====================================================

/**
 * PUT /api/asignaciones-avanzadas/asignacion/:asignacionId/acciones-formato
 * Actualizar acciones (Validando formato Estructurado JSON Array)
 */
export async function updateAccionesFormato(req: Request, res: Response) {
  try {
    const asignacionId = normalizeId(req.params.asignacionId);
    if (!asignacionId) return res.status(400).json({ error: 'ID de asignación inválido' });

    const { acciones_formato } = req.body;

    // A partir de ahora acciones_formato DEBE ser un array JSON válido estructurado 
    // Ej: [{ texto: "Vigilancia de garita", resaltar: true }]
    let jsonArray = '[]';

    if (acciones_formato) {
      if (!Array.isArray(acciones_formato)) {
        return res.status(400).json({ error: 'acciones_formato debe ser un JSON Array estructurado.' });
      }

      // Mapear elementos para evitar inserción de keys no deseadas/maliciosas
      const safeArray = acciones_formato.map(item => ({
        texto: typeof item.texto === 'string' ? item.texto.substring(0, 500) : '',
        resaltar: item.resaltar === true
      })).filter(i => i.texto.trim() !== '');

      jsonArray = JSON.stringify(safeArray);
    }

    const success = await AsignacionAvanzadaModel.actualizarAccionesFormato(
      asignacionId,
      jsonArray
    );

    if (!success) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    res.json({ message: 'Acciones actualizadas estructuralmente', acciones_formato: JSON.parse(jsonArray) });
  } catch (error) {
    console.error('updateAccionesFormato:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
