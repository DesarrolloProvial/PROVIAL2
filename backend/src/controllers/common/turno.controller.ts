import { Request, Response } from 'express';
import { TurnoModel } from '../../models/common/turno.model';
import { normalizeId } from '../../utils/db.utils';

export async function getTurnoHoy(req: Request, res: Response) {
  try {
    const sedeId = req.user!.sede;
    const turno = await TurnoModel.findHoy(sedeId);
    const asignaciones = sedeId ? await TurnoModel.getAsignacionesPendientes(sedeId) : [];

    return res.json({
      turno,
      asignaciones,
      total_asignaciones: asignaciones.length,
      sede_usuario: sedeId,
    });
  } catch (error) {
    console.error('Error en getTurnoHoy:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getAsignacionesPendientes(req: Request, res: Response) {
  try {
    const sedeId = req.user!.sede;
    const asignaciones = sedeId ? await TurnoModel.getAsignacionesPendientes(sedeId) : [];
    return res.json({ asignaciones, total: asignaciones.length, sede_usuario: sedeId });
  } catch (error) {
    console.error('Error en getAsignacionesPendientes:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getMiAsignacionHoy(req: Request, res: Response) {
  try {
    const asignacion = await TurnoModel.getMiAsignacionHoy(req.user!.userId);
    if (!asignacion) {
      return res.status(404).json({
        error: 'No tienes asignación para hoy',
        message: 'No estás asignado a ninguna unidad el día de hoy. Contacta a Operaciones.',
      });
    }
    return res.json(asignacion);
  } catch (error) {
    console.error('Error en getMiAsignacionHoy:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getTurnoByFecha(req: Request, res: Response) {
  try {
    const { fecha } = req.params;
    if (!fecha) return res.status(400).json({ error: 'La fecha es requerida' });

    const turno = await TurnoModel.findByFecha(fecha);
    if (!turno) return res.status(404).json({ error: 'No existe turno para esta fecha', fecha });

    return res.json({ turno });
  } catch (error) {
    console.error('Error en getTurnoByFecha:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function createTurno(req: Request, res: Response) {
  try {
    const { fecha, fecha_fin, observaciones, sede_id } = req.body;
    if (!fecha) return res.status(400).json({ error: 'La fecha es requerida' });

    const sedeIdFinal = sede_id || req.user!.sede || null;

    const existente = await TurnoModel.findTurnoExistente(fecha, sedeIdFinal);
    if (existente) {
      return res.status(200).json({ message: 'Turno existente encontrado', turno: existente });
    }

    const turno = await TurnoModel.create({
      fecha,
      fecha_fin: fecha_fin || null,
      observaciones,
      creado_por: req.user!.userId,
      sede_id: sedeIdFinal,
    });

    return res.status(201).json({ message: 'Turno creado exitosamente', turno });
  } catch (error) {
    console.error('Error en createTurno:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function createAsignacion(req: Request, res: Response) {
  try {
    const turnoId = normalizeId(req.params.id);
    if (!turnoId) return res.status(400).json({ error: 'turnoId inválido' });

    const {
      tipo_asignacion, unidad_id, ruta_id, km_inicio, km_final,
      sentido, acciones, combustible_inicial, combustible_asignado,
      hora_salida, hora_entrada_estimada, tripulacion,
    } = req.body;

    const tipo = tipo_asignacion || 'PATRULLA';

    const resultado = await TurnoModel.crearAsignacionConTripulacion(
      turnoId,
      tipo,
      { unidad_id, ruta_id, km_inicio, km_final, sentido, acciones, combustible_inicial, combustible_asignado, hora_salida, hora_entrada_estimada },
      Array.isArray(tripulacion) ? tripulacion : []
    );

    return res.status(201).json({
      message: 'Asignación creada exitosamente',
      asignacion: resultado.asignacion,
      tripulacion: resultado.tripulacionCreada,
    });
  } catch (error: any) {
    console.error('Error en createAsignacion:', error);
    if (error.code === '23505') return res.status(409).json({ error: 'La unidad ya tiene una asignación para este turno' });
    if (error.code === '23514') return res.status(400).json({ error: `Valor inválido: ${error.message}` });
    if (error.message?.startsWith('INACTIVO:')) {
      const motivo = error.message.split(':')[2] || 'Desconocido';
      return res.status(409).json({ error: `No se puede asignar la tripulación. Uno de los usuarios está inactivo por: ${motivo}` });
    }
    if (error.code === 'P0001') return res.status(400).json({ error: error.message });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function marcarSalida(req: Request, res: Response) {
  try {
    const miAsignacion = await TurnoModel.getMiAsignacionHoy(req.user!.userId);
    if (!miAsignacion) return res.status(404).json({ error: 'No tienes asignación para hoy' });

    const asignacion = await TurnoModel.marcarSalida(miAsignacion.asignacion_id);
    return res.json({ message: 'Salida registrada exitosamente', asignacion, hora_salida_real: asignacion.hora_salida_real });
  } catch (error) {
    console.error('Error en marcarSalida:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function marcarEntrada(req: Request, res: Response) {
  try {
    const { combustible_final, observaciones_finales } = req.body;

    const miAsignacion = await TurnoModel.getMiAsignacionHoy(req.user!.userId);
    if (!miAsignacion) return res.status(404).json({ error: 'No tienes asignación para hoy' });

    const asignacion = await TurnoModel.marcarEntrada(miAsignacion.asignacion_id, { combustible_final, observaciones_finales });
    return res.json({
      message: 'Entrada registrada exitosamente. Turno finalizado.',
      asignacion,
      resumen: {
        hora_salida: asignacion.hora_salida_real,
        hora_entrada: asignacion.hora_entrada_real,
        km_recorridos: asignacion.km_recorridos,
        combustible_usado: asignacion.combustible_inicial && combustible_final
          ? (asignacion.combustible_inicial - combustible_final).toFixed(2) : null,
      },
    });
  } catch (error) {
    console.error('Error en marcarEntrada:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function createReporteHorario(req: Request, res: Response) {
  try {
    const { km_actual, sentido_actual, latitud, longitud, novedad } = req.body;
    if (!km_actual) return res.status(400).json({ error: 'km_actual es requerido' });

    const miAsignacion = await TurnoModel.getMiAsignacionHoy(req.user!.userId);
    if (!miAsignacion) return res.status(404).json({ error: 'No tienes asignación para hoy. No puedes crear reportes horarios.' });

    const reporte = await TurnoModel.createReporteHorario({
      asignacion_id: miAsignacion.asignacion_id,
      km_actual, sentido_actual, latitud, longitud,
      novedad: novedad || 'Sin novedad',
      reportado_por: req.user!.userId,
    });

    return res.status(201).json({ message: 'Reporte horario registrado exitosamente', reporte });
  } catch (error) {
    console.error('Error en createReporteHorario:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getReportesHorarios(req: Request, res: Response) {
  try {
    const asignacionId = normalizeId(req.params.asignacionId);
    if (!asignacionId) return res.status(400).json({ error: 'asignacionId inválido' });

    const reportes = await TurnoModel.getReportesHorarios(asignacionId);
    return res.json({ reportes, total: reportes.length });
  } catch (error) {
    console.error('Error en getReportesHorarios:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function cambiarRutaActiva(req: Request, res: Response) {
  try {
    const nuevaRutaId = normalizeId(req.body.nueva_ruta_id);
    if (!nuevaRutaId) return res.status(400).json({ error: 'nueva_ruta_id es requerido' });

    const miAsignacion = await TurnoModel.getMiAsignacionHoy(req.user!.userId);
    if (!miAsignacion) return res.status(404).json({ error: 'No tienes asignación para hoy' });

    const asignacion = await TurnoModel.cambiarRutaActiva(miAsignacion.asignacion_id, nuevaRutaId);
    return res.json({ message: 'Ruta activa actualizada exitosamente', asignacion });
  } catch (error) {
    console.error('Error en cambiarRutaActiva:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function registrarCombustible(req: Request, res: Response) {
  try {
    const { nivel_fraccion, nivel_decimal, tipo, observaciones } = req.body;

    if (!nivel_fraccion) return res.status(400).json({ error: 'El nivel de combustible es requerido (nivel_fraccion)' });
    if (!tipo || !['INICIAL', 'ACTUAL', 'FINAL'].includes(tipo)) {
      return res.status(400).json({ error: 'El tipo es requerido y debe ser INICIAL, ACTUAL o FINAL' });
    }

    const miAsignacion = await TurnoModel.getMiAsignacionHoy(req.user!.userId);
    if (!miAsignacion) return res.status(404).json({ error: 'No tienes asignación para hoy' });

    const registro = await TurnoModel.registrarCombustible({
      asignacion_id: miAsignacion.asignacion_id,
      nivel_fraccion,
      nivel_decimal: parseFloat(nivel_decimal) || 0,
      tipo,
      observaciones,
      registrado_por: req.user!.userId,
    });

    return res.status(201).json({ message: 'Combustible registrado exitosamente', registro });
  } catch (error) {
    console.error('Error en registrarCombustible:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateAsignacion(req: Request, res: Response) {
  try {
    const asignacionId = normalizeId(req.params.id);
    if (!asignacionId) return res.status(400).json({ error: 'asignacionId inválido' });

    const asignacion = await TurnoModel.getAsignacionConSede(asignacionId);
    if (!asignacion) return res.status(404).json({ error: 'Asignación no encontrada' });

    const userSedeId = req.user!.sede;
    const puedeVerTodas = req.user!.puede_ver_todas_sedes;
    if (!puedeVerTodas && userSedeId && asignacion.sede_id && asignacion.sede_id !== userSedeId) {
      return res.status(403).json({ error: 'No tienes permiso para editar asignaciones de otra sede' });
    }

    if (asignacion.hora_salida_real) {
      return res.status(400).json({
        error: 'No se puede modificar una asignación que ya ha salido',
        message: 'La unidad ya registró su salida. Solo se pueden editar asignaciones pendientes.',
      });
    }

    const salidaActiva = await TurnoModel.getSalidaActivaPorUnidad(asignacion.unidad_id);
    if (salidaActiva) {
      return res.status(400).json({
        error: 'No se puede modificar una asignación con salida activa',
        message: `La unidad ${asignacion.unidad_codigo} tiene una salida en curso. Debe finalizar la jornada primero.`,
      });
    }

    const { ruta_id, km_inicio, km_final, sentido, acciones, hora_salida, hora_entrada_estimada, tripulacion } = req.body;
    const asignacionActualizada = await TurnoModel.updateAsignacion(asignacionId, {
      ruta_id, km_inicio, km_final, sentido, acciones, hora_salida, hora_entrada_estimada,
    });

    let tripulacionActualizada: any[] = [];
    if (Array.isArray(tripulacion) && tripulacion.length > 0) {
      await TurnoModel.deleteTripulacion(asignacionId);

      const ordenada = [...tripulacion].sort((a: any, b: any) => {
        const orden: Record<string, number> = { PILOTO: 1, COPILOTO: 2, ACOMPANANTE: 3 };
        return (orden[a.rol_tripulacion] || 4) - (orden[b.rol_tripulacion] || 4);
      });

      let comandanteAsignado = ordenada.some((m: any) => m.es_comandante);
      for (let i = 0; i < ordenada.length; i++) {
        const miembro = ordenada[i];
        let esComandante = miembro.es_comandante || false;
        if (!comandanteAsignado && i === 0) { esComandante = true; comandanteAsignado = true; }
        const t = await TurnoModel.addTripulacion({
          asignacion_id: asignacionId,
          usuario_id: miembro.usuario_id,
          rol_tripulacion: miembro.rol_tripulacion,
          es_comandante: esComandante,
        });
        tripulacionActualizada.push(t);
      }
    }

    return res.json({
      message: 'Asignación actualizada exitosamente',
      asignacion: asignacionActualizada,
      tripulacion: tripulacionActualizada.length > 0 ? tripulacionActualizada : undefined,
    });
  } catch (error) {
    console.error('Error en updateAsignacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function deleteAsignacion(req: Request, res: Response) {
  try {
    const asignacionId = normalizeId(req.params.id);
    if (!asignacionId) return res.status(400).json({ error: 'asignacionId inválido' });

    const forzar = req.query.forzar === 'true';

    const asignacion = await TurnoModel.getAsignacionConSede(asignacionId);
    if (!asignacion) return res.status(404).json({ error: 'Asignación no encontrada' });

    const userSedeId = req.user!.sede;
    const puedeVerTodas = req.user!.puede_ver_todas_sedes;
    if (!puedeVerTodas && userSedeId && asignacion.sede_id && asignacion.sede_id !== userSedeId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar asignaciones de otra sede' });
    }

    if (forzar && req.user!.rol !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'No tiene permisos para forzar la eliminación. Contacte al Super Administrador.' });
    }

    if (asignacion.hora_salida_real && !forzar) {
      return res.status(400).json({
        error: 'No se puede eliminar una asignación que ya ha salido',
        message: 'La unidad ya registró su salida. Solo el Super Admin puede forzar esta acción.',
      });
    }

    const salidaActiva = await TurnoModel.getSalidaActivaPorUnidad(asignacion.unidad_id);

    if (salidaActiva && !forzar && asignacion.hora_salida_real) {
      return res.status(400).json({
        error: 'No se puede eliminar una asignación con salida activa',
        message: `La unidad ${asignacion.unidad_codigo} tiene una salida en curso desde ${salidaActiva.fecha_hora_salida}.`,
        salida_id: salidaActiva.id,
      });
    }

    if (salidaActiva && forzar) {
      await TurnoModel.cerrarSalidaForzada(salidaActiva.id);
    }

    await TurnoModel.deleteAsignacion(asignacionId);
    await TurnoModel.limpiarTurnoVacio(asignacion.turno_id);

    return res.json({
      message: salidaActiva && forzar
        ? 'Asignación eliminada y salida cerrada exitosamente'
        : 'Asignación eliminada exitosamente',
      asignacion_id: asignacionId,
      salida_cerrada: salidaActiva && forzar ? salidaActiva.id : null,
    });
  } catch (error) {
    console.error('Error en deleteAsignacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function liberarNomina(req: Request, res: Response) {
  try {
    const turnoId = normalizeId(req.params.turnoId);
    if (!turnoId) return res.status(400).json({ error: 'turnoId inválido' });

    const userSedeId = req.user!.sede;
    const userRol = req.user!.rol;
    const { asignacion_ids } = req.body as { asignacion_ids?: number[] };

    if (!['ENCARGADO_NOMINAS', 'OPERACIONES', 'ADMIN', 'SUPER_ADMIN'].includes(userRol)) {
      return res.status(403).json({ error: 'No tienes permisos para liberar nómina' });
    }

    if (!asignacion_ids || asignacion_ids.length === 0) {
      const countBorradores = await TurnoModel.countBorradores(turnoId, userSedeId);
      if (countBorradores === 0) return res.status(400).json({ error: 'No hay asignaciones en borrador para liberar', count: 0 });
    }

    const { count: liberadas, codigos } = await TurnoModel.liberarNomina(
      turnoId,
      userSedeId,
      asignacion_ids && asignacion_ids.length > 0 ? asignacion_ids : undefined
    );

    if (liberadas === 0) {
      return res.status(400).json({ error: 'No se liberó ninguna asignación. Verifique que estén en borrador.', count: 0 });
    }

    return res.json({ message: `${liberadas} asignación(es) liberada(s) exitosamente`, count: liberadas, codigos, turno_id: turnoId });
  } catch (error) {
    console.error('Error en liberarNomina:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
