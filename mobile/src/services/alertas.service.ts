import api from './api';

// ============================================
// SERVICIO DE ALERTAS - MOBILE
// ============================================

export interface Alerta {
  id: number;
  tipo: string;
  severidad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  estado: string;
  titulo: string;
  mensaje: string;
  datos: any;
  sede_id: number | null;
  unidad_id: number | null;
  brigada_id: number | null;
  situacion_id: number | null;
  created_at: string;
  sede_nombre?: string;
  unidad_codigo?: string;
  brigada_nombre?: string;
  minutos_activa?: number;
}

export interface ConteoAlertas {
  total: number;
  criticas: number;
  altas: number;
}

export const AlertasService = {
  /**
   * Obtener mis alertas no leídas
   */
  async obtenerMisAlertas(): Promise<Alerta[]> {
    const response = await api.get('/alertas/mis-alertas');
    return response.data;
  },

  /**
   * Contar alertas no leídas
   */
  async contarAlertas(): Promise<ConteoAlertas> {
    const response = await api.get('/alertas/contador');
    return response.data;
  },

  /**
   * Obtener alertas activas (para COP)
   */
  async obtenerAlertasActivas(filtros?: {
    tipo?: string;
    severidad?: string;
    limit?: number;
  }): Promise<Alerta[]> {
    const params = new URLSearchParams();
    if (filtros?.tipo) params.append('tipo', filtros.tipo);
    if (filtros?.severidad) params.append('severidad', filtros.severidad);
    if (filtros?.limit) params.append('limit', filtros.limit.toString());

    const response = await api.get(`/alertas?${params.toString()}`);
    return response.data;
  },

  /**
   * Marcar alerta como leída
   */
  async marcarComoLeida(alertaId: number): Promise<void> {
    await api.post(`/alertas/${alertaId}/leer`);
  },

  /**
   * Atender alerta
   */
  async atenderAlerta(alertaId: number, nota?: string): Promise<{
    success: boolean;
    mensaje: string;
  }> {
    const response = await api.put(`/alertas/${alertaId}/atender`, { nota });
    return response.data;
  },

  /**
   * Resolver alerta
   */
  async resolverAlerta(alertaId: number, nota?: string): Promise<{
    success: boolean;
    mensaje: string;
  }> {
    const response = await api.put(`/alertas/${alertaId}/resolver`, { nota });
    return response.data;
  },

  /**
   * Ignorar alerta
   */
  async ignorarAlerta(alertaId: number): Promise<void> {
    await api.put(`/alertas/${alertaId}/ignorar`);
  },

  /**
   * Obtener detalle de alerta
   */
  async obtenerAlerta(alertaId: number): Promise<Alerta> {
    const response = await api.get(`/alertas/${alertaId}`);
    return response.data;
  },

  /**
   * Crear alerta personalizada (para COP)
   */
  async crearAlerta(data: {
    titulo: string;
    mensaje: string;
    severidad?: string;
    tipo?: string;
    unidad_id?: number;
    brigada_id?: number;
    expira_en_minutos?: number;
  }): Promise<Alerta> {
    const response = await api.post('/alertas', data);
    return response.data;
  },

  /**
   * Obtener color según severidad
   */
  getColorSeveridad(severidad: string): string {
    switch (severidad) {
      case 'CRITICA':
        return '#dc2626';
      case 'ALTA':
        return '#ea580c';
      case 'MEDIA':
        return '#f59e0b';
      case 'BAJA':
      default:
        return '#3b82f6';
    }
  },

  /**
   * Obtener icono según tipo
   */
  getIconoTipo(tipo: string): string {
    switch (tipo) {
      case 'EMERGENCIA':
        return 'alert-circle';
      case 'UNIDAD_SIN_ACTIVIDAD':
        return 'car-outline';
      case 'INSPECCION_PENDIENTE':
        return 'clipboard-outline';
      case 'BRIGADA_FUERA_ZONA':
        return 'location-outline';
      case 'COMBUSTIBLE_BAJO':
        return 'water-outline';
      case 'MANTENIMIENTO_REQUERIDO':
        return 'build-outline';
      case 'APROBACION_REQUERIDA':
        return 'checkmark-circle-outline';
      case 'SISTEMA':
        return 'settings-outline';
      default:
        return 'notifications-outline';
    }
  },

  /**
   * Formatear tiempo desde creación
   */
  formatearTiempo(minutos: number): string {
    if (minutos < 60) {
      return `hace ${Math.round(minutos)} min`;
    } else if (minutos < 1440) {
      return `hace ${Math.round(minutos / 60)} horas`;
    } else {
      return `hace ${Math.round(minutos / 1440)} días`;
    }
  },
};

export default AlertasService;
