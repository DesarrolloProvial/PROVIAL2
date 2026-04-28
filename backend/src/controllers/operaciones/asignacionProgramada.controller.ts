import { Request, Response } from 'express';
import { TurnoModel } from '../../models/common/turno.model';
import { db } from '../../config/database';

export async function crearAsignacionProgramada(req: Request, res: Response) {
  try {
    const {
      fecha_programada,
      ruta_id,
      recorrido_inicio_km,
      recorrido_fin_km,
      actividades_especificas,
      comandante_usuario_id,
      tripulacion,
      tipo_asignacion = 'PATRULLA',
      sentido,
      hora_salida,
    } = req.body;

    const userId  = req.user!.userId;
    const sedeId  = req.user!.sede ?? null;

    if (!fecha_programada) {
      return res.status(400).json({ error: 'fecha_programada es requerida' });
    }
    if (!Array.isArray(tripulacion) || tripulacion.length === 0) {
      return res.status(400).json({ error: 'Debe incluir al menos un tripulante' });
    }
    if (!comandante_usuario_id) {
      return res.status(400).json({ error: 'comandante_usuario_id es requerido' });
    }

    // 1. Buscar turno activo (no CERRADO) para esa fecha + sede
    const turnoExistente = await db.oneOrNone(
      `SELECT * FROM turno
       WHERE fecha = $1
         AND estado != 'CERRADO'
         AND (sede_id = $2 OR ($2 IS NULL AND sede_id IS NULL))
       LIMIT 1`,
      [fecha_programada, sedeId]
    );

    // 2. Si no existe, crear uno nuevo en estado PLANIFICADO
    const turno = turnoExistente ?? await TurnoModel.create({
      fecha: fecha_programada,
      creado_por: userId,
      sede_id: sedeId ?? undefined,
    });

    // 3. Tripulación: garantizar que el comandante esté marcado
    const tripulacionMapeada = tripulacion.map((t: any) => ({
      usuario_id:       Number(t.usuario_id),
      rol_tripulacion:  t.rol_tripulacion,
      es_comandante:    t.usuario_id === comandante_usuario_id || !!t.es_comandante,
      telefono_contacto: t.telefono_contacto ?? null,
    }));

    // 4. Crear asignacion_unidad + tripulacion_turno
    const { asignacion } = await TurnoModel.crearAsignacionConTripulacion(
      turno.id,
      tipo_asignacion,
      {
        unidad_id:            null,
        ruta_id:              ruta_id    ? Number(ruta_id)              : null,
        km_inicio:            recorrido_inicio_km ?? null,
        km_final:             recorrido_fin_km    ?? null,
        sentido:              sentido              ?? null,
        acciones:             actividades_especificas ?? null,
        combustible_inicial:  null,
        combustible_asignado: null,
        hora_salida:          hora_salida ?? null,
        hora_entrada_estimada: null,
      },
      tripulacionMapeada
    );

    return res.status(201).json({ asignacion, turno_id: turno.id });
  } catch (error) {
    if ((error as any).message?.startsWith('INACTIVO:')) {
      const partes = (error as any).message.split(':');
      return res.status(409).json({ error: `Brigada inactiva: ${partes[2] || 'usuario inactivo'}` });
    }
    console.error('crearAsignacionProgramada:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getAsignaciones(req: Request, res: Response) {
  try {
    const sedeId = req.user!.sede ?? null;
    const { fecha } = req.query;

    let whereClause = sedeId
      ? `WHERE t.sede_id = ${sedeId} AND t.estado != 'CERRADO'`
      : `WHERE t.estado != 'CERRADO'`;

    if (fecha) {
      whereClause += ` AND t.fecha = '${fecha}'`;
    }

    const rows = await db.manyOrNone(
      `SELECT au.*, t.fecha, t.sede_id, u.codigo as unidad_codigo
       FROM asignacion_unidad au
       JOIN turno t ON t.id = au.turno_id
       LEFT JOIN unidad u ON u.id = au.unidad_id
       ${whereClause}
       ORDER BY t.fecha DESC, au.created_at DESC`
    );
    return res.json(rows);
  } catch (error) {
    console.error('getAsignaciones:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getAsignacion(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const asignacion = await db.oneOrNone(
      `SELECT au.*, t.fecha, t.sede_id, u.codigo as unidad_codigo
       FROM asignacion_unidad au
       JOIN turno t ON t.id = au.turno_id
       LEFT JOIN unidad u ON u.id = au.unidad_id
       WHERE au.id = $1`,
      [id]
    );
    if (!asignacion) return res.status(404).json({ error: 'Asignación no encontrada' });

    const tripulacion = await db.any(
      `SELECT tt.*, u.nombre_completo, u.chapa
       FROM tripulacion_turno tt
       JOIN usuario u ON u.id = tt.usuario_id
       WHERE tt.asignacion_id = $1`,
      [id]
    );

    return res.json({ ...asignacion, tripulacion });
  } catch (error) {
    console.error('getAsignacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getMiAsignacion(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;

    const asignacion = await db.oneOrNone(
      `SELECT au.*, t.fecha, t.sede_id, u.codigo as unidad_codigo, u.placa as unidad_placa,
              u.marca, u.modelo, r.codigo as ruta_codigo, r.nombre as ruta_nombre
       FROM tripulacion_turno tt
       JOIN asignacion_unidad au ON au.id = tt.asignacion_id
       JOIN turno t ON t.id = au.turno_id
       LEFT JOIN unidad u ON u.id = au.unidad_id
       LEFT JOIN ruta r ON r.id = au.ruta_id
       WHERE tt.usuario_id = $1
         AND t.fecha >= CURRENT_DATE
         AND t.estado != 'CERRADO'
       ORDER BY t.fecha ASC
       LIMIT 1`,
      [userId]
    );

    if (!asignacion) {
      return res.status(404).json({ error: 'No tienes asignación activa o próxima' });
    }
    return res.json(asignacion);
  } catch (error) {
    console.error('getMiAsignacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function cancelarAsignacion(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { motivo } = req.body;

    const asignacion = await db.oneOrNone(
      'SELECT * FROM asignacion_unidad WHERE id = $1',
      [id]
    );
    if (!asignacion) return res.status(404).json({ error: 'Asignación no encontrada' });

    await db.none(
      `UPDATE asignacion_unidad
       SET dia_cerrado = true, fecha_cierre = NOW(),
           observaciones_finales = $2
       WHERE id = $1`,
      [id, motivo ? `Cancelada: ${motivo}` : 'Cancelada manualmente']
    );

    return res.json({ message: 'Asignación cancelada', asignacion_id: id });
  } catch (error) {
    console.error('cancelarAsignacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
