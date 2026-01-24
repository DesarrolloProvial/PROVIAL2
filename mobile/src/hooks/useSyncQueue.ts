/**
 * Hook de Sincronización de Multimedia
 *
 * Maneja la cola de subidas pendientes a Cloudinary
 * cuando hay conexión a internet.
 */

import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadMultimedia, isCloudinaryReady } from '../services/cloudinaryUpload';
import { MultimediaRef } from '../services/draftStorage';
import api from '../services/api';

const SYNC_QUEUE_KEY = 'multimedia_sync_queue';

export interface SyncQueueItem {
  situacionId: number;
  codigoSituacion: string;
  multimedia: MultimediaRef[];
  addedAt: string;
  retries: number;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  currentItem: string | null;
  progress: { current: number; total: number } | null;
}

/**
 * Hook principal de sincronización
 */
export function useSyncQueue() {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: false,
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    currentItem: null,
    progress: null,
  });

  // Verificar conectividad
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setStatus((prev) => ({ ...prev, isOnline: state.isConnected ?? false }));
    });

    return () => unsubscribe();
  }, []);

  // Cargar cola al inicio
  useEffect(() => {
    loadQueue();
  }, []);

  // Intentar sincronizar cuando hay conexión
  useEffect(() => {
    if (status.isOnline && !status.isSyncing && status.pendingCount > 0) {
      processQueue();
    }
  }, [status.isOnline, status.pendingCount]);

  /**
   * Cargar cola de sincronización desde AsyncStorage
   */
  const loadQueue = async () => {
    try {
      const json = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (json) {
        const queue: SyncQueueItem[] = JSON.parse(json);
        setStatus((prev) => ({ ...prev, pendingCount: queue.length }));
      }
    } catch (error) {
      console.error('[SYNC] Error cargando cola:', error);
    }
  };

  /**
   * Agregar item a la cola de sincronización
   */
  const addToQueue = useCallback(async (
    situacionId: number,
    codigoSituacion: string,
    multimedia: MultimediaRef[]
  ) => {
    if (multimedia.length === 0) return;

    try {
      const json = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      const queue: SyncQueueItem[] = json ? JSON.parse(json) : [];

      // Verificar si ya existe
      const existingIndex = queue.findIndex((item) => item.situacionId === situacionId);

      if (existingIndex >= 0) {
        // Actualizar existente
        queue[existingIndex].multimedia = multimedia;
        queue[existingIndex].addedAt = new Date().toISOString();
      } else {
        // Agregar nuevo
        queue.push({
          situacionId,
          codigoSituacion,
          multimedia,
          addedAt: new Date().toISOString(),
          retries: 0,
        });
      }

      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
      setStatus((prev) => ({ ...prev, pendingCount: queue.length }));

      console.log(`[SYNC] Agregado a cola: ${codigoSituacion} (${multimedia.length} archivos)`);
    } catch (error) {
      console.error('[SYNC] Error agregando a cola:', error);
    }
  }, []);

  /**
   * Procesar cola de sincronización
   */
  const processQueue = useCallback(async () => {
    if (status.isSyncing) return;

    try {
      // Verificar que Cloudinary esté listo
      const cloudinaryReady = await isCloudinaryReady();
      if (!cloudinaryReady) {
        console.log('[SYNC] Cloudinary no disponible, reintentando después...');
        return;
      }

      setStatus((prev) => ({ ...prev, isSyncing: true }));

      const json = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (!json) {
        setStatus((prev) => ({ ...prev, isSyncing: false }));
        return;
      }

      const queue: SyncQueueItem[] = JSON.parse(json);
      if (queue.length === 0) {
        setStatus((prev) => ({ ...prev, isSyncing: false, pendingCount: 0 }));
        return;
      }

      // Procesar primer item
      const item = queue[0];
      setStatus((prev) => ({
        ...prev,
        currentItem: item.codigoSituacion,
        progress: { current: 0, total: item.multimedia.length },
      }));

      console.log(`[SYNC] Procesando: ${item.codigoSituacion}`);

      // Subir multimedia
      const result = await uploadMultimedia(
        item.codigoSituacion,
        item.multimedia,
        (uploaded, total) => {
          setStatus((prev) => ({
            ...prev,
            progress: { current: uploaded, total },
          }));
        }
      );

      // Si hubo uploads exitosos, guardar referencias en backend
      if (result.uploaded.length > 0) {
        try {
          await api.post(`/multimedia/situacion/${item.situacionId}/batch`, {
            archivos: result.uploaded.map((u) => ({
              url: u.cloudinaryUrl,
              public_id: u.publicId,
              tipo: u.localUri.includes('video') ? 'VIDEO' : 'FOTO',
            })),
          });
          console.log(`[SYNC] Referencias guardadas en backend: ${result.uploaded.length}`);
        } catch (error) {
          console.error('[SYNC] Error guardando referencias:', error);
        }
      }

      // Determinar si remover de cola
      if (result.failed.length === 0 || item.retries >= 3) {
        // Éxito total o máximo de reintentos
        queue.shift();
        if (result.failed.length > 0) {
          console.warn(`[SYNC] Archivos fallidos después de 3 intentos:`, result.failed);
        }
      } else {
        // Reintentar solo los fallidos
        item.multimedia = item.multimedia.filter((m) =>
          result.failed.some((f) => f.localUri === m.uri)
        );
        item.retries++;
        console.log(`[SYNC] Reintentando ${item.multimedia.length} archivos (intento ${item.retries})`);
      }

      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        pendingCount: queue.length,
        lastSyncAt: new Date().toISOString(),
        currentItem: null,
        progress: null,
      }));

      // Continuar con el siguiente si hay más
      if (queue.length > 0) {
        setTimeout(() => processQueue(), 1000);
      }
    } catch (error) {
      console.error('[SYNC] Error procesando cola:', error);
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        currentItem: null,
        progress: null,
      }));
    }
  }, [status.isSyncing]);

  /**
   * Forzar sincronización manual
   */
  const forceSyncNow = useCallback(async () => {
    if (!status.isOnline) {
      console.log('[SYNC] Sin conexión, no se puede sincronizar');
      return false;
    }
    await processQueue();
    return true;
  }, [status.isOnline, processQueue]);

  /**
   * Limpiar cola (para testing/debug)
   */
  const clearQueue = useCallback(async () => {
    await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
    setStatus((prev) => ({ ...prev, pendingCount: 0 }));
    console.log('[SYNC] Cola limpiada');
  }, []);

  return {
    status,
    addToQueue,
    forceSyncNow,
    clearQueue,
    loadQueue,
  };
}

export default useSyncQueue;
