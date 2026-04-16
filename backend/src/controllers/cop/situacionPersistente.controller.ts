/**
 * Controller: Situaciones Persistentes
 *
 * Una situación persistente ES una situación (situacion.persistente = true).
 * El COP puede:
 *   - Crear directamente (derrumbe confirmado, obra larga, etc.)
 *   - Promover una situación existente (accidente que no puede resolverse en el día)
 *
 * Estados válidos para persistentes: ACTIVA | EN_PAUSA | FINALIZADA
 */

import { Request, Response } from 'express';
import { db } from '../../config/database';
import { normalizeId, normalizeFloat } from '../../utils/db.utils';
import {
  emitSituacionNueva,
  emitSituacionActualizada,
} from '../../services/common/socket.service';

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

const SELECT_PERSISTENTE = `
  SELECT
    s.id,
    s.codigo_situacion                        AS uuid,
    s.id::text                                AS numero,
    COALESCE(s.titulo, s.tipo_situacion)      AS titulo,
    s.tipo_situacion                          AS tipo,
    NULL::text                                AS subtipo,
    s.estado,
    COALESCE(s.importancia, 'NORMAL')         AS importancia,
    s.ruta_id,
    r.codigo                                  AS ruta_codigo,
    r.nombre                                  AS ruta_nombre,
    s.km                                      AS km_inicio,
    s.km_fin,
    s.sentido,
    s.descripcion,
    s.jurisdiccion,
    s.tipo_situacion_id                       AS tipo_emergencia_id,
    cts.nombre                                AS tipo_emergencia_nombre,
    s.created_at                              AS fecha_inicio,
    s.fecha_fin_estimada,
    s.fecha_hora_finalizacion                 AS fecha_fin_real,
    s.creado_por,
    u_creador.nombre_completo                 AS creado_por_nombre,
    s.promovido_por,
    u_cop.nombre_completo                     AS promovido_por_nombre,
    s.obstruccion_data                        AS obstruccion,
    s.persistente,
    s.latitud,
    s.longitud,
    (
      SELECT COUNT(*)::int
      FROM situacion_persistente_asignacion spa
      WHERE spa.situacion_id = s.id
        AND spa.fecha_hora_desasignacion IS NULL
    ) AS unidades_asignadas_count
  FROM situacion s
  LEFT JOIN ruta r        ON s.ruta_id      = r.id
  LEFT JOIN usuario u_creador ON s.creado_por   = u_creador.id
  LEFT JOIN usuario u_cop     ON s.promovido_por = u_cop.id
  LEFT JOIN catalogo_tipo_situacion cts ON s.tipo_situacion_id = cts.id
  WHERE s.persistente = true
`;

// ────────────────────────────────────────────────────────────────────────────
// CATÁLOGOS
// ────────────────────────────────────────────────────────────────────────────

export async function getTipos(_req: Request, res: Response) {
  // Retorna las categorías/tipos de situación que pueden ser persistentes
  const tipos = [
    { value: 'EMERGENCIA',        label: 'Emergencia' },
    { value: 'INCIDENTE',         label: 'Hecho de Tránsito' },
    { value: 'ASISTENCIA_VEHICULAR', label: 'Asistencia Vehicular' },
    { value: 'REGULACION_TRAFICO', label: 'Regulación de Tráfico' },
    { value: 'OTROS',             label: 'Otros' },
  ];
  return res.json(tipos);
}

export async function getTiposEmergencia(_req: Request, res: Response) {
  try {
    const tipos = await db.any(`
      SELECT id, nombre, icono, categoria
      FROM catalogo_tipo_situacion
      WHERE activo = true
        AND formulario_tipo IN ('EMERGENCIA', 'HECHO_TRANSITO', 'ASISTENCIA')
      ORDER BY categoria, nombre
    `);
    return res.json(tipos);
  } catch (error) {
    console.error('getTiposEmergencia:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// LISTADO
// ────────────────────────────────────────────────────────────────────────────

export async function getSituacionesPersistentes(req: Request, res: Response) {
  try {
    const { estado, tipo, ruta_id, importancia } = req.query as Record<string, string>;

    let where = '';
    const params: any[] = [];
    let idx = 1;

    if (estado)      { where += ` AND s.estado = $${idx++}`;      params.push(estado); }
    if (tipo)        { where += ` AND s.tipo_situacion = $${idx++}`; params.push(tipo); }
    if (ruta_id)     { where += ` AND s.ruta_id = $${idx++}`;     params.push(Number(ruta_id)); }
    if (importancia) { where += ` AND s.importancia = $${idx++}`; params.push(importancia); }

    const rows = await db.any(
      `${SELECT_PERSISTENTE} ${where} ORDER BY s.created_at DESC`,
      params
    );
    return res.json(rows);
  } catch (error) {
    console.error('getSituacionesPersistentes:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function getSituacionesPersistentesActivas(_req: Request, res: Response) {
  try {
    const rows = await db.any(
      `${SELECT_PERSISTENTE} AND s.estado = 'ACTIVA' ORDER BY s.importancia DESC, s.created_at DESC`
    );
    return res.json(rows);
  } catch (error) {
    console.error('getSituacionesPersistentesActivas:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// DETALLE
// ────────────────────────────────────────────────────────────────────────────

export async function getSituacionPersistente(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const situacion = await db.oneOrNone(
      `${SELECT_PERSISTENTE} AND s.id = $1`,
      [id]
    );
    if (!situacion) return res.status(404).json({ error: 'Situación persistente no encontrada' });

    // Cargar asignaciones activas
    const unidades = await db.any(`
      SELECT
        spa.id,
        spa.unidad_id,
        u.codigo AS unidad_codigo,
        u.tipo   AS tipo_unidad,
        spa.fecha_hora_asignacion AS fecha_asignacion,
        spa.fecha_hora_desasignacion,
        spa.observaciones_asignacion,
        usr.nombre_completo AS asignado_por_nombre
      FROM situacion_persistente_asignacion spa
      JOIN unidad  u   ON spa.unidad_id    = u.id
      LEFT JOIN usuario usr ON spa.asignado_por = usr.id
      WHERE spa.situacion_id = $1
        AND spa.fecha_hora_desasignacion IS NULL
      ORDER BY spa.fecha_hora_asignacion
    `, [id]);

    return res.json({ ...situacion, unidades_asignadas: unidades });
  } catch (error) {
    console.error('getSituacionPersistente:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// CREAR DIRECTAMENTE (COP crea una persistente sin situación origen)
// ────────────────────────────────────────────────────────────────────────────

export async function crearCompleta(req: Request, res: Response) {
  try {
    const {
      titulo, tipo_emergencia_id, importancia,
      ruta_id, km_inicio, km_fin, sentido,
      descripcion, jurisdiccion, fecha_fin_estimada,
      obstruccion, autoridades, socorro,
    } = req.body;

    const userId = req.user!.userId;

    if (!titulo) return res.status(400).json({ error: 'El título es requerido' });

    // Determinar tipo_situacion desde el catálogo
    let tipo_situacion = 'EMERGENCIA';
    if (tipo_emergencia_id) {
      const cat = await db.oneOrNone(
        'SELECT formulario_tipo FROM catalogo_tipo_situacion WHERE id = $1',
        [normalizeId(tipo_emergencia_id)]
      );
      if (cat) {
        const map: Record<string, string> = {
          'HECHO_TRANSITO': 'INCIDENTE',
          'ASISTENCIA': 'ASISTENCIA_VEHICULAR',
          'EMERGENCIA': 'EMERGENCIA',
        };
        tipo_situacion = map[cat.formulario_tipo] ?? 'EMERGENCIA';
      }
    }

    const situacion = await db.tx(async (conn) => {
      // Insertar situación con persistente=true
      const s = await conn.one(`
        INSERT INTO situacion (
          tipo_situacion, tipo_situacion_id,
          titulo, descripcion, importancia,
          ruta_id, km, km_fin, sentido,
          jurisdiccion, fecha_fin_estimada,
          obstruccion_data,
          estado, persistente,
          creado_por, codigo_situacion
        ) VALUES (
          $1, $2,
          $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11,
          $12,
          'ACTIVA', true,
          $13, $14
        ) RETURNING id
      `, [
        tipo_situacion,
        normalizeId(tipo_emergencia_id),
        titulo,
        descripcion || null,
        importancia || 'NORMAL',
        normalizeId(ruta_id),
        normalizeFloat(km_inicio),
        normalizeFloat(km_fin),
        sentido || null,
        jurisdiccion || null,
        fecha_fin_estimada || null,
        obstruccion ? JSON.stringify(obstruccion) : null,
        userId,
        `COP-PERS-${Date.now()}`,
      ]);

      // Insertar autoridades
      if (Array.isArray(autoridades) && autoridades.length > 0) {
        for (const aut of autoridades) {
          await conn.none(`
            INSERT INTO autoridad (situacion_id, tipo, hora_llegada, datos, categoria)
            VALUES ($1, $2, $3, $4, 'AUTORIDAD')
          `, [
            s.id,
            aut.tipo_autoridad,
            aut.hora_llegada || null,
            JSON.stringify({
              nip_chapa: aut.nip_chapa,
              nombre_comandante: aut.nombre_comandante,
              cantidad_elementos: aut.cantidad_elementos,
              cantidad_unidades: aut.cantidad_unidades,
            }),
          ]);
        }
      }

      // Insertar socorro
      if (Array.isArray(socorro) && socorro.length > 0) {
        for (const soc of socorro) {
          await conn.none(`
            INSERT INTO autoridad (situacion_id, tipo, hora_llegada, datos, categoria)
            VALUES ($1, $2, $3, $4, 'SOCORRO')
          `, [
            s.id,
            soc.tipo_autoridad,
            soc.hora_llegada || null,
            JSON.stringify({
              nip_chapa: soc.nip_chapa,
              nombre_comandante: soc.nombre_comandante,
              cantidad_elementos: soc.cantidad_elementos,
              cantidad_unidades: soc.cantidad_unidades,
            }),
          ]);
        }
      }

      return s;
    });

    // Retornar situación completa
    const resultado = await db.one(
      `${SELECT_PERSISTENTE} AND s.id = $1`,
      [situacion.id]
    );

    emitSituacionNueva(resultado as any);
    return res.status(201).json({ situacion: resultado });
  } catch (error) {
    console.error('crearCompleta:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// ACTUALIZAR
// ────────────────────────────────────────────────────────────────────────────

export async function actualizarSituacionPersistente(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const {
      titulo, descripcion, importancia,
      ruta_id, km_inicio, km_fin, sentido,
      jurisdiccion, fecha_fin_estimada, obstruccion,
    } = req.body;

    const sets: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    let i = 1;

    if (titulo !== undefined)             { sets.push(`titulo = $${i++}`);               params.push(titulo); }
    if (descripcion !== undefined)        { sets.push(`descripcion = $${i++}`);           params.push(descripcion); }
    if (importancia !== undefined)        { sets.push(`importancia = $${i++}`);           params.push(importancia); }
    if (ruta_id !== undefined)            { sets.push(`ruta_id = $${i++}`);               params.push(normalizeId(ruta_id)); }
    if (km_inicio !== undefined)          { sets.push(`km = $${i++}`);                    params.push(normalizeFloat(km_inicio)); }
    if (km_fin !== undefined)             { sets.push(`km_fin = $${i++}`);                params.push(normalizeFloat(km_fin)); }
    if (sentido !== undefined)            { sets.push(`sentido = $${i++}`);               params.push(sentido); }
    if (jurisdiccion !== undefined)       { sets.push(`jurisdiccion = $${i++}`);          params.push(jurisdiccion); }
    if (fecha_fin_estimada !== undefined) { sets.push(`fecha_fin_estimada = $${i++}`);    params.push(fecha_fin_estimada || null); }
    if (obstruccion !== undefined)        { sets.push(`obstruccion_data = $${i++}`);      params.push(obstruccion ? JSON.stringify(obstruccion) : null); }

    params.push(id);

    const situacion = await db.oneOrNone(
      `UPDATE situacion SET ${sets.join(', ')} WHERE id = $${i} AND persistente = true RETURNING id`,
      params
    );
    if (!situacion) return res.status(404).json({ error: 'Situación persistente no encontrada' });

    const resultado = await db.one(`${SELECT_PERSISTENTE} AND s.id = $1`, [id]);
    emitSituacionActualizada(resultado as any);
    return res.json({ situacion: resultado });
  } catch (error) {
    console.error('actualizarSituacionPersistente:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// CAMBIOS DE ESTADO
// ────────────────────────────────────────────────────────────────────────────

export async function pausarSituacion(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const s = await db.oneOrNone(
      `UPDATE situacion SET estado = 'EN_PAUSA', updated_at = NOW()
       WHERE id = $1 AND persistente = true AND estado = 'ACTIVA' RETURNING id`,
      [id]
    );
    if (!s) return res.status(404).json({ error: 'Situación no encontrada o no está activa' });

    return res.json({ message: 'Situación pausada', id });
  } catch (error) {
    console.error('pausarSituacion:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function reactivarSituacion(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const s = await db.oneOrNone(
      `UPDATE situacion SET estado = 'ACTIVA', updated_at = NOW()
       WHERE id = $1 AND persistente = true AND estado = 'EN_PAUSA' RETURNING id`,
      [id]
    );
    if (!s) return res.status(404).json({ error: 'Situación no encontrada o no está pausada' });

    return res.json({ message: 'Situación reactivada', id });
  } catch (error) {
    console.error('reactivarSituacion:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function finalizarSituacion(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const s = await db.oneOrNone(
      `UPDATE situacion
       SET estado = 'FINALIZADA', fecha_hora_finalizacion = NOW(), updated_at = NOW()
       WHERE id = $1 AND persistente = true AND estado IN ('ACTIVA', 'EN_PAUSA')
       RETURNING id`,
      [id]
    );
    if (!s) return res.status(404).json({ error: 'Situación no encontrada o ya finalizada' });

    return res.json({ message: 'Situación finalizada', id });
  } catch (error) {
    console.error('finalizarSituacion:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// ASIGNACIONES DE UNIDADES
// ────────────────────────────────────────────────────────────────────────────

export async function getAsignaciones(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const asignaciones = await db.any(`
      SELECT
        spa.id,
        spa.situacion_id                     AS situacion_persistente_id,
        spa.unidad_id,
        u.codigo                             AS unidad_codigo,
        u.tipo                               AS tipo_unidad,
        spa.fecha_hora_asignacion,
        spa.fecha_hora_desasignacion,
        spa.observaciones_asignacion,
        usr.nombre_completo                  AS asignado_por_nombre
      FROM situacion_persistente_asignacion spa
      JOIN unidad  u   ON spa.unidad_id    = u.id
      LEFT JOIN usuario usr ON spa.asignado_por = usr.id
      WHERE spa.situacion_id = $1
        AND spa.fecha_hora_desasignacion IS NULL
      ORDER BY spa.fecha_hora_asignacion
    `, [id]);

    return res.json(asignaciones);
  } catch (error) {
    console.error('getAsignaciones:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function getHistorialAsignaciones(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const historial = await db.any(`
      SELECT
        spa.id,
        spa.situacion_id                     AS situacion_persistente_id,
        spa.unidad_id,
        u.codigo                             AS unidad_codigo,
        u.tipo                               AS tipo_unidad,
        spa.fecha_hora_asignacion,
        spa.fecha_hora_desasignacion,
        spa.observaciones_asignacion,
        usr.nombre_completo                  AS asignado_por_nombre
      FROM situacion_persistente_asignacion spa
      JOIN unidad  u   ON spa.unidad_id    = u.id
      LEFT JOIN usuario usr ON spa.asignado_por = usr.id
      WHERE spa.situacion_id = $1
      ORDER BY spa.fecha_hora_asignacion DESC
    `, [id]);

    return res.json(historial);
  } catch (error) {
    console.error('getHistorialAsignaciones:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function asignarUnidad(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { unidad_id, asignacion_unidad_id, km_asignacion, observaciones_asignacion } = req.body;
    const unidadId = normalizeId(unidad_id);
    if (!unidadId) return res.status(400).json({ error: 'unidad_id requerido' });

    const userId = req.user!.userId;

    // Verificar que la situación existe y es persistente
    const existe = await db.oneOrNone(
      'SELECT id FROM situacion WHERE id = $1 AND persistente = true AND estado NOT IN (\'FINALIZADA\', \'CANCELADA\')',
      [id]
    );
    if (!existe) return res.status(404).json({ error: 'Situación persistente no encontrada o ya finalizada' });

    // Verificar que la unidad no esté ya asignada
    const yaAsignada = await db.oneOrNone(
      'SELECT id FROM situacion_persistente_asignacion WHERE situacion_id = $1 AND unidad_id = $2 AND fecha_hora_desasignacion IS NULL',
      [id, unidadId]
    );
    if (yaAsignada) return res.status(409).json({ error: 'La unidad ya está asignada a esta situación' });

    const asignacion = await db.one(`
      INSERT INTO situacion_persistente_asignacion
        (situacion_id, unidad_id, asignacion_unidad_id, km_asignacion, observaciones_asignacion, asignado_por)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      id,
      unidadId,
      normalizeId(asignacion_unidad_id),
      normalizeFloat(km_asignacion),
      observaciones_asignacion || null,
      userId,
    ]);

    return res.status(201).json(asignacion);
  } catch (error) {
    console.error('asignarUnidad:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function desasignarUnidad(req: Request, res: Response) {
  try {
    const id      = normalizeId(req.params.id);
    const unidadId = normalizeId(req.params.unidadId);
    if (!id || !unidadId) return res.status(400).json({ error: 'IDs inválidos' });

    const { observaciones_desasignacion } = req.body;

    const s = await db.oneOrNone(`
      UPDATE situacion_persistente_asignacion
      SET fecha_hora_desasignacion = NOW(),
          observaciones_asignacion = COALESCE($3, observaciones_asignacion)
      WHERE situacion_id = $1 AND unidad_id = $2
        AND fecha_hora_desasignacion IS NULL
      RETURNING id
    `, [id, unidadId, observaciones_desasignacion || null]);

    if (!s) return res.status(404).json({ error: 'Asignación activa no encontrada' });

    return res.json({ message: 'Unidad desasignada' });
  } catch (error) {
    console.error('desasignarUnidad:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// ACTUALIZACIONES (timeline de observaciones)
// ────────────────────────────────────────────────────────────────────────────

export async function getActualizaciones(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const s = await db.oneOrNone(
      'SELECT id, observaciones FROM situacion WHERE id = $1 AND persistente = true',
      [id]
    );
    if (!s) return res.status(404).json({ error: 'Situación no encontrada' });

    const obs: any[] = Array.isArray(s.observaciones) ? s.observaciones : [];

    // Dar forma al interface ActualizacionSituacion esperado por el frontend
    const actualizaciones = obs.map((o: any, idx: number) => ({
      id: idx + 1,
      situacion_persistente_id: id,
      usuario_id:     o.usuario_id   ?? null,
      usuario_nombre: o.firma        ?? o.usuario ?? 'Sistema',
      unidad_id:      o.unidad_id    ?? null,
      unidad_codigo:  o.unidad_codigo ?? null,
      tipo_actualizacion: o.tipo     ?? 'OBSERVACION',
      contenido:      o.texto        ?? o.observacion ?? null,
      fecha_hora:     o.timestamp    ?? o.created_at  ?? null,
      puede_editarse: false,
    }));

    return res.json(actualizaciones);
  } catch (error) {
    console.error('getActualizaciones:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function agregarActualizacion(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { tipo_actualizacion, contenido } = req.body;
    const userId = req.user!.userId;

    const usuario = await db.oneOrNone('SELECT nombre_completo FROM usuario WHERE id = $1', [userId]);

    const entrada = JSON.stringify({
      usuario_id:     userId,
      firma:          usuario?.nombre_completo ?? 'Sistema',
      tipo:           tipo_actualizacion ?? 'OBSERVACION',
      texto:          contenido ?? null,
      timestamp:      new Date().toISOString(),
    });

    const s = await db.oneOrNone(
      `UPDATE situacion
       SET observaciones = COALESCE(observaciones, '[]'::jsonb) || $1::jsonb, updated_at = NOW()
       WHERE id = $2 AND persistente = true RETURNING id`,
      [entrada, id]
    );
    if (!s) return res.status(404).json({ error: 'Situación no encontrada' });

    return res.status(201).json({ message: 'Actualización registrada' });
  } catch (error) {
    console.error('agregarActualizacion:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// SUB-ENTIDADES: OBSTRUCCIÓN, AUTORIDADES, SOCORRO, MULTIMEDIA
// ────────────────────────────────────────────────────────────────────────────

export async function getObstruccion(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const s = await db.oneOrNone(
      'SELECT obstruccion_data FROM situacion WHERE id = $1 AND persistente = true',
      [id]
    );
    if (!s) return res.status(404).json({ error: 'Situación no encontrada' });

    return res.json(s.obstruccion_data ?? null);
  } catch (error) {
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function getAutoridades(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const autoridades = await db.any(`
      SELECT id, situacion_id AS situacion_persistente_id,
             tipo AS tipo_autoridad, hora_llegada,
             datos->>'nip_chapa'           AS nip_chapa,
             datos->>'nombre_comandante'   AS nombre_comandante,
             (datos->>'cantidad_elementos')::int AS cantidad_elementos,
             (datos->>'cantidad_unidades')::int  AS cantidad_unidades
      FROM autoridad
      WHERE situacion_id = $1 AND categoria = 'AUTORIDAD'
      ORDER BY hora_llegada NULLS LAST
    `, [id]);

    return res.json(autoridades);
  } catch (error) {
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function getSocorro(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const socorro = await db.any(`
      SELECT id, situacion_id AS situacion_persistente_id,
             tipo AS tipo_autoridad, hora_llegada,
             datos->>'nip_chapa'           AS nip_chapa,
             datos->>'nombre_comandante'   AS nombre_comandante,
             (datos->>'cantidad_elementos')::int AS cantidad_elementos,
             (datos->>'cantidad_unidades')::int  AS cantidad_unidades
      FROM autoridad
      WHERE situacion_id = $1 AND categoria = 'SOCORRO'
      ORDER BY hora_llegada NULLS LAST
    `, [id]);

    return res.json(socorro);
  } catch (error) {
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function getMultimedia(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const multimedia = await db.any(`
      SELECT id,
             situacion_id AS situacion_persistente_id,
             tipo,
             url,
             COALESCE(orden, 1) AS orden,
             created_at
      FROM situacion_multimedia
      WHERE situacion_id = $1
      ORDER BY tipo, orden
    `, [id]);

    return res.json(multimedia);
  } catch (error) {
    return res.status(500).json({ error: 'Error interno' });
  }
}

export async function deleteMultimedia(req: Request, res: Response) {
  try {
    const id           = normalizeId(req.params.id);
    const multimediaId = normalizeId(req.params.multimediaId);
    if (!id || !multimediaId) return res.status(400).json({ error: 'IDs inválidos' });

    await db.none(
      'DELETE FROM situacion_multimedia WHERE id = $1 AND situacion_id = $2',
      [multimediaId, id]
    );
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Error interno' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PROMOVER situación existente a persistente
// ────────────────────────────────────────────────────────────────────────────

export async function promover(req: Request, res: Response) {
  try {
    const situacionId = normalizeId(req.params.situacionId);
    if (!situacionId) return res.status(400).json({ error: 'ID inválido' });

    const copUserId = req.user!.userId;
    const { titulo, tipo_emergencia_id, importancia, descripcion } = req.body;

    // Verificar que la situación existe y no es ya persistente
    const existente = await db.oneOrNone(
      'SELECT id, persistente FROM situacion WHERE id = $1',
      [situacionId]
    );
    if (!existente) return res.status(404).json({ error: 'Situación no encontrada' });
    if (existente.persistente) return res.status(409).json({ error: 'La situación ya es persistente' });

    const sets: string[] = [
      'persistente      = true',
      'promovido_por    = $1',
      'estado           = CASE WHEN estado = \'CERRADA\' THEN \'ACTIVA\' ELSE estado END',
      'updated_at       = NOW()',
    ];
    const params: any[] = [copUserId];
    let i = 2;

    if (titulo)             { sets.push(`titulo            = $${i++}`); params.push(titulo); }
    if (tipo_emergencia_id) { sets.push(`tipo_situacion_id = $${i++}`); params.push(normalizeId(tipo_emergencia_id)); }
    if (importancia)        { sets.push(`importancia       = $${i++}`); params.push(importancia); }
    if (descripcion)        { sets.push(`descripcion       = $${i++}`); params.push(descripcion); }

    params.push(situacionId);

    const resultado = await db.tx(async (conn) => {
      const s = await conn.oneOrNone(
        `UPDATE situacion SET ${sets.join(', ')} WHERE id = $${i} RETURNING id`,
        params
      );
      if (!s) throw new Error('NOT_FOUND');

      return conn.one(`${SELECT_PERSISTENTE} AND s.id = $1`, [s.id]);
    });

    emitSituacionActualizada(resultado as any);
    return res.json({ situacion: resultado });
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Situación no encontrada' });
    }
    console.error('promover:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}
