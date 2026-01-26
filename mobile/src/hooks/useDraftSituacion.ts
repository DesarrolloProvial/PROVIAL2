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
import MultimediaService from '../services/multimedia.service';
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
  diferencias: Array<{ campo: string; local: any; servidor: any }>;
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

    // Reservar numero (Intentar Online, fallback Offline)
    let reserva: ReservarNumeroResponse;
    try {
      reserva = await reservarNumero(params.unidad_codigo);
    } catch (error) {
      console.warn('[Draft] Falló reserva online. Usando modo offline:', error);
      // Fallback: Datos temporales para permitir trabajar offline o sin salida activa
      reserva = {
        num_situacion_salida: 0, // 0 indica pendiente de sincronizar
        fecha: new Date().toISOString(),
        sede_id: 1, // Default (idealmente debería venir del AuthStore)
        unidad_id: 0,
        unidad_codigo: params.unidad_codigo,
        salida_id: 0,
        valido_hasta: new Date(Date.now() + 86400000).toISOString()
      };
    }

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
    console.log('🚨 [ENVIAR_DRAFT] Función enviarDraft() llamada');
    const draft = await getDraftPendiente();
    if (!draft) {
      console.warn('[ENVIAR_DRAFT] No hay draft para enviar');
      return { success: false, error: 'No hay draft para enviar' };
    }

    if (!token) {
      console.warn('[ENVIAR_DRAFT] No autenticado');
      return { success: false, error: 'No autenticado' };
    }

    // Verificar conexion
    const netInfo = await NetInfo.fetch();
    console.log('[ENVIAR_DRAFT] Conexión:', netInfo.isConnected);
    if (!netInfo.isConnected) {
      await updateDraftStatus('PENDIENTE');
      console.warn('[ENVIAR_DRAFT] Sin conexión. Draft guardado localmente');
      return { success: false, error: 'Sin conexion. Draft guardado localmente.' };
    }

    try {
      setState(prev => ({ ...prev, sending: true, error: null }));
      await updateDraftStatus('ENVIANDO');

      // Helpers para normalizar valores vacíos a null
      const toNull = (v: any) => (v === '' || v === undefined ? null : v);
      const toIntOrNull = (v: any) => {
        if (v === '' || v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      // Sanitizar payload: convertir "" a null para IDs y campos opcionales
      const payload = {
        ...draft,
        // IDs de catálogos: nunca enviar "" (string vacío)
        tipo_hecho_id: toIntOrNull(draft.tipo_hecho_id),
        tipo_asistencia_id: toIntOrNull(draft.tipo_asistencia_id),
        tipo_emergencia_id: toIntOrNull(draft.tipo_emergencia_id),
        departamento_id: toIntOrNull(draft.departamento_id),
        municipio_id: toIntOrNull(draft.municipio_id),

        // Campos opcionales: convertir "" a null
        tipo_pavimento: toNull(draft.tipo_pavimento ?? draft.material_via),
        descripcion: toNull(draft.descripcion),
        observaciones: toNull(draft.observaciones),
        clima: toNull(draft.clima),
        carga_vehicular: toNull(draft.carga_vehicular),
        area: toNull(draft.area),

        // Mantener ID determinista
        id: draft.id,

        // Remover campos internos del draft que no necesita el backend
        multimedia: undefined, // Se sube después con endpoint separado
        estado: undefined,
        created_at: undefined,
        updated_at: undefined,
        conflicto: undefined,
        num_situacion_salida: undefined,
        fecha: undefined,
        material_via: undefined // Ya se mandó como tipo_pavimento
      };

      console.log('🚀 [ENVIAR_DRAFT] Haciendo POST a:', `${API_URL}/situaciones`);
      console.log('📦 [ENVIAR_DRAFT] Payload sanitizado:', JSON.stringify({...payload, multimedia: undefined}, null, 2));

      const response = await fetch(`${API_URL}/situaciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': draft.id
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Exito!
        const data = await response.json();
        console.log('✅ [ENVIAR_DRAFT] POST exitoso:', response.status);
        console.log('✅ [ENVIAR_DRAFT] Respuesta:', JSON.stringify(data, null, 2));

        // El backend retorna { situacion: { id, numero_situacion, ... } }
        const situacionId = data.situacion?.id || data.situacion_id;
        const numeroSituacion = data.situacion?.numero_situacion || data.numero_situacion;

        console.log('📍 [ENVIAR_DRAFT] situacionId extraído:', situacionId);

        // Subir multimedia si hay
        if (draft.multimedia.length > 0 && situacionId) {
          await subirMultimedia(situacionId, draft.multimedia);
        } else if (draft.multimedia.length > 0 && !situacionId) {
          console.error('❌ [ENVIAR_DRAFT] No se puede subir multimedia: situacionId es undefined');
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
          situacion_id: situacionId,
          numero_situacion: numeroSituacion
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

      // Otro error (400, 500, etc.)
      console.log('❌ [ENVIAR_DRAFT] Error HTTP:', response.status);
      const error = await response.json();
      console.log('❌ [ENVIAR_DRAFT] Error body:', JSON.stringify(error, null, 2));

      await updateDraftStatus('PENDIENTE');
      setState(prev => ({ ...prev, sending: false, error: error.error }));

      return { success: false, error: error.error || 'Error al enviar' };

    } catch (error: any) {
      // Error de red o fetch
      console.log('❌ [ENVIAR_DRAFT] ERROR capturado en catch');
      console.log('❌ [ENVIAR_DRAFT] error.message:', error?.message);
      console.log('❌ [ENVIAR_DRAFT] error.response?.status:', error?.response?.status);
      console.log('❌ [ENVIAR_DRAFT] error.response?.data:', JSON.stringify(error?.response?.data, null, 2));

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
   * Subir multimedia al backend usando MultimediaService
   * Usa los endpoints correctos: /multimedia/situacion/:id/foto y /multimedia/situacion/:id/video
   */
  const subirMultimedia = async (
    situacionId: number,
    multimedia: MultimediaRef[]
  ): Promise<void> => {
    console.log(`📸 [MULTIMEDIA] Subiendo ${multimedia.length} archivos a situacion ${situacionId}`);

    for (const media of multimedia) {
      const tipo = media.tipo as 'FOTO' | 'VIDEO';
      const uri = media.uri;

      // Construir objeto MediaFile compatible con el servicio
      const guessMime = (uri: string, tipo: 'FOTO' | 'VIDEO') => {
        if (tipo === 'VIDEO') return 'video/mp4';
        if (uri.toLowerCase().endsWith('.png')) return 'image/png';
        return 'image/jpeg';
      };

      const buildName = (uri: string, tipo: 'FOTO' | 'VIDEO', orden?: number) => {
        const ext = tipo === 'VIDEO' ? 'mp4' : uri.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
        return tipo === 'VIDEO' ? `video_${Date.now()}.${ext}` : `foto_${orden ?? 1}_${Date.now()}.${ext}`;
      };

      const mediaFile = {
        uri,
        type: tipo === 'FOTO' ? 'image' as const : 'video' as const,
        mimeType: guessMime(uri, tipo),
        fileName: buildName(uri, tipo, media.orden),
        duration: media.duracion_segundos,
      };

      const location = (media.latitud && media.longitud)
        ? { latitude: media.latitud, longitude: media.longitud }
        : undefined;

      try {
        let result;

        if (tipo === 'FOTO') {
          console.log(`📷 [MULTIMEDIA] Subiendo FOTO ${media.orden || 1}...`);
          result = await MultimediaService.uploadPhoto(situacionId, mediaFile, location);
        } else {
          console.log(`🎥 [MULTIMEDIA] Subiendo VIDEO...`);
          result = await MultimediaService.uploadVideo(situacionId, mediaFile, location);
        }

        if (result.success) {
          console.log(`✅ [MULTIMEDIA] ${tipo} subida OK -> ID: ${result.id}, URL: ${result.url}`);
        } else {
          console.error(`❌ [MULTIMEDIA] ${tipo} FALLÓ:`, result.error);
          // TODO: Marcar como pendiente de reintento en storage local
        }
      } catch (error: any) {
        console.error(`❌ [MULTIMEDIA] Error subiendo ${tipo}:`, error?.message || error);
        // Continuar con el siguiente, no fallar todo
        // TODO: Marcar como pendiente de reintento
      }
    }

    console.log(`📸 [MULTIMEDIA] Proceso de subida completado para situacion ${situacionId}`);
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
