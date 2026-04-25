import { db } from '../../config/database';
import { normalizeId, normalizeFloat } from '../../utils/db.utils';

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
  LEFT JOIN ruta r            ON s.ruta_id       = r.id
  LEFT JOIN usuario u_creador ON s.creado_por    = u_creador.id
  LEFT JOIN usuario u_cop     ON s.promovido_por = u_cop.id
  LEFT JOIN catalogo_tipo_situacion cts ON s.tipo_situacion_id = cts.id
  WHERE s.persistente = true
`;

const SELECT_ASIGNACION = `
  SELECT
    spa.id,
    spa.situacion_id,
    spa.unidad_id,
    u.codigo                         AS unidad_codigo,
    u.tipo                           AS tipo_unidad,
    spa.fecha_hora_asignacion,
    spa.fecha_hora_desasignacion,
    spa.observaciones_asignacion,
    usr.nombre_completo              AS asignado_por_nombre
  FROM situacion_persistente_asignacion spa
  JOIN unidad  u   ON spa.unidad_id  = u.id
  LEFT JOIN usuario usr ON spa.asignado_por = usr.id
`;

export const SituacionPersistenteModel = {

  // ── Catálogos ──────────────────────────────────────────────────────────────

  async getTiposEmergencia(): Promise<any[]> {
    return db.any(`
      SELECT id, nombre, icono, categoria
      FROM catalogo_tipo_situacion
      WHERE activo = true
        AND formulario_tipo IN ('EMERGENCIA', 'HECHO_TRANSITO', 'ASISTENCIA')
      ORDER BY categoria, nombre
    `);
  },

  // ── Listados ───────────────────────────────────────────────────────────────

  async listar(filtros: {
    estado?: string;
    tipo?: string;
    ruta_id?: number;
    importancia?: string;
  }): Promise<any[]> {
    const { estado, tipo, ruta_id, importancia } = filtros;
    let where = '';
    const params: any[] = [];
    let idx = 1;

    if (estado)      { where += ` AND s.estado = $${idx++}`;           params.push(estado); }
    if (tipo)        { where += ` AND s.tipo_situacion = $${idx++}`;   params.push(tipo); }
    if (ruta_id)     { where += ` AND s.ruta_id = $${idx++}`;          params.push(ruta_id); }
    if (importancia) { where += ` AND s.importancia = $${idx++}`;      params.push(importancia); }

    return db.any(`${SELECT_PERSISTENTE} ${where} ORDER BY s.created_at DESC`, params);
  },

  async listarActivas(): Promise<any[]> {
    return db.any(
      `${SELECT_PERSISTENTE} AND s.estado = 'ACTIVA' ORDER BY s.importancia DESC, s.created_at DESC`,
    );
  },

  // ── Detalle ────────────────────────────────────────────────────────────────

  async getById(id: number): Promise<any | null> {
    return db.oneOrNone(`${SELECT_PERSISTENTE} AND s.id = $1`, [id]);
  },

  async getDetalle(id: number): Promise<any | null> {
    const situacion = await db.oneOrNone(`${SELECT_PERSISTENTE} AND s.id = $1`, [id]);
    if (!situacion) return null;

    const unidades = await db.any(
      `${SELECT_ASIGNACION}
       WHERE spa.situacion_id = $1 AND spa.fecha_hora_desasignacion IS NULL
       ORDER BY spa.fecha_hora_asignacion`,
      [id],
    );

    return { ...situacion, unidades_asignadas: unidades };
  },

  // ── Asignaciones ───────────────────────────────────────────────────────────

  async getAsignaciones(id: number): Promise<any[]> {
    return db.any(
      `${SELECT_ASIGNACION}
       WHERE spa.situacion_id = $1 AND spa.fecha_hora_desasignacion IS NULL
       ORDER BY spa.fecha_hora_asignacion`,
      [id],
    );
  },

  async getHistorialAsignaciones(id: number): Promise<any[]> {
    return db.any(
      `${SELECT_ASIGNACION}
       WHERE spa.situacion_id = $1
       ORDER BY spa.fecha_hora_asignacion DESC`,
      [id],
    );
  },

  // ── Sub-entidades: obstrucción, autoridades, socorro, multimedia ───────────

  async getObstruccion(id: number): Promise<any | null> {
    const row = await db.oneOrNone(
      'SELECT obstruccion_data FROM situacion WHERE id = $1 AND persistente = true',
      [id],
    );
    return row ? row.obstruccion_data ?? null : undefined;
  },

  async getAutoridades(id: number): Promise<any[]> {
    return db.any(
      `SELECT id,
              situacion_id                          AS situacion_persistente_id,
              tipo                                  AS tipo_autoridad,
              hora_llegada,
              datos->>'nip_chapa'                   AS nip_chapa,
              datos->>'nombre_comandante'           AS nombre_comandante,
              (datos->>'cantidad_elementos')::int   AS cantidad_elementos,
              (datos->>'cantidad_unidades')::int    AS cantidad_unidades
       FROM autoridad
       WHERE situacion_id = $1 AND categoria = 'AUTORIDAD'
       ORDER BY hora_llegada NULLS LAST`,
      [id],
    );
  },

  async getSocorro(id: number): Promise<any[]> {
    return db.any(
      `SELECT id,
              situacion_id                          AS situacion_persistente_id,
              tipo                                  AS tipo_autoridad,
              hora_llegada,
              datos->>'nip_chapa'                   AS nip_chapa,
              datos->>'nombre_comandante'           AS nombre_comandante,
              (datos->>'cantidad_elementos')::int   AS cantidad_elementos,
              (datos->>'cantidad_unidades')::int    AS cantidad_unidades
       FROM autoridad
       WHERE situacion_id = $1 AND categoria = 'SOCORRO'
       ORDER BY hora_llegada NULLS LAST`,
      [id],
    );
  },

  async getMultimedia(id: number): Promise<any[]> {
    return db.any(
      `SELECT id,
              situacion_id   AS situacion_persistente_id,
              tipo,
              url_original   AS url,
              COALESCE(orden, 1) AS orden,
              created_at
       FROM situacion_multimedia
       WHERE situacion_id = $1
       ORDER BY tipo, orden`,
      [id],
    );
  },

  // ── Actualizaciones (timeline jsonb) ──────────────────────────────────────

  async getObservaciones(id: number): Promise<{ id: number; observaciones: any[] | null } | null> {
    return db.oneOrNone(
      'SELECT id, observaciones FROM situacion WHERE id = $1 AND persistente = true',
      [id],
    );
  },

  async agregarObservacion(id: number, entrada: string): Promise<boolean> {
    const s = await db.oneOrNone(
      `UPDATE situacion
       SET observaciones = COALESCE(observaciones, '[]'::jsonb) || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2 AND persistente = true
       RETURNING id`,
      [entrada, id],
    );
    return s !== null;
  },

  // ── Cambios de estado ──────────────────────────────────────────────────────

  async pausar(id: number): Promise<boolean> {
    const s = await db.oneOrNone(
      `UPDATE situacion SET estado = 'EN_PAUSA', updated_at = NOW()
       WHERE id = $1 AND persistente = true AND estado = 'ACTIVA'
       RETURNING id`,
      [id],
    );
    return s !== null;
  },

  async reactivar(id: number): Promise<boolean> {
    const s = await db.oneOrNone(
      `UPDATE situacion SET estado = 'ACTIVA', updated_at = NOW()
       WHERE id = $1 AND persistente = true AND estado = 'EN_PAUSA'
       RETURNING id`,
      [id],
    );
    return s !== null;
  },

  async finalizar(id: number): Promise<boolean> {
    const s = await db.oneOrNone(
      `UPDATE situacion
       SET estado = 'FINALIZADA', fecha_hora_finalizacion = NOW(), updated_at = NOW()
       WHERE id = $1 AND persistente = true AND estado IN ('ACTIVA', 'EN_PAUSA')
       RETURNING id`,
      [id],
    );
    return s !== null;
  },

  // ── Actualizar campos ──────────────────────────────────────────────────────

  async actualizar(id: number, campos: {
    titulo?: string;
    descripcion?: string;
    importancia?: string;
    ruta_id?: any;
    km_inicio?: any;
    km_fin?: any;
    sentido?: string;
    jurisdiccion?: string;
    fecha_fin_estimada?: string;
    obstruccion?: any;
  }): Promise<any | null> {
    const sets: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    let i = 1;

    if (campos.titulo !== undefined)             { sets.push(`titulo = $${i++}`);               params.push(campos.titulo); }
    if (campos.descripcion !== undefined)        { sets.push(`descripcion = $${i++}`);           params.push(campos.descripcion); }
    if (campos.importancia !== undefined)        { sets.push(`importancia = $${i++}`);           params.push(campos.importancia); }
    if (campos.ruta_id !== undefined)            { sets.push(`ruta_id = $${i++}`);               params.push(normalizeId(campos.ruta_id)); }
    if (campos.km_inicio !== undefined)          { sets.push(`km = $${i++}`);                    params.push(normalizeFloat(campos.km_inicio)); }
    if (campos.km_fin !== undefined)             { sets.push(`km_fin = $${i++}`);                params.push(normalizeFloat(campos.km_fin)); }
    if (campos.sentido !== undefined)            { sets.push(`sentido = $${i++}`);               params.push(campos.sentido); }
    if (campos.jurisdiccion !== undefined)       { sets.push(`jurisdiccion = $${i++}`);          params.push(campos.jurisdiccion); }
    if (campos.fecha_fin_estimada !== undefined) { sets.push(`fecha_fin_estimada = $${i++}`);    params.push(campos.fecha_fin_estimada || null); }
    if (campos.obstruccion !== undefined)        { sets.push(`obstruccion_data = $${i++}`);      params.push(campos.obstruccion ? JSON.stringify(campos.obstruccion) : null); }

    params.push(id);
    const s = await db.oneOrNone(
      `UPDATE situacion SET ${sets.join(', ')} WHERE id = $${i} AND persistente = true RETURNING id`,
      params,
    );
    if (!s) return null;
    return db.one(`${SELECT_PERSISTENTE} AND s.id = $1`, [id]);
  },

  // ── Asignar / desasignar unidad ────────────────────────────────────────────

  async asignarUnidad(id: number, data: {
    unidad_id: number;
    asignacion_unidad_id?: number | null;
    km_asignacion?: number | null;
    observaciones_asignacion?: string | null;
  }, userId: number): Promise<any> {
    return db.tx(async (conn) => {
      const existe = await conn.oneOrNone(
        `SELECT id FROM situacion
         WHERE id = $1 AND persistente = true AND estado NOT IN ('FINALIZADA', 'CANCELADA')`,
        [id],
      );
      if (!existe) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });

      const yaAsignada = await conn.oneOrNone(
        `SELECT id FROM situacion_persistente_asignacion
         WHERE situacion_id = $1 AND unidad_id = $2 AND fecha_hora_desasignacion IS NULL`,
        [id, data.unidad_id],
      );
      if (yaAsignada) throw Object.assign(new Error('CONFLICT'), { status: 409 });

      return conn.one(
        `INSERT INTO situacion_persistente_asignacion
           (situacion_id, unidad_id, asignacion_unidad_id, km_asignacion, observaciones_asignacion, asignado_por)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [id, data.unidad_id, data.asignacion_unidad_id ?? null, data.km_asignacion ?? null, data.observaciones_asignacion ?? null, userId],
      );
    });
  },

  async desasignarUnidad(id: number, unidadId: number, obs?: string | null): Promise<boolean> {
    const s = await db.oneOrNone(
      `UPDATE situacion_persistente_asignacion
       SET fecha_hora_desasignacion = NOW(),
           observaciones_asignacion = COALESCE($3, observaciones_asignacion)
       WHERE situacion_id = $1 AND unidad_id = $2 AND fecha_hora_desasignacion IS NULL
       RETURNING id`,
      [id, unidadId, obs ?? null],
    );
    return s !== null;
  },

  // ── Multimedia ─────────────────────────────────────────────────────────────

  async deleteMultimedia(id: number, multimediaId: number): Promise<void> {
    await db.none(
      'DELETE FROM situacion_multimedia WHERE id = $1 AND situacion_id = $2',
      [multimediaId, id],
    );
  },

  // ── Promover ───────────────────────────────────────────────────────────────

  async promover(situacionId: number, data: {
    titulo?: string;
    tipo_emergencia_id?: any;
    importancia?: string;
    descripcion?: string;
  }, userId: number): Promise<any> {
    return db.tx(async (conn) => {
      const existente = await conn.oneOrNone(
        'SELECT id, persistente FROM situacion WHERE id = $1',
        [situacionId],
      );
      if (!existente) throw Object.assign(new Error('NOT_FOUND'), { status: 404 });
      if (existente.persistente) throw Object.assign(new Error('CONFLICT'), { status: 409 });

      const sets: string[] = [
        'persistente      = true',
        'promovido_por    = $1',
        `estado           = CASE WHEN estado = 'CERRADA' THEN 'ACTIVA' ELSE estado END`,
        'updated_at       = NOW()',
      ];
      const params: any[] = [userId];
      let i = 2;

      if (data.titulo)             { sets.push(`titulo            = $${i++}`); params.push(data.titulo); }
      if (data.tipo_emergencia_id) { sets.push(`tipo_situacion_id = $${i++}`); params.push(normalizeId(data.tipo_emergencia_id)); }
      if (data.importancia)        { sets.push(`importancia       = $${i++}`); params.push(data.importancia); }
      if (data.descripcion)        { sets.push(`descripcion       = $${i++}`); params.push(data.descripcion); }

      params.push(situacionId);
      await conn.none(
        `UPDATE situacion SET ${sets.join(', ')} WHERE id = $${i}`,
        params,
      );

      return conn.one(`${SELECT_PERSISTENTE} AND s.id = $1`, [situacionId]);
    });
  },
};
