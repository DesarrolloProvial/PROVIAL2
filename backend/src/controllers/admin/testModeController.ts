/**
 * Controlador para endpoints de Modo de Pruebas
 *
 * IMPORTANTE: Estos endpoints modifican datos REALES del backend
 * Solo deben usarse en desarrollo/testing
 *
 * Estructura de tablas:
 * - brigada_unidad: Asignación permanente de brigada a unidad
 * - salida_unidad: Registro de salidas de unidades
 * - ingreso_sede: Registro de ingresos a sede
 * - situacion: Situaciones operativas
 */

import { Request, Response } from 'express';
import { db } from '../config/database';

/**
 * Resetea la salida activa del usuario
 * FINALIZA la salida activa (pone estado = 'FINALIZADA')
 * Esto permite que el usuario pueda iniciar una nueva salida
 */
export async function resetSalidaActiva(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const userId = req.user.userId;
    console.log(`🧪 [TEST MODE] Intentando resetear salida para usuario ${userId}`);

    const result = await db.tx(async t => {
      // 1. Obtener unidad asignada del usuario desde brigada_unidad
      const asignacion = await t.oneOrNone(
        `SELECT bu.unidad_id, u.codigo as unidad_codigo
         FROM brigada_unidad bu
         JOIN unidad u ON bu.unidad_id = u.id
         WHERE bu.brigada_id = $1 AND bu.activo = true
         LIMIT 1`,
        [userId]
      );

      if (!asignacion) {
        console.log(`🧪 [TEST MODE] Usuario ${userId} no tiene unidad asignada`);
        return { finalized: false, message: 'No tienes unidad asignada en brigada_unidad' };
      }

      console.log(`🧪 [TEST MODE] Usuario ${userId} tiene unidad ${asignacion.unidad_codigo} (${asignacion.unidad_id})`);

      // 2. Buscar salida activa de esa unidad
      const salida = await t.oneOrNone(
        `SELECT id, unidad_id, km_inicial, combustible_inicial
         FROM salida_unidad
         WHERE unidad_id = $1 AND estado = 'EN_SALIDA'
         LIMIT 1`,
        [asignacion.unidad_id]
      );

      if (!salida) {
        console.log(`🧪 [TEST MODE] No hay salida activa para unidad ${asignacion.unidad_id}`);
        return { finalized: false, message: 'No hay salida activa para tu unidad' };
      }

      console.log(`🧪 [TEST MODE] Encontrada salida activa ${salida.id}, finalizando...`);

      // 3. Finalizar la salida
      await t.none(
        `UPDATE salida_unidad
         SET fecha_hora_regreso = NOW(),
             estado = 'FINALIZADA',
             km_final = $1,
             combustible_final = $2,
             observaciones_regreso = 'Finalizado automáticamente por Modo de Pruebas',
             finalizada_por = $3
         WHERE id = $4`,
        [salida.km_inicial, salida.combustible_inicial, userId, salida.id]
      );

      console.log(`🧪 [TEST MODE] Salida ${salida.id} finalizada exitosamente`);

      return {
        finalized: true,
        salidaId: salida.id,
        message: 'Salida activa finalizada correctamente',
        unidad: asignacion.unidad_codigo
      };
    });

    res.json(result);

  } catch (error) {
    console.error('[TEST MODE] Error resetting salida:', error);
    res.status(500).json({
      error: 'Error al resetear salida en backend',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Resetea ingresos activos del usuario
 * Elimina: ingresos a sede sin salida registrada
 */
export async function resetIngresosActivos(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const userId = req.user.userId;

    const result = await db.tx(async t => {
      // Obtener unidad del usuario
      const asignacion = await t.oneOrNone(
        `SELECT unidad_id FROM brigada_unidad
         WHERE brigada_id = $1 AND activo = true
         LIMIT 1`,
        [userId]
      );

      if (!asignacion) {
        return { deleted: false, count: 0, message: 'No tienes unidad asignada' };
      }

      // Eliminar ingresos activos (sin salida)
      const deleted = await t.manyOrNone(
        `DELETE FROM ingreso_sede
         WHERE unidad_id = $1
           AND fecha_hora_salida IS NULL
         RETURNING id`,
        [asignacion.unidad_id]
      );

      const deletedCount = deleted.length;
      console.log(`🧪 [TEST MODE] ${deletedCount} ingresos eliminados para unidad ${asignacion.unidad_id}`);

      return {
        deleted: deletedCount > 0,
        count: deletedCount,
        message: `${deletedCount} ingreso(s) eliminado(s) del backend`
      };
    });

    res.json(result);

  } catch (error) {
    console.error('[TEST MODE] Error resetting ingresos:', error);
    res.status(500).json({
      error: 'Error al resetear ingresos en backend',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Resetea situaciones del día del usuario
 * Elimina: situaciones reportadas hoy por la unidad del usuario
 */
export async function resetSituacionesHoy(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const userId = req.user.userId;

    const result = await db.tx(async t => {
      // Obtener unidad del usuario
      const asignacion = await t.oneOrNone(
        `SELECT unidad_id FROM brigada_unidad
         WHERE brigada_id = $1 AND activo = true
         LIMIT 1`,
        [userId]
      );

      if (!asignacion) {
        return { deleted: false, count: 0, message: 'No tienes unidad asignada' };
      }

      // Eliminar situaciones de hoy
      const deleted = await t.manyOrNone(
        `DELETE FROM situacion
         WHERE unidad_id = $1
           AND DATE(created_at) = CURRENT_DATE
         RETURNING id`,
        [asignacion.unidad_id]
      );

      const deletedCount = deleted.length;
      console.log(`🧪 [TEST MODE] ${deletedCount} situaciones eliminadas para unidad ${asignacion.unidad_id}`);

      return {
        deleted: deletedCount > 0,
        count: deletedCount,
        message: `${deletedCount} situación(es) eliminada(s) del backend`
      };
    });

    res.json(result);

  } catch (error) {
    console.error('[TEST MODE] Error resetting situaciones:', error);
    res.status(500).json({
      error: 'Error al resetear situaciones en backend',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Resetea TODO del usuario (salida, ingresos, situaciones)
 */
export async function resetTodoUsuario(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const userId = req.user.userId;
    console.log(`🧪 [TEST MODE] Reset completo iniciado para usuario ${userId}`);

    const result = await db.tx(async t => {
      const results = {
        salida: false,
        salidaId: null as number | null,
        ingresos: 0,
        situaciones: 0,
        unidad: null as string | null
      };

      // 1. Obtener unidad del usuario
      const asignacion = await t.oneOrNone(
        `SELECT bu.unidad_id, u.codigo as unidad_codigo
         FROM brigada_unidad bu
         JOIN unidad u ON bu.unidad_id = u.id
         WHERE bu.brigada_id = $1 AND bu.activo = true
         LIMIT 1`,
        [userId]
      );

      if (!asignacion) {
        return { ...results, message: 'No tienes unidad asignada' };
      }

      results.unidad = asignacion.unidad_codigo;

      // 2. Finalizar salida activa
      const salida = await t.oneOrNone(
        `SELECT id, km_inicial, combustible_inicial
         FROM salida_unidad
         WHERE unidad_id = $1 AND estado = 'EN_SALIDA'
         LIMIT 1`,
        [asignacion.unidad_id]
      );

      if (salida) {
        await t.none(
          `UPDATE salida_unidad
           SET fecha_hora_regreso = NOW(),
               estado = 'FINALIZADA',
               km_final = $1,
               combustible_final = $2,
               observaciones_regreso = 'Finalizado automáticamente por Modo de Pruebas',
               finalizada_por = $3
           WHERE id = $4`,
          [salida.km_inicial, salida.combustible_inicial, userId, salida.id]
        );
        results.salida = true;
        results.salidaId = salida.id;
      }

      // 3. Eliminar ingresos activos
      const deletedIngresos = await t.manyOrNone(
        `DELETE FROM ingreso_sede
         WHERE unidad_id = $1
           AND fecha_hora_salida IS NULL
         RETURNING id`,
        [asignacion.unidad_id]
      );
      results.ingresos = deletedIngresos.length;

      // 4. Eliminar situaciones de hoy
      const deletedSituaciones = await t.manyOrNone(
        `DELETE FROM situacion
         WHERE unidad_id = $1
           AND DATE(created_at) = CURRENT_DATE
         RETURNING id`,
        [asignacion.unidad_id]
      );
      results.situaciones = deletedSituaciones.length;

      return results;
    });

    console.log(`🧪 [TEST MODE] Reset completo para usuario ${userId}:`, result);

    res.json({
      message: 'Estado reseteado correctamente. Puedes iniciar una nueva salida.',
      results: {
        unidad: result.unidad || 'Sin asignar',
        salida: result.salida ? `Finalizada (ID: ${result.salidaId})` : 'Sin salida activa',
        ingresos: `${result.ingresos} eliminados`,
        situaciones: `${result.situaciones} eliminadas`
      }
    });

  } catch (error) {
    console.error('[TEST MODE] Error resetting todo:', error);
    res.status(500).json({
      error: 'Error al resetear todo en backend',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
