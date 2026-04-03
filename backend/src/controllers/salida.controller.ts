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

    if (salidaActiva) {
      return res.status(409).json({
        error: 'Ya tienes una salida activa',
        salida: salidaActiva
      });
    }

    // Buscar inspección 360 aprobada reciente para asociarla (opcional, no bloquea)
    const inspeccionAprobada = await db.oneOrNone(`
      SELECT id FROM inspeccion_360
      WHERE unidad_id = $1
        AND estado = 'APROBADA'
        AND salida_id IS NULL
        AND fecha_aprobacion > NOW() - INTERVAL '24 hours'
      ORDER BY fecha_aprobacion DESC
      LIMIT 1
    `, [unidadId]);

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

    const { unidad_id, ruta_inicial_id, km_inicial, combustible_inicial, observaciones_salida, tripulacion } = req.body;

    if (!unidad_id) return res.status(400).json({ error: 'unidad_id es requerido' });

    // Verificar si ya tiene salida activa
    const salidaActiva = await db.oneOrNone(
      `SELECT id FROM salida_unidad WHERE unidad_id = $1 AND estado = 'EN_SALIDA'`,
      [unidad_id]
    );
    if (salidaActiva) {
      return res.status(409).json({ error: 'La unidad ya tiene una salida activa', salida_id: salidaActiva.id });
    }

    // Verificar si transportes marcó la unidad como no disponible (solo para registrarlo)
    const estadoUnidad = await db.oneOrNone(
      `SELECT disponible_transportes, instrucciones_transportes FROM unidad WHERE id = $1`,
      [unidad_id]
    );
    const forzadaNoDisponible = estadoUnidad && estadoUnidad.disponible_transportes === false;

    const combustibleDecimal = convertirCombustibleADecimal(combustible_inicial);

    const salidaId = await SalidaModel.iniciarSalida({
      unidad_id,
      ruta_inicial_id: ruta_inicial_id || undefined,
      km_inicial,
      combustible_inicial: combustibleDecimal ?? undefined,
      observaciones_salida,
    });

    // Guardar tripulación y marcar origen COP_EMERGENCIA
    const tieneTripulacion = Array.isArray(tripulacion) && tripulacion.length > 0;
    await db.none(
      `UPDATE salida_unidad SET origen = 'COP_EMERGENCIA', tripulacion = $1 WHERE id = $2`,
      [tieneTripulacion ? JSON.stringify(tripulacion) : null, salidaId]
    );

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

    // Registrar evento de inicio COP
    const descEvento = [
      tieneTripulacion
        ? `Salida iniciada desde COP con ${tripulacion.length} integrante(s)`
        : 'Salida iniciada desde COP',
      forzadaNoDisponible
        ? `[FORZADA: unidad estaba marcada como no disponible por Transportes — "${estadoUnidad.instrucciones_transportes || 'sin motivo'}"]`
        : null,
    ].filter(Boolean).join(' ');

    await db.none(
      `INSERT INTO salida_evento (salida_id, tipo, descripcion, datos_new, realizado_por)
       VALUES ($1, 'INICIO_COP', $2, $3, $4)`,
      [salidaId,
       descEvento,
       JSON.stringify({ unidad_id, ruta_inicial_id: ruta_inicial_id || null, tripulacion: tripulacion || null, forzada_no_disponible: forzadaNoDisponible }),
       req.user.userId]
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

    // Limpiar situacion_actual de la unidad al finalizar salida
    if (salida) {
      const unidadId = (salida as any).unidad_id;
      await db.none(
        `UPDATE situacion_actual
         SET situacion_id = NULL, tipo_situacion = NULL, estado = NULL,
             latitud = NULL, longitud = NULL, km = NULL, sentido = NULL,
             ruta_id = NULL, ruta_codigo = NULL, situacion_created_at = NULL,
             actividad_id = NULL, actividad_tipo_nombre = NULL, actividad_estado = NULL,
             actividad_created_at = NULL, icono = NULL, updated_at = NOW()
         WHERE unidad_id = $1`,
        [unidadId]
      );
    }

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

    // Limpiar situacion_actual de la unidad al finalizar jornada
    await db.none(
      `UPDATE situacion_actual
       SET situacion_id = NULL, tipo_situacion = NULL, estado = NULL,
           latitud = NULL, longitud = NULL, km = NULL, sentido = NULL,
           ruta_id = NULL, ruta_codigo = NULL, situacion_created_at = NULL,
           actividad_id = NULL, actividad_tipo_nombre = NULL, actividad_estado = NULL,
           actividad_created_at = NULL, icono = NULL, updated_at = NOW()
       WHERE unidad_id = $1`,
      [miSalida.unidad_id]
    );

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

    // Limpiar situacion_actual de la unidad al finalizar jornada completa
    await db.none(
      `UPDATE situacion_actual
       SET situacion_id = NULL, tipo_situacion = NULL, estado = NULL,
           latitud = NULL, longitud = NULL, km = NULL, sentido = NULL,
           ruta_id = NULL, ruta_codigo = NULL, situacion_created_at = NULL,
           actividad_id = NULL, actividad_tipo_nombre = NULL, actividad_estado = NULL,
           actividad_created_at = NULL, icono = NULL, updated_at = NOW()
       WHERE unidad_id = $1`,
      [miSalida.unidad_id]
    );

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

    // Capturar ruta anterior
    const salidaAntes = await db.oneOrNone(
      `SELECT su.ruta_inicial_id, r.codigo as ruta_codigo
       FROM salida_unidad su LEFT JOIN ruta r ON su.ruta_inicial_id = r.id
       WHERE su.id = $1`,
      [miSalida.salida_id]
    );

    // Cambiar ruta
    const success = await SalidaModel.cambiarRuta(miSalida.salida_id, nueva_ruta_id);

    if (!success) {
      return res.status(404).json({
        error: 'No se pudo cambiar la ruta. La salida podría no estar activa.'
      });
    }

    // Obtener nueva ruta para descripción
    const nuevaRuta = await db.oneOrNone('SELECT codigo FROM ruta WHERE id = $1', [nueva_ruta_id]);
    await db.none(
      `INSERT INTO salida_evento (salida_id, tipo, descripcion, datos_ant, datos_new, realizado_por)
       VALUES ($1, 'CAMBIO_RUTA', $2, $3, $4, $5)`,
      [miSalida.salida_id,
       `Ruta cambiada: ${salidaAntes?.ruta_codigo ?? 'sin ruta'} → ${nuevaRuta?.codigo ?? nueva_ruta_id}`,
       JSON.stringify({ ruta_id: salidaAntes?.ruta_inicial_id }),
       JSON.stringify({ ruta_id: nueva_ruta_id }),
       req.user.userId]
    );

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
    `;

    // Capturar valores anteriores antes de actualizar
    const salidaAntes = await db.oneOrNone(
      'SELECT km_inicial, combustible_inicial FROM salida_unidad WHERE id = $1',
      [miSalida.salida_id]
    );

    await db.none(query, values);

    // Registrar eventos de auditoría
    if (km_inicial !== undefined && salidaAntes) {
      await db.none(
        `INSERT INTO salida_evento (salida_id, tipo, descripcion, datos_ant, datos_new, realizado_por)
         VALUES ($1, 'EDICION_KM', $2, $3, $4, $5)`,
        [miSalida.salida_id,
         `km_inicial editado: ${salidaAntes.km_inicial} → ${km_inicial}`,
         JSON.stringify({ km_inicial: salidaAntes.km_inicial }),
         JSON.stringify({ km_inicial }),
         req.user.userId]
      );
    }
    if ((combustible_inicial !== undefined || combustible_inicial_fraccion !== undefined) && salidaAntes) {
      const nuevoVal = combustible_inicial_fraccion ?? combustible_inicial;
      await db.none(
        `INSERT INTO salida_evento (salida_id, tipo, descripcion, datos_ant, datos_new, realizado_por)
         VALUES ($1, 'EDICION_COMBUSTIBLE', $2, $3, $4, $5)`,
        [miSalida.salida_id,
         `combustible_inicial editado: ${salidaAntes.combustible_inicial} → ${nuevoVal}`,
         JSON.stringify({ combustible_inicial: salidaAntes.combustible_inicial }),
         JSON.stringify({ combustible_inicial: nuevoVal }),
         req.user.userId]
      );
    }

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

// ========================================
// BITÁCORA DIARIA
// ========================================

/**
 * GET /api/salidas/bitacora-dia?fecha=2026-01-30[&sede_id=X]
 * Todas las unidades que tuvieron salida ese día, con resumen.
 * El timeline completo se carga por separado en bitacora-timeline/:salidaId.
 */
export async function getBitacoraDia(req: Request, res: Response) {
  try {
    const { fecha, sede_id } = req.query;

    if (!fecha) {
      return res.status(400).json({ error: 'fecha es requerida (YYYY-MM-DD)' });
    }

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
      [fecha, sede_id ? parseInt(sede_id as string) : null]
    );

    return res.json({
      success: true,
      fecha,
      total: rows.length,
      salidas: rows,
    });
  } catch (error) {
    console.error('Error en getBitacoraDia:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/salidas/bitacora-timeline/:salidaId
 * Timeline completo y ordenado de una salida específica.
 * Incluye: inicio, situaciones (+fotos/videos), actividades, eventos (ediciones/COP/cambios ruta), fin.
 */
export async function getBitacoraTimeline(req: Request, res: Response) {
  try {
    const salidaId = parseInt(req.params.salidaId, 10);
    if (isNaN(salidaId)) {
      return res.status(400).json({ error: 'salidaId inválido' });
    }

    // Verificar que la salida existe
    const salida = await db.oneOrNone(
      `SELECT s.*, u.codigo AS unidad_codigo, u.tipo_unidad,
              r.codigo AS ruta_codigo, r.nombre AS ruta_nombre,
              fin.nombre_completo AS finalizado_por_nombre
       FROM salida_unidad s
       JOIN unidad u ON s.unidad_id = u.id
       LEFT JOIN ruta r ON s.ruta_inicial_id = r.id
       LEFT JOIN usuario fin ON s.finalizada_por = fin.id
       WHERE s.id = $1`,
      [salidaId]
    );

    if (!salida) {
      return res.status(404).json({ error: 'Salida no encontrada' });
    }

    // Construir timeline unificado con UNION ALL
    const eventos = await db.any(
      `-- SITUACIONES
       SELECT
         'SITUACION'          AS tipo,
         sit.id               AS ref_id,
         sit.created_at       AS ts,
         json_build_object(
           -- Identificación
           'id',              sit.id,
           'codigo',          sit.codigo_situacion,
           'tipo_macro',      sit.tipo_situacion,
           'tipo_nombre',     cts.nombre,
           'estado',          sit.estado,

           -- Ubicación
           'km',              sit.km,
           'sentido',         sit.sentido,
           'area',            sit.area,
           'referencia',      COALESCE(sit.referencia_ubicacion, sit.direccion_detallada),
           'departamento',    dep.nombre,
           'municipio',       mun.nombre,
           'latitud',         sit.latitud,
           'longitud',        sit.longitud,

           -- Observaciones y causa
           'observaciones',   sit.observaciones,
           'causa_probable',  sit.causa_probable,
           'causa_especificar', sit.causa_especificar,

           -- Tiempos
           'hora_aviso',      sit.fecha_hora_aviso,
           'hora_llegada',    sit.fecha_hora_llegada,
           'hora_cierre',     sit.fecha_hora_finalizacion,

           -- Víctimas
           'heridos',         sit.heridos,
           'heridos_leves',   sit.heridos_leves,
           'heridos_graves',  sit.heridos_graves,
           'fallecidos',      sit.fallecidos,
           'ilesos',          sit.ilesos,
           'trasladados',     sit.trasladados,
           'fugados',         sit.fugados,

           -- Daños
           'danios_materiales',      sit.danios_materiales,
           'danios_infraestructura', sit.danios_infraestructura,
           'danios_descripcion',     sit.danios_descripcion,

           -- Condiciones de la vía
           'clima',           sit.clima,
           'carga_vehicular', sit.carga_vehicular,
           'tipo_pavimento',  sit.tipo_pavimento,
           'iluminacion',     sit.iluminacion,
           'senalizacion',    sit.senalizacion,
           'visibilidad',     sit.visibilidad,
           'via_estado',      sit.via_estado,

           -- Acuerdo entre involucrados
           'acuerdo_involucrados', sit.acuerdo_involucrados,
           'acuerdo_detalle',      sit.acuerdo_detalle,

           -- Reporte / boleta
           'reportado_por_nombre',   sit.reportado_por_nombre,
           'reportado_por_telefono', sit.reportado_por_telefono,
           'numero_boleta',          sit.numero_boleta,
           'codigo_boleta',          sit.codigo_boleta,

           -- Obstrucción específica
           'obstruccion_data',  sit.obstruccion_data,

           -- Quién creó y quién cerró (actualizado_por = último en modificar)
           'creado_por_nombre',  u_cre.nombre_completo,
           'cerrado_por_nombre', u_cer.nombre_completo,

           -- Vehículos involucrados
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

           -- Multimedia (fotos y videos)
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
           'creado_por_nombre', u2.nombre_completo
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
      [salidaId]
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
