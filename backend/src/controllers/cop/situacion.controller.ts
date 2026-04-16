import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SituacionModel } from '../../models/cop/situacion.model';
import { SituacionDetalleModel } from '../../models/cop/situacionDetalle.model';
import { MultimediaModel } from '../../models/common/multimedia.model';
import { SalidaModel } from '../../models/common/salida.model';
import { UbicacionBrigadaModel } from '../../models/cop/ubicacionBrigada.model';
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
    const heridosFinal   = heridos   ?? (hay_heridos   ? (cantidad_heridos   || 1) : 0);
    const fallecidosFinal= fallecidos ?? (hay_fallecidos ? (cantidad_fallecidos || 1) : 0);

    const userId      = req.user!.userId;
    const codigoFinal = codigo_situacion || `WEB-${uuidv4()}`;

    // ── Validación de duplicados (lectura) ──────────────────────────────────
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

    // ── Resolver Unidad / Ruta / Salida (solo lecturas) ────────────────────
    let unidadFinal    = unidad_id;
    let turnoFinal     = turno_id;
    let asignacionFinal= asignacion_id;
    let rutaFinal      = ruta_id;

    if (!unidadFinal && salida_unidad_id) {
      try {
        const sal = await db.oneOrNone(
          'SELECT unidad_id, ruta_inicial_id FROM salida_unidad WHERE id = $1',
          [salida_unidad_id]
        );
        if (sal) {
          unidadFinal = sal.unidad_id;
          if (!rutaFinal) rutaFinal = sal.ruta_inicial_id;
        }
      } catch { /* silencioso */ }
    }

    if (req.user!.rol === 'BRIGADA' && (!unidadFinal || !rutaFinal)) {
      // 1. brigada_unidad (tabla legacy — capturado silenciosamente si no existe)
      try {
        const bu = await db.oneOrNone(`
          SELECT bu.unidad_id, s.id as salida_id, s.ruta_inicial_id
          FROM brigada_unidad bu
          LEFT JOIN salida_unidad s ON s.unidad_id = bu.unidad_id
            AND s.estado = 'EN_SALIDA'
            AND DATE(s.fecha_hora_salida) = CURRENT_DATE
          WHERE bu.brigada_id = $1 AND bu.activo = true
          ORDER BY bu.created_at DESC LIMIT 1
        `, [userId]);
        if (bu) {
          if (!unidadFinal) unidadFinal = bu.unidad_id;
          if (!rutaFinal)   rutaFinal   = bu.ruta_inicial_id;
        }
      } catch { /* silencioso */ }

      // 2. tripulacion_turno
      if (!unidadFinal || !rutaFinal) {
        try {
          const tt = await db.oneOrNone(`
            SELECT a.unidad_id, a.ruta_id, a.id as asignacion_id, a.turno_id
            FROM tripulacion_turno tc
            JOIN asignacion_unidad a ON tc.asignacion_id = a.id
            JOIN turno t ON a.turno_id = t.id
            WHERE tc.usuario_id = $1
              AND t.estado IN ('PLANIFICADO', 'ACTIVO')
              AND (t.fecha <= CURRENT_DATE AND (t.fecha_fin IS NULL OR t.fecha_fin >= CURRENT_DATE))
              AND a.hora_entrada_real IS NULL
            ORDER BY t.fecha DESC LIMIT 1
          `, [userId]);
          if (tt) {
            if (!unidadFinal)    unidadFinal    = tt.unidad_id;
            if (!rutaFinal)      rutaFinal      = tt.ruta_id;
            if (!turnoFinal)     turnoFinal     = tt.turno_id;
            if (!asignacionFinal)asignacionFinal= tt.asignacion_id;
          }
        } catch { /* silencioso */ }
      }

      // 3. ubicacion_brigada (préstamo a otra unidad)
      if (!unidadFinal) {
        const ub = await UbicacionBrigadaModel.getUbicacionActual(userId);
        if (ub) unidadFinal = ub.unidad_actual_id || ub.unidad_origen_id;
      }
    }

    if (!unidadFinal) {
      return res.status(400).json({ error: 'unidad_id requerido (o no asignado a brigada)' });
    }

    if (!rutaFinal && asignacionFinal) {
      const asig = await db.oneOrNone('SELECT ruta_id FROM asignacion_unidad WHERE id=$1', [asignacionFinal]);
      if (asig) rutaFinal = asig.ruta_id;
    }
    if (!rutaFinal) {
      const salidaActiva = await db.oneOrNone(
        `SELECT ruta_inicial_id FROM salida_unidad
         WHERE unidad_id = $1 AND estado = 'EN_SALIDA'
         ORDER BY created_at DESC LIMIT 1`,
        [unidadFinal]
      );
      if (salidaActiva?.ruta_inicial_id) rutaFinal = salidaActiva.ruta_inicial_id;
    }
    if (!rutaFinal) {
      return res.status(400).json({ error: 'ruta_id requerido (unidad sin ruta asignada ni salida activa con ruta)' });
    }

    // Buscar situación anterior activa (para cerrarla dentro de la tx)
    const anterior = await db.oneOrNone(
      "SELECT id FROM situacion WHERE unidad_id=$1 AND estado='ACTIVA' ORDER BY created_at DESC LIMIT 1",
      [unidadFinal]
    );

    // Buscar salida activa
    let salidaFinal = salida_unidad_id;
    if (!salidaFinal) {
      const sal = await SalidaModel.getMiSalidaActiva(userId);
      if (sal) salidaFinal = sal.salida_id;
    }
    if (!salidaFinal && unidadFinal) {
      const salUnidad = await db.oneOrNone(
        `SELECT id FROM salida_unidad WHERE unidad_id = $1 AND estado = 'EN_SALIDA' ORDER BY created_at DESC LIMIT 1`,
        [unidadFinal]
      );
      if (salUnidad) salidaFinal = salUnidad.id;
    }

    // Validar FK departamento / municipio
    let deptoIdFinal = normalizeId(departamento_id);
    let muniIdFinal  = normalizeId(municipio_id);
    if (deptoIdFinal) {
      const ok = await db.oneOrNone('SELECT id FROM departamento WHERE id = $1', [deptoIdFinal]);
      if (!ok) { console.warn(`[CREATE] departamento_id ${deptoIdFinal} no encontrado`); deptoIdFinal = null; }
    }
    if (muniIdFinal) {
      const ok = await db.oneOrNone('SELECT id FROM municipio WHERE id = $1', [muniIdFinal]);
      if (!ok) { console.warn(`[CREATE] municipio_id ${muniIdFinal} no encontrado`);    muniIdFinal  = null; }
    }

    const dataToCreate = {
      tipo_situacion: tipo_situacion_final,
      unidad_id: unidadFinal,
      salida_unidad_id: salidaFinal,
      turno_id: turnoFinal,
      asignacion_id: asignacionFinal,
      ruta_id: rutaFinal,
      km, sentido, latitud, longitud, observaciones,
      creado_por: userId,
      codigo_situacion: codigoFinal,
      tipo_situacion_id: tipo_situacion_id_final,
      clima, carga_vehicular,
      departamento_id: deptoIdFinal,
      municipio_id: muniIdFinal,
      obstruccion_data: obstruccion,
      area,
      tipo_pavimento: tipo_pavimento_final,
      heridos: heridosFinal,
      fallecidos: fallecidosFinal,
      danios_materiales, danios_infraestructura,
      danios_descripcion: descripcion_danios_infra,
      grupo: grupo ? parseInt(grupo, 10) : null,
      fecha_hora_aviso:  new Date(),
      fecha_hora_llegada: new Date(),
      acuerdo_involucrados: acuerdo_involucrados ?? null,
      acuerdo_detalle:      acuerdo_detalle      ?? null,
      ilesos:        ilesos        ?? 0,
      heridos_leves: heridos_leves ?? 0,
      heridos_graves:heridos_graves ?? 0,
      trasladados:   trasladados   ?? 0,
      fugados:       fugados       ?? 0,
      via_estado:     via_estado     ?? null,
      via_topografia: via_topografia ?? null,
      via_geometria:  via_geometria  ?? null,
      via_peralte:    via_peralte    ?? null,
      via_condicion:  via_condicion  ?? null,
    };

    // ── Todas las escrituras en una única transacción ───────────────────────
    const full = await db.tx(async t => {
      // 1. Cerrar situación anterior activa
      if (anterior) {
        await t.none(
          `UPDATE situacion
           SET estado = 'CERRADA', fecha_hora_finalizacion = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [anterior.id]
        );
        emitSituacionCerrada({ id: anterior.id, estado: 'CERRADA' } as any);
      }

      // 2. Crear situación principal
      const situacion = await SituacionModel.create(dataToCreate, t);

      // 3. Detalles (formato legacy del móvil)
      if (Array.isArray(detalles)) {
        for (const d of detalles) {
          await SituacionDetalleModel.createByTipo(situacion.id, d.tipo_detalle, d.datos, t);
        }
      }

      // 4. Vehículos
      const vehiculosList = vehiculos || vehiculos_involucrados;
      if (Array.isArray(vehiculosList)) {
        for (const v of vehiculosList) {
          await SituacionDetalleModel.addVehiculo(situacion.id, v, t);
        }
      }

      // 5. Autoridades
      if (Array.isArray(autoridades)) {
        for (const a of autoridades) {
          await SituacionDetalleModel.addAutoridad(situacion.id, a, t);
        }
      }

      // 6. Causas del hecho de tránsito
      if (Array.isArray(causas) && causas.length > 0) {
        try {
          for (const causaId of causas) {
            await t.none(
              'INSERT INTO situacion_causa (situacion_id, causa_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [situacion.id, causaId]
            );
          }
        } catch (e) {
          console.warn('situacion_causa insert failed (table may not exist):', e);
        }
      }

      return SituacionModel.getById(situacion.id);
    });

    if (full) emitSituacionNueva(full as any);
    return res.status(201).json({ message: 'Situación creada', situacion: full });

  } catch (error: any) {
    console.error('❌ [CREATE ERROR]:', error);
    return res.status(500).json({ error: 'Internal Error', detail: error.message });
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
      situacionId = parseInt(id, 10);
    }

    const situacion = await SituacionModel.getById(situacionId);
    if (!situacion) return res.status(404).json({ error: 'No encontrada' });

    let detalles: any = { vehiculos: [], autoridades: [], gruas: [], ajustadores: [] };
    try {
      detalles = await SituacionDetalleModel.getAllDetalles(situacionId);
    } catch (e: any) {
      console.warn('[getSituacion] Error en getAllDetalles:', e.message);
    }

    let multimedia: any[] = [];
    try {
      multimedia = await MultimediaModel.getBySituacionId(situacionId);
    } catch (e: any) {
      console.warn('[getSituacion] Error en multimedia:', e.message);
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
    console.error(error);
    return res.status(500).json({ error: 'Error' });
  }
}

// ========================================
// UPDATE SITUACIÓN
// ========================================

export async function updateSituacion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const situacionId = parseInt(id, 10);

    const {
      km, sentido, latitud, longitud,
      area, material_via, clima, carga_vehicular,
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

    const updateData: any = {
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
      ilesos, heridos_leves, heridos_graves, trasladados, fugados,
      acuerdo_involucrados, acuerdo_detalle,
      departamento_id: deptoIdFinal,
      municipio_id: muniIdFinal,
    };

    // ── Todas las escrituras en una única transacción ───────────────────────
    await db.tx(async t => {
      // 1. Update campos principales
      await SituacionModel.update(situacionId, updateData, t);

      // 2. Vehículos: delete-all + reinsert atómico
      const vehiculosData = vehiculos_involucrados || vehiculos;
      if (Array.isArray(vehiculosData)) {
        await t.none('DELETE FROM situacion_vehiculo WHERE situacion_id = $1', [situacionId]);
        for (const v of vehiculosData) {
          await SituacionDetalleModel.addVehiculo(situacionId, v, t);
        }
      }

      // 3. Autoridades: delete-all + reinsert atómico
      if (Array.isArray(autoridadesData) && autoridadesData.length > 0) {
        await t.none('DELETE FROM autoridad WHERE situacion_id = $1', [situacionId]);
        for (const a of autoridadesData) {
          const tipo = typeof a === 'string' ? a : (a.tipo || a);
          await SituacionDetalleModel.addAutoridad(situacionId, { tipo }, t);
        }
      }

      // 4. Grúas del primer vehículo
      if (Array.isArray(gruasData) && gruasData.length > 0) {
        const primerSv = await t.oneOrNone(
          'SELECT id FROM situacion_vehiculo WHERE situacion_id = $1 LIMIT 1',
          [situacionId]
        );
        if (primerSv) {
          await t.none('DELETE FROM vehiculo_grua WHERE situacion_vehiculo_id = $1', [primerSv.id]);
          for (const g of gruasData) {
            await SituacionDetalleModel.addGrua(primerSv.id, g, t);
          }
        }
      }

      // 5. Ajustadores del primer vehículo
      if (Array.isArray(ajustadoresData) && ajustadoresData.length > 0) {
        const primerSv = await t.oneOrNone(
          'SELECT id FROM situacion_vehiculo WHERE situacion_id = $1 LIMIT 1',
          [situacionId]
        );
        if (primerSv) {
          await t.none('DELETE FROM vehiculo_aseguradora WHERE situacion_vehiculo_id = $1', [primerSv.id]);
          for (const a of ajustadoresData) {
            await SituacionDetalleModel.addAjustador(primerSv.id, a, t);
          }
        }
      }
    });

    const full = await SituacionModel.getById(situacionId);
    if (full) emitSituacionActualizada(full as any);

    // Log en salida_evento (no bloquea si falla)
    const sitRow = full as any;
    if (sitRow?.salida_unidad_id) {
      db.none(
        `INSERT INTO salida_evento (salida_id, tipo, descripcion, datos_new, realizado_por)
         VALUES ($1, 'EDICION_SITUACION', $2, $3, $4)`,
        [sitRow.salida_unidad_id, `Situación #${situacionId} editada`,
         JSON.stringify({ situacion_id: situacionId }), userId]
      ).catch(() => {});
    }

    return res.json({ message: 'Actualizado', situacion: full });

  } catch (error: any) {
    console.error('Error update:', error);
    return res.status(500).json({ error: error.message || 'Error interno' });
  }
}

// ========================================
// CERRAR / ELIMINAR / CAMBIAR TIPO
// ========================================

export async function cerrarSituacion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;
    const userId = req.user!.userId;

    const situacion = await SituacionModel.cerrar(parseInt(id), userId, observaciones);
    emitSituacionCerrada(situacion as any);

    const sit = situacion as any;
    if (sit?.salida_unidad_id) {
      db.none(
        `INSERT INTO salida_evento (salida_id, tipo, descripcion, datos_new, realizado_por)
         VALUES ($1, 'CIERRE_SITUACION', $2, $3, $4)`,
        [sit.salida_unidad_id, `Situación #${id} cerrada`,
         JSON.stringify({ situacion_id: parseInt(id), observaciones: observaciones || null }), userId]
      ).catch(() => {});
    }

    return res.json({ message: 'Situación cerrada', situacion });
  } catch (error: any) {
    console.error('Error cerrarSituacion:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteSituacion(req: Request, res: Response) {
  try {
    await db.none('DELETE FROM situacion WHERE id = $1', [req.params.id]);
    return res.json({ message: 'Situación eliminada' });
  } catch (error: any) {
    console.error('Error deleteSituacion:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function cambiarTipoSituacion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { nuevo_tipo } = req.body;
    const situacion = await SituacionModel.update(parseInt(id), { tipo_situacion: nuevo_tipo } as any);
    return res.json({ message: 'Tipo cambiado', situacion });
  } catch (error: any) {
    console.error('Error cambiarTipoSituacion:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ========================================
// DETALLES
// ========================================

export async function createDetalle(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { tipo_detalle, datos } = req.body;
    const detalle = await SituacionDetalleModel.createByTipo(parseInt(id), tipo_detalle, datos);
    return res.status(201).json({ detalle });
  } catch (error: any) {
    console.error('Error createDetalle:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getDetalles(req: Request, res: Response) {
  try {
    const detalles = await SituacionDetalleModel.getAllDetalles(parseInt(req.params.id));
    return res.json({ detalles });
  } catch (error: any) {
    console.error('Error getDetalles:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function updateDetalle(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { tipo_detalle, datos } = req.body;
    const detalle = await SituacionDetalleModel.createByTipo(parseInt(id), tipo_detalle || 'VEHICULO', datos);
    return res.json({ detalle });
  } catch (error: any) {
    console.error('Error updateDetalle:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteDetalle(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { tipo_detalle } = req.query;
    await SituacionDetalleModel.deleteByTipo((tipo_detalle as string) || 'VEHICULO', parseInt(id));
    return res.json({ message: 'Detalle eliminado' });
  } catch (error: any) {
    console.error('Error deleteDetalle:', error);
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

    const situacionModificada = await db.one(
      `UPDATE situacion
       SET observaciones = COALESCE(observaciones, '[]'::jsonb) || $1::jsonb, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [nuevoMensaje, id],
    );

    emitSituacionActualizada(situacionModificada as any);

    return res.status(200).json({ message: 'Observación agregada al timeline', situacion: situacionModificada });
  } catch (error: any) {
    console.error('Error addObservacion:', error);
    return res.status(500).json({ error: error.message || 'Error interno al agregar observación' });
  }
}

// ========================================
// MARCAR COMO PERSISTENTE
// ========================================

export async function marcarPersistente(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const situacion = await db.oneOrNone(
      `UPDATE situacion SET persistente = true, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );

    if (!situacion) return res.status(404).json({ error: 'Situación no encontrada' });

    emitSituacionActualizada(situacion);

    return res.status(200).json({ situacion });
  } catch (error: any) {
    console.error('Error marcarPersistente:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
