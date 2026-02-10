import { Request, Response } from 'express';
import { ActividadModel } from '../models/actividad.model';
import { db } from '../config/database';
import { emitToAll } from '../services/socket.service';

// ========================================
// CREAR ACTIVIDAD
// ========================================

export async function createActividad(req: Request, res: Response) {
  try {
    const {
      id: codigo_actividad, // Código determinista del mobile
      tipo_actividad_id,
      unidad_id,
      salida_unidad_id,
      ruta_id,
      km,
      sentido,
      latitud,
      longitud,
      observaciones,
      datos,
    } = req.body;

    const userId = req.user!.userId;

    if (!tipo_actividad_id) {
      return res.status(400).json({ error: 'tipo_actividad_id es requerido' });
    }

    // Idempotencia: si ya existe con ese código, retornar la existente
    if (codigo_actividad) {
      const existente = await ActividadModel.findByCodigoActividad(codigo_actividad);
      if (existente) {
        const completa = await ActividadModel.getById(existente.id);
        return res.status(200).json({ message: 'Actividad ya existente', actividad: completa });
      }
    }

    // Resolver unidad_id, salida y ruta
    let resolvedUnidadId = unidad_id;
    let resolvedSalidaId = salida_unidad_id;
    let resolvedRutaId = ruta_id;

    // Siempre intentar resolver desde salida_unidad activa si faltan datos
    if (!resolvedUnidadId || !resolvedRutaId || !resolvedSalidaId) {
      const lookupField = resolvedUnidadId ? 'su.unidad_id' : 'bu.usuario_id';
      const lookupValue = resolvedUnidadId || userId;
      const brigada = await db.oneOrNone(`
        SELECT bu.unidad_id, su.id as salida_unidad_id, su.ruta_id
        FROM brigada_unidad bu
        JOIN salida_unidad su ON bu.unidad_id = su.unidad_id AND su.estado = 'EN_SALIDA'
        WHERE ${lookupField} = $1
        LIMIT 1
      `, [lookupValue]);

      if (brigada) {
        resolvedUnidadId = resolvedUnidadId || brigada.unidad_id;
        resolvedSalidaId = resolvedSalidaId || brigada.salida_unidad_id;
        resolvedRutaId = resolvedRutaId || brigada.ruta_id;
      }
    }

    if (!resolvedUnidadId) {
      return res.status(400).json({ error: 'No se pudo determinar la unidad' });
    }

    // Cerrar actividades activas previas de esta unidad
    await ActividadModel.cerrarActivasDeUnidad(resolvedUnidadId);

    // También cerrar situaciones activas de esta unidad (una unidad solo puede tener una cosa activa)
    await db.none(`
      UPDATE situacion SET estado = 'CERRADA', updated_at = NOW()
      WHERE unidad_id = $1 AND estado = 'ACTIVA'
    `, [resolvedUnidadId]);

    // Crear la actividad
    const actividad = await ActividadModel.create({
      tipo_actividad_id,
      unidad_id: resolvedUnidadId,
      salida_unidad_id: resolvedSalidaId || null,
      creado_por: userId,
      ruta_id: resolvedRutaId || null,
      km: km || null,
      sentido: sentido || null,
      latitud: latitud || null,
      longitud: longitud || null,
      observaciones: observaciones || null,
      datos: datos || {},
      codigo_actividad: codigo_actividad || null,
    });

    // Obtener actividad completa con joins
    const actividadCompleta = await ActividadModel.getById(actividad.id);

    // Emitir evento WebSocket
    emitToAll('actividad:nueva', actividadCompleta);

    return res.status(201).json({ message: 'Actividad creada', actividad: actividadCompleta });
  } catch (error: any) {
    console.error('Error createActividad:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ========================================
// CERRAR ACTIVIDAD
// ========================================

export async function cerrarActividad(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const actividad = await ActividadModel.cerrar(parseInt(id), userId);

    // Emitir evento WebSocket
    emitToAll('actividad:cerrada', actividad);

    return res.json({ message: 'Actividad cerrada', actividad });
  } catch (error: any) {
    console.error('Error cerrarActividad:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ========================================
// OBTENER ACTIVIDAD POR ID
// ========================================

export async function getActividad(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const actividad = await ActividadModel.getById(parseInt(id));

    if (!actividad) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }

    return res.json({ actividad });
  } catch (error: any) {
    console.error('Error getActividad:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ========================================
// ACTIVIDADES DE MI UNIDAD HOY
// ========================================

export async function getMiUnidadHoy(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const unidadId = req.query.unidad_id ? parseInt(req.query.unidad_id as string) : null;

    let resolvedUnidadId = unidadId;

    if (!resolvedUnidadId) {
      const brigada = await db.oneOrNone(`
        SELECT bu.unidad_id
        FROM brigada_unidad bu
        WHERE bu.usuario_id = $1
        LIMIT 1
      `, [userId]);

      resolvedUnidadId = brigada?.unidad_id;
    }

    if (!resolvedUnidadId) {
      return res.json({ actividades: [], actividad_activa: null });
    }

    const actividades = await ActividadModel.getByUnidadHoy(resolvedUnidadId);
    const activa = actividades.find(a => a.estado === 'ACTIVA') || null;

    return res.json({ actividades, actividad_activa: activa });
  } catch (error: any) {
    console.error('Error getMiUnidadHoy actividades:', error);
    return res.status(500).json({ error: error.message });
  }
}
