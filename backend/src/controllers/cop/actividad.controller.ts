import { Request, Response } from 'express';
import { ActividadModel } from '../../models/cop/actividad.model';
import { db } from '../../config/database';
import { emitToAll } from '../../services/common/socket.service';
import { resolveContextoActivo } from '../../utils/operaciones.utils';
import { buildObservacionEntry } from '../../utils/db.utils';

// ========================================
// LISTAR ACTIVIDADES
// ========================================

export async function listActividades(req: Request, res: Response) {
  try {
    const list = await ActividadModel.list(req.query);
    return res.json({ actividades: list, count: list.length });
  } catch (error: any) {
    console.error('Error listActividades:', error);
    return res.status(500).json({ error: error.message || 'Error interno' });
  }
}

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
      clima,
      carga_vehicular,
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

    // Resolver contexto operativo antes de la transacción
    const ctx = await resolveContextoActivo(userId, {
      unidad_id:        unidad_id        ? Number(unidad_id)        : null,
      salida_unidad_id: salida_unidad_id ? Number(salida_unidad_id) : null,
      ruta_id:          ruta_id          ? Number(ruta_id)          : null,
    });

    if (!ctx.unidad_id) {
      return res.status(412).json({
        error: 'No se pudo determinar el contexto operativo. Verifica que tienes un turno activo o selecciona una unidad manualmente.',
        code:  'NO_CONTEXTO_OPERATIVO',
      });
    }

    const unidadId = ctx.unidad_id; // narrowed: non-null from here on

    // Transacción: cerrar estado anterior y crear la nueva actividad de forma atómica
    const actividadCreada = await db.tx(async t => {
      // 1. Cerrar actividades activas previas de esta unidad
      await ActividadModel.cerrarActivasDeUnidad(unidadId, t);

      // 2. Cerrar situaciones activas previas (una unidad solo puede tener una cosa activa)
      await t.none(
        `UPDATE situacion SET estado = 'CERRADA', updated_at = NOW()
         WHERE unidad_id = $1 AND estado = 'ACTIVA'`,
        [unidadId],
      );

      // 3. Crear la actividad
      return ActividadModel.create({
        tipo_actividad_id,
        unidad_id:        unidadId,
        salida_unidad_id: ctx.salida_id  ?? null,
        creado_por:       userId,
        ruta_id:          ctx.ruta_id    ?? null,
        km:               km             ?? null,
        sentido:          sentido        ?? null,
        latitud:          latitud        ?? null,
        longitud:         longitud       ?? null,
        observaciones:    observaciones  ?? null,
        datos:            datos          ?? {},
        codigo_actividad: codigo_actividad ?? null,
        clima:            clima          ?? null,
        carga_vehicular:  carga_vehicular ?? null,
      }, t);
    });

    const actividadCompleta = await ActividadModel.getById(actividadCreada.id);
    emitToAll('actividad:nueva', actividadCompleta);

    return res.status(201).json({ message: 'Actividad creada', actividad: actividadCompleta });
  } catch (error: any) {
    console.error('Error createActividad:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ========================================
// ACTUALIZAR ACTIVIDAD
// ========================================

export async function updateActividad(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { km, sentido, ruta_id, latitud, longitud, observaciones, datos } = req.body;

    const actividadActual = await ActividadModel.getById(parseInt(id));
    if (!actividadActual) return res.status(404).json({ error: 'Actividad no encontrada' });

    const actividadCompleta = await ActividadModel.update(parseInt(id), {
      km, sentido, ruta_id, latitud, longitud, observaciones, datos,
    });

    return res.json({ actividad: actividadCompleta });
  } catch (error: any) {
    console.error('Error updateActividad:', error);
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
    const userId  = req.user!.userId;
    const rawId   = req.query.unidad_id ? Number(req.query.unidad_id) : null;

    const ctx = await resolveContextoActivo(userId, { unidad_id: rawId });

    if (!ctx.unidad_id) {
      return res.json({ actividades: [], actividad_activa: null });
    }

    const actividades    = await ActividadModel.getByUnidadHoy(ctx.unidad_id);
    const actividad_activa = actividades.find(a => a.estado === 'ACTIVA') || null;

    return res.json({ actividades, actividad_activa });
  } catch (error: any) {
    console.error('Error getMiUnidadHoy actividades:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ========================================
// OBSERVACIONES TIMELINE
// ========================================

export async function addObservacion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { observacion, hora_local } = req.body;
    const userId = req.user!.userId;

    if (!observacion) {
      return res.status(400).json({ error: 'La observación no puede estar vacía' });
    }

    const nuevoMensaje = await buildObservacionEntry(userId, observacion, hora_local);

    const actividadModificada = await db.one(
      `UPDATE actividad
       SET observaciones = COALESCE(observaciones, '[]'::jsonb) || $1::jsonb
       WHERE id = $2
       RETURNING *`,
      [nuevoMensaje, id],
    );

    emitToAll('actividad:actualizada', actividadModificada);

    return res.status(200).json({
      message:   'Observación agregada al timeline',
      actividad: actividadModificada,
    });
  } catch (error: any) {
    console.error('Error addObservacion (actividad):', error);
    return res.status(500).json({ error: error.message || 'Error interno al agregar observación' });
  }
}
