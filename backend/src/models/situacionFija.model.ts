/**
 * Modelo para Situaciones Fijas/Recurrentes
 * Situaciones que se repiten frecuentemente (ampliación carril, regulaciones, etc)
 */

import { db } from '../config/database';

export interface SituacionFija {
  id: number;
  sede_id: number;
  titulo: string;
  descripcion: string | null;
  tipo: 'AMPLIACION_CARRIL' | 'OBRA' | 'EVENTO' | 'REGULACION' | 'OTRO';
  ruta_id: number | null;
  km_inicio: number | null;
  km_fin: number | null;
  punto_referencia: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  dias_semana: string[] | null;
  fecha_inicio: Date;
  fecha_fin: Date | null;
  activa: boolean;
  observaciones: string | null;
  puntos_destacar: string | null;
  requiere_unidad_especifica: boolean;
  unidad_tipo_requerido: string | null;
  creado_por: number;
  created_at: Date;
  updated_at: Date;
  // Joins
  ruta_nombre?: string;
  ruta_codigo?: string;
  sede_nombre?: string;
  creador_nombre?: string;
}

export interface CreateSituacionFijaParams {
  sede_id: number;
  titulo: string;
  descripcion?: string;
  tipo: string;
  ruta_id?: number;
  km_inicio?: number;
  km_fin?: number;
  punto_referencia?: string;
  hora_inicio?: string;
  hora_fin?: string;
  dias_semana?: string[];
  fecha_inicio: string;
  fecha_fin?: string;
  observaciones?: string;
  puntos_destacar?: string;
  requiere_unidad_especifica?: boolean;
  unidad_tipo_requerido?: string;
  creado_por: number;
}

export const SituacionFijaModel = {
  /**
   * Crear nueva situación fija
   */
  async create(params: CreateSituacionFijaParams): Promise<SituacionFija> {
    return db.one(
      `INSERT INTO situacion_fija (
        sede_id, titulo, descripcion, tipo, ruta_id,
        km_inicio, km_fin, punto_referencia,
        hora_inicio, hora_fin, dias_semana,
        fecha_inicio, fecha_fin,
        observaciones, puntos_destacar,
        requiere_unidad_especifica, unidad_tipo_requerido,
        creado_por
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11,
        $12, $13,
        $14, $15,
        $16, $17,
        $18
      ) RETURNING *`,
      [
        params.sede_id,
        params.titulo,
        params.descripcion || null,
        params.tipo,
        params.ruta_id || null,
        params.km_inicio || null,
        params.km_fin || null,
        params.punto_referencia || null,
        params.hora_inicio || null,
        params.hora_fin || null,
        params.dias_semana || null,
        params.fecha_inicio,
        params.fecha_fin || null,
        params.observaciones || null,
        params.puntos_destacar || null,
        params.requiere_unidad_especifica || false,
        params.unidad_tipo_requerido || null,
        params.creado_por
      ]
    );
  },

  /**
   * Obtener situaciones fijas activas de una sede
   */
  async getActivasBySede(sedeId: number): Promise<SituacionFija[]> {
    return db.manyOrNone(
      `SELECT sf.*,
              r.nombre as ruta_nombre,
              r.codigo as ruta_codigo,
              s.nombre as sede_nombre,
              u.nombre_completo as creador_nombre
       FROM situacion_fija sf
       LEFT JOIN ruta r ON sf.ruta_id = r.id
       LEFT JOIN sede s ON sf.sede_id = s.id
       LEFT JOIN usuario u ON sf.creado_por = u.id
       WHERE sf.sede_id = $1
         AND sf.activa = true
         AND (sf.fecha_fin IS NULL OR sf.fecha_fin >= CURRENT_DATE)
       ORDER BY sf.titulo`,
      [sedeId]
    );
  },

  /**
   * Obtener todas las situaciones fijas (para admin)
   */
  async getAll(options?: { sedeId?: number; incluirInactivas?: boolean }): Promise<SituacionFija[]> {
    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (options?.sedeId) {
      params.push(options.sedeId);
      where += ` AND sf.sede_id = $${params.length}`;
    }

    if (!options?.incluirInactivas) {
      where += ` AND sf.activa = true`;
    }

    return db.manyOrNone(
      `SELECT sf.*,
              r.nombre as ruta_nombre,
              r.codigo as ruta_codigo,
              s.nombre as sede_nombre,
              u.nombre_completo as creador_nombre
       FROM situacion_fija sf
       LEFT JOIN ruta r ON sf.ruta_id = r.id
       LEFT JOIN sede s ON sf.sede_id = s.id
       LEFT JOIN usuario u ON sf.creado_por = u.id
       ${where}
       ORDER BY s.nombre, sf.titulo`,
      params
    );
  },

  /**
   * Obtener situación fija por ID
   */
  async getById(id: number): Promise<SituacionFija | null> {
    return db.oneOrNone(
      `SELECT sf.*,
              r.nombre as ruta_nombre,
              r.codigo as ruta_codigo,
              s.nombre as sede_nombre,
              u.nombre_completo as creador_nombre
       FROM situacion_fija sf
       LEFT JOIN ruta r ON sf.ruta_id = r.id
       LEFT JOIN sede s ON sf.sede_id = s.id
       LEFT JOIN usuario u ON sf.creado_por = u.id
       WHERE sf.id = $1`,
      [id]
    );
  },

  /**
   * Actualizar situación fija
   */
  async update(id: number, params: Partial<CreateSituacionFijaParams>): Promise<SituacionFija | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const fieldMap: Record<string, string> = {
      titulo: 'titulo',
      descripcion: 'descripcion',
      tipo: 'tipo',
      ruta_id: 'ruta_id',
      km_inicio: 'km_inicio',
      km_fin: 'km_fin',
      punto_referencia: 'punto_referencia',
      hora_inicio: 'hora_inicio',
      hora_fin: 'hora_fin',
      dias_semana: 'dias_semana',
      fecha_inicio: 'fecha_inicio',
      fecha_fin: 'fecha_fin',
      observaciones: 'observaciones',
      puntos_destacar: 'puntos_destacar',
      requiere_unidad_especifica: 'requiere_unidad_especifica',
      unidad_tipo_requerido: 'unidad_tipo_requerido'
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if ((params as any)[key] !== undefined) {
        updates.push(`${column} = $${paramCount++}`);
        values.push((params as any)[key]);
      }
    }

    if (updates.length === 0) return this.getById(id);

    updates.push(`updated_at = NOW()`);
    values.push(id);

    return db.oneOrNone(
      `UPDATE situacion_fija
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );
  },

  /**
   * Desactivar situación fija
   */
  async desactivar(id: number): Promise<boolean> {
    const result = await db.result(
      `UPDATE situacion_fija SET activa = false, updated_at = NOW() WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  },

  /**
   * Contar veces que un brigada ha sido asignado a esta situación
   */
  async contarAsignacionesBrigada(situacionFijaId: number, usuarioId: number, dias: number = 30): Promise<number> {
    const result = await db.one(
      `SELECT contar_veces_en_situacion($1, $2, $3) as count`,
      [usuarioId, situacionFijaId, dias]
    );
    return result.count;
  }
};
