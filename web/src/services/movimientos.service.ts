import { api } from './api';

// ============================================
// TIPOS
// ============================================

export interface UbicacionBrigada {
  usuario_id: number;
  nombre_completo: string;
  username: string;
  estado: 'CON_UNIDAD' | 'EN_PUNTO_FIJO' | 'PRESTADO';
  unidad_actual_id: number | null;
  unidad_actual_codigo: string | null;
  unidad_origen_id: number;
  unidad_origen_codigo: string;
  punto_fijo_km: number | null;
  punto_fijo_sentido: string | null;
  punto_fijo_ruta_codigo: string | null;
  punto_fijo_descripcion: string | null;
  situacion_persistente_id: number | null;
  situacion_persistente_titulo: string | null;
  inicio_ubicacion: string;
  motivo: string | null;
}

export interface BrigadaParaPrestamo {
  usuario_id: number;
  nombre_completo: string;
  username: string;
  estado: string;
  unidad_actual_id: number;
  unidad_codigo: string;
  inicio_ubicacion: string;
}

export interface PrestamoData {
  usuario_id: number;
  unidad_destino_id: number;
  asignacion_destino_id: number;
  motivo: string;
  km: number;
  ruta_id: number;
  latitud?: number;
  longitud?: number;
}

export interface DivisionData {
  usuario_id: number;
  km: number;
  sentido: string;
  ruta_id: number;
  descripcion?: string;
  situacion_persistente_id?: number;
  motivo: string;
  latitud?: number;
  longitud?: number;
}

export interface ReunionData {
  usuario_id: number;
  unidad_id: number;
  asignacion_id: number;
  km: number;
  ruta_id: number;
  motivo?: string;
  latitud?: number;
  longitud?: number;
}

export interface CambioUnidadData {
  usuarios_ids: number[];
  unidad_destino_id: number;
  asignacion_destino_id: number;
  motivo: string;
  km: number;
  ruta_id: number;
  latitud?: number;
  longitud?: number;
}

// ============================================
// API DE UBICACIÓN DE BRIGADAS
// ============================================

export const ubicacionBrigadasAPI = {
  // Obtener todas las ubicaciones activas
  async getAll(): Promise<UbicacionBrigada[]> {
    const { data } = await api.get('/ubicacion-brigadas');
    return data;
  },

  // Obtener ubicaciones de una unidad específica
  async getByUnidad(unidadId: number): Promise<UbicacionBrigada[]> {
    const { data } = await api.get(`/ubicacion-brigadas/unidad/${unidadId}`);
    return data;
  },

  // Obtener brigadas disponibles para préstamo desde una unidad
  async getBrigadasParaPrestamo(unidadId: number): Promise<BrigadaParaPrestamo[]> {
    const { data } = await api.get(`/ubicacion-brigadas/para-prestamo/${unidadId}`);
    return data;
  },

  // Obtener brigadas actualmente prestados
  async getBrigadasPrestados(): Promise<UbicacionBrigada[]> {
    const { data } = await api.get('/ubicacion-brigadas/prestados');
    return data;
  },

  // Obtener brigadas en punto fijo
  async getBrigadasEnPuntoFijo(): Promise<UbicacionBrigada[]> {
    const { data } = await api.get('/ubicacion-brigadas/en-punto-fijo');
    return data;
  },

  // Prestar brigada a otra unidad
  async prestarBrigada(data: PrestamoData): Promise<any> {
    const { data: response } = await api.post('/ubicacion-brigadas/prestamo', data);
    return response;
  },

  // Retornar brigada de préstamo
  async retornarDePrestamo(data: {
    usuario_id: number;
    motivo?: string;
    km: number;
    ruta_id: number;
  }): Promise<any> {
    const { data: response } = await api.post('/ubicacion-brigadas/retorno-prestamo', data);
    return response;
  },

  // Dividir fuerza
  async dividirFuerza(data: DivisionData): Promise<any> {
    const { data: response } = await api.post('/ubicacion-brigadas/division', data);
    return response;
  },

  // Reunir brigada con unidad
  async reunirConUnidad(data: ReunionData): Promise<any> {
    const { data: response } = await api.post('/ubicacion-brigadas/reunion', data);
    return response;
  },

  // Cambio completo de unidad
  async cambiarUnidadCompleta(data: CambioUnidadData): Promise<any> {
    const { data: response } = await api.post('/ubicacion-brigadas/cambio-unidad', data);
    return response;
  },
};

// ============================================
// TIPOS PARA SITUACIONES PERSISTENTES
// ============================================

export interface SituacionPersistente {
  id: number;
  uuid: string;
  numero: string;
  titulo: string;
  tipo: string;
  subtipo: string | null;
  estado: 'ACTIVA' | 'EN_PAUSA' | 'FINALIZADA';
  importancia: 'BAJA' | 'NORMAL' | 'ALTA' | 'CRITICA';
  ruta_id: number | null;
  ruta_codigo: string | null;
  ruta_nombre: string | null;
  km_inicio: number | null;
  km_fin: number | null;
  sentido: string | null;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin_estimada: string | null;
  fecha_fin_real: string | null;
  creado_por_nombre: string;
  unidades_asignadas_count: number;
  unidades_asignadas: Array<{
    unidad_id: number;
    unidad_codigo: string;
    fecha_asignacion: string;
  }> | null;
}

export interface AsignacionSituacion {
  id: number;
  situacion_persistente_id: number;
  unidad_id: number;
  unidad_codigo?: string;
  tipo_unidad?: string;
  fecha_hora_asignacion: string;
  fecha_hora_desasignacion: string | null;
  observaciones_asignacion: string | null;
  asignado_por_nombre?: string;
}

export interface ActualizacionSituacion {
  id: number;
  situacion_persistente_id: number;
  usuario_id: number;
  usuario_nombre: string;
  unidad_id: number;
  unidad_codigo: string;
  tipo_actualizacion: string;
  contenido: string | null;
  fecha_hora: string;
  puede_editarse: boolean;
}

export interface TipoSituacion {
  value: string;
  label: string;
}

export interface TipoEmergenciaVial {
  id: number;
  codigo: string;
  nombre: string;
  orden: number;
}

export interface ObstruccionPersistente {
  situacion_persistente_id: number;
  obstruye_via: boolean;
  tipo_obstruccion: 'fuera' | 'parcial' | 'total' | null;
  porcentaje_obstruccion: number | null;
  descripcion_manual: string | null;
}

export interface AutoridadSocorroPersistente {
  id?: number;
  situacion_persistente_id?: number;
  tipo_autoridad: string;
  hora_llegada: string | null;
  nip_chapa: string | null;
  nombre_comandante: string | null;
  cantidad_elementos: number | null;
  cantidad_unidades: number | null;
}

export interface MultimediaPersistente {
  id: number;
  situacion_persistente_id: number;
  tipo: 'foto' | 'video';
  url: string;
  orden: number;
  created_at: string;
}

export interface SituacionPersistenteCompleta extends SituacionPersistente {
  tipo_emergencia_id: number | null;
  tipo_emergencia_nombre: string | null;
  situacion_origen_id: number | null;
  es_promocion: boolean;
  fecha_promocion: string | null;
  promovido_por: number | null;
  promovido_por_nombre: string | null;
  jurisdiccion: string | null;
  obstruccion?: ObstruccionPersistente;
  autoridades?: AutoridadSocorroPersistente[];
  socorro?: AutoridadSocorroPersistente[];
  multimedia?: MultimediaPersistente[];
}

// ============================================
// API DE SITUACIONES PERSISTENTES
// ============================================

export const situacionesPersistentesAPI = {
  // Obtener tipos disponibles
  async getTipos(): Promise<TipoSituacion[]> {
    const { data } = await api.get('/situaciones-persistentes/tipos');
    return data;
  },

  // Listar situaciones activas
  async getActivas(): Promise<SituacionPersistente[]> {
    const { data } = await api.get('/situaciones-persistentes/activas');
    return data;
  },

  // Listar todas con filtros
  async getAll(params?: {
    estado?: string;
    tipo?: string;
    ruta_id?: number;
    importancia?: string;
  }): Promise<SituacionPersistente[]> {
    const { data } = await api.get('/situaciones-persistentes', { params });
    return data;
  },

  // Obtener por ID
  async getById(id: number): Promise<SituacionPersistente> {
    const { data } = await api.get(`/situaciones-persistentes/${id}`);
    return data;
  },

  // Crear situación
  async create(data: {
    titulo: string;
    tipo: string;
    subtipo?: string;
    importancia?: string;
    ruta_id?: number;
    km_inicio?: number;
    km_fin?: number;
    sentido?: string;
    descripcion?: string;
    fecha_fin_estimada?: string;
  }): Promise<SituacionPersistente> {
    const { data: response } = await api.post('/situaciones-persistentes', data);
    return response.situacion;
  },

  // Actualizar situación
  async update(id: number, data: Partial<SituacionPersistente>): Promise<SituacionPersistente> {
    const { data: response } = await api.put(`/situaciones-persistentes/${id}`, data);
    return response.situacion;
  },

  // Finalizar situación
  async finalizar(id: number): Promise<any> {
    const { data } = await api.post(`/situaciones-persistentes/${id}/finalizar`);
    return data;
  },

  // Pausar situación
  async pausar(id: number): Promise<any> {
    const { data } = await api.post(`/situaciones-persistentes/${id}/pausar`);
    return data;
  },

  // Reactivar situación
  async reactivar(id: number): Promise<any> {
    const { data } = await api.post(`/situaciones-persistentes/${id}/reactivar`);
    return data;
  },

  // Obtener asignaciones activas
  async getAsignaciones(id: number): Promise<AsignacionSituacion[]> {
    const { data } = await api.get(`/situaciones-persistentes/${id}/asignaciones`);
    return data;
  },

  // Obtener historial de asignaciones
  async getHistorialAsignaciones(id: number): Promise<AsignacionSituacion[]> {
    const { data } = await api.get(`/situaciones-persistentes/${id}/asignaciones/historial`);
    return data;
  },

  // Asignar unidad
  async asignarUnidad(situacionId: number, data: {
    unidad_id: number;
    asignacion_unidad_id?: number;
    km_asignacion?: number;
    observaciones_asignacion?: string;
  }): Promise<any> {
    const { data: response } = await api.post(`/situaciones-persistentes/${situacionId}/asignar`, data);
    return response;
  },

  // Desasignar unidad
  async desasignarUnidad(situacionId: number, unidadId: number, observaciones?: string): Promise<any> {
    const { data } = await api.post(`/situaciones-persistentes/${situacionId}/desasignar/${unidadId}`, {
      observaciones_desasignacion: observaciones
    });
    return data;
  },

  // Obtener actualizaciones
  async getActualizaciones(id: number): Promise<ActualizacionSituacion[]> {
    const { data } = await api.get(`/situaciones-persistentes/${id}/actualizaciones`);
    return data;
  },

  // Agregar actualización
  async agregarActualizacion(situacionId: number, data: {
    unidad_id: number;
    tipo_actualizacion: string;
    contenido?: string;
  }): Promise<any> {
    const { data: response } = await api.post(`/situaciones-persistentes/${situacionId}/actualizaciones`, data);
    return response;
  },

  // ============================================
  // NUEVOS MÉTODOS PARA EMERGENCIAS VIALES
  // ============================================

  // Obtener catálogo de tipos de emergencia vial
  async getTiposEmergencia(): Promise<TipoEmergenciaVial[]> {
    const { data } = await api.get('/situaciones-persistentes/catalogo/tipos-emergencia');
    return data;
  },

  // Promover situación normal a persistente
  async promover(situacionId: number, data: {
    titulo: string;
    tipo_emergencia_id: number;
    importancia?: string;
    descripcion?: string;
  }): Promise<SituacionPersistenteCompleta> {
    const { data: response } = await api.post(`/situaciones-persistentes/promover/${situacionId}`, data);
    return response.situacion;
  },

  // Crear situación persistente completa (con obstrucción, autoridades, socorro)
  async crearCompleta(data: {
    titulo: string;
    tipo_emergencia_id: number;
    importancia?: string;
    ruta_id?: number;
    km_inicio?: number;
    km_fin?: number;
    sentido?: string;
    descripcion?: string;
    jurisdiccion?: string;
    obstruccion?: {
      obstruye_via: boolean;
      tipo_obstruccion?: string;
      porcentaje_obstruccion?: number;
      descripcion_manual?: string;
    };
    autoridades?: AutoridadSocorroPersistente[];
    socorro?: AutoridadSocorroPersistente[];
  }): Promise<SituacionPersistenteCompleta> {
    const { data: response } = await api.post('/situaciones-persistentes/completa', data);
    return response.situacion;
  },

  // Actualizar situación persistente completa
  async actualizarCompleta(id: number, data: {
    titulo?: string;
    tipo_emergencia_id?: number;
    importancia?: string;
    ruta_id?: number;
    km_inicio?: number;
    km_fin?: number;
    sentido?: string;
    descripcion?: string;
    jurisdiccion?: string;
    obstruccion?: {
      obstruye_via: boolean;
      tipo_obstruccion?: string;
      porcentaje_obstruccion?: number;
      descripcion_manual?: string;
    };
    autoridades?: AutoridadSocorroPersistente[];
    socorro?: AutoridadSocorroPersistente[];
  }): Promise<SituacionPersistenteCompleta> {
    const { data: response } = await api.put(`/situaciones-persistentes/${id}/completa`, data);
    return response.situacion;
  },

  // Obtener detalles de obstrucción
  async getObstruccion(id: number): Promise<ObstruccionPersistente | null> {
    const { data } = await api.get(`/situaciones-persistentes/${id}/obstruccion`);
    return data;
  },

  // Obtener autoridades
  async getAutoridades(id: number): Promise<AutoridadSocorroPersistente[]> {
    const { data } = await api.get(`/situaciones-persistentes/${id}/autoridades`);
    return data;
  },

  // Obtener socorro
  async getSocorro(id: number): Promise<AutoridadSocorroPersistente[]> {
    const { data } = await api.get(`/situaciones-persistentes/${id}/socorro`);
    return data;
  },

  // Subir multimedia
  async subirMultimedia(id: number, data: {
    tipo: 'foto' | 'video';
    url: string;
    orden?: number;
  }): Promise<MultimediaPersistente> {
    const { data: response } = await api.post(`/situaciones-persistentes/${id}/multimedia`, data);
    return response.multimedia;
  },

  // Obtener multimedia
  async getMultimedia(id: number): Promise<MultimediaPersistente[]> {
    const { data } = await api.get(`/situaciones-persistentes/${id}/multimedia`);
    return data;
  },

  // Eliminar multimedia
  async deleteMultimedia(situacionId: number, multimediaId: number): Promise<void> {
    await api.delete(`/situaciones-persistentes/${situacionId}/multimedia/${multimediaId}`);
  },
};
