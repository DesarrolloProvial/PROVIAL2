import { db } from '../../config/database';

// ========================================
// INTERFACES
// ========================================

export interface Actividad {
  id: number;
  tipo_actividad_id: number;
  unidad_id: number;
  salida_unidad_id: number | null;
  creado_por: number;
  ruta_id: number | null;
  latitud: number | null;
  longitud: number | null;
  km: number | null;
  sentido: string | null;
  estado: 'ACTIVA' | 'CERRADA';
  observaciones: any[] | null;
  datos: Record<string, any>;
  clima: string | null;
  carga_vehicular: string | null;
  departamento_id: number | null;
  municipio_id: number | null;
  created_at: Date;
  closed_at: Date | null;
  codigo_actividad: string | null;
}

export interface ActividadCompleta extends Actividad {
  unidad_codigo?: string;
  ruta_codigo?: string;
  tipo_actividad_nombre?: string;
  tipo_actividad_categoria?: string;
  tipo_actividad_icono?: string;
  tipo_actividad_color?: string;
  creado_por_nombre?: string;
}

// ========================================
// ACTIVIDAD MODEL
// ========================================

export const ActividadModel = {

  /**
   * Crear nueva actividad
   */
  async create(data: Partial<Actividad>, conn: any = db): Promise<Actividad> {
    const query = `
      INSERT INTO actividad (
        tipo_actividad_id, unidad_id, salida_unidad_id, creado_por,
        ruta_id, latitud, longitud, km, sentido,
        observaciones, datos, codigo_actividad,
        clima, carga_vehicular, departamento_id, municipio_id
      ) VALUES (
        $/tipo_actividad_id/, $/unidad_id/, $/salida_unidad_id/, $/creado_por/,
        $/ruta_id/, $/latitud/, $/longitud/, $/km/, $/sentido/,
        $/observaciones/, $/datos/, $/codigo_actividad/,
        $/clima/, $/carga_vehicular/, $/departamento_id/, $/municipio_id/
      )
      RETURNING *
    `;

    const params = {
      tipo_actividad_id: data.tipo_actividad_id,
      unidad_id: data.unidad_id,
      salida_unidad_id: data.salida_unidad_id || null,
      creado_por: data.creado_por,
      ruta_id: data.ruta_id || null,
      latitud: data.latitud || null,
      longitud: data.longitud || null,
      km: data.km || null,
      sentido: data.sentido || null,
      observaciones: data.observaciones
        ? JSON.stringify([{
            hora: new Intl.DateTimeFormat('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Guatemala'
            }).format(new Date()),
            usuario: 'Creador Actividad',
            mensaje: data.observaciones
          }])
        : JSON.stringify([]),
      datos: JSON.stringify(data.datos || {}),
      codigo_actividad: data.codigo_actividad || null,
      clima: data.clima || null,
      carga_vehicular: data.carga_vehicular || null,
      departamento_id: data.departamento_id || null,
      municipio_id: data.municipio_id || null,
    };

    return conn.one(query, params);
  },

  /**
   * Cerrar actividad
   */
  async cerrar(id: number, _userId: number): Promise<Actividad> {
    const query = `
      UPDATE actividad SET
        estado = 'CERRADA',
        closed_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    return db.one(query, [id]);
  },

  /**
   * Obtener por ID con datos denormalizados
   */
  async getById(id: number): Promise<ActividadCompleta | null> {
    const query = `
      SELECT a.*,
        u.codigo as unidad_codigo,
        r.codigo as ruta_codigo,
        cts.nombre as tipo_actividad_nombre,
        cts.categoria as tipo_actividad_categoria,
        cts.icono as tipo_actividad_icono,
        cts.color as tipo_actividad_color,
        us.nombre_completo as creado_por_nombre,
        su.tripulacion,
        su.fecha_hora_salida,
        ru.codigo as salida_ruta_codigo
      FROM actividad a
      LEFT JOIN unidad u ON a.unidad_id = u.id
      LEFT JOIN ruta r ON a.ruta_id = r.id
      LEFT JOIN catalogo_tipo_situacion cts ON a.tipo_actividad_id = cts.id
      LEFT JOIN usuario us ON a.creado_por = us.id
      LEFT JOIN salida_unidad su ON a.salida_unidad_id = su.id
      LEFT JOIN ruta ru ON su.ruta_inicial_id = ru.id
      WHERE a.id = $1
    `;
    return db.oneOrNone(query, [id]);
  },

  /**
   * Buscar por código determinista (idempotencia)
   */
  async findByCodigoActividad(codigo: string): Promise<Actividad | null> {
    return db.oneOrNone('SELECT * FROM actividad WHERE codigo_actividad = $1', [codigo]);
  },

  /**
   * Obtener actividades de una unidad para la jornada activa (salida_id), o del día calendario como fallback.
   */
  async getByUnidadHoy(unidadId: number, salidaId?: number | null): Promise<ActividadCompleta[]> {
    const base = `
      SELECT a.*,
        u.codigo as unidad_codigo,
        r.codigo as ruta_codigo,
        cts.nombre as tipo_actividad_nombre,
        cts.categoria as tipo_actividad_categoria,
        cts.icono as tipo_actividad_icono,
        cts.color as tipo_actividad_color,
        us.nombre_completo as creado_por_nombre
      FROM actividad a
      LEFT JOIN unidad u ON a.unidad_id = u.id
      LEFT JOIN ruta r ON a.ruta_id = r.id
      LEFT JOIN catalogo_tipo_situacion cts ON a.tipo_actividad_id = cts.id
      LEFT JOIN usuario us ON a.creado_por = us.id
      WHERE a.unidad_id = $/unidad_id/
    `;
    if (salidaId) {
      return db.manyOrNone(base + ` AND a.salida_unidad_id = $/salida_id/ ORDER BY a.created_at DESC`, { unidad_id: unidadId, salida_id: salidaId });
    }
    return db.manyOrNone(base + `
        AND DATE(a.created_at AT TIME ZONE 'America/Guatemala') = DATE(NOW() AT TIME ZONE 'America/Guatemala')
      ORDER BY a.created_at DESC`, { unidad_id: unidadId });
  },

  /**
   * Obtener actividades por salida_unidad_id
   */
  async getBySalida(salidaId: number): Promise<ActividadCompleta[]> {
    const query = `
      SELECT a.*,
        u.codigo as unidad_codigo,
        r.codigo as ruta_codigo,
        cts.nombre as tipo_actividad_nombre,
        cts.categoria as tipo_actividad_categoria,
        cts.icono as tipo_actividad_icono,
        cts.color as tipo_actividad_color,
        us.nombre_completo as creado_por_nombre
      FROM actividad a
      LEFT JOIN unidad u ON a.unidad_id = u.id
      LEFT JOIN ruta r ON a.ruta_id = r.id
      LEFT JOIN catalogo_tipo_situacion cts ON a.tipo_actividad_id = cts.id
      LEFT JOIN usuario us ON a.creado_por = us.id
      WHERE a.salida_unidad_id = $1
      ORDER BY a.created_at DESC
    `;
    return db.manyOrNone(query, [salidaId]);
  },

  /**
   * Obtener actividad activa de una unidad
   */
  async getActivaPorUnidad(unidadId: number): Promise<ActividadCompleta | null> {
    const query = `
      SELECT a.*,
        u.codigo as unidad_codigo,
        r.codigo as ruta_codigo,
        cts.nombre as tipo_actividad_nombre,
        cts.categoria as tipo_actividad_categoria,
        cts.icono as tipo_actividad_icono,
        cts.color as tipo_actividad_color,
        us.nombre_completo as creado_por_nombre
      FROM actividad a
      LEFT JOIN unidad u ON a.unidad_id = u.id
      LEFT JOIN ruta r ON a.ruta_id = r.id
      LEFT JOIN catalogo_tipo_situacion cts ON a.tipo_actividad_id = cts.id
      LEFT JOIN usuario us ON a.creado_por = us.id
      WHERE a.unidad_id = $1 AND a.estado = 'ACTIVA'
      ORDER BY a.created_at DESC
      LIMIT 1
    `;
    return db.oneOrNone(query, [unidadId]);
  },

  /**
   * Actualizar campos editables de una actividad.
   * Si no hay nada que actualizar, devuelve la actividad sin tocar la BD.
   */
  async update(
    id: number,
    patch: {
      km?: any; sentido?: any; ruta_id?: any;
      latitud?: any; longitud?: any; observaciones?: any; datos?: any;
      clima?: any; carga_vehicular?: any; departamento_id?: any; municipio_id?: any;
    },
  ): Promise<ActividadCompleta | null> {
    const sets: string[] = [];
    const vals: any[]    = [];
    let i = 1;

    if (patch.km !== undefined)               { sets.push(`km = $${i++}`);               vals.push(patch.km); }
    if (patch.sentido !== undefined)          { sets.push(`sentido = $${i++}`);           vals.push(patch.sentido); }
    if (patch.ruta_id !== undefined)          { sets.push(`ruta_id = $${i++}`);           vals.push(patch.ruta_id); }
    if (patch.latitud !== undefined)          { sets.push(`latitud = $${i++}`);           vals.push(patch.latitud); }
    if (patch.longitud !== undefined)         { sets.push(`longitud = $${i++}`);          vals.push(patch.longitud); }
    if (patch.datos !== undefined)            { sets.push(`datos = $${i++}`);             vals.push(JSON.stringify(patch.datos)); }
    if (patch.clima !== undefined)            { sets.push(`clima = $${i++}`);             vals.push(patch.clima); }
    if (patch.carga_vehicular !== undefined)  { sets.push(`carga_vehicular = $${i++}`);   vals.push(patch.carga_vehicular); }
    if (patch.departamento_id !== undefined)  { sets.push(`departamento_id = $${i++}`);   vals.push(patch.departamento_id); }
    if (patch.municipio_id !== undefined)     { sets.push(`municipio_id = $${i++}`);      vals.push(patch.municipio_id); }
    if (patch.observaciones !== undefined) {
      if (typeof patch.observaciones === 'string' && patch.observaciones.trim()) {
        const hora = new Intl.DateTimeFormat('en-US', {
          hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'America/Guatemala',
        }).format(new Date());
        sets.push(`observaciones = $${i++}`);
        vals.push(JSON.stringify([{ hora, usuario: 'Edición', mensaje: patch.observaciones }]));
      } else if (Array.isArray(patch.observaciones)) {
        sets.push(`observaciones = $${i++}`);
        vals.push(JSON.stringify(patch.observaciones));
      }
    }

    if (sets.length > 0) {
      vals.push(id);
      await db.none(`UPDATE actividad SET ${sets.join(', ')} WHERE id = $${i}`, vals);
    }
    return this.getById(id);
  },

  /**
   * Cerrar todas las actividades activas de una unidad (al crear nueva)
   */
  async list(filters: any = {}): Promise<ActividadCompleta[]> {
    let where = 'WHERE 1=1';
    const params: any = {};
    if (filters.estado)       { where += ' AND a.estado = $/estado/';           params.estado = filters.estado; }
    if (filters.unidad_id)    { where += ' AND a.unidad_id = $/unidad_id/';     params.unidad_id = parseInt(filters.unidad_id); }
    if (filters.fecha_desde)  { where += ' AND a.created_at >= $/fecha_desde/'; params.fecha_desde = filters.fecha_desde; }
    if (filters.fecha_hasta)  { where += ' AND a.created_at <= $/fecha_hasta/'; params.fecha_hasta = filters.fecha_hasta; }
    const limit = filters.limit ? `LIMIT ${Math.min(parseInt(filters.limit), 500)}` : 'LIMIT 100';
    return db.manyOrNone(`
      SELECT a.*, u.codigo AS unidad_codigo, u.sede_id,
             r.codigo AS ruta_codigo,
             cts.nombre AS tipo_actividad_nombre, cts.categoria AS tipo_actividad_categoria,
             cts.icono AS tipo_actividad_icono, cts.color AS tipo_actividad_color,
             us.nombre_completo AS creado_por_nombre
      FROM actividad a
      LEFT JOIN unidad u ON a.unidad_id = u.id
      LEFT JOIN ruta r ON a.ruta_id = r.id
      LEFT JOIN catalogo_tipo_situacion cts ON a.tipo_actividad_id = cts.id
      LEFT JOIN usuario us ON a.creado_por = us.id
      ${where}
      ORDER BY a.created_at DESC
      ${limit}
    `, params);
  },

  async cerrarActivasDeUnidad(unidadId: number, conn: any = db): Promise<void> {
    await conn.none(`
      UPDATE actividad SET estado = 'CERRADA', closed_at = NOW()
      WHERE unidad_id = $1 AND estado = 'ACTIVA'
    `, [unidadId]);
  },

  async agregarObservacion(id: number, entrada: string): Promise<any> {
    return db.one(
      `UPDATE actividad
       SET observaciones = COALESCE(observaciones, '[]'::jsonb) || $1::jsonb
       WHERE id = $2
       RETURNING *`,
      [entrada, id],
    );
  },
};
