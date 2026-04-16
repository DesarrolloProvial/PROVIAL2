import { db } from '../config/database';

// ========================================
// INTERFACES
// ========================================

export type TipoCalendario = 'TRABAJO' | 'DESCANSO';

export interface CalendarioGrupo {
  id: number;
  grupo: number;
  fecha: string;
  estado: TipoCalendario;
  observaciones: string | null;
  created_at: Date;
}

export interface EstadoGrupoHoy {
  grupo: number;
  fecha: string;
  estado: TipoCalendario;
  observaciones: string | null;
}

export interface BrigadaActiva {
  usuario_id: number;
  nombre: string;
  grupo: number;
  exento_grupos: boolean;
  acceso_app_activo: boolean;
  tiene_asignacion: boolean;
  unidad_id: number | null;
  unidad_codigo: string | null;
  asignacion_id: number | null;
}

export interface VerificacionAccesoResult {
  tiene_acceso: boolean;
  motivo_bloqueo: string | null;
}

// ========================================
// MODEL
// ========================================

export const GrupoModel = {
  /**
   * Generar calendario de grupos para un rango de fechas
   */
  async generarCalendario(
    fecha_inicio: Date,
    fecha_fin: Date,
    grupo_1_fecha_inicio_ciclo: Date,
    grupo_2_fecha_inicio_ciclo: Date
  ): Promise<void> {
    const query = `
      SELECT generar_calendario_grupos($1::DATE, $2::DATE, $3::DATE, $4::DATE)
    `;

    await db.none(query, [fecha_inicio, fecha_fin, grupo_1_fecha_inicio_ciclo, grupo_2_fecha_inicio_ciclo]);
  },

  /**
   * Obtener estado de grupos para hoy
   */
  async getEstadoGruposHoy(): Promise<EstadoGrupoHoy[]> {
    return db.manyOrNone('SELECT * FROM v_estado_grupos_hoy ORDER BY grupo');
  },

  /**
   * Obtener estado de un grupo específico en una fecha
   */
  async getEstadoGrupo(grupo: number, fecha?: Date): Promise<CalendarioGrupo | null> {
    const query = `
      SELECT * FROM calendario_grupo
      WHERE grupo = $1
        AND fecha = COALESCE($2::DATE, CURRENT_DATE)
      ORDER BY fecha DESC
      LIMIT 1
    `;

    return db.oneOrNone(query, [grupo, fecha || null]);
  },

  /**
   * Obtener calendario de un grupo para un rango de fechas
   */
  async getCalendarioGrupo(
    grupo: number,
    fecha_inicio: Date,
    fecha_fin: Date
  ): Promise<CalendarioGrupo[]> {
    const query = `
      SELECT * FROM calendario_grupo
      WHERE grupo = $1
        AND fecha BETWEEN $2::DATE AND $3::DATE
      ORDER BY fecha ASC
    `;

    return db.manyOrNone(query, [grupo, fecha_inicio, fecha_fin]);
  },

  /**
   * Actualizar entrada de calendario (cambiar tipo o agregar observaciones)
   */
  async updateCalendario(
    grupo: number,
    fecha: Date,
    data: {
      estado?: TipoCalendario;
      observaciones?: string;
    }
  ): Promise<CalendarioGrupo | null> {
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.estado !== undefined) {
      setClauses.push(`estado = $${paramIndex++}`);
      params.push(data.estado);
    }

    if (data.observaciones !== undefined) {
      setClauses.push(`observaciones = $${paramIndex++}`);
      params.push(data.observaciones);
    }

    if (setClauses.length === 0) {
      // Nothing to update, return current state
      const query = `SELECT * FROM calendario_grupo WHERE grupo = $1 AND fecha = $2`;
      return db.oneOrNone(query, [grupo, fecha]);
    }

    params.push(grupo, fecha);

    const query = `
      UPDATE calendario_grupo
      SET ${setClauses.join(', ')}
      WHERE grupo = $${paramIndex++} AND fecha = $${paramIndex++}
      RETURNING *
    `;

    return db.one(query, params);
  },

  /**
   * Establecer estado de grupo para un rango de fechas (Gestión Manual)
   */
  async setEstadoGrupoRango(
    grupo: number,
    fecha_inicio: Date,
    fecha_fin: Date,
    estado: TipoCalendario,
    observaciones?: string
  ): Promise<void> {
    const query = `
      INSERT INTO calendario_grupo (grupo, fecha, estado, observaciones, created_at)
      SELECT $1, d::DATE, $4, $5, NOW()
      FROM generate_series($2::DATE, $3::DATE, '1 day'::INTERVAL) d
      ON CONFLICT (grupo, fecha) 
      DO UPDATE SET 
        estado = EXCLUDED.estado,
        observaciones = COALESCE(EXCLUDED.observaciones, calendario_grupo.observaciones);
    `;

    await db.none(query, [grupo, fecha_inicio, fecha_fin, estado, observaciones || null]);
  },

  /**
   * Verificar si un usuario tiene acceso a la app
   */
  async verificarAccesoApp(usuario_id: number): Promise<VerificacionAccesoResult> {
    const query = `SELECT * FROM verificar_acceso_app($1)`;
    return db.one(query, [usuario_id]);
  },

  /**
   * Obtener brigadas activas en este momento
   */
  async getBrigadasActivas(): Promise<BrigadaActiva[]> {
    return db.manyOrNone('SELECT * FROM v_brigadas_activas_ahora ORDER BY nombre');
  },

  /**
   * Obtener brigadas de un grupo específico
   */
  async getBrigadasPorGrupo(grupo: number): Promise<any[]> {
    const query = `
      SELECT
        u.id,
        u.nombre,
        u.grupo,
        u.exento_grupos,
        u.acceso_app_activo,
        u.fecha_inicio_ciclo,
        u.email,
        u.rol,
        u.activo
      FROM usuario u
      WHERE u.grupo = $1
        AND u.activo = TRUE
      ORDER BY u.nombre
    `;

    return db.manyOrNone(query, [grupo]);
  },

  /**
   * Suspender/activar acceso individual de un brigada
   */
  async toggleAccesoIndividual(
    usuario_id: number,
    acceso_app_activo: boolean,
    _motivo: string,
    _modificado_por: number
  ): Promise<any> {
    const query = `
      UPDATE usuario
      SET acceso_app_activo = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, nombre, grupo, acceso_app_activo
    `;

    // La función validar_suspension_acceso se ejecutará automáticamente via trigger
    // Si la suspensión no es válida (brigada tiene asignación activa), lanzará error
    return db.one(query, [acceso_app_activo, usuario_id]);
  },

  /**
   * Actualizar grupo de un brigada
   */
  async actualizarGrupoBrigada(
    usuario_id: number,
    nuevo_grupo: number,
    fecha_inicio_ciclo: Date,
    _motivo: string,
    _modificado_por: number
  ): Promise<any> {
    const query = `
      UPDATE usuario
      SET
        grupo = $1,
        fecha_inicio_ciclo = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING id, nombre, grupo, fecha_inicio_ciclo
    `;

    return db.one(query, [nuevo_grupo, fecha_inicio_ciclo, usuario_id]);
  },

  /**
   * Marcar/desmarcar usuario como exento de grupos
   */
  async toggleExentoGrupos(usuario_id: number, exento: boolean): Promise<any> {
    const query = `
      UPDATE usuario
      SET exento_grupos = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, nombre, rol, exento_grupos
    `;

    return db.one(query, [exento, usuario_id]);
  },
};
