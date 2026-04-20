import { db } from '../../config/database';

const SEDE_SELECT = `
  SELECT i.*, s.codigo AS sede_codigo, s.nombre AS sede_nombre
  FROM ingreso_sede i
  JOIN sede s ON i.sede_id = s.id
`;

export const IngresoModel = {
  async getById(id: number): Promise<any | null> {
    return db.oneOrNone(`${SEDE_SELECT} WHERE i.id = $1`, [id]);
  },

  async getByIdSimple(id: number): Promise<any | null> {
    return db.oneOrNone(
      `SELECT id, salida_unidad_id, es_ingreso_final FROM ingreso_sede WHERE id = $1`,
      [id]
    );
  },

  async getActivoEnSalida(salidaId: number): Promise<any | null> {
    return db.oneOrNone(
      `${SEDE_SELECT} WHERE i.salida_unidad_id = $1 AND i.fecha_hora_salida IS NULL LIMIT 1`,
      [salidaId]
    );
  },

  async getBySalida(salidaId: number): Promise<any[]> {
    return db.any(
      `${SEDE_SELECT} WHERE i.salida_unidad_id = $1 ORDER BY i.fecha_hora_ingreso ASC`,
      [salidaId]
    );
  },

  async getContextoFinalizacion(salidaId: number): Promise<any | null> {
    return db.oneOrNone(
      `SELECT
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
       LIMIT 1`,
      [salidaId]
    );
  },

  async registrar(data: {
    salida_id: number;
    sede_id: number;
    tipo_ingreso: string;
    km_ingreso: number | null;
    combustible_ingreso: number | null;
    observaciones: string | null;
    userId: number;
  }): Promise<any> {
    return db.tx(async (conn) => {
      const row = await conn.one(
        `INSERT INTO ingreso_sede (
           salida_unidad_id, sede_id, tipo_ingreso,
           km_ingreso, combustible_ingreso,
           observaciones_ingreso, es_ingreso_final, registrado_por
         ) VALUES ($1, $2, $3, $4, $5, $6, false, $7)
         RETURNING id`,
        [data.salida_id, data.sede_id, data.tipo_ingreso,
          data.km_ingreso, data.combustible_ingreso, data.observaciones, data.userId]
      );
      return conn.one(`${SEDE_SELECT} WHERE i.id = $1`, [row.id]);
    });
  },

  async finalizarJornada(data: {
    ingresoId: number;
    salidaId: number;
    kmVal: number | null;
    indicador: number | null;
    observaciones: string | null;
    userId: number;
  }): Promise<void> {
    await db.tx(async (conn) => {
      await conn.none(
        `UPDATE ingreso_sede
         SET es_ingreso_final    = true,
             km_ingreso          = COALESCE($2, km_ingreso),
             combustible_ingreso = COALESCE($3, combustible_ingreso),
             observaciones_ingreso = COALESCE($4, observaciones_ingreso)
         WHERE id = $1`,
        [data.ingresoId, data.kmVal, data.indicador, data.observaciones]
      );
      const result = await conn.one(
        `SELECT finalizar_jornada_completa($1, $2, $3, $4, $5) AS ok`,
        [data.salidaId, data.kmVal, data.indicador, data.observaciones, data.userId]
      );
      if (!result.ok) throw new Error('finalizar_jornada_completa retornó false');
    });
  },

  async registrarSalida(id: number, data: {
    km_salida: number | null;
    indicador: number | null;
    observaciones: string | null;
  }): Promise<any> {
    return db.one(
      `UPDATE ingreso_sede
       SET fecha_hora_salida        = NOW(),
           km_salida_nueva          = $2,
           combustible_salida_nueva = $3,
           observaciones_salida     = $4
       WHERE id = $1
       RETURNING *,
         (SELECT codigo FROM sede WHERE id = sede_id) AS sede_codigo,
         (SELECT nombre FROM sede WHERE id = sede_id) AS sede_nombre`,
      [id, data.km_salida, data.indicador, data.observaciones]
    );
  },

  async editar(id: number, data: {
    km_ingreso?: number | null;
    combustible?: number | null;
    observaciones_ingreso?: string;
  }): Promise<any> {
    const sets: string[] = [];
    const params: Record<string, unknown> = { id };

    if (data.km_ingreso !== undefined) {
      sets.push('km_ingreso = $/km_ingreso/');
      params.km_ingreso = data.km_ingreso;
    }
    if (data.combustible !== undefined) {
      sets.push('combustible_ingreso = $/combustible/');
      params.combustible = data.combustible;
    }
    if (data.observaciones_ingreso !== undefined) {
      sets.push('observaciones_ingreso = $/observaciones_ingreso/');
      params.observaciones_ingreso = data.observaciones_ingreso;
    }

    return db.one(
      `UPDATE ingreso_sede SET ${sets.join(', ')} WHERE id = $/id/ RETURNING *`,
      params
    );
  },
};
