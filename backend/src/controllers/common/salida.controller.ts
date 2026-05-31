import { Request, Response } from 'express';
import { SalidaModel } from '../../models/common/salida.model';
import { TurnoModel } from '../../models/common/turno.model';
import { normalizeId, parseIndicador } from '../../utils/db.utils';
import { resolveContextoActivo } from '../../utils/operaciones.utils';
import { emitUnidadCambioEstado } from '../../services/common/socket.service';

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

    const { salidaId, inspeccionId } = await SalidaModel.iniciarSalidaBrigada({
      unidad_id:         unidadId,
      ruta_id:           rutaId ?? null,
      km_inicial:        normalizeId(km_inicial) ?? null,
      indicador,
      observaciones_salida: observaciones_salida || null,
    });

    // Vincular salida con asignacion y actualizar turno (no fatal si falla)
    try {
      await SalidaModel.setAsignacionId(salidaId, asignacionTurno.asignacion_id);
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
      emitUnidadCambioEstado({
        unidad_id: unidadId,
        unidad_codigo: s.unidad_codigo || `U-${unidadId}`,
        estado: 'EN_SALIDA',
        sede_id: s.sede_id,
        ruta_id: rutaId || undefined,
        ultima_situacion: 'SALIDA_INICIADA',
      });
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
      inspeccion_asociada: inspeccionId,
      instruccion: 'Ahora debes registrar SALIDA_SEDE como primera situación',
    });
  } catch (error) {
    console.error('Error en iniciarSalida:', error);
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
      asignacion_id,
      ruta_inicial_id,
      km_inicial,
      combustible_inicial,
      combustible_fraccion,
      observaciones_salida,
      tripulacion,
    } = req.body;

    if (!unidad_id) return res.status(400).json({ error: 'unidad_id es requerido' });
    const unidadId = normalizeId(unidad_id);
    if (!unidadId) return res.status(400).json({ error: 'unidad_id inválido' });

    const asignacionId = normalizeId(asignacion_id) ?? null;
    const indicador    = parseIndicador(combustible_fraccion ?? combustible_inicial);

    // Si viene asignacion_id: salida desde asignación publicada (misma lógica que brigada)
    let rutaId = normalizeId(ruta_inicial_id) ?? null;
    let turnoId: number | null = null;
    if (asignacionId) {
      const asig = await (await import('../../models/operaciones/asignacionAvanzada.model')).AsignacionAvanzadaModel
        .getAsignacionById(asignacionId).catch(() => null);
      if (!asig) return res.status(404).json({ error: 'Asignación no encontrada' });
      if (asig.unidad_id !== unidadId) return res.status(400).json({ error: 'La asignación no corresponde a esta unidad' });
      rutaId = rutaId ?? asig.ruta_id ?? null;
      turnoId = asig.turno_id ?? null;
    }

    const resultado = await SalidaModel.iniciarSalidaCOPCompleto({
      unidad_id:            unidadId,
      ruta_inicial_id:      rutaId,
      km_inicial:           normalizeId(km_inicial) ?? null,
      indicador,
      observaciones_salida: observaciones_salida ?? null,
      tripulacion:          Array.isArray(tripulacion) ? tripulacion : null,
      userId:               req.user!.userId,
    });

    if ('conflict' in resultado) {
      return res.status(409).json({ error: 'La unidad ya tiene una salida activa' });
    }

    const { salidaId } = resultado;

    // Vincular con asignacion y actualizar turno (igual que brigada)
    if (asignacionId) {
      try {
        await SalidaModel.setAsignacionId(salidaId, asignacionId);
        await TurnoModel.marcarSalida(asignacionId);
        if (turnoId) await TurnoModel.updateEstado(turnoId, 'ACTIVO');
      } catch (e) {
        console.warn('[COP_SALIDA] No se pudo actualizar asignacion/turno:', e);
      }
    }

    const salida = await SalidaModel.getSalidaById(salidaId);
    if (salida) {
      const s = salida as any;
      emitUnidadCambioEstado({
        unidad_id: unidadId,
        unidad_codigo: s.unidad_codigo || `U-${unidadId}`,
        estado: 'EN_SALIDA',
        sede_id: s.sede_id,
        ruta_id: rutaId || undefined,
        ultima_situacion: asignacionId ? 'SALIDA_INICIADA' : 'SALIDA_INICIADA_COP',
      });
    }

    return res.status(201).json({ message: 'Salida iniciada desde COP', salida_id: salidaId, salida });
  } catch (error) {
    console.error('Error en iniciarSalidaCOP:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/salidas/cop/salida-emergencia
 * Crea turno + asignacion + tripulacion + salida en una sola transacción.
 */
export async function iniciarSalidaEmergencia(req: Request, res: Response) {
  try {
    const {
      unidad_id,
      ruta_id,
      km_inicial,
      combustible_inicial,
      combustible_fraccion,
      observaciones_salida,
      tripulacion,
    } = req.body;

    if (!unidad_id)                        return res.status(400).json({ error: 'unidad_id es requerido' });
    if (!Array.isArray(tripulacion) || tripulacion.length === 0)
                                           return res.status(400).json({ error: 'Se requiere al menos un integrante en la tripulación' });

    const unidadId  = normalizeId(unidad_id);
    if (!unidadId) return res.status(400).json({ error: 'unidad_id inválido' });
    const indicador = parseIndicador(combustible_fraccion ?? combustible_inicial);

    const resultado = await SalidaModel.iniciarSalidaEmergenciaCOP({
      unidad_id:  unidadId,
      ruta_id:    normalizeId(ruta_id) ?? null,
      km_inicial: normalizeId(km_inicial) ?? null,
      indicador,
      obs:        observaciones_salida ?? null,
      tripulacion: tripulacion.map((m: any) => ({
        usuario_id:      Number(m.usuario_id),
        rol_tripulacion: m.rol_en_salida ?? m.rol_tripulacion ?? 'ACOMPAÑANTE',
        es_comandante:   m.es_comandante ?? false,
      })),
      userId: req.user!.userId,
    });

    if ('conflict' in resultado) {
      return res.status(409).json({ error: 'La unidad ya tiene una salida activa' });
    }

    const { salidaId, asignacion_id, forzadaNoDisponible } = resultado;
    const salida = await SalidaModel.getSalidaById(salidaId);
    if (salida) {
      const s = salida as any;
      emitUnidadCambioEstado({
        unidad_id: unidadId,
        unidad_codigo: s.unidad_codigo || `U-${unidadId}`,
        estado: 'EN_SALIDA',
        sede_id: s.sede_id,
        ruta_id: normalizeId(ruta_id) || undefined,
        ultima_situacion: 'SALIDA_INICIADA_COP',
      });
    }

    return res.status(201).json({
      message: 'Salida de emergencia iniciada',
      salida_id: salidaId,
      asignacion_id,
      forzada_no_disponible: forzadaNoDisponible,
      salida,
    });
  } catch (error) {
    console.error('Error en iniciarSalidaEmergencia:', error);
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

    const salidaInfo = await SalidaModel.finalizarSalidaCOP(id, {
      km_final:            normalizeId(km_final),
      indicador,
      observaciones_regreso: observaciones_regreso || null,
      userId,
    });
    if (!salidaInfo) return res.status(404).json({ error: 'Salida no encontrada o ya finalizada' });

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

    const rutaId = normalizeId(nueva_ruta_id);
    if (!rutaId) return res.status(400).json({ error: 'nueva_ruta_id inválido' });

    let salidaId: number;

    if (rol === 'COP' || rol === 'OPERACIONES' || rol === 'ADMIN' || rol === 'SUPER_ADMIN') {
      if (!unidadId) return res.status(400).json({ error: 'unidadId es requerido para tu rol' });
      const unidad = normalizeId(unidadId);
      if (!unidad) return res.status(400).json({ error: 'unidadId inválido' });
      const row = await SalidaModel.getSalidaActivaDeUnidad(unidad);
      if (!row) return res.status(404).json({ error: 'La unidad no tiene salida activa' });
      salidaId = row.id;
    } else {
      const ctx = await resolveContextoActivo(userId);
      if (!ctx.salida_id) {
        return res.status(412).json({ error: 'No tienes salida activa', code: 'NO_CONTEXTO_OPERATIVO' });
      }
      salidaId = ctx.salida_id;
    }

    const salidaActualizada = await SalidaModel.registrarCambioRuta(salidaId, rutaId, userId);
    if (!salidaActualizada) {
      return res.status(404).json({ error: 'No se pudo cambiar la ruta. La salida podría no estar activa.' });
    }

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

    const indicador = parseIndicador(combustible_inicial_fraccion ?? combustible_inicial);

    const salidaActualizada = await SalidaModel.editarDatosSalida(
      ctx.salida_id,
      {
        km_inicial:  km_inicial  !== undefined ? normalizeId(km_inicial) : undefined,
        combustible: indicador   !== null      ? indicador               : undefined,
      },
      userId,
    );

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
    const unidadId = normalizeId(req.params.unidadId);
    if (!unidadId) return res.status(400).json({ error: 'ID inválido' });
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const fechaDesde = req.query.fecha_desde as string | undefined;

    const rows = await SalidaModel.getBitacoraUnidad(unidadId, limit, fechaDesde);
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
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ error: 'fecha es requerida (YYYY-MM-DD)' });

    const sedeId = req.query.sede_id ? normalizeId(req.query.sede_id as string) : undefined;
    if (req.query.sede_id && !sedeId) return res.status(400).json({ error: 'sede_id inválido' });

    const rows = await SalidaModel.getBitacoraDia(fecha as string, sedeId ?? undefined);
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

    const resultado = await SalidaModel.getBitacoraTimeline(salidaId);
    if (!resultado) return res.status(404).json({ error: 'Salida no encontrada' });

    const { salida, timeline } = resultado;
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
      timeline,
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
