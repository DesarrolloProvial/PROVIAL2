import { db } from '../config/database';

// =====================================================
// INTERFACES
// =====================================================

export interface DepartamentoSistema {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  usa_sistema_grupos: boolean;
  orden: number;
  activo: boolean;
}

export interface EstadoGrupoDepartamento {
  id: number;
  departamento_id: number;
  departamento_codigo: string;
  departamento_nombre: string;
  sede_id: number | null;
  sede_codigo: string | null;
  sede_nombre: string | null;
  grupo: 0 | 1 | 2;
  grupo_nombre: string;
  activo: boolean;
  fecha_modificacion: Date | null;
  observaciones: string | null;
  modificado_por_nombre: string | null;
}

export interface EncargadoSedeGrupo {
  asignacion_id: number;
  usuario_id: number;
  nombre_completo: string;
  chapa: string | null;
  telefono: string | null;
  email: string | null;
  sede_id: number;
  sede_codigo: string;
  sede_nombre: string;
  grupo: 0 | 1 | 2;
  grupo_nombre: string;
  fecha_inicio: Date;
  motivo_asignacion: string | null;
  asignado_por_nombre: string | null;
}

export interface HistorialEncargado extends EncargadoSedeGrupo {
  fecha_fin: Date | null;
  removido_por_nombre: string | null;
  motivo_remocion: string | null;
}

export interface ConfiguracionSistema {
  id: number;
  clave: string;
  valor: string | null;
  tipo: 'string' | 'number' | 'boolean' | 'json';
  descripcion: string | null;
  categoria: string;
  modificado_por_nombre?: string;
  updated_at: Date;
}

export interface UsuarioAdmin {
  id: number;
  uuid: string;
  username: string;
  nombre_completo: string;
  chapa: string | null;
  email: string | null;
  telefono: string | null;
  activo: boolean;
  acceso_app_activo: boolean;
  grupo: 0 | 1 | 2 | null;
  grupo_nombre: string;
  exento_grupos: boolean;
  es_encargado_grupo: boolean;
  rol_codigo: string;
  rol_nombre: string;
  sede_id: number | null;
  sede_codigo: string | null;
  sede_nombre: string | null;
  sub_rol_cop_codigo: string | null;
  sub_rol_cop_nombre: string | null;
  ultimo_acceso: Date | null;
}

export interface LogAdministracion {
  id: number;
  accion: string;
  tabla_afectada: string | null;
  registro_id: number | null;
  usuario_afectado_id: number | null;
  datos_anteriores: Record<string, unknown> | null;
  datos_nuevos: Record<string, unknown> | null;
  realizado_por: number;
  realizado_por_nombre?: string;
  ip_address: string | null;
  created_at: Date;
}

// =====================================================
// MODELO DE ADMINISTRACION
// =====================================================

export const AdministracionModel = {

  // =====================================================
  // DEPARTAMENTOS
  // =====================================================

  async getDepartamentos(): Promise<DepartamentoSistema[]> {
    return db.manyOrNone(`
      SELECT id, codigo, nombre, descripcion, usa_sistema_grupos, orden, activo
      FROM departamento_sistema
      WHERE activo = TRUE
      ORDER BY orden, nombre
    `);
  },

  async getDepartamento(id: number): Promise<DepartamentoSistema | null> {
    return db.oneOrNone(`
      SELECT * FROM departamento_sistema WHERE id = $1
    `, [id]);
  },

  async updateDepartamento(id: number, data: Partial<DepartamentoSistema>): Promise<void> {
    const campos: string[] = [];
    const valores: unknown[] = [];
    let idx = 1;

    if (data.nombre !== undefined) {
      campos.push(`nombre = $${idx++}`);
      valores.push(data.nombre);
    }
    if (data.descripcion !== undefined) {
      campos.push(`descripcion = $${idx++}`);
      valores.push(data.descripcion);
    }
    if (data.usa_sistema_grupos !== undefined) {
      campos.push(`usa_sistema_grupos = $${idx++}`);
      valores.push(data.usa_sistema_grupos);
    }
    if (data.activo !== undefined) {
      campos.push(`activo = $${idx++}`);
      valores.push(data.activo);
    }

    if (campos.length > 0) {
      campos.push(`updated_at = NOW()`);
      valores.push(id);
      await db.none(`
        UPDATE departamento_sistema SET ${campos.join(', ')} WHERE id = $${idx}
      `, valores);
    }
  },

  // =====================================================
  // ESTADO DE GRUPOS
  // =====================================================

  async getEstadoGrupos(sedeId?: number, departamentoId?: number): Promise<EstadoGrupoDepartamento[]> {
    let query = `SELECT * FROM v_estado_grupos_actual WHERE 1=1`;
    const params: unknown[] = [];

    if (sedeId) {
      params.push(sedeId);
      query += ` AND sede_id = $${params.length}`;
    }
    if (departamentoId) {
      params.push(departamentoId);
      query += ` AND departamento_id = $${params.length}`;
    }

    query += ` ORDER BY departamento_nombre, sede_nombre, grupo`;

    return db.manyOrNone(query, params);
  },

  async toggleGrupo(
    departamentoId: number,
    sedeId: number,
    grupo: 0 | 1 | 2,
    activo: boolean,
    modificadoPor: number,
    observaciones?: string
  ): Promise<void> {
    await db.none(`
      INSERT INTO estado_grupo_departamento (departamento_id, sede_id, grupo, activo, modificado_por, fecha_modificacion, observaciones)
      VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      ON CONFLICT (departamento_id, sede_id, grupo)
      DO UPDATE SET activo = $4, modificado_por = $5, fecha_modificacion = NOW(), observaciones = $6
    `, [departamentoId, sedeId, grupo, activo, modificadoPor, observaciones]);
  },

  async toggleGrupoTodasSedes(
    departamentoId: number,
    grupo: 0 | 1 | 2,
    activo: boolean,
    modificadoPor: number,
    observaciones?: string
  ): Promise<number> {
    const result = await db.result(`
      UPDATE estado_grupo_departamento
      SET activo = $3, modificado_por = $4, fecha_modificacion = NOW(), observaciones = $5
      WHERE departamento_id = $1 AND grupo = $2
    `, [departamentoId, grupo, activo, modificadoPor, observaciones]);
    return result.rowCount;
  },

  async toggleGrupoTodosDepartamentos(
    sedeId: number,
    grupo: 0 | 1 | 2,
    activo: boolean,
    modificadoPor: number,
    observaciones?: string
  ): Promise<number> {
    const result = await db.result(`
      UPDATE estado_grupo_departamento
      SET activo = $3, modificado_por = $4, fecha_modificacion = NOW(), observaciones = $5
      WHERE sede_id = $1 AND grupo = $2
    `, [sedeId, grupo, activo, modificadoPor, observaciones]);
    return result.rowCount;
  },

  // =====================================================
  // ENCARGADOS
  // =====================================================

  async getEncargadosActuales(sedeId?: number): Promise<EncargadoSedeGrupo[]> {
    let query = `SELECT * FROM v_encargados_actuales`;
    const params: unknown[] = [];

    if (sedeId) {
      params.push(sedeId);
      query += ` WHERE sede_id = $1`;
    }

    query += ` ORDER BY sede_nombre, grupo`;

    return db.manyOrNone(query, params);
  },

  async getEncargadoPorSedeGrupo(sedeId: number, grupo: 0 | 1 | 2): Promise<EncargadoSedeGrupo | null> {
    return db.oneOrNone(`
      SELECT * FROM v_encargados_actuales WHERE sede_id = $1 AND grupo = $2
    `, [sedeId, grupo]);
  },

  async asignarEncargado(
    usuarioId: number,
    sedeId: number,
    grupo: 0 | 1 | 2,
    asignadoPor: number,
    motivo?: string
  ): Promise<number> {
    const result = await db.one<{ fn_asignar_encargado: number }>(`
      SELECT fn_asignar_encargado($1, $2, $3::SMALLINT, $4, $5)
    `, [usuarioId, sedeId, grupo, asignadoPor, motivo || 'Asignacion manual']);
    return result.fn_asignar_encargado;
  },

  async removerEncargado(
    sedeId: number,
    grupo: 0 | 1 | 2,
    removidoPor: number,
    motivo?: string
  ): Promise<boolean> {
    const result = await db.one<{ fn_remover_encargado: boolean }>(`
      SELECT fn_remover_encargado($1, $2::SMALLINT, $3, $4)
    `, [sedeId, grupo, removidoPor, motivo || 'Removido manualmente']);
    return result.fn_remover_encargado;
  },

  async getHistorialEncargados(sedeId: number, grupo?: 0 | 1 | 2): Promise<HistorialEncargado[]> {
    let query = `
      SELECT
        h.id AS asignacion_id,
        h.usuario_id,
        u.nombre_completo,
        u.chapa,
        u.telefono,
        u.email,
        h.sede_id,
        s.codigo AS sede_codigo,
        s.nombre AS sede_nombre,
        h.grupo,
        CASE h.grupo
          WHEN 0 THEN 'Normal (L-V)'
          WHEN 1 THEN 'Grupo 1'
          WHEN 2 THEN 'Grupo 2'
        END AS grupo_nombre,
        h.fecha_inicio,
        h.fecha_fin,
        h.motivo_asignacion,
        h.motivo_remocion,
        ua.nombre_completo AS asignado_por_nombre,
        ur.nombre_completo AS removido_por_nombre
      FROM historial_encargado_sede_grupo h
      JOIN usuario u ON u.id = h.usuario_id
      JOIN sede s ON s.id = h.sede_id
      LEFT JOIN usuario ua ON ua.id = h.asignado_por
      LEFT JOIN usuario ur ON ur.id = h.removido_por
      WHERE h.sede_id = $1
    `;
    const params: unknown[] = [sedeId];

    if (grupo !== undefined) {
      params.push(grupo);
      query += ` AND h.grupo = $2`;
    }

    query += ` ORDER BY h.grupo, h.fecha_inicio DESC`;

    return db.manyOrNone(query, params);
  },

  // =====================================================
  // CONFIGURACION DEL SISTEMA
  // =====================================================

  async getConfiguracion(): Promise<ConfiguracionSistema[]> {
    return db.manyOrNone(`
      SELECT
        c.*,
        u.nombre_completo AS modificado_por_nombre
      FROM configuracion_sistema c
      LEFT JOIN usuario u ON u.id = c.modificado_por
      ORDER BY c.categoria, c.clave
    `);
  },

  async getConfiguracionPorClave(clave: string): Promise<ConfiguracionSistema | null> {
    return db.oneOrNone(`SELECT * FROM configuracion_sistema WHERE clave = $1`, [clave]);
  },

  async setConfiguracion(clave: string, valor: string, modificadoPor: number): Promise<void> {
    await db.none(`
      UPDATE configuracion_sistema
      SET valor = $2, modificado_por = $3, updated_at = NOW()
      WHERE clave = $1
    `, [clave, valor, modificadoPor]);
  },

  async getValorConfiguracion<T = string>(clave: string, valorDefecto: T): Promise<T> {
    const config = await this.getConfiguracionPorClave(clave);
    if (!config || config.valor === null) return valorDefecto;

    switch (config.tipo) {
      case 'number':
        return parseFloat(config.valor) as T;
      case 'boolean':
        return (config.valor === 'true') as T;
      case 'json':
        return JSON.parse(config.valor) as T;
      default:
        return config.valor as T;
    }
  },

  // =====================================================
  // USUARIOS
  // =====================================================

  async getUsuarios(filtros?: {
    departamento?: string;
    sedeId?: number;
    grupo?: 0 | 1 | 2 | null;
    activo?: boolean;
    busqueda?: string;
  }): Promise<UsuarioAdmin[]> {
    let query = `SELECT * FROM v_usuarios_admin WHERE 1=1`;
    const params: unknown[] = [];

    if (filtros?.departamento) {
      params.push(filtros.departamento);
      query += ` AND rol_codigo = $${params.length}`;
    }
    if (filtros?.sedeId) {
      params.push(filtros.sedeId);
      query += ` AND sede_id = $${params.length}`;
    }
    if (filtros?.grupo !== undefined) {
      if (filtros.grupo === null) {
        query += ` AND grupo IS NULL`;
      } else {
        params.push(filtros.grupo);
        query += ` AND grupo = $${params.length}`;
      }
    }
    if (filtros?.activo !== undefined) {
      params.push(filtros.activo);
      query += ` AND activo = $${params.length}`;
    }
    if (filtros?.busqueda) {
      params.push(`%${filtros.busqueda}%`);
      query += ` AND (nombre_completo ILIKE $${params.length} OR chapa ILIKE $${params.length} OR username ILIKE $${params.length})`;
    }

    query += ` ORDER BY nombre_completo`;

    return db.manyOrNone(query, params);
  },

  async getUsuario(id: number): Promise<UsuarioAdmin | null> {
    return db.oneOrNone(`SELECT * FROM v_usuarios_admin WHERE id = $1`, [id]);
  },

  async toggleAccesoUsuario(usuarioId: number, activo: boolean): Promise<void> {
    await db.none(`UPDATE usuario SET activo = $2 WHERE id = $1`, [usuarioId, activo]);
  },

  async toggleAccesoAppUsuario(usuarioId: number, accesoAppActivo: boolean): Promise<void> {
    await db.none(`UPDATE usuario SET acceso_app_activo = $2 WHERE id = $1`, [usuarioId, accesoAppActivo]);
  },

  async cambiarGrupoUsuario(usuarioId: number, grupo: 0 | 1 | 2 | null): Promise<void> {
    await db.none(`UPDATE usuario SET grupo = $2 WHERE id = $1`, [usuarioId, grupo]);
  },

  async cambiarRolUsuario(usuarioId: number, rolId: number): Promise<void> {
    await db.none(`UPDATE usuario SET rol_id = $2 WHERE id = $1`, [usuarioId, rolId]);
  },

  async cambiarSubRolCop(usuarioId: number, subRolCopId: number | null): Promise<void> {
    await db.none(`UPDATE usuario SET sub_rol_cop_id = $2 WHERE id = $1`, [usuarioId, subRolCopId]);
  },

  async cambiarSedeUsuario(usuarioId: number, sedeId: number | null): Promise<void> {
    await db.none(`UPDATE usuario SET sede_id = $2 WHERE id = $1`, [usuarioId, sedeId]);
  },

  async toggleExentoGrupos(usuarioId: number, exento: boolean): Promise<void> {
    await db.none(`UPDATE usuario SET exento_grupos = $2 WHERE id = $1`, [usuarioId, exento]);
  },

  // =====================================================
  // ROLES
  // =====================================================

  async getRoles(): Promise<Array<{ id: number; nombre: string; descripcion: string }>> {
    return db.manyOrNone(`SELECT id, nombre, descripcion FROM rol ORDER BY nombre`);
  },

  async getSubRolesCop(): Promise<Array<{ id: number; codigo: string; nombre: string; descripcion: string }>> {
    return db.manyOrNone(`
      SELECT id, codigo, nombre, descripcion
      FROM sub_rol_cop
      WHERE activo = TRUE
      ORDER BY nombre
    `);
  },

  // =====================================================
  // LOG DE ADMINISTRACION
  // =====================================================

  async registrarAccion(
    accion: string,
    realizadoPor: number,
    datos: {
      tablaAfectada?: string;
      registroId?: number;
      usuarioAfectadoId?: number;
      datosAnteriores?: Record<string, unknown>;
      datosNuevos?: Record<string, unknown>;
      ipAddress?: string;
    }
  ): Promise<number> {
    const result = await db.one<{ id: number }>(`
      INSERT INTO log_administracion (
        accion, tabla_afectada, registro_id, usuario_afectado_id,
        datos_anteriores, datos_nuevos, realizado_por, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      accion,
      datos.tablaAfectada || null,
      datos.registroId || null,
      datos.usuarioAfectadoId || null,
      datos.datosAnteriores ? JSON.stringify(datos.datosAnteriores) : null,
      datos.datosNuevos ? JSON.stringify(datos.datosNuevos) : null,
      realizadoPor,
      datos.ipAddress || null
    ]);
    return result.id;
  },

  async getLogAdministracion(filtros?: {
    accion?: string;
    usuarioAfectadoId?: number;
    realizadoPor?: number;
    fechaDesde?: Date;
    fechaHasta?: Date;
    limite?: number;
  }): Promise<LogAdministracion[]> {
    let query = `
      SELECT
        l.*,
        u.nombre_completo AS realizado_por_nombre
      FROM log_administracion l
      JOIN usuario u ON u.id = l.realizado_por
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (filtros?.accion) {
      params.push(filtros.accion);
      query += ` AND l.accion = $${params.length}`;
    }
    if (filtros?.usuarioAfectadoId) {
      params.push(filtros.usuarioAfectadoId);
      query += ` AND l.usuario_afectado_id = $${params.length}`;
    }
    if (filtros?.realizadoPor) {
      params.push(filtros.realizadoPor);
      query += ` AND l.realizado_por = $${params.length}`;
    }
    if (filtros?.fechaDesde) {
      params.push(filtros.fechaDesde);
      query += ` AND l.created_at >= $${params.length}`;
    }
    if (filtros?.fechaHasta) {
      params.push(filtros.fechaHasta);
      query += ` AND l.created_at <= $${params.length}`;
    }

    query += ` ORDER BY l.created_at DESC`;

    if (filtros?.limite) {
      params.push(filtros.limite);
      query += ` LIMIT $${params.length}`;
    } else {
      query += ` LIMIT 100`;
    }

    return db.manyOrNone(query, params);
  },

  // =====================================================
  // ESTADISTICAS
  // =====================================================

  async getEstadisticasAdmin(): Promise<{
    totalUsuarios: number;
    usuariosActivos: number;
    usuariosPorRol: Array<{ rol: string; cantidad: number }>;
    usuariosPorSede: Array<{ sede: string; cantidad: number }>;
    gruposActivos: { g1: number; g2: number; normal: number };
  }> {
    const totalUsuariosResult = await db.one<{ count: string }>(`SELECT COUNT(*) FROM usuario`);
    const usuariosActivosResult = await db.one<{ count: string }>(`SELECT COUNT(*) FROM usuario WHERE activo = TRUE`);

    const usuariosPorRol = await db.manyOrNone<{ rol: string; cantidad: string }>(`
      SELECT r.nombre AS rol, COUNT(u.id) AS cantidad
      FROM rol r
      LEFT JOIN usuario u ON u.rol_id = r.id AND u.activo = TRUE
      GROUP BY r.nombre
      ORDER BY cantidad DESC
    `);

    const usuariosPorSede = await db.manyOrNone<{ sede: string; cantidad: string }>(`
      SELECT COALESCE(s.nombre, 'Sin sede') AS sede, COUNT(u.id) AS cantidad
      FROM usuario u
      LEFT JOIN sede s ON s.id = u.sede_id
      WHERE u.activo = TRUE
      GROUP BY s.nombre
      ORDER BY cantidad DESC
    `);

    const gruposActivos = await db.one<{ g1: string; g2: string; normal: string }>(`
      SELECT
        COUNT(*) FILTER (WHERE grupo = 1) AS g1,
        COUNT(*) FILTER (WHERE grupo = 2) AS g2,
        COUNT(*) FILTER (WHERE grupo = 0) AS normal
      FROM usuario
      WHERE activo = TRUE AND grupo IS NOT NULL
    `);

    return {
      totalUsuarios: parseInt(totalUsuariosResult.count),
      usuariosActivos: parseInt(usuariosActivosResult.count),
      usuariosPorRol: usuariosPorRol.map(r => ({ rol: r.rol, cantidad: parseInt(r.cantidad) })),
      usuariosPorSede: usuariosPorSede.map(s => ({ sede: s.sede, cantidad: parseInt(s.cantidad) })),
      gruposActivos: {
        g1: parseInt(gruposActivos.g1),
        g2: parseInt(gruposActivos.g2),
        normal: parseInt(gruposActivos.normal)
      }
    };
  },

  // =====================================================
  // VERIFICACION DE ACCESO
  // =====================================================

  async verificarAccesoGrupo(usuarioId: number): Promise<{ tieneAcceso: boolean; motivo: string }> {
    const result = await db.one<{ tiene_acceso: boolean; motivo: string }>(`
      SELECT * FROM fn_verificar_acceso_grupo($1)
    `, [usuarioId]);
    return { tieneAcceso: result.tiene_acceso, motivo: result.motivo };
  }
};

export default AdministracionModel;
