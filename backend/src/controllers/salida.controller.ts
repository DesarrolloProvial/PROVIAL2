import { Request, Response } from 'express';
import { SalidaModel } from '../models/salida.model';
import { TurnoModel } from '../models/turno.model';
import { Inspeccion360Model } from '../models/inspeccion360.model';
import { ActividadModel } from '../models/actividad.model';
import { db } from '../config/database';
import { emitUnidadCambioEstado, UnidadEvent } from '../services/socket.service';

// Helper para convertir fracciones de combustible a decimal
function convertirCombustibleADecimal(valor: any): number | null {
  if (valor === null || valor === undefined) return null;

  // Si ya es un número, devolverlo
  if (typeof valor === 'number') return valor;

  // Si es string, intentar convertir
  const str = String(valor).trim().toUpperCase();

  // Mapeo de fracciones comunes
  const fracciones: Record<string, number> = {
    'LLENO': 1,
    'FULL': 1,
    '1': 1,
    '3/4': 0.75,
    '1/2': 0.5,
    '1/4': 0.25,
    '1/8': 0.125,
    'VACIO': 0,
    'EMPTY': 0,
    '0': 0
  };

  if (str in fracciones) {
    return fracciones[str];
  }

  // Intentar parsear como número
  const num = parseFloat(str);
  if (!isNaN(num)) {
    return num;
  }

  return null;
}

// ========================================
// SALIDAS
// ========================================

/**
 * GET /api/salidas/mi-salida-activa
 * Obtener mi salida activa (si existe)
 */
export async function getMiSalidaActiva(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const miSalida = await SalidaModel.getMiSalidaActiva(req.user.userId);

    if (!miSalida) {
      return res.status(404).json({
        error: 'No tienes salida activa',
        message: 'Tu unidad no ha iniciado salida. Registra SALIDA_SEDE para comenzar.'
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
 * Obtener mi salida de hoy (activa o finalizada)
 * Incluye resumen de situaciones del día
 */
export async function getMiSalidaHoy(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const miSalidaHoy = await SalidaModel.getMiSalidaHoy(req.user.userId);

    if (!miSalidaHoy) {
      return res.status(404).json({
        error: 'No tienes salida hoy',
        message: 'No has registrado salida el día de hoy.'
      });
    }

    // Determinar si la jornada ya finalizó
    const jornadaFinalizada = miSalidaHoy.estado === 'FINALIZADA';

    // Convertir horas_salida de forma segura (viene como string de PostgreSQL)
    const horasTrabajadas = miSalidaHoy.horas_salida
      ? parseFloat(String(miSalidaHoy.horas_salida)).toFixed(2)
      : '0.00';

    return res.json({
      ...miSalidaHoy,
      jornada_finalizada: jornadaFinalizada,
      puede_iniciar_nueva: false, // Solo se puede iniciar una salida por día con asignación permanente
      resumen: {
        total_situaciones: parseInt(miSalidaHoy.total_situaciones) || 0,
        situaciones: miSalidaHoy.situaciones || [],
        horas_trabajadas: parseFloat(horasTrabajadas),
        km_recorridos: miSalidaHoy.km_recorridos || 0
      }
    });
  } catch (error) {
    console.error('Error en getMiSalidaHoy:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/salidas/iniciar
 * Iniciar salida de mi unidad
 * Busca primero en asignaciones de turno, luego en asignaciones permanentes
 */
export async function iniciarSalida(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // Buscar asignación de turno (único sistema de asignación)
    const asignacionTurno = await TurnoModel.getMiAsignacionHoy(req.user.userId);

    if (!asignacionTurno) {
      return res.status(404).json({
        error: 'No tienes unidad asignada',
        message: 'No tienes asignación de turno para hoy. Contacta a Operaciones.'
      });
    }

    const unidadId = asignacionTurno.unidad_id;
    const rutaInicialId = asignacionTurno.ruta_id || null;

    // Verificar que no haya salida activa
    const salidaActiva = await SalidaModel.getMiSalidaActiva(req.user.userId);

    // ========================================
    // VERIFICAR INSPECCIÓN 360 APROBADA
    // ========================================
    // Buscar una inspección 360 aprobada reciente para esta unidad
    const inspeccion360 = await Inspeccion360Model.obtenerInspeccionPendienteUnidad(unidadId);

    // Si hay inspección pendiente, informar que debe ser aprobada
    if (inspeccion360 && inspeccion360.estado === 'PENDIENTE') {
      return res.status(400).json({
        error: 'Inspección 360 pendiente de aprobación',
        message: 'Existe una inspección 360 que aún no ha sido aprobada por el comandante.',
        requiere_inspeccion: true,
        inspeccion_pendiente: {
          id: inspeccion360.id,
          estado: inspeccion360.estado,
          fecha_realizacion: inspeccion360.fecha_realizacion
        }
      });
    }

    // Verificar si existe una inspección 360 aprobada reciente (últimas 24 horas sin salida asociada)
    const { db } = require('../config/database');
    const inspeccionAprobada = await db.oneOrNone(`
      SELECT id, estado, fecha_aprobacion
      FROM inspeccion_360
      WHERE unidad_id = $1
        AND estado = 'APROBADA'
        AND salida_id IS NULL
        AND fecha_aprobacion > NOW() - INTERVAL '24 hours'
      ORDER BY fecha_aprobacion DESC
      LIMIT 1
    `, [unidadId]);

    if (!inspeccionAprobada) {
      return res.status(400).json({
        error: 'Debe completar la inspección 360',
        message: 'Para iniciar la salida, primero debe completar y obtener aprobación de la inspección 360 del vehículo.',
        requiere_inspeccion: true,
        inspeccion_pendiente: null
      });
    }

    if (salidaActiva) {
      return res.status(409).json({
        error: 'Ya tienes una salida activa',
        salida: salidaActiva
      });
    }

    const {
      ruta_inicial_id,
      km_inicial,
      combustible_inicial,
      observaciones_salida
    } = req.body;

    // Convertir combustible de fracción a decimal si es necesario
    const combustibleDecimal = convertirCombustibleADecimal(combustible_inicial);

    // Iniciar salida (usar ruta del body si se especifica, sino la del turno)
    const salidaId = await SalidaModel.iniciarSalida({
      unidad_id: unidadId,
      ruta_inicial_id: ruta_inicial_id || rutaInicialId,
      km_inicial,
      combustible_inicial: combustibleDecimal ?? undefined,
      observaciones_salida
    });

    // Asociar la inspección 360 aprobada con la nueva salida
    if (inspeccionAprobada) {
      await Inspeccion360Model.asociarASalida(inspeccionAprobada.id, salidaId);
      console.log(`[SALIDA] Inspección 360 #${inspeccionAprobada.id} asociada a salida #${salidaId}`);
    }

    // Si es una asignación de turno (nuevo sistema)
    if (asignacionTurno) {
      try {
        // [NUEVO] Si se proporcionó una ruta inicial (ej: unidad reacción) y la asignación no tenía o es diferente
        // Actualizamos la ruta de la asignación para que quede constancia
        if (ruta_inicial_id && asignacionTurno.ruta_id !== ruta_inicial_id) {
          await TurnoModel.updateAsignacion(asignacionTurno.asignacion_id, {
            ruta_id: parseInt(ruta_inicial_id)
          });
          console.log(`[SALIDA] Ruta actualizada en asignación ${asignacionTurno.asignacion_id} a ${ruta_inicial_id}`);
        }

        await TurnoModel.marcarSalida(asignacionTurno.asignacion_id);

        // Cambiar estado del turno a ACTIVO cuando se inicia la salida
        await TurnoModel.updateEstado(asignacionTurno.turno_id, 'ACTIVO');
        console.log(`[SALIDA] Turno ${asignacionTurno.turno_id} cambiado a estado ACTIVO`);
      } catch (e) {
        console.log('No se pudo marcar salida/actualizar ruta/estado en turno:', e);
      }
    }

    // Obtener info de la salida creada
    const salida = await SalidaModel.getSalidaById(salidaId);

    // Emitir evento WebSocket de cambio de estado de unidad
    if (salida) {
      const s = salida as any;
      const evento: UnidadEvent = {
        unidad_id: unidadId,
        unidad_codigo: s.unidad_codigo || `U-${unidadId}`,
        estado: 'EN_SALIDA',
        sede_id: s.sede_id,
        ruta_id: ruta_inicial_id || rutaInicialId || undefined,
        ultima_situacion: 'SALIDA_INICIADA',
      };
      emitUnidadCambioEstado(evento);
    }

    return res.status(201).json({
      message: 'Salida iniciada exitosamente',
      salida_id: salidaId,
      salida,
      asignacion_turno: asignacionTurno ? {
        turno_id: asignacionTurno.turno_id,
        fecha: asignacionTurno.fecha,
        ruta: asignacionTurno.ruta_codigo
      } : null,
      instruccion: 'Ahora debes registrar SALIDA_SEDE como primera situación'
    });
  } catch (error: any) {
    console.error('Error en iniciarSalida:', error);

    if (error.message && error.message.includes('ya tiene una salida activa')) {
      return res.status(409).json({
        error: 'La unidad ya tiene una salida activa'
      });
    }

    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/salidas/cop/iniciar-unidad
 * Iniciar salida de una unidad desde COP (sin requerir inspección 360)
 */
export async function iniciarSalidaCOP(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autorizado' });

    const { unidad_id, ruta_inicial_id, km_inicial, combustible_inicial, observaciones_salida } = req.body;

    if (!unidad_id) return res.status(400).json({ error: 'unidad_id es requerido' });

    // Verificar si ya tiene salida activa
    const salidaActiva = await db.oneOrNone(
      `SELECT id FROM salida_unidad WHERE unidad_id = $1 AND estado = 'EN_SALIDA'`,
      [unidad_id]
    );
    if (salidaActiva) {
      return res.status(409).json({ error: 'La unidad ya tiene una salida activa', salida_id: salidaActiva.id });
    }

    const combustibleDecimal = convertirCombustibleADecimal(combustible_inicial);

    const salidaId = await SalidaModel.iniciarSalida({
      unidad_id,
      ruta_inicial_id: ruta_inicial_id || undefined,
      km_inicial,
      combustible_inicial: combustibleDecimal ?? undefined,
      observaciones_salida,
    });

    const salida = await SalidaModel.getSalidaById(salidaId);

    if (salida) {
      const s = salida as any;
      const evento: UnidadEvent = {
        unidad_id,
        unidad_codigo: s.unidad_codigo || `U-${unidad_id}`,
        estado: 'EN_SALIDA',
        sede_id: s.sede_id,
        ruta_id: ruta_inicial_id || undefined,
        ultima_situacion: 'SALIDA_INICIADA_COP',
      };
      emitUnidadCambioEstado(evento);
    }

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
 * Finalizar salida por ID
 */
export async function finalizarSalida(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { id } = req.params;
    const { km_final, combustible_final, observaciones_regreso } = req.body;

    // Cerrar actividades y desvincular de la salida antes de finalizar
    await db.none(`UPDATE actividad SET estado = 'CERRADA', closed_at = NOW() WHERE salida_unidad_id = $1 AND estado = 'ACTIVA'`, [parseInt(id)]);
    await db.none(`UPDATE actividad SET salida_unidad_id = NULL WHERE salida_unidad_id = $1`, [parseInt(id)]);

    const success = await SalidaModel.finalizarSalida({
      salida_id: parseInt(id),
      km_final,
      combustible_final,
      observaciones_regreso,
      finalizada_por: req.user.userId
    });

    if (!success) {
      return res.status(404).json({
        error: 'Salida no encontrada o ya finalizada'
      });
    }

    const salida = await SalidaModel.getSalidaById(parseInt(id));

    // Emitir evento WebSocket de cambio de estado
    if (salida) {
      const s = salida as any;
      const evento: UnidadEvent = {
        unidad_id: s.unidad_id,
        unidad_codigo: s.unidad_codigo || `U-${s.unidad_id}`,
        estado: 'FINALIZADO',
        sede_id: s.sede_id,
        ultima_situacion: 'SALIDA_FINALIZADA',
      };
      emitUnidadCambioEstado(evento);
    }

    return res.json({
      message: 'Salida finalizada exitosamente',
      salida
    });
  } catch (error) {
    console.error('Error en finalizarSalida:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/salidas/finalizar
 * Finalizar mi salida activa (sin ID, usa la salida activa del usuario)
 */
export async function finalizarMiSalida(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { km_final, combustible_final, observaciones } = req.body;

    // Obtener mi salida activa
    const miSalida = await SalidaModel.getMiSalidaActiva(req.user.userId);

    if (!miSalida) {
      return res.status(404).json({
        error: 'No tienes salida activa',
        message: 'No se encontró una salida activa para finalizar'
      });
    }

    // Cerrar actividades activas y desvincular de la salida
    await ActividadModel.cerrarActivasDeUnidad(miSalida.unidad_id);
    await db.none(
      `UPDATE actividad SET salida_unidad_id = NULL WHERE salida_unidad_id = $1`,
      [miSalida.salida_id]
    );

    const success = await SalidaModel.finalizarSalida({
      salida_id: miSalida.salida_id,
      km_final,
      combustible_final,
      observaciones_regreso: observaciones,
      finalizada_por: req.user.userId
    });

    if (!success) {
      return res.status(400).json({
        error: 'No se pudo finalizar la salida'
      });
    }

    const salida = await SalidaModel.getSalidaById(miSalida.salida_id);

    // Emitir evento WebSocket de cambio de estado
    if (salida) {
      const s = salida as any;
      const evento: UnidadEvent = {
        unidad_id: s.unidad_id,
        unidad_codigo: s.unidad_codigo || `U-${s.unidad_id}`,
        estado: 'FINALIZADO',
        sede_id: s.sede_id,
        ultima_situacion: 'JORNADA_FINALIZADA',
      };
      emitUnidadCambioEstado(evento);
    }

    return res.json({
      message: 'Jornada finalizada exitosamente',
      salida
    });
  } catch (error) {
    console.error('Error en finalizarMiSalida:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/salidas/finalizar-jornada
 * Finalizar jornada completa: marca salida como finalizada, crea snapshot en bitácora,
 * y limpia las tablas operacionales (turno, asignacion_unidad, tripulacion_turno)
 */
export async function finalizarJornadaCompleta(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // Obtener mi salida activa
    const miSalida = await SalidaModel.getMiSalidaActiva(req.user.userId);

    if (!miSalida) {
      return res.status(404).json({
        error: 'No tienes salida activa',
        message: 'No se encontró una salida activa para finalizar'
      });
    }

    // Verificar que hay un ingreso activo con tipo FINALIZACION_JORNADA
    const ingresoActivo = await SalidaModel.getIngresoActivo(miSalida.salida_id);

    if (!ingresoActivo) {
      return res.status(400).json({
        error: 'Debes estar en sede para finalizar',
        message: 'Primero debes ingresar a sede con motivo "Finalización Jornada"'
      });
    }

    if (ingresoActivo.tipo_ingreso !== 'FINALIZACION_JORNADA') {
      return res.status(400).json({
        error: 'Motivo de ingreso incorrecto',
        message: 'Para finalizar la jornada, debes haber ingresado con motivo "Finalización Jornada"'
      });
    }

    // Cerrar actividades activas de la unidad y desvincular de la salida
    await ActividadModel.cerrarActivasDeUnidad(miSalida.unidad_id);
    await db.none(
      `UPDATE actividad SET salida_unidad_id = NULL WHERE salida_unidad_id = $1`,
      [miSalida.salida_id]
    );

    // Llamar a la función de PostgreSQL que hace todo el trabajo
    const resultado = await SalidaModel.finalizarJornadaCompleta({
      salida_id: miSalida.salida_id,
      km_final: ingresoActivo.km_ingreso,
      combustible_final: ingresoActivo.combustible_ingreso,
      observaciones: ingresoActivo.observaciones_ingreso || 'Jornada finalizada',
      finalizada_por: req.user.userId
    });

    // Cambiar estado del turno a CERRADO al finalizar la jornada
    if (miSalida.tipo_asignacion === 'TURNO') {
      try {
        // Obtener el turno_id de la salida para actualizarlo
        const asignacionTurno = await TurnoModel.getMiAsignacionHoy(req.user.userId);
        if (asignacionTurno) {
          await TurnoModel.updateEstado(asignacionTurno.turno_id, 'CERRADO');
          console.log(`[JORNADA] Turno ${asignacionTurno.turno_id} cambiado a estado CERRADO`);
        }
      } catch (e) {
        console.log('No se pudo actualizar estado del turno a CERRADO:', e);
      }
    }

    return res.json({
      message: 'Jornada finalizada exitosamente',
      bitacora_id: resultado.bitacora_id,
      detalle: resultado.mensaje
    });
  } catch (error: any) {
    console.error('Error en finalizarJornadaCompleta:', error);
    return res.status(500).json({
      error: 'Error al finalizar jornada',
      message: error.message || 'Error interno del servidor'
    });
  }
}

/**
 * POST /api/salidas/cambiar-ruta
 * Cambiar ruta de mi salida activa
 */
export async function cambiarRuta(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { nueva_ruta_id } = req.body;

    if (!nueva_ruta_id) {
      return res.status(400).json({
        error: 'El campo nueva_ruta_id es requerido'
      });
    }

    // Obtener mi salida activa
    const miSalida = await SalidaModel.getMiSalidaActiva(req.user.userId);

    if (!miSalida) {
      return res.status(404).json({
        error: 'No tienes salida activa'
      });
    }

    // Cambiar ruta
    const success = await SalidaModel.cambiarRuta(miSalida.salida_id, nueva_ruta_id);

    if (!success) {
      return res.status(404).json({
        error: 'No se pudo cambiar la ruta. La salida podría no estar activa.'
      });
    }

    // Obtener salida actualizada
    const salidaActualizada = await SalidaModel.getMiSalidaActiva(req.user.userId);

    return res.json({
      message: 'Ruta cambiada exitosamente',
      salida: salidaActualizada
    });
  } catch (error) {
    console.error('Error en cambiarRuta:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/salidas/:id
 * Obtener información de una salida
 */
export async function getSalida(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const salida = await SalidaModel.getSalidaById(parseInt(id));

    if (!salida) {
      return res.status(404).json({ error: 'Salida no encontrada' });
    }

    // Obtener situaciones de la salida
    const situaciones = await SalidaModel.getSituacionesDeSalida(salida.id);

    return res.json({
      salida,
      situaciones,
      total_situaciones: situaciones.length
    });
  } catch (error) {
    console.error('Error en getSalida:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/salidas/unidades-en-salida
 * Obtener todas las unidades actualmente en salida (para COP/Operaciones)
 */
export async function getUnidadesEnSalida(_req: Request, res: Response) {
  try {
    const unidades = await SalidaModel.getUnidadesEnSalida();

    return res.json({
      unidades,
      total: unidades.length
    });
  } catch (error) {
    console.error('Error en getUnidadesEnSalida:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/salidas/historial/:unidadId
 * Obtener historial de salidas de una unidad
 */
export async function getHistorialSalidas(req: Request, res: Response) {
  try {
    const { unidadId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const historial = await SalidaModel.getHistorialSalidas(parseInt(unidadId), limit);

    return res.json({
      unidad_id: parseInt(unidadId),
      historial,
      total: historial.length
    });
  } catch (error) {
    console.error('Error en getHistorialSalidas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/salidas/bitacora/:unidadId
 * Bitácora completa por unidad: salidas con situaciones, actividades y tripulación
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
      [unidadId, limit, fechaDesde ?? null]
    );

    return res.json({
      success: true,
      unidad_id: unidadId,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('Error en getBitacoraUnidad:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// RELEVOS
// ========================================

/**
 * POST /api/salidas/relevos
 * Registrar relevo de unidades/tripulaciones
 */
export async function registrarRelevo(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const {
      situacion_id,
      tipo_relevo,
      unidad_saliente_id,
      unidad_entrante_id,
      brigadistas_salientes,
      brigadistas_entrantes,
      observaciones
    } = req.body;

    if (!tipo_relevo || !unidad_saliente_id || !unidad_entrante_id) {
      return res.status(400).json({
        error: 'Faltan campos requeridos',
        required: ['tipo_relevo', 'unidad_saliente_id', 'unidad_entrante_id']
      });
    }

    const tiposValidos = ['UNIDAD_COMPLETA', 'CRUZADO'];
    if (!tiposValidos.includes(tipo_relevo)) {
      return res.status(400).json({
        error: 'Tipo de relevo inválido',
        tipos_validos: tiposValidos
      });
    }

    const relevo = await SalidaModel.registrarRelevo({
      situacion_id,
      tipo_relevo,
      unidad_saliente_id,
      unidad_entrante_id,
      brigadistas_salientes: brigadistas_salientes || [],
      brigadistas_entrantes: brigadistas_entrantes || [],
      observaciones,
      registrado_por: req.user.userId
    });

    return res.status(201).json({
      message: 'Relevo registrado exitosamente',
      relevo
    });
  } catch (error) {
    console.error('Error en registrarRelevo:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/salidas/relevos/:situacionId
 * Obtener relevos de una situación
 */
export async function getRelevos(req: Request, res: Response) {
  try {
    const { situacionId } = req.params;

    const relevos = await SalidaModel.getRelevosBySituacion(parseInt(situacionId));

    return res.json({
      situacion_id: parseInt(situacionId),
      relevos,
      total: relevos.length
    });
  } catch (error) {
    console.error('Error en getRelevos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * PATCH /api/salidas/editar-datos-salida
 * Editar kilometraje y combustible de la salida activa
 */
export async function editarDatosSalida(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { km_inicial, combustible_inicial, combustible_inicial_fraccion } = req.body;

    if (km_inicial === undefined && combustible_inicial === undefined && combustible_inicial_fraccion === undefined) {
      return res.status(400).json({
        error: 'Debes proporcionar al menos un campo para editar',
        campos_permitidos: ['km_inicial', 'combustible_inicial', 'combustible_inicial_fraccion']
      });
    }

    // Obtener salida activa
    const miSalida = await SalidaModel.getMiSalidaActiva(req.user.userId);

    if (!miSalida) {
      return res.status(404).json({
        error: 'No tienes salida activa para editar'
      });
    }

    // Validar combustible si se proporciona
    if (combustible_inicial !== undefined) {
      const nivelesValidos = [0, 1, 2, 3, 4];
      if (!nivelesValidos.includes(combustible_inicial)) {
        return res.status(400).json({
          error: 'Nivel de combustible inválido',
          niveles_validos: nivelesValidos
        });
      }
    }

    // Validar fracción de combustible si se proporciona
    if (combustible_inicial_fraccion !== undefined) {
      const fraccionesValidas = ['VACIO', '1/4', '1/2', '3/4', 'LLENO'];
      if (!fraccionesValidas.includes(combustible_inicial_fraccion)) {
        return res.status(400).json({
          error: 'Fracción de combustible inválida',
          fracciones_validas: fraccionesValidas
        });
      }
    }

    // Construir query de actualización
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (km_inicial !== undefined) {
      updates.push(`km_inicial = $${paramCount}`);
      values.push(km_inicial);
      paramCount++;
    }

    // Convertir fracción a decimal
    if (combustible_inicial_fraccion !== undefined) {
      let combustibleDecimal = 0;
      switch (combustible_inicial_fraccion) {
        case 'LLENO': combustibleDecimal = 1.0; break;
        case '3/4': combustibleDecimal = 0.75; break;
        case '1/2': combustibleDecimal = 0.5; break;
        case '1/4': combustibleDecimal = 0.25; break;
        case 'VACIO': combustibleDecimal = 0; break;
      }
      updates.push(`combustible_inicial = $${paramCount}`);
      values.push(combustibleDecimal);
      paramCount++;
    } else if (combustible_inicial !== undefined) {
      updates.push(`combustible_inicial = $${paramCount}`);
      values.push(combustible_inicial);
      paramCount++;
    }

    updates.push(`updated_at = NOW()`);
    values.push(miSalida.salida_id);

    const query = `
      UPDATE salida_unidad
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const { db } = require('../config/database');
    await db.query(query, values);

    console.log(`✏️ [SALIDA] Datos editados por usuario ${req.user.userId}: km=${km_inicial}, combustible=${combustible_inicial}`);

    // Obtener salida actualizada completa
    const salidaActualizada = await SalidaModel.getMiSalidaActiva(req.user.userId);

    return res.json({
      message: 'Datos de salida actualizados exitosamente',
      salida: salidaActualizada
    });
  } catch (error) {
    console.error('Error en editarDatosSalida:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
