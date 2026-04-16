import { Request, Response } from 'express';
import { db } from '../../config/database';
import { normalizeId, parseIndicador } from '../../utils/db.utils';
import { resolveContextoActivo } from '../../utils/operaciones.utils';

// ========================================
// REGISTRO DE INGRESOS
// ========================================

/**
 * POST /api/ingresos/registrar
 * Registrar ingreso a sede (temporal o final).
 *
 * Atomicidad: el INSERT en ingreso_sede y, si es final,
 * el cierre de jornada (finalizar_jornada_completa) ocurren
 * dentro del mismo db.tx — si cualquiera falla ambos revierten.
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
      es_ingreso_final,
    } = req.body;

    const userId = req.user!.userId;

    if (!tipo_ingreso || !sede_id) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        required: ['tipo_ingreso', 'sede_id'],
      });
    }

    const tiposValidos = [
      'COMBUSTIBLE', 'COMISION', 'APOYO', 'ALMUERZO', 'MANTENIMIENTO',
      'FINALIZACION', 'FINALIZAR_JORNADA', 'FINALIZACION_JORNADA', 'INGRESO_TEMPORAL',
    ];
    if (!tiposValidos.includes(tipo_ingreso)) {
      return res.status(400).json({ error: 'Tipo de ingreso inválido', tipos_validos: tiposValidos });
    }

    // Resolver contexto operativo (salida_id del brigada)
    const ctx = await resolveContextoActivo(userId);
    if (!ctx.salida_id) {
      return res.status(412).json({
        error: 'No tienes salida activa para registrar un ingreso',
        code: 'NO_CONTEXTO_OPERATIVO',
      });
    }

    // Indicador: acepta fracción ('3/4') o decimal (0.75)
    const indicador = parseIndicador(combustible_fraccion ?? combustible_ingreso);
    const esIngresoFinal = es_ingreso_final === true;
    const kmVal = normalizeId(km_ingreso); // INTEGER en BD

    const ingreso = await db.tx(async (conn) => {
      // INSERT directo — la restricción UNIQUE idx_ingreso_activo_por_salida
      // garantiza que no existan dos activos; si viola, pg lanzará error 23505.
      const row = await conn.one(`
        INSERT INTO ingreso_sede (
          salida_unidad_id, sede_id, tipo_ingreso,
          km_ingreso, combustible_ingreso,
          observaciones_ingreso, es_ingreso_final, registrado_por
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        ctx.salida_id,
        normalizeId(sede_id),
        tipo_ingreso,
        kmVal,
        indicador,
        observaciones || null,
        esIngresoFinal,
        userId,
      ]);

      // Si es ingreso final, llamar a la función que cierra la jornada completa
      if (esIngresoFinal) {
        await conn.one(
          `SELECT finalizar_jornada_completa($1, $2, $3, $4, $5) AS ok`,
          [ctx.salida_id, kmVal, indicador, observaciones || null, userId],
        );
      }

      // Leer el ingreso recién creado dentro del mismo tx para consistencia
      return conn.one(`
        SELECT i.*, s.codigo AS sede_codigo, s.nombre AS sede_nombre
        FROM ingreso_sede i
        JOIN sede s ON i.sede_id = s.id
        WHERE i.id = $1
      `, [row.id]);
    });

    return res.status(201).json({
      message: esIngresoFinal
        ? 'Día laboral finalizado exitosamente'
        : 'Ingreso a sede registrado exitosamente',
      ingreso,
      es_ingreso_final: esIngresoFinal,
      instruccion: esIngresoFinal
        ? 'La salida ha sido finalizada. Unidad y tripulación liberadas.'
        : 'Para volver a salir, registra una salida de sede.',
    });
  } catch (error: any) {
    console.error('Error en registrarIngreso:', error);

    // Restricción UNIQUE: ya existe un ingreso activo para esta salida
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

    // Verificar que el ingreso existe, es activo, pertenece a esta salida y no es final
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
      SET fecha_hora_salida      = NOW(),
          km_salida_nueva        = $2,
          combustible_salida_nueva = $3,
          observaciones_salida   = $4
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

/**
 * GET /api/ingresos/mi-ingreso-activo
 * Obtener mi ingreso activo (si estoy ingresado a sede).
 */
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

/**
 * GET /api/ingresos/mis-ingresos-hoy
 * Historial de ingresos de la salida activa.
 */
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

/**
 * GET /api/ingresos/historial/:salidaId
 * Historial de ingresos de una salida específica (COP / Admin).
 */
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

/**
 * GET /api/ingresos/:id
 * Obtener un ingreso específico por ID.
 */
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

/**
 * PATCH /api/ingresos/:id
 * Editar km, combustible u observaciones de un ingreso.
 * Solo puede editar el brigada al que pertenece la salida.
 */
export async function editarIngreso(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { km_ingreso, combustible_ingreso, combustible_fraccion, observaciones_ingreso } = req.body;
    const userId = req.user!.userId;

    // Verificar existencia y pertenencia en una sola query
    const ingreso = await db.oneOrNone(
      'SELECT id, salida_unidad_id FROM ingreso_sede WHERE id = $1',
      [id],
    );
    if (!ingreso) return res.status(404).json({ error: 'Ingreso no encontrado' });

    const ctx = await resolveContextoActivo(userId);
    if (!ctx.salida_id || ctx.salida_id !== ingreso.salida_unidad_id) {
      return res.status(403).json({ error: 'No tienes permiso para editar este ingreso' });
    }

    // SQL dinámico con named params (pg-promise)
    const sets: string[] = [];
    const params: Record<string, unknown> = { id };

    if (km_ingreso !== undefined) {
      sets.push('km_ingreso = $/km_ingreso/');
      params.km_ingreso = normalizeId(km_ingreso); // INTEGER
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
