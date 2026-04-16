import { db } from '../../config/database';

export interface Vehiculo {
  id: number;
  placa: string;
  es_extranjero: boolean;
  tipo_vehiculo_id: number | null;
  tipo_vehiculo_nombre?: string; // Agregado por JOIN
  color: string | null;
  marca_id: number | null;
  marca_nombre?: string; // Agregado por JOIN
  cargado: boolean;
  tipo_carga: string | null;
  total_incidentes: number;
  primer_incidente: Date | null;
  ultimo_incidente: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateVehiculoDTO {
  placa: string;
  es_extranjero?: boolean;
  tipo_vehiculo_id?: number;
  color?: string;
  marca_id?: number;
  cargado?: boolean;
  tipo_carga?: string;
}

export interface TarjetaCirculacion {
  id: number;
  vehiculo_id: number;
  numero: bigint;
  nit: bigint | null;
  direccion_propietario: string | null;
  nombre_propietario: string | null;
  modelo: number | null;
  fecha_registro: Date;
  created_at: Date;
}

export interface Contenedor {
  id: number;
  vehiculo_id: number;
  numero_contenedor: string | null;
  linea_naviera: string | null;
  tipo_contenedor: string | null;
  fecha_registro: Date;
  created_at: Date;
}

export interface Bus {
  id: number;
  vehiculo_id: number;
  empresa: string | null;
  ruta_bus: string | null;
  numero_unidad: string | null;
  capacidad_pasajeros: number | null;
  fecha_registro: Date;
  created_at: Date;
}

export const VehiculoModel = {
  // Obtener o crear vehículo (getOrCreate)
  async getOrCreate(data: CreateVehiculoDTO): Promise<Vehiculo> {
    const existing = await this.findByPlaca(data.placa);
    if (existing) {
      return existing;
    }
    return this.upsert(data);
  },

  // Buscar por placa
  async findByPlaca(placa: string): Promise<Vehiculo | null> {
    return db.oneOrNone(
      `SELECT v.*,
              tv.nombre as tipo_vehiculo_nombre,
              m.nombre as marca_nombre
       FROM vehiculo v
       LEFT JOIN tipo_vehiculo tv ON v.tipo_vehiculo_id = tv.id
       LEFT JOIN marca_vehiculo m ON v.marca_id = m.id
       WHERE v.placa = $1`,
      [placa]
    );
  },

  // Buscar por ID
  async findById(id: number): Promise<Vehiculo | null> {
    return db.oneOrNone(
      `SELECT v.*,
              tv.nombre as tipo_vehiculo_nombre,
              m.nombre as marca_nombre
       FROM vehiculo v
       LEFT JOIN tipo_vehiculo tv ON v.tipo_vehiculo_id = tv.id
       LEFT JOIN marca_vehiculo m ON v.marca_id = m.id
       WHERE v.id = $1`,
      [id]
    );
  },

  // Crear o actualizar vehículo (upsert por placa)
  async upsert(data: CreateVehiculoDTO): Promise<Vehiculo> {
    return db.one(
      `INSERT INTO vehiculo (
        placa, es_extranjero, tipo_vehiculo_id, color, marca_id, cargado, tipo_carga
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (placa) DO UPDATE SET
        es_extranjero = EXCLUDED.es_extranjero,
        tipo_vehiculo_id = EXCLUDED.tipo_vehiculo_id,
        color = EXCLUDED.color,
        marca_id = EXCLUDED.marca_id,
        cargado = EXCLUDED.cargado,
        tipo_carga = EXCLUDED.tipo_carga,
        updated_at = NOW()
      RETURNING *`,
      [
        data.placa,
        data.es_extranjero || false,
        data.tipo_vehiculo_id || null,
        data.color || null,
        data.marca_id || null,
        data.cargado || false,
        data.tipo_carga || null
      ]
    );
  },

  // Obtener historial de incidentes del vehículo
  async getHistorial(placa: string): Promise<any[]> {
    return db.manyOrNone(
      `SELECT
        i.*,
        th.nombre as tipo_hecho_nombre,
        r.codigo as ruta_codigo,
        r.nombre as ruta_nombre,
        iv.estado_piloto,
        iv.personas_asistidas,
        p.nombre as piloto_nombre,
        p.licencia_numero as piloto_licencia,
        u.nombre_completo as reportado_por
       FROM incidente i
       JOIN incidente_vehiculo iv ON i.id = iv.incidente_id
       JOIN vehiculo v ON iv.vehiculo_id = v.id
       LEFT JOIN tipo_hecho th ON i.tipo_hecho_id = th.id
       LEFT JOIN ruta r ON i.ruta_id = r.id
       LEFT JOIN piloto p ON iv.piloto_id = p.id
       LEFT JOIN usuario u ON i.created_by = u.id
       WHERE v.placa = $1
       ORDER BY i.created_at DESC`,
      [placa]
    );
  },

  // Actualizar datos del vehículo
  async update(placa: string, data: Partial<CreateVehiculoDTO>): Promise<Vehiculo | null> {
    const existing = await this.findByPlaca(placa);
    if (!existing) {
      return null;
    }

    return this.upsert({
      placa,
      ...data
    } as CreateVehiculoDTO);
  },

  // Buscar vehículos con más incidentes
  async findTopByIncidentes(limit: number = 10): Promise<Vehiculo[]> {
    return db.manyOrNone(
      `SELECT v.*,
              tv.nombre as tipo_vehiculo_nombre,
              m.nombre as marca_nombre
       FROM vehiculo v
       LEFT JOIN tipo_vehiculo tv ON v.tipo_vehiculo_id = tv.id
       LEFT JOIN marca_vehiculo m ON v.marca_id = m.id
       WHERE v.total_incidentes > 0
       ORDER BY v.total_incidentes DESC
       LIMIT $1`,
      [limit]
    );
  },

  // Tarjeta de circulación
  async getTarjetaCirculacion(vehiculoId: number): Promise<TarjetaCirculacion | null> {
    return db.oneOrNone(
      `SELECT * FROM tarjeta_circulacion
       WHERE vehiculo_id = $1
       ORDER BY fecha_registro DESC
       LIMIT 1`,
      [vehiculoId]
    );
  },

  async createTarjetaCirculacion(data: Omit<TarjetaCirculacion, 'id' | 'fecha_registro' | 'created_at'>): Promise<TarjetaCirculacion> {
    return db.one(
      `INSERT INTO tarjeta_circulacion (
        vehiculo_id, numero, nit, direccion_propietario, nombre_propietario, modelo
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (vehiculo_id) DO UPDATE SET
        numero = EXCLUDED.numero,
        nit = COALESCE(EXCLUDED.nit, tarjeta_circulacion.nit),
        direccion_propietario = COALESCE(EXCLUDED.direccion_propietario, tarjeta_circulacion.direccion_propietario),
        nombre_propietario = COALESCE(EXCLUDED.nombre_propietario, tarjeta_circulacion.nombre_propietario),
        modelo = COALESCE(EXCLUDED.modelo, tarjeta_circulacion.modelo),
        fecha_registro = NOW()
      RETURNING *`,
      [data.vehiculo_id, data.numero, data.nit, data.direccion_propietario, data.nombre_propietario, data.modelo]
    );
  },

  // Contenedor
  async getContenedor(vehiculoId: number): Promise<Contenedor | null> {
    return db.oneOrNone(
      `SELECT * FROM contenedor
       WHERE vehiculo_id = $1
       ORDER BY fecha_registro DESC
       LIMIT 1`,
      [vehiculoId]
    );
  },

  async createContenedor(data: Omit<Contenedor, 'id' | 'fecha_registro' | 'created_at'>): Promise<Contenedor> {
    return db.one(
      `INSERT INTO contenedor (
        vehiculo_id, numero_contenedor, linea_naviera, tipo_contenedor
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [data.vehiculo_id, data.numero_contenedor, data.linea_naviera, data.tipo_contenedor]
    );
  },

  // Bus
  async getBus(vehiculoId: number): Promise<Bus | null> {
    return db.oneOrNone(
      `SELECT * FROM bus
       WHERE vehiculo_id = $1
       ORDER BY fecha_registro DESC
       LIMIT 1`,
      [vehiculoId]
    );
  },

  async createBus(data: Omit<Bus, 'id' | 'fecha_registro' | 'created_at'>): Promise<Bus> {
    return db.one(
      `INSERT INTO bus (
        vehiculo_id, empresa, ruta_bus, numero_unidad, capacidad_pasajeros
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [data.vehiculo_id, data.empresa, data.ruta_bus, data.numero_unidad, data.capacidad_pasajeros]
    );
  }
};
