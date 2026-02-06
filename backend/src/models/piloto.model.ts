import { db } from '../config/database';

export interface Piloto {
  id: number;
  nombre: string;
  licencia_tipo: 'A' | 'B' | 'C' | 'M' | 'E' | null;
  licencia_numero: bigint;
  licencia_vencimiento: Date | null;
  licencia_antiguedad: number | null;
  fecha_nacimiento: Date | null;
  etnia: string | null;
  sexo: string | null;
  total_incidentes: number;
  total_sanciones: number;
  primer_incidente: Date | null;
  ultimo_incidente: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePilotoDTO {
  nombre: string;
  licencia_tipo?: 'A' | 'B' | 'C' | 'M' | 'E';
  licencia_numero: bigint;
  licencia_vencimiento?: Date;
  licencia_antiguedad?: number;
  fecha_nacimiento?: Date;
  etnia?: string;
  sexo?: string;
}

export const PilotoModel = {
  // Obtener o crear piloto (getOrCreate)
  async getOrCreate(data: CreatePilotoDTO): Promise<Piloto> {
    const existing = await this.findByLicencia(data.licencia_numero);
    if (existing) {
      return existing;
    }
    return this.upsert(data);
  },

  // Buscar por número de licencia
  async findByLicencia(licenciaNumero: bigint): Promise<Piloto | null> {
    return db.oneOrNone(
      `SELECT * FROM piloto WHERE licencia_numero = $1`,
      [licenciaNumero]
    );
  },

  // Buscar por ID
  async findById(id: number): Promise<Piloto | null> {
    return db.oneOrNone(
      `SELECT * FROM piloto WHERE id = $1`,
      [id]
    );
  },

  // Crear o actualizar piloto (upsert por licencia)
  async upsert(data: CreatePilotoDTO): Promise<Piloto> {
    return db.one(
      `INSERT INTO piloto (
        nombre, licencia_tipo, licencia_numero, licencia_vencimiento,
        licencia_antiguedad, fecha_nacimiento, etnia, sexo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (licencia_numero) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        licencia_tipo = EXCLUDED.licencia_tipo,
        licencia_vencimiento = EXCLUDED.licencia_vencimiento,
        licencia_antiguedad = EXCLUDED.licencia_antiguedad,
        fecha_nacimiento = EXCLUDED.fecha_nacimiento,
        etnia = EXCLUDED.etnia,
        sexo = EXCLUDED.sexo,
        updated_at = NOW()
      RETURNING *`,
      [
        data.nombre,
        data.licencia_tipo || null,
        data.licencia_numero,
        data.licencia_vencimiento || null,
        data.licencia_antiguedad || null,
        data.fecha_nacimiento || null,
        data.etnia || null,
        data.sexo || null
      ]
    );
  },

  // Obtener historial de incidentes del piloto
  async getHistorial(licenciaNumero: bigint): Promise<any[]> {
    return db.manyOrNone(
      `SELECT
        i.*,
        th.nombre as tipo_hecho_nombre,
        r.codigo as ruta_codigo,
        r.nombre as ruta_nombre,
        iv.estado_piloto,
        iv.personas_asistidas,
        v.placa as vehiculo_placa,
        v.color as vehiculo_color,
        tv.nombre as vehiculo_tipo,
        u.nombre_completo as reportado_por
       FROM incidente i
       JOIN incidente_vehiculo iv ON i.id = iv.incidente_id
       JOIN piloto p ON iv.piloto_id = p.id
       LEFT JOIN vehiculo v ON iv.vehiculo_id = v.id
       LEFT JOIN tipo_vehiculo tv ON v.tipo_vehiculo_id = tv.id
       LEFT JOIN tipo_hecho th ON i.tipo_hecho_id = th.id
       LEFT JOIN ruta r ON i.ruta_id = r.id
       LEFT JOIN usuario u ON i.created_by = u.id
       WHERE p.licencia_numero = $1
       ORDER BY i.created_at DESC`,
      [licenciaNumero]
    );
  },

  // Actualizar datos del piloto
  async update(licenciaNumero: bigint, data: Partial<CreatePilotoDTO>): Promise<Piloto | null> {
    const existing = await this.findByLicencia(licenciaNumero);
    if (!existing) {
      return null;
    }

    return this.upsert({
      licencia_numero: licenciaNumero,
      nombre: data.nombre || existing.nombre,
      ...data
    } as CreatePilotoDTO);
  },

  // Buscar pilotos con más incidentes
  async findTopByIncidentes(limit: number = 10): Promise<Piloto[]> {
    return db.manyOrNone(
      `SELECT * FROM piloto
       WHERE total_incidentes > 0
       ORDER BY total_incidentes DESC
       LIMIT $1`,
      [limit]
    );
  },

  // Buscar pilotos con más sanciones
  async findTopBySanciones(limit: number = 10): Promise<Piloto[]> {
    return db.manyOrNone(
      `SELECT * FROM piloto
       WHERE total_sanciones > 0
       ORDER BY total_sanciones DESC
       LIMIT $1`,
      [limit]
    );
  },

  // Verificar si la licencia está vencida
  async isLicenciaVencida(licenciaNumero: bigint): Promise<boolean> {
    const piloto = await db.oneOrNone(
      `SELECT licencia_vencimiento FROM piloto
       WHERE licencia_numero = $1`,
      [licenciaNumero]
    );

    if (!piloto || !piloto.licencia_vencimiento) {
      return false;
    }

    return new Date(piloto.licencia_vencimiento) < new Date();
  },

  // Buscar pilotos con licencias próximas a vencer (en los próximos N días)
  async findLicenciasProximasVencer(dias: number = 30): Promise<Piloto[]> {
    return db.manyOrNone(
      `SELECT * FROM piloto
       WHERE licencia_vencimiento IS NOT NULL
         AND licencia_vencimiento BETWEEN NOW() AND NOW() + INTERVAL '${dias} days'
       ORDER BY licencia_vencimiento ASC`,
      []
    );
  }
};
