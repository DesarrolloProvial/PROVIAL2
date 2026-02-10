/**
 * Servicio de Almacenamiento de Draft Unico
 * Arquitectura Offline-First para PROVIAL Movil
 *
 * Principio: UN SOLO DRAFT a la vez
 * - Simple, claro, sin confusiones
 * - Si hay draft pendiente, no se puede crear otro
 * - Usa AsyncStorage con una sola key
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_KEY = 'situacion_pendiente';

/**
 * Estados del draft en el movil
 */
export type DraftStatus =
  | 'DRAFT'       // Llenando formulario
  | 'PENDIENTE'   // Completo, esperando conexion
  | 'ENVIANDO'    // En proceso de envio
  | 'CONFLICTO'   // 409, esperando decision del usuario
  | 'WAIT_COP';   // Esperando resolucion del COP

/**
 * Tipos de situacion soportados
 */
export type TipoSituacion =
  | 'PATRULLAJE'
  | 'HECHO_TRANSITO'
  | 'ASISTENCIA_VEHICULAR'
  | 'EMERGENCIA'
  | 'REGULACION_TRAFICO'
  | 'PARADA_ESTRATEGICA'
  | 'CAMBIO_RUTA'
  | 'COMIDA'
  | 'DESCANSO'
  | 'OTROS';

/**
 * Referencia a multimedia local
 */
export interface MultimediaRef {
  tipo: 'FOTO' | 'VIDEO';
  uri: string;
  orden?: number; // Solo para fotos (1, 2, 3)
  infografia_numero?: number; // Agrupador de evidencia
  infografia_titulo?: string; // Título opcional
  // Metadata opcional para subida
  latitud?: number;
  longitud?: number;
  duracion_segundos?: number; // Solo para videos
}

/**
 * Estructura del draft unico
 * Almacenado en AsyncStorage como JSON
 */
export interface DraftSituacion {
  // Identificador determinista
  id: string; // Formato: YYYYMMDD-SEDE-UNIDAD-TIPO-RUTA-KM-NUM

  // Datos de contexto (obtenidos al reservar numero)
  num_situacion_salida: number;
  fecha: string; // ISO date
  sede_id: number;
  unidad_id: number;
  unidad_codigo: string;
  salida_id: number;

  // Tipo de situacion
  tipo_situacion: TipoSituacion;
  tipo_situacion_id: number;

  // Ubicacion
  ruta_id: number;
  ruta_nombre?: string;
  km: number;
  sentido: string;
  latitud: number;
  longitud: number;
  ubicacion_manual?: boolean;

  // Datos adicionales (varian segun tipo)
  descripcion?: string;
  observaciones?: string;

  // Campos especificos por tipo
  tipo_hecho?: string; // HECHO_TRANSITO (legacy - string)
  tipo_asistencia?: string; // ASISTENCIA_VEHICULAR (legacy - string)
  tipo_emergencia?: string; // EMERGENCIA (legacy - string)

  // IDs de catálogos (nuevos - alineados con backend)
  tipo_hecho_id?: number | null;
  tipo_asistencia_id?: number | null;
  tipo_emergencia_id?: number | null;

  // Campos adicionales del formulario
  clima?: string | null;
  carga_vehicular?: string | null;
  departamento_id?: number | null;
  municipio_id?: number | null;
  tipo_pavimento?: string | null;

  // Datos relacionados (comunes)
  vehiculos?: any[];
  personas?: any[];
  autoridades?: any[];

  // Campos específicos de ASISTENCIA_VEHICULAR
  gruas?: any[];
  ajustadores?: any[];
  detalles_autoridades?: Record<string, any>;
  socorro?: any[];
  detalles_socorro?: Record<string, any>;
  obstruye?: any; // ObstruccionData (LEGACY - mantener por compatibilidad)
  obstruccion?: any; // ObstruccionData (NUEVO - alineado con controller)
  jurisdiccion?: string;
  direccion_detallada?: string;

  // Campos específicos de ASISTENCIA / OTROS (NUEVOS)
  area?: string;
  material_via?: string;

  // Multimedia
  multimedia: MultimediaRef[];

  // Estado del draft
  estado: DraftStatus;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Datos de conflicto (si aplica)
  conflicto?: {
    datos_servidor: any;
    diferencias: Array<{ campo: string; local: any; servidor: any }>;
    conflicto_id?: number;
  };
}

/**
 * Verificar si hay draft pendiente
 */
export async function hasDraftPendiente(): Promise<boolean> {
  try {
    const draft = await AsyncStorage.getItem(DRAFT_KEY);
    return draft !== null;
  } catch (error) {
    console.error('[DRAFT] Error verificando draft pendiente:', error);
    return false;
  }
}

/**
 * Obtener draft pendiente
 */
export async function getDraftPendiente(): Promise<DraftSituacion | null> {
  try {
    const json = await AsyncStorage.getItem(DRAFT_KEY);
    if (!json) return null;
    return JSON.parse(json) as DraftSituacion;
  } catch (error) {
    console.error('[DRAFT] Error obteniendo draft:', error);
    return null;
  }
}

/**
 * Guardar draft
 * Si ya existe, lo actualiza
 */
export async function saveDraft(draft: DraftSituacion): Promise<void> {
  try {
    draft.updated_at = new Date().toISOString();
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    console.log(`[DRAFT] Guardado: ${draft.id} (${draft.tipo_situacion})`);
  } catch (error) {
    console.error('[DRAFT] Error guardando draft:', error);
    throw error;
  }
}

/**
 * Actualizar campos del draft existente
 */
export async function updateDraft(updates: Partial<DraftSituacion>): Promise<DraftSituacion | null> {
  try {
    const draft = await getDraftPendiente();
    if (!draft) {
      console.warn('[DRAFT] No hay draft para actualizar');
      return null;
    }

    const updated: DraftSituacion = {
      ...draft,
      ...updates,
      updated_at: new Date().toISOString()
    };

    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(updated));
    console.log(`[DRAFT] Actualizado: ${updated.id}`);
    return updated;
  } catch (error) {
    console.error('[DRAFT] Error actualizando draft:', error);
    throw error;
  }
}

/**
 * Actualizar estado del draft
 */
export async function updateDraftStatus(estado: DraftStatus): Promise<void> {
  await updateDraft({ estado });
}

/**
 * Eliminar draft (despues de enviar exitosamente o por decision del usuario)
 */
export async function deleteDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
    console.log('[DRAFT] Eliminado');
  } catch (error) {
    console.error('[DRAFT] Error eliminando draft:', error);
    throw error;
  }
}

/**
 * Agregar multimedia al draft
 */
export async function addMultimediaToDraft(multimedia: MultimediaRef): Promise<void> {
  const draft = await getDraftPendiente();
  if (!draft) {
    throw new Error('No hay draft para agregar multimedia');
  }

  // Validar limites
  const fotos = draft.multimedia.filter(m => m.tipo === 'FOTO');
  const videos = draft.multimedia.filter(m => m.tipo === 'VIDEO');

  if (multimedia.tipo === 'FOTO' && fotos.length >= 3) {
    throw new Error('Limite de 3 fotos alcanzado');
  }

  if (multimedia.tipo === 'VIDEO' && videos.length >= 1) {
    throw new Error('Limite de 1 video alcanzado');
  }

  // Asignar orden si es foto
  if (multimedia.tipo === 'FOTO') {
    multimedia.orden = fotos.length + 1;
  }

  draft.multimedia.push(multimedia);
  await saveDraft(draft);
}

/**
 * Remover multimedia del draft
 */
export async function removeMultimediaFromDraft(uri: string): Promise<void> {
  const draft = await getDraftPendiente();
  if (!draft) return;

  draft.multimedia = draft.multimedia.filter(m => m.uri !== uri);

  // Reordenar fotos
  let fotoOrden = 1;
  draft.multimedia.forEach(m => {
    if (m.tipo === 'FOTO') {
      m.orden = fotoOrden++;
    }
  });

  await saveDraft(draft);
}

/**
 * Obtener informacion del draft para mostrar en UI
 */
export async function getDraftInfo(): Promise<{
  existe: boolean;
  tipo?: TipoSituacion;
  tiempoTranscurrido?: string;
  estado?: DraftStatus;
} | null> {
  const draft = await getDraftPendiente();
  if (!draft) {
    return { existe: false };
  }

  const createdAt = new Date(draft.created_at);
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  let tiempoTranscurrido: string;
  if (diffMins < 60) {
    tiempoTranscurrido = `hace ${diffMins} min`;
  } else {
    const hours = Math.floor(diffMins / 60);
    tiempoTranscurrido = `hace ${hours}h ${diffMins % 60}min`;
  }

  return {
    existe: true,
    tipo: draft.tipo_situacion,
    tiempoTranscurrido,
    estado: draft.estado
  };
}

/**
 * Marcar draft en conflicto
 */
export async function setDraftConflicto(
  datosServidor: any,
  diferencias: Array<{ campo: string; local: any; servidor: any }>,
  conflictoId?: number
): Promise<void> {
  await updateDraft({
    estado: 'CONFLICTO',
    conflicto: {
      datos_servidor: datosServidor,
      diferencias,
      conflicto_id: conflictoId
    }
  });
}

/**
 * Marcar draft esperando COP
 */
export async function setDraftWaitCOP(conflictoId: number): Promise<void> {
  const draft = await getDraftPendiente();
  if (!draft) return;

  await updateDraft({
    estado: 'WAIT_COP',
    conflicto: {
      ...draft.conflicto,
      conflicto_id: conflictoId
    }
  });
}

export default {
  hasDraftPendiente,
  getDraftPendiente,
  saveDraft,
  updateDraft,
  updateDraftStatus,
  deleteDraft,
  addMultimediaToDraft,
  removeMultimediaFromDraft,
  getDraftInfo,
  setDraftConflicto,
  setDraftWaitCOP
};
