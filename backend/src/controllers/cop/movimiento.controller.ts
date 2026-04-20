import { Request, Response } from 'express';
import { MovimientoModel, TipoMovimiento } from '../../models/operaciones/movimiento.model';
import { db } from '../../config/database';
import { normalizeId } from '../../utils/db.utils';

const TIPOS_MOVIMIENTO: TipoMovimiento[] = [
  'CAMBIO_UNIDAD', 'PRESTAMO', 'DIVISION_FUERZA', 'RELEVO', 'RETIRO', 'APOYO_TEMPORAL',
];

/** Verifica que la asignacion de destino pertenezca a un turno activo (no finalizado/cancelado) */
async function validarAsignacionDestino(asignacionId: number): Promise<boolean> {
  const result = await db.oneOrNone(
    `SELECT au.id
     FROM asignacion_unidad au
     JOIN turno t ON au.turno_id = t.id
     WHERE au.id = $1
       AND t.estado NOT IN ('FINALIZADO', 'CANCELADO')
       AND t.publicado = true`,
    [asignacionId]
  );
  return result !== null;
}

// ========================================
// CREAR MOVIMIENTO
// ========================================

export async function createMovimiento(req: Request, res: Response) {
  try {
    const {
      usuario_id,
      origen_asignacion_id,
      destino_asignacion_id,
      tipo_movimiento,
      motivo,
      observaciones,
    } = req.body;

    const usuarioId = normalizeId(usuario_id);
    if (!usuarioId) {
      return res.status(400).json({ error: 'usuario_id inválido' });
    }

    if (!tipo_movimiento || !TIPOS_MOVIMIENTO.includes(tipo_movimiento)) {
      return res.status(400).json({
        error: `tipo_movimiento inválido. Debe ser uno de: ${TIPOS_MOVIMIENTO.join(', ')}`,
      });
    }

    const origenId = origen_asignacion_id ? normalizeId(origen_asignacion_id) : null;
    const destinoId = destino_asignacion_id ? normalizeId(destino_asignacion_id) : null;

    if (origen_asignacion_id && !origenId) {
      return res.status(400).json({ error: 'origen_asignacion_id inválido' });
    }
    if (destino_asignacion_id && !destinoId) {
      return res.status(400).json({ error: 'destino_asignacion_id inválido' });
    }

    if (!origenId && !destinoId) {
      return res.status(400).json({
        error: 'Se requiere al menos origen_asignacion_id o destino_asignacion_id',
      });
    }

    // Validar que la asignación de destino sea activa
    if (destinoId) {
      const destinoValido = await validarAsignacionDestino(destinoId);
      if (!destinoValido) {
        return res.status(400).json({
          error: 'La asignación de destino no existe, no está publicada, o su turno ya finalizó',
        });
      }
    }

    const movimiento = await MovimientoModel.create({
      usuario_id: usuarioId,
      origen_asignacion_id: origenId ?? undefined,
      destino_asignacion_id: destinoId ?? undefined,
      tipo_movimiento,
      motivo,
      aprobado_por: req.user!.userId,
      observaciones,
    });

    return res.status(201).json({
      message: 'Movimiento registrado exitosamente',
      movimiento,
    });
  } catch (error) {
    console.error('Error en createMovimiento:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER MOVIMIENTO POR ID
// ========================================

export async function getMovimiento(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const movimiento = await MovimientoModel.getById(id);

    if (!movimiento) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }

    return res.json({ movimiento });
  } catch (error) {
    console.error('Error en getMovimiento:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// FINALIZAR MOVIMIENTO
// ========================================

export async function finalizarMovimiento(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { observaciones_finales } = req.body;

    // Verificar que existe y no está ya finalizado
    const existente = await MovimientoModel.getById(id);
    if (!existente) return res.status(404).json({ error: 'Movimiento no encontrado' });
    if (existente.hora_fin !== null) {
      return res.status(400).json({ error: 'El movimiento ya fue finalizado' });
    }

    const movimiento = await MovimientoModel.finalizar(id, observaciones_finales);

    return res.json({ message: 'Movimiento finalizado', movimiento });
  } catch (error) {
    console.error('Error en finalizarMovimiento:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER MOVIMIENTOS ACTIVOS DE UN USUARIO
// ========================================

export async function getMovimientosActivos(req: Request, res: Response) {
  try {
    const usuarioId = normalizeId(req.params.usuario_id);
    if (!usuarioId) return res.status(400).json({ error: 'ID de usuario inválido' });

    const movimientos = await MovimientoModel.getActivos(usuarioId);

    return res.json({ total: movimientos.length, movimientos });
  } catch (error) {
    console.error('Error en getMovimientosActivos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER MIS MOVIMIENTOS ACTIVOS (BRIGADA)
// ========================================

export async function getMisMovimientosActivos(req: Request, res: Response) {
  try {
    const movimientos = await MovimientoModel.getActivos(req.user!.userId);

    return res.json({ total: movimientos.length, movimientos });
  } catch (error) {
    console.error('Error en getMisMovimientosActivos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER HISTORIAL DE MOVIMIENTOS
// ========================================

export async function getHistorialMovimientos(req: Request, res: Response) {
  try {
    const {
      usuario_id,
      tipo_movimiento,
      fecha_desde,
      fecha_hasta,
      solo_activos,
      limit,
      offset,
    } = req.query;

    const filters: any = {};

    if (usuario_id) {
      const uid = normalizeId(usuario_id as string);
      if (!uid) return res.status(400).json({ error: 'usuario_id inválido' });
      filters.usuario_id = uid;
    }
    if (tipo_movimiento) {
      if (!TIPOS_MOVIMIENTO.includes(tipo_movimiento as TipoMovimiento)) {
        return res.status(400).json({ error: 'tipo_movimiento inválido' });
      }
      filters.tipo_movimiento = tipo_movimiento;
    }
    if (fecha_desde) filters.fecha_desde = new Date(fecha_desde as string);
    if (fecha_hasta) filters.fecha_hasta = new Date(fecha_hasta as string);
    if (solo_activos === 'true') filters.solo_activos = true;
    if (limit) filters.limit = Math.min(parseInt(limit as string, 10) || 100, 500);
    if (offset) filters.offset = parseInt(offset as string, 10) || 0;

    const movimientos = await MovimientoModel.getHistorial(filters);

    return res.json({ total: movimientos.length, movimientos, filters });
  } catch (error) {
    console.error('Error en getHistorialMovimientos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER COMPOSICIÓN DE UNIDADES
// ========================================

export async function getComposicionUnidades(_req: Request, res: Response) {
  try {
    const composicion = await MovimientoModel.getComposicionUnidades();

    const unidadesMap = new Map();

    for (const item of composicion) {
      if (!unidadesMap.has(item.unidad_id)) {
        unidadesMap.set(item.unidad_id, {
          unidad_id: item.unidad_id,
          unidad_codigo: item.unidad_codigo,
          tipo_unidad: item.tipo_unidad,
          tripulacion: [],
        });
      }

      unidadesMap.get(item.unidad_id).tripulacion.push({
        asignacion_id: item.asignacion_id,
        usuario_id: item.usuario_id,
        usuario_nombre: item.usuario_nombre,
        es_piloto: item.es_piloto,
        tiene_movimiento_activo: item.tiene_movimiento_activo,
        movimiento_tipo: item.movimiento_tipo,
        movimiento_origen: item.movimiento_origen,
      });
    }

    const unidades = Array.from(unidadesMap.values());

    return res.json({ total_unidades: unidades.length, unidades });
  } catch (error) {
    console.error('Error en getComposicionUnidades:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER COMPOSICIÓN DE UNA UNIDAD
// ========================================

export async function getComposicionUnidad(req: Request, res: Response) {
  try {
    const unidadId = normalizeId(req.params.unidad_id);
    if (!unidadId) return res.status(400).json({ error: 'ID de unidad inválido' });

    const composicion = await MovimientoModel.getComposicionUnidad(unidadId);

    return res.json({
      unidad_id: unidadId,
      total_tripulacion: composicion.length,
      tripulacion: composicion,
    });
  } catch (error) {
    console.error('Error en getComposicionUnidad:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// ACTUALIZAR MOVIMIENTO
// ========================================

export async function updateMovimiento(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { motivo, observaciones } = req.body;

    // Solo se pueden editar motivo/observaciones — aprobado_por nunca cambia
    const movimiento = await MovimientoModel.update(id, { motivo, observaciones });

    return res.json({ message: 'Movimiento actualizado', movimiento });
  } catch (error) {
    console.error('Error en updateMovimiento:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// ELIMINAR MOVIMIENTO
// ========================================

export async function deleteMovimiento(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const existente = await MovimientoModel.getById(id);
    if (!existente) return res.status(404).json({ error: 'Movimiento no encontrado' });
    if (existente.hora_fin !== null) {
      return res.status(400).json({ error: 'No se puede eliminar un movimiento ya finalizado' });
    }

    await MovimientoModel.delete(id);

    return res.json({ message: 'Movimiento eliminado' });
  } catch (error) {
    console.error('Error en deleteMovimiento:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
