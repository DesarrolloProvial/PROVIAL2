import { db } from '../config/database';

// Interfaz para sub-rol COP (cuando se carga por JOIN)
export interface SubRolCopInfo {
  sub_rol_cop_id: number | null;
  sub_rol_cop_codigo: string | null;
  sub_rol_cop_nombre: string | null;
  puede_crear_persistentes: boolean;
  puede_cerrar_persistentes: boolean;
  puede_promover_situaciones: boolean;
  puede_asignar_unidades: boolean;
  solo_lectura: boolean;
}

export interface Usuario {
  id: number;
  uuid: string;
  username: string;
  password_hash: string;
  nombre_completo: string;
  email: string | null;
  telefono: string | null;
  rol_id: number;
  rol_nombre?: string; // Agregado por JOIN
  sede_id: number | null;
  sede_nombre?: string; // Agregado por JOIN
  activo: boolean;
  ultimo_acceso: Date | null;
  created_at: Date;
  updated_at: Date;
  puede_ver_todas_sedes?: boolean; // Para ENCARGADO_NOMINAS que puede ver todas las sedes
  // Sub-rol COP (solo para usuarios COP)
  sub_rol_cop_id?: number | null;
  sub_rol_cop_codigo?: string | null;
  sub_rol_cop_nombre?: string | null;
  puede_crear_persistentes?: boolean;
  puede_cerrar_persistentes?: boolean;
  puede_promover_situaciones?: boolean;
  puede_asignar_unidades?: boolean;
  solo_lectura?: boolean;
}

export interface CreateUsuarioDTO {
  username: string;
  password_hash: string;
  nombre_completo: string;
  email?: string;
  telefono?: string;
  rol_id: number;
  sede_id?: number;
}

export const UsuarioModel = {
  // Buscar por username
  async findByUsername(username: string): Promise<Usuario | null> {
    return db.oneOrNone(
      `SELECT u.*, r.nombre as rol_nombre, s.nombre as sede_nombre,
              src.id as sub_rol_cop_id,
              src.codigo as sub_rol_cop_codigo,
              src.nombre as sub_rol_cop_nombre,
              COALESCE(src.puede_crear_persistentes, FALSE) as puede_crear_persistentes,
              COALESCE(src.puede_cerrar_persistentes, FALSE) as puede_cerrar_persistentes,
              COALESCE(src.puede_promover_situaciones, FALSE) as puede_promover_situaciones,
              COALESCE(src.puede_asignar_unidades, FALSE) as puede_asignar_unidades,
              COALESCE(src.solo_lectura, FALSE) as solo_lectura
       FROM usuario u
       JOIN rol r ON u.rol_id = r.id
       LEFT JOIN sede s ON u.sede_id = s.id
       LEFT JOIN sub_rol_cop src ON u.sub_rol_cop_id = src.id AND src.activo = TRUE
       WHERE u.username = $1`,
      [username]
    );
  },

  // Buscar por ID
  async findById(id: number): Promise<Usuario | null> {
    return db.oneOrNone(
      `SELECT u.*, r.nombre as rol_nombre, s.nombre as sede_nombre,
              src.id as sub_rol_cop_id,
              src.codigo as sub_rol_cop_codigo,
              src.nombre as sub_rol_cop_nombre,
              COALESCE(src.puede_crear_persistentes, FALSE) as puede_crear_persistentes,
              COALESCE(src.puede_cerrar_persistentes, FALSE) as puede_cerrar_persistentes,
              COALESCE(src.puede_promover_situaciones, FALSE) as puede_promover_situaciones,
              COALESCE(src.puede_asignar_unidades, FALSE) as puede_asignar_unidades,
              COALESCE(src.solo_lectura, FALSE) as solo_lectura
       FROM usuario u
       JOIN rol r ON u.rol_id = r.id
       LEFT JOIN sede s ON u.sede_id = s.id
       LEFT JOIN sub_rol_cop src ON u.sub_rol_cop_id = src.id AND src.activo = TRUE
       WHERE u.id = $1`,
      [id]
    );
  },

  // Crear usuario
  async create(data: CreateUsuarioDTO): Promise<Usuario> {
    return db.one(
      `INSERT INTO usuario (username, password_hash, nombre_completo, email, telefono, rol_id, sede_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [data.username, data.password_hash, data.nombre_completo, data.email, data.telefono, data.rol_id, data.sede_id]
    );
  },

  // Actualizar último acceso
  async updateLastAccess(id: number): Promise<void> {
    await db.none(
      'UPDATE usuario SET ultimo_acceso = NOW() WHERE id = $1',
      [id]
    );
  },

  // Obtener todos los usuarios (para admin)
  async findAll(): Promise<Usuario[]> {
    return db.any(
      `SELECT u.*, r.nombre as rol_nombre, s.nombre as sede_nombre
       FROM usuario u
       JOIN rol r ON u.rol_id = r.id
       LEFT JOIN sede s ON u.sede_id = s.id
       ORDER BY u.created_at DESC`
    );
  },

  // Actualizar usuario
  async update(id: number, data: Partial<CreateUsuarioDTO>): Promise<Usuario> {
    const fields = Object.keys(data)
      .map((key, idx) => `${key} = $${idx + 2}`)
      .join(', ');
    const values = [id, ...Object.values(data)];

    return db.one(
      `UPDATE usuario SET ${fields}, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      values
    );
  },
};
