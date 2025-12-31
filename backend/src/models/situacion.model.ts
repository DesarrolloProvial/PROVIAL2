import { db } from '../config/database';

// ========================================
// INTERFACES
// ========================================

export type TipoSituacion =
  | 'SALIDA_SEDE'
  | 'PATRULLAJE'
  | 'CAMBIO_RUTA'
  | 'PARADA_ESTRATEGICA'
  | 'COMIDA'
  | 'DESCANSO'
  | 'INCIDENTE'
  | 'REGULACION_TRAFICO'
  | 'ASISTENCIA_VEHICULAR'
  | 'OTROS';

export type EstadoSituacion = 'ACTIVA' | 'CERRADA' | 'CANCELADA';

export type TipoDetalle =
  | 'VEHICULO'
  | 'AUTORIDAD'
  | 'RECURSO'
  | 'VICTIMA'
  | 'GRUA'
  | 'ASEGURADORA'
  | 'AJUSTADOR'
  | 'TESTIGO'
  | 'EVIDENCIA'
  | 'OBSTRUCCION'
  | 'AUTORIDADES_SOCORRO'
  | 'DANIOS'
  | 'SUBTIPO'
  | 'OTROS';

export interface Situacion {
  id: number;
  uuid: string;
  numero_situacion: string | null;
  tipo_situacion: TipoSituacion;
  estado: EstadoSituacion;
  asignacion_id: number | null;
  unidad_id: number;
  turno_id: number | null;
  ruta_id: number | null;
  km: number | null;
  sentido: string | null;
  latitud: number | null;
  longitud: number | null;
  ubicacion_manual: boolean;
  combustible: number | null;
  combustible_fraccion: string | null;
  kilometraje_unidad: number | null;
  tripulacion_confirmada: any | null;
  descripcion: string | null;
  observaciones: string | null;
  incidente_id: number | null;
  creado_por: number;
  actualizado_por: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface SituacionCompleta extends Situacion {
  ruta_codigo: string | null;
  ruta_nombre: string | null;
  unidad_codigo: string;
  tipo_unidad: string;
  turno_fecha: string | null;
  incidente_numero: string | null;
  creado_por_nombre: string;
  actualizado_por_nombre: string | null;
  detalles?: DetalleSituacion[];
}

export interface DetalleSituacion {
  id: number;
  situacion_id: number;
  tipo_detalle: TipoDetalle;
  datos: any;
  creado_por: number;
  created_at: Date;
  updated_at: Date;
}

export interface UltimaSituacionUnidad {
  unidad_id: number;
  unidad_codigo: string;
  tipo_unidad: string;
  situacion_id: number;
  situacion_uuid: string;
  tipo_situacion: TipoSituacion;
  estado: EstadoSituacion;
  ruta_id: number | null;
  ruta_codigo: string | null;
  ruta_nombre: string | null;
  km: number | null;
  sentido: string | null;
  latitud: number | null;
  longitud: number | null;
  descripcion: string | null;
  situacion_fecha: Date;
  turno_id: number | null;
  turno_fecha: string | null;
}

// ========================================
// MODEL
// ========================================

export const SituacionModel = {
  /**
   * Crear una nueva situación
   */
  async create(data: {
    tipo_situacion: TipoSituacion;
    unidad_id: number;
    salida_unidad_id?: number;
    turno_id?: number;
    asignacion_id?: number;
    ruta_id?: number;
    km?: number;
    sentido?: string;
    latitud?: number;
    longitud?: number;
    ubicacion_manual?: boolean;
    combustible?: number;
    combustible_fraccion?: string;
    kilometraje_unidad?: number;
    tripulacion_confirmada?: any;
    descripcion?: string;
    observaciones?: string;
    incidente_id?: number;
    creado_por: number;
  }): Promise<Situacion> {
    const query = `
      INSERT INTO situacion (
        tipo_situacion, unidad_id, salida_unidad_id, turno_id, asignacion_id,
        ruta_id, km, sentido, latitud, longitud, ubicacion_manual,
        combustible, combustible_fraccion, kilometraje_unidad, tripulacion_confirmada,
        descripcion, observaciones, incidente_id, creado_por
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      ) RETURNING *
    `;

    return db.one(query, [
      data.tipo_situacion,
      data.unidad_id,
      data.salida_unidad_id || null,
      data.turno_id || null,
      data.asignacion_id || null,
      data.ruta_id || null,
      data.km || null,
      data.sentido || null,
      data.latitud || null,
      data.longitud || null,
      data.ubicacion_manual || false,
      data.combustible || null,
      data.combustible_fraccion || null,
      data.kilometraje_unidad || null,
      data.tripulacion_confirmada || null,
      data.descripcion || null,
      data.observaciones || null,
      data.incidente_id || null,
      data.creado_por,
    ]);
  },

  /**
   * Obtener situación por ID (vista completa)
   */
  async getById(id: number): Promise<SituacionCompleta | null> {
    return db.oneOrNone('SELECT * FROM v_situaciones_completas WHERE id = $1', [id]);
  },

  /**
   * Obtener situación por UUID
   */
  async getByUuid(uuid: string): Promise<SituacionCompleta | null> {
    return db.oneOrNone('SELECT * FROM v_situaciones_completas WHERE uuid = $1', [uuid]);
  },

  /**
   * Listar situaciones con filtros
   */
  async list(filters?: {
    unidad_id?: number;
    turno_id?: number;
    tipo_situacion?: TipoSituacion;
    estado?: EstadoSituacion;
    fecha_desde?: Date;
    fecha_hasta?: Date;
    limit?: number;
    offset?: number;
  }): Promise<SituacionCompleta[]> {
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (filters?.unidad_id) {
      whereConditions.push(`unidad_id = $${paramIndex++}`);
      params.push(filters.unidad_id);
    }

    if (filters?.turno_id) {
      whereConditions.push(`turno_id = $${paramIndex++}`);
      params.push(filters.turno_id);
    }

    if (filters?.tipo_situacion) {
      whereConditions.push(`tipo_situacion = $${paramIndex++}`);
      params.push(filters.tipo_situacion);
    }

    if (filters?.estado) {
      whereConditions.push(`estado = $${paramIndex++}`);
      params.push(filters.estado);
    }

    if (filters?.fecha_desde) {
      whereConditions.push(`created_at >= $${paramIndex++}`);
      params.push(filters.fecha_desde);
    }

    if (filters?.fecha_hasta) {
      whereConditions.push(`created_at <= $${paramIndex++}`);
      params.push(filters.fecha_hasta);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    const query = `
      SELECT * FROM v_situaciones_completas
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);

    return db.manyOrNone(query, params);
  },

  /**
   * Obtener situaciones activas
   */
  async getActivas(filters?: {
    unidad_id?: number;
    turno_id?: number;
  }): Promise<SituacionCompleta[]> {
    let whereConditions: string[] = ["s.estado = 'ACTIVA'", "sal.estado = 'EN_SALIDA'"];
    let params: any[] = [];
    let paramIndex = 1;

    if (filters?.unidad_id) {
      whereConditions.push(`s.unidad_id = $${paramIndex++}`);
      params.push(filters.unidad_id);
    }

    if (filters?.turno_id) {
      whereConditions.push(`s.turno_id = $${paramIndex++}`);
      params.push(filters.turno_id);
    }

    // Filtros de fecha (opcional, por si acaso)
    // ...

    const query = `
      SELECT s.*
      FROM v_situaciones_completas s
      JOIN salida_unidad sal ON s.salida_unidad_id = sal.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY s.created_at DESC
    `;

    return db.manyOrNone(query, params);
  },

  /**
   * Obtener situaciones de mi unidad hoy (para app móvil)
   * Filtra por salida activa si existe, sino por fecha
   */
  async getMiUnidadHoy(unidad_id: number, salida_id?: number): Promise<SituacionCompleta[]> {
    // Si hay salida activa, filtrar por ella
    if (salida_id) {
      const query = `
        SELECT * FROM v_situaciones_completas
        WHERE salida_unidad_id = $1
        ORDER BY created_at DESC
      `;
      return db.manyOrNone(query, [salida_id]);
    }

    // Si no hay salida activa, mostrar situaciones de hoy de la unidad
    const query = `
      SELECT * FROM v_situaciones_completas
      WHERE unidad_id = $1
        AND DATE(created_at) = CURRENT_DATE
        AND salida_unidad_id IS NOT NULL
      ORDER BY created_at DESC
    `;

    return db.manyOrNone(query, [unidad_id]);
  },

  /**
   * Obtener bitácora completa de una unidad con tripulación y datos de salida
   */
  async getBitacoraUnidad(unidad_id: number, filters?: {
    fecha_desde?: Date;
    fecha_hasta?: Date;
    limit?: number;
  }): Promise<any[]> {
    const limit = filters?.limit || 100;

    // Query con tripulación y datos de salida
    const query = `
      WITH situaciones_base AS (
        SELECT
          vsc.*,
          sal.id as salida_id,
          sal.fecha_hora_salida,
          sal.km_inicial as salida_km_inicial,
          sal.combustible_inicial as salida_combustible_inicial,
          sal_ruta.codigo as salida_ruta_codigo
        FROM v_situaciones_completas vsc
        LEFT JOIN salida_unidad sal ON vsc.salida_unidad_id = sal.id
        LEFT JOIN ruta sal_ruta ON sal.ruta_inicial_id = sal_ruta.id
        WHERE vsc.unidad_id = $1
        ORDER BY vsc.created_at DESC
        LIMIT $2
      ),
      tripulacion_data AS (
        SELECT
          tt.asignacion_id,
          json_agg(
            json_build_object(
              'usuario_id', u.id,
              'nombre_completo', u.nombre_completo,
              'rol_tripulacion', tt.rol_tripulacion
            ) ORDER BY tt.rol_tripulacion
          ) as tripulacion
        FROM tripulacion_turno tt
        JOIN usuario u ON tt.usuario_id = u.id
        WHERE tt.asignacion_id IN (SELECT DISTINCT asignacion_id FROM situaciones_base WHERE asignacion_id IS NOT NULL)
        GROUP BY tt.asignacion_id
      )
      SELECT
        sb.*,
        COALESCE(td.tripulacion, '[]'::json) as tripulacion
      FROM situaciones_base sb
      LEFT JOIN tripulacion_data td ON sb.asignacion_id = td.asignacion_id
      ORDER BY sb.created_at DESC
    `;

    return db.manyOrNone(query, [unidad_id, limit]);
  },

  /**
   * Obtener última situación activa por unidad (para mapa)
   */
  async getUltimaSituacionPorUnidad(): Promise<UltimaSituacionUnidad[]> {
    return db.manyOrNone('SELECT * FROM v_ultima_situacion_unidad ORDER BY unidad_codigo');
  },

  /**
   * Actualizar situación
   */
  async update(
    id: number,
    data: {
      tipo_situacion?: TipoSituacion;
      estado?: EstadoSituacion;
      ruta_id?: number;
      km?: number;
      sentido?: string;
      latitud?: number;
      longitud?: number;
      combustible?: number;
      combustible_fraccion?: string;
      kilometraje_unidad?: number;
      descripcion?: string;
      observaciones?: string;
      actualizado_por: number;
    }
  ): Promise<Situacion> {
    const setClauses: string[] = ['actualizado_por = $1', 'updated_at = NOW()'];
    const params: any[] = [data.actualizado_por];
    let paramIndex = 2;

    if (data.tipo_situacion !== undefined) {
      setClauses.push(`tipo_situacion = $${paramIndex++}`);
      params.push(data.tipo_situacion);
    }

    if (data.estado !== undefined) {
      setClauses.push(`estado = $${paramIndex++}`);
      params.push(data.estado);
    }

    if (data.ruta_id !== undefined) {
      setClauses.push(`ruta_id = $${paramIndex++}`);
      params.push(data.ruta_id);
    }

    if (data.km !== undefined) {
      setClauses.push(`km = $${paramIndex++}`);
      params.push(data.km);
    }

    if (data.sentido !== undefined) {
      setClauses.push(`sentido = $${paramIndex++}`);
      params.push(data.sentido);
    }

    if (data.latitud !== undefined) {
      setClauses.push(`latitud = $${paramIndex++}`);
      params.push(data.latitud);
    }

    if (data.longitud !== undefined) {
      setClauses.push(`longitud = $${paramIndex++}`);
      params.push(data.longitud);
    }

    if (data.combustible !== undefined) {
      setClauses.push(`combustible = $${paramIndex++}`);
      params.push(data.combustible);
    }

    if (data.combustible_fraccion !== undefined) {
      setClauses.push(`combustible_fraccion = $${paramIndex++}`);
      params.push(data.combustible_fraccion);
    }

    if (data.kilometraje_unidad !== undefined) {
      setClauses.push(`kilometraje_unidad = $${paramIndex++}`);
      params.push(data.kilometraje_unidad);
    }

    if (data.descripcion !== undefined) {
      setClauses.push(`descripcion = $${paramIndex++}`);
      params.push(data.descripcion);
    }

    if (data.observaciones !== undefined) {
      setClauses.push(`observaciones = $${paramIndex++}`);
      params.push(data.observaciones);
    }

    const query = `
      UPDATE situacion
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    params.push(id);

    return db.one(query, params);
  },

  /**
   * Cerrar situación
   */
  async cerrar(id: number, actualizado_por: number, observaciones_finales?: string): Promise<Situacion> {
    const query = `
      UPDATE situacion
      SET
        estado = 'CERRADA',
        observaciones = COALESCE($1, observaciones),
        actualizado_por = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    return db.one(query, [observaciones_finales || null, actualizado_por, id]);
  },

  /**
   * Cancelar situación
   */
  async cancelar(id: number, actualizado_por: number, motivo?: string): Promise<Situacion> {
    const query = `
      UPDATE situacion
      SET
        estado = 'CANCELADA',
        observaciones = COALESCE($1, observaciones),
        actualizado_por = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    return db.one(query, [motivo || null, actualizado_por, id]);
  },

  /**
   * Eliminar situación (solo ADMIN)
   */
  async delete(id: number): Promise<void> {
    await db.none('DELETE FROM situacion WHERE id = $1', [id]);
  },
};

// ========================================
// DETALLE SITUACION MODEL
// ========================================

export const DetalleSituacionModel = {
  /**
   * Crear detalle de situación
   */
  async create(data: {
    situacion_id: number;
    tipo_detalle: TipoDetalle;
    datos: any;
    creado_por: number;
  }): Promise<DetalleSituacion> {
    const query = `
      INSERT INTO detalle_situacion (situacion_id, tipo_detalle, datos, creado_por)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    return db.one(query, [data.situacion_id, data.tipo_detalle, data.datos, data.creado_por]);
  },

  /**
   * Listar detalles de una situación
   */
  async getBySituacionId(situacion_id: number): Promise<DetalleSituacion[]> {
    return db.manyOrNone('SELECT * FROM detalle_situacion WHERE situacion_id = $1 ORDER BY created_at ASC', [
      situacion_id,
    ]);
  },

  /**
   * Obtener detalle por ID
   */
  async getById(id: number): Promise<DetalleSituacion | null> {
    return db.oneOrNone('SELECT * FROM detalle_situacion WHERE id = $1', [id]);
  },

  /**
   * Actualizar detalle
   */
  async update(id: number, datos: any): Promise<DetalleSituacion> {
    const query = `
      UPDATE detalle_situacion
      SET datos = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    return db.one(query, [datos, id]);
  },

  /**
   * Eliminar detalle
   */
  async delete(id: number): Promise<void> {
    await db.none('DELETE FROM detalle_situacion WHERE id = $1', [id]);
  },
};
