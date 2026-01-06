import { Request, Response } from 'express';
import { TurnoModel } from '../models/turno.model';
import { db } from '../config/database';

// GET /api/turnos/hoy - Obtener turno de hoy con asignaciones de hoy y futuras
// SIEMPRE filtra por sede del usuario (puede_ver_todas_sedes solo aplica en página de Sedes)
export async function getTurnoHoy(req: Request, res: Response) {
  try {
    const userSedeId = req.user?.sede;
    const turno = await TurnoModel.findHoy(userSedeId);

    // SIEMPRE filtrar por sede del usuario en el dashboard general
    let asignaciones;
    if (userSedeId) {
      asignaciones = await db.any(
        'SELECT * FROM v_asignaciones_pendientes WHERE sede_id = $1 ORDER BY fecha, hora_salida',
        [userSedeId]
      );
    } else {
      // Usuarios sin sede no ven ninguna asignación
      asignaciones = [];
    }

    return res.json({
      turno,
      asignaciones,
      total_asignaciones: asignaciones.length,
      sede_usuario: userSedeId
    });
  } catch (error) {
    console.error('Error en getTurnoHoy:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// GET /api/turnos/pendientes - Obtener asignaciones pendientes (filtradas por sede)
// SIEMPRE filtra por sede del usuario
export async function getAsignacionesPendientes(req: Request, res: Response) {
  try {
    const userSedeId = req.user?.sede;

    let asignaciones;
    if (userSedeId) {
      asignaciones = await db.any(
        'SELECT * FROM v_asignaciones_pendientes WHERE sede_id = $1 ORDER BY fecha, hora_salida',
        [userSedeId]
      );
    } else {
      asignaciones = [];
    }

    return res.json({
      asignaciones,
      total: asignaciones.length,
      sede_usuario: userSedeId
    });
  } catch (error) {
    console.error('Error en getAsignacionesPendientes:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// GET /api/turnos/mi-asignacion-hoy - Obtener mi asignación de hoy (para app móvil)
export async function getMiAsignacionHoy(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    console.log('getMiAsignacionHoy - UserID:', req.user.userId);
    const asignacion = await TurnoModel.getMiAsignacionHoy(req.user.userId);
    console.log('getMiAsignacionHoy - Resultado:', asignacion ? 'Encontrado' : 'NULL');

    if (!asignacion) {
      return res.status(404).json({
        error: 'No tienes asignación para hoy',
        message: 'No estás asignado a ninguna unidad el día de hoy. Contacta a Operaciones.'
      });
    }

    return res.json(asignacion);
  } catch (error) {
    console.error('Error en getMiAsignacionHoy:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// GET /api/turnos/fecha/:fecha - Obtener turno por fecha
export async function getTurnoByFecha(req: Request, res: Response) {
  try {
    const { fecha } = req.params;

    if (!fecha) {
      return res.status(400).json({ error: 'La fecha es requerida' });
    }

    const turno = await TurnoModel.findByFecha(fecha);

    if (!turno) {
      return res.status(404).json({
        error: 'No existe turno para esta fecha',
        fecha
      });
    }

    return res.json({ turno });
  } catch (error) {
    console.error('Error en getTurnoByFecha:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// POST /api/turnos - Crear turno (solo Operaciones)
export async function createTurno(req: Request, res: Response) {
  try {
    const { fecha, fecha_fin, observaciones, sede_id } = req.body;

    if (!fecha) {
      return res.status(400).json({ error: 'La fecha es requerida' });
    }

    // Determinar sede_id: del body, o del usuario que crea
    const sedeIdFinal = sede_id || req.user?.sede || null;

    // Verificar que no exista ya un turno para esa fecha y sede
    const existente = await db.oneOrNone(
      'SELECT * FROM turno WHERE fecha = $1 AND (sede_id = $2 OR ($2 IS NULL AND sede_id IS NULL))',
      [fecha, sedeIdFinal]
    );

    if (existente) {
      // Si existe, lo usamos (las asignaciones se agregarán a este turno)
      return res.status(200).json({
        message: 'Turno existente encontrado',
        turno: existente
      });
    }

    const turno = await TurnoModel.create({
      fecha,
      fecha_fin: fecha_fin || null,
      observaciones,
      creado_por: req.user!.userId,
      sede_id: sedeIdFinal
    });

    return res.status(201).json({
      message: 'Turno creado exitosamente',
      turno
    });
  } catch (error) {
    console.error('Error en createTurno:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// POST /api/turnos/:id/asignaciones - Crear asignación de unidad
export async function createAsignacion(req: Request, res: Response) {
  try {
    const { id: turnoId } = req.params;
    const {
      tipo_asignacion, // Nuevo campo
      unidad_id,
      ruta_id,
      km_inicio,
      km_final,
      sentido,
      acciones,
      combustible_inicial,
      combustible_asignado,
      hora_salida,
      hora_entrada_estimada,
      tripulacion // Array de { usuario_id, rol_tripulacion }
    } = req.body;

    const tipo = tipo_asignacion || 'PATRULLA';

    if (tipo === 'PATRULLA' && !unidad_id) {
      return res.status(400).json({ error: 'unidad_id es requerido para asignaciones de patrulla' });
    }

    // Verificar conflictos de tripulación ANTES de la transacción
    if (tripulacion && Array.isArray(tripulacion)) {
      for (const miembro of tripulacion) {
        const conflicto = await db.oneOrNone(
          `SELECT u.codigo, t.fecha, au.tipo_asignacion
            FROM tripulacion_turno tt
            JOIN asignacion_unidad au ON tt.asignacion_id = au.id
            JOIN turno t ON au.turno_id = t.id
            LEFT JOIN unidad u ON au.unidad_id = u.id
            WHERE tt.usuario_id = $1
              AND t.fecha = (SELECT fecha FROM turno WHERE id = $2)
           `,
          [miembro.usuario_id, parseInt(turnoId)]
        );

        if (conflicto) {
          const usuarioConflictivo = await db.oneOrNone('SELECT nombre_completo, chapa FROM usuario WHERE id = $1', [miembro.usuario_id]);
          const nombre = usuarioConflictivo ? `${usuarioConflictivo.nombre_completo} (${usuarioConflictivo.chapa})` : `Usuario ID ${miembro.usuario_id}`;
          const detalle = conflicto.codigo || conflicto.tipo_asignacion || 'Asignación';

          return res.status(400).json({
            error: `El usuario ${nombre} ya está asignado a ${detalle} en la fecha ${conflicto.fecha}`
          });
        }
      }
    }

    // TRANSACCIÓN ATÓMICA: Si falla algo, se deshace todo
    const resultado = await db.tx(async (t) => {
      // Crear asignación
      const asignacion = await t.one(
        `INSERT INTO asignacion_unidad
         (turno_id, tipo_asignacion, unidad_id, ruta_id, km_inicio, km_final, sentido, acciones,
          combustible_inicial, combustible_asignado, hora_salida, hora_entrada_estimada)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          parseInt(turnoId), tipo, unidad_id, ruta_id, km_inicio, km_final,
          sentido, acciones, combustible_inicial, combustible_asignado,
          hora_salida, hora_entrada_estimada
        ]
      );

      // Agregar tripulación si se proporcionó
      const tripulacionCreada = [];
      if (tripulacion && Array.isArray(tripulacion)) {
        for (const miembro of tripulacion) {
          const tripulante = await t.one(
            `INSERT INTO tripulacion_turno (asignacion_id, usuario_id, rol_tripulacion, es_comandante, telefono_contacto)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [asignacion.id, miembro.usuario_id, miembro.rol_tripulacion, miembro.es_comandante || false, miembro.telefono_contacto || null]
          );
          tripulacionCreada.push(tripulante);
        }
      }

      return { asignacion, tripulacionCreada };
    });

    return res.status(201).json({
      message: 'Asignación creada exitosamente',
      asignacion: resultado.asignacion,
      tripulacion: resultado.tripulacionCreada
    });
  } catch (error: any) {
    console.error('Error en createAsignacion:', error);

    // Manejar errores de constraint
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({
        error: 'La unidad ya tiene una asignación para este turno'
      });
    }

    // Manejar errores de check constraint (como rol_tripulacion inválido)
    if (error.code === '23514') {
      return res.status(400).json({
        error: `Valor inválido: ${error.message}`
      });
    }

    // Manejar errores personalizados del trigger
    if (error.code === 'P0001') {
      return res.status(400).json({
        error: error.message
      });
    }

    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// POST /api/turnos/marcar-salida - Marcar salida de turno
export async function marcarSalida(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // Obtener asignación del usuario para hoy
    const miAsignacion = await TurnoModel.getMiAsignacionHoy(req.user.userId);

    if (!miAsignacion) {
      return res.status(404).json({
        error: 'No tienes asignación para hoy'
      });
    }

    const asignacion = await TurnoModel.marcarSalida(miAsignacion.asignacion_id);

    return res.json({
      message: 'Salida registrada exitosamente',
      asignacion,
      hora_salida_real: asignacion.hora_salida_real
    });
  } catch (error) {
    console.error('Error en marcarSalida:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// POST /api/turnos/marcar-entrada - Marcar entrada de turno
export async function marcarEntrada(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { combustible_final, observaciones_finales } = req.body;

    const miAsignacion = await TurnoModel.getMiAsignacionHoy(req.user.userId);

    if (!miAsignacion) {
      return res.status(404).json({
        error: 'No tienes asignación para hoy'
      });
    }

    const asignacion = await TurnoModel.marcarEntrada(miAsignacion.asignacion_id, {
      combustible_final,
      observaciones_finales
    });

    return res.json({
      message: 'Entrada registrada exitosamente. Turno finalizado.',
      asignacion,
      resumen: {
        hora_salida: asignacion.hora_salida_real,
        hora_entrada: asignacion.hora_entrada_real,
        km_recorridos: asignacion.km_recorridos,
        combustible_usado: asignacion.combustible_inicial && combustible_final
          ? (asignacion.combustible_inicial - combustible_final).toFixed(2)
          : null
      }
    });
  } catch (error) {
    console.error('Error en marcarEntrada:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// POST /api/reportes-horarios - Crear reporte horario (ultra-simplificado)
export async function createReporteHorario(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { km_actual, sentido_actual, latitud, longitud, novedad } = req.body;

    if (!km_actual) {
      return res.status(400).json({ error: 'km_actual es requerido' });
    }

    // Obtener asignación del usuario para hoy
    const miAsignacion = await TurnoModel.getMiAsignacionHoy(req.user.userId);

    if (!miAsignacion) {
      return res.status(404).json({
        error: 'No tienes asignación para hoy. No puedes crear reportes horarios.'
      });
    }

    const reporte = await TurnoModel.createReporteHorario({
      asignacion_id: miAsignacion.asignacion_id,
      km_actual,
      sentido_actual,
      latitud,
      longitud,
      novedad: novedad || 'Sin novedad',
      reportado_por: req.user.userId
    });

    return res.status(201).json({
      message: 'Reporte horario registrado exitosamente',
      reporte
    });
  } catch (error) {
    console.error('Error en createReporteHorario:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// GET /api/reportes-horarios/:asignacionId - Obtener reportes de una asignación
export async function getReportesHorarios(req: Request, res: Response) {
  try {
    const { asignacionId } = req.params;

    const reportes = await TurnoModel.getReportesHorarios(parseInt(asignacionId));

    return res.json({
      reportes,
      total: reportes.length
    });
  } catch (error) {
    console.error('Error en getReportesHorarios:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// POST /api/turnos/cambiar-ruta - Cambiar ruta activa de mi unidad
export async function cambiarRutaActiva(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { nueva_ruta_id } = req.body;

    if (!nueva_ruta_id) {
      return res.status(400).json({ error: 'nueva_ruta_id es requerido' });
    }

    // Obtener asignación del usuario para hoy
    const miAsignacion = await TurnoModel.getMiAsignacionHoy(req.user.userId);

    if (!miAsignacion) {
      return res.status(404).json({
        error: 'No tienes asignación para hoy'
      });
    }

    const asignacion = await TurnoModel.cambiarRutaActiva(
      miAsignacion.asignacion_id,
      parseInt(nueva_ruta_id)
    );

    return res.json({
      message: 'Ruta activa actualizada exitosamente',
      asignacion
    });
  } catch (error) {
    console.error('Error en cambiarRutaActiva:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// POST /api/turnos/registrar-combustible - Registrar combustible actual de mi unidad
export async function registrarCombustible(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { combustible, tipo, observaciones } = req.body;

    if (combustible === undefined || combustible === null) {
      return res.status(400).json({ error: 'El combustible es requerido' });
    }

    if (!tipo || !['INICIAL', 'ACTUAL', 'FINAL'].includes(tipo)) {
      return res.status(400).json({
        error: 'El tipo es requerido y debe ser INICIAL, ACTUAL o FINAL'
      });
    }

    // Obtener asignación del usuario para hoy
    const miAsignacion = await TurnoModel.getMiAsignacionHoy(req.user.userId);

    if (!miAsignacion) {
      return res.status(404).json({
        error: 'No tienes asignación para hoy'
      });
    }

    // Registrar el combustible
    const registro = await TurnoModel.registrarCombustible({
      asignacion_id: miAsignacion.asignacion_id,
      combustible: parseFloat(combustible),
      tipo,
      observaciones,
      registrado_por: req.user.userId
    });

    return res.status(201).json({
      message: 'Combustible registrado exitosamente',
      registro
    });
  } catch (error) {
    console.error('Error en registrarCombustible:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// PUT /api/turnos/asignaciones/:id - Actualizar asignación (solo si no ha salido)
export async function updateAsignacion(req: Request, res: Response) {
  try {
    const { id: asignacionId } = req.params;
    const {
      ruta_id,
      km_inicio,
      km_final,
      sentido,
      acciones,
      hora_salida,
      hora_entrada_estimada,
      tripulacion
    } = req.body;

    // Obtener asignación con info de sede
    const asignacion = await db.oneOrNone(`
      SELECT au.*, t.sede_id, u.codigo as unidad_codigo
      FROM asignacion_unidad au
      JOIN turno t ON au.turno_id = t.id
      JOIN unidad u ON au.unidad_id = u.id
      WHERE au.id = $1
    `, [parseInt(asignacionId)]);

    if (!asignacion) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    // Validar que el usuario puede editar (misma sede o puede ver todas)
    const userSedeId = req.user?.sede;
    const puedeVerTodas = req.user?.puede_ver_todas_sedes;

    if (!puedeVerTodas && userSedeId && asignacion.sede_id && asignacion.sede_id !== userSedeId) {
      return res.status(403).json({
        error: 'No tienes permiso para editar asignaciones de otra sede'
      });
    }

    if (asignacion.hora_salida_real) {
      return res.status(400).json({
        error: 'No se puede modificar una asignación que ya ha salido',
        message: 'La unidad ya registró su salida. Solo se pueden editar asignaciones pendientes.'
      });
    }

    // Verificar si hay salida_unidad activa para esta unidad
    const salidaActiva = await db.oneOrNone(`
      SELECT id FROM salida_unidad
      WHERE unidad_id = $1 AND estado = 'EN_SALIDA'
    `, [asignacion.unidad_id]);

    if (salidaActiva) {
      return res.status(400).json({
        error: 'No se puede modificar una asignación con salida activa',
        message: `La unidad ${asignacion.unidad_codigo} tiene una salida en curso. Debe finalizar la jornada primero.`
      });
    }

    // Verificar conflictos de tripulación en update
    if (tripulacion && Array.isArray(tripulacion)) {
      for (const miembro of tripulacion) {
        // Verificar conflicto en OTRAS asignaciones del MISMO turno (fecha)
        const conflicto = await db.oneOrNone(`
          SELECT u.codigo, t.fecha
          FROM tripulacion_turno tt
          JOIN asignacion_unidad au ON tt.asignacion_id = au.id
          JOIN turno t ON au.turno_id = t.id
          JOIN unidad u ON au.unidad_id = u.id
          WHERE tt.usuario_id = $1
            AND t.fecha = (SELECT t2.fecha FROM turno t2 JOIN asignacion_unidad au2 ON au2.turno_id = t2.id WHERE au2.id = $2)
            AND au.id != $2 -- Excluir esta misma asignación
        `, [miembro.usuario_id, parseInt(asignacionId)]);

        if (conflicto) {
          const usuarioConflictivo = await db.oneOrNone('SELECT nombre_completo, chapa FROM usuario WHERE id = $1', [miembro.usuario_id]);
          const nombre = usuarioConflictivo ? `${usuarioConflictivo.nombre_completo} (${usuarioConflictivo.chapa})` : `Usuario ID ${miembro.usuario_id}`;

          return res.status(400).json({
            error: `El usuario ${nombre} ya está asignado a la unidad ${conflicto.codigo} en esta fecha`
          });
        }
      }
    }

    // Actualizar asignación
    const asignacionActualizada = await TurnoModel.updateAsignacion(parseInt(asignacionId), {
      ruta_id,
      km_inicio,
      km_final,
      sentido,
      acciones,
      hora_salida,
      hora_entrada_estimada
    });

    // Actualizar tripulación si se proporcionó
    let tripulacionActualizada = [];
    if (tripulacion && Array.isArray(tripulacion)) {
      // Eliminar tripulación actual
      await TurnoModel.deleteTripulacion(parseInt(asignacionId));

      // Agregar nueva tripulación
      for (const miembro of tripulacion) {
        const t = await TurnoModel.addTripulacion({
          asignacion_id: parseInt(asignacionId),
          usuario_id: miembro.usuario_id,
          rol_tripulacion: miembro.rol_tripulacion
        });
        tripulacionActualizada.push(t);
      }
    }

    return res.json({
      message: 'Asignación actualizada exitosamente',
      asignacion: asignacionActualizada,
      tripulacion: tripulacionActualizada.length > 0 ? tripulacionActualizada : undefined
    });
  } catch (error) {
    console.error('Error en updateAsignacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// DELETE /api/turnos/asignaciones/:id - Eliminar asignación (solo si no ha salido)
// Query param: ?forzar=true para cerrar salida activa y eliminar
export async function deleteAsignacion(req: Request, res: Response) {
  try {
    const { id: asignacionId } = req.params;
    const forzar = req.query.forzar === 'true';

    // Obtener asignación con info de sede
    const asignacion = await db.oneOrNone(`
      SELECT au.*, t.sede_id, u.codigo as unidad_codigo
      FROM asignacion_unidad au
      JOIN turno t ON au.turno_id = t.id
      JOIN unidad u ON au.unidad_id = u.id
      WHERE au.id = $1
    `, [parseInt(asignacionId)]);

    if (!asignacion) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    // Validar que el usuario puede eliminar (misma sede o puede ver todas)
    const userSedeId = req.user?.sede;
    const puedeVerTodas = req.user?.puede_ver_todas_sedes;

    if (!puedeVerTodas && userSedeId && asignacion.sede_id && asignacion.sede_id !== userSedeId) {
      return res.status(403).json({
        error: 'No tienes permiso para eliminar asignaciones de otra sede'
      });
    }

    // Comprobación de rol para forzar
    if (forzar) {
      // El user mencionó "super_Admin" y user 19109.
      const isSuperAdmin = req.user?.rol === 'SUPER_ADMIN' || req.user?.userId === 19109;
      if (!isSuperAdmin) {
        return res.status(403).json({
          error: 'No tiene permisos para forzar la eliminación. Contacte al Super Administrador.'
        });
      }
    }

    if (asignacion.hora_salida_real && !forzar) {
      return res.status(400).json({
        error: 'No se puede eliminar una asignación que ya ha salido',
        message: 'La unidad ya registró su salida. Solo el Super Admin puede forzar esta acción.'
      });
    }

    // Verificar si hay salida_unidad activa para esta unidad
    const salidaActiva = await db.oneOrNone(`
      SELECT id, fecha_hora_salida FROM salida_unidad
      WHERE unidad_id = $1 AND estado = 'EN_SALIDA'
    `, [asignacion.unidad_id]);

    // SOLO bloquear si la asignación está ACTIVA (hora_salida_real)
    // Si es pendiente, permitimos borrar aunque la unidad tenga estado sucio (zombie exit),
    // para poder limpiar el plan.
    if (salidaActiva && !forzar && asignacion.hora_salida_real) {
      return res.status(400).json({
        error: 'No se puede eliminar una asignación con salida activa',
        message: `La unidad ${asignacion.unidad_codigo} tiene una salida en curso desde ${salidaActiva.fecha_hora_salida}.`,
        salida_id: salidaActiva.id
      });
    }

    // Si forzar=true y hay salida activa, cerrarla primero
    if (salidaActiva && forzar) {
      await db.none(`
        UPDATE salida_unidad
        SET estado = 'CANCELADA',
            fecha_hora_regreso = NOW(),
            observaciones_regreso = 'Cerrada forzosamente al eliminar asignación'
        WHERE id = $1
      `, [salidaActiva.id]);
      console.log(`Salida ${salidaActiva.id} cerrada forzosamente`);
    }

    // Eliminar asignación (la tripulación se elimina por cascade)
    await TurnoModel.deleteAsignacion(parseInt(asignacionId));

    // Limpiar turno si quedó vacío
    await db.none(`
      DELETE FROM turno t
      WHERE NOT EXISTS (SELECT 1 FROM asignacion_unidad au WHERE au.turno_id = t.id)
      AND t.id = $1
    `, [asignacion.turno_id]);

    return res.json({
      message: salidaActiva && forzar
        ? 'Asignación eliminada y salida cerrada exitosamente'
        : 'Asignación eliminada exitosamente',
      asignacion_id: parseInt(asignacionId),
      salida_cerrada: salidaActiva && forzar ? salidaActiva.id : null
    });
  } catch (error) {
    console.error('Error en deleteAsignacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// POST /api/turnos/:turnoId/liberar-nomina - Liberar nómina (cambiar borradores a liberadas)
export async function liberarNomina(req: Request, res: Response) {
  try {
    const { turnoId } = req.params;
    const userSedeId = req.user?.sede;
    const userRol = req.user?.rol;

    // Solo ENCARGADO_NOMINAS y SUPER_ADMIN pueden liberar nómina
    if (userRol !== 'ENCARGADO_NOMINAS' && userRol !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'No tienes permisos para liberar nómina' });
    }

    // Contar borradores antes de liberar
    const countBorradores = await TurnoModel.countBorradores(parseInt(turnoId), userSedeId);

    if (countBorradores === 0) {
      return res.status(400).json({
        error: 'No hay asignaciones en borrador para liberar',
        count: 0
      });
    }

    // Liberar nómina
    const liberadas = await TurnoModel.liberarNomina(parseInt(turnoId), userSedeId);

    // TODO: Enviar notificaciones push a brigadas asignados
    // Esto requiere integración con servicio de notificaciones

    return res.json({
      message: `${liberadas} asignación(es) liberada(s) exitosamente`,
      count: liberadas,
      turno_id: parseInt(turnoId)
    });
  } catch (error) {
    console.error('Error en liberarNomina:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
