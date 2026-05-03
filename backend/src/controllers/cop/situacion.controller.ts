import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SituacionModel, SituacionUpdateData } from '../../models/cop/situacion.model';
import { SituacionDetalleModel } from '../../models/cop/situacionDetalle.model';
import { MultimediaModel } from '../../models/common/multimedia.model';
import { db } from '../../config/database';
import { normalizeId, buildObservacionEntry } from '../../utils/db.utils';
import {
  emitSituacionNueva,
  emitSituacionActualizada,
  emitSituacionCerrada,
} from '../../services/common/socket.service';

// ========================================
// CREAR SITUACIÓN
// ========================================

export async function createSituacion(req: Request, res: Response) {
  try {
    const {
      id: codigo_situacion,
      tipo_situacion,
      unidad_id,
      salida_unidad_id,
      turno_id,
      asignacion_id,
      ruta_id,
      km,
      sentido,
      latitud: latitudRaw,
      longitud: longitudRaw,
      coordenadas,
      observaciones,
      detalles,
      vehiculos,
      autoridades,
      tipo_situacion_id,
      tipo_hecho_id,
      tipo_asistencia_id,
      tipo_emergencia_id,
      clima,
      carga_vehicular,
      departamento_id,
      municipio_id,
      obstruccion,
      area,
      material_via,
      tipo_pavimento,
      heridos,
      fallecidos,
      hay_heridos,
      cantidad_heridos,
      hay_fallecidos,
      cantidad_fallecidos,
      vehiculos_involucrados,
      danios_materiales,
      danios_infraestructura,
      descripcion_danios_infra,
      grupo,
      acuerdo_involucrados,
      acuerdo_detalle,
      ilesos,
      heridos_leves,
      heridos_graves,
      trasladados,
      fugados,
      via_estado,
      via_topografia,
      via_geometria,
      via_peralte,
      via_condicion,
      causas,
    } = req.body;

    const latitud  = latitudRaw  ?? coordenadas?.latitude  ?? coordenadas?.latitud  ?? null;
    const longitud = longitudRaw ?? coordenadas?.longitude ?? coordenadas?.longitud ?? null;

    const tipo_situacion_id_final = normalizeId(
      tipo_hecho_id ?? tipo_asistencia_id ?? tipo_emergencia_id ?? tipo_situacion_id
    );
    const tipo_situacion_final = tipo_situacion === 'HECHO_TRANSITO' ? 'INCIDENTE' : tipo_situacion;
    const tipo_pavimento_final = tipo_pavimento ?? material_via ?? null;
    const heridosFinal    = heridos    ?? (hay_heridos    ? (cantidad_heridos    || 1) : 0);
    const fallecidosFinal = fallecidos ?? (hay_fallecidos ? (cantidad_fallecidos || 1) : 0);

    const userId      = req.user!.userId;
    const codigoFinal = codigo_situacion || `WEB-${uuidv4()}`;
    // buildObservacionEntry devuelve JSON string → parseamos para obtener [{hora,usuario,mensaje}]
    const observacionesIniciales: any[] = observaciones && String(observaciones).trim().length > 0
      ? JSON.parse(await buildObservacionEntry(userId, String(observaciones).trim()))
      : [];

    // ── Validación de duplicados ─────────────────────────────────────────────
    if (codigo_situacion) {
      const existente = await SituacionModel.findByCodigoSituacion(codigo_situacion);
      if (existente) {
        if (existente.km === km && existente.tipo_situacion === tipo_situacion) {
          return res.status(200).json({
            situacion: await SituacionModel.getById(existente.id),
            message: 'Situación ya registrada (idempotente)',
          });
        }
        return res.status(409).json({
          error: 'DUPLICATE_SITUACION',
          message: 'Conflicto de duplicado',
          situacion_existente: existente,
        });
      }
    }

    // ── Resolver contexto (unidad, ruta, salida, FK geo) ────────────────────
    const ctx = await SituacionModel.resolverContextoCreacion(userId, req.user!.rol, {
      unidadId:       normalizeId(unidad_id),
      salidaUnidadId: normalizeId(salida_unidad_id),
      turnoId:        normalizeId(turno_id),
      asignacionId:   normalizeId(asignacion_id),
      rutaId:         normalizeId(ruta_id),
      departamentoId: normalizeId(departamento_id),
      municipioId:    normalizeId(municipio_id),
    });

    if (!ctx.unidadId) return res.status(400).json({ error: 'unidad_id requerido (o no asignado a brigada)' });
    if (!ctx.rutaId)   return res.status(400).json({ error: 'ruta_id requerido (unidad sin ruta asignada ni salida activa con ruta)' });

    // ── Situación anterior activa (para cerrar en el tx) ────────────────────
    const anterior = await SituacionModel.getAnteriorActiva(ctx.unidadId);

    // ── Transacción completa ─────────────────────────────────────────────────
    const vehiculosList = vehiculos || vehiculos_involucrados;
    const { nuevaId, anteriorId } = await SituacionModel.crearCompleta({
      situacionData: {
        tipo_situacion:   tipo_situacion_final,
        unidad_id:        ctx.unidadId,
        salida_unidad_id: ctx.salidaId,
        turno_id:         ctx.turnoId,
        asignacion_id:    ctx.asignacionId,
        ruta_id:          ctx.rutaId,
        km, sentido, latitud, longitud, observaciones: observacionesIniciales,
        creado_por:       userId,
        codigo_situacion: codigoFinal,
        tipo_situacion_id:tipo_situacion_id_final,
        clima, carga_vehicular,
        departamento_id:  ctx.deptoId,
        municipio_id:     ctx.muniId,
        obstruccion_data: obstruccion,
        area,
        tipo_pavimento:   tipo_pavimento_final,
        heridos:          heridosFinal,
        fallecidos:       fallecidosFinal,
        danios_materiales, danios_infraestructura,
        danios_descripcion: descripcion_danios_infra,
        grupo:            grupo ? parseInt(grupo, 10) : null,
        fecha_hora_aviso:   new Date(),
        fecha_hora_llegada: new Date(),
        acuerdo_involucrados: acuerdo_involucrados ?? null,
        acuerdo_detalle:      acuerdo_detalle      ?? null,
        ilesos:         ilesos         ?? 0,
        heridos_leves:  heridos_leves  ?? 0,
        heridos_graves: heridos_graves ?? 0,
        trasladados:    trasladados    ?? 0,
        fugados:        fugados        ?? 0,
        via_estado:     via_estado     ?? null,
        via_topografia: via_topografia ?? null,
        via_geometria:  via_geometria  ?? null,
        via_peralte:    via_peralte    ?? null,
        via_condicion:  via_condicion  ?? null,
      },
      anteriorId:  anterior?.id ?? null,
      detalles:    Array.isArray(detalles)      ? detalles      : undefined,
      vehiculos:   Array.isArray(vehiculosList) ? vehiculosList : undefined,
      autoridades: Array.isArray(autoridades)   ? autoridades   : undefined,
      causas:      Array.isArray(causas) && causas.length ? causas : undefined,
    });

    // ── Post-commit: read + emits ────────────────────────────────────────────
    const full = await SituacionModel.getById(nuevaId);

    if (anteriorId) emitSituacionCerrada({ id: anteriorId, estado: 'CERRADA' } as any);
    if (full)       emitSituacionNueva(full as any);

    return res.status(201).json({ message: 'Situación creada', situacion: full });

  } catch (error) {
    if ((error as any).code === '23505' && req.body.id) {
      const existente = await SituacionModel.findByCodigoSituacion(req.body.id).catch(() => null);
      if (existente) return res.status(200).json({
        situacion: await SituacionModel.getById(existente.id),
        message: 'Situación ya registrada (idempotente)',
      });
    }
    console.error('createSituacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// GET SITUACIÓN
// ========================================

export async function getSituacion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    let situacionId: number;

    if (id.includes('-')) {
      const s = await SituacionModel.findByCodigoSituacion(id);
      if (!s) return res.status(404).json({ error: 'No encontrada' });
      situacionId = s.id;
    } else {
      const parsed = normalizeId(id);
      if (!parsed) return res.status(400).json({ error: 'ID inválido' });
      situacionId = parsed;
    }

    const situacion = await SituacionModel.getById(situacionId);
    if (!situacion) return res.status(404).json({ error: 'No encontrada' });

    let detalles: any = { vehiculos: [], autoridades: [], gruas: [], ajustadores: [] };
    try {
      detalles = await SituacionDetalleModel.getAllDetalles(situacionId);
    } catch (e) {
      console.warn('[getSituacion] Error en getAllDetalles:', e);
    }

    let multimedia: any[] = [];
    try {
      multimedia = await MultimediaModel.getBySituacionId(situacionId);
    } catch (e) {
      console.warn('[getSituacion] Error en multimedia:', e);
    }

    console.log(`[getSituacion] id=${situacionId} vehiculos=${detalles.vehiculos.length} multimedia=${multimedia.length}`);

    return res.json({
      situacion: {
        ...situacion,
        vehiculos_involucrados: detalles.vehiculos,
        autoridades: detalles.autoridades,
        gruas: detalles.gruas,
        ajustadores: detalles.ajustadores,
        multimedia,
      },
    });
  } catch (error) {
    console.error('getSituacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// UPDATE SITUACIÓN
// ========================================

export async function updateSituacion(req: Request, res: Response) {
  try {
    const situacionId = normalizeId(req.params.id);
    if (!situacionId) return res.status(400).json({ error: 'ID inválido' });
    const userId = req.user!.userId;

    const {
      km, sentido, latitud, longitud,
      area, material_via, clima, carga_vehicular,
      observaciones: observacionNueva,
      danios_materiales, danios_infraestructura, descripcion_danios_infra,
      obstruccion, obstruye,
      tipo_hecho_id, tipo_asistencia_id, tipo_emergencia_id,
      vehiculos_involucrados, vehiculos,
      gruas: gruasData, ajustadores: ajustadoresData, autoridades: autoridadesData,
      heridos, fallecidos,
      ilesos, heridos_leves, heridos_graves, trasladados, fugados,
      hay_heridos, cantidad_heridos, hay_fallecidos, cantidad_fallecidos,
      causa_probable, causa_especificar,
      tipo_pavimento, iluminacion, senalizacion, visibilidad, via_estado,
      via_topografia, via_geometria, via_peralte, via_condicion,
      acuerdo_involucrados, acuerdo_detalle,
      departamento_id, municipio_id,
    } = req.body;

    const tipo_situacion_id_final = normalizeId(tipo_hecho_id ?? tipo_asistencia_id ?? tipo_emergencia_id);
    const heridosFinal    = heridos    ?? (hay_heridos    ? (cantidad_heridos    || 1) : undefined);
    const fallecidosFinal = fallecidos ?? (hay_fallecidos ? (cantidad_fallecidos || 1) : undefined);
    const obstruccionFinal = obstruccion || (obstruye ? { obstruye } : undefined);

    let deptoIdFinal = normalizeId(departamento_id);
    let muniIdFinal  = normalizeId(municipio_id);
    if (deptoIdFinal) {
      const ok = await db.oneOrNone('SELECT id FROM departamento WHERE id = $1', [deptoIdFinal]);
      if (!ok) deptoIdFinal = null;
    }
    if (muniIdFinal) {
      const ok = await db.oneOrNone('SELECT id FROM municipio WHERE id = $1', [muniIdFinal]);
      if (!ok) muniIdFinal = null;
    }

    const campos: SituacionUpdateData = {
      actualizado_por: userId,
      km, sentido, latitud, longitud, area,
      tipo_pavimento: material_via || tipo_pavimento,
      clima, carga_vehicular,
      danios_materiales, danios_infraestructura, danios_descripcion: descripcion_danios_infra,
      obstruccion_data: obstruccionFinal,
      tipo_situacion_id: tipo_situacion_id_final,
      heridos: heridosFinal, fallecidos: fallecidosFinal,
      causa_probable, causa_especificar,
      iluminacion, senalizacion, visibilidad, via_estado,
      via_topografia, via_geometria, via_peralte, via_condicion,
      ilesos, heridos_leves, heridos_graves, trasladados, fugados,
      acuerdo_involucrados, acuerdo_detalle,
      departamento_id: deptoIdFinal,
      municipio_id: muniIdFinal,
    };

    const vehiculosData = vehiculos_involucrados || vehiculos;

    const full = await SituacionModel.actualizarCompleta(situacionId, {
      campos,
      vehiculos:   Array.isArray(vehiculosData)                              ? vehiculosData   : undefined,
      autoridades: Array.isArray(autoridadesData) && autoridadesData.length  ? autoridadesData : undefined,
      gruas:       Array.isArray(gruasData)       && gruasData.length        ? gruasData       : undefined,
      ajustadores: Array.isArray(ajustadoresData) && ajustadoresData.length  ? ajustadoresData : undefined,
    });
    // Append observación nueva si se envió (nunca sobreescribir el array JSONB completo)
    let fullFinal: any = full;
    if (observacionNueva && String(observacionNueva).trim().length > 0) {
      const entrada = await buildObservacionEntry(userId, String(observacionNueva).trim());
      fullFinal = await SituacionModel.agregarObservacion(situacionId, entrada);
    }

    if (fullFinal) emitSituacionActualizada(fullFinal as any);

    // Log en salida_evento (no bloquea si falla)
    const sitRow = fullFinal as any;
    if (sitRow?.salida_unidad_id) {
      db.none(
        `INSERT INTO salida_evento (salida_id, tipo, descripcion, datos_new, realizado_por)
         VALUES ($1, 'EDICION_SITUACION', $2, $3, $4)`,
        [sitRow.salida_unidad_id, `Situación #${situacionId} editada`,
         JSON.stringify({ situacion_id: situacionId }), userId]
      ).catch(() => {});
    }

    return res.json({ message: 'Actualizado', situacion: fullFinal });

  } catch (error) {
    console.error('updateSituacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// CERRAR / ELIMINAR / CAMBIAR TIPO
// ========================================

export async function cerrarSituacion(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { observaciones } = req.body;
    const userId = req.user!.userId;

    const situacion = await SituacionModel.cerrar(id, userId, observaciones);
    emitSituacionCerrada(situacion as any);

    const sit = situacion as any;
    if (sit?.salida_unidad_id) {
      db.none(
        `INSERT INTO salida_evento (salida_id, tipo, descripcion, datos_new, realizado_por)
         VALUES ($1, 'CIERRE_SITUACION', $2, $3, $4)`,
        [sit.salida_unidad_id, `Situación #${id} cerrada`,
         JSON.stringify({ situacion_id: id, observaciones: observaciones || null }), userId]
      ).catch(() => {});
    }

    return res.json({ message: 'Situación cerrada', situacion });
  } catch (error) {
    console.error('cerrarSituacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function deleteSituacion(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const ok = await SituacionModel.eliminar(id);
    if (!ok) return res.status(404).json({ error: 'Situación no encontrada' });
    return res.status(204).send();
  } catch (error) {
    console.error('deleteSituacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function cambiarTipoSituacion(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { nuevo_tipo } = req.body;
    const situacion = await SituacionModel.update(id, { tipo_situacion: nuevo_tipo } as any);
    return res.json({ message: 'Tipo cambiado', situacion });
  } catch (error) {
    console.error('cambiarTipoSituacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// DETALLES
// ========================================

export async function createDetalle(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { tipo_detalle, datos } = req.body;
    const detalle = await SituacionDetalleModel.createByTipo(id, tipo_detalle, datos);
    return res.status(201).json({ detalle });
  } catch (error) {
    console.error('createDetalle:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getDetalles(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    const detalles = await SituacionDetalleModel.getAllDetalles(id);
    return res.json({ detalles });
  } catch (error) {
    console.error('Error getDetalles:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateDetalle(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { tipo_detalle, datos } = req.body;
    const detalle = await SituacionDetalleModel.createByTipo(id, tipo_detalle || 'VEHICULO', datos);
    return res.json({ detalle });
  } catch (error) {
    console.error('updateDetalle:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function deleteDetalle(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { tipo_detalle } = req.query;
    await SituacionDetalleModel.deleteByTipo((tipo_detalle as string) || 'VEHICULO', id);
    return res.json({ message: 'Detalle eliminado' });
  } catch (error) {
    console.error('deleteDetalle:', error);
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

    const situacionModificada = await SituacionModel.agregarObservacion(id, nuevoMensaje);

    emitSituacionActualizada(situacionModificada as any);

    return res.status(200).json({ message: 'Observación agregada al timeline', situacion: situacionModificada });
  } catch (error) {
    console.error('addObservacion (situacion):', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// MARCAR COMO PERSISTENTE
// ========================================

export async function marcarPersistente(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const situacion = await SituacionModel.marcarPersistente(id);

    if (!situacion) return res.status(404).json({ error: 'Situación no encontrada' });

    emitSituacionActualizada(situacion);

    return res.status(200).json({ situacion });
  } catch (error) {
    console.error('marcarPersistente:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
