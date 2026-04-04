import { Request, Response } from 'express';
import { ActividadModel } from '../models/actividad.model';
import { db } from '../config/database';
import { emitToAll } from '../services/socket.service';

// ========================================
// CREAR ACTIVIDAD
// ========================================

export async function listActividades(req: Request, res: Response) {
  try {
    const list = await ActividadModel.list(req.query);
    return res.json({ actividades: list, count: list.length });
  } catch (error: any) {
    console.error('Error listActividades:', error);
    return res.status(500).json({ error: error.message || 'Error interno' });
  }
}

export async function createActividad(req: Request, res: Response) {
  try {
    const {
      id: codigo_actividad, // Código determinista del mobile
      tipo_actividad_id,
      unidad_id,
      salida_unidad_id,
      ruta_id,
      km,
      sentido,
      latitud,
      longitud,
      observaciones,
      datos,
    } = req.body;

    const userId = req.user!.userId;

    if (!tipo_actividad_id) {
      return res.status(400).json({ error: 'tipo_actividad_id es requerido' });
    }

    // Idempotencia: si ya existe con ese código, retornar la existente
    if (codigo_actividad) {
      const existente = await ActividadModel.findByCodigoActividad(codigo_actividad);
      if (existente) {
        const completa = await ActividadModel.getById(existente.id);
        return res.status(200).json({ message: 'Actividad ya existente', actividad: completa });
      }
    }

    // Resolver unidad_id, salida y ruta
    let resolvedUnidadId = unidad_id;
    let resolvedSalidaId = salida_unidad_id;
    let resolvedRutaId = ruta_id;

    // Resolver desde salida_unidad activa si faltan datos
    if (!resolvedUnidadId || !resolvedRutaId || !resolvedSalidaId) {
      if (resolvedUnidadId) {
        // Tenemos unidad, buscar su salida activa directamente
        const salida = await db.oneOrNone(`
          SELECT id as salida_unidad_id, ruta_inicial_id as ruta_id
          FROM salida_unidad
          WHERE unidad_id = $1 AND estado = 'EN_SALIDA'
          LIMIT 1
        `, [resolvedUnidadId]);
        if (salida) {
          resolvedSalidaId = resolvedSalidaId || salida.salida_unidad_id;
          resolvedRutaId = resolvedRutaId || salida.ruta_id;
        }
      } else {
        // No tenemos unidad, buscar via turno del usuario
        const turno = await db.oneOrNone(`
          SELECT au.unidad_id, su.id as salida_unidad_id, su.ruta_inicial_id as ruta_id
          FROM tripulacion_turno tt
          JOIN asignacion_unidad au ON tt.asignacion_id = au.id
          JOIN salida_unidad su ON au.unidad_id = su.unidad_id AND su.estado = 'EN_SALIDA'
          WHERE tt.usuario_id = $1
          LIMIT 1
        `, [userId]);
        if (turno) {
          resolvedUnidadId = turno.unidad_id;
          resolvedSalidaId = resolvedSalidaId || turno.salida_unidad_id;
          resolvedRutaId = resolvedRutaId || turno.ruta_id;
        }
      }
    }

    if (!resolvedUnidadId) {
      return res.status(400).json({ error: 'No se pudo determinar la unidad' });
    }

    // Cerrar actividades activas previas de esta unidad
    await ActividadModel.cerrarActivasDeUnidad(resolvedUnidadId);

    // También cerrar situaciones activas de esta unidad (una unidad solo puede tener una cosa activa)
    await db.none(`
      UPDATE situacion SET estado = 'CERRADA', updated_at = NOW()
      WHERE unidad_id = $1 AND estado = 'ACTIVA'
    `, [resolvedUnidadId]);

    // Crear la actividad
    const actividad = await ActividadModel.create({
      tipo_actividad_id,
      unidad_id: resolvedUnidadId,
      salida_unidad_id: resolvedSalidaId || null,
      creado_por: userId,
      ruta_id: resolvedRutaId || null,
      km: km || null,
      sentido: sentido || null,
      latitud: latitud || null,
      longitud: longitud || null,
      observaciones: observaciones || null,
      datos: datos || {},
      codigo_actividad: codigo_actividad || null,
    });

    // Obtener actividad completa con joins
    const actividadCompleta = await ActividadModel.getById(actividad.id);

    // Emitir evento WebSocket
    emitToAll('actividad:nueva', actividadCompleta);

    return res.status(201).json({ message: 'Actividad creada', actividad: actividadCompleta });
  } catch (error: any) {
    console.error('Error createActividad:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ========================================
// CERRAR ACTIVIDAD
// ========================================

export async function cerrarActividad(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const actividad = await ActividadModel.cerrar(parseInt(id), userId);

    // Emitir evento WebSocket
    emitToAll('actividad:cerrada', actividad);

    return res.json({ message: 'Actividad cerrada', actividad });
  } catch (error: any) {
    console.error('Error cerrarActividad:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ========================================
// OBTENER ACTIVIDAD POR ID
// ========================================

export async function updateActividad(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { km, sentido, ruta_id, latitud, longitud, observaciones, datos } = req.body;

    const actividad = await ActividadModel.getById(parseInt(id));
    if (!actividad) return res.status(404).json({ error: 'Actividad no encontrada' });

    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;

    if (km !== undefined)          { sets.push(`km = $${i++}`);          vals.push(km); }
    if (sentido !== undefined)     { sets.push(`sentido = $${i++}`);     vals.push(sentido); }
    if (ruta_id !== undefined)     { sets.push(`ruta_id = $${i++}`);     vals.push(ruta_id); }
    if (latitud !== undefined)     { sets.push(`latitud = $${i++}`);     vals.push(latitud); }
    if (longitud !== undefined)    { sets.push(`longitud = $${i++}`);    vals.push(longitud); }
    if (observaciones !== undefined) {
      // Keep as JSONB array format; if a plain string is received, wrap it
      if (typeof observaciones === 'string' && observaciones.trim()) {
        const hora = new Intl.DateTimeFormat('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'America/Guatemala' }).format(new Date());
        sets.push(`observaciones = $${i++}`);
        vals.push(JSON.stringify([{ hora, usuario: 'Edición', mensaje: observaciones }]));
      } else if (Array.isArray(observaciones)) {
        sets.push(`observaciones = $${i++}`);
        vals.push(JSON.stringify(observaciones));
      }
    }
    if (datos !== undefined)       { sets.push(`datos = $${i++}`);       vals.push(JSON.stringify(datos)); }

    if (sets.length === 0) return res.json({ actividad });

    vals.push(parseInt(id));
    const updated = await db.oneOrNone(
      `UPDATE actividad SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    );

    const actividadCompleta = await ActividadModel.getById(parseInt(id));
    return res.json({ actividad: actividadCompleta || updated });
  } catch (error: any) {
    console.error('Error updateActividad:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getActividad(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const actividad = await ActividadModel.getById(parseInt(id));

    if (!actividad) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }

    return res.json({ actividad });
  } catch (error: any) {
    console.error('Error getActividad:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ========================================
// ACTIVIDADES DE MI UNIDAD HOY
// ========================================

export async function getMiUnidadHoy(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const unidadId = req.query.unidad_id ? parseInt(req.query.unidad_id as string) : null;

    let resolvedUnidadId = unidadId;

    if (!resolvedUnidadId) {
      const turno = await db.oneOrNone(`
        SELECT au.unidad_id
        FROM tripulacion_turno tt
        JOIN asignacion_unidad au ON tt.asignacion_id = au.id
        WHERE tt.usuario_id = $1
        LIMIT 1
      `, [userId]);

      resolvedUnidadId = turno?.unidad_id;
    }

    if (!resolvedUnidadId) {
      return res.json({ actividades: [], actividad_activa: null });
    }

    const actividades = await ActividadModel.getByUnidadHoy(resolvedUnidadId);
    const activa = actividades.find(a => a.estado === 'ACTIVA') || null;

    return res.json({ actividades, actividad_activa: activa });
  } catch (error: any) {
    console.error('Error getMiUnidadHoy actividades:', error);
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

    const user = await db.oneOrNone('SELECT chapa, nombre_completo, rol FROM usuario WHERE id = $1', [userId]);
    const firmaUsuario = user 
      ? (user.chapa ? `${user.chapa} - ${user.nombre_completo}` : `${user.rol} ${user.nombre_completo}`)
      : 'Usuario';

    const options: Intl.DateTimeFormatOptions = { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      timeZone: 'America/Guatemala' 
    };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    
    const parts = formatter.formatToParts(new Date());
    const hours = parts.find(p => p.type === 'hour')?.value;
    const minutes = parts.find(p => p.type === 'minute')?.value;
    const horaServidor = `${hours}:${minutes}`;

    let horaFinal = horaServidor;
    if (hora_local && hora_local !== horaServidor) {
      horaFinal = `¡${hora_local} / Servidor: ${horaServidor}!`;
    }

    const nuevoMensaje = JSON.stringify([{
      hora: horaFinal,
      usuario: firmaUsuario,
      mensaje: observacion
    }]);

    // Ojo: asegúrate de que exista updated_at en actividad si vas a actualizarlo
    const actividadModificada = await db.one(
      `UPDATE actividad 
       SET observaciones = COALESCE(observaciones, '[]'::jsonb) || $1::jsonb
       WHERE id = $2 
       RETURNING *`,
      [nuevoMensaje, id]
    );

    emitToAll('actividad:actualizada', actividadModificada);

    return res.status(200).json({ 
      message: 'Observación agregada al timeline', 
      actividad: actividadModificada 
    });
  } catch (error: any) {
    console.error('Error addObservacion (actividad):', error);
    return res.status(500).json({ error: error.message || 'Error interno al agregar observación' });
  }
}
