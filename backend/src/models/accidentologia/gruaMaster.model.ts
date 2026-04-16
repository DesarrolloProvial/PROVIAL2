import { db } from '../config/database';

export interface GruaMaster {
  id: number;
  nombre: string;
  placa: string | null;
  telefono: string | null;
  empresa: string | null;
  nit: bigint | null;
  total_servicios: number;
  ultima_vez_usado: Date | null;
  activa: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateGruaMasterDTO {
  nombre: string;
  placa?: string;
  telefono?: string;
  empresa?: string;
  nit?: bigint;
}

export interface IncidenteGrua {
  id: number;
  incidente_id: number;
  grua_id: number;
  hora_llamada: string | null; // TIME type
  hora_llegada: string | null; // TIME type
  destino: string | null;
  costo: number | null;
  created_at: Date;
}

export const GruaMasterModel = {
  // Obtener o crear grúa (getOrCreate)
  async getOrCreate(data: CreateGruaMasterDTO): Promise<GruaMaster> {
    // Intentar buscar por placa primero si existe
    if (data.placa) {
      const existing = await this.findByPlaca(data.placa);
      if (existing) {
        return existing;
      }
    }

    // Buscar por nombre y empresa
    const existing = await this.findByNombreEmpresa(data.nombre, data.empresa || null);
    if (existing) {
      return existing;
    }

    return this.upsert(data);
  },

  // Buscar por ID
  async findById(id: number): Promise<GruaMaster | null> {
    return db.oneOrNone(
      `SELECT * FROM grua WHERE id = $1`,
      [id]
    );
  },

  // Buscar por nombre y empresa
  async findByNombreEmpresa(nombre: string, empresa: string | null): Promise<GruaMaster | null> {
    if (empresa) {
      return db.oneOrNone(
        `SELECT * FROM grua WHERE nombre = $1 AND empresa = $2`,
        [nombre, empresa]
      );
    } else {
      return db.oneOrNone(
        `SELECT * FROM grua WHERE nombre = $1 AND empresa IS NULL`,
        [nombre]
      );
    }
  },

  // Buscar por placa
  async findByPlaca(placa: string): Promise<GruaMaster | null> {
    return db.oneOrNone(
      `SELECT * FROM grua WHERE placa = $1`,
      [placa]
    );
  },

  // Crear o actualizar grúa (upsert por nombre y empresa)
  async upsert(data: CreateGruaMasterDTO): Promise<GruaMaster> {
    return db.one(
      `INSERT INTO grua (nombre, placa, telefono, empresa, nit)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (nombre, empresa) DO UPDATE SET
         placa = EXCLUDED.placa,
         telefono = EXCLUDED.telefono,
         nit = EXCLUDED.nit,
         updated_at = NOW()
       RETURNING *`,
      [
        data.nombre,
        data.placa || null,
        data.telefono || null,
        data.empresa || null,
        data.nit || null
      ]
    );
  },

  // Listar todas las grúas activas
  async findAllActive(): Promise<GruaMaster[]> {
    return db.manyOrNone(
      `SELECT * FROM grua
       WHERE activa = TRUE
       ORDER BY nombre ASC`,
      []
    );
  },

  // Obtener historial de servicios de la grúa
  async getHistorial(gruaId: number): Promise<any[]> {
    return db.manyOrNone(
      `SELECT
        i.*,
        th.nombre as tipo_hecho_nombre,
        r.codigo as ruta_codigo,
        r.nombre as ruta_nombre,
        ig.hora_llamada,
        ig.hora_llegada,
        ig.destino,
        ig.costo,
        u.nombre_completo as reportado_por
       FROM incidente i
       JOIN incidente_grua ig ON i.id = ig.incidente_id
       JOIN grua g ON ig.grua_id = g.id
       LEFT JOIN tipo_hecho th ON i.tipo_hecho_id = th.id
       LEFT JOIN ruta r ON i.ruta_id = r.id
       LEFT JOIN usuario u ON i.created_by = u.id
       WHERE g.id = $1
       ORDER BY i.created_at DESC`,
      [gruaId]
    );
  },

  // Actualizar datos de la grúa
  async update(gruaId: number, data: Partial<CreateGruaMasterDTO>): Promise<GruaMaster | null> {
    const existing = await this.findById(gruaId);
    if (!existing) {
      return null;
    }

    return this.upsert({
      nombre: data.nombre || existing.nombre,
      ...data
    } as CreateGruaMasterDTO);
  },

  // Buscar grúas con más servicios
  async findTopByServicios(limit: number = 10): Promise<GruaMaster[]> {
    return db.manyOrNone(
      `SELECT * FROM grua
       WHERE total_servicios > 0
       ORDER BY total_servicios DESC
       LIMIT $1`,
      [limit]
    );
  },

  // Desactivar grúa
  async deactivate(id: number): Promise<boolean> {
    const result = await db.result(
      `UPDATE grua SET activa = FALSE WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  },

  // Activar grúa
  async activate(id: number): Promise<boolean> {
    const result = await db.result(
      `UPDATE grua SET activa = TRUE WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  },

  // Registrar servicio de grúa en incidente
  async createIncidenteGrua(data: Omit<IncidenteGrua, 'id' | 'created_at'>): Promise<IncidenteGrua> {
    return db.one(
      `INSERT INTO incidente_grua (
        incidente_id, grua_id, hora_llamada, hora_llegada, destino, costo
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        data.incidente_id,
        data.grua_id,
        data.hora_llamada || null,
        data.hora_llegada || null,
        data.destino || null,
        data.costo || null
      ]
    );
  },

  // Obtener servicios de una grúa
  async getServicios(gruaId: number): Promise<IncidenteGrua[]> {
    return db.manyOrNone(
      `SELECT * FROM incidente_grua
       WHERE grua_id = $1
       ORDER BY created_at DESC`,
      [gruaId]
    );
  },

  // Obtener grúas de un incidente
  async getByIncidente(incidenteId: number): Promise<(IncidenteGrua & GruaMaster)[]> {
    return db.manyOrNone(
      `SELECT ig.*, g.*,
              ig.id as incidente_grua_id,
              g.id as grua_id
       FROM incidente_grua ig
       JOIN grua g ON ig.grua_id = g.id
       WHERE ig.incidente_id = $1`,
      [incidenteId]
    );
  }
};
