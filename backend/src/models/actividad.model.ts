import { db } from '../config/database';

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
  observaciones: string | null;
  datos: Record<string, any>;
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
  async create(data: Partial<Actividad>): Promise<Actividad> {
    const query = `
      INSERT INTO actividad (
        tipo_actividad_id, unidad_id, salida_unidad_id, creado_por,
        ruta_id, latitud, longitud, km, sentido,
        observaciones, datos, codigo_actividad
      ) VALUES (
        $/tipo_actividad_id/, $/unidad_id/, $/salida_unidad_id/, $/creado_por/,
        $/ruta_id/, $/latitud/, $/longitud/, $/km/, $/sentido/,
        $/observaciones/, $/datos/, $/codigo_actividad/
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
      observaciones: data.observaciones || null,
      datos: JSON.stringify(data.datos || {}),
      codigo_actividad: data.codigo_actividad || null,
    };

    return db.one(query, params);
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
   * Obtener actividades de una unidad para hoy
   */
  async getByUnidadHoy(unidadId: number): Promise<ActividadCompleta[]> {
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
      WHERE a.unidad_id = $1
        AND a.created_at >= CURRENT_DATE
        AND a.created_at < CURRENT_DATE + INTERVAL '1 day'
      ORDER BY a.created_at DESC
    `;
    return db.manyOrNone(query, [unidadId]);
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
   * Cerrar todas las actividades activas de una unidad (al crear nueva)
   */
  async cerrarActivasDeUnidad(unidadId: number): Promise<void> {
    await db.none(`
      UPDATE actividad SET estado = 'CERRADA', closed_at = NOW()
      WHERE unidad_id = $1 AND estado = 'ACTIVA'
    `, [unidadId]);
  },
};
