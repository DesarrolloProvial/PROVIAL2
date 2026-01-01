import api from './api';

// ============================================
// INTERFACES
// ============================================

export interface AprobacionPendiente {
  aprobacion_id: number;
  tipo: 'CONFIRMAR_PRESENCIA' | 'APROBAR_FIN_JORNADA' | 'APROBAR_360';
  estado_aprobacion: string;
  fecha_inicio: string;
  tiempo_limite_minutos: number;
  observaciones?: string;
  usuario_id: number;
  respuesta: string;
  unidad_codigo: string;
  tipo_unidad: string;
  salida_id: number;
  minutos_restantes: number;
  iniciado_por_nombre: string;
}

export interface RespuestaAprobacion {
  id: number;
  usuario_id: number;
  nombre_completo: string;
  chapa?: string;
  respuesta: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE';
  fecha_respuesta?: string;
  motivo_rechazo?: string;
}

export interface DetalleAprobacion {
  aprobacion: {
    id: number;
    tipo: string;
    estado: string;
    fecha_inicio: string;
    unidad_codigo: string;
    tipo_unidad: string;
    iniciado_por_nombre: string;
  };
  respuestas: RespuestaAprobacion[];
}

export interface EstadoPresencia {
  tiene_aprobacion: boolean;
  aprobacion_id?: number;
  estado?: string;
  confirmados?: number;
  total?: number;
  puede_iniciar: boolean;
  mensaje: string;
}

// ============================================
// SERVICIO DE APROBACIONES
// ============================================

export const aprobacionesService = {
  /**
   * Obtener mis aprobaciones pendientes de responder
   */
  async obtenerPendientes(): Promise<AprobacionPendiente[]> {
    const response = await api.get('/aprobaciones/pendientes');
    return response.data.aprobaciones;
  },

  /**
   * Obtener detalle de una aprobacion
   */
  async obtenerDetalle(aprobacionId: number): Promise<DetalleAprobacion> {
    const response = await api.get(`/aprobaciones/${aprobacionId}`);
    return response.data;
  },

  /**
   * Responder a una aprobacion
   */
  async responder(
    aprobacionId: number,
    respuesta: 'APROBADO' | 'RECHAZADO',
    motivo?: string,
    ubicacion?: { latitud: number; longitud: number }
  ): Promise<{
    estado: string;
    conteo: {
      total: number;
      aprobados: number;
      rechazados: number;
      pendientes: number;
    };
  }> {
    const response = await api.post(`/aprobaciones/${aprobacionId}/responder`, {
      respuesta,
      motivo,
      latitud: ubicacion?.latitud,
      longitud: ubicacion?.longitud,
    });
    return response.data;
  },

  /**
   * Cancelar una aprobacion que yo inicie
   */
  async cancelar(aprobacionId: number): Promise<void> {
    await api.post(`/aprobaciones/${aprobacionId}/cancelar`);
  },

  // ============================================
  // CREAR SOLICITUDES
  // ============================================

  /**
   * Crear solicitud de confirmacion de presencia
   */
  async crearConfirmacionPresencia(salidaId: number): Promise<{
    aprobacion_id: number;
  }> {
    const response = await api.post('/aprobaciones/confirmar-presencia', {
      salida_id: salidaId,
    });
    return response.data;
  },

  /**
   * Crear solicitud de aprobacion de fin de jornada
   */
  async crearAprobacionFinJornada(salidaId: number): Promise<{
    aprobacion_id: number;
  }> {
    const response = await api.post('/aprobaciones/fin-jornada', {
      salida_id: salidaId,
    });
    return response.data;
  },

  /**
   * Crear solicitud de aprobacion de inspeccion 360
   */
  async crearAprobacion360(salidaId: number, inspeccion360Id: number): Promise<{
    aprobacion_id: number;
  }> {
    const response = await api.post('/aprobaciones/inspeccion-360', {
      salida_id: salidaId,
      inspeccion_360_id: inspeccion360Id,
    });
    return response.data;
  },

  // ============================================
  // VERIFICACIONES
  // ============================================

  /**
   * Verificar estado de confirmacion de presencia para una salida
   */
  async verificarPresencia(salidaId: number): Promise<EstadoPresencia> {
    const response = await api.get(`/aprobaciones/salida/${salidaId}/presencia`);
    return response.data;
  },

  /**
   * Verificar si se puede iniciar salida (presencia confirmada)
   */
  async puedeIniciarSalida(salidaId: number): Promise<boolean> {
    try {
      const estado = await this.verificarPresencia(salidaId);
      return estado.puede_iniciar;
    } catch {
      return false;
    }
  },
};

export default aprobacionesService;
