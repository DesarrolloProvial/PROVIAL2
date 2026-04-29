import { db } from '../../config/database';

export const AsignacionTransporteModel = {
  /**
   * Obtiene las asignaciones (borradores) de patrulla que aún no tienen unidad asignada,
   * filtrando opcionalmente por sede (para los usuarios TRANSPORTES normales).
   */
  async getBorradoresPendientes(sedeId?: number) {
    const query = `
      SELECT
        au.id,
        au.turno_id,
        au.tipo_asignacion,
        t.fecha       AS fecha_turno,
        t.estado      AS estado_turno,
        s.codigo      AS sede_codigo,
        s.nombre      AS sede_nombre,
        r.codigo      AS ruta_codigo,
        r.nombre      AS ruta_nombre,
        au.km_inicio,
        au.km_final,
        au.sentido,
        au.hora_salida,
        au.acciones,
        au.acciones_formato,
        au.estado_nomina,
        (
          SELECT json_agg(
            json_build_object(
              'usuario_id',    tt.usuario_id,
              'rol',           tt.rol_tripulacion,
              'nombre',        u.nombre_completo,
              'chapa',         u.chapa,
              'es_comandante', tt.es_comandante
            ) ORDER BY tt.es_comandante DESC, tt.rol_tripulacion
          )
          FROM tripulacion_turno tt
          JOIN usuario u ON tt.usuario_id = u.id
          WHERE tt.asignacion_id = au.id
        ) AS tripulacion
      FROM asignacion_unidad au
      JOIN turno t  ON au.turno_id  = t.id
      JOIN sede s   ON t.sede_id    = s.id
      LEFT JOIN ruta r ON au.ruta_id = r.id
      WHERE au.tipo_asignacion IN ('PATRULLA', 'GARITA')
        AND au.unidad_id IS NULL
        AND t.estado != 'CERRADO'
        ${sedeId ? 'AND t.sede_id = $1' : ''}
      ORDER BY t.fecha ASC, au.hora_salida ASC NULLS LAST
    `;

    return db.any(query, sedeId ? [sedeId] : []);
  },

  /**
   * Obtiene la flota disponible para asignar.
   * Filtra las unidades activas y marcadas como disponibles por transportes,
   * que NO estén actualmente en el taller.
   */
  async getUnidadesDisponibles(sedeId?: number) {
    const query = `
      SELECT 
        u.id,
        u.codigo,
        u.tipo_unidad,
        u.activa,
        u.placa,
        u.disponible_transportes,
        s.nombre as sede_nombre
      FROM unidad u
      JOIN sede s ON u.sede_id = s.id
      WHERE u.activa = true
        AND u.disponible_transportes = true
        AND NOT EXISTS (
          SELECT 1 FROM unidad_reparacion ur
          WHERE ur.unidad_id = u.id AND ur.fecha_fin IS NULL
        )
        ${sedeId ? 'AND u.sede_id = $1' : ''}
      ORDER BY u.codigo ASC
    `;

    return db.any(query, sedeId ? [sedeId] : []);
  },

  /**
   * Inyecta la unidad oficial en el borrador de asignación.
   * Valida preventivamente que la unidad sea funcional (no esté en taller/no disponible)
   * y que no tenga conflictos de fecha con OTRA asignación de patrulla el mismo día.
   */
  async asignarUnidad(asignacionId: number, unidadId: number) {
    return db.tx(async t => {
      const asignacion = await t.oneOrNone(`
        SELECT au.turno_id, t.fecha, au.unidad_id
        FROM asignacion_unidad au
        JOIN turno t ON au.turno_id = t.id
        WHERE au.id = $1
      `, [asignacionId]);

      if (!asignacion) throw new Error('ASIGNACION_NO_ENCONTRADA');

      const unidadOK = await t.oneOrNone(`
        SELECT id
        FROM unidad u
        WHERE id = $1
          AND activa = true
          AND disponible_transportes = true
          AND NOT EXISTS (
            SELECT 1 FROM unidad_reparacion ur
            WHERE ur.unidad_id = u.id AND ur.fecha_fin IS NULL
          )
      `, [unidadId]);

      if (!unidadOK) throw new Error('UNIDAD_NO_DISPONIBLE_O_EN_TALLER');

      const conflicto = await t.oneOrNone(`
        SELECT au.id
        FROM asignacion_unidad au
        JOIN turno t ON au.turno_id = t.id
        WHERE au.unidad_id = $1
          AND t.fecha = $2
          AND au.id != $3
          AND t.estado IN ('PLANIFICADO', 'ACTIVO')
        LIMIT 1
      `, [unidadId, asignacion.fecha, asignacionId]);

      if (conflicto) throw new Error('UNIDAD_YA_ASIGNADA_EN_ESTA_FECHA');

      await t.none(`
        UPDATE asignacion_unidad
        SET unidad_id = $2,
            updated_at = NOW()
        WHERE id = $1
      `, [asignacionId, unidadId]);

      return true;
    });
  }
};
