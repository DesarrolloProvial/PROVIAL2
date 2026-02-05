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
  | 'EMERGENCIA'
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
  codigo_situacion: string; // ID Determinista
  tipo_situacion: TipoSituacion;
  tipo_situacion_id?: number | null;
  estado: EstadoSituacion;

  // Relaciones
  unidad_id?: number | null;
  salida_unidad_id?: number | null;
  turno_id?: number | null;
  asignacion_id?: number | null;
  ruta_id?: number | null;

  // Ubicación
  km?: number | null;
  sentido?: string | null;
  latitud?: number | null;
  longitud?: number | null;

  // Observaciones
  observaciones?: string | null;

  // Contexto
  clima?: string | null;
  carga_vehicular?: string | null;
  departamento_id?: number | null;
  municipio_id?: number | null;
  obstruccion_data?: any | null;

  // Campos adicionales
  origen?: string;
  area?: string | null;

  fecha_hora_aviso?: Date | null;
  fecha_hora_llegada?: Date | null;
  fecha_hora_finalizacion?: Date | null;

  // Víctimas (consolidado)
  heridos?: number;
  fallecidos?: number;

  tipo_pavimento?: string | null;
  iluminacion?: string | null;
  senalizacion?: string | null;
  visibilidad?: string | null;

  causa_probable?: string | null;
  causa_especificar?: string | null;

  danios_materiales?: boolean;
  danios_infraestructura?: boolean;
  danios_descripcion?: string | null;

  created_at: Date;
  updated_at: Date;
  creado_por: number;
  actualizado_por?: number | null;
}

export interface SituacionCompleta extends Situacion {
  unidad_codigo?: string;
  ruta_nombre?: string;
  ruta_codigo?: string;
  sede_id?: number;
  sede_nombre?: string;
  creado_por_nombre?: string;
  actualizado_por_nombre?: string;
  departamento_nombre?: string | null;
  municipio_nombre?: string | null;
  // Campos del catálogo tipo_situacion_catalogo
  tipo_situacion_nombre?: string | null;
  tipo_situacion_categoria?: string | null;
}

export interface DetalleSituacion {
  id: number;
  situacion_id: number;
  tipo_detalle: TipoDetalle;
  datos: any;
  created_at: Date;
  updated_at: Date;
  creado_por: number;
}

// ========================================
// SITUACION MODEL
// ========================================

export const SituacionModel = {
  /**
   * Buscar situación por ID Determinista (codigo_situacion)
   */
  async findByCodigoSituacion(codigo: string): Promise<Situacion | null> {
    return db.oneOrNone('SELECT * FROM situacion WHERE codigo_situacion = $1', [codigo]);
  },

  /**
   * Obtener por ID
   */
  async getById(id: number): Promise<SituacionCompleta | null> {
    const query = `
      SELECT s.*,
        u.codigo as unidad_codigo,
        r.nombre as ruta_nombre, r.codigo as ruta_codigo,
        u.sede_id, se.nombre as sede_nombre,
        us1.nombre_completo as creado_por_nombre,
        us2.nombre_completo as actualizado_por_nombre,
        d.nombre as departamento_nombre,
        m.nombre as municipio_nombre
      FROM situacion s
      LEFT JOIN unidad u ON s.unidad_id = u.id
      LEFT JOIN ruta r ON s.ruta_id = r.id
      LEFT JOIN sede se ON u.sede_id = se.id
      LEFT JOIN usuario us1 ON s.creado_por = us1.id
      LEFT JOIN usuario us2 ON s.actualizado_por = us2.id
      LEFT JOIN departamento d ON s.departamento_id = d.id
      LEFT JOIN municipio m ON s.municipio_id = m.id
      WHERE s.id = $1
    `;
    return db.oneOrNone(query, [id]);
  },

  /**
   * Crear nueva situación
   */
  async create(data: Partial<Situacion>): Promise<Situacion> {
    const qInsert = `
      INSERT INTO situacion (
        tipo_situacion, unidad_id, salida_unidad_id, turno_id, asignacion_id,
        ruta_id, km, sentido, latitud, longitud,
        observaciones, creado_por, tipo_situacion_id,
        clima, carga_vehicular, departamento_id, municipio_id, codigo_situacion, obstruccion_data,
        origen, area,
        fecha_hora_aviso, fecha_hora_llegada,
        heridos, fallecidos,
        tipo_pavimento, iluminacion, senalizacion, visibilidad,
        causa_probable, causa_especificar,
        danios_materiales, danios_infraestructura, danios_descripcion
      ) VALUES (
        $/tipo_situacion/, $/unidad_id/, $/salida_unidad_id/, $/turno_id/, $/asignacion_id/,
        $/ruta_id/, $/km/, $/sentido/, $/latitud/, $/longitud/,
        $/observaciones/, $/creado_por/, $/tipo_situacion_id/,
        $/clima/, $/carga_vehicular/, $/departamento_id/, $/municipio_id/, $/codigo_situacion/, $/obstruccion_data/,
        $/origen/, $/area/,
        $/fecha_hora_aviso/, $/fecha_hora_llegada/,
        $/heridos/, $/fallecidos/,
        $/tipo_pavimento/, $/iluminacion/, $/senalizacion/, $/visibilidad/,
        $/causa_probable/, $/causa_especificar/,
        $/danios_materiales/, $/danios_infraestructura/, $/danios_descripcion/
      ) RETURNING *
    `;

    const params = {
      // Campos principales
      tipo_situacion: data.tipo_situacion,
      creado_por: data.creado_por,
      codigo_situacion: data.codigo_situacion || null,

      // Relaciones
      unidad_id: data.unidad_id ?? null,
      salida_unidad_id: data.salida_unidad_id ?? null,
      turno_id: data.turno_id ?? null,
      asignacion_id: data.asignacion_id ?? null,
      ruta_id: data.ruta_id ?? null,
      tipo_situacion_id: data.tipo_situacion_id ?? null,

      // Ubicación
      km: data.km ?? null,
      sentido: data.sentido ?? null,
      latitud: data.latitud ?? null,
      longitud: data.longitud ?? null,

      // Observaciones
      observaciones: data.observaciones ?? null,

      // Contexto
      clima: data.clima ?? null,
      carga_vehicular: data.carga_vehicular ?? null,
      departamento_id: data.departamento_id ?? null,
      municipio_id: data.municipio_id ?? null,
      obstruccion_data: data.obstruccion_data ?? null,

      // Campos adicionales
      origen: data.origen || 'BRIGADA',
      area: data.area ?? null,

      // Fechas
      fecha_hora_aviso: data.fecha_hora_aviso ?? null,
      fecha_hora_llegada: data.fecha_hora_llegada ?? null,

      // Víctimas (consolidado)
      heridos: data.heridos ?? 0,
      fallecidos: data.fallecidos ?? 0,

      // Condiciones de vía
      tipo_pavimento: data.tipo_pavimento ?? null,
      iluminacion: data.iluminacion ?? null,
      senalizacion: data.senalizacion ?? null,
      visibilidad: data.visibilidad ?? null,

      // Causa
      causa_probable: data.causa_probable ?? null,
      causa_especificar: data.causa_especificar ?? null,

      // Daños
      danios_materiales: data.danios_materiales ?? false,
      danios_infraestructura: data.danios_infraestructura ?? false,
      danios_descripcion: data.danios_descripcion ?? null,
    };

    return db.one(qInsert, params);
  },

  /**
   * Actualizar situación por ID
   */
  async update(id: number, data: Partial<Situacion>): Promise<Situacion> {
    const sets: string[] = [];
    const values: any = { id, actualizado_por: data.actualizado_por };

    const fields = [
      'tipo_situacion', 'ruta_id', 'km', 'sentido', 'latitud', 'longitud',
      'observaciones',
      'tipo_situacion_id', 'clima', 'carga_vehicular', 'departamento_id', 'municipio_id', 'obstruccion_data',
      'origen', 'area',
      'fecha_hora_aviso', 'fecha_hora_llegada', 'fecha_hora_finalizacion',
      'heridos', 'fallecidos',
      'tipo_pavimento', 'iluminacion', 'senalizacion', 'visibilidad',
      'causa_probable', 'causa_especificar',
      'danios_materiales', 'danios_infraestructura', 'danios_descripcion',
      'estado'
    ];

    fields.forEach(field => {
      if ((data as any)[field] !== undefined) {
        sets.push(`${field} = $/${field}/`);
        values[field] = (data as any)[field];
      }
    });

    sets.push('actualizado_por = $/actualizado_por/');
    sets.push('updated_at = NOW()');

    if (sets.length === 0) throw new Error('No data to update');

    const query = `
          UPDATE situacion
          SET ${sets.join(', ')}
          WHERE id = $/id/
          RETURNING *
      `;

    return db.one(query, values);
  },

  /**
   * Listar situaciones (Filtros)
   */
  async list(filters: any = {}): Promise<SituacionCompleta[]> {
    let where = 'WHERE 1=1';
    const params: any = {};

    if (filters.unidad_id) {
      where += ' AND s.unidad_id = $/unidad_id/';
      params.unidad_id = filters.unidad_id;
    }
    if (filters.tipo_situacion) {
      where += ' AND s.tipo_situacion = $/tipo_situacion/';
      params.tipo_situacion = filters.tipo_situacion;
    }
    if (filters.estado) {
      where += ' AND s.estado = $/estado/';
      params.estado = filters.estado;
    }
    if (filters.fecha_desde) {
      where += ' AND s.created_at >= $/fecha_desde/';
      params.fecha_desde = filters.fecha_desde;
    }
    if (filters.fecha_hasta) {
      where += ' AND s.created_at <= $/fecha_hasta/';
      params.fecha_hasta = filters.fecha_hasta;
    }

    const limit = filters.limit ? `LIMIT ${parseInt(filters.limit)}` : 'LIMIT 50';
    const offset = filters.offset ? `OFFSET ${parseInt(filters.offset)}` : '';

    const query = `
      SELECT s.*,
        u.codigo as unidad_codigo,
        r.nombre as ruta_nombre
      FROM situacion s
      LEFT JOIN unidad u ON s.unidad_id = u.id
      LEFT JOIN ruta r ON s.ruta_id = r.id
      ${where}
      ORDER BY s.created_at DESC
      ${limit} ${offset}
    `;

    return db.manyOrNone(query, params);
  },

  async getActivas(filters: any = {}): Promise<SituacionCompleta[]> {
    return this.list({ ...filters, estado: 'ACTIVA' });
  },

  async getMiUnidadHoy(unidad_id: number, salida_id?: number): Promise<SituacionCompleta[]> {
    const params: any = { unidad_id, salida_id };

    // Query simplificado - tipo_situacion_id apunta al catálogo unificado
    let query = `
      SELECT s.*,
        r.codigo as ruta_codigo,
        r.nombre as ruta_nombre,
        tsc.nombre as tipo_situacion_nombre,
        tsc.categoria as tipo_situacion_categoria,
        s.tipo_pavimento as material_via,
        -- Multimedia
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', sm.id,
            'tipo', sm.tipo,
            'orden', sm.orden,
            'url', sm.url_original,
            'thumbnail', sm.url_thumbnail
          ) ORDER BY sm.tipo, sm.orden)
          FROM situacion_multimedia sm WHERE sm.situacion_id = s.id),
          '[]'
        ) as multimedia,
        (SELECT COUNT(*) FROM situacion_multimedia WHERE situacion_id = s.id AND tipo = 'FOTO') as total_fotos,
        (SELECT COUNT(*) FROM situacion_multimedia WHERE situacion_id = s.id AND tipo = 'VIDEO') as total_videos
      FROM situacion s
      LEFT JOIN ruta r ON s.ruta_id = r.id
      LEFT JOIN tipo_situacion_catalogo tsc ON s.tipo_situacion_id = tsc.id
      WHERE s.unidad_id = $/unidad_id/
      AND s.created_at >= CURRENT_DATE
    `;

    if (salida_id) {
      query += ` AND s.salida_unidad_id = $/salida_id/`;
    }

    query += ` ORDER BY s.created_at DESC`;

    return db.manyOrNone(query, params);
  },

  async getUltimaSituacionPorUnidad(): Promise<any[]> {
    // Usar tabla situacion_actual para consulta O(1) por unidad
    const query = `
        SELECT
            sa.situacion_id as id,
            sa.tipo_situacion,
            sa.estado,
            sa.latitud,
            sa.longitud,
            sa.km,
            sa.sentido,
            sa.situacion_created_at as created_at,
            u.id as unidad_id,
            u.codigo as unidad_codigo,
            u.tipo_unidad,
            sa.ruta_codigo
        FROM unidad u
        LEFT JOIN situacion_actual sa ON u.id = sa.unidad_id
        WHERE u.activa = true
        ORDER BY u.codigo
    `;
    return db.manyOrNone(query);
  },

  async getBitacoraUnidad(unidad_id: number, filters: any): Promise<any[]> {
    return this.list({ ...filters, unidad_id });
  },

  async cerrar(id: number, actualizado_por: number, obs?: string): Promise<Situacion> {
    return this.update(id, { estado: 'CERRADA', actualizado_por, observaciones: obs } as any);
  }
};

export const DetalleSituacionModel = {
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

  async getBySituacionId(situacion_id: number): Promise<DetalleSituacion[]> {
    return db.manyOrNone('SELECT * FROM detalle_situacion WHERE situacion_id = $1 ORDER BY created_at ASC', [
      situacion_id,
    ]);
  },

  async update(id: number, datos: any): Promise<DetalleSituacion> {
    return db.one('UPDATE detalle_situacion SET datos = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [datos, id]);
  },

  async delete(id: number): Promise<void> {
    await db.none('DELETE FROM detalle_situacion WHERE id = $1', [id]);
  }
};
