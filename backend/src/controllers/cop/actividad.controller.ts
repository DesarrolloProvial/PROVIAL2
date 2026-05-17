import { Request, Response } from 'express';
import { ActividadModel } from '../../models/cop/actividad.model';
import { SalidaModel } from '../../models/common/salida.model';
import { db } from '../../config/database';
import { emitToAll } from '../../services/common/socket.service';
import { resolveContextoActivo } from '../../utils/operaciones.utils';
import { buildObservacionEntry, normalizeId } from '../../utils/db.utils';

// ========================================
// LISTAR ACTIVIDADES
// ========================================

export async function listActividades(req: Request, res: Response) {
  try {
    const list = await ActividadModel.list(req.query);
    return res.json({ actividades: list, count: list.length });
  } catch (error) {
    console.error('listActividades:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// CREAR ACTIVIDAD
// ========================================

export async function createActividad(req: Request, res: Response) {
  try {
    const {
      id: codigo_actividad,
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
      departamento_id,
      municipio_id,
    } = req.body;

    const userId = req.user!.userId;

    if (!tipo_actividad_id) {
      return res.status(400).json({ error: 'tipo_actividad_id es requerido' });
    }

    if (codigo_actividad) {
      const existente = await ActividadModel.findByCodigoActividad(codigo_actividad);
      if (existente) {
        const completa = await ActividadModel.getById(existente.id);
        return res.status(200).json({ message: 'Actividad ya existente', actividad: completa });
      }
    }

    const ctx = await resolveContextoActivo(userId, {
      unidad_id:        normalizeId(unidad_id),
      salida_unidad_id: normalizeId(salida_unidad_id),
      ruta_id:          normalizeId(ruta_id),
    });

    if (!ctx.unidad_id) {
      return res.status(412).json({
        error: 'No se pudo determinar el contexto operativo. Verifica que tienes un turno activo o selecciona una unidad manualmente.',
        code:  'NO_CONTEXTO_OPERATIVO',
      });
    }

    const unidadId = ctx.unidad_id;

    const actividadCreada = await db.tx(async (t: any) => {
      await ActividadModel.cerrarActivasDeUnidad(unidadId, t);

      await t.none(
        `UPDATE situacion SET estado = 'CERRADA', updated_at = NOW()
         WHERE unidad_id = $1 AND estado = 'ACTIVA'`,
        [unidadId],
      );

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
        departamento_id:  departamento_id ?? null,
        municipio_id:     municipio_id    ?? null,
      }, t);
    });

    const actividadCompleta = await ActividadModel.getById(actividadCreada.id);
    emitToAll('actividad:nueva', actividadCompleta);

    return res.status(201).json({ message: 'Actividad creada', actividad: actividadCompleta });
  } catch (error) {
    console.error('createActividad:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// ACTUALIZAR ACTIVIDAD
// ========================================

export async function updateActividad(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { km, sentido, ruta_id, latitud, longitud, observaciones, datos, clima, carga_vehicular, departamento_id, municipio_id } = req.body;

    const actividadActual = await ActividadModel.getById(id);
    if (!actividadActual) return res.status(404).json({ error: 'Actividad no encontrada' });

    const actividadCompleta = await ActividadModel.update(id, {
      km, sentido, ruta_id, latitud, longitud, observaciones, datos,
      clima, carga_vehicular, departamento_id, municipio_id,
    });

    return res.json({ actividad: actividadCompleta });
  } catch (error) {
    console.error('updateActividad:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// CERRAR ACTIVIDAD
// ========================================

export async function cerrarActividad(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const userId = req.user!.userId;

    const actividad = await ActividadModel.cerrar(id, userId);
    emitToAll('actividad:cerrada', actividad);

    return res.json({ message: 'Actividad cerrada', actividad });
  } catch (error) {
    console.error('cerrarActividad:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER ACTIVIDAD POR ID
// ========================================

export async function getActividad(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const actividad = await ActividadModel.getById(id);
    if (!actividad) return res.status(404).json({ error: 'Actividad no encontrada' });

    return res.json({ actividad });
  } catch (error) {
    console.error('getActividad:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// ACTIVIDADES DE MI UNIDAD HOY
// ========================================

export async function getMiUnidadHoy(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const rawId  = normalizeId(req.query.unidad_id as string | undefined);

    const ctx = await resolveContextoActivo(userId, { unidad_id: rawId });

    if (!ctx.unidad_id) {
      return res.json({ actividades: [], actividad_activa: null });
    }

    let salidaId: number | null = null;
    try {
      const salidaActiva = await SalidaModel.getSalidaActivaDeUnidad(ctx.unidad_id);
      salidaId = salidaActiva?.id ?? null;
    } catch { /* silencioso */ }

    const actividades      = await ActividadModel.getByUnidadHoy(ctx.unidad_id, salidaId);
    const actividad_activa = actividades.find(a => a.estado === 'ACTIVA') || null;

    return res.json({ actividades, actividad_activa });
  } catch (error) {
    console.error('getMiUnidadHoy:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBSERVACIONES TIMELINE
// ========================================

export async function addObservacion(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { observacion, hora_local } = req.body;
    const userId = req.user!.userId;

    if (!observacion) {
      return res.status(400).json({ error: 'La observación no puede estar vacía' });
    }

    const nuevoMensaje = await buildObservacionEntry(userId, observacion, hora_local);
    const actividadModificada = await ActividadModel.agregarObservacion(id, nuevoMensaje);

    emitToAll('actividad:actualizada', actividadModificada);

    return res.status(200).json({
      message:   'Observación agregada al timeline',
      actividad: actividadModificada,
    });
  } catch (error) {
    console.error('addObservacion (actividad):', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
