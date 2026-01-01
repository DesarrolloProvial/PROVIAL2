import { db } from '../config/database';

// ========================================
// INTERFACES
// ========================================

export type TipoCambio =
  | 'MODIFICACION_ASIGNACION_CERRADA'
  | 'MODIFICACION_SITUACION_CERRADA'
  | 'SUSPENSION_ACCESO_APP'
  | 'ACTIVACION_ACCESO_APP'
  | 'CAMBIO_GRUPO'
  | 'CAMBIO_UNIDAD'
  | 'ELIMINACION_ASIGNACION'
  | 'MODIFICACION_DATOS_USUARIO'
  | 'CIERRE_DIA_OPERATIVO'
  | 'APERTURA_DIA_OPERATIVO'
  | 'OTRO';

export interface RegistroCambio {
  id: number;
  tipo_cambio: TipoCambio;
  tabla_afectada: string;
  registro_id: number | null;
  usuario_afectado_id: number | null;
  valores_anteriores: any | null;
  valores_nuevos: any | null;
  motivo: string;
  realizado_por: number;
  created_at: Date;
}

export interface RegistroCambioCompleto extends RegistroCambio {
  usuario_afectado_nombre: string | null;
  realizado_por_nombre: string;
}

// ========================================
// MODEL
// ========================================

export const AuditoriaModel = {
  /**
   * Registrar un cambio manualmente (la función de BD también existe)
   */
  async registrarCambio(data: {
    tipo_cambio: TipoCambio;
    tabla_afectada: string;
    registro_id?: number;
    usuario_afectado_id?: number;
    valores_anteriores?: any;
    valores_nuevos?: any;
    motivo: string;
    realizado_por: number;
  }): Promise<RegistroCambio> {
    const query = `
      INSERT INTO registro_cambio (
        tipo_cambio, tabla_afectada, registro_id, usuario_afectado_id,
        valores_anteriores, valores_nuevos, motivo, realizado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    return db.one(query, [
      data.tipo_cambio,
      data.tabla_afectada,
      data.registro_id || null,
      data.usuario_afectado_id || null,
      data.valores_anteriores || null,
      data.valores_nuevos || null,
      data.motivo,
      data.realizado_por,
    ]);
  },

  /**
   * Obtener registro de cambio por ID
   */
  async getById(id: number): Promise<RegistroCambio | null> {
    return db.oneOrNone('SELECT * FROM registro_cambio WHERE id = $1', [id]);
  },

  /**
   * Obtener historial de cambios con filtros
   */
  async getHistorial(filters?: {
    tipo_cambio?: TipoCambio;
    tabla_afectada?: string;
    usuario_afectado_id?: number;
    realizado_por?: number;
    fecha_desde?: Date;
    fecha_hasta?: Date;
    limit?: number;
    offset?: number;
  }): Promise<RegistroCambioCompleto[]> {
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (filters?.tipo_cambio) {
      whereConditions.push(`rc.tipo_cambio = $${paramIndex++}`);
      params.push(filters.tipo_cambio);
    }

    if (filters?.tabla_afectada) {
      whereConditions.push(`rc.tabla_afectada = $${paramIndex++}`);
      params.push(filters.tabla_afectada);
    }

    if (filters?.usuario_afectado_id) {
      whereConditions.push(`rc.usuario_afectado_id = $${paramIndex++}`);
      params.push(filters.usuario_afectado_id);
    }

    if (filters?.realizado_por) {
      whereConditions.push(`rc.realizado_por = $${paramIndex++}`);
      params.push(filters.realizado_por);
    }

    if (filters?.fecha_desde) {
      whereConditions.push(`rc.created_at >= $${paramIndex++}`);
      params.push(filters.fecha_desde);
    }

    if (filters?.fecha_hasta) {
      whereConditions.push(`rc.created_at <= $${paramIndex++}`);
      params.push(filters.fecha_hasta);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    const query = `
      SELECT
        rc.*,
        ua.nombre_completo as usuario_afectado_nombre,
        rp.nombre_completo as realizado_por_nombre
      FROM registro_cambio rc
      LEFT JOIN usuario ua ON rc.usuario_afectado_id = ua.id
      INNER JOIN usuario rp ON rc.realizado_por = rp.id
      ${whereClause}
      ORDER BY rc.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);

    return db.manyOrNone(query, params);
  },

  /**
   * Obtener historial de cambios de un registro específico
   */
  async getHistorialRegistro(tabla: string, registro_id: number): Promise<RegistroCambioCompleto[]> {
    const query = `
      SELECT
        rc.*,
        ua.nombre_completo as usuario_afectado_nombre,
        rp.nombre_completo as realizado_por_nombre
      FROM registro_cambio rc
      LEFT JOIN usuario ua ON rc.usuario_afectado_id = ua.id
      INNER JOIN usuario rp ON rc.realizado_por = rp.id
      WHERE rc.tabla_afectada = $1 AND rc.registro_id = $2
      ORDER BY rc.created_at DESC
    `;

    return db.manyOrNone(query, [tabla, registro_id]);
  },

  /**
   * Obtener historial de cambios de un usuario
   */
  async getHistorialUsuario(usuario_id: number, limit: number = 50): Promise<RegistroCambioCompleto[]> {
    const query = `
      SELECT
        rc.*,
        ua.nombre_completo as usuario_afectado_nombre,
        rp.nombre_completo as realizado_por_nombre
      FROM registro_cambio rc
      LEFT JOIN usuario ua ON rc.usuario_afectado_id = ua.id
      INNER JOIN usuario rp ON rc.realizado_por = rp.id
      WHERE rc.usuario_afectado_id = $1
      ORDER BY rc.created_at DESC
      LIMIT $2
    `;

    return db.manyOrNone(query, [usuario_id, limit]);
  },

  /**
   * Obtener cambios realizados por un usuario (como auditor)
   */
  async getCambiosRealizadosPor(usuario_id: number, limit: number = 50): Promise<RegistroCambioCompleto[]> {
    const query = `
      SELECT
        rc.*,
        ua.nombre_completo as usuario_afectado_nombre,
        rp.nombre_completo as realizado_por_nombre
      FROM registro_cambio rc
      LEFT JOIN usuario ua ON rc.usuario_afectado_id = ua.id
      INNER JOIN usuario rp ON rc.realizado_por = rp.id
      WHERE rc.realizado_por = $1
      ORDER BY rc.created_at DESC
      LIMIT $2
    `;

    return db.manyOrNone(query, [usuario_id, limit]);
  },

  /**
   * Obtener estadísticas de cambios
   */
  async getEstadisticas(filters?: {
    fecha_desde?: Date;
    fecha_hasta?: Date;
  }): Promise<any> {
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (filters?.fecha_desde) {
      whereConditions.push(`created_at >= $${paramIndex++}`);
      params.push(filters.fecha_desde);
    }

    if (filters?.fecha_hasta) {
      whereConditions.push(`created_at <= $${paramIndex++}`);
      params.push(filters.fecha_hasta);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT
        tipo_cambio,
        COUNT(*) as total,
        COUNT(DISTINCT realizado_por) as usuarios_distintos,
        COUNT(DISTINCT usuario_afectado_id) as usuarios_afectados_distintos
      FROM registro_cambio
      ${whereClause}
      GROUP BY tipo_cambio
      ORDER BY total DESC
    `;

    return db.manyOrNone(query, params);
  },

  /**
   * Buscar en motivos (búsqueda de texto)
   */
  async buscarPorMotivo(texto_busqueda: string, limit: number = 50): Promise<RegistroCambioCompleto[]> {
    const query = `
      SELECT
        rc.*,
        ua.nombre_completo as usuario_afectado_nombre,
        rp.nombre_completo as realizado_por_nombre
      FROM registro_cambio rc
      LEFT JOIN usuario ua ON rc.usuario_afectado_id = ua.id
      INNER JOIN usuario rp ON rc.realizado_por = rp.id
      WHERE rc.motivo ILIKE $1
      ORDER BY rc.created_at DESC
      LIMIT $2
    `;

    return db.manyOrNone(query, [`%${texto_busqueda}%`, limit]);
  },
};
