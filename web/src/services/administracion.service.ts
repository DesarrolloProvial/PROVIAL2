import { api } from './api';

// =====================================================
// INTERFACES
// =====================================================

export interface DepartamentoSistema {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  usa_sistema_grupos: boolean;
  orden: number;
  activo: boolean;
}

export interface SedeCompleta {
  id: number;
  codigo: string;
  nombre: string;
  departamento_id: number | null;
  departamento_nombre: string | null;
  activa: boolean;
  es_sede_central: boolean;
  usuarios_count: number;
  unidades_count: number;
}

export interface DepartamentoGeografico {
  id: number;
  nombre: string;
}

export interface Municipio {
  id: number;
  nombre: string;
}

export interface EstadoGrupo {
  departamento_id: number;
  departamento_codigo: string;
  departamento_nombre: string;
  sede_id: number | null;
  sede_codigo: string | null;
  sede_nombre: string | null;
  grupo: 0 | 1 | 2;
  grupo_nombre: string;
  activo: boolean;
  fecha_modificacion: string | null;
  modificado_por_nombre: string | null;
}

export interface EncargadoActual {
  asignacion_id: number;
  usuario_id: number;
  nombre_completo: string;
  chapa: string | null;
  telefono: string | null;
  sede_id: number;
  sede_codigo: string;
  sede_nombre: string;
  grupo: 0 | 1 | 2;
  grupo_nombre: string;
  fecha_inicio: string;
  asignado_por_nombre: string | null;
}

export interface HistorialEncargado extends EncargadoActual {
  fecha_fin: string | null;
  removido_por_nombre: string | null;
  motivo_remocion: string | null;
}

export interface UsuarioAdmin {
  id: number;
  nombre_completo: string;
  chapa: string | null;
  telefono: string | null;
  email: string | null;
  rol_id: number;
  rol_codigo: string;
  rol_nombre: string;
  sub_rol_cop_id: number | null;
  sub_rol_cop_codigo: string | null;
  sub_rol_cop_nombre: string | null;
  sede_id: number | null;
  sede_codigo: string | null;
  sede_nombre: string | null;
  grupo: 0 | 1 | 2 | null;
  activo: boolean;
  acceso_app_activo: boolean;
  es_encargado_grupo: boolean;
  created_at: string;
  last_login: string | null;
}

export interface ConfiguracionSistema {
  id: number;
  clave: string;
  valor: string | null;
  tipo: string;
  descripcion: string | null;
  modificado_por_nombre: string | null;
  updated_at: string;
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export interface SubRolCop {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  puede_crear_persistentes: boolean;
  puede_cerrar_persistentes: boolean;
  puede_promover_situaciones: boolean;
  puede_asignar_unidades: boolean;
  puede_gestionar_usuarios: boolean;
  puede_gestionar_grupos: boolean;
  puede_ver_todos_departamentos: boolean;
  solo_lectura: boolean;
  activo: boolean;
}

export interface LogAdministracion {
  id: number;
  accion: string;
  descripcion: string | null;
  realizado_por_id: number;
  realizado_por_nombre: string;
  usuario_afectado_id: number | null;
  usuario_afectado_nombre: string | null;
  tabla_afectada: string | null;
  registro_id: number | null;
  datos_anteriores: Record<string, unknown> | null;
  datos_nuevos: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface EstadisticasAdmin {
  totalUsuarios: number;
  usuariosActivos: number;
  usuariosPorRol: Array<{ rol: string; cantidad: number }>;
  usuariosPorSede: Array<{ sede: string; cantidad: number }>;
  gruposActivos: { g1: number; g2: number; normal: number };
}

// =====================================================
// DTOs
// =====================================================

export interface ToggleGrupoDTO {
  departamento_id: number;
  sede_id?: number;
  grupo: 0 | 1 | 2;
  activo: boolean;
  observaciones?: string;
  aplicar_todas_sedes?: boolean;
  aplicar_todos_departamentos?: boolean;
}

export interface AsignarEncargadoDTO {
  usuario_id: number;
  sede_id: number;
  grupo: 0 | 1 | 2;
  motivo?: string;
}

export interface FiltrosUsuarios {
  departamento?: string;
  sede_id?: number;
  grupo?: 0 | 1 | 2 | null;
  activo?: boolean;
  busqueda?: string;
}

export interface FiltrosLog {
  accion?: string;
  usuario_afectado_id?: number;
  realizado_por?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  limite?: number;
}

// =====================================================
// API DE ADMINISTRACION
// =====================================================

export const administracionAPI = {
  // ------------------------------------
  // DEPARTAMENTOS DEL SISTEMA
  // ------------------------------------
  getDepartamentos: (incluirInactivos = false) =>
    api.get<DepartamentoSistema[]>('/admin/departamentos', {
      params: { incluir_inactivos: incluirInactivos }
    }),

  createDepartamento: (data: {
    codigo: string;
    nombre: string;
    descripcion?: string;
    usa_sistema_grupos?: boolean;
    orden?: number;
  }) =>
    api.post<{ success: boolean; id: number; message: string }>('/admin/departamentos', data),

  updateDepartamento: (id: number, data: Partial<{
    codigo: string;
    nombre: string;
    descripcion: string;
    usa_sistema_grupos: boolean;
    orden: number;
    activo: boolean;
  }>) =>
    api.put<{ success: boolean; message: string }>(`/admin/departamentos/${id}`, data),

  deleteDepartamento: (id: number) =>
    api.delete<{ success: boolean; message: string }>(`/admin/departamentos/${id}`),

  // ------------------------------------
  // SEDES
  // ------------------------------------
  getSedes: (incluirInactivas = false) =>
    api.get<SedeCompleta[]>('/admin/sedes', {
      params: { incluir_inactivas: incluirInactivas }
    }),

  getSede: (id: number) =>
    api.get<SedeCompleta>(`/admin/sedes/${id}`),

  createSede: (data: {
    codigo: string;
    nombre: string;
    departamento_id?: number;
    es_sede_central?: boolean;
  }) =>
    api.post<{ success: boolean; id: number; message: string }>('/admin/sedes', data),

  updateSede: (id: number, data: Partial<{
    codigo: string;
    nombre: string;
    departamento_id: number | null;
    activa: boolean;
    es_sede_central: boolean;
  }>) =>
    api.put<{ success: boolean; message: string }>(`/admin/sedes/${id}`, data),

  deleteSede: (id: number) =>
    api.delete<{ success: boolean; message: string }>(`/admin/sedes/${id}`),

  getSedeConfig: (id: number) =>
    api.get<any>(`/sedes/${id}/configuracion`).then(res => res.data),

  // ------------------------------------
  // CATALOGO GEOGRAFICO
  // ------------------------------------
  getDepartamentosGeograficos: () =>
    api.get<DepartamentoGeografico[]>('/admin/catalogo/departamentos'),

  getMunicipiosPorDepartamento: (departamentoId: number) =>
    api.get<Municipio[]>(`/admin/catalogo/municipios/${departamentoId}`),

  // ------------------------------------
  // ESTADO DE GRUPOS
  // ------------------------------------
  getEstadoGrupos: (sedeId?: number, departamentoId?: number) =>
    api.get<EstadoGrupo[]>('/admin/grupos/estado', {
      params: {
        sede_id: sedeId,
        departamento_id: departamentoId,
      },
    }),

  toggleGrupo: (data: ToggleGrupoDTO) =>
    api.post<{ success: boolean; message: string; registros_afectados: number }>(
      '/admin/grupos/toggle',
      data
    ),

  // ------------------------------------
  // ENCARGADOS
  // ------------------------------------
  getEncargados: (sedeId?: number) =>
    api.get<EncargadoActual[]>('/admin/encargados', {
      params: { sede_id: sedeId },
    }),

  asignarEncargado: (data: AsignarEncargadoDTO) =>
    api.post<{ success: boolean; message: string; asignacion_id: number; encargado: EncargadoActual }>(
      '/admin/encargados',
      data
    ),

  removerEncargado: (sedeId: number, grupo: 0 | 1 | 2, motivo?: string) =>
    api.delete<{ success: boolean; message: string }>(
      `/admin/encargados/${sedeId}/${grupo}`,
      { data: { motivo } }
    ),

  getHistorialEncargados: (sedeId: number, grupo?: 0 | 1 | 2) =>
    api.get<HistorialEncargado[]>(`/admin/encargados/historial/${sedeId}`, {
      params: { grupo },
    }),

  // ------------------------------------
  // USUARIOS
  // ------------------------------------
  getUsuarios: (filtros?: FiltrosUsuarios) =>
    api.get<UsuarioAdmin[]>('/admin/usuarios', {
      params: {
        departamento: filtros?.departamento,
        sede_id: filtros?.sede_id,
        grupo: filtros?.grupo === null ? 'null' : filtros?.grupo,
        activo: filtros?.activo,
        busqueda: filtros?.busqueda,
      },
    }),

  getUsuario: (id: number) =>
    api.get<UsuarioAdmin>(`/admin/usuarios/${id}`),

  toggleUsuario: (userId: number, activo: boolean) =>
    api.post<{ success: boolean; message: string }>(
      `/admin/usuarios/${userId}/toggle`,
      { activo }
    ),

  toggleAccesoApp: (userId: number, acceso_app_activo: boolean) =>
    api.post<{ success: boolean; message: string }>(
      `/admin/usuarios/${userId}/toggle-app`,
      { acceso_app_activo }
    ),

  cambiarGrupoUsuario: (userId: number, grupo: 0 | 1 | 2 | null) =>
    api.put<{ success: boolean; message: string }>(
      `/admin/usuarios/${userId}/grupo`,
      { grupo }
    ),

  cambiarRolUsuario: (userId: number, rolId: number) =>
    api.put<{ success: boolean; message: string }>(
      `/admin/usuarios/${userId}/rol`,
      { rol_id: rolId }
    ),

  cambiarSubRolCop: (userId: number, subRolCopId: number | null) =>
    api.put<{ success: boolean; message: string }>(
      `/admin/usuarios/${userId}/sub-rol-cop`,
      { sub_rol_cop_id: subRolCopId }
    ),

  cambiarSedeUsuario: (userId: number, sedeId: number | null) =>
    api.put<{ success: boolean; message: string }>(
      `/admin/usuarios/${userId}/sede`,
      { sede_id: sedeId }
    ),

  // ------------------------------------
  // CONFIGURACION
  // ------------------------------------
  getConfiguracion: () =>
    api.get<ConfiguracionSistema[]>('/admin/config'),

  setConfiguracion: (clave: string, valor: string) =>
    api.put<{ success: boolean; message: string }>(
      '/admin/config',
      { clave, valor }
    ),

  // ------------------------------------
  // ROLES Y SUB-ROLES
  // ------------------------------------
  getRoles: () =>
    api.get<Rol[]>('/admin/roles'),

  getSubRolesCop: () =>
    api.get<SubRolCop[]>('/admin/sub-roles-cop'),

  // ------------------------------------
  // LOG Y AUDITORIA
  // ------------------------------------
  getLogAdministracion: (filtros?: FiltrosLog) =>
    api.get<LogAdministracion[]>('/admin/log', {
      params: {
        accion: filtros?.accion,
        usuario_afectado_id: filtros?.usuario_afectado_id,
        realizado_por: filtros?.realizado_por,
        fecha_desde: filtros?.fecha_desde,
        fecha_hasta: filtros?.fecha_hasta,
        limite: filtros?.limite,
      },
    }),

  // ------------------------------------
  // ESTADISTICAS
  // ------------------------------------
  getEstadisticas: () =>
    api.get<EstadisticasAdmin>('/admin/estadisticas'),

  // ------------------------------------
  // RESET DE CONTRASEÑA
  // ------------------------------------
  getUsuariosConResetPendiente: () =>
    api.get<{ total: number; usuarios: UsuarioAdmin[] }>('/admin/usuarios/reset-pendiente'),

  habilitarResetPassword: (userId: number) =>
    api.post<{ success: boolean; message: string }>(`/admin/usuarios/${userId}/habilitar-reset-password`),

  deshabilitarResetPassword: (userId: number) =>
    api.delete<{ success: boolean; message: string }>(`/admin/usuarios/${userId}/habilitar-reset-password`),

  getHistorialReset: (userId: number) =>
    api.get<{ total: number; historial: any[] }>(`/admin/usuarios/${userId}/historial-reset`),

  // ------------------------------------
  // CONFIGURACION DE COLUMNAS DINAMICAS
  // ------------------------------------
  getColumnasDisponibles: (tabla: 'brigadas' | 'unidades') =>
    api.get<{
      tabla: string;
      columnas: Array<{ key: string; label: string; descripcion: string }>;
    }>(`/admin/columnas/${tabla}/disponibles`),

  getConfiguracionColumnas: (tabla: 'brigadas' | 'unidades', sedeId?: number) =>
    api.get<{
      columnas_visibles: string[];
      orden_columnas: string[];
      es_default: boolean;
    }>(`/admin/columnas/${tabla}`, {
      params: sedeId ? { sede_id: sedeId } : undefined
    }),

  setConfiguracionColumnas: (
    tabla: 'brigadas' | 'unidades',
    data: {
      sede_id?: number | null;
      columnas_visibles: string[];
      orden_columnas?: string[];
    }
  ) =>
    api.put<{ success: boolean; message: string }>(`/admin/columnas/${tabla}`, data),

  getAllConfiguracionColumnas: (tabla: 'brigadas' | 'unidades') =>
    api.get<{
      tabla: string;
      columnas_disponibles: Array<{ key: string; label: string; descripcion: string }>;
      configuraciones: Array<{
        sede_id: number | null;
        sede_nombre: string | null;
        columnas_visibles: string[];
        orden_columnas: string[];
      }>;
    }>(`/admin/columnas/${tabla}/all`),
};

// Helpers para nombres de grupos
export const getNombreGrupo = (grupo: 0 | 1 | 2 | null): string => {
  switch (grupo) {
    case 0:
      return 'Normal (L-V)';
    case 1:
      return 'Grupo 1';
    case 2:
      return 'Grupo 2';
    default:
      return 'Sin asignar';
  }
};

export const getColorGrupo = (grupo: 0 | 1 | 2 | null): string => {
  switch (grupo) {
    case 0:
      return 'bg-purple-100 text-purple-800';
    case 1:
      return 'bg-blue-100 text-blue-800';
    case 2:
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
