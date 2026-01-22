/**
 * Controller de Conflictos de Situaciones
 * Sistema Offline-First para PROVIAL
 *
 * Maneja conflictos cuando:
 * - Dos tripulantes reportan la misma situacion
 * - Un numero de situacion ya fue usado
 * - Dos tripulantes editan simultaneamente
 */

import { Request, Response } from 'express';
import { db } from '../config/database';

/**
 * POST /api/situaciones/conflictos
 * Registrar un nuevo conflicto para revision del COP
 *
 * Body:
 * - codigo_situacion: ID determinista de la situacion
 * - datos_locales: Datos que el brigada intento guardar
 * - datos_servidor: Datos actuales en servidor (si existe)
 * - diferencias: Array de {campo, local, servidor}
 * - tipo_conflicto: DUPLICADO | NUMERO_USADO | EDICION_SIMULTANEA
 */
export async function registrarConflicto(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const {
      codigo_situacion,
      datos_locales,
      datos_servidor,
      diferencias,
      tipo_conflicto
    } = req.body;

    // Validar parametros
    if (!codigo_situacion) {
      return res.status(400).json({ error: 'codigo_situacion es requerido' });
    }

    if (!datos_locales) {
      return res.status(400).json({ error: 'datos_locales es requerido' });
    }

    if (!tipo_conflicto || !['DUPLICADO', 'NUMERO_USADO', 'EDICION_SIMULTANEA'].includes(tipo_conflicto)) {
      return res.status(400).json({
        error: 'tipo_conflicto invalido',
        message: 'Debe ser: DUPLICADO, NUMERO_USADO o EDICION_SIMULTANEA'
      });
    }

    // Buscar situacion existente (si hay)
    const situacionExistente = await db.oneOrNone(
      'SELECT id FROM situacion WHERE codigo_situacion = $1',
      [codigo_situacion]
    );

    // Verificar si ya hay un conflicto pendiente para esta situacion
    const conflictoExistente = await db.oneOrNone(
      `SELECT id FROM situacion_conflicto
       WHERE codigo_situacion = $1 AND usuario_reporta = $2 AND estado = 'PENDIENTE'`,
      [codigo_situacion, req.user.userId]
    );

    if (conflictoExistente) {
      // Actualizar conflicto existente en lugar de crear nuevo
      await db.none(
        `UPDATE situacion_conflicto
         SET datos_locales = $1, datos_servidor = $2, diferencias = $3
         WHERE id = $4`,
        [datos_locales, datos_servidor, diferencias || [], conflictoExistente.id]
      );

      return res.json({
        conflicto_id: conflictoExistente.id,
        message: 'Conflicto actualizado. El COP revisara esta situacion.',
        actualizado: true
      });
    }

    // Crear nuevo conflicto
    const conflicto = await db.one(
      `INSERT INTO situacion_conflicto (
        codigo_situacion,
        situacion_existente_id,
        datos_locales,
        datos_servidor,
        diferencias,
        usuario_reporta,
        tipo_conflicto,
        estado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDIENTE')
      RETURNING id`,
      [
        codigo_situacion,
        situacionExistente?.id || null,
        datos_locales,
        datos_servidor,
        diferencias || [],
        req.user.userId,
        tipo_conflicto
      ]
    );

    console.log(`[CONFLICTOS] Registrado conflicto ${conflicto.id} tipo ${tipo_conflicto} por usuario ${req.user.userId}`);

    return res.status(201).json({
      conflicto_id: conflicto.id,
      message: 'Conflicto registrado. El COP revisara esta situacion.'
    });

  } catch (error: any) {
    console.error('[CONFLICTOS] Error al registrar conflicto:', error);
    return res.status(500).json({
      error: 'Error al registrar conflicto',
      message: error.message
    });
  }
}

/**
 * GET /api/situaciones/conflictos
 * Listar conflictos pendientes (para COP)
 */
export async function listarConflictos(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { estado } = req.query;

    let query = `
      SELECT
        c.*,
        u.nombre_completo as usuario_nombre,
        u.chapa as usuario_chapa,
        s.tipo_situacion as situacion_tipo,
        s.km as situacion_km,
        un.codigo as unidad_codigo
      FROM situacion_conflicto c
      LEFT JOIN usuario u ON c.usuario_reporta = u.id
      LEFT JOIN situacion s ON c.situacion_existente_id = s.id
      LEFT JOIN unidad un ON s.unidad_id = un.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (estado) {
      params.push(estado);
      query += ` AND c.estado = $${++paramCount}`;
    } else {
      query += ` AND c.estado = 'PENDIENTE'`;
    }

    query += ` ORDER BY c.created_at DESC`;

    const conflictos = await db.manyOrNone(query, params);

    return res.json({
      conflictos,
      total: conflictos.length
    });

  } catch (error: any) {
    console.error('[CONFLICTOS] Error al listar conflictos:', error);
    return res.status(500).json({ error: 'Error al listar conflictos' });
  }
}

/**
 * GET /api/situaciones/conflictos/:id
 * Obtener detalle de un conflicto
 */
export async function obtenerConflicto(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { id } = req.params;

    const conflicto = await db.oneOrNone(
      `SELECT
        c.*,
        u.nombre_completo as usuario_nombre,
        u.chapa as usuario_chapa,
        r.nombre_completo as resuelto_por_nombre
      FROM situacion_conflicto c
      LEFT JOIN usuario u ON c.usuario_reporta = u.id
      LEFT JOIN usuario r ON c.resuelto_por = r.id
      WHERE c.id = $1`,
      [id]
    );

    if (!conflicto) {
      return res.status(404).json({ error: 'Conflicto no encontrado' });
    }

    return res.json(conflicto);

  } catch (error: any) {
    console.error('[CONFLICTOS] Error al obtener conflicto:', error);
    return res.status(500).json({ error: 'Error al obtener conflicto' });
  }
}

/**
 * PATCH /api/situaciones/conflictos/:id/resolver
 * Resolver un conflicto (COP/Admin)
 *
 * Body:
 * - decision: USAR_LOCAL | USAR_SERVIDOR | DESCARTADO
 * - notas_resolucion: Texto opcional
 */
export async function resolverConflicto(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { id } = req.params;
    const { decision, notas_resolucion } = req.body;

    if (!decision || !['USAR_LOCAL', 'USAR_SERVIDOR', 'DESCARTADO'].includes(decision)) {
      return res.status(400).json({
        error: 'decision invalida',
        message: 'Debe ser: USAR_LOCAL, USAR_SERVIDOR o DESCARTADO'
      });
    }

    // Obtener conflicto
    const conflicto = await db.oneOrNone(
      'SELECT * FROM situacion_conflicto WHERE id = $1',
      [id]
    );

    if (!conflicto) {
      return res.status(404).json({ error: 'Conflicto no encontrado' });
    }

    if (conflicto.estado !== 'PENDIENTE') {
      return res.status(400).json({ error: 'Este conflicto ya fue resuelto' });
    }

    await db.tx(async t => {
      // Si decision es USAR_LOCAL y hay situacion existente, actualizar con datos locales
      if (decision === 'USAR_LOCAL' && conflicto.situacion_existente_id) {
        const datosLocales = conflicto.datos_locales;

        // Actualizar campos relevantes de la situacion
        await t.none(
          `UPDATE situacion SET
            km = COALESCE($2, km),
            sentido = COALESCE($3, sentido),
            descripcion = COALESCE($4, descripcion),
            observaciones = COALESCE($5, observaciones),
            updated_at = NOW(),
            actualizado_por = $6
          WHERE id = $1`,
          [
            conflicto.situacion_existente_id,
            datosLocales.km,
            datosLocales.sentido,
            datosLocales.descripcion,
            datosLocales.observaciones,
            req.user!.userId
          ]
        );

        console.log(`[CONFLICTOS] Situacion ${conflicto.situacion_existente_id} actualizada con datos locales`);
      }

      // Marcar conflicto como resuelto
      await t.none(
        `UPDATE situacion_conflicto SET
          estado = 'RESUELTO',
          decision_cop = $1,
          notas_resolucion = $2,
          resuelto_por = $3,
          resolved_at = NOW()
        WHERE id = $4`,
        [decision, notas_resolucion, req.user!.userId, id]
      );
    });

    console.log(`[CONFLICTOS] Conflicto ${id} resuelto: ${decision} por usuario ${req.user.userId}`);

    return res.json({
      message: 'Conflicto resuelto exitosamente',
      decision,
      conflicto_id: id
    });

  } catch (error: any) {
    console.error('[CONFLICTOS] Error al resolver conflicto:', error);
    return res.status(500).json({
      error: 'Error al resolver conflicto',
      message: error.message
    });
  }
}

/**
 * GET /api/situaciones/conflictos/mis-conflictos
 * Obtener conflictos del usuario actual (brigada)
 */
export async function misConflictos(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const conflictos = await db.manyOrNone(
      `SELECT
        id,
        codigo_situacion,
        tipo_conflicto,
        estado,
        decision_cop,
        notas_resolucion,
        created_at,
        resolved_at
      FROM situacion_conflicto
      WHERE usuario_reporta = $1
      ORDER BY created_at DESC
      LIMIT 20`,
      [req.user.userId]
    );

    return res.json({
      conflictos,
      total: conflictos.length
    });

  } catch (error: any) {
    console.error('[CONFLICTOS] Error al obtener mis conflictos:', error);
    return res.status(500).json({ error: 'Error al obtener conflictos' });
  }
}
