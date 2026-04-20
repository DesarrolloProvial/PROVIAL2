import { db } from '../../config/database';

export interface CreateUnidadData {
  codigo: string;
  tipo_unidad: string;
  marca?: string | null;
  modelo?: string | null;
  anio?: number | null;
  placa?: string | null;
  sede_id: number;
  tipo_combustible?: string;
  custom_fields?: object;
}

export interface UpdateUnidadData {
  tipo_unidad?: string | null;
  marca?: string | null;
  modelo?: string | null;
  anio?: number | null;
  placa?: string | null;
  sede_id?: number | null;
  tipo_combustible?: string | null;
  custom_fields?: object | null;
}

export const UnidadModel = {
  async getAll(filters: {
    sede_id?: string;
    activa?: boolean;
    tipo_unidad?: string;
    search?: string;
    filtrarPorSede?: number;
  }): Promise<any[]> {
    const conditions: string[] = ['1=1'];
    const params: Record<string, any> = {};

    if (filters.filtrarPorSede !== undefined) {
      conditions.push('u.sede_id = $/filtrarPorSede/');
      params.filtrarPorSede = filters.filtrarPorSede;
    } else if (filters.sede_id) {
      conditions.push('u.sede_id = $/sede_id/');
      params.sede_id = filters.sede_id;
    }

    if (filters.activa !== undefined) {
      conditions.push('u.activa = $/activa/');
      params.activa = filters.activa;
    }

    if (filters.tipo_unidad) {
      conditions.push('u.tipo_unidad = $/tipo_unidad/');
      params.tipo_unidad = filters.tipo_unidad;
    }

    if (filters.search) {
      conditions.push(
        `(u.codigo ILIKE $/search/ OR u.placa ILIKE $/search/ OR u.marca ILIKE $/search/)`
      );
      params.search = `%${filters.search}%`;
    }

    return db.any(
      `SELECT u.*, s.nombre AS sede_nombre,
              (rep.id IS NOT NULL) AS en_reparacion,
              rep.id               AS reparacion_id,
              rep.motivo           AS reparacion_motivo
       FROM unidad u
       JOIN sede s ON u.sede_id = s.id
       LEFT JOIN unidad_reparacion rep ON rep.unidad_id = u.id AND rep.estado = 'EN_REPARACION'
       WHERE ${conditions.join(' AND ')}
       ORDER BY u.codigo`,
      params
    );
  },

  async getActivas(sedeId?: number): Promise<any[]> {
    return db.any(
      `SELECT u.*, s.nombre AS sede_nombre
       FROM unidad u
       JOIN sede s ON u.sede_id = s.id
       WHERE u.activa = true
         AND ($1::int IS NULL OR u.sede_id = $1)
       ORDER BY u.codigo`,
      [sedeId ?? null]
    );
  },

  async getTipos(): Promise<string[]> {
    const rows = await db.any(
      `SELECT DISTINCT tipo_unidad FROM unidad ORDER BY tipo_unidad`
    );
    return rows.map((r: any) => r.tipo_unidad);
  },

  async getById(id: number): Promise<any | null> {
    return db.oneOrNone(
      `SELECT u.*, s.nombre AS sede_nombre
       FROM unidad u
       JOIN sede s ON u.sede_id = s.id
       WHERE u.id = $1`,
      [id]
    );
  },

  async getByIdSimple(id: number): Promise<any | null> {
    return db.oneOrNone(`SELECT id FROM unidad WHERE id = $1`, [id]);
  },

  async getByCodigo(codigo: string): Promise<any | null> {
    return db.oneOrNone(
      `SELECT u.id, u.codigo, u.sede_id, s.nombre AS sede_nombre
       FROM unidad u
       JOIN sede s ON u.sede_id = s.id
       WHERE u.codigo = $1 AND u.activa = true`,
      [codigo]
    );
  },

  async existeCodigo(codigo: string): Promise<boolean> {
    const row = await db.oneOrNone(`SELECT id FROM unidad WHERE codigo = $1`, [codigo]);
    return !!row;
  },

  async crear(data: CreateUnidadData): Promise<any> {
    const tipoCombustible = ['GASOLINA', 'DIESEL'].includes(data.tipo_combustible ?? '')
      ? data.tipo_combustible
      : 'GASOLINA';

    return db.one(
      `INSERT INTO unidad (codigo, tipo_unidad, marca, modelo, anio, placa, sede_id, tipo_combustible, custom_fields)
       VALUES ($/codigo/, $/tipo_unidad/, $/marca/, $/modelo/, $/anio/, $/placa/, $/sede_id/, $/tipo_combustible/, $/custom_fields/)
       RETURNING *`,
      {
        codigo: data.codigo,
        tipo_unidad: data.tipo_unidad,
        marca: data.marca ?? null,
        modelo: data.modelo ?? null,
        anio: data.anio ?? null,
        placa: data.placa ?? null,
        sede_id: data.sede_id,
        tipo_combustible: tipoCombustible,
        custom_fields: data.custom_fields ?? {},
      }
    );
  },

  async actualizar(id: number, data: UpdateUnidadData): Promise<any> {
    return db.one(
      `UPDATE unidad SET
         tipo_unidad       = COALESCE($/tipo_unidad/,      tipo_unidad),
         marca             = COALESCE($/marca/,            marca),
         modelo            = COALESCE($/modelo/,           modelo),
         anio              = COALESCE($/anio/,             anio),
         placa             = COALESCE($/placa/,            placa),
         sede_id           = COALESCE($/sede_id/,          sede_id),
         tipo_combustible  = COALESCE($/tipo_combustible/, tipo_combustible),
         custom_fields     = COALESCE($/custom_fields/,    custom_fields),
         updated_at        = NOW()
       WHERE id = $/id/
       RETURNING *`,
      { ...data, id }
    );
  },

  async setActiva(id: number, activa: boolean): Promise<void> {
    await db.none(
      `UPDATE unidad SET activa = $1, updated_at = NOW() WHERE id = $2`,
      [activa, id]
    );
  },

  async transferir(id: number, nuevaSedeId: number): Promise<void> {
    await db.none(
      `UPDATE unidad SET sede_id = $1, updated_at = NOW() WHERE id = $2`,
      [nuevaSedeId, id]
    );
  },

  async tieneHistorialAsignaciones(id: number): Promise<boolean> {
    const row = await db.oneOrNone(
      `SELECT 1 FROM asignacion_unidad WHERE unidad_id = $1 LIMIT 1`,
      [id]
    );
    return !!row;
  },

  async eliminar(id: number): Promise<void> {
    await db.none(`DELETE FROM unidad WHERE id = $1`, [id]);
  },

  async getSalidaActiva(unidadId: number): Promise<any | null> {
    return db.oneOrNone(
      `SELECT su.id AS salida_id, su.asignacion_id,
              au.unidad_id, au.sede_id, au.turno_id,
              t.fecha AS fecha_turno
       FROM salida_unidad su
       JOIN asignacion_unidad au ON su.asignacion_id = au.id
       JOIN turno t ON au.turno_id = t.id
       WHERE au.unidad_id = $1
         AND su.hora_salida_sede IS NOT NULL
         AND su.hora_llegada_sede IS NULL
       ORDER BY su.hora_salida_sede DESC
       LIMIT 1`,
      [unidadId]
    );
  },

  async contarSituacionesSalida(salidaId: number): Promise<number> {
    const row = await db.one(
      `SELECT COUNT(*) AS total FROM situacion WHERE salida_unidad_id = $1`,
      [salidaId]
    );
    return parseInt(row.total, 10);
  },

  async setDisponibilidad(id: number, disponible: boolean, instrucciones?: string | null): Promise<any> {
    await db.none(
      `UPDATE unidad
       SET disponible_transportes    = $1,
           instrucciones_transportes = $2,
           updated_at                = NOW()
       WHERE id = $3`,
      [disponible, instrucciones ?? null, id]
    );
    return db.one(
      `SELECT u.*, s.nombre AS sede_nombre FROM unidad u JOIN sede s ON u.sede_id = s.id WHERE u.id = $1`,
      [id]
    );
  },

  async existeSede(sedeId: number): Promise<boolean> {
    const row = await db.oneOrNone(`SELECT id FROM sede WHERE id = $1`, [sedeId]);
    return !!row;
  },
};
