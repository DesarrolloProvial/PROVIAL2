import api from './api';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

// ============================================
// INTERFACES
// ============================================

export interface Plantilla360 {
  id: number;
  tipo_unidad: string;
  nombre: string;
  descripcion: string;
  version: number;
  secciones: Seccion360[];
  activa: boolean;
}

export interface Seccion360 {
  nombre: string;
  items: Item360[];
}

export interface Item360 {
  codigo: string;
  descripcion: string;
  tipo: 'CHECKBOX' | 'ESTADO' | 'TEXTO' | 'TEXTO_FOTO' | 'NUMERO';
  requerido: boolean;
  opciones?: string[];
}

export interface Inspeccion360 {
  id: number;
  unidad_id: number;
  plantilla_id: number;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  fecha_realizacion: string;
  fecha_aprobacion?: string;
  respuestas: Respuesta360[];
  observaciones_inspector?: string;
  observaciones_comandante?: string;
  motivo_rechazo?: string;
}

export interface Respuesta360 {
  codigo: string;
  valor: any;
  foto_url?: string;
  observacion?: string;
}

export interface CreateInspeccionDTO {
  unidad_id: number;
  plantilla_id: number;
  salida_id?: number;
  respuestas: Respuesta360[];
  observaciones_inspector?: string;
  firma_inspector?: string;
}

// ============================================
// SERVICIO
// ============================================

export const inspeccion360Service = {
  /**
   * Obtener plantilla por tipo de unidad
   */
  async getPlantilla(tipoUnidad: string): Promise<Plantilla360> {
    const response = await api.get(`/inspeccion360/plantilla/${tipoUnidad}`);
    return response.data;
  },

  /**
   * Crear nueva inspeccion
   */
  async crear(data: CreateInspeccionDTO): Promise<Inspeccion360> {
    const response = await api.post('/inspeccion360', data);
    return response.data;
  },

  /**
   * Obtener inspeccion por ID
   */
  async getById(id: number): Promise<Inspeccion360> {
    const response = await api.get(`/inspeccion360/${id}`);
    return response.data;
  },

  /**
   * Obtener inspeccion pendiente de una unidad
   */
  async getPendiente(unidadId: number): Promise<Inspeccion360 | null> {
    try {
      const response = await api.get(`/inspeccion360/unidad/${unidadId}/pendiente`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Verificar si puede iniciar salida (tiene 360 aprobada)
   */
  async verificarSalida(unidadId: number): Promise<{
    tiene_inspeccion: boolean;
    inspeccion?: Inspeccion360;
    es_comandante: boolean;
  }> {
    const response = await api.get(`/inspeccion360/verificar-salida/${unidadId}`);
    return response.data;
  },

  /**
   * Aprobar inspeccion (solo comandante)
   */
  async aprobar(id: number, firma?: string, observaciones?: string): Promise<Inspeccion360> {
    const response = await api.put(`/inspeccion360/${id}/aprobar`, {
      firma,
      observaciones,
    });
    return response.data;
  },

  /**
   * Rechazar inspeccion (solo comandante)
   */
  async rechazar(id: number, motivo_rechazo: string): Promise<Inspeccion360> {
    const response = await api.put(`/inspeccion360/${id}/rechazar`, {
      motivo_rechazo,
    });
    return response.data;
  },

  /**
   * Obtener historial de inspecciones de una unidad
   */
  async getHistorial(unidadId: number, limite: number = 30): Promise<Inspeccion360[]> {
    const response = await api.get(`/inspeccion360/historial/${unidadId}?limite=${limite}`);
    return response.data.inspecciones || [];
  },

  /**
   * Descargar PDF de inspeccion
   */
  async descargarPDF(inspeccionId: number, unidadCodigo: string): Promise<string> {
    try {
      // Obtener el token actual
      const token = api.defaults.headers.common['Authorization'];

      // URL del PDF
      const pdfUrl = `${api.defaults.baseURL}/inspeccion360/${inspeccionId}/pdf`;

      // Nombre del archivo
      const fechaHoy = new Date().toISOString().split('T')[0];
      const filename = `inspeccion_360_${unidadCodigo}_${fechaHoy}.pdf`;
      const fileUri = FileSystem.documentDirectory + filename;

      // Descargar el archivo
      const downloadResult = await FileSystem.downloadAsync(
        pdfUrl,
        fileUri,
        {
          headers: {
            Authorization: token as string,
          },
        }
      );

      if (downloadResult.status !== 200) {
        throw new Error('Error al descargar el PDF');
      }

      return downloadResult.uri;
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      throw error;
    }
  },

  /**
   * Compartir PDF de inspeccion
   */
  async compartirPDF(inspeccionId: number, unidadCodigo: string): Promise<void> {
    try {
      const fileUri = await this.descargarPDF(inspeccionId, unidadCodigo);

      // Verificar si se puede compartir
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('La funcionalidad de compartir no esta disponible en este dispositivo');
      }

      // Compartir el archivo
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartir Inspeccion 360',
      });
    } catch (error) {
      console.error('Error al compartir PDF:', error);
      throw error;
    }
  },

  /**
   * Verificar si usuario es comandante de la unidad
   */
  async esComandante(unidadId: number): Promise<boolean> {
    try {
      const response = await api.get(`/inspeccion360/comandante/${unidadId}`);
      return !!response.data?.es_comandante;
    } catch {
      return false;
    }
  },
};

export default inspeccion360Service;
