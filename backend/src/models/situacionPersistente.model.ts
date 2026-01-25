import { db } from '../config/database';

// ========================================
// INTERFACES
// ========================================

export type EstadoSituacionPersistente = 'ACTIVA' | 'EN_PAUSA' | 'FINALIZADA';
export type ImportanciaSituacionPersistente = 'BAJA' | 'NORMAL' | 'ALTA' | 'CRITICA';
export type TipoObstruccion = 'ninguna' | 'total_sentido' | 'total_ambos' | 'parcial';

// Interfaces para campos de emergencia vial
export interface TipoEmergenciaVial {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  color: string;
  orden: number;
}

// Estructura de un carril individual
export interface CarrilObstruccion {
  nombre: string;
  porcentaje: number; // 0-100
}

// Datos de carriles por sentido
export interface SentidoObstruccion {
  cantidad_carriles: number; // 1-5
  carriles: CarrilObstruccion[];
}

// Nueva interfaz de obstrucción v2
export interface ObstruccionPersistente {
  id?: number;
  situacion_persistente_id?: number;
  hay_vehiculo_fuera_via: boolean;
  tipo_obstruccion: TipoObstruccion;
  sentido_principal: SentidoObstruccion | null;
  sentido_contrario: SentidoObstruccion | null;
  descripcion_manual: string | null;
  descripcion_generada?: string | null;
}

// Función helper para generar nombres de carriles
export function generarNombresCarriles(cantidad: number, sentido?: string): string[] {
  switch (cantidad) {
    case 1:
      return [`Carril hacia ${sentido || 'el sentido'}`];
    case 2:
      return ['Carril izquierdo', 'Carril derecho'];
    case 3:
      return ['Carril izquierdo', 'Carril central', 'Carril derecho'];
    case 4:
      return ['Carril izquierdo', 'Carril central izquierdo', 'Carril central derecho', 'Carril derecho'];
    case 5:
      return ['Carril izquierdo', 'Carril central izquierdo', 'Carril central', 'Carril central derecho', 'Carril derecho'];
    default:
      return [];
  }
}

// Función helper para crear estructura de sentido
export function crearSentidoObstruccion(cantidadCarriles: number, sentido?: string): SentidoObstruccion {
  const nombres = generarNombresCarriles(cantidadCarriles, sentido);
  return {
    cantidad_carriles: cantidadCarriles,
    carriles: nombres.map(nombre => ({ nombre, porcentaje: 0 }))
  };
}

export interface AutoridadPersistente {
  id: number;
  situacion_persistente_id: number;
  tipo_autoridad: string;
  hora_llegada: string | null;
  nip_chapa: string | null;
  numero_unidad: string | null;
  nombre_comandante: string | null;
  cantidad_elementos: number | null;
  subestacion: string | null;
  cantidad_unidades: number | null;
  observaciones: string | null;
}

export interface SocorroPersistente {
  id: number;
  situacion_persistente_id: number;
  tipo_socorro: string;
  hora_llegada: string | null;
  nip_chapa: string | null;
  numero_unidad: string | null;
  nombre_comandante: string | null;
  cantidad_elementos: number | null;
  subestacion: string | null;
  cantidad_unidades: number | null;
  observaciones: string | null;
}

export interface MultimediaPersistente {
  id: number;
  situacion_persistente_id: number;
  tipo: 'foto' | 'video';
  url: string;
  url_thumbnail: string | null;
  nombre_archivo: string | null;
  mime_type: string | null;
  tamanio_bytes: number | null;
  orden: number;
  latitud: number | null;
  longitud: number | null;
  descripcion: string | null;
  subido_por: number;
}

export interface SituacionPersistente {
  id: number;
  uuid: string;
  numero: string;
  titulo: string;
  tipo: string;
  subtipo: string | null;
  estado: EstadoSituacionPersistente;
  importancia: ImportanciaSituacionPersistente;
  ruta_id: number | null;
  km_inicio: number | null;
  km_fin: number | null;
  sentido: string | null;
  latitud: number | null;
  longitud: number | null;
  direccion_referencia: string | null;
  descripcion: string | null;
  observaciones_generales: string | null;
  fecha_inicio: Date;
  fecha_fin_estimada: Date | null;
  fecha_fin_real: Date | null;
  creado_por: number;
  cerrado_por: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface SituacionPersistenteCompleta extends SituacionPersistente {
  ruta_codigo: string | null;
  ruta_nombre: string | null;
  creado_por_nombre: string;
  cerrado_por_nombre: string | null;
  unidades_asignadas_count: number;
  unidades_asignadas: Array<{
    unidad_id: number;
    unidad_codigo: string;
    fecha_asignacion: Date;
  }> | null;
  sede_id?: number; // Agregado para filtros
}

export interface AsignacionSituacionPersistente {
  id: number;
  situacion_persistente_id: number;
  unidad_id: number;
  asignacion_unidad_id: number | null;
  fecha_hora_asignacion: Date;
  fecha_hora_desasignacion: Date | null;
  km_asignacion: number | null;
  latitud_asignacion: number | null;
  longitud_asignacion: number | null;
  observaciones_asignacion: string | null;
  observaciones_desasignacion: string | null;
  asignado_por: number;
  desasignado_por: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface ActualizacionSituacionPersistente {
  id: number;
  situacion_persistente_id: number;
  usuario_id: number;
  unidad_id: number;
  asignacion_situacion_id: number | null;
  tipo_actualizacion: string;
  contenido: string | null;
  datos_adicionales: Record<string, any> | null;
  archivos: Array<{ url: string; tipo: string; nombre: string }> | null;
  fecha_hora: Date;
  editado: boolean;
  fecha_ultima_edicion: Date | null;
  editado_por: number | null;
  puede_editarse: boolean;
  created_at: Date;
  updated_at: Date;
}

// ========================================
// MODEL
// ========================================

export const SituacionPersistenteModel = {
  // ... (create, getById, getByUuid methods Unchanged)
  /**
   * Crear nueva situación persistente
   */
  async create(data: {
    titulo: string;
    tipo: string;
    subtipo?: string;
    importancia?: ImportanciaSituacionPersistente;
    ruta_id?: number;
    km_inicio?: number;
    km_fin?: number;
    sentido?: string;
    latitud?: number;
    longitud?: number;
    direccion_referencia?: string;
    descripcion?: string;
    fecha_fin_estimada?: Date;
    creado_por: number;
  }): Promise<SituacionPersistente> {
    const query = `
      INSERT INTO situacion_persistente (
        titulo, tipo, subtipo, importancia,
        ruta_id, km_inicio, km_fin, sentido,
        latitud, longitud, direccion_referencia,
        descripcion, fecha_fin_estimada, creado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    return db.one(query, [
      data.titulo,
      data.tipo,
      data.subtipo || null,
      data.importancia || 'NORMAL',
      data.ruta_id || null,
      data.km_inicio || null,
      data.km_fin || null,
      data.sentido || null,
      data.latitud || null,
      data.longitud || null,
      data.direccion_referencia || null,
      data.descripcion || null,
      data.fecha_fin_estimada || null,
      data.creado_por
    ]);
  },

  /**
   * Obtener situación por ID
   */
  async getById(id: number): Promise<SituacionPersistenteCompleta | null> {
    return db.oneOrNone(
      'SELECT * FROM v_situaciones_persistentes_completas WHERE id = $1',
      [id]
    );
  },

  /**
   * Obtener situación por UUID
   */
  async getByUuid(uuid: string): Promise<SituacionPersistenteCompleta | null> {
    return db.oneOrNone(
      'SELECT * FROM v_situaciones_persistentes_completas WHERE uuid = $1',
      [uuid]
    );
  },

  /**
   * Obtener todas las situaciones persistentes activas
   */
  async getActivas(): Promise<SituacionPersistenteCompleta[]> {
    return db.manyOrNone(`
      SELECT sp.*, u.sede_id
      FROM v_situaciones_persistentes_completas sp
      LEFT JOIN usuario u ON sp.creado_por = u.id
      WHERE sp.estado = 'ACTIVA'
      ORDER BY sp.importancia DESC, sp.fecha_inicio DESC
    `);
  },

  /**
   * Obtener todas las situaciones con filtros
   */
  async getAll(filters?: {
    estado?: EstadoSituacionPersistente;
    tipo?: string;
    ruta_id?: number;
    importancia?: ImportanciaSituacionPersistente;
    limit?: number;
    offset?: number;
  }): Promise<SituacionPersistenteCompleta[]> {
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (filters?.estado) {
      whereConditions.push(`estado = $${paramIndex++}`);
      params.push(filters.estado);
    }

    if (filters?.tipo) {
      whereConditions.push(`tipo = $${paramIndex++}`);
      params.push(filters.tipo);
    }

    if (filters?.ruta_id) {
      whereConditions.push(`ruta_id = $${paramIndex++}`);
      params.push(filters.ruta_id);
    }

    if (filters?.importancia) {
      whereConditions.push(`importancia = $${paramIndex++}`);
      params.push(filters.importancia);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    const query = `
      SELECT * FROM v_situaciones_persistentes_completas
      ${whereClause}
      ORDER BY
        CASE estado
          WHEN 'ACTIVA' THEN 1
          WHEN 'EN_PAUSA' THEN 2
          WHEN 'FINALIZADA' THEN 3
        END,
        CASE importancia
          WHEN 'CRITICA' THEN 1
          WHEN 'ALTA' THEN 2
          WHEN 'NORMAL' THEN 3
          WHEN 'BAJA' THEN 4
        END,
        fecha_inicio DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);
    return db.manyOrNone(query, params);
  },

  /**
   * Actualizar situación persistente
   */
  async update(
    id: number,
    data: {
      titulo?: string;
      tipo?: string;
      subtipo?: string;
      estado?: EstadoSituacionPersistente;
      importancia?: ImportanciaSituacionPersistente;
      km_inicio?: number;
      km_fin?: number;
      sentido?: string;
      direccion_referencia?: string;
      descripcion?: string;
      observaciones_generales?: string;
      fecha_fin_estimada?: Date;
    }
  ): Promise<SituacionPersistente> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    let paramIndex = 1;

    const fields = [
      'titulo', 'tipo', 'subtipo', 'estado', 'importancia',
      'km_inicio', 'km_fin', 'sentido', 'direccion_referencia',
      'descripcion', 'observaciones_generales', 'fecha_fin_estimada'
    ];

    for (const field of fields) {
      if ((data as any)[field] !== undefined) {
        setClauses.push(`${field} = $${paramIndex++}`);
        params.push((data as any)[field]);
      }
    }

    params.push(id);

    const query = `
      UPDATE situacion_persistente
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    return db.one(query, params);
  },

  /**
   * Finalizar situación persistente
   */
  async finalizar(id: number, cerrado_por: number): Promise<SituacionPersistente> {
    const query = `
      UPDATE situacion_persistente
      SET
        estado = 'FINALIZADA',
        fecha_fin_real = NOW(),
        cerrado_por = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    return db.one(query, [cerrado_por, id]);
  },

  /**
   * Pausar situación persistente
   */
  async pausar(id: number): Promise<SituacionPersistente> {
    return db.one(`
      UPDATE situacion_persistente
      SET estado = 'EN_PAUSA', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
  },

  /**
   * Reactivar situación persistente
   */
  async reactivar(id: number): Promise<SituacionPersistente> {
    return db.one(`
      UPDATE situacion_persistente
      SET estado = 'ACTIVA', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
  },

  // ========================================
  // ASIGNACIÓN DE UNIDADES
  // ========================================

  /**
   * Asignar unidad a situación persistente
   */
  async asignarUnidad(data: {
    situacion_persistente_id: number;
    unidad_id: number;
    asignacion_unidad_id?: number;
    km_asignacion?: number;
    latitud_asignacion?: number;
    longitud_asignacion?: number;
    observaciones_asignacion?: string;
    asignado_por: number;
  }): Promise<AsignacionSituacionPersistente> {
    // Verificar que no esté ya asignada
    const existente = await db.oneOrNone(`
      SELECT id FROM asignacion_situacion_persistente
      WHERE situacion_persistente_id = $1
        AND unidad_id = $2
        AND fecha_hora_desasignacion IS NULL
    `, [data.situacion_persistente_id, data.unidad_id]);

    if (existente) {
      throw new Error('La unidad ya está asignada a esta situación');
    }

    const query = `
      INSERT INTO asignacion_situacion_persistente (
        situacion_persistente_id, unidad_id, asignacion_unidad_id,
        km_asignacion, latitud_asignacion, longitud_asignacion,
        observaciones_asignacion, asignado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    return db.one(query, [
      data.situacion_persistente_id,
      data.unidad_id,
      data.asignacion_unidad_id || null,
      data.km_asignacion || null,
      data.latitud_asignacion || null,
      data.longitud_asignacion || null,
      data.observaciones_asignacion || null,
      data.asignado_por
    ]);
  },

  /**
   * Desasignar unidad de situación persistente
   */
  async desasignarUnidad(data: {
    situacion_persistente_id: number;
    unidad_id: number;
    observaciones_desasignacion?: string;
    desasignado_por: number;
  }): Promise<AsignacionSituacionPersistente> {
    // Primero marcar las actualizaciones como no editables
    await db.none(`
      UPDATE actualizacion_situacion_persistente
      SET puede_editarse = FALSE, updated_at = NOW()
      WHERE situacion_persistente_id = $1
        AND unidad_id = $2
        AND puede_editarse = TRUE
    `, [data.situacion_persistente_id, data.unidad_id]);

    // Desasignar la unidad
    const query = `
      UPDATE asignacion_situacion_persistente
      SET
        fecha_hora_desasignacion = NOW(),
        observaciones_desasignacion = $1,
        desasignado_por = $2,
        updated_at = NOW()
      WHERE situacion_persistente_id = $3
        AND unidad_id = $4
        AND fecha_hora_desasignacion IS NULL
      RETURNING *
    `;

    return db.one(query, [
      data.observaciones_desasignacion || null,
      data.desasignado_por,
      data.situacion_persistente_id,
      data.unidad_id
    ]);
  },

  /**
   * Obtener asignaciones activas de una situación
   */
  async getAsignacionesActivas(situacion_persistente_id: number): Promise<AsignacionSituacionPersistente[]> {
    return db.manyOrNone(`
      SELECT asp.*, u.codigo as unidad_codigo, u.tipo_unidad
      FROM asignacion_situacion_persistente asp
      JOIN unidad u ON asp.unidad_id = u.id
      WHERE asp.situacion_persistente_id = $1
        AND asp.fecha_hora_desasignacion IS NULL
      ORDER BY asp.fecha_hora_asignacion
    `, [situacion_persistente_id]);
  },

  /**
   * Obtener historial de asignaciones
   */
  async getHistorialAsignaciones(situacion_persistente_id: number): Promise<AsignacionSituacionPersistente[]> {
    return db.manyOrNone(`
      SELECT asp.*, u.codigo as unidad_codigo, u.tipo_unidad,
             ua.nombre_completo as asignado_por_nombre,
             ud.nombre_completo as desasignado_por_nombre
      FROM asignacion_situacion_persistente asp
      JOIN unidad u ON asp.unidad_id = u.id
      LEFT JOIN usuario ua ON asp.asignado_por = ua.id
      LEFT JOIN usuario ud ON asp.desasignado_por = ud.id
      WHERE asp.situacion_persistente_id = $1
      ORDER BY asp.fecha_hora_asignacion DESC
    `, [situacion_persistente_id]);
  },

  /**
   * Verificar si una unidad está asignada a alguna situación persistente activa
   */
  async getAsignacionActivaUnidad(unidad_id: number): Promise<{
    situacion_id: number;
    situacion_titulo: string;
    situacion_tipo: string;
  } | null> {
    return db.oneOrNone(`
      SELECT
        sp.id as situacion_id,
        sp.titulo as situacion_titulo,
        sp.tipo as situacion_tipo
      FROM asignacion_situacion_persistente asp
      JOIN situacion_persistente sp ON asp.situacion_persistente_id = sp.id
      WHERE asp.unidad_id = $1
        AND asp.fecha_hora_desasignacion IS NULL
        AND sp.estado = 'ACTIVA'
    `, [unidad_id]);
  },

  // ========================================
  // ACTUALIZACIONES
  // ========================================

  /**
   * Agregar actualización a situación persistente
   */
  async agregarActualizacion(data: {
    situacion_persistente_id: number;
    usuario_id: number;
    unidad_id: number;
    tipo_actualizacion: string;
    contenido?: string;
    datos_adicionales?: Record<string, any>;
    archivos?: Array<{ url: string; tipo: string; nombre: string }>;
  }): Promise<ActualizacionSituacionPersistente> {
    // Verificar que la unidad esté asignada
    const asignacion = await db.oneOrNone(`
      SELECT id FROM asignacion_situacion_persistente
      WHERE situacion_persistente_id = $1
        AND unidad_id = $2
        AND fecha_hora_desasignacion IS NULL
    `, [data.situacion_persistente_id, data.unidad_id]);

    if (!asignacion) {
      throw new Error('La unidad no está asignada a esta situación');
    }

    const query = `
      INSERT INTO actualizacion_situacion_persistente (
        situacion_persistente_id, usuario_id, unidad_id,
        asignacion_situacion_id, tipo_actualizacion,
        contenido, datos_adicionales, archivos
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    return db.one(query, [
      data.situacion_persistente_id,
      data.usuario_id,
      data.unidad_id,
      asignacion.id,
      data.tipo_actualizacion,
      data.contenido || null,
      data.datos_adicionales ? JSON.stringify(data.datos_adicionales) : null,
      data.archivos ? JSON.stringify(data.archivos) : null
    ]);
  },

  /**
   * Editar actualización (solo si puede_editarse = true)
   */
  async editarActualizacion(
    id: number,
    usuario_id: number,
    data: {
      contenido?: string;
      datos_adicionales?: Record<string, any>;
    }
  ): Promise<ActualizacionSituacionPersistente> {
    // Verificar que se pueda editar
    const actualizacion = await db.oneOrNone(`
      SELECT * FROM actualizacion_situacion_persistente
      WHERE id = $1 AND puede_editarse = TRUE
    `, [id]);

    if (!actualizacion) {
      throw new Error('La actualización no existe o ya no puede editarse');
    }

    const setClauses: string[] = [
      'editado = TRUE',
      'fecha_ultima_edicion = NOW()',
      `editado_por = ${usuario_id}`,
      'updated_at = NOW()'
    ];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.contenido !== undefined) {
      setClauses.push(`contenido = $${paramIndex++}`);
      params.push(data.contenido);
    }

    if (data.datos_adicionales !== undefined) {
      setClauses.push(`datos_adicionales = $${paramIndex++}`);
      params.push(JSON.stringify(data.datos_adicionales));
    }

    params.push(id);

    const query = `
      UPDATE actualizacion_situacion_persistente
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    return db.one(query, params);
  },

  /**
   * Obtener actualizaciones de una situación
   */
  async getActualizaciones(
    situacion_persistente_id: number,
    filters?: {
      unidad_id?: number;
      tipo_actualizacion?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<ActualizacionSituacionPersistente[]> {
    let whereConditions: string[] = ['asp.situacion_persistente_id = $1'];
    let params: any[] = [situacion_persistente_id];
    let paramIndex = 2;

    if (filters?.unidad_id) {
      whereConditions.push(`asp.unidad_id = $${paramIndex++}`);
      params.push(filters.unidad_id);
    }

    if (filters?.tipo_actualizacion) {
      whereConditions.push(`asp.tipo_actualizacion = $${paramIndex++}`);
      params.push(filters.tipo_actualizacion);
    }

    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    const query = `
      SELECT asp.*, u.nombre_completo as usuario_nombre,
             un.codigo as unidad_codigo
      FROM actualizacion_situacion_persistente asp
      JOIN usuario u ON asp.usuario_id = u.id
      JOIN unidad un ON asp.unidad_id = un.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY asp.fecha_hora DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);
    return db.manyOrNone(query, params);
  },

  /**
   * Obtener situaciones persistentes donde una unidad está asignada
   */
  async getSituacionesByUnidad(unidad_id: number): Promise<SituacionPersistenteCompleta[]> {
    return db.manyOrNone(`
      SELECT sp.* FROM v_situaciones_persistentes_completas sp
      JOIN asignacion_situacion_persistente asp ON sp.id = asp.situacion_persistente_id
      WHERE asp.unidad_id = $1
        AND asp.fecha_hora_desasignacion IS NULL
      ORDER BY sp.importancia DESC, sp.fecha_inicio DESC
    `, [unidad_id]);
  },

  // ========================================
  // CATÁLOGOS
  // ========================================

  /**
   * Obtener tipos de emergencia vial disponibles
   */
  async getTiposEmergencia(): Promise<TipoEmergenciaVial[]> {
    return db.manyOrNone(`
      SELECT id, nombre, icono, color, activo
      FROM tipo_situacion_catalogo
      WHERE categoria = 'EMERGENCIA' AND activo = TRUE
      ORDER BY nombre
    `);
  },

  // ========================================
  // PROMOCIÓN DE SITUACIÓN
  // ========================================

  /**
   * Promover una situación normal a persistente extraordinaria
   * Usa la función fn_promover_a_persistente de la BD
   */
  async promoverSituacion(data: {
    situacion_id: number;
    titulo: string;
    tipo_emergencia_id: number;
    importancia?: ImportanciaSituacionPersistente;
    descripcion?: string;
    promovido_por: number;
  }): Promise<SituacionPersistenteCompleta> {
    const result = await db.one<{ id: number }>(
      'SELECT fn_promover_a_persistente($1, $2, $3, $4, $5, $6) as id',
      [
        data.situacion_id,
        data.titulo,
        data.tipo_emergencia_id,
        data.importancia || 'ALTA',
        data.descripcion || null,
        data.promovido_por
      ]
    );

    const situacion = await this.getById(result.id);
    if (!situacion) {
      throw new Error('Error al obtener la situación promovida');
    }
    return situacion;
  },

  /**
   * Verificar si una situación ya fue promovida
   */
  async fuePromovida(situacion_id: number): Promise<boolean> {
    const result = await db.oneOrNone(
      'SELECT id FROM situacion_persistente WHERE situacion_origen_id = $1',
      [situacion_id]
    );
    return result !== null;
  },

  // ========================================
  // OBSTRUCCIÓN (Modelo v2)
  // ========================================

  /**
   * Guardar o actualizar datos de obstrucción (nuevo modelo v2)
   * Soporta:
   * - hay_vehiculo_fuera_via: puede combinarse con obstrucción parcial
   * - tipo_obstruccion: 'ninguna' | 'total_sentido' | 'total_ambos' | 'parcial'
   * - sentido_principal y sentido_contrario: JSONB con carriles y porcentajes
   */
  async saveObstruccion(data: {
    situacion_persistente_id: number;
    hay_vehiculo_fuera_via: boolean;
    tipo_obstruccion: TipoObstruccion;
    sentido_principal?: SentidoObstruccion | null;
    sentido_contrario?: SentidoObstruccion | null;
    descripcion_manual?: string;
  }): Promise<ObstruccionPersistente> {
    // Usar UPSERT - el trigger de la BD genera descripcion_generada automáticamente
    const query = `
      INSERT INTO obstruccion_situacion_persistente (
        situacion_persistente_id, hay_vehiculo_fuera_via, tipo_obstruccion,
        sentido_principal, sentido_contrario, descripcion_manual
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (situacion_persistente_id)
      DO UPDATE SET
        hay_vehiculo_fuera_via = EXCLUDED.hay_vehiculo_fuera_via,
        tipo_obstruccion = EXCLUDED.tipo_obstruccion,
        sentido_principal = EXCLUDED.sentido_principal,
        sentido_contrario = EXCLUDED.sentido_contrario,
        descripcion_manual = EXCLUDED.descripcion_manual,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await db.one(query, [
      data.situacion_persistente_id,
      data.hay_vehiculo_fuera_via,
      data.tipo_obstruccion,
      data.sentido_principal ? JSON.stringify(data.sentido_principal) : null,
      data.sentido_contrario ? JSON.stringify(data.sentido_contrario) : null,
      data.descripcion_manual || null
    ]);

    return {
      ...result,
      sentido_principal: result.sentido_principal || null,
      sentido_contrario: result.sentido_contrario || null
    };
  },

  /**
   * Obtener datos de obstrucción (nuevo modelo v2)
   */
  async getObstruccion(situacion_persistente_id: number): Promise<ObstruccionPersistente | null> {
    const result = await db.oneOrNone(
      'SELECT * FROM obstruccion_situacion_persistente WHERE situacion_persistente_id = $1',
      [situacion_persistente_id]
    );

    if (!result) return null;

    return {
      id: result.id,
      situacion_persistente_id: result.situacion_persistente_id,
      hay_vehiculo_fuera_via: result.hay_vehiculo_fuera_via,
      tipo_obstruccion: result.tipo_obstruccion,
      sentido_principal: result.sentido_principal || null,
      sentido_contrario: result.sentido_contrario || null,
      descripcion_manual: result.descripcion_manual,
      descripcion_generada: result.descripcion_generada
    };
  },

  // ========================================
  // AUTORIDADES
  // ========================================

  /**
   * Guardar autoridades (reemplaza todas las existentes)
   */
  async saveAutoridades(
    situacion_persistente_id: number,
    autoridades: Array<Omit<AutoridadPersistente, 'id' | 'situacion_persistente_id'>>
  ): Promise<AutoridadPersistente[]> {
    // Eliminar existentes
    await db.none(
      'DELETE FROM autoridad_situacion_persistente WHERE situacion_persistente_id = $1',
      [situacion_persistente_id]
    );

    if (autoridades.length === 0) return [];

    // Insertar nuevas
    const values = autoridades.map((_a, i) => {
      const baseIndex = i * 10;
      return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10})`;
    });

    const params: any[] = [];
    autoridades.forEach(a => {
      params.push(
        situacion_persistente_id,
        a.tipo_autoridad,
        a.hora_llegada || null,
        a.nip_chapa || null,
        a.numero_unidad || null,
        a.nombre_comandante || null,
        a.cantidad_elementos || null,
        a.subestacion || null,
        a.cantidad_unidades || null,
        a.observaciones || null
      );
    });

    const query = `
      INSERT INTO autoridad_situacion_persistente (
        situacion_persistente_id, tipo_autoridad, hora_llegada,
        nip_chapa, numero_unidad, nombre_comandante,
        cantidad_elementos, subestacion, cantidad_unidades, observaciones
      ) VALUES ${values.join(', ')}
      RETURNING *
    `;

    return db.manyOrNone(query, params);
  },

  /**
   * Obtener autoridades de una situación
   */
  async getAutoridades(situacion_persistente_id: number): Promise<AutoridadPersistente[]> {
    return db.manyOrNone(
      'SELECT * FROM autoridad_situacion_persistente WHERE situacion_persistente_id = $1 ORDER BY tipo_autoridad',
      [situacion_persistente_id]
    );
  },

  // ========================================
  // SOCORRO
  // ========================================

  /**
   * Guardar unidades de socorro (reemplaza todas las existentes)
   */
  async saveSocorro(
    situacion_persistente_id: number,
    socorro: Array<Omit<SocorroPersistente, 'id' | 'situacion_persistente_id'>>
  ): Promise<SocorroPersistente[]> {
    // Eliminar existentes
    await db.none(
      'DELETE FROM socorro_situacion_persistente WHERE situacion_persistente_id = $1',
      [situacion_persistente_id]
    );

    if (socorro.length === 0) return [];

    // Insertar nuevos
    const values = socorro.map((_s, i) => {
      const baseIndex = i * 10;
      return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10})`;
    });

    const params: any[] = [];
    socorro.forEach(s => {
      params.push(
        situacion_persistente_id,
        s.tipo_socorro,
        s.hora_llegada || null,
        s.nip_chapa || null,
        s.numero_unidad || null,
        s.nombre_comandante || null,
        s.cantidad_elementos || null,
        s.subestacion || null,
        s.cantidad_unidades || null,
        s.observaciones || null
      );
    });

    const query = `
      INSERT INTO socorro_situacion_persistente (
        situacion_persistente_id, tipo_socorro, hora_llegada,
        nip_chapa, numero_unidad, nombre_comandante,
        cantidad_elementos, subestacion, cantidad_unidades, observaciones
      ) VALUES ${values.join(', ')}
      RETURNING *
    `;

    return db.manyOrNone(query, params);
  },

  /**
   * Obtener unidades de socorro de una situación
   */
  async getSocorro(situacion_persistente_id: number): Promise<SocorroPersistente[]> {
    return db.manyOrNone(
      'SELECT * FROM socorro_situacion_persistente WHERE situacion_persistente_id = $1 ORDER BY tipo_socorro',
      [situacion_persistente_id]
    );
  },

  // ========================================
  // MULTIMEDIA
  // ========================================

  /**
   * Agregar multimedia a situación persistente
   */
  async addMultimedia(data: {
    situacion_persistente_id: number;
    tipo: 'foto' | 'video';
    url: string;
    url_thumbnail?: string;
    nombre_archivo?: string;
    mime_type?: string;
    tamanio_bytes?: number;
    latitud?: number;
    longitud?: number;
    descripcion?: string;
    subido_por: number;
  }): Promise<MultimediaPersistente> {
    // Determinar orden para fotos
    let orden = 0;
    if (data.tipo === 'foto') {
      const maxOrden = await db.oneOrNone<{ max: number }>(
        'SELECT COALESCE(MAX(orden), 0) as max FROM multimedia_situacion_persistente WHERE situacion_persistente_id = $1 AND tipo = $2',
        [data.situacion_persistente_id, 'foto']
      );
      orden = (maxOrden?.max || 0) + 1;

      // Validar máximo 3 fotos
      if (orden > 3) {
        throw new Error('Ya se alcanzó el máximo de 3 fotos permitidas');
      }
    }

    const query = `
      INSERT INTO multimedia_situacion_persistente (
        situacion_persistente_id, tipo, url, url_thumbnail,
        nombre_archivo, mime_type, tamanio_bytes, orden,
        latitud, longitud, descripcion, subido_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    return db.one(query, [
      data.situacion_persistente_id,
      data.tipo,
      data.url,
      data.url_thumbnail || null,
      data.nombre_archivo || null,
      data.mime_type || null,
      data.tamanio_bytes || null,
      orden,
      data.latitud || null,
      data.longitud || null,
      data.descripcion || null,
      data.subido_por
    ]);
  },

  /**
   * Obtener multimedia de una situación
   */
  async getMultimedia(situacion_persistente_id: number): Promise<MultimediaPersistente[]> {
    return db.manyOrNone(
      'SELECT * FROM multimedia_situacion_persistente WHERE situacion_persistente_id = $1 ORDER BY tipo, orden',
      [situacion_persistente_id]
    );
  },

  /**
   * Eliminar multimedia
   */
  async deleteMultimedia(id: number): Promise<void> {
    await db.none('DELETE FROM multimedia_situacion_persistente WHERE id = $1', [id]);
  },

  /**
   * Obtener resumen de multimedia (conteo de fotos y videos)
   */
  async getMultimediaResumen(situacion_persistente_id: number): Promise<{
    fotos: number;
    videos: number;
    completo: boolean;
  }> {
    const result = await db.one<{ fotos: string; videos: string }>(`
      SELECT
        COUNT(*) FILTER (WHERE tipo = 'foto') as fotos,
        COUNT(*) FILTER (WHERE tipo = 'video') as videos
      FROM multimedia_situacion_persistente
      WHERE situacion_persistente_id = $1
    `, [situacion_persistente_id]);

    const fotos = parseInt(result.fotos, 10);
    const videos = parseInt(result.videos, 10);

    return {
      fotos,
      videos,
      completo: fotos >= 3 && videos >= 1
    };
  },

  // ========================================
  // CREACIÓN COMPLETA
  // ========================================

  /**
   * Crear situación persistente con todos los datos de emergencia vial
   */
  async crearCompleta(data: {
    // Datos básicos
    titulo: string;
    tipo_emergencia_id: number;
    importancia?: ImportanciaSituacionPersistente;
    ruta_id?: number;
    km_inicio?: number;
    km_fin?: number;
    sentido?: string;
    latitud?: number;
    longitud?: number;
    jurisdiccion?: string;
    descripcion?: string;
    creado_por: number;
    // Obstrucción (nuevo modelo v2)
    obstruccion?: {
      hay_vehiculo_fuera_via: boolean;
      tipo_obstruccion: TipoObstruccion;
      sentido_principal?: SentidoObstruccion | null;
      sentido_contrario?: SentidoObstruccion | null;
      descripcion_manual?: string;
    };
    // Autoridades
    autoridades?: Array<Omit<AutoridadPersistente, 'id' | 'situacion_persistente_id'>>;
    // Socorro
    socorro?: Array<Omit<SocorroPersistente, 'id' | 'situacion_persistente_id'>>;
  }): Promise<SituacionPersistenteCompleta> {
    // Obtener tipo de emergencia
    const tipoEmergencia = await db.oneOrNone<TipoEmergenciaVial>(
      "SELECT id, nombre, icono, color, activo FROM tipo_situacion_catalogo WHERE categoria = 'EMERGENCIA' AND id = $1",
      [data.tipo_emergencia_id]
    );

    // Generar número
    const numero = await db.one<{ numero: string }>(`
      SELECT 'SP-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
             LPAD((COALESCE(MAX(CAST(SUBSTRING(numero FROM 9) AS INTEGER)), 0) + 1)::TEXT, 4, '0') as numero
      FROM situacion_persistente
      WHERE numero LIKE 'SP-' || TO_CHAR(NOW(), 'YYYY') || '-%'
    `);

    // Crear situación base
    const situacion = await db.one<SituacionPersistente>(`
      INSERT INTO situacion_persistente (
        numero, titulo, tipo, tipo_emergencia_id,
        importancia, ruta_id, km_inicio, km_fin, sentido,
        latitud, longitud, jurisdiccion, descripcion,
        estado, creado_por, fecha_inicio
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'ACTIVA', $14, NOW())
      RETURNING *
    `, [
      numero.numero,
      data.titulo,
      tipoEmergencia?.codigo || 'OTRO',
      data.tipo_emergencia_id,
      data.importancia || 'ALTA',
      data.ruta_id || null,
      data.km_inicio || null,
      data.km_fin || null,
      data.sentido || null,
      data.latitud || null,
      data.longitud || null,
      data.jurisdiccion || null,
      data.descripcion || null,
      data.creado_por
    ]);

    // Guardar obstrucción si existe (nuevo modelo v2)
    if (data.obstruccion) {
      await this.saveObstruccion({
        situacion_persistente_id: situacion.id,
        hay_vehiculo_fuera_via: data.obstruccion.hay_vehiculo_fuera_via,
        tipo_obstruccion: data.obstruccion.tipo_obstruccion,
        sentido_principal: data.obstruccion.sentido_principal || null,
        sentido_contrario: data.obstruccion.sentido_contrario || null,
        descripcion_manual: data.obstruccion.descripcion_manual
      });
    }

    // Guardar autoridades si existen
    if (data.autoridades && data.autoridades.length > 0) {
      await this.saveAutoridades(situacion.id, data.autoridades);
    }

    // Guardar socorro si existe
    if (data.socorro && data.socorro.length > 0) {
      await this.saveSocorro(situacion.id, data.socorro);
    }

    // Registrar actualización de creación
    await this.agregarActualizacion({
      situacion_persistente_id: situacion.id,
      usuario_id: data.creado_por,
      unidad_id: 0, // Sin unidad asignada aún
      tipo_actualizacion: 'CREACION',
      contenido: 'Situación persistente creada desde COP'
    }).catch(() => {
      // Ignorar error si no hay unidad
    });

    // Retornar situación completa
    const completa = await this.getById(situacion.id);
    if (!completa) {
      throw new Error('Error al obtener la situación creada');
    }
    return completa;
  },
};
