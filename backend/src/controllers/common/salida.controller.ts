import { Request, Response } from 'express';
import { SalidaModel } from '../../models/common/salida.model';
import { TurnoModel } from '../../models/common/turno.model';
import { ActividadModel } from '../../models/cop/actividad.model';
import { db } from '../../config/database';
import { normalizeId, parseIndicador } from '../../utils/db.utils';
import { resolveContextoActivo } from '../../utils/operaciones.utils';
import { emitUnidadCambioEstado, UnidadEvent } from '../../services/common/socket.service';

// ========================================
// SALIDAS
// ========================================

/**
 * GET /api/salidas/mi-salida-activa
 */
export async function getMiSalidaActiva(req: Request, res: Response) {
  try {
    const miSalida = await SalidaModel.getMiSalidaActiva(req.user!.userId);

    if (!miSalida) {
      return res.status(404).json({
        error: 'No tienes salida activa',
        message: 'Tu unidad no ha iniciado salida.',
      });
    }

    return res.json(miSalida);
  } catch (error) {
    console.error('Error en getMiSalidaActiva:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/salidas/mi-salida-hoy
 * Salida de hoy (activa o finalizada) con resumen de situaciones.
 */
export async function getMiSalidaHoy(req: Request, res: Response) {
  try {
    const miSalidaHoy = await SalidaModel.getMiSalidaHoy(req.user!.userId);

    if (!miSalidaHoy) {
      return res.status(404).json({
        error: 'No tienes salida hoy',
        message: 'No has registrado salida el día de hoy.',
      });
    }

    const jornadaFinalizada = miSalidaHoy.estado === 'FINALIZADA';
    const horasTrabajadas = miSalidaHoy.horas_salida
      ? parseFloat(String(miSalidaHoy.horas_salida)).toFixed(2)
      : '0.00';

    return res.json({
      ...miSalidaHoy,
      jornada_finalizada: jornadaFinalizada,
      puede_iniciar_nueva: false,
      resumen: {
        total_situaciones: parseInt(miSalidaHoy.total_situaciones) || 0,
        situaciones: miSalidaHoy.situaciones || [],
        horas_trabajadas: parseFloat(horasTrabajadas),
        km_recorridos: miSalidaHoy.km_recorridos || 0,
      },
    });
  } catch (error) {
    console.error('Error en getMiSalidaHoy:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/salidas/iniciar
 * Iniciar salida de mi unidad (Brigada).
 *
 * Flujo atómico (db.tx):
 *   1. Verificar que la unidad no tenga salida activa
 *   2. Llamar a iniciar_salida_unidad() — función PG que crea la salida
 *   3. Vincular inspección 360 aprobada si existe
 *
 * Actualización de turno: fuera del tx — fallo no es fatal.
 */
export async function iniciarSalida(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;

    // Verificar asignación de turno
    const asignacionTurno = await TurnoModel.getMiAsignacionHoy(userId);
    if (!asignacionTurno) {
      return res.status(404).json({
        error: 'No tienes unidad asignada',
        message: 'No tienes asignación de turno para hoy. Contacta a Operaciones.',
      });
    }

    const unidadId = asignacionTurno.unidad_id;
    const rutaInicialId = asignacionTurno.ruta_id || null;

    // Verificar que no haya salida activa (inverso de resolveContextoActivo)
    const ctx = await resolveContextoActivo(userId);
    if (ctx.salida_id) {
      return res.status(409).json({
        error: 'Ya tienes una salida activa',
        salida_id: ctx.salida_id,
      });
    }

    const {
      ruta_inicial_id,
      km_inicial,
      combustible_inicial,
      combustible_fraccion,
      observaciones_salida,
    } = req.body;

    const indicador = parseIndicador(combustible_fraccion ?? combustible_inicial);
    const rutaId = normalizeId(ruta_inicial_id) ?? rutaInicialId;

    // Buscar inspección 360 aprobada y reciente (no bloquea si no existe)
    const inspeccionAprobada = await db.oneOrNone<{ id: number }>(
      `SELECT id FROM inspeccion_360
       WHERE unidad_id = $1
         AND estado = 'APROBADA'
         AND salida_id IS NULL
         AND fecha_aprobacion > NOW() - INTERVAL '24 hours'
       ORDER BY fecha_aprobacion DESC
       LIMIT 1`,
      [unidadId],
    );

    // Transacción: crear salida + vincular inspección
    const salidaId = await db.tx(async (conn) => {
      const { salida_id } = await conn.one<{ salida_id: number }>(
        `SELECT iniciar_salida_unidad($1, $2, $3, $4, $5) AS salida_id`,
        [unidadId, rutaId, normalizeId(km_inicial), indicador, observaciones_salida || null],
      );

      if (inspeccionAprobada) {
        await conn.none(
          `UPDATE inspeccion_360 SET salida_id = $1 WHERE id = $2`,
          [salida_id, inspeccionAprobada.id],
        );
      }

      return salida_id;
    });

    // Actualizar turno (no fatal si falla)
    try {
      if (ruta_inicial_id && asignacionTurno.ruta_id !== normalizeId(ruta_inicial_id)) {
        await TurnoModel.updateAsignacion(asignacionTurno.asignacion_id, {
          ruta_id: normalizeId(ruta_inicial_id)!,
        });
      }
      await TurnoModel.marcarSalida(asignacionTurno.asignacion_id);
      await TurnoModel.updateEstado(asignacionTurno.turno_id, 'ACTIVO');
    } catch (e) {
      console.warn('[SALIDA] No se pudo actualizar turno:', e);
    }

    const salida = await SalidaModel.getSalidaById(salidaId);

    if (salida) {
      const s = salida as any;
      const evento: UnidadEvent = {
        unidad_id: unidadId,
        unidad_codigo: s.unidad_codigo || `U-${unidadId}`,
        estado: 'EN_SALIDA',
        sede_id: s.sede_id,
        ruta_id: rutaId || undefined,
        ultima_situacion: 'SALIDA_INICIADA',
      };
      emitUnidadCambioEstado(evento);
    }

    return res.status(201).json({
      message: 'Salida iniciada exitosamente',
      salida_id: salidaId,
      salida,
      asignacion_turno: {
        turno_id: asignacionTurno.turno_id,
        fecha: asignacionTurno.fecha,
        ruta: asignacionTurno.ruta_codigo,
      },
      inspeccion_asociada: inspeccionAprobada?.id ?? null,
      instruccion: 'Ahora debes registrar SALIDA_SEDE como primera situación',
    });
  } catch (error: any) {
    console.error('Error en iniciarSalida:', error);
    if (error.message?.includes('ya tiene una salida activa')) {
      return res.status(409).json({ error: 'La unidad ya tiene una salida activa' });
    }
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/salidas/cop/iniciar-unidad
 * Iniciar salida de una unidad desde COP (sin inspección 360).
 */
export async function iniciarSalidaCOP(req: Request, res: Response) {
  try {
    const {
      unidad_id,
      ruta_inicial_id,
      km_inicial,
      combustible_inicial,
      combustible_fraccion,
      observaciones_salida,
      tripulacion,
    } = req.body;

    if (!unidad_id) return res.status(400).json({ error: 'unidad_id es requerido' });

    const salidaActiva = await db.oneOrNone<{ id: number }>(
      `SELECT id FROM salida_unidad WHERE unidad_id = $1 AND estado = 'EN_SALIDA'`,
      [unidad_id],
    );
    if (salidaActiva) {
      return res.status(409).json({ error: 'La unidad ya tiene una salida activa', salida_id: salidaActiva.id });
    }

    const estadoUnidad = await db.oneOrNone<{ disponible_transportes: boolean; instrucciones_transportes: string | null }>(
      `SELECT disponible_transportes, instrucciones_transportes FROM unidad WHERE id = $1`,
      [unidad_id],
    );
    const forzadaNoDisponible = estadoUnidad?.disponible_transportes === false;

    const indicador = parseIndicador(combustible_fraccion ?? combustible_inicial);

    const salidaId = await SalidaModel.iniciarSalida({
      unidad_id,
      ruta_inicial_id: normalizeId(ruta_inicial_id) ?? undefined,
      km_inicial: normalizeId(km_inicial) ?? undefined,
      combustible_inicial: indicador ?? undefined,
      observaciones_salida,
    });

    const tieneTripulacion = Array.isArray(tripulacion) && tripulacion.length > 0;
    await db.none(
      `UPDATE salida_unidad SET origen = 'COP_EMERGENCIA', tripulacion = $1 WHERE id = $2`,
      [tieneTripulacion ? JSON.stringify(tripulacion) : null, salidaId],
    );

    const salida = await SalidaModel.getSalidaById(salidaId);
    if (salida) {
      const s = salida as any;
      emitUnidadCambioEstado({
        unidad_id,
        unidad_codigo: s.unidad_codigo || `U-${unidad_id}`,
        estado: 'EN_SALIDA',
        sede_id: s.sede_id,
        ruta_id: normalizeId(ruta_inicial_id) || undefined,
        ultima_situacion: 'SALIDA_INICIADA_COP',
      });
    }

    const descEvento = [
      tieneTripulacion
        ? `Salida iniciada desde COP con ${tripulacion.length} integrante(s)`
        : 'Salida iniciada desde COP',
      forzadaNoDisponible
        ? `[FORZADA: unidad marcada no disponible por Transportes — "${estadoUnidad!.instrucciones_transportes || 'sin motivo'}"]`
        : null,
    ].filter(Boolean).join(' ');

    await db.none(
      `INSERT INTO salida_evento (salida_id, tipo, descripcion, datos_new, realizado_por)
       VALUES ($1, 'INICIO_COP', $2, $3, $4)`,
      [salidaId, descEvento,
       JSON.stringify({ unidad_id, ruta_inicial_id: normalizeId(ruta_inicial_id), tripulacion: tripulacion || null, forzada_no_disponible: forzadaNoDisponible }),
       req.user!.userId],
    );

    return res.status(201).json({ message: 'Salida iniciada desde COP', salida_id: salidaId, salida });
  } catch (error: any) {
    console.error('Error en iniciarSalidaCOP:', error);
    if (error.message?.includes('ya tiene una salida activa')) {
      return res.status(409).json({ error: 'La unidad ya tiene una salida activa' });
    }
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/salidas/:id/finalizar
 * Finalizar salida por ID (COP/Admin — override administrativo).
 * Brigada finaliza su jornada por POST /ingresos/finalizar-jornada.
 */
export async function finalizarSalida(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { km_final, combustible_final, combustible_fraccion, observaciones_regreso } = req.body;
    const userId = req.user!.userId;

    const indicador = parseIndicador(combustible_fraccion ?? combustible_final);

    // Obtener unidad_id antes del tx para limpiar situacion_actual
    const salidaInfo = await db.oneOrNone<{ unidad_id: number }>(
      `SELECT unidad_id FROM salida_unidad WHERE id = $1 AND estado = 'EN_SALIDA'`,
      [id],
    );
    if (!salidaInfo) {
      return res.status(404).json({ error: 'Salida no encontrada o ya finalizada' });
    }

    await db.tx(async (conn) => {
      // Cerrar actividades activas
      await ActividadModel.cerrarActivasDeUnidad(salidaInfo.unidad_id, conn);
      await conn.none(
        `UPDATE actividad SET salida_unidad_id = NULL WHERE salida_unidad_id = $1`,
        [id],
      );

      // Finalizar la salida
      const { success } = await conn.one<{ success: boolean }>(
        `SELECT finalizar_salida_unidad($1, $2, $3, $4, $5) AS success`,
        [id, normalizeId(km_final), indicador, observaciones_regreso || null, userId],
      );
      if (!success) throw new Error('finalizar_salida_unidad retornó false');

      // Limpiar situacion_actual
      await conn.none(
        `UPDATE situacion_actual
         SET situacion_id = NULL, tipo_situacion = NULL, estado = NULL,
             latitud = NULL, longitud = NULL, km = NULL, sentido = NULL,
             ruta_id = NULL, ruta_codigo = NULL, situacion_created_at = NULL,
             actividad_id = NULL, actividad_tipo_nombre = NULL, actividad_estado = NULL,
             actividad_created_at = NULL, icono = NULL, updated_at = NOW()
         WHERE unidad_id = $1`,
        [salidaInfo.unidad_id],
      );
    });

    const salida = await SalidaModel.getSalidaById(id);
    if (salida) {
      const s = salida as any;
      emitUnidadCambioEstado({
        unidad_id: s.unidad_id,
        unidad_codigo: s.unidad_codigo || `U-${s.unidad_id}`,
        estado: 'FINALIZADO',
        sede_id: s.sede_id,
        ultima_situacion: 'SALIDA_FINALIZADA',
      });
    }

    return res.json({ message: 'Salida finalizada exitosamente', salida });
  } catch (error) {
    console.error('Error en finalizarSalida:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/salidas/cambiar-ruta
 * Cambiar ruta de una salida activa.
 * Brigada → resolveContextoActivo. COP/Admin → unidadId en body.
 */
export async function cambiarRuta(req: Request, res: Response) {
  try {
    const { nueva_ruta_id, unidadId } = req.body;
    const userId = req.user!.userId;
    const rol = req.user!.rol;

    if (!nueva_ruta_id) {
      return res.status(400).json({ error: 'nueva_ruta_id es requerido' });
    }

    let salidaId: number;

    if (rol === 'COP' || rol === 'OPERACIONES' || rol === 'ADMIN' || rol === 'SUPER_ADMIN') {
      if (!unidadId) return res.status(400).json({ error: 'unidadId es requerido para tu rol' });
      const row = await db.oneOrNone<{ id: number }>(
        `SELECT id FROM salida_unidad WHERE unidad_id = $1 AND estado = 'EN_SALIDA'`,
        [normalizeId(unidadId)],
      );
      if (!row) return res.status(404).json({ error: 'La unidad no tiene salida activa' });
      salidaId = row.id;
    } else {
      const ctx = await resolveContextoActivo(userId);
      if (!ctx.salida_id) {
        return res.status(412).json({ error: 'No tienes salida activa', code: 'NO_CONTEXTO_OPERATIVO' });
      }
      salidaId = ctx.salida_id;
    }

    const rutaId = normalizeId(nueva_ruta_id)!;

    // Capturar ruta anterior para el evento
    const antes = await db.oneOrNone<{ ruta_inicial_id: number | null; ruta_codigo: string | null }>(
      `SELECT su.ruta_inicial_id, r.codigo AS ruta_codigo
       FROM salida_unidad su LEFT JOIN ruta r ON su.ruta_inicial_id = r.id
       WHERE su.id = $1`,
      [salidaId],
    );

    const success = await SalidaModel.cambiarRuta(salidaId, rutaId);
    if (!success) {
      return res.status(404).json({ error: 'No se pudo cambiar la ruta. La salida podría no estar activa.' });
    }

    const nuevaRuta = await db.oneOrNone<{ codigo: string }>('SELECT codigo FROM ruta WHERE id = $1', [rutaId]);
    await db.none(
      `INSERT INTO salida_evento (salida_id, tipo, descripcion, datos_ant, datos_new, realizado_por)
       VALUES ($1, 'CAMBIO_RUTA', $2, $3, $4, $5)`,
      [salidaId,
       `Ruta cambiada: ${antes?.ruta_codigo ?? 'sin ruta'} → ${nuevaRuta?.codigo ?? rutaId}`,
       JSON.stringify({ ruta_id: antes?.ruta_inicial_id }),
       JSON.stringify({ ruta_id: rutaId }),
       userId],
    );

    await db.none(
      `UPDATE situacion_actual sa
       SET ruta_id = $1, ruta_codigo = $2, updated_at = NOW()
       FROM salida_unidad su
       WHERE su.id = $3 AND sa.unidad_id = su.unidad_id`,
      [rutaId, nuevaRuta?.codigo ?? null, salidaId],
    );

    const salidaActualizada = await db.oneOrNone('SELECT * FROM salida_unidad WHERE id = $1', [salidaId]);
    return res.json({ message: 'Ruta cambiada exitosamente', salida: salidaActualizada });
  } catch (error) {
    console.error('Error en cambiarRuta:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/salidas/:id
 */
export async function getSalida(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const salida = await SalidaModel.getSalidaById(id);
    if (!salida) return res.status(404).json({ error: 'Salida no encontrada' });

    const situaciones = await SalidaModel.getSituacionesDeSalida(salida.id);
    return res.json({ salida, situaciones, total_situaciones: situaciones.length });
  } catch (error) {
    console.error('Error en getSalida:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/salidas/admin/unidades-en-salida
 */
export async function getUnidadesEnSalida(_req: Request, res: Response) {
  try {
    const unidades = await SalidaModel.getUnidadesEnSalida();
    return res.json({ unidades, total: unidades.length });
  } catch (error) {
    console.error('Error en getUnidadesEnSalida:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/salidas/historial/:unidadId
 */
export async function getHistorialSalidas(req: Request, res: Response) {
  try {
    const unidadId = normalizeId(req.params.unidadId);
    if (!unidadId) return res.status(400).json({ error: 'unidadId inválido' });

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const historial = await SalidaModel.getHistorialSalidas(unidadId, limit);

    return res.json({ unidad_id: unidadId, historial, total: historial.length });
  } catch (error) {
    console.error('Error en getHistorialSalidas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * PATCH /api/salidas/editar-datos-salida
 * Editar km_inicial y/o combustible_inicial de la salida activa (Brigada).
 */
export async function editarDatosSalida(req: Request, res: Response) {
  try {
    const { km_inicial, combustible_inicial, combustible_inicial_fraccion } = req.body;
    const userId = req.user!.userId;

    if (km_inicial === undefined && combustible_inicial === undefined && combustible_inicial_fraccion === undefined) {
      return res.status(400).json({
        error: 'Debes proporcionar al menos un campo para editar',
        campos_permitidos: ['km_inicial', 'combustible_inicial', 'combustible_inicial_fraccion'],
      });
    }

    const ctx = await resolveContextoActivo(userId);
    if (!ctx.salida_id) {
      return res.status(412).json({ error: 'No tienes salida activa', code: 'NO_CONTEXTO_OPERATIVO' });
    }

    const sets: string[] = ['updated_at = NOW()'];
    const params: Record<string, unknown> = { id: ctx.salida_id };

    if (km_inicial !== undefined) {
      sets.push('km_inicial = $/km_inicial/');
      params.km_inicial = normalizeId(km_inicial);
    }

    const indicador = parseIndicador(combustible_inicial_fraccion ?? combustible_inicial);
    if (indicador !== null) {
      sets.push('combustible_inicial = $/combustible/');
      params.combustible = indicador;
    }

    // Capturar valores anteriores para auditoría
    const antes = await db.oneOrNone<{ km_inicial: number | null; combustible_inicial: number | null }>(
      'SELECT km_inicial, combustible_inicial FROM salida_unidad WHERE id = $/id/',
      params,
    );

    await db.none(`UPDATE salida_unidad SET ${sets.join(', ')} WHERE id = $/id/`, params);

    // Auditoría
    if (km_inicial !== undefined && antes) {
      await db.none(
        `INSERT INTO salida_evento (salida_id, tipo, descripcion, datos_ant, datos_new, realizado_por)
         VALUES ($/id/, 'EDICION_KM', $/desc/, $/ant/, $/new/, $/userId/)`,
        {
          id: ctx.salida_id,
          desc: `km_inicial editado: ${antes.km_inicial} → ${km_inicial}`,
          ant: JSON.stringify({ km_inicial: antes.km_inicial }),
          new: JSON.stringify({ km_inicial }),
          userId,
        },
      );
    }
    if (indicador !== null && antes) {
      const fraccionLabel = combustible_inicial_fraccion ?? combustible_inicial;
      await db.none(
        `INSERT INTO salida_evento (salida_id, tipo, descripcion, datos_ant, datos_new, realizado_por)
         VALUES ($/id/, 'EDICION_COMBUSTIBLE', $/desc/, $/ant/, $/new/, $/userId/)`,
        {
          id: ctx.salida_id,
          desc: `combustible_inicial editado: ${antes.combustible_inicial} → ${fraccionLabel}`,
          ant: JSON.stringify({ combustible_inicial: antes.combustible_inicial }),
          new: JSON.stringify({ combustible_inicial: fraccionLabel }),
          userId,
        },
      );
    }

    const salidaActualizada = await SalidaModel.getSalidaById(ctx.salida_id);
    return res.json({ message: 'Datos de salida actualizados exitosamente', salida: salidaActualizada });
  } catch (error) {
    console.error('Error en editarDatosSalida:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// BITÁCORA
// ========================================

/**
 * GET /api/salidas/bitacora/:unidadId
 */
export async function getBitacoraUnidad(req: Request, res: Response) {
  try {
    const unidadId = parseInt(req.params.unidadId, 10);
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const fechaDesde = req.query.fecha_desde as string | undefined;

    const rows = await db.any(
      `SELECT
         s.id,
         s.unidad_id,
         u.codigo                                      AS unidad_codigo,
         u.tipo_unidad,
         r.codigo                                      AS ruta_codigo,
         r.nombre                                      AS ruta_nombre,
         s.fecha_hora_salida,
         s.fecha_hora_regreso,
         s.estado,
         s.km_inicial,
         s.km_final,
         s.km_recorridos,
         s.combustible_inicial,
         s.combustible_final,
         s.tripulacion,
         s.observaciones_salida,
         s.observaciones_regreso,
         COALESCE(
           (SELECT json_agg(json_build_object(
               'id',          sit.id,
               'tipo_macro',  sit.tipo_situacion,
               'tipo_nombre', cts.nombre,
               'km',          sit.km,
               'sentido',     sit.sentido,
               'observaciones', sit.observaciones,
               'created_at',  sit.created_at,
               'cerrado_at',  sit.cerrado_at
             ) ORDER BY sit.created_at)
            FROM situacion sit
            LEFT JOIN catalogo_tipo_situacion cts ON sit.tipo_situacion_id = cts.id
            WHERE sit.salida_unidad_id = s.id
           ), '[]'::json)                             AS situaciones,
         COALESCE(
           (SELECT json_agg(json_build_object(
               'id',          a.id,
               'tipo_nombre', cts2.nombre,
               'km',          a.km,
               'sentido',     a.sentido,
               'observaciones', a.observaciones,
               'estado',      a.estado,
               'created_at',  a.created_at,
               'closed_at',   a.closed_at
             ) ORDER BY a.created_at)
            FROM actividad a
            LEFT JOIN catalogo_tipo_situacion cts2 ON a.tipo_actividad_id = cts2.id
            WHERE a.salida_unidad_id = s.id
           ), '[]'::json)                             AS actividades
       FROM salida_unidad s
       JOIN unidad u ON s.unidad_id = u.id
       LEFT JOIN ruta r ON s.ruta_inicial_id = r.id
       WHERE s.unidad_id = $1
         AND ($3::date IS NULL OR s.fecha_hora_salida >= $3::date)
       ORDER BY s.fecha_hora_salida DESC
       LIMIT $2`,
      [unidadId, limit, fechaDesde ?? null],
    );

    return res.json({ success: true, unidad_id: unidadId, count: rows.length, data: rows });
  } catch (error) {
    console.error('Error en getBitacoraUnidad:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/salidas/bitacora-dia?fecha=YYYY-MM-DD[&sede_id=X]
 */
export async function getBitacoraDia(req: Request, res: Response) {
  try {
    const { fecha, sede_id } = req.query;
    if (!fecha) return res.status(400).json({ error: 'fecha es requerida (YYYY-MM-DD)' });

    const rows = await db.any(
      `SELECT
         s.id              AS salida_id,
         s.unidad_id,
         u.codigo          AS unidad_codigo,
         u.tipo_unidad,
         u.sede_id,
         sede.nombre       AS sede_nombre,
         r.codigo          AS ruta_codigo,
         r.nombre          AS ruta_nombre,
         s.fecha_hora_salida,
         s.fecha_hora_regreso,
         s.estado,
         s.km_inicial,
         s.km_final,
         s.km_recorridos,
         s.combustible_inicial,
         s.combustible_final,
         s.tripulacion,
         s.observaciones_salida,
         s.observaciones_regreso,
         fin.nombre_completo                       AS finalizado_por_nombre,
         COUNT(DISTINCT sit.id)::int               AS total_situaciones,
         COUNT(DISTINCT act.id)::int               AS total_actividades,
         COUNT(DISTINCT ev.id)::int                AS total_eventos,
         COALESCE(
           (SELECT json_agg(json_build_object(
               'tipo', sit2.tipo_situacion,
               'tipo_nombre', cts.nombre
             ) ORDER BY sit2.created_at)
            FROM situacion sit2
            LEFT JOIN catalogo_tipo_situacion cts ON sit2.tipo_situacion_id = cts.id
            WHERE sit2.salida_unidad_id = s.id
           ), '[]'::json)                          AS situaciones_resumen
       FROM salida_unidad s
       JOIN unidad u    ON s.unidad_id = u.id
       JOIN sede        ON u.sede_id = sede.id
       LEFT JOIN ruta r ON s.ruta_inicial_id = r.id
       LEFT JOIN usuario fin ON s.finalizada_por = fin.id
       LEFT JOIN situacion sit ON sit.salida_unidad_id = s.id
       LEFT JOIN actividad act ON act.salida_unidad_id = s.id
       LEFT JOIN salida_evento ev ON ev.salida_id = s.id
       WHERE DATE(s.fecha_hora_salida AT TIME ZONE 'America/Guatemala') = $1::date
         AND ($2::integer IS NULL OR u.sede_id = $2)
       GROUP BY s.id, u.codigo, u.tipo_unidad, u.sede_id, sede.nombre,
                r.codigo, r.nombre, fin.nombre_completo
       ORDER BY u.codigo, s.fecha_hora_salida`,
      [fecha, sede_id ? parseInt(sede_id as string) : null],
    );

    return res.json({ success: true, fecha, total: rows.length, salidas: rows });
  } catch (error) {
    console.error('Error en getBitacoraDia:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/salidas/bitacora-timeline/:salidaId
 * Timeline completo y ordenado de una salida.
 */
export async function getBitacoraTimeline(req: Request, res: Response) {
  try {
    const salidaId = normalizeId(req.params.salidaId);
    if (!salidaId) return res.status(400).json({ error: 'salidaId inválido' });

    const salida = await db.oneOrNone(
      `SELECT s.*, u.codigo AS unidad_codigo, u.tipo_unidad,
              r.codigo AS ruta_codigo, r.nombre AS ruta_nombre,
              fin.nombre_completo AS finalizado_por_nombre
       FROM salida_unidad s
       JOIN unidad u ON s.unidad_id = u.id
       LEFT JOIN ruta r ON s.ruta_inicial_id = r.id
       LEFT JOIN usuario fin ON s.finalizada_por = fin.id
       WHERE s.id = $1`,
      [salidaId],
    );
    if (!salida) return res.status(404).json({ error: 'Salida no encontrada' });

    const eventos = await db.any(
      `-- SITUACIONES
       SELECT
         'SITUACION'          AS tipo,
         sit.id               AS ref_id,
         sit.created_at       AS ts,
         json_build_object(
           'id',              sit.id,
           'codigo',          sit.codigo_situacion,
           'tipo_macro',      sit.tipo_situacion,
           'tipo_nombre',     cts.nombre,
           'estado',          sit.estado,
           'km',              sit.km,
           'sentido',         sit.sentido,
           'area',            sit.area,
           'referencia',      COALESCE(sit.referencia_ubicacion, sit.direccion_detallada),
           'departamento',    dep.nombre,
           'municipio',       mun.nombre,
           'latitud',         sit.latitud,
           'longitud',        sit.longitud,
           'observaciones',   sit.observaciones,
           'causa_probable',  sit.causa_probable,
           'causa_especificar', sit.causa_especificar,
           'hora_aviso',      sit.fecha_hora_aviso,
           'hora_llegada',    sit.fecha_hora_llegada,
           'hora_cierre',     sit.fecha_hora_finalizacion,
           'heridos',         sit.heridos,
           'heridos_leves',   sit.heridos_leves,
           'heridos_graves',  sit.heridos_graves,
           'fallecidos',      sit.fallecidos,
           'ilesos',          sit.ilesos,
           'trasladados',     sit.trasladados,
           'fugados',         sit.fugados,
           'danios_materiales',      sit.danios_materiales,
           'danios_infraestructura', sit.danios_infraestructura,
           'danios_descripcion',     sit.danios_descripcion,
           'clima',           sit.clima,
           'carga_vehicular', sit.carga_vehicular,
           'tipo_pavimento',  sit.tipo_pavimento,
           'iluminacion',     sit.iluminacion,
           'senalizacion',    sit.senalizacion,
           'visibilidad',     sit.visibilidad,
           'via_estado',      sit.via_estado,
           'acuerdo_involucrados', sit.acuerdo_involucrados,
           'acuerdo_detalle',      sit.acuerdo_detalle,
           'reportado_por_nombre',   sit.reportado_por_nombre,
           'reportado_por_telefono', sit.reportado_por_telefono,
           'numero_boleta',          sit.numero_boleta,
           'codigo_boleta',          sit.codigo_boleta,
           'obstruccion_data',  sit.obstruccion_data,
           'creado_por_nombre',  u_cre.nombre_completo,
           'cerrado_por_nombre', u_cer.nombre_completo,
           'vehiculos', COALESCE(
             (SELECT json_agg(json_build_object(
                 'placa',          v.placa,
                 'marca',          mv.nombre,
                 'color',          v.color,
                 'piloto',         COALESCE(sv.datos_piloto->>'nombre', p.nombre),
                 'licencia',       COALESCE(sv.datos_piloto->>'licencia', p.licencia_numero::text),
                 'estado_piloto',  sv.estado_piloto,
                 'heridos',        sv.heridos_en_vehiculo,
                 'fallecidos',     sv.fallecidos_en_vehiculo,
                 'danos',          sv.danos_estimados,
                 'sancion',        sv.sancion
               ) ORDER BY sv.id)
              FROM situacion_vehiculo sv
              JOIN vehiculo v ON sv.vehiculo_id = v.id
              LEFT JOIN marca_vehiculo mv ON v.marca_id = mv.id
              LEFT JOIN piloto p ON sv.piloto_id = p.id
              WHERE sv.situacion_id = sit.id
             ), '[]'::json),
           'fotos', COALESCE(
             (SELECT json_agg(json_build_object(
                 'id',        sm.id,
                 'tipo',      sm.tipo,
                 'url',       sm.url_original,
                 'thumbnail', sm.url_thumbnail,
                 'titulo',    sm.infografia_titulo,
                 'subido_por', usm.nombre_completo
               ) ORDER BY sm.infografia_numero, sm.orden, sm.created_at)
              FROM situacion_multimedia sm
              LEFT JOIN usuario usm ON sm.subido_por = usm.id
              WHERE sm.situacion_id = sit.id
             ), '[]'::json)
         ) AS datos
       FROM situacion sit
       LEFT JOIN catalogo_tipo_situacion cts ON sit.tipo_situacion_id = cts.id
       LEFT JOIN usuario u_cre ON sit.creado_por = u_cre.id
       LEFT JOIN usuario u_cer ON sit.actualizado_por = u_cer.id
       LEFT JOIN departamento dep ON sit.departamento_id = dep.id
       LEFT JOIN municipio mun ON sit.municipio_id = mun.id
       WHERE sit.salida_unidad_id = $1

       UNION ALL

       -- ACTIVIDADES
       SELECT
         'ACTIVIDAD'          AS tipo,
         act.id               AS ref_id,
         act.created_at       AS ts,
         json_build_object(
           'id',              act.id,
           'codigo',          act.codigo_actividad,
           'tipo_nombre',     cts2.nombre,
           'km',              act.km,
           'sentido',         act.sentido,
           'observaciones',   act.observaciones,
           'estado',          act.estado,
           'datos',           act.datos,
           'closed_at',       act.closed_at,
           'creado_por_nombre', u2.nombre_completo,
           'fotos', COALESCE(
             (SELECT json_agg(json_build_object(
                 'id',        sm.id,
                 'tipo',      sm.tipo,
                 'url',       sm.url_original,
                 'thumbnail', sm.url_thumbnail,
                 'titulo',    sm.infografia_titulo
               ) ORDER BY sm.infografia_numero, sm.orden, sm.created_at)
              FROM situacion_multimedia sm
              WHERE sm.actividad_id = act.id
             ), '[]'::json)
         ) AS datos
       FROM actividad act
       LEFT JOIN catalogo_tipo_situacion cts2 ON act.tipo_actividad_id = cts2.id
       LEFT JOIN usuario u2 ON act.creado_por = u2.id
       WHERE act.salida_unidad_id = $1

       UNION ALL

       -- EVENTOS (ediciones, cambio ruta, inicio COP, etc.)
       SELECT
         'EVENTO'             AS tipo,
         ev.id                AS ref_id,
         ev.created_at        AS ts,
         json_build_object(
           'id',              ev.id,
           'tipo_evento',     ev.tipo,
           'descripcion',     ev.descripcion,
           'datos_ant',       ev.datos_ant,
           'datos_new',       ev.datos_new,
           'realizado_por',   uev.nombre_completo
         ) AS datos
       FROM salida_evento ev
       LEFT JOIN usuario uev ON ev.realizado_por = uev.id
       WHERE ev.salida_id = $1

       ORDER BY ts ASC`,
      [salidaId],
    );

    return res.json({
      success: true,
      salida: {
        id: salida.id,
        unidad_id: salida.unidad_id,
        unidad_codigo: salida.unidad_codigo,
        tipo_unidad: salida.tipo_unidad,
        ruta_codigo: salida.ruta_codigo,
        ruta_nombre: salida.ruta_nombre,
        fecha_hora_salida: salida.fecha_hora_salida,
        fecha_hora_regreso: salida.fecha_hora_regreso,
        estado: salida.estado,
        km_inicial: salida.km_inicial,
        km_final: salida.km_final,
        km_recorridos: salida.km_recorridos,
        combustible_inicial: salida.combustible_inicial,
        combustible_final: salida.combustible_final,
        tripulacion: salida.tripulacion,
        observaciones_salida: salida.observaciones_salida,
        observaciones_regreso: salida.observaciones_regreso,
        finalizado_por_nombre: salida.finalizado_por_nombre,
      },
      timeline: eventos,
    });
  } catch (error) {
    console.error('Error en getBitacoraTimeline:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// RELEVOS
// ========================================

/**
 * POST /api/salidas/relevos
 */
export async function registrarRelevo(req: Request, res: Response) {
  try {
    const {
      situacion_id,
      tipo_relevo,
      unidad_saliente_id,
      unidad_entrante_id,
      brigadistas_salientes,
      brigadistas_entrantes,
      observaciones,
    } = req.body;

    if (!tipo_relevo || !unidad_saliente_id || !unidad_entrante_id) {
      return res.status(400).json({
        error: 'Faltan campos requeridos',
        required: ['tipo_relevo', 'unidad_saliente_id', 'unidad_entrante_id'],
      });
    }

    const tiposValidos = ['UNIDAD_COMPLETA', 'CRUZADO'];
    if (!tiposValidos.includes(tipo_relevo)) {
      return res.status(400).json({ error: 'Tipo de relevo inválido', tipos_validos: tiposValidos });
    }

    const relevo = await SalidaModel.registrarRelevo({
      situacion_id,
      tipo_relevo,
      unidad_saliente_id,
      unidad_entrante_id,
      brigadistas_salientes: brigadistas_salientes || [],
      brigadistas_entrantes: brigadistas_entrantes || [],
      observaciones,
      registrado_por: req.user!.userId,
    });

    return res.status(201).json({ message: 'Relevo registrado exitosamente', relevo });
  } catch (error) {
    console.error('Error en registrarRelevo:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/salidas/relevos/:situacionId
 */
export async function getRelevos(req: Request, res: Response) {
  try {
    const situacionId = normalizeId(req.params.situacionId);
    if (!situacionId) return res.status(400).json({ error: 'situacionId inválido' });

    const relevos = await SalidaModel.getRelevosBySituacion(situacionId);
    return res.json({ situacion_id: situacionId, relevos, total: relevos.length });
  } catch (error) {
    console.error('Error en getRelevos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
