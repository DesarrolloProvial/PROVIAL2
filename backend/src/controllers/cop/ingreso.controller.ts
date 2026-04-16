import { Request, Response } from 'express';
import { db } from '../../config/database';
import { normalizeId, parseIndicador } from '../../utils/db.utils';
import { resolveContextoActivo } from '../../utils/operaciones.utils';

// Motivos de ingreso válidos (alineados con el check constraint de la BD)
const TIPOS_INGRESO_VALIDOS = [
  'COMBUSTIBLE', 'COMISION', 'APOYO', 'ALMUERZO', 'MANTENIMIENTO',
  'FINALIZACION', 'FINALIZAR_JORNADA', 'FINALIZACION_JORNADA', 'INGRESO_TEMPORAL',
];

// ========================================
// REGISTRO DE INGRESOS
// ========================================

/**
 * POST /api/ingresos/registrar
 * Registrar ingreso a sede por cualquier motivo.
 * NO finaliza la jornada — eso es responsabilidad de POST /finalizar-jornada.
 */
export async function registrarIngreso(req: Request, res: Response) {
  try {
    const {
      sede_id,
      tipo_ingreso,
      km_ingreso,
      combustible_ingreso,
      combustible_fraccion,
      observaciones,
    } = req.body;

    const userId = req.user!.userId;

    if (!tipo_ingreso || !sede_id) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        required: ['tipo_ingreso', 'sede_id'],
      });
    }

    if (!TIPOS_INGRESO_VALIDOS.includes(tipo_ingreso)) {
      return res.status(400).json({ error: 'Tipo de ingreso inválido', tipos_validos: TIPOS_INGRESO_VALIDOS });
    }

    const ctx = await resolveContextoActivo(userId);
    if (!ctx.salida_id) {
      return res.status(412).json({
        error: 'No tienes salida activa para registrar un ingreso',
        code: 'NO_CONTEXTO_OPERATIVO',
      });
    }

    const indicador = parseIndicador(combustible_fraccion ?? combustible_ingreso);
    const kmVal = normalizeId(km_ingreso);

    // db.tx: el INSERT y la restricción UNIQUE son atómicos.
    // La UNIQUE partial index (salida_unidad_id WHERE fecha_hora_salida IS NULL)
    // garantiza que solo exista un ingreso activo por salida.
    const ingreso = await db.tx(async (conn) => {
      const row = await conn.one(`
        INSERT INTO ingreso_sede (
          salida_unidad_id, sede_id, tipo_ingreso,
          km_ingreso, combustible_ingreso,
          observaciones_ingreso, es_ingreso_final, registrado_por
        ) VALUES ($1, $2, $3, $4, $5, $6, false, $7)
        RETURNING id
      `, [
        ctx.salida_id,
        normalizeId(sede_id),
        tipo_ingreso,
        kmVal,
        indicador,
        observaciones || null,
        userId,
      ]);

      return conn.one(`
        SELECT i.*, s.codigo AS sede_codigo, s.nombre AS sede_nombre
        FROM ingreso_sede i
        JOIN sede s ON i.sede_id = s.id
        WHERE i.id = $1
      `, [row.id]);
    });

    return res.status(201).json({
      message: 'Ingreso a sede registrado exitosamente',
      ingreso,
      instruccion: tipo_ingreso === 'FINALIZACION_JORNADA'
        ? 'Cuando estés listo, pulsa "Finalizar Jornada" para cerrar el día.'
        : 'Para volver a salir, registra una salida de sede.',
    });
  } catch (error: any) {
    console.error('Error en registrarIngreso:', error);
    if (error.code === '23505' || error.message?.includes('ya existe un ingreso activo')) {
      return res.status(409).json({
        error: 'Ya tienes un ingreso activo',
        message: 'Debes registrar salida de sede antes de ingresar nuevamente',
      });
    }
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/ingresos/finalizar-jornada
 * Finalizar la jornada laboral.
 *
 * Pre-condiciones:
 *   1. La brigada debe tener un ingreso activo de tipo FINALIZACION_JORNADA.
 *   2. Si el ingreso es en una sede diferente a la asignada a la unidad,
 *      se devuelve advertencia (requiere_confirmacion: true).
 *      El cliente reenvía con { confirmar: true } para proceder.
 *
 * Flujo atómico (db.tx):
 *   a. UPDATE ingreso activo → marca es_ingreso_final=true, guarda km y combustible finales.
 *   b. Llama a finalizar_jornada_completa() que cierra la salida, libera unidad y tripulación.
 */
export async function finalizarJornada(req: Request, res: Response) {
  try {
    const {
      km_ingreso,
      combustible_ingreso,
      combustible_fraccion,
      observaciones,
      confirmar = false,
    } = req.body;

    const userId = req.user!.userId;

    if (!km_ingreso) {
      return res.status(400).json({ error: 'El kilometraje final es requerido' });
    }

    const ctx = await resolveContextoActivo(userId);
    if (!ctx.salida_id || !ctx.unidad_id) {
      return res.status(412).json({
        error: 'No tienes salida activa',
        code: 'NO_CONTEXTO_OPERATIVO',
      });
    }

    // Leer ingreso activo + sede asignada de la unidad en una sola query
    const contexto = await db.oneOrNone(`
      SELECT
        i.id                  AS ingreso_id,
        i.tipo_ingreso,
        i.sede_id             AS ingreso_sede_id,
        si.nombre             AS ingreso_sede_nombre,
        u.sede_id             AS unidad_sede_id,
        su.nombre             AS unidad_sede_nombre
      FROM ingreso_sede i
      JOIN sede si ON i.sede_id = si.id
      JOIN salida_unidad sal ON sal.id = i.salida_unidad_id
      JOIN unidad u ON sal.unidad_id = u.id
      JOIN sede su ON u.sede_id = su.id
      WHERE i.salida_unidad_id = $1
        AND i.fecha_hora_salida IS NULL
      LIMIT 1
    `, [ctx.salida_id]);

    // 1. ¿Está ingresada?
    if (!contexto) {
      return res.status(412).json({
        error: 'Debes ingresar a sede antes de finalizar la jornada',
        code: 'SIN_INGRESO_ACTIVO',
      });
    }

    // 2. ¿El ingreso es de tipo FINALIZACION_JORNADA?
    if (contexto.tipo_ingreso !== 'FINALIZACION_JORNADA') {
      return res.status(409).json({
        error: 'Tienes un ingreso temporal activo',
        message: `El ingreso actual es de tipo "${contexto.tipo_ingreso}". ` +
          'Para finalizar la jornada, primero registra un ingreso de tipo "Finalizar Jornada".',
        code: 'INGRESO_TEMPORAL_ACTIVO',
      });
    }

    // 3. ¿La sede del ingreso coincide con la sede asignada a la unidad?
    const sedeMismatch = contexto.ingreso_sede_id !== contexto.unidad_sede_id;
    if (sedeMismatch && !confirmar) {
      return res.status(200).json({
        requiere_confirmacion: true,
        advertencia:
          `La unidad está asignada a "${contexto.unidad_sede_nombre}", ` +
          `pero el ingreso activo es en "${contexto.ingreso_sede_nombre}". ` +
          `¿Estás seguro de que quieres finalizar la jornada en una sede diferente?`,
        ingreso_sede: contexto.ingreso_sede_nombre,
        unidad_sede: contexto.unidad_sede_nombre,
      });
    }

    const indicador = parseIndicador(combustible_fraccion ?? combustible_ingreso);
    const kmVal = normalizeId(km_ingreso);

    // 4. Atomicidad: marcar ingreso como final + cerrar jornada
    await db.tx(async (conn) => {
      // Actualizar el ingreso activo con los datos finales
      await conn.none(`
        UPDATE ingreso_sede
        SET es_ingreso_final    = true,
            km_ingreso          = COALESCE($2, km_ingreso),
            combustible_ingreso = COALESCE($3, combustible_ingreso),
            observaciones_ingreso = COALESCE($4, observaciones_ingreso)
        WHERE id = $1
      `, [contexto.ingreso_id, kmVal, indicador, observaciones || null]);

      // Cerrar la jornada completa (cierra salida, libera unidad/tripulación)
      const result = await conn.one(
        `SELECT finalizar_jornada_completa($1, $2, $3, $4, $5) AS ok`,
        [ctx.salida_id, kmVal, indicador, observaciones || null, userId],
      );

      if (!result.ok) {
        throw new Error('finalizar_jornada_completa retornó false');
      }
    });

    return res.json({
      message: 'Jornada finalizada exitosamente. La unidad y tripulación han sido liberadas.',
      sede_ingreso: contexto.ingreso_sede_nombre,
      sede_diferente: sedeMismatch,
    });
  } catch (error: any) {
    console.error('Error en finalizarJornada:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}

/**
 * POST /api/ingresos/:id/salir
 * Registrar salida de sede (volver a la calle).
 */
export async function registrarSalidaDeSede(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { km_salida, combustible_salida, combustible_fraccion, observaciones } = req.body;
    const userId = req.user!.userId;

    const ctx = await resolveContextoActivo(userId);
    if (!ctx.salida_id) {
      return res.status(412).json({
        error: 'No tienes salida activa',
        code: 'NO_CONTEXTO_OPERATIVO',
      });
    }

    const ingreso = await db.oneOrNone(
      `SELECT id, es_ingreso_final, salida_unidad_id
       FROM ingreso_sede
       WHERE id = $1 AND fecha_hora_salida IS NULL`,
      [id],
    );

    if (!ingreso) {
      return res.status(404).json({ error: 'Ingreso activo no encontrado' });
    }
    if (ingreso.salida_unidad_id !== ctx.salida_id) {
      return res.status(403).json({ error: 'Este ingreso no pertenece a tu salida activa' });
    }
    if (ingreso.es_ingreso_final) {
      return res.status(400).json({ error: 'No se puede salir de un ingreso final' });
    }

    const indicador = parseIndicador(combustible_fraccion ?? combustible_salida);

    const ingresoActualizado = await db.one(`
      UPDATE ingreso_sede
      SET fecha_hora_salida       = NOW(),
          km_salida_nueva         = $2,
          combustible_salida_nueva = $3,
          observaciones_salida    = $4
      WHERE id = $1
      RETURNING *,
        (SELECT codigo FROM sede WHERE id = sede_id) AS sede_codigo,
        (SELECT nombre FROM sede WHERE id = sede_id) AS sede_nombre
    `, [id, normalizeId(km_salida), indicador, observaciones || null]);

    return res.json({
      message: 'Salida de sede registrada exitosamente',
      ingreso: ingresoActualizado,
      instruccion: 'Puedes continuar patrullando y registrando situaciones',
    });
  } catch (error) {
    console.error('Error en registrarSalidaDeSede:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// CONSULTAS DE INGRESOS
// ========================================

export async function getMiIngresoActivo(req: Request, res: Response) {
  try {
    const ctx = await resolveContextoActivo(req.user!.userId);
    if (!ctx.salida_id) {
      return res.status(412).json({ error: 'No tienes salida activa', code: 'NO_CONTEXTO_OPERATIVO' });
    }

    const ingresoActivo = await db.oneOrNone(`
      SELECT i.*, s.codigo AS sede_codigo, s.nombre AS sede_nombre
      FROM ingreso_sede i
      JOIN sede s ON i.sede_id = s.id
      WHERE i.salida_unidad_id = $1
        AND i.fecha_hora_salida IS NULL
      LIMIT 1
    `, [ctx.salida_id]);

    if (!ingresoActivo) {
      return res.status(404).json({
        error: 'No tienes ingreso activo',
        message: 'Estás en la calle, no en sede',
      });
    }

    return res.json(ingresoActivo);
  } catch (error) {
    console.error('Error en getMiIngresoActivo:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getMisIngresosHoy(req: Request, res: Response) {
  try {
    const ctx = await resolveContextoActivo(req.user!.userId);
    if (!ctx.salida_id) {
      return res.json({ ingresos: [], total: 0, message: 'No tienes salida activa' });
    }

    const ingresos = await db.any(`
      SELECT i.*, s.codigo AS sede_codigo, s.nombre AS sede_nombre
      FROM ingreso_sede i
      JOIN sede s ON i.sede_id = s.id
      WHERE i.salida_unidad_id = $1
      ORDER BY i.fecha_hora_ingreso ASC
    `, [ctx.salida_id]);

    return res.json({ salida_id: ctx.salida_id, ingresos, total: ingresos.length });
  } catch (error) {
    console.error('Error en getMisIngresosHoy:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getHistorialIngresos(req: Request, res: Response) {
  try {
    const salidaId = normalizeId(req.params.salidaId);
    if (!salidaId) return res.status(400).json({ error: 'salidaId inválido' });

    const ingresos = await db.any(`
      SELECT i.*, s.codigo AS sede_codigo, s.nombre AS sede_nombre
      FROM ingreso_sede i
      JOIN sede s ON i.sede_id = s.id
      WHERE i.salida_unidad_id = $1
      ORDER BY i.fecha_hora_ingreso ASC
    `, [salidaId]);

    return res.json({ salida_id: salidaId, ingresos, total: ingresos.length });
  } catch (error) {
    console.error('Error en getHistorialIngresos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getIngreso(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const ingreso = await db.oneOrNone(`
      SELECT i.*, s.codigo AS sede_codigo, s.nombre AS sede_nombre
      FROM ingreso_sede i
      JOIN sede s ON i.sede_id = s.id
      WHERE i.id = $1
    `, [id]);

    if (!ingreso) return res.status(404).json({ error: 'Ingreso no encontrado' });

    return res.json(ingreso);
  } catch (error) {
    console.error('Error en getIngreso:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function editarIngreso(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { km_ingreso, combustible_ingreso, combustible_fraccion, observaciones_ingreso } = req.body;
    const userId = req.user!.userId;

    const ingreso = await db.oneOrNone(
      'SELECT id, salida_unidad_id FROM ingreso_sede WHERE id = $1',
      [id],
    );
    if (!ingreso) return res.status(404).json({ error: 'Ingreso no encontrado' });

    const ctx = await resolveContextoActivo(userId);
    if (!ctx.salida_id || ctx.salida_id !== ingreso.salida_unidad_id) {
      return res.status(403).json({ error: 'No tienes permiso para editar este ingreso' });
    }

    const sets: string[] = [];
    const params: Record<string, unknown> = { id };

    if (km_ingreso !== undefined) {
      sets.push('km_ingreso = $/km_ingreso/');
      params.km_ingreso = normalizeId(km_ingreso);
    }

    const indicador = parseIndicador(combustible_fraccion ?? combustible_ingreso);
    if (indicador !== null) {
      sets.push('combustible_ingreso = $/combustible/');
      params.combustible = indicador;
    }

    if (observaciones_ingreso !== undefined) {
      sets.push('observaciones_ingreso = $/observaciones_ingreso/');
      params.observaciones_ingreso = observaciones_ingreso;
    }

    if (sets.length === 0) {
      return res.status(400).json({
        error: 'Debes proporcionar al menos un campo para editar',
        campos_permitidos: ['km_ingreso', 'combustible_ingreso', 'combustible_fraccion', 'observaciones_ingreso'],
      });
    }

    const updated = await db.one(
      `UPDATE ingreso_sede SET ${sets.join(', ')} WHERE id = $/id/ RETURNING *`,
      params,
    );

    return res.json({ message: 'Ingreso actualizado correctamente', ingreso: updated });
  } catch (error) {
    console.error('Error en editarIngreso:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
