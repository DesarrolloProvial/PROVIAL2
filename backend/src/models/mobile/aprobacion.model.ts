import { db } from '../../config/database';

export const AprobacionModel = {
  async verificarTripulacion(salidaId: number, usuarioId: number) {
    return db.oneOrNone<{ usuario_id: number; nombre_completo: string }>(`
      SELECT tt.usuario_id, u.nombre_completo
      FROM tripulacion_turno tt
      JOIN salida_unidad su ON su.asignacion_id = tt.asignacion_id
      JOIN usuario u ON u.id = tt.usuario_id
      WHERE su.id = $1 AND tt.usuario_id = $2
    `, [salidaId, usuarioId]);
  },

  async getAprobacionPendiente(salidaId: number, tipo: string) {
    return db.oneOrNone<{ id: number }>(`
      SELECT id FROM aprobacion_tripulacion
      WHERE salida_id = $1 AND tipo = $2 AND estado = 'PENDIENTE'
    `, [salidaId, tipo]);
  },

  async crear(salidaId: number, tipo: string, usuarioId: number, referenciaId?: number | null): Promise<number> {
    const row = await db.one<{ aprobacion_id: number }>(`
      SELECT crear_aprobacion_tripulacion($1, $2, $3, $4) AS aprobacion_id
    `, [salidaId, tipo, usuarioId, referenciaId ?? null]);
    return row.aprobacion_id;
  },

  async autoAprobar(aprobacionId: number, usuarioId: number): Promise<void> {
    await db.any(`SELECT responder_aprobacion($1, $2, 'APROBADO')`, [aprobacionId, usuarioId]);
  },

  async responder(
    aprobacionId: number,
    usuarioId: number,
    respuesta: string,
    motivo: string | null,
    latitud: number | null,
    longitud: number | null,
  ) {
    const row = await db.one<{ resultado: any }>(`
      SELECT responder_aprobacion($1, $2, $3, $4, $5, $6) AS resultado
    `, [aprobacionId, usuarioId, respuesta, motivo, latitud, longitud]);
    return row.resultado;
  },

  async getSalidaYTipo(aprobacionId: number) {
    return db.oneOrNone<{ salida_id: number; tipo: string }>(`
      SELECT salida_id, tipo FROM aprobacion_tripulacion WHERE id = $1
    `, [aprobacionId]);
  },

  async getMisPendientes(usuarioId: number) {
    return db.any(`
      SELECT * FROM v_mis_aprobaciones_pendientes
      WHERE usuario_id = $1
      ORDER BY fecha_inicio DESC
    `, [usuarioId]);
  },

  async getHistorial(limit: number, offset: number) {
    return db.any(`
      SELECT
        at.*,
        u.codigo AS unidad_codigo,
        ui.nombre_completo AS iniciado_por_nombre
      FROM aprobacion_tripulacion at
      LEFT JOIN unidad u ON u.id = at.unidad_id
      LEFT JOIN usuario ui ON ui.id = at.iniciado_por
      WHERE at.estado IN ('COMPLETADA', 'RECHAZADA', 'CANCELADA')
      ORDER BY at.updated_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
  },

  async getDetalle(aprobacionId: number) {
    return db.oneOrNone(`
      SELECT
        at.*,
        u.codigo AS unidad_codigo,
        u.tipo_unidad,
        ui.nombre_completo AS iniciado_por_nombre
      FROM aprobacion_tripulacion at
      LEFT JOIN unidad u ON u.id = at.unidad_id
      LEFT JOIN usuario ui ON ui.id = at.iniciado_por
      WHERE at.id = $1
    `, [aprobacionId]);
  },

  async getRespuestas(aprobacionId: number) {
    return db.any(`
      SELECT
        ar.*,
        u.nombre_completo,
        u.chapa
      FROM aprobacion_respuesta ar
      JOIN usuario u ON u.id = ar.usuario_id
      WHERE ar.aprobacion_id = $1
      ORDER BY ar.fecha_respuesta NULLS LAST
    `, [aprobacionId]);
  },

  async verificarPresencia(salidaId: number) {
    return db.oneOrNone(`
      SELECT
        at.id AS aprobacion_id,
        at.estado,
        at.fecha_inicio,
        at.fecha_completada,
        (
          SELECT COUNT(*) FROM aprobacion_respuesta ar
          WHERE ar.aprobacion_id = at.id AND ar.respuesta = 'APROBADO'
        ) AS confirmados,
        (
          SELECT COUNT(*) FROM aprobacion_respuesta ar
          WHERE ar.aprobacion_id = at.id
        ) AS total_tripulantes
      FROM aprobacion_tripulacion at
      WHERE at.salida_id = $1 AND at.tipo = 'CONFIRMAR_PRESENCIA'
      ORDER BY at.created_at DESC
      LIMIT 1
    `, [salidaId]);
  },

  async getAprobacionPendientePorIniciador(aprobacionId: number, usuarioId: number) {
    return db.oneOrNone<{ id: number }>(`
      SELECT id FROM aprobacion_tripulacion
      WHERE id = $1 AND iniciado_por = $2 AND estado = 'PENDIENTE'
    `, [aprobacionId, usuarioId]);
  },

  async cancelar(aprobacionId: number): Promise<void> {
    await db.none(`
      UPDATE aprobacion_tripulacion
      SET estado = 'CANCELADA', fecha_completada = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [aprobacionId]);
  },
};
