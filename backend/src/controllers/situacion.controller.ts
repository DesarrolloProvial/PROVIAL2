import { Request, Response } from 'express';
import { SituacionModel } from '../models/situacion.model';
import { SituacionDetalleModel } from '../models/situacionDetalle.model';
import { MultimediaModel } from '../models/multimedia.model';
import { SalidaModel } from '../models/salida.model';
import { UbicacionBrigadaModel } from '../models/ubicacionBrigada.model';
import { ActividadModel } from '../models/actividad.model';
import { db } from '../config/database';
import {
  emitSituacionNueva,
  emitSituacionActualizada,
  emitSituacionCerrada,
} from '../services/socket.service';

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

      // Campos frontend
      vehiculos,
      autoridades,

      // Campos de catálogo
      tipo_situacion_id,
      tipo_hecho_id,
      tipo_asistencia_id,
      tipo_emergencia_id,

      // Contexto
      clima,
      carga_vehicular,
      departamento_id,
      municipio_id,
      obstruccion,
      area,
      material_via,
      tipo_pavimento,

      // Víctimas (consolidado)
      heridos,
      fallecidos,
      // Legacy (para compatibilidad)
      hay_heridos,
      cantidad_heridos,
      hay_fallecidos,
      cantidad_fallecidos,

      vehiculos_involucrados,
      danios_materiales,
      danios_infraestructura,
      descripcion_danios_infra,
      grupo,

      // Nuevos campos hecho de tránsito
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

    const normalizeId = (val: any): number | null => {
      if (val === '' || val === null || val === undefined) return null;
      const num = Number(val);
      return Number.isFinite(num) ? num : null;
    };

    const latitud = latitudRaw ?? coordenadas?.latitude ?? coordenadas?.latitud ?? null;
    const longitud = longitudRaw ?? coordenadas?.longitude ?? coordenadas?.longitud ?? null;

    const tipo_situacion_id_final = normalizeId(
      tipo_situacion_id ?? tipo_hecho_id ?? tipo_asistencia_id ?? tipo_emergencia_id
    );

    // Normalizar tipo_situacion: HECHO_TRANSITO -> INCIDENTE (constraint DB)
    const tipo_situacion_final = tipo_situacion === 'HECHO_TRANSITO' ? 'INCIDENTE' : tipo_situacion;

    const tipo_pavimento_final = tipo_pavimento ?? material_via ?? null;

    // Consolidar heridos/fallecidos (soporta ambos formatos)
    const heridosFinal = heridos ?? (hay_heridos ? (cantidad_heridos || 1) : 0);
    const fallecidosFinal = fallecidos ?? (hay_fallecidos ? (cantidad_fallecidos || 1) : 0);

    const userId = req.user!.userId;

    // Validación duplicados
    if (codigo_situacion) {
      const existente = await SituacionModel.findByCodigoSituacion(codigo_situacion);
      if (existente) {
        if (existente.km === km && existente.tipo_situacion === tipo_situacion) {
          return res.status(200).json({
            situacion: await SituacionModel.getById(existente.id),
            message: 'Situación ya registrada (idempotente)'
          });
        }
        return res.status(409).json({ error: 'DUPLICATE_SITUACION', message: 'Conflicto de duplicado', situacion_existente: existente });
      }
    }

    // Lógica de Unidad/Salida
    let unidadFinal = unidad_id;
    let turnoFinal = turno_id;
    let asignacionFinal = asignacion_id;
    let rutaFinal = ruta_id;

    // Si no viene unidad_id pero sí salida_unidad_id, obtener unidad de la salida
    if (!unidadFinal && salida_unidad_id) {
      try {
        const salida = await db.oneOrNone(
          'SELECT unidad_id, ruta_inicial_id FROM salida_unidad WHERE id = $1',
          [salida_unidad_id]
        );
        if (salida) {
          unidadFinal = salida.unidad_id;
          if (!rutaFinal) rutaFinal = salida.ruta_inicial_id;
        }
      } catch (e) { /* silencioso */ }
    }

    if (req.user!.rol === 'BRIGADA' && (!unidadFinal || !rutaFinal)) {
      // 1. brigada_unidad: asignación permanente del usuario a una unidad
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
          if (!rutaFinal) rutaFinal = bu.ruta_inicial_id;
        }
      } catch (e) { /* silencioso */ }

      // 2. tripulacion_turno: asignación por turno del día
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
            if (!unidadFinal) unidadFinal = tt.unidad_id;
            if (!rutaFinal) rutaFinal = tt.ruta_id;
            if (!turnoFinal) turnoFinal = tt.turno_id;
            if (!asignacionFinal) asignacionFinal = tt.asignacion_id;
          }
        } catch (e) { /* silencioso */ }
      }

      // 3. ubicacion_brigada (si está prestado a otra unidad)
      if (!unidadFinal) {
        const ubicacionActual = await UbicacionBrigadaModel.getUbicacionActual(userId);
        if (ubicacionActual) {
          unidadFinal = ubicacionActual.unidad_actual_id || ubicacionActual.unidad_origen_id;
        }
      }
    }

    if (!unidadFinal) return res.status(400).json({ error: 'unidad_id requerido (o no asignado a brigada)' });

    if (!rutaFinal && asignacionFinal) {
      const asig = await db.oneOrNone('SELECT ruta_id FROM asignacion_unidad WHERE id=$1', [asignacionFinal]);
      if (asig) rutaFinal = asig.ruta_id;
    }
    if (!rutaFinal) return res.status(400).json({ error: 'ruta_id requerido' });

    // Cerrar anterior activa
    const anterior = await db.oneOrNone("SELECT id FROM situacion WHERE unidad_id=$1 AND estado='ACTIVA' ORDER BY created_at DESC LIMIT 1", [unidadFinal]);
    if (anterior) {
      await SituacionModel.cerrar(anterior.id, userId, `Cierre auto por nueva ${tipo_situacion}`);
      emitSituacionCerrada({ id: anterior.id, estado: 'CERRADA' } as any);
    }

    // Buscar salida activa
    let salidaFinal = salida_unidad_id;
    if (!salidaFinal) {
      const sal = await SalidaModel.getMiSalidaActiva(userId);
      if (sal) salidaFinal = sal.salida_id;
    }

    // Validar que departamento_id y municipio_id existan en DB antes de usarlos
    let deptoIdFinal = normalizeId(departamento_id);
    let muniIdFinal = normalizeId(municipio_id);
    if (deptoIdFinal) {
      const deptoExists = await db.oneOrNone('SELECT id FROM departamento WHERE id = $1', [deptoIdFinal]);
      if (!deptoExists) deptoIdFinal = null;
    }
    if (muniIdFinal) {
      const muniExists = await db.oneOrNone('SELECT id FROM municipio WHERE id = $1', [muniIdFinal]);
      if (!muniExists) muniIdFinal = null;
    }

    const dataToCreate = {
      tipo_situacion: tipo_situacion_final,
      unidad_id: unidadFinal,
      salida_unidad_id: salidaFinal,
      turno_id: turnoFinal,
      asignacion_id: asignacionFinal,
      ruta_id: rutaFinal,
      km,
      sentido,
      latitud,
      longitud,
      observaciones,
      creado_por: userId,
      codigo_situacion,

      tipo_situacion_id: tipo_situacion_id_final,
      clima,
      carga_vehicular,
      departamento_id: deptoIdFinal,
      municipio_id: muniIdFinal,
      obstruccion_data: obstruccion,
      area,
      tipo_pavimento: tipo_pavimento_final,
      heridos: heridosFinal,
      fallecidos: fallecidosFinal,
      danios_materiales,
      danios_infraestructura,
      danios_descripcion: descripcion_danios_infra,
      grupo: grupo ? parseInt(grupo, 10) : null,
      fecha_hora_aviso: new Date(),
      fecha_hora_llegada: new Date(),

      // Nuevos campos hecho de tránsito
      acuerdo_involucrados: acuerdo_involucrados ?? null,
      acuerdo_detalle: acuerdo_detalle ?? null,
      ilesos: ilesos ?? 0,
      heridos_leves: heridos_leves ?? 0,
      heridos_graves: heridos_graves ?? 0,
      trasladados: trasladados ?? 0,
      fugados: fugados ?? 0,
      via_estado: via_estado ?? null,
      via_topografia: via_topografia ?? null,
      via_geometria: via_geometria ?? null,
      via_peralte: via_peralte ?? null,
      via_condicion: via_condicion ?? null,
    };

    const situacion = await SituacionModel.create(dataToCreate);

    // Persistir Detalles (legacy format -> tablas relacionales)
    if (detalles && Array.isArray(detalles)) {
      for (const d of detalles) {
        await SituacionDetalleModel.createByTipo(situacion.id, d.tipo_detalle, d.datos);
      }
    }

    // Persistir Vehiculos en tablas relacionales
    const vehiculosList = vehiculos || vehiculos_involucrados;
    if (vehiculosList && Array.isArray(vehiculosList)) {
      for (const v of vehiculosList) {
        await SituacionDetalleModel.addVehiculo(situacion.id, v);
      }
    }

    // Persistir Autoridades en tabla relacional
    if (autoridades && Array.isArray(autoridades)) {
      for (const a of autoridades) {
        await SituacionDetalleModel.addAutoridad(situacion.id, a);
      }
    }

    // Persistir Causas del hecho de tránsito
    if (causas && Array.isArray(causas) && causas.length > 0) {
      try {
        for (const causaId of causas) {
          await db.none(
            `INSERT INTO situacion_causa (situacion_id, causa_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [situacion.id, causaId]
          );
        }
      } catch (e) {
        console.warn('situacion_causa insert failed (table may not exist):', e);
      }
    }

    const full = await SituacionModel.getById(situacion.id);
    if (full) emitSituacionNueva(full as any);

    return res.status(201).json({
      message: 'Situación creada',
      situacion: full
    });

  } catch (error: any) {
    console.error('❌ [CREATE ERROR]:', error);
    return res.status(500).json({ error: 'Internal Error', detail: error.message });
  }
}

// ========================================
// GET SITUACION
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

    // Detalles y multimedia tolerantes a fallos
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

    console.log(`[getSituacion] id=${situacionId} vehiculos=${detalles.vehiculos.length} multimedia=${multimedia.length} tipo_situacion_id=${situacion.tipo_situacion_id}`);
    if (detalles.vehiculos.length > 0) {
      const v = detalles.vehiculos[0];
      console.log(`[getSituacion] vehiculo[0]: tipo_vehiculo_nombre=${v.tipo_vehiculo_nombre} marca_nombre=${v.marca_nombre} placa=${v.placa}`);
    }
    if (multimedia.length > 0) {
      console.log(`[getSituacion] multimedia[0]: tipo=${multimedia[0].tipo} url_original=${multimedia[0].url_original?.substring(0, 60)}`);
    }

    const situacionResponse = {
      ...situacion,
      vehiculos_involucrados: detalles.vehiculos,
      autoridades: detalles.autoridades,
      gruas: detalles.gruas,
      ajustadores: detalles.ajustadores,
      multimedia
    };

    return res.json({ situacion: situacionResponse });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error' });
  }
}

// ========================================
// UPDATE SITUACION
// ========================================

export async function updateSituacion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const situacionId = parseInt(id, 10);

    const {
      km, sentido, latitud, longitud, observaciones,
      area, material_via, clima, carga_vehicular,
      danios_materiales, danios_infraestructura, descripcion_danios_infra,
      obstruccion, obstruye,
      tipo_hecho_id, tipo_asistencia_id, tipo_emergencia_id,
      vehiculos_involucrados, vehiculos,
      gruas: gruasData, ajustadores: ajustadoresData, autoridades: autoridadesData,
      // Víctimas (consolidado)
      heridos,
      fallecidos,
      ilesos, heridos_leves, heridos_graves, trasladados, fugados,
      // Legacy
      hay_heridos, cantidad_heridos, hay_fallecidos, cantidad_fallecidos,
      causa_probable, causa_especificar,
      tipo_pavimento, iluminacion, senalizacion, visibilidad, via_estado,
      acuerdo_involucrados, acuerdo_detalle,
      departamento_id, municipio_id,
    } = req.body;

    const normalizeId = (v: any): number | null => {
      if (v === '' || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const tipo_situacion_id_final = normalizeId(
      tipo_hecho_id ?? tipo_asistencia_id ?? tipo_emergencia_id
    );

    // Consolidar heridos/fallecidos
    const heridosFinal = heridos ?? (hay_heridos ? (cantidad_heridos || 1) : undefined);
    const fallecidosFinal = fallecidos ?? (hay_fallecidos ? (cantidad_fallecidos || 1) : undefined);

    // Normalizar obstruccion (puede venir como 'obstruccion' o 'obstruye')
    const obstruccionFinal = obstruccion || (obstruye ? { obstruye } : undefined);

    // Validar FK de departamento/municipio
    let deptoIdFinal = normalizeId(departamento_id);
    let muniIdFinal = normalizeId(municipio_id);
    if (deptoIdFinal) {
      const deptoExists = await db.oneOrNone('SELECT id FROM departamento WHERE id = $1', [deptoIdFinal]);
      if (!deptoExists) deptoIdFinal = null;
    }
    if (muniIdFinal) {
      const muniExists = await db.oneOrNone('SELECT id FROM municipio WHERE id = $1', [muniIdFinal]);
      if (!muniExists) muniIdFinal = null;
    }

    const updateData: any = {
      actualizado_por: userId,
      km, sentido, latitud, longitud, observaciones,
      area,
      tipo_pavimento: material_via || tipo_pavimento,
      clima, carga_vehicular,
      danios_materiales, danios_infraestructura, danios_descripcion: descripcion_danios_infra,
      obstruccion_data: obstruccionFinal,
      tipo_situacion_id: tipo_situacion_id_final,
      heridos: heridosFinal,
      fallecidos: fallecidosFinal,
      causa_probable, causa_especificar,
      iluminacion, senalizacion, visibilidad, via_estado,
      ilesos, heridos_leves, heridos_graves, trasladados, fugados,
      acuerdo_involucrados, acuerdo_detalle,
      departamento_id: deptoIdFinal,
      municipio_id: muniIdFinal,
    };

    await SituacionModel.update(situacionId, updateData);

    // Persistir vehiculos actualizados en tablas relacionales
    // Primero eliminar los existentes para evitar duplicados al editar
    const vehiculosData = vehiculos_involucrados || vehiculos;
    if (vehiculosData && Array.isArray(vehiculosData)) {
      const existentes = await db.manyOrNone(
        'SELECT id FROM situacion_vehiculo WHERE situacion_id = $1',
        [situacionId]
      );
      for (const sv of existentes) {
        await SituacionDetalleModel.deleteVehiculo(sv.id);
      }
      for (const v of vehiculosData) {
        await SituacionDetalleModel.addVehiculo(situacionId, v);
      }
    }

    // Persistir autoridades
    if (autoridadesData && Array.isArray(autoridadesData) && autoridadesData.length > 0) {
      // Borrar existentes
      const authExist = await db.manyOrNone(
        'SELECT id FROM autoridad WHERE situacion_id = $1',
        [situacionId]
      );
      for (const a of authExist) {
        await SituacionDetalleModel.deleteAutoridad(a.id);
      }
      // Insertar nuevas
      for (const a of autoridadesData) {
        const tipo = typeof a === 'string' ? a : (a.tipo || a);
        await SituacionDetalleModel.addAutoridad(situacionId, { tipo });
      }
    }

    // Persistir gruas (top-level, vinculadas al primer vehiculo)
    if (gruasData && Array.isArray(gruasData) && gruasData.length > 0) {
      const primerSv = await db.oneOrNone(
        'SELECT id FROM situacion_vehiculo WHERE situacion_id = $1 LIMIT 1',
        [situacionId]
      );
      if (primerSv) {
        // Borrar gruas existentes del primer vehiculo
        await db.none('DELETE FROM vehiculo_grua WHERE situacion_vehiculo_id = $1', [primerSv.id]);
        for (const g of gruasData) {
          await SituacionDetalleModel.addGrua(primerSv.id, g);
        }
      }
    }

    // Persistir ajustadores (top-level, vinculados al primer vehiculo)
    if (ajustadoresData && Array.isArray(ajustadoresData) && ajustadoresData.length > 0) {
      const primerSv = await db.oneOrNone(
        'SELECT id FROM situacion_vehiculo WHERE situacion_id = $1 LIMIT 1',
        [situacionId]
      );
      if (primerSv) {
        await db.none('DELETE FROM vehiculo_aseguradora WHERE situacion_vehiculo_id = $1', [primerSv.id]);
        for (const a of ajustadoresData) {
          await SituacionDetalleModel.addAjustador(primerSv.id, a);
        }
      }
    }

    const full = await SituacionModel.getById(situacionId);
    if (full) emitSituacionActualizada(full as any);

    return res.json({ message: 'Actualizado', situacion: full });

  } catch (error: any) {
    console.error('Error update:', error);
    return res.status(500).json({ error: error.message || 'Error interno' });
  }
}

// ========================================
// LIST / MAPAS / BITACORA
// ========================================

export async function listSituaciones(req: Request, res: Response) {
  const filters = req.query;
  const list = await SituacionModel.list(filters);
  return res.json({ situaciones: list, count: list.length });
}

export async function getMiUnidadHoy(req: Request, res: Response) {
  const userId = req.user!.userId;

  // 1. Si el mobile envía unidad_id como query param, usar directamente
  let unidadId: number | null = req.query.unidad_id ? Number(req.query.unidad_id) : null;

  // 2. Buscar en brigada_unidad
  if (!unidadId) {
    try {
      const bu = await db.oneOrNone(
        'SELECT unidad_id FROM brigada_unidad WHERE brigada_id = $1 AND activo = true ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      if (bu) unidadId = bu.unidad_id;
    } catch (e) { }
  }

  // 3. Fallback: última situación creada por este usuario (sin filtro de fecha)
  if (!unidadId) {
    try {
      const s = await db.oneOrNone(
        'SELECT unidad_id FROM situacion WHERE creado_por = $1 ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      if (s) unidadId = s.unidad_id;
    } catch (e) { }
  }

  if (!unidadId) return res.json({ situaciones: [], situacion_activa: null });

  // 3. Traer lista de situaciones de hoy (bitácora)
  const list = await SituacionModel.getMiUnidadHoy(unidadId);

  // 4. Buscar situación activa desde situacion_actual
  let situacionActiva: any = null;
  try {
    const cache = await db.oneOrNone(
      "SELECT situacion_id FROM situacion_actual WHERE unidad_id = $1 AND estado = 'ACTIVA'",
      [unidadId]
    );

    if (cache && cache.situacion_id) {
      situacionActiva = list.find((s: any) => s.id === cache.situacion_id) || null;

      if (!situacionActiva) {
        // Situación activa no está en la lista de hoy (puede ser de otro día)
        situacionActiva = await db.oneOrNone(`
          SELECT s.*,
            r.codigo as ruta_codigo,
            r.nombre as ruta_nombre,
            tsc.nombre as tipo_situacion_nombre,
            tsc.categoria as tipo_situacion_categoria,
            s.tipo_pavimento as material_via,
            COALESCE(
              (SELECT json_agg(json_build_object(
                'id', sm.id, 'tipo', sm.tipo, 'orden', sm.orden,
                'url', sm.url_original, 'thumbnail', sm.url_thumbnail,
                'infografia_numero', sm.infografia_numero,
                'infografia_titulo', sm.infografia_titulo
              ) ORDER BY sm.infografia_numero, sm.tipo, sm.orden)
              FROM situacion_multimedia sm WHERE sm.situacion_id = s.id),
              '[]'
            ) as multimedia,
            (SELECT COUNT(*) FROM situacion_multimedia WHERE situacion_id = s.id AND tipo = 'FOTO') as total_fotos,
            (SELECT COUNT(*) FROM situacion_multimedia WHERE situacion_id = s.id AND tipo = 'VIDEO') as total_videos
          FROM situacion s
          LEFT JOIN ruta r ON s.ruta_id = r.id
          LEFT JOIN catalogo_tipo_situacion tsc ON s.tipo_situacion_id = tsc.id
          WHERE s.id = $1
        `, [cache.situacion_id]);
      }
    }
  } catch (e: any) {
    console.warn('[getMiUnidadHoy] Error buscando situacion activa:', e.message);
  }

  // Fallback: primera situación ACTIVA en la lista de hoy
  if (!situacionActiva) {
    situacionActiva = list.find((s: any) => s.estado === 'ACTIVA') || null;
  }

  // También buscar actividad activa de esta unidad
  let actividadActiva: any = null;
  let actividadesHoy: any[] = [];
  try {
    actividadesHoy = await ActividadModel.getByUnidadHoy(unidadId);
    actividadActiva = actividadesHoy.find((a: any) => a.estado === 'ACTIVA') || null;
  } catch (e: any) {
    console.warn('[getMiUnidadHoy] Error buscando actividades:', e.message);
  }

  return res.json({
    situaciones: list,
    situacion_activa: situacionActiva,
    actividades: actividadesHoy,
    actividad_activa: actividadActiva,
  });
}

export async function getMapaSituaciones(_req: Request, res: Response) {
  const list = await SituacionModel.getUltimaSituacionPorUnidad();
  return res.json({ unidades: list });
}

export async function getBitacoraUnidad(req: Request, res: Response) {
  const list = await SituacionModel.getBitacoraUnidad(parseInt(req.params.unidad_id), req.query);
  return res.json({ bitacora: list });
}

// ========================================
// FUNCIONES ADICIONALES
// ========================================

export async function listSituacionesActivas(_req: Request, res: Response) {
  try {
    const activas = await db.manyOrNone(`
      SELECT s.*, u.codigo as unidad_codigo, r.codigo as ruta_codigo
      FROM situacion s
      LEFT JOIN unidad u ON s.unidad_id = u.id
      LEFT JOIN ruta r ON s.ruta_id = r.id
      WHERE s.estado = 'ACTIVA'
      ORDER BY s.created_at DESC
    `);
    return res.json({ situaciones: activas });
  } catch (error: any) {
    console.error('Error listSituacionesActivas:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getTiposSituacion(_req: Request, res: Response) {
  const tipos = [
    { id: 10, codigo: 'SALIDA_SEDE', nombre: 'Salida de Sede' },
    { id: 20, codigo: 'PATRULLAJE', nombre: 'Patrullaje' },
    { id: 30, codigo: 'CAMBIO_RUTA', nombre: 'Cambio de Ruta' },
    { id: 40, codigo: 'PARADA_ESTRATEGICA', nombre: 'Parada Estratégica' },
    { id: 50, codigo: 'COMIDA', nombre: 'Comida' },
    { id: 60, codigo: 'DESCANSO', nombre: 'Descanso' },
    { id: 70, codigo: 'INCIDENTE', nombre: 'Hecho de Tránsito' },
    { id: 80, codigo: 'REGULACION_TRAFICO', nombre: 'Regulación de Tráfico' },
    { id: 90, codigo: 'ASISTENCIA_VEHICULAR', nombre: 'Asistencia Vehicular' },
    { id: 100, codigo: 'EMERGENCIA', nombre: 'Emergencia' },
    { id: 110, codigo: 'OTROS', nombre: 'Otros' },
  ];
  return res.json({ tipos });
}

export async function cerrarSituacion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;
    const userId = req.user!.userId;

    const situacion = await SituacionModel.cerrar(parseInt(id), userId, observaciones);
    emitSituacionCerrada(situacion as any);

    return res.json({ message: 'Situación cerrada', situacion });
  } catch (error: any) {
    console.error('Error cerrarSituacion:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteSituacion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await db.none('DELETE FROM situacion WHERE id = $1', [id]);
    return res.json({ message: 'Situación eliminada' });
  } catch (error: any) {
    console.error('Error deleteSituacion:', error);
    return res.status(500).json({ error: error.message });
  }
}

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
    const { id } = req.params;
    const detalles = await SituacionDetalleModel.getAllDetalles(parseInt(id));
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

    // Para updates, crear nuevo registro (las tablas relacionales no tienen update generico)
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

export async function getResumenUnidades(_req: Request, res: Response) {
  try {
    const resumen = await db.manyOrNone(`
      SELECT
        u.id as unidad_id,
        u.codigo as unidad_codigo,
        u.tipo_unidad,
        u.sede_id,
        se.nombre as sede_nombre,

        -- Datos de situacion_actual (cache)
        sa.situacion_id,
        sa.tipo_situacion as ultima_situacion,
        sa.estado as estado_situacion,
        sa.latitud,
        sa.longitud,
        sa.km,
        sa.sentido,
        sa.ruta_id as sa_ruta_id,
        sa.ruta_codigo,
        sa.situacion_created_at,
        sa.icono,

        -- Actividad
        sa.actividad_id,
        sa.actividad_tipo_nombre,
        sa.actividad_estado,
        sa.actividad_created_at,
        sa.updated_at as sa_updated_at,

        -- Datos extra de la situación (si es situacion)
        s_ref.observaciones as situacion_observaciones,
        s_ref.clima,
        s_ref.carga_vehicular,
        s_ref.obstruccion_data,

        -- Datos extra de la actividad (si es actividad)
        a_ref.observaciones as actividad_observaciones,
        a_ref.datos as actividad_datos,

        -- Catálogo situación
        cts_sit.icono as situacion_icono,
        cts_sit.color as situacion_color,
        cts_sit.nombre as situacion_nombre,

        -- Catálogo actividad
        cts_act.icono as tipo_actividad_icono,
        cts_act.color as tipo_actividad_color,
        cts_act.nombre as tipo_actividad_nombre,

        -- Multimedia (solo para situaciones)
        CASE WHEN sa.situacion_id IS NOT NULL THEN
          (SELECT sm.url_thumbnail
           FROM situacion_multimedia sm
           WHERE sm.situacion_id = sa.situacion_id AND sm.tipo = 'FOTO'
           ORDER BY sm.infografia_numero, sm.orden LIMIT 1)
        ELSE NULL END as foto_preview,
        CASE WHEN sa.situacion_id IS NOT NULL THEN
          (SELECT COUNT(*)::int
           FROM situacion_multimedia sm
           WHERE sm.situacion_id = sa.situacion_id AND sm.tipo = 'FOTO')
        ELSE 0 END as total_fotos,
        CASE WHEN sa.situacion_id IS NOT NULL THEN
          (SELECT json_agg(json_build_object(
            'id', sm.id,
            'url', sm.url_original,
            'thumbnail', sm.url_thumbnail,
            'orden', sm.orden,
            'infografia_numero', sm.infografia_numero,
            'infografia_titulo', sm.infografia_titulo
          ) ORDER BY sm.infografia_numero, sm.orden)
           FROM situacion_multimedia sm
           WHERE sm.situacion_id = sa.situacion_id AND sm.tipo = 'FOTO')
        ELSE NULL END as fotos

      FROM unidad u
      INNER JOIN salida_unidad su ON u.id = su.unidad_id
        AND su.estado = 'EN_SALIDA'
      LEFT JOIN sede se ON u.sede_id = se.id
      LEFT JOIN situacion_actual sa ON u.id = sa.unidad_id
      LEFT JOIN situacion s_ref ON sa.situacion_id = s_ref.id
      LEFT JOIN catalogo_tipo_situacion cts_sit ON s_ref.tipo_situacion_id = cts_sit.id
      LEFT JOIN actividad a_ref ON sa.actividad_id = a_ref.id
      LEFT JOIN catalogo_tipo_situacion cts_act ON a_ref.tipo_actividad_id = cts_act.id
      WHERE u.activa = true
      ORDER BY u.codigo
    `);

    // Unificar campos: determinar si la info actual es situacion o actividad
    const resumenFinal = resumen.map((r: any) => {
      const esSituacion = !!r.situacion_id;
      const esActividad = !esSituacion && !!r.actividad_id;

      return {
        ...r,
        // Icono/color/nombre unificados
        situacion_icono: esSituacion ? r.situacion_icono : (r.tipo_actividad_icono || r.icono || null),
        situacion_color: esSituacion ? r.situacion_color : (r.tipo_actividad_color || null),
        situacion_nombre: esSituacion ? r.situacion_nombre : (r.tipo_actividad_nombre || r.actividad_tipo_nombre || null),
        ultima_situacion: esSituacion ? r.ultima_situacion : (r.tipo_actividad_nombre || r.actividad_tipo_nombre || null),
        // Observaciones unificadas
        observaciones: esSituacion ? r.situacion_observaciones : (esActividad ? r.actividad_observaciones : null),
        // Estado unificado: si tiene algo activo
        estado_situacion: esSituacion ? r.estado_situacion : (esActividad ? r.actividad_estado : null),
        // Tipo: 'SITUACION' o 'ACTIVIDAD' para que el frontend sepa
        tipo_registro: esSituacion ? 'SITUACION' : (esActividad ? 'ACTIVIDAD' : null),
        // Timestamp unificado
        created_at: esSituacion ? r.situacion_created_at : (esActividad ? r.actividad_created_at : null),
      };
    });

    return res.json({ resumen: resumenFinal });
  } catch (error: any) {
    console.error('Error getResumenUnidades:', error);
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

export async function getCatalogo(_req: Request, res: Response) {
  try {
    // Tabla unificada: catalogo_tipo_situacion
    // Excluir HECHO_TRANSITO, ASISTENCIA y EMERGENCIA (tienen pantallas dedicadas)
    const tipos = await db.manyOrNone(`
      SELECT id, categoria, nombre, icono, color, formulario_tipo
      FROM catalogo_tipo_situacion
      WHERE activo = true
        AND categoria NOT IN ('HECHO_TRANSITO', 'ASISTENCIA', 'EMERGENCIA')
      ORDER BY categoria, nombre
    `);

    // Nombres legibles por categoría
    const categoriaNombres: Record<string, string> = {
      'OPERATIVO': 'Operativo',
      'APOYO': 'Apoyo',
      'ADMINISTRATIVO': 'Administrativo',
    };

    // Código para colores en el frontend
    const categoriaCodigos: Record<string, string> = {
      'OPERATIVO': 'OPERATIVO',
      'APOYO': 'APOYO',
      'ADMINISTRATIVO': 'ADMINISTRATIVO',
    };

    // Agrupar por categoría
    const categoriasMap = new Map<string, any>();
    for (const tipo of tipos) {
      const cat = tipo.categoria;
      if (!categoriasMap.has(cat)) {
        categoriasMap.set(cat, {
          id: cat,
          codigo: categoriaCodigos[cat] || cat,
          nombre: categoriaNombres[cat] || cat,
          tipos: [],
        });
      }
      categoriasMap.get(cat).tipos.push({
        id: tipo.id,
        nombre: tipo.nombre,
        icono: tipo.icono,
        color: tipo.color,
        formulario_tipo: tipo.formulario_tipo,
      });
    }

    const catalogo = Array.from(categoriasMap.values());
    return res.json(catalogo);
  } catch (error: any) {
    console.error('Error getCatalogo:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getCatalogosAuxiliares(_req: Request, res: Response) {
  try {
    // Tabla unificada: catalogo_tipo_situacion
    const tipos_hecho = await db.manyOrNone(
      "SELECT id, nombre, icono, color FROM catalogo_tipo_situacion WHERE categoria = 'HECHO_TRANSITO' AND activo = true ORDER BY nombre"
    );
    const tipos_asistencia = await db.manyOrNone(
      "SELECT id, nombre, icono, color FROM catalogo_tipo_situacion WHERE categoria = 'ASISTENCIA' AND activo = true ORDER BY nombre"
    );
    const tipos_emergencia = await db.manyOrNone(
      "SELECT id, nombre, icono, color FROM catalogo_tipo_situacion WHERE categoria = 'EMERGENCIA' AND activo = true ORDER BY nombre"
    );

    // Catálogos básicos (para sync mobile)
    const tipos_vehiculo = await db.manyOrNone("SELECT id, nombre FROM tipo_vehiculo ORDER BY nombre");
    const marcas_vehiculo = await db.manyOrNone("SELECT id, nombre FROM marca_vehiculo ORDER BY nombre");
    const etnias = await db.manyOrNone("SELECT id, nombre FROM etnia WHERE activo = true ORDER BY nombre");

    // Catálogos de hecho de tránsito (fault-tolerant: tables may not exist if migrations not run)
    let dispositivos_seguridad: any[] = [];
    let causas_hecho: any[] = [];
    try {
      dispositivos_seguridad = await db.manyOrNone("SELECT id, nombre FROM dispositivo_seguridad WHERE activo = true ORDER BY nombre");
    } catch (e) {
      console.warn('dispositivo_seguridad table not found, skipping');
    }
    try {
      causas_hecho = await db.manyOrNone("SELECT id, nombre FROM causa_hecho_transito WHERE activo = true ORDER BY nombre");
    } catch (e) {
      console.warn('causa_hecho_transito table not found, skipping');
    }

    return res.json({ tipos_hecho, tipos_asistencia, tipos_emergencia, tipos_vehiculo, marcas_vehiculo, etnias, dispositivos_seguridad, causas_hecho });
  } catch (error: any) {
    console.error('Error getCatalogosAuxiliares:', error);
    return res.status(500).json({ error: error.message });
  }
}
