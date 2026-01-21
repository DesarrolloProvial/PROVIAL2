/**
 * Hook de Sincronización Automática
 * Arquitectura Offline-First
 *
 * Ejecuta sincronización en segundo plano cuando:
 * - La app vuelve al foreground
 * - Se detecta conexión a internet
 * - Se agrega nuevo item a la cola
 */

import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {
  getPendingSyncItems,
  getPendingDrafts,
  getPendingEvidencias,
  updateDraftSyncStatus,
  updateEvidenciaUploadStatus,
  updateSyncQueueItem,
  deleteSyncQueueItem,
  getDatabaseStats,
  type Draft,
  type Evidencia
} from '../services/database';
import { uploadFileWithRetry } from '../services/cloudinaryUpload';
import { API_URL } from '../constants/config';
import { useAuthStore } from '../store/authStore';

/**
 * Estado de sincronización
 */
export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingDrafts: number;
  pendingEvidencias: number;
  syncQueueSize: number;
  lastSyncAt?: Date;
  lastError?: string;
}

/**
 * Configuración de sincronización
 */
const SYNC_CONFIG = {
  intervalMs: 30000, // Cada 30 segundos
  maxConcurrent: 3, // Máximo 3 operaciones en paralelo
  retryDelayMs: 5000 // 5 segundos entre reintentos
};

/**
 * Hook principal de sincronización
 */
export function useSyncQueue() {
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: true,
    isSyncing: false,
    pendingDrafts: 0,
    pendingEvidencias: 0,
    syncQueueSize: 0
  });

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  /**
   * Actualizar estado con estadísticas de la DB
   */
  const updateStats = async () => {
    try {
      const stats = await getDatabaseStats();
      setSyncState(prev => ({
        ...prev,
        pendingDrafts: stats.pendingDrafts,
        pendingEvidencias: stats.pendingEvidencias,
        syncQueueSize: stats.syncQueueSize
      }));
    } catch (error) {
      console.error('[SYNC] Error al obtener estadísticas:', error);
    }
  };

  /**
   * Sincronizar un draft con el backend
   */
  const syncDraft = async (draft: Draft): Promise<boolean> => {
    try {
      console.log(`[SYNC] Sincronizando draft ${draft.draft_uuid}...`);

      const token = useAuthStore.getState().token;
      if (!token) {
        throw new Error('No autenticado');
      }

      // Parsear payload
      const payload = JSON.parse(draft.payload_json);

      // Crear o actualizar draft en backend
      const response = await fetch(`${API_URL}/drafts/incidente`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': draft.draft_uuid
        },
        body: JSON.stringify({
          draftUuid: draft.draft_uuid,
          payload
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al sincronizar draft');
      }

      // Marcar como sincronizado
      await updateDraftSyncStatus(draft.draft_uuid, 'SYNCED');

      console.log(`[SYNC] Draft ${draft.draft_uuid} sincronizado`);
      return true;

    } catch (error: any) {
      console.error(`[SYNC] Error al sincronizar draft ${draft.draft_uuid}:`, error);
      await updateDraftSyncStatus(draft.draft_uuid, 'ERROR', error.message);
      return false;
    }
  };

  /**
   * Sincronizar una evidencia (upload a Cloudinary + registro)
   */
  const syncEvidencia = async (evidencia: Evidencia): Promise<boolean> => {
    try {
      console.log(`[SYNC] Subiendo evidencia ${evidencia.id}...`);

      // Determinar tipo de archivo
      const fileType = evidencia.tipo === 'FOTO' ? 'image' : 'video';

      // Upload con retry
      const result = await uploadFileWithRetry(
        evidencia.local_uri,
        evidencia.draft_uuid,
        fileType,
        evidencia.tipo,
        evidencia.width,
        evidencia.height,
        evidencia.duration,
        (progress) => {
          console.log(`[SYNC] Evidencia ${evidencia.id}: ${progress}%`);
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'Upload falló');
      }

      // Actualizar estado en DB
      await updateEvidenciaUploadStatus(
        evidencia.id!,
        'UPLOADED',
        result.cloudinaryPublicId,
        result.cloudinaryUrl
      );

      console.log(`[SYNC] Evidencia ${evidencia.id} subida exitosamente`);
      return true;

    } catch (error: any) {
      console.error(`[SYNC] Error al subir evidencia ${evidencia.id}:`, error);
      await updateEvidenciaUploadStatus(
        evidencia.id!,
        'ERROR',
        undefined,
        undefined,
        error.message
      );
      return false;
    }
  };

  /**
   * Finalizar draft: crear incidente real en backend
   */
  const finalizeDraft = async (draftUuid: string): Promise<boolean> => {
    try {
      console.log(`[SYNC] Finalizando draft ${draftUuid}...`);

      const token = useAuthStore.getState().token;
      if (!token) {
        throw new Error('No autenticado');
      }

      const response = await fetch(`${API_URL}/drafts/${draftUuid}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': draftUuid  // UUID solo, sin prefijo
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al finalizar draft');
      }

      const data = await response.json();

      // Actualizar con IDs reales
      await updateDraftSyncStatus(
        draftUuid,
        'SYNCED',
        undefined,
        data.incidente_id,
        data.situacion_id
      );

      console.log(`[SYNC] Draft ${draftUuid} finalizado: incidente #${data.incidente_id}`);
      return true;

    } catch (error: any) {
      console.error(`[SYNC] Error al finalizar draft ${draftUuid}:`, error);
      return false;
    }
  };

  /**
   * Ejecutar ciclo de sincronización
   */
  const runSyncCycle = async () => {
    // Evitar múltiples ciclos simultáneos
    if (isSyncingRef.current) {
      console.log('[SYNC] Ciclo ya en ejecución, saltando...');
      return;
    }

    // Verificar conexión
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('[SYNC] Sin conexión, saltando ciclo');
      setSyncState(prev => ({ ...prev, isOnline: false }));
      return;
    }

    try {
      isSyncingRef.current = true;
      setSyncState(prev => ({ ...prev, isSyncing: true, isOnline: true }));

      console.log('[SYNC] Iniciando ciclo de sincronización...');

      // Paso 1: Subir evidencias pendientes
      const pendingEvidencias = await getPendingEvidencias();
      console.log(`[SYNC] ${pendingEvidencias.length} evidencias pendientes`);

      for (const evidencia of pendingEvidencias) {
        await syncEvidencia(evidencia);
      }

      // Paso 2: Sincronizar drafts pendientes
      const pendingDrafts = await getPendingDrafts();
      console.log(`[SYNC] ${pendingDrafts.length} drafts pendientes`);

      for (const draft of pendingDrafts) {
        // Primero sincronizar el draft
        const draftSynced = await syncDraft(draft);

        if (draftSynced) {
          // Luego verificar si todas las evidencias están subidas
          const evidencias = await getPendingEvidencias();
          const draftEvidencias = evidencias.filter(e => e.draft_uuid === draft.draft_uuid);

          if (draftEvidencias.length === 0) {
            // Todas las evidencias están listas, finalizar draft
            await finalizeDraft(draft.draft_uuid);
          } else {
            console.log(`[SYNC] Draft ${draft.draft_uuid} esperando ${draftEvidencias.length} evidencias`);
          }
        }
      }

      // Actualizar estadísticas
      await updateStats();

      setSyncState(prev => ({
        ...prev,
        lastSyncAt: new Date(),
        lastError: undefined
      }));

      console.log('[SYNC] Ciclo completado exitosamente');

    } catch (error: any) {
      console.error('[SYNC] Error en ciclo de sincronización:', error);
      setSyncState(prev => ({
        ...prev,
        lastError: error.message
      }));
    } finally {
      isSyncingRef.current = false;
      setSyncState(prev => ({ ...prev, isSyncing: false }));
    }
  };

  /**
   * Forzar sincronización manual
   */
  const forceSync = async () => {
    console.log('[SYNC] Sincronización manual forzada');
    await runSyncCycle();
  };

  /**
   * Setup: listeners y timers
   */
  useEffect(() => {
    // Listener de conexión
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const wasOffline = !syncState.isOnline;
      const isNowOnline = !!state.isConnected;

      setSyncState(prev => ({ ...prev, isOnline: isNowOnline }));

      // Si volvimos online, sincronizar inmediatamente
      if (wasOffline && isNowOnline) {
        console.log('[SYNC] Conexión restaurada, iniciando sync...');
        runSyncCycle();
      }
    });

    // Listener de AppState (foreground/background)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[SYNC] App en foreground, iniciando sync...');
        runSyncCycle();
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Timer periódico
    syncIntervalRef.current = setInterval(() => {
      runSyncCycle();
    }, SYNC_CONFIG.intervalMs);

    // Sync inicial
    updateStats();
    runSyncCycle();

    // Cleanup
    return () => {
      unsubscribeNetInfo();
      appStateSubscription.remove();
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  return {
    ...syncState,
    forceSync,
    updateStats
  };
}

export default useSyncQueue;
