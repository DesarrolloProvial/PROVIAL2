/**
 * Hook para Manejo de Draft de Situacion
 *
 * Funcionalidades:
 * - Verificar si hay draft pendiente antes de crear nuevo
 * - Auto-guardado de formularios
 * - Envio con manejo de conflictos
 * - Integracion con backend
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {
  DraftSituacion,
  DraftStatus,
  TipoSituacion,
  MultimediaRef,
  hasDraftPendiente,
  getDraftPendiente,
  saveDraft,
  updateDraft,
  updateDraftStatus,
  deleteDraft,
  addMultimediaToDraft,
  removeMultimediaFromDraft,
  setDraftConflicto,
  setDraftWaitCOP
} from '../services/draftStorage';
import { generateSituacionId, SituacionIdParams } from '../utils/situacionId';
import { API_URL } from '../constants/config';
import { useAuthStore } from '../store/authStore';

/**
 * Respuesta del endpoint reservar-numero-salida
 */
interface ReservarNumeroResponse {
  num_situacion_salida: number;
  fecha: string;
  sede_id: number;
  unidad_id: number;
  unidad_codigo: string;
  salida_id: number;
  valido_hasta: string;
}

/**
 * Respuesta de conflicto del backend
 */
interface ConflictoResponse {
  error: string;
  codigo: string;
  codigo_situacion: string;
  situacion_existente: any;
  diferencias: Array<{campo: string; local: any; servidor: any}>;
  total_diferencias: number;
}

/**
 * Estado del hook
 */
interface UseDraftState {
  draft: DraftSituacion | null;
  loading: boolean;
  saving: boolean;
  sending: boolean;
  error: string | null;
  isOnline: boolean;
  hasPendiente: boolean;
}

/**
 * Hook principal para manejo de drafts
 */
export function useDraftSituacion() {
  const [state, setState] = useState<UseDraftState>({
    draft: null,
    loading: true,
    saving: false,
    sending: false,
    error: null,
    isOnline: true,
    hasPendiente: false
  });

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const token = useAuthStore(state => state.token);

  // Cargar draft al iniciar
  useEffect(() => {
    loadDraft();

    // Listener de conexion
    const unsubscribe = NetInfo.addEventListener(netState => {
      setState(prev => ({ ...prev, isOnline: !!netState.isConnected }));
    });

    return () => {
      unsubscribe();
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Cargar draft existente
   */
  const loadDraft = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const draft = await getDraftPendiente();
      const hasPendiente = draft !== null;
      setState(prev => ({
        ...prev,
        draft,
        hasPendiente,
        loading: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  }, []);

  /**
   * Verificar si se puede crear nueva situacion
   * Retorna true si no hay draft pendiente, false si hay bloqueo
   */
  const canCreateNew = useCallback(async (): Promise<{
    allowed: boolean;
    reason?: string;
    draftInfo?: { tipo: TipoSituacion; tiempoTranscurrido: string };
  }> => {
    const draft = await getDraftPendiente();

    if (!draft) {
      return { allowed: true };
    }

    // Calcular tiempo transcurrido
    const createdAt = new Date(draft.created_at);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - createdAt.getTime()) / 60000);
    let tiempoTranscurrido: string;
    if (diffMins < 60) {
      tiempoTranscurrido = `${diffMins} minutos`;
    } else {
      const hours = Math.floor(diffMins / 60);
      tiempoTranscurrido = `${hours}h ${diffMins % 60}min`;
    }

    return {
      allowed: false,
      reason: `Tienes ${draft.tipo_situacion} sin enviar desde hace ${tiempoTranscurrido}`,
      draftInfo: {
        tipo: draft.tipo_situacion,
        tiempoTranscurrido
      }
    };
  }, []);

  /**
   * Reservar numero de situacion para la salida actual
   */
  const reservarNumero = useCallback(async (unidadCodigo: string): Promise<ReservarNumeroResponse> => {
    if (!token) {
      throw new Error('No autenticado');
    }

    const response = await fetch(
      `${API_URL}/unidades/${unidadCodigo}/reservar-numero-salida`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al reservar numero');
    }

    return response.json();
  }, [token]);

  /**
   * Crear nuevo draft
   * IMPORTANTE: Verificar canCreateNew() antes de llamar
   */
  const crearDraft = useCallback(async (params: {
    tipo_situacion: TipoSituacion;
    tipo_situacion_id: number;
    unidad_codigo: string;
    ruta_id: number;
    ruta_nombre?: string;
    km: number;
    sentido: string;
    latitud: number;
    longitud: number;
  }): Promise<DraftSituacion> => {
    // Verificar que no hay draft pendiente
    const check = await canCreateNew();
    if (!check.allowed) {
      throw new Error(check.reason);
    }

    // Reservar numero
    const reserva = await reservarNumero(params.unidad_codigo);

    // Generar ID determinista
    const id = generateSituacionId({
      fecha: new Date(reserva.fecha),
      sede_id: reserva.sede_id,
      unidad_codigo: reserva.unidad_codigo,
      tipo_situacion_id: params.tipo_situacion_id,
      ruta_id: params.ruta_id,
      km: params.km,
      num_situacion_salida: reserva.num_situacion_salida
    });

    const now = new Date().toISOString();

    const draft: DraftSituacion = {
      id,
      num_situacion_salida: reserva.num_situacion_salida,
      fecha: reserva.fecha,
      sede_id: reserva.sede_id,
      unidad_id: reserva.unidad_id,
      unidad_codigo: reserva.unidad_codigo,
      salida_id: reserva.salida_id,
      tipo_situacion: params.tipo_situacion,
      tipo_situacion_id: params.tipo_situacion_id,
      ruta_id: params.ruta_id,
      ruta_nombre: params.ruta_nombre,
      km: params.km,
      sentido: params.sentido,
      latitud: params.latitud,
      longitud: params.longitud,
      multimedia: [],
      estado: 'DRAFT',
      created_at: now,
      updated_at: now
    };

    await saveDraft(draft);
    setState(prev => ({ ...prev, draft, hasPendiente: true }));

    return draft;
  }, [canCreateNew, reservarNumero]);

  /**
   * Actualizar draft con auto-save (debounced)
   */
  const actualizarDraft = useCallback(async (
    updates: Partial<DraftSituacion>,
    immediate: boolean = false
  ): Promise<void> => {
    // Cancelar auto-save anterior
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    const doSave = async () => {
      try {
        setState(prev => ({ ...prev, saving: true }));
        const updated = await updateDraft(updates);
        setState(prev => ({ ...prev, draft: updated, saving: false }));
      } catch (error: any) {
        setState(prev => ({ ...prev, saving: false, error: error.message }));
      }
    };

    if (immediate) {
      await doSave();
    } else {
      // Debounce de 500ms
      autoSaveTimeoutRef.current = setTimeout(doSave, 500);
    }
  }, []);

  /**
   * Agregar multimedia
   */
  const agregarMultimedia = useCallback(async (multimedia: MultimediaRef): Promise<void> => {
    await addMultimediaToDraft(multimedia);
    await loadDraft();
  }, [loadDraft]);

  /**
   * Remover multimedia
   */
  const removerMultimedia = useCallback(async (uri: string): Promise<void> => {
    await removeMultimediaFromDraft(uri);
    await loadDraft();
  }, [loadDraft]);

  /**
   * Enviar draft al backend
   */
  const enviarDraft = useCallback(async (): Promise<{
    success: boolean;
    situacion_id?: number;
    numero_situacion?: string;
    conflicto?: ConflictoResponse;
    error?: string;
  }> => {
    const draft = await getDraftPendiente();
    if (!draft) {
      return { success: false, error: 'No hay draft para enviar' };
    }

    if (!token) {
      return { success: false, error: 'No autenticado' };
    }

    // Verificar conexion
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      await updateDraftStatus('PENDIENTE');
      return { success: false, error: 'Sin conexion. Draft guardado localmente.' };
    }

    try {
      setState(prev => ({ ...prev, sending: true, error: null }));
      await updateDraftStatus('ENVIANDO');

      const response = await fetch(`${API_URL}/situaciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': draft.id
        },
        body: JSON.stringify({
          id: draft.id,
          tipo_situacion: draft.tipo_situacion,
          tipo_situacion_id: draft.tipo_situacion_id,
          sede_id: draft.sede_id,
          unidad_id: draft.unidad_id,
          salida_id: draft.salida_id,
          ruta_id: draft.ruta_id,
          km: draft.km,
          sentido: draft.sentido,
          latitud: draft.latitud,
          longitud: draft.longitud,
          descripcion: draft.descripcion,
          observaciones: draft.observaciones,
          tipo_hecho: draft.tipo_hecho,
          tipo_asistencia: draft.tipo_asistencia,
          tipo_emergencia: draft.tipo_emergencia,
          vehiculos: draft.vehiculos,
          personas: draft.personas,
          autoridades: draft.autoridades
        })
      });

      if (response.ok) {
        // Exito!
        const data = await response.json();

        // Subir multimedia si hay
        if (draft.multimedia.length > 0) {
          await subirMultimedia(data.situacion_id, draft.multimedia);
        }

        // Limpiar draft
        await deleteDraft();
        setState(prev => ({
          ...prev,
          draft: null,
          hasPendiente: false,
          sending: false
        }));

        return {
          success: true,
          situacion_id: data.situacion_id,
          numero_situacion: data.numero_situacion
        };
      }

      if (response.status === 409) {
        // Conflicto
        const conflicto: ConflictoResponse = await response.json();

        await setDraftConflicto(
          conflicto.situacion_existente,
          conflicto.diferencias
        );

        setState(prev => ({ ...prev, sending: false }));
        await loadDraft();

        return {
          success: false,
          conflicto
        };
      }

      // Otro error
      const error = await response.json();
      await updateDraftStatus('PENDIENTE');
      setState(prev => ({ ...prev, sending: false, error: error.error }));

      return { success: false, error: error.error || 'Error al enviar' };

    } catch (error: any) {
      // Error de red
      await updateDraftStatus('PENDIENTE');
      setState(prev => ({
        ...prev,
        sending: false,
        error: 'Sin conexion. Draft guardado localmente.'
      }));

      return {
        success: false,
        error: 'Sin conexion. Draft guardado localmente.'
      };
    }
  }, [token, loadDraft]);

  /**
   * Subir multimedia al backend
   */
  const subirMultimedia = async (
    situacionId: number,
    multimedia: MultimediaRef[]
  ): Promise<void> => {
    for (const media of multimedia) {
      try {
        const formData = new FormData();
        formData.append('file', {
          uri: media.uri,
          type: media.tipo === 'FOTO' ? 'image/jpeg' : 'video/mp4',
          name: media.tipo === 'FOTO' ? `foto_${media.orden}.jpg` : 'video.mp4'
        } as any);
        formData.append('tipo', media.tipo);
        if (media.orden) {
          formData.append('orden', String(media.orden));
        }

        await fetch(`${API_URL}/situaciones/${situacionId}/multimedia`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
      } catch (error) {
        console.error('[DRAFT] Error subiendo multimedia:', error);
        // Continuar con el siguiente, no fallar todo
      }
    }
  };

  /**
   * Resolver conflicto: Usar datos locales (sobreescribir servidor)
   */
  const resolverConflictoUsarLocal = useCallback(async (): Promise<boolean> => {
    const draft = await getDraftPendiente();
    if (!draft || draft.estado !== 'CONFLICTO') {
      return false;
    }

    try {
      setState(prev => ({ ...prev, sending: true }));

      const response = await fetch(
        `${API_URL}/situaciones/${draft.conflicto?.datos_servidor?.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...draft,
            razon_actualizacion: 'Datos locales seleccionados por usuario'
          })
        }
      );

      if (response.ok) {
        await deleteDraft();
        setState(prev => ({
          ...prev,
          draft: null,
          hasPendiente: false,
          sending: false
        }));
        return true;
      }

      setState(prev => ({ ...prev, sending: false }));
      return false;
    } catch (error) {
      setState(prev => ({ ...prev, sending: false }));
      return false;
    }
  }, [token]);

  /**
   * Resolver conflicto: Usar datos del servidor (eliminar local)
   */
  const resolverConflictoUsarServidor = useCallback(async (): Promise<boolean> => {
    await deleteDraft();
    setState(prev => ({
      ...prev,
      draft: null,
      hasPendiente: false
    }));
    return true;
  }, []);

  /**
   * Resolver conflicto: Esperar decision del COP
   */
  const resolverConflictoEsperar = useCallback(async (): Promise<boolean> => {
    const draft = await getDraftPendiente();
    if (!draft || draft.estado !== 'CONFLICTO') {
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/situaciones/conflictos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          codigo_situacion: draft.id,
          datos_locales: draft,
          datos_servidor: draft.conflicto?.datos_servidor,
          diferencias: draft.conflicto?.diferencias,
          tipo_conflicto: 'DUPLICADO'
        })
      });

      if (response.ok) {
        const data = await response.json();
        await setDraftWaitCOP(data.conflicto_id);
        await loadDraft();
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }, [token, loadDraft]);

  /**
   * Eliminar draft (cancelar)
   */
  const eliminarDraft = useCallback(async (): Promise<void> => {
    await deleteDraft();
    setState(prev => ({
      ...prev,
      draft: null,
      hasPendiente: false
    }));
  }, []);

  /**
   * Reintentar envio de draft pendiente
   */
  const reintentar = useCallback(async () => {
    return enviarDraft();
  }, [enviarDraft]);

  return {
    // Estado
    ...state,

    // Acciones
    loadDraft,
    canCreateNew,
    crearDraft,
    actualizarDraft,
    agregarMultimedia,
    removerMultimedia,
    enviarDraft,
    eliminarDraft,
    reintentar,

    // Resolucion de conflictos
    resolverConflictoUsarLocal,
    resolverConflictoUsarServidor,
    resolverConflictoEsperar
  };
}

export default useDraftSituacion;
