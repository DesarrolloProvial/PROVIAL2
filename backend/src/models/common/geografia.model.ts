import { db } from '../config/database';

// ========================================
// INTERFACES
// ========================================

export interface Departamento {
  id: number;
  codigo: string;
  nombre: string;
  region: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Municipio {
  id: number;
  departamento_id: number;
  codigo: string;
  nombre: string;
  created_at: Date;
  updated_at: Date;
}

export interface MunicipioCompleto extends Municipio {
  departamento_codigo: string;
  departamento_nombre: string;
  departamento_region: string | null;
}

// ========================================
// MODEL
// ========================================

// ========================================
// RUTAS
// ========================================

export interface Ruta {
  id: number;
  codigo: string;
  nombre: string;
  tipo_ruta: string | null;
  km_inicial: number | null;
  km_final: number | null;
  activa: boolean;
  created_at: Date;
}

export const GeografiaModel = {
  // ========================================
  // RUTAS
  // ========================================

  /**
   * Listar todas las rutas activas
   */
  async getRutas(): Promise<Ruta[]> {
    return db.manyOrNone('SELECT * FROM ruta WHERE activa = true ORDER BY codigo');
  },

  /**
   * Obtener ruta por ID
   */
  async getRutaById(id: number): Promise<Ruta | null> {
    return db.oneOrNone('SELECT * FROM ruta WHERE id = $1', [id]);
  },

  /**
   * Obtener ruta por código
   */
  async getRutaByCodigo(codigo: string): Promise<Ruta | null> {
    return db.oneOrNone('SELECT * FROM ruta WHERE codigo = $1', [codigo]);
  },

  // ========================================
  // DEPARTAMENTOS
  // ========================================

  /**
   * Listar todos los departamentos
   */
  async getDepartamentos(): Promise<Departamento[]> {
    return db.manyOrNone('SELECT * FROM departamento ORDER BY nombre');
  },

  /**
   * Obtener departamento por ID
   */
  async getDepartamentoById(id: number): Promise<Departamento | null> {
    return db.oneOrNone('SELECT * FROM departamento WHERE id = $1', [id]);
  },

  /**
   * Obtener departamento por código
   */
  async getDepartamentoByCodigo(codigo: string): Promise<Departamento | null> {
    return db.oneOrNone('SELECT * FROM departamento WHERE codigo = $1', [codigo]);
  },

  /**
   * Obtener departamentos por región
   */
  async getDepartamentosPorRegion(region: string): Promise<Departamento[]> {
    return db.manyOrNone('SELECT * FROM departamento WHERE region = $1 ORDER BY nombre', [region]);
  },

  /**
   * Crear departamento
   */
  async createDepartamento(data: {
    codigo: string;
    nombre: string;
    region?: string;
  }): Promise<Departamento> {
    const query = `
      INSERT INTO departamento (codigo, nombre, region)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    return db.one(query, [data.codigo, data.nombre, data.region || null]);
  },

  /**
   * Actualizar departamento
   */
  async updateDepartamento(
    id: number,
    data: {
      codigo?: string;
      nombre?: string;
      region?: string;
    }
  ): Promise<Departamento> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.codigo !== undefined) {
      setClauses.push(`codigo = $${paramIndex++}`);
      params.push(data.codigo);
    }

    if (data.nombre !== undefined) {
      setClauses.push(`nombre = $${paramIndex++}`);
      params.push(data.nombre);
    }

    if (data.region !== undefined) {
      setClauses.push(`region = $${paramIndex++}`);
      params.push(data.region);
    }

    params.push(id);

    const query = `
      UPDATE departamento
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    return db.one(query, params);
  },

  // ========================================
  // MUNICIPIOS
  // ========================================

  /**
   * Listar todos los municipios con información del departamento
   */
  async getMunicipios(): Promise<MunicipioCompleto[]> {
    const query = `
      SELECT
        m.*,
        d.codigo as departamento_codigo,
        d.nombre as departamento_nombre,
        d.region as departamento_region
      FROM municipio m
      INNER JOIN departamento d ON m.departamento_id = d.id
      ORDER BY d.nombre, m.nombre
    `;

    return db.manyOrNone(query);
  },

  /**
   * Obtener municipio por ID
   */
  async getMunicipioById(id: number): Promise<MunicipioCompleto | null> {
    const query = `
      SELECT
        m.*,
        d.codigo as departamento_codigo,
        d.nombre as departamento_nombre,
        d.region as departamento_region
      FROM municipio m
      INNER JOIN departamento d ON m.departamento_id = d.id
      WHERE m.id = $1
    `;

    return db.oneOrNone(query, [id]);
  },

  /**
   * Obtener municipio por código
   */
  async getMunicipioByCodigo(codigo: string): Promise<MunicipioCompleto | null> {
    const query = `
      SELECT
        m.*,
        d.codigo as departamento_codigo,
        d.nombre as departamento_nombre,
        d.region as departamento_region
      FROM municipio m
      INNER JOIN departamento d ON m.departamento_id = d.id
      WHERE m.codigo = $1
    `;

    return db.oneOrNone(query, [codigo]);
  },

  /**
   * Obtener municipios de un departamento
   */
  async getMunicipiosPorDepartamento(departamento_id: number): Promise<MunicipioCompleto[]> {
    const query = `
      SELECT
        m.*,
        d.codigo as departamento_codigo,
        d.nombre as departamento_nombre,
        d.region as departamento_region
      FROM municipio m
      INNER JOIN departamento d ON m.departamento_id = d.id
      WHERE m.departamento_id = $1
      ORDER BY m.nombre
    `;

    return db.manyOrNone(query, [departamento_id]);
  },

  /**
   * Crear municipio
   */
  async createMunicipio(data: {
    departamento_id: number;
    codigo: string;
    nombre: string;
  }): Promise<Municipio> {
    const query = `
      INSERT INTO municipio (departamento_id, codigo, nombre)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    return db.one(query, [data.departamento_id, data.codigo, data.nombre]);
  },

  /**
   * Actualizar municipio
   */
  async updateMunicipio(
    id: number,
    data: {
      departamento_id?: number;
      codigo?: string;
      nombre?: string;
    }
  ): Promise<Municipio> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.departamento_id !== undefined) {
      setClauses.push(`departamento_id = $${paramIndex++}`);
      params.push(data.departamento_id);
    }

    if (data.codigo !== undefined) {
      setClauses.push(`codigo = $${paramIndex++}`);
      params.push(data.codigo);
    }

    if (data.nombre !== undefined) {
      setClauses.push(`nombre = $${paramIndex++}`);
      params.push(data.nombre);
    }

    params.push(id);

    const query = `
      UPDATE municipio
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    return db.one(query, params);
  },

  /**
   * Buscar municipios por nombre (búsqueda parcial)
   */
  async buscarMunicipios(texto_busqueda: string): Promise<MunicipioCompleto[]> {
    const query = `
      SELECT
        m.*,
        d.codigo as departamento_codigo,
        d.nombre as departamento_nombre,
        d.region as departamento_region
      FROM municipio m
      INNER JOIN departamento d ON m.departamento_id = d.id
      WHERE m.nombre ILIKE $1 OR d.nombre ILIKE $1
      ORDER BY d.nombre, m.nombre
      LIMIT 50
    `;

    return db.manyOrNone(query, [`%${texto_busqueda}%`]);
  },

  /**
   * Obtener regiones únicas
   */
  async getRegiones(): Promise<string[]> {
    const result = await db.manyOrNone(
      'SELECT DISTINCT region FROM departamento WHERE region IS NOT NULL ORDER BY region'
    );
    return result.map((r) => r.region);
  },
};
