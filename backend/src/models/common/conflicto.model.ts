import { db } from '../../config/database';

export const ConflictoModel = {
  async getSituacionIdPorCodigo(codigoSituacion: string): Promise<number | null> {
    const row = await db.oneOrNone(
      `SELECT id FROM situacion WHERE codigo_situacion = $1`,
      [codigoSituacion]
    );
    return row?.id ?? null;
  },

  async getActivoUsuario(codigoSituacion: string, userId: number): Promise<any | null> {
    return db.oneOrNone(
      `SELECT id FROM situacion_conflicto
       WHERE codigo_situacion = $1 AND usuario_reporta = $2 AND estado = 'PENDIENTE'`,
      [codigoSituacion, userId]
    );
  },

  async actualizarDatos(id: number, datosLocales: any, datosServidor: any, diferencias: any[]): Promise<void> {
    await db.none(
      `UPDATE situacion_conflicto
       SET datos_locales = $1, datos_servidor = $2, diferencias = $3
       WHERE id = $4`,
      [datosLocales, datosServidor, diferencias, id]
    );
  },

  async crear(data: {
    codigo_situacion: string;
    situacion_existente_id: number | null;
    datos_locales: any;
    datos_servidor: any;
    diferencias: any[];
    usuario_reporta: number;
    tipo_conflicto: string;
  }): Promise<{ id: number }> {
    return db.one(
      `INSERT INTO situacion_conflicto (
         codigo_situacion, situacion_existente_id, datos_locales, datos_servidor,
         diferencias, usuario_reporta, tipo_conflicto, estado
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDIENTE')
       RETURNING id`,
      [data.codigo_situacion, data.situacion_existente_id, data.datos_locales,
        data.datos_servidor, data.diferencias, data.usuario_reporta, data.tipo_conflicto]
    );
  },

  async listar(estado?: string): Promise<any[]> {
    const condicion = estado ? `AND c.estado = $/estado/` : `AND c.estado = 'PENDIENTE'`;
    return db.any(
      `SELECT
         c.*,
         u.nombre_completo AS usuario_nombre,
         u.chapa           AS usuario_chapa,
         s.tipo_situacion  AS situacion_tipo,
         s.km              AS situacion_km,
         un.codigo         AS unidad_codigo
       FROM situacion_conflicto c
       LEFT JOIN usuario u  ON c.usuario_reporta = u.id
       LEFT JOIN situacion s ON c.situacion_existente_id = s.id
       LEFT JOIN unidad un  ON s.unidad_id = un.id
       WHERE 1=1 ${condicion}
       ORDER BY c.created_at DESC`,
      { estado }
    );
  },

  async getById(id: number): Promise<any | null> {
    return db.oneOrNone(
      `SELECT
         c.*,
         u.nombre_completo AS usuario_nombre,
         u.chapa           AS usuario_chapa,
         r.nombre_completo AS resuelto_por_nombre
       FROM situacion_conflicto c
       LEFT JOIN usuario u ON c.usuario_reporta = u.id
       LEFT JOIN usuario r ON c.resuelto_por = r.id
       WHERE c.id = $1`,
      [id]
    );
  },

  async getMisConflictos(userId: number): Promise<any[]> {
    return db.any(
      `SELECT id, codigo_situacion, tipo_conflicto, estado, decision_cop,
              notas_resolucion, created_at, resolved_at
       FROM situacion_conflicto
       WHERE usuario_reporta = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );
  },

  async resolver(data: {
    id: number;
    decision: string;
    notas_resolucion: string | null;
    resuelto_por: number;
    situacion_existente_id: number | null;
    datos_locales: any;
    usar_local: boolean;
  }): Promise<void> {
    await db.tx(async (t) => {
      if (data.usar_local && data.situacion_existente_id) {
        const d = data.datos_locales;
        await t.none(
          `UPDATE situacion SET
             km            = COALESCE($2, km),
             sentido       = COALESCE($3, sentido),
             descripcion   = COALESCE($4, descripcion),
             observaciones = COALESCE($5, observaciones),
             updated_at    = NOW(),
             actualizado_por = $6
           WHERE id = $1`,
          [data.situacion_existente_id, d.km, d.sentido, d.descripcion, d.observaciones, data.resuelto_por]
        );
      }
      await t.none(
        `UPDATE situacion_conflicto SET
           estado           = 'RESUELTO',
           decision_cop     = $1,
           notas_resolucion = $2,
           resuelto_por     = $3,
           resolved_at      = NOW()
         WHERE id = $4`,
        [data.decision, data.notas_resolucion, data.resuelto_por, data.id]
      );
    });
  },
};
