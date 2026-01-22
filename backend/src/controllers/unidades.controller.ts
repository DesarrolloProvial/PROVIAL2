import { Request, Response } from 'express';
import { db } from '../config/database';
import { TurnoModel } from '../models/turno.model';

// GET /api/unidades - Listar todas las unidades
export async function listarUnidades(req: Request, res: Response) {
  try {
    const { sede_id, activa, tipo_unidad, search } = req.query;
    const user = req.user!;

    let query = `
      SELECT u.*, s.nombre as sede_nombre
      FROM unidad u
      JOIN sede s ON u.sede_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    // ENCARGADO_NOMINAS sin puede_ver_todas_sedes solo ve su sede
    // (Si tiene puede_ver_todas_sedes=true, puede ver todas pero en modo lectura)
    const filtrarPorSedeDelUsuario = user.rol === 'ENCARGADO_NOMINAS' && !user.puede_ver_todas_sedes;

    if (filtrarPorSedeDelUsuario && user.sede) {
      params.push(user.sede);
      query += ` AND u.sede_id = $${++paramCount}`;
    } else if (sede_id) {
      params.push(sede_id);
      query += ` AND u.sede_id = $${++paramCount}`;
    }

    if (activa !== undefined) {
      params.push(activa === 'true');
      query += ` AND u.activa = $${++paramCount}`;
    }

    if (tipo_unidad) {
      params.push(tipo_unidad);
      query += ` AND u.tipo_unidad = $${++paramCount}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (u.codigo ILIKE $${++paramCount} OR u.placa ILIKE $${paramCount} OR u.marca ILIKE $${paramCount})`;
    }

    query += ' ORDER BY u.codigo';

    const unidades = await db.manyOrNone(query, params);
    res.json({ unidades, total: unidades.length });
  } catch (error) {
    console.error('Error en listarUnidades:', error);
    res.status(500).json({ error: 'Error al listar unidades' });
  }
}

// GET /api/unidades/tipos - Listar tipos de unidades
export async function listarTiposUnidad(_req: Request, res: Response) {
  try {
    const tipos = await db.manyOrNone(`
      SELECT DISTINCT tipo_unidad FROM unidad ORDER BY tipo_unidad
    `);
    res.json({ tipos: tipos.map(t => t.tipo_unidad) });
  } catch (error) {
    console.error('Error en listarTiposUnidad:', error);
    res.status(500).json({ error: 'Error al listar tipos de unidad' });
  }
}

// GET /api/unidades/activas - Listar unidades activas
export async function listarUnidadesActivas(req: Request, res: Response) {
  try {
    const user = req.user!;
    let query = `
      SELECT u.*, s.nombre as sede_nombre
      FROM unidad u
      JOIN sede s ON u.sede_id = s.id
      WHERE u.activa = true
    `;
    const params: any[] = [];

    // Filtrar por sede si aplica
    if (user.rol === 'ENCARGADO_NOMINAS' && !user.puede_ver_todas_sedes && user.sede) {
      params.push(user.sede);
      query += ` AND u.sede_id = $1`;
    }

    query += ' ORDER BY u.codigo';

    const unidades = await db.manyOrNone(query, params);
    res.json({ unidades, total: unidades.length });
  } catch (error) {
    console.error('Error en listarUnidadesActivas:', error);
    res.status(500).json({ error: 'Error al listar unidades activas' });
  }
}

// GET /api/unidades/:id - Obtener una unidad
export async function obtenerUnidad(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const unidad = await db.oneOrNone(`
      SELECT u.*, s.nombre as sede_nombre
      FROM unidad u
      JOIN sede s ON u.sede_id = s.id
      WHERE u.id = $1
    `, [id]);

    if (!unidad) {
      return res.status(404).json({ error: 'Unidad no encontrada' });
    }

    // Obtener asignación permanente actual si existe
    const asignacionPermanente = await db.oneOrNone(`
      SELECT bu.*, b.nombre as brigada_nombre, b.codigo as brigada_codigo
      FROM brigada_unidad bu
      JOIN brigada b ON bu.brigada_id = b.id
      WHERE bu.unidad_id = $1 AND bu.activo = true
    `, [id]);

    return res.json({ ...unidad, asignacion_permanente: asignacionPermanente });
  } catch (error) {
    console.error('Error en obtenerUnidad:', error);
    return res.status(500).json({ error: 'Error al obtener unidad' });
  }
}

// POST /api/unidades - Crear unidad
export async function crearUnidad(req: Request, res: Response) {
  try {
    const {
      codigo,
      tipo_unidad,
      marca,
      modelo,
      anio,
      placa,
      sede_id,
      custom_fields
    } = req.body;

    if (!codigo || !tipo_unidad || !sede_id) {
      return res.status(400).json({ error: 'codigo, tipo_unidad y sede_id son requeridos' });
    }

    // Verificar que no exista el codigo
    const existe = await db.oneOrNone('SELECT id FROM unidad WHERE codigo = $1', [codigo]);
    if (existe) {
      return res.status(409).json({ error: 'Ya existe una unidad con ese codigo' });
    }

    const unidad = await db.one(`
      INSERT INTO unidad (codigo, tipo_unidad, marca, modelo, anio, placa, sede_id, custom_fields)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [codigo, tipo_unidad, marca, modelo, anio, placa, sede_id, custom_fields || {}]);

    return res.status(201).json({ message: 'Unidad creada exitosamente', unidad });
  } catch (error: any) {
    console.error('Error en crearUnidad:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'El codigo o placa ya existe' });
    }
    return res.status(500).json({ error: 'Error al crear unidad' });
  }
}

// PUT /api/unidades/:id - Actualizar unidad
export async function actualizarUnidad(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      tipo_unidad,
      marca,
      modelo,
      anio,
      placa,
      sede_id,
      custom_fields
    } = req.body;

    const unidad = await db.oneOrNone('SELECT * FROM unidad WHERE id = $1', [id]);
    if (!unidad) {
      return res.status(404).json({ error: 'Unidad no encontrada' });
    }

    const result = await db.one(`
      UPDATE unidad SET
        tipo_unidad = COALESCE($1, tipo_unidad),
        marca = COALESCE($2, marca),
        modelo = COALESCE($3, modelo),
        anio = COALESCE($4, anio),
        placa = COALESCE($5, placa),
        sede_id = COALESCE($6, sede_id),
        custom_fields = COALESCE($8, custom_fields),
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [tipo_unidad, marca, modelo, anio, placa, sede_id, id, custom_fields]);

    return res.json({ message: 'Unidad actualizada exitosamente', unidad: result });
  } catch (error) {
    console.error('Error en actualizarUnidad:', error);
    return res.status(500).json({ error: 'Error al actualizar unidad' });
  }
}

// PUT /api/unidades/:id/desactivar - Desactivar unidad
export async function desactivarUnidad(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const unidad = await db.oneOrNone('SELECT * FROM unidad WHERE id = $1', [id]);
    if (!unidad) {
      return res.status(404).json({ error: 'Unidad no encontrada' });
    }

    await db.tx(async t => {
      // Desactivar unidad
      await t.none('UPDATE unidad SET activa = false, updated_at = NOW() WHERE id = $1', [id]);

      // Desactivar asignaciones permanentes
      await t.none('UPDATE brigada_unidad SET activo = false, fecha_fin = NOW() WHERE unidad_id = $1 AND activo = true', [id]);
    });

    return res.json({ message: 'Unidad desactivada exitosamente' });
  } catch (error) {
    console.error('Error en desactivarUnidad:', error);
    return res.status(500).json({ error: 'Error al desactivar unidad' });
  }
}

// PUT /api/unidades/:id/activar - Activar unidad
export async function activarUnidad(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const unidad = await db.oneOrNone('SELECT * FROM unidad WHERE id = $1', [id]);
    if (!unidad) {
      return res.status(404).json({ error: 'Unidad no encontrada' });
    }

    await db.none('UPDATE unidad SET activa = true, updated_at = NOW() WHERE id = $1', [id]);

    return res.json({ message: 'Unidad activada exitosamente' });
  } catch (error) {
    console.error('Error en activarUnidad:', error);
    return res.status(500).json({ error: 'Error al activar unidad' });
  }
}

// PUT /api/unidades/:id/transferir - Transferir unidad a otra sede
export async function transferirUnidad(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { nueva_sede_id, motivo } = req.body;

    if (!nueva_sede_id) {
      return res.status(400).json({ error: 'nueva_sede_id es requerido' });
    }

    const unidad = await db.oneOrNone('SELECT * FROM unidad WHERE id = $1', [id]);
    if (!unidad) {
      return res.status(404).json({ error: 'Unidad no encontrada' });
    }

    // Verificar que la nueva sede existe
    const sede = await db.oneOrNone('SELECT id FROM sede WHERE id = $1', [nueva_sede_id]);
    if (!sede) {
      return res.status(404).json({ error: 'Sede destino no encontrada' });
    }

    await db.tx(async t => {
      const sedeAnterior = unidad.sede_id;

      // Actualizar sede de unidad
      await t.none('UPDATE unidad SET sede_id = $1, updated_at = NOW() WHERE id = $2', [nueva_sede_id, id]);

      // Desactivar asignaciones permanentes actuales
      await t.none('UPDATE brigada_unidad SET activo = false, fecha_fin = NOW() WHERE unidad_id = $1 AND activo = true', [id]);

      // Registrar transferencia (podemos usar la misma tabla de reasignacion_sede o crear una de movimientos)
      // Por ahora solo logueamos el cambio
      console.log(`Unidad ${unidad.codigo} transferida de sede ${sedeAnterior} a ${nueva_sede_id}. Motivo: ${motivo || 'No especificado'}`);
    });

    return res.json({ message: 'Unidad transferida exitosamente' });
  } catch (error) {
    console.error('Error en transferirUnidad:', error);
    return res.status(500).json({ error: 'Error al transferir unidad' });
  }
}

// DELETE /api/unidades/:id - Eliminar unidad (solo si no tiene historial)
export async function eliminarUnidad(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const unidad = await db.oneOrNone('SELECT * FROM unidad WHERE id = $1', [id]);
    if (!unidad) {
      return res.status(404).json({ error: 'Unidad no encontrada' });
    }

    // Verificar que no tenga historial en asignaciones de turno
    const tieneHistorial = await db.oneOrNone(`
      SELECT 1 FROM asignacion_unidad WHERE unidad_id = $1 LIMIT 1
    `, [id]);

    if (tieneHistorial) {
      return res.status(400).json({
        error: 'No se puede eliminar la unidad porque tiene historial de asignaciones. Use desactivar en su lugar.'
      });
    }

    await db.tx(async t => {
      // Eliminar asignaciones permanentes
      await t.none('DELETE FROM brigada_unidad WHERE unidad_id = $1', [id]);

      // Eliminar unidad
      await t.none('DELETE FROM unidad WHERE id = $1', [id]);
    });

    return res.json({ message: 'Unidad eliminada exitosamente' });
  } catch (error) {
    console.error('Error en eliminarUnidad:', error);
    return res.status(500).json({ error: 'Error al eliminar unidad' });
  }
}

// POST /api/unidades/:id/asignar-brigada - Asignar brigada permanente a unidad
export async function asignarBrigadaUnidad(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { usuario_id, rol } = req.body;

    if (!usuario_id) {
      return res.status(400).json({ error: 'usuario_id es requerido' });
    }

    const unidad = await db.oneOrNone('SELECT * FROM unidad WHERE id = $1', [id]);
    if (!unidad) {
      return res.status(404).json({ error: 'Unidad no encontrada' });
    }

    // brigada_id en brigada_unidad referencia a usuario.id
    const usuario = await db.oneOrNone('SELECT * FROM usuario WHERE id = $1 AND rol_id = 3', [usuario_id]);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario brigada no encontrado' });
    }

    // Verificar que el usuario no tenga otra asignación activa
    const tieneAsignacion = await db.oneOrNone(`
      SELECT 1 FROM brigada_unidad WHERE brigada_id = $1 AND activo = true
    `, [usuario_id]);

    if (tieneAsignacion) {
      return res.status(409).json({ error: 'El usuario ya tiene una asignación permanente activa' });
    }

    const asignacion = await db.one(`
      INSERT INTO brigada_unidad (brigada_id, unidad_id, rol_tripulacion, fecha_asignacion, activo, asignado_por)
      VALUES ($1, $2, $3, NOW(), true, $4)
      RETURNING *
    `, [usuario_id, id, rol || 'PILOTO', req.user!.userId]);

    return res.status(201).json({ message: 'Brigada asignada exitosamente', asignacion });
  } catch (error: any) {
    console.error('Error en asignarBrigadaUnidad:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe esta asignación' });
    }
    return res.status(500).json({ error: 'Error al asignar brigada' });
  }
}

// DELETE /api/unidades/:id/desasignar-brigada/:brigadaId - Quitar brigada de unidad
export async function desasignarBrigadaUnidad(req: Request, res: Response) {
  try {
    const { id, brigadaId } = req.params;

    const asignacion = await db.oneOrNone(`
      SELECT * FROM brigada_unidad WHERE unidad_id = $1 AND brigada_id = $2 AND activo = true
    `, [id, brigadaId]);

    if (!asignacion) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    await db.none(`
      UPDATE brigada_unidad SET activo = false, fecha_fin = NOW()
      WHERE unidad_id = $1 AND brigada_id = $2 AND activo = true
    `, [id, brigadaId]);

    return res.json({ message: 'Brigada desasignada exitosamente' });
  } catch (error) {
    console.error('Error en desasignarBrigadaUnidad:', error);
    return res.status(500).json({ error: 'Error al desasignar brigada' });
  }
}

// GET /api/unidades/:id/tripulacion - Obtener tripulación actual de unidad
export async function getTripulacionUnidad(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // brigada_unidad.brigada_id referencia a usuario.id
    const tripulacion = await db.manyOrNone(`
      SELECT bu.id, bu.brigada_id as usuario_id, bu.unidad_id, bu.rol_tripulacion as rol,
             bu.fecha_asignacion, bu.activo,
             u.nombre_completo, u.chapa, u.telefono, u.email
      FROM brigada_unidad bu
      JOIN usuario u ON bu.brigada_id = u.id
      WHERE bu.unidad_id = $1 AND bu.activo = true
      ORDER BY bu.rol_tripulacion
    `, [id]);

    res.json({ tripulacion, total: tripulacion.length });
  } catch (error) {
    console.error('Error en getTripulacionUnidad:', error);
    res.status(500).json({ error: 'Error al obtener tripulación' });
  }
}

// GET /api/unidades/:id/ultima-asignacion - Obtener la última asignación de la unidad
export async function obtenerUltimaAsignacion(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const asignacion = await TurnoModel.getLastAsignacionByUnidad(parseInt(id));

    if (!asignacion) {
      return res.status(404).json({ error: 'No se encontraron asignaciones previas para esta unidad' });
    }

    // Obtener tripulacion de esa asignacion
    const tripulacion = await TurnoModel.getTripulacion(asignacion.id);

    return res.json({ asignacion, tripulacion });
  } catch (error) {
    console.error('Error en obtenerUltimaAsignacion:', error);
    return res.status(500).json({ error: 'Error al obtener última asignación' });
  }
}

/**
 * GET /api/unidades/:codigo/reservar-numero-salida
 * Reservar siguiente numero de situacion para la salida activa de una unidad
 *
 * Este endpoint es crucial para el sistema offline-first:
 * - Retorna el siguiente numero secuencial de situacion para esta SALIDA
 * - El numero es por SALIDA (jornada), no por dia
 * - Permite generar ID determinista en el movil
 *
 * Response:
 * {
 *   num_situacion_salida: 4,      // Siguiente numero disponible
 *   fecha: "2026-01-21",          // Fecha actual
 *   sede_id: 1,                   // Sede de la unidad
 *   unidad_id: 30,                // ID de la unidad
 *   unidad_codigo: "030",         // Codigo de la unidad
 *   salida_id: 123,               // ID de la salida activa
 *   valido_hasta: "2026-01-21T23:59:59Z"  // Validez del numero
 * }
 */
export async function reservarNumeroSalida(req: Request, res: Response) {
  try {
    const { codigo } = req.params;

    // Buscar unidad por codigo
    const unidad = await db.oneOrNone(`
      SELECT u.id, u.codigo, u.sede_id, s.nombre as sede_nombre
      FROM unidad u
      JOIN sede s ON u.sede_id = s.id
      WHERE u.codigo = $1 AND u.activa = true
    `, [codigo]);

    if (!unidad) {
      return res.status(404).json({
        error: 'Unidad no encontrada',
        message: `No existe unidad activa con codigo ${codigo}`
      });
    }

    // Buscar salida activa de esta unidad
    // Una salida activa es aquella que:
    // - Tiene ingreso (hora_salida_sede)
    // - NO ha regresado (hora_llegada_sede IS NULL)
    const salidaActiva = await db.oneOrNone(`
      SELECT su.id as salida_id, su.asignacion_id,
             au.unidad_id, au.sede_id, au.turno_id,
             t.fecha as fecha_turno
      FROM salida_unidad su
      JOIN asignacion_unidad au ON su.asignacion_id = au.id
      JOIN turno t ON au.turno_id = t.id
      WHERE au.unidad_id = $1
        AND su.hora_salida_sede IS NOT NULL
        AND su.hora_llegada_sede IS NULL
      ORDER BY su.hora_salida_sede DESC
      LIMIT 1
    `, [unidad.id]);

    if (!salidaActiva) {
      return res.status(400).json({
        error: 'Sin salida activa',
        message: 'La unidad no tiene una salida activa. Debe iniciar salida primero.'
      });
    }

    // Contar situaciones existentes en esta salida
    const countResult = await db.one(`
      SELECT COUNT(*) as total
      FROM situacion
      WHERE salida_unidad_id = $1
    `, [salidaActiva.salida_id]);

    const siguienteNumero = parseInt(countResult.total) + 1;

    // Fecha actual
    const hoy = new Date();
    const fechaISO = hoy.toISOString().split('T')[0];

    // Validez hasta fin del dia
    const validoHasta = new Date(hoy);
    validoHasta.setHours(23, 59, 59, 999);

    console.log(`[UNIDADES] Reservado numero ${siguienteNumero} para unidad ${codigo} (salida ${salidaActiva.salida_id})`);

    return res.json({
      num_situacion_salida: siguienteNumero,
      fecha: fechaISO,
      sede_id: unidad.sede_id,
      unidad_id: unidad.id,
      unidad_codigo: unidad.codigo,
      salida_id: salidaActiva.salida_id,
      valido_hasta: validoHasta.toISOString()
    });

  } catch (error: any) {
    console.error('Error en reservarNumeroSalida:', error);
    return res.status(500).json({
      error: 'Error al reservar numero',
      message: error.message
    });
  }
}
