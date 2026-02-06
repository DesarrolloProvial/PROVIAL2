import { db } from '../config/database';

export interface Aseguradora {
  id: number;
  nombre: string;
  empresa: string | null;
  telefono: string | null;
  activa: boolean;
  created_at: Date;
}

export interface CreateAseguradoraDTO {
  nombre: string;
  empresa?: string;
  telefono?: string;
}

export const AseguradoraModel = {
  // Obtener o crear aseguradora (getOrCreate)
  async getOrCreate(data: CreateAseguradoraDTO): Promise<Aseguradora> {
    const existing = await this.findByNombre(data.nombre);
    if (existing) {
      return existing;
    }
    return this.upsert(data);
  },

  // Buscar por nombre
  async findByNombre(nombre: string): Promise<Aseguradora | null> {
    return db.oneOrNone(
      `SELECT * FROM aseguradora WHERE nombre = $1`,
      [nombre]
    );
  },

  // Buscar por ID
  async findById(id: number): Promise<Aseguradora | null> {
    return db.oneOrNone(
      `SELECT * FROM aseguradora WHERE id = $1`,
      [id]
    );
  },

  // Crear o actualizar aseguradora (upsert por nombre)
  async upsert(data: CreateAseguradoraDTO): Promise<Aseguradora> {
    return db.one(
      `INSERT INTO aseguradora (nombre, empresa, telefono)
       VALUES ($1, $2, $3)
       ON CONFLICT (nombre) DO UPDATE SET
         empresa = EXCLUDED.empresa,
         telefono = EXCLUDED.telefono
       RETURNING *`,
      [data.nombre, data.empresa || null, data.telefono || null]
    );
  },

  // Listar todas las aseguradoras activas
  async findAllActive(): Promise<Aseguradora[]> {
    return db.manyOrNone(
      `SELECT * FROM aseguradora
       WHERE activa = TRUE
       ORDER BY nombre ASC`,
      []
    );
  },

  // Obtener historial de incidentes de la aseguradora
  async getHistorial(aseguradoraId: number): Promise<any[]> {
    return db.manyOrNone(
      `SELECT
        i.*,
        th.nombre as tipo_hecho_nombre,
        r.codigo as ruta_codigo,
        r.nombre as ruta_nombre,
        iv.numero_poliza,
        v.placa as vehiculo_placa,
        u.nombre_completo as reportado_por
       FROM incidente i
       JOIN incidente_vehiculo iv ON i.id = iv.incidente_id
       JOIN aseguradora a ON iv.aseguradora_id = a.id
       LEFT JOIN vehiculo v ON iv.vehiculo_id = v.id
       LEFT JOIN tipo_hecho th ON i.tipo_hecho_id = th.id
       LEFT JOIN ruta r ON i.ruta_id = r.id
       LEFT JOIN usuario u ON i.created_by = u.id
       WHERE a.id = $1
       ORDER BY i.created_at DESC`,
      [aseguradoraId]
    );
  },

  // Actualizar datos de la aseguradora
  async update(aseguradoraId: number, data: Partial<CreateAseguradoraDTO>): Promise<Aseguradora | null> {
    const existing = await this.findById(aseguradoraId);
    if (!existing) {
      return null;
    }

    return this.upsert({
      nombre: data.nombre || existing.nombre,
      ...data
    } as CreateAseguradoraDTO);
  },

  // Desactivar aseguradora
  async deactivate(id: number): Promise<boolean> {
    const result = await db.result(
      `UPDATE aseguradora SET activa = FALSE WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  },

  // Activar aseguradora
  async activate(id: number): Promise<boolean> {
    const result = await db.result(
      `UPDATE aseguradora SET activa = TRUE WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  }
};
