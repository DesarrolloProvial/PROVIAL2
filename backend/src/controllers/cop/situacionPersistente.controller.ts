/**
 * Controller: Situaciones Persistentes
 *
 * Una situación persistente ES una situación (situacion.persistente = true).
 * El COP puede promover una situación existente a persistente.
 *
 * Estados válidos para persistentes: ACTIVA | EN_PAUSA | FINALIZADA
 */

import { Request, Response } from 'express';
import { normalizeId } from '../../utils/db.utils';
import { SituacionPersistenteModel } from '../../models/cop/situacionPersistente.model';
import { emitSituacionActualizada } from '../../services/common/socket.service';

// ────────────────────────────────────────────────────────────────────────────
// CATÁLOGOS
// ────────────────────────────────────────────────────────────────────────────

export async function getTipos(_req: Request, res: Response) {
  return res.json([
    { value: 'EMERGENCIA',           label: 'Emergencia' },
    { value: 'INCIDENTE',            label: 'Hecho de Tránsito' },
    { value: 'ASISTENCIA_VEHICULAR', label: 'Asistencia Vehicular' },
    { value: 'REGULACION_TRAFICO',   label: 'Regulación de Tráfico' },
    { value: 'OTROS',                label: 'Otros' },
  ]);
}

export async function getTiposEmergencia(_req: Request, res: Response) {
  try {
    const tipos = await SituacionPersistenteModel.getTiposEmergencia();
    return res.json(tipos);
  } catch (error) {
    console.error('getTiposEmergencia:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// LISTADOS
// ────────────────────────────────────────────────────────────────────────────

export async function getSituacionesPersistentes(req: Request, res: Response) {
  try {
    const { estado, tipo, importancia } = req.query as Record<string, string>;
    const rutaIdRaw = req.query.ruta_id as string | undefined;
    let rutaId: number | undefined;
    if (rutaIdRaw) {
      const parsed = normalizeId(rutaIdRaw);
      if (!parsed) return res.status(400).json({ error: 'ruta_id inválido' });
      rutaId = parsed;
    }
    const rows = await SituacionPersistenteModel.listar({ estado, tipo, ruta_id: rutaId, importancia });
    return res.json(rows);
  } catch (error) {
    console.error('getSituacionesPersistentes:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getSituacionesPersistentesActivas(_req: Request, res: Response) {
  try {
    const rows = await SituacionPersistenteModel.listarActivas();
    return res.json(rows);
  } catch (error) {
    console.error('getSituacionesPersistentesActivas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// DETALLE
// ────────────────────────────────────────────────────────────────────────────

export async function getSituacionPersistente(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const detalle = await SituacionPersistenteModel.getDetalle(id);
    if (!detalle) return res.status(404).json({ error: 'Situación persistente no encontrada' });

    return res.json(detalle);
  } catch (error) {
    console.error('getSituacionPersistente:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// ACTUALIZAR
// ────────────────────────────────────────────────────────────────────────────

export async function actualizarSituacionPersistente(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const {
      titulo, descripcion, importancia,
      ruta_id, km_inicio, km_fin, sentido,
      jurisdiccion, fecha_fin_estimada, obstruccion,
    } = req.body;

    const resultado = await SituacionPersistenteModel.actualizar(id, {
      titulo, descripcion, importancia,
      ruta_id, km_inicio, km_fin, sentido,
      jurisdiccion, fecha_fin_estimada, obstruccion,
    });
    if (!resultado) return res.status(404).json({ error: 'Situación persistente no encontrada' });

    emitSituacionActualizada(resultado as any);
    return res.json({ situacion: resultado });
  } catch (error) {
    console.error('actualizarSituacionPersistente:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// CAMBIOS DE ESTADO
// ────────────────────────────────────────────────────────────────────────────

export async function pausarSituacion(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const ok = await SituacionPersistenteModel.pausar(id);
    if (!ok) return res.status(404).json({ error: 'Situación no encontrada o no está activa' });

    return res.json({ message: 'Situación pausada', id });
  } catch (error) {
    console.error('pausarSituacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function reactivarSituacion(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const ok = await SituacionPersistenteModel.reactivar(id);
    if (!ok) return res.status(404).json({ error: 'Situación no encontrada o no está pausada' });

    return res.json({ message: 'Situación reactivada', id });
  } catch (error) {
    console.error('reactivarSituacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function finalizarSituacion(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const ok = await SituacionPersistenteModel.finalizar(id);
    if (!ok) return res.status(404).json({ error: 'Situación no encontrada o ya finalizada' });

    return res.json({ message: 'Situación finalizada', id });
  } catch (error) {
    console.error('finalizarSituacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// ASIGNACIONES DE UNIDADES
// ────────────────────────────────────────────────────────────────────────────

export async function getAsignaciones(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const asignaciones = await SituacionPersistenteModel.getAsignaciones(id);
    return res.json(asignaciones);
  } catch (error) {
    console.error('getAsignaciones:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getHistorialAsignaciones(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const historial = await SituacionPersistenteModel.getHistorialAsignaciones(id);
    return res.json(historial);
  } catch (error) {
    console.error('getHistorialAsignaciones:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function asignarUnidad(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { unidad_id, asignacion_unidad_id, km_asignacion, observaciones_asignacion } = req.body;
    const unidadId = normalizeId(unidad_id);
    if (!unidadId) return res.status(400).json({ error: 'unidad_id requerido' });

    const asignacion = await SituacionPersistenteModel.asignarUnidad(
      id,
      {
        unidad_id: unidadId,
        asignacion_unidad_id: normalizeId(asignacion_unidad_id),
        km_asignacion: km_asignacion ?? null,
        observaciones_asignacion: observaciones_asignacion ?? null,
      },
      req.user!.userId,
    );
    return res.status(201).json(asignacion);
  } catch (error) {
    if ((error as any).status === 404) return res.status(404).json({ error: 'Situación persistente no encontrada o ya finalizada' });
    if ((error as any).status === 409) return res.status(409).json({ error: 'La unidad ya está asignada a esta situación' });
    console.error('asignarUnidad:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function desasignarUnidad(req: Request, res: Response) {
  try {
    const id       = normalizeId(req.params.id);
    const unidadId = normalizeId(req.params.unidadId);
    if (!id || !unidadId) return res.status(400).json({ error: 'IDs inválidos' });

    const ok = await SituacionPersistenteModel.desasignarUnidad(
      id, unidadId, req.body.observaciones_desasignacion ?? null,
    );
    if (!ok) return res.status(404).json({ error: 'Asignación activa no encontrada' });

    return res.json({ message: 'Unidad desasignada' });
  } catch (error) {
    console.error('desasignarUnidad:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// ACTUALIZACIONES (timeline de observaciones)
// ────────────────────────────────────────────────────────────────────────────

export async function getActualizaciones(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const s = await SituacionPersistenteModel.getObservaciones(id);
    if (!s) return res.status(404).json({ error: 'Situación no encontrada' });

    const obs: any[] = Array.isArray(s.observaciones) ? s.observaciones : [];
    const actualizaciones = obs.map((o: any, idx: number) => ({
      id: idx + 1,
      situacion_persistente_id: id,
      usuario_id:          o.usuario_id    ?? null,
      usuario_nombre:      o.firma         ?? o.usuario ?? 'Sistema',
      unidad_id:           o.unidad_id     ?? null,
      unidad_codigo:       o.unidad_codigo ?? null,
      tipo_actualizacion:  o.tipo          ?? 'OBSERVACION',
      contenido:           o.texto         ?? o.observacion ?? null,
      fecha_hora:          o.timestamp     ?? o.created_at  ?? null,
      puede_editarse:      false,
    }));

    return res.json(actualizaciones);
  } catch (error) {
    console.error('getActualizaciones:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function agregarActualizacion(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { tipo_actualizacion, contenido } = req.body;
    const userId = req.user!.userId;

    const entrada = JSON.stringify({
      usuario_id: userId,
      tipo:       tipo_actualizacion ?? 'OBSERVACION',
      texto:      contenido ?? null,
      timestamp:  new Date().toISOString(),
    });

    const ok = await SituacionPersistenteModel.agregarObservacion(id, entrada);
    if (!ok) return res.status(404).json({ error: 'Situación no encontrada' });

    return res.status(201).json({ message: 'Actualización registrada' });
  } catch (error) {
    console.error('agregarActualizacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// SUB-ENTIDADES
// ────────────────────────────────────────────────────────────────────────────

export async function getObstruccion(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const data = await SituacionPersistenteModel.getObstruccion(id);
    if (data === undefined) return res.status(404).json({ error: 'Situación no encontrada' });

    return res.json(data);
  } catch (error) {
    console.error('getObstruccion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getAutoridades(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const autoridades = await SituacionPersistenteModel.getAutoridades(id);
    return res.json(autoridades);
  } catch (error) {
    console.error('getAutoridades:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getSocorro(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const socorro = await SituacionPersistenteModel.getSocorro(id);
    return res.json(socorro);
  } catch (error) {
    console.error('getSocorro:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getMultimedia(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const multimedia = await SituacionPersistenteModel.getMultimedia(id);
    return res.json(multimedia);
  } catch (error) {
    console.error('getMultimedia:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function deleteMultimedia(req: Request, res: Response) {
  try {
    const id           = normalizeId(req.params.id);
    const multimediaId = normalizeId(req.params.multimediaId);
    if (!id || !multimediaId) return res.status(400).json({ error: 'IDs inválidos' });

    await SituacionPersistenteModel.deleteMultimedia(id, multimediaId);
    return res.status(204).send();
  } catch (error) {
    console.error('deleteMultimedia:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PROMOVER situación existente a persistente
// ────────────────────────────────────────────────────────────────────────────

export async function promover(req: Request, res: Response) {
  try {
    const situacionId = normalizeId(req.params.situacionId);
    if (!situacionId) return res.status(400).json({ error: 'ID inválido' });

    const { titulo, tipo_emergencia_id, importancia, descripcion } = req.body;

    const resultado = await SituacionPersistenteModel.promover(
      situacionId,
      { titulo, tipo_emergencia_id, importancia, descripcion },
      req.user!.userId,
    );

    emitSituacionActualizada(resultado as any);
    return res.json({ situacion: resultado });
  } catch (error) {
    if ((error as any).status === 404) return res.status(404).json({ error: 'Situación no encontrada' });
    if ((error as any).status === 409) return res.status(409).json({ error: 'La situación ya es persistente' });
    console.error('promover:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
