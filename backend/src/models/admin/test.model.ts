import { db } from '../../config/database';

export const TestModel = {
  async resetSalidaActiva(userId: number): Promise<{ finalized: boolean; salidaId?: number; message: string; unidad?: string }> {
    return db.tx(async t => {
      const asignacion = await t.oneOrNone(
        `SELECT bu.unidad_id, u.codigo as unidad_codigo
         FROM brigada_unidad bu
         JOIN unidad u ON bu.unidad_id = u.id
         WHERE bu.brigada_id = $1 AND bu.activo = true
         LIMIT 1`,
        [userId]
      );
      if (!asignacion) return { finalized: false, message: 'No tienes unidad asignada en brigada_unidad' };

      const salida = await t.oneOrNone(
        `SELECT id, km_inicial, combustible_inicial
         FROM salida_unidad
         WHERE unidad_id = $1 AND estado = 'EN_SALIDA'
         LIMIT 1`,
        [asignacion.unidad_id]
      );
      if (!salida) return { finalized: false, message: 'No hay salida activa para tu unidad' };

      await t.none(
        `UPDATE salida_unidad
         SET fecha_hora_regreso = NOW(), estado = 'FINALIZADA',
             km_final = $1, combustible_final = $2,
             observaciones_regreso = 'Finalizado automáticamente por Modo de Pruebas',
             finalizada_por = $3
         WHERE id = $4`,
        [salida.km_inicial, salida.combustible_inicial, userId, salida.id]
      );

      return { finalized: true, salidaId: salida.id, message: 'Salida activa finalizada correctamente', unidad: asignacion.unidad_codigo };
    });
  },

  async resetIngresosActivos(userId: number): Promise<{ deleted: boolean; count: number; message: string }> {
    return db.tx(async t => {
      const asignacion = await t.oneOrNone(
        'SELECT unidad_id FROM brigada_unidad WHERE brigada_id = $1 AND activo = true LIMIT 1',
        [userId]
      );
      if (!asignacion) return { deleted: false, count: 0, message: 'No tienes unidad asignada' };

      const deleted = await t.manyOrNone(
        'DELETE FROM ingreso_sede WHERE unidad_id = $1 AND fecha_hora_salida IS NULL RETURNING id',
        [asignacion.unidad_id]
      );

      return { deleted: deleted.length > 0, count: deleted.length, message: `${deleted.length} ingreso(s) eliminado(s) del backend` };
    });
  },

  async resetSituacionesHoy(userId: number): Promise<{ deleted: boolean; count: number; message: string }> {
    return db.tx(async t => {
      const asignacion = await t.oneOrNone(
        'SELECT unidad_id FROM brigada_unidad WHERE brigada_id = $1 AND activo = true LIMIT 1',
        [userId]
      );
      if (!asignacion) return { deleted: false, count: 0, message: 'No tienes unidad asignada' };

      const deleted = await t.manyOrNone(
        'DELETE FROM situacion WHERE unidad_id = $1 AND DATE(created_at) = CURRENT_DATE RETURNING id',
        [asignacion.unidad_id]
      );

      return { deleted: deleted.length > 0, count: deleted.length, message: `${deleted.length} situación(es) eliminada(s) del backend` };
    });
  },

  async resetTodoUsuario(userId: number): Promise<{ salida: boolean; salidaId: number | null; ingresos: number; situaciones: number; unidad: string | null; message?: string }> {
    return db.tx(async t => {
      const results = { salida: false, salidaId: null as number | null, ingresos: 0, situaciones: 0, unidad: null as string | null };

      const asignacion = await t.oneOrNone(
        `SELECT bu.unidad_id, u.codigo as unidad_codigo
         FROM brigada_unidad bu
         JOIN unidad u ON bu.unidad_id = u.id
         WHERE bu.brigada_id = $1 AND bu.activo = true
         LIMIT 1`,
        [userId]
      );
      if (!asignacion) return { ...results, message: 'No tienes unidad asignada' };

      results.unidad = asignacion.unidad_codigo;

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
           SET fecha_hora_regreso = NOW(), estado = 'FINALIZADA',
               km_final = $1, combustible_final = $2,
               observaciones_regreso = 'Finalizado automáticamente por Modo de Pruebas',
               finalizada_por = $3
           WHERE id = $4`,
          [salida.km_inicial, salida.combustible_inicial, userId, salida.id]
        );
        results.salida = true;
        results.salidaId = salida.id;
      }

      const deletedIngresos = await t.manyOrNone(
        'DELETE FROM ingreso_sede WHERE unidad_id = $1 AND fecha_hora_salida IS NULL RETURNING id',
        [asignacion.unidad_id]
      );
      results.ingresos = deletedIngresos.length;

      const deletedSituaciones = await t.manyOrNone(
        'DELETE FROM situacion WHERE unidad_id = $1 AND DATE(created_at) = CURRENT_DATE RETURNING id',
        [asignacion.unidad_id]
      );
      results.situaciones = deletedSituaciones.length;

      return results;
    });
  },
};
