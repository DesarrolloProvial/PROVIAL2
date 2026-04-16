import { db } from '../config/database';

// ========================================
// INTERFACES
// ========================================

export type TipoMovimiento =
  | 'CAMBIO_UNIDAD'
  | 'PRESTAMO'
  | 'DIVISION_FUERZA'
  | 'RELEVO'
  | 'RETIRO'
  | 'APOYO_TEMPORAL';

export interface MovimientoBrigada {
  id: number;
  usuario_id: number;
  origen_asignacion_id: number | null;
  destino_asignacion_id: number | null;
  tipo_movimiento: TipoMovimiento;
  hora_inicio: Date;
  hora_fin: Date | null;
  motivo: string | null;
  aprobado_por: number | null;
  observaciones: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface HistorialMovimiento {
  movimiento_id: number;
  usuario_id: number;
  usuario_nombre: string;
  tipo_movimiento: TipoMovimiento;
  origen_unidad_codigo: string | null;
  origen_unidad_tipo: string | null;
  destino_unidad_codigo: string | null;
  destino_unidad_tipo: string | null;
  hora_inicio: Date;
  hora_fin: Date | null;
  duracion_horas: number | null;
  motivo: string | null;
  aprobado_por_nombre: string | null;
}

export interface ComposicionUnidad {
  asignacion_id: number;
  unidad_id: number;
  unidad_codigo: string;
  tipo_unidad: string;
  usuario_id: number;
  usuario_nombre: string;
  es_piloto: boolean;
  tiene_movimiento_activo: boolean;
  movimiento_tipo: TipoMovimiento | null;
  movimiento_origen: string | null;
}

// ========================================
// MODEL
// ========================================

export const MovimientoModel = {
  /**
   * Crear un nuevo movimiento
   */
  async create(data: {
    usuario_id: number;
    origen_asignacion_id?: number;
    destino_asignacion_id?: number;
    tipo_movimiento: TipoMovimiento;
    motivo?: string;
    aprobado_por?: number;
    observaciones?: string;
  }): Promise<MovimientoBrigada> {
    const query = `
      INSERT INTO movimiento_brigada (
        usuario_id, origen_asignacion_id, destino_asignacion_id,
        tipo_movimiento, motivo, aprobado_por, observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    return db.one(query, [
      data.usuario_id,
      data.origen_asignacion_id || null,
      data.destino_asignacion_id || null,
      data.tipo_movimiento,
      data.motivo || null,
      data.aprobado_por || null,
      data.observaciones || null,
    ]);
  },

  /**
   * Obtener movimiento por ID
   */
  async getById(id: number): Promise<MovimientoBrigada | null> {
    return db.oneOrNone('SELECT * FROM movimiento_brigada WHERE id = $1', [id]);
  },

  /**
   * Finalizar un movimiento (hora_fin = NOW)
   */
  async finalizar(id: number, observaciones_finales?: string): Promise<MovimientoBrigada> {
    const query = `
      UPDATE movimiento_brigada
      SET
        hora_fin = NOW(),
        observaciones = COALESCE($1, observaciones),
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    return db.one(query, [observaciones_finales || null, id]);
  },

  /**
   * Obtener movimientos activos de un usuario
   */
  async getActivos(usuario_id: number): Promise<MovimientoBrigada[]> {
    const query = `
      SELECT * FROM movimiento_brigada
      WHERE usuario_id = $1
        AND hora_fin IS NULL
      ORDER BY hora_inicio DESC
    `;

    return db.manyOrNone(query, [usuario_id]);
  },

  /**
   * Obtener historial de movimientos (vista completa)
   */
  async getHistorial(filters?: {
    usuario_id?: number;
    tipo_movimiento?: TipoMovimiento;
    fecha_desde?: Date;
    fecha_hasta?: Date;
    solo_activos?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<HistorialMovimiento[]> {
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (filters?.usuario_id) {
      whereConditions.push(`usuario_id = $${paramIndex++}`);
      params.push(filters.usuario_id);
    }

    if (filters?.tipo_movimiento) {
      whereConditions.push(`tipo_movimiento = $${paramIndex++}`);
      params.push(filters.tipo_movimiento);
    }

    if (filters?.fecha_desde) {
      whereConditions.push(`hora_inicio >= $${paramIndex++}`);
      params.push(filters.fecha_desde);
    }

    if (filters?.fecha_hasta) {
      whereConditions.push(`hora_inicio <= $${paramIndex++}`);
      params.push(filters.fecha_hasta);
    }

    if (filters?.solo_activos) {
      whereConditions.push('hora_fin IS NULL');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    const query = `
      SELECT * FROM v_historial_movimientos
      ${whereClause}
      ORDER BY hora_inicio DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);

    return db.manyOrNone(query, params);
  },

  /**
   * Obtener composición actual de todas las unidades
   */
  async getComposicionUnidades(): Promise<ComposicionUnidad[]> {
    return db.manyOrNone('SELECT * FROM v_composicion_unidades_ahora ORDER BY unidad_codigo, es_piloto DESC');
  },

  /**
   * Obtener composición de una unidad específica
   */
  async getComposicionUnidad(unidad_id: number): Promise<ComposicionUnidad[]> {
    const query = `
      SELECT * FROM v_composicion_unidades_ahora
      WHERE unidad_id = $1
      ORDER BY es_piloto DESC
    `;

    return db.manyOrNone(query, [unidad_id]);
  },

  /**
   * Actualizar movimiento
   */
  async update(
    id: number,
    data: {
      motivo?: string;
      observaciones?: string;
      aprobado_por?: number;
    }
  ): Promise<MovimientoBrigada> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.motivo !== undefined) {
      setClauses.push(`motivo = $${paramIndex++}`);
      params.push(data.motivo);
    }

    if (data.observaciones !== undefined) {
      setClauses.push(`observaciones = $${paramIndex++}`);
      params.push(data.observaciones);
    }

    if (data.aprobado_por !== undefined) {
      setClauses.push(`aprobado_por = $${paramIndex++}`);
      params.push(data.aprobado_por);
    }

    params.push(id);

    const query = `
      UPDATE movimiento_brigada
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    return db.one(query, params);
  },

  /**
   * Eliminar movimiento (solo si no ha sido finalizado)
   */
  async delete(id: number): Promise<void> {
    await db.none('DELETE FROM movimiento_brigada WHERE id = $1 AND hora_fin IS NULL', [id]);
  },

  /**
   * Verificar si un usuario tiene movimientos activos
   */
  async tieneMovimientosActivos(usuario_id: number): Promise<boolean> {
    const result = await db.oneOrNone(
      'SELECT COUNT(*) as count FROM movimiento_brigada WHERE usuario_id = $1 AND hora_fin IS NULL',
      [usuario_id]
    );
    return result ? parseInt(result.count) > 0 : false;
  },
};
