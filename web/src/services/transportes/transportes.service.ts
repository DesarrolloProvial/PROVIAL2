import api from '../api';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface CombustibleRegistro {
  id: number;
  unidad_id: number;
  asignacion_id: number | null;
  turno_id: number | null;
  tipo: 'INICIAL' | 'RECARGA' | 'FINAL' | 'AJUSTE';
  nivel_anterior: string | null;       // 'RESERVA','1/4','LLENO', etc.
  nivel_nuevo: string | null;
  combustible_anterior: number | null; // decimal 0-1.0
  combustible_nuevo: number | null;    // decimal 0-1.0
  odometro_anterior: number | null;
  odometro_actual: number | null;
  km_recorridos: number | null;
  observaciones: string | null;
  registrado_por: number;
  registrado_por_nombre?: string;
  created_at: string;
}

export interface HistorialItem {
  categoria: 'COMBUSTIBLE' | 'SALIDA' | 'REPARACION';
  id: number;
  fecha: string;
  datos: {
    // COMBUSTIBLE
    tipo?: string;
    nivel_anterior?: string | null;
    nivel_nuevo?: string | null;
    odometro_actual?: number | null;
    km_recorridos?: number | null;
    observaciones?: string | null;
    usuario?: string | null;
    // SALIDA
    estado?: string;
    km_inicial?: number | null;
    km_final?: number | null;
    fecha_regreso?: string | null;
    observaciones_salida?: string | null;
    observaciones_regreso?: string | null;
    // REPARACION
    motivo?: string;
    descripcion?: string | null;
    fecha_fin?: string | null;
    dias_en_taller?: number;
  };
}

export interface RegistrarAjusteCombustibleDTO {
  unidad_id: number;
  tipo: 'AJUSTE';
  nivel_anterior: string | null;
  nivel_nuevo: string;
  combustible_anterior?: number;
  combustible_nuevo: number;
  odometro_actual?: number;
  observaciones?: string;
}

export interface Abastecimiento {
  id: number;
  unidad_id: number;
  tipo: 'ABASTECIMIENTO';
  nivel_anterior: string | null;
  nivel_nuevo: string;
  combustible_anterior: number | null;
  combustible_nuevo: number;
  odometro_actual: number | null;
  litros_cargados: number;
  observaciones: string | null;
  registrado_por: number;
  registrado_por_nombre?: string;
  created_at: string;
}

export interface RegistrarAbastecimientoDTO {
  unidad_id: number;
  nivel_anterior: string | null;
  nivel_nuevo: string;
  combustible_anterior?: number;
  combustible_nuevo: number;
  odometro_actual?: number;
  litros_cargados: number;
  observaciones?: string;
}

export interface Inspeccion360 {
  id: number;
  unidad_id: number;
  unidad_codigo?: string;
  tipo_unidad?: string;
  sede_nombre?: string;
  salida_id: number | null;
  inspector_id: number;
  inspector_nombre?: string;
  comandante_id: number | null;
  comandante_nombre?: string | null;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  fecha_inspeccion: string;
  fecha_aprobacion: string | null;
  observaciones_comandante: string | null;
  tiene_pdf: boolean;
  created_at: string;
}

export interface Plantilla360 {
  id: number;
  tipo_unidad: string;
  nombre: string;
  version: number;
  activa: boolean;
  secciones: SeccionPlantilla[];
}

export interface SeccionPlantilla {
  id: string;
  nombre: string;
  orden: number;
  items: ItemPlantilla[];
}

export interface ItemPlantilla {
  id: string;
  descripcion: string;
  tipo: 'CHECK' | 'TEXTO' | 'NUMERO' | 'SELECTOR' | 'RADIO' | 'MULTIPLE';
  requerido: boolean;
  orden: number;
  opciones?: string[];
}

// ── Servicio ──────────────────────────────────────────────────────────────────

export const transportesService = {

  // ── Unidades y combustible ─────────────────────────────────────────────────

  async getUnidades(params: { sede_id?: number; tipo?: string; activa?: boolean } = {}) {
    const query = new URLSearchParams();
    if (params.sede_id) query.set('sede_id', String(params.sede_id));
    if (params.tipo) query.set('tipo', params.tipo);
    if (params.activa !== undefined) query.set('activa', String(params.activa));
    const res = await api.get(`/unidades?${query.toString()}`);
    return res.data;
  },

  async getHistorialCombustible(unidadId: number, limit = 50): Promise<CombustibleRegistro[]> {
    const res = await api.get(`/operaciones/combustible/unidad/${unidadId}?limit=${limit}`);
    return res.data.data || res.data || [];
  },

  async getHistorialUnificado(
    unidadId: number,
    params: { desde: string; hasta: string; tipos?: string[] }
  ): Promise<HistorialItem[]> {
    const q = new URLSearchParams();
    q.set('desde', params.desde);
    q.set('hasta', params.hasta);
    if (params.tipos && params.tipos.length > 0) q.set('tipos', params.tipos.join(','));
    const res = await api.get(`/reparaciones/historial/${unidadId}?${q.toString()}`);
    return res.data.data || [];
  },

  async registrarAjusteCombustible(data: RegistrarAjusteCombustibleDTO): Promise<CombustibleRegistro> {
    const res = await api.post('/operaciones/combustible', data);
    return res.data;
  },

  async registrarAbastecimiento(data: RegistrarAbastecimientoDTO): Promise<Abastecimiento> {
    const res = await api.post('/operaciones/combustible/abastecimiento', data);
    return res.data.data;
  },

  async getAbastecimientos(unidadId: number, limit = 30): Promise<Abastecimiento[]> {
    const res = await api.get(`/operaciones/combustible/abastecimiento/${unidadId}?limit=${limit}`);
    return res.data.data || [];
  },

  // ── Inspecciones 360 ───────────────────────────────────────────────────────

  async getInspeccionesPendientes(): Promise<Inspeccion360[]> {
    const res = await api.get('/inspeccion360/pendientes');
    return res.data.inspecciones || [];
  },

  async getHistorialInspeccion(unidadId: number, limit = 20): Promise<Inspeccion360[]> {
    const res = await api.get(`/inspeccion360/historial/${unidadId}?limit=${limit}`);
    return res.data.historial || [];
  },

  async getHistorialPDFs(unidadId: number): Promise<any[]> {
    const res = await api.get(`/inspeccion360/historial/${unidadId}/pdfs`);
    return res.data.pdfs || res.data || [];
  },

  async aprobarInspeccion(id: number, observaciones?: string): Promise<void> {
    await api.put(`/inspeccion360/${id}/aprobar`, { observaciones });
  },

  async rechazarInspeccion(id: number, observaciones: string): Promise<void> {
    await api.put(`/inspeccion360/${id}/rechazar`, { observaciones });
  },

  async getEstadisticas360(): Promise<any> {
    const res = await api.get('/inspeccion360/estadisticas');
    return res.data;
  },

  // ── Plantillas 360 ─────────────────────────────────────────────────────────

  async getPlantillas(): Promise<Plantilla360[]> {
    const res = await api.get('/inspeccion360/plantillas');
    return res.data.plantillas || res.data || [];
  },

  async getPlantilla(tipoUnidad: string): Promise<Plantilla360 | null> {
    try {
      const res = await api.get(`/inspeccion360/plantilla/${tipoUnidad}`);
      return res.data;
    } catch {
      return null;
    }
  },

  async crearPlantilla(data: { tipo_unidad: string; nombre: string; secciones?: SeccionPlantilla[] }): Promise<Plantilla360> {
    const res = await api.post('/inspeccion360/plantillas', data);
    return res.data;
  },

  async actualizarPlantilla(id: number, data: Partial<Plantilla360>): Promise<Plantilla360> {
    const res = await api.put(`/inspeccion360/plantillas/${id}`, data);
    return res.data;
  },

  // ── Reparaciones ───────────────────────────────────────────────────────────

  async getReparacionesActivas(): Promise<any[]> {
    const res = await api.get('/reparaciones/activas');
    return res.data.data || [];
  },

  async getReparacionesPorUnidad(unidadId: number): Promise<any[]> {
    const res = await api.get(`/reparaciones/unidad/${unidadId}`);
    return res.data.data || [];
  },

  async crearReparacion(data: { unidad_id: number; motivo: string; descripcion?: string; fecha_inicio?: string }): Promise<any> {
    const res = await api.post('/reparaciones', data);
    return res.data;
  },

  async completarReparacion(id: number, fecha_fin?: string): Promise<any> {
    const res = await api.put(`/reparaciones/${id}/completar`, { fecha_fin });
    return res.data;
  },
};
