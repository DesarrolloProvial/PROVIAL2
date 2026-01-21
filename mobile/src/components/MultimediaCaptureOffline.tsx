/**
 * MultimediaCaptureOffline - Captura de Multimedia con Soporte Offline-First
 *
 * Este componente captura fotos y videos y los guarda localmente en SQLite.
 * Los archivos se suben a Cloudinary automáticamente cuando hay conexión.
 *
 * Flujo:
 * 1. Usuario captura foto/video
 * 2. Se guarda en SQLite con estado PENDING
 * 3. Se intenta subir a Cloudinary
 * 4. Si falla, queda en cola para retry automático
 * 5. useSyncQueue se encarga de reintentar
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useVideoPlayer, VideoView } from 'expo-video';
import { COLORS } from '../constants/colors';
import {
  saveEvidencia,
  getEvidencias,
  updateEvidenciaUploadStatus,
  type Evidencia,
} from '../services/database';
import { uploadFileWithRetry, checkCloudinaryStatus } from '../services/cloudinaryUpload';
import { useSyncQueue } from '../hooks/useSyncQueue';

// Componente interno para reproducir video
function VideoPreview({ uri, style }: { uri: string; style: any }) {
  const player = useVideoPlayer(uri, (player) => {
    player.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={style}
      contentFit="contain"
      nativeControls
    />
  );
}

interface MultimediaCaptureOfflineProps {
  draftUuid: string;
  tipoSituacion: string;
  onComplete?: (complete: boolean) => void;
  location?: { latitude: number; longitude: number };
  readOnly?: boolean;
}

interface MediaSlot {
  index: number;
  tipo: 'FOTO' | 'VIDEO';
  evidencia: Evidencia | null;
  isUploading: boolean;
  uploadProgress: number;
}

export default function MultimediaCaptureOffline({
  draftUuid,
  tipoSituacion,
  onComplete,
  location,
  readOnly = false,
}: MultimediaCaptureOfflineProps) {
  // Estados para las 3 fotos + 1 video
  const [slots, setSlots] = useState<MediaSlot[]>([
    { index: 1, tipo: 'FOTO', evidencia: null, isUploading: false, uploadProgress: 0 },
    { index: 2, tipo: 'FOTO', evidencia: null, isUploading: false, uploadProgress: 0 },
    { index: 3, tipo: 'FOTO', evidencia: null, isUploading: false, uploadProgress: 0 },
    { index: 4, tipo: 'VIDEO', evidencia: null, isUploading: false, uploadProgress: 0 },
  ]);

  // Estado de preview
  const [previewModal, setPreviewModal] = useState<{
    visible: boolean;
    type: 'FOTO' | 'VIDEO';
    uri: string;
  }>({ visible: false, type: 'FOTO', uri: '' });

  // Estado de Cloudinary
  const [cloudinaryReady, setCloudinaryReady] = useState<boolean | null>(null);

  // Hook de sincronización
  const { isOnline } = useSyncQueue();

  // Verificar si Cloudinary está configurado
  useEffect(() => {
    console.log('[MULTIMEDIA] 🚀 Componente montado, draft:', draftUuid);
    async function checkCloudinary() {
      try {
        console.log('[MULTIMEDIA] 🔍 Verificando Cloudinary...');
        const status = await checkCloudinaryStatus();
        console.log('[MULTIMEDIA] 📡 Respuesta Cloudinary:', status);
        setCloudinaryReady(status.configured);
        if (!status.configured) {
          console.warn('[MULTIMEDIA] ⚠️ Cloudinary NO configurado:', status.message);
        } else {
          console.log('[MULTIMEDIA] ✅ Cloudinary configurado correctamente');
        }
      } catch (error) {
        console.error('[MULTIMEDIA] ❌ Error verificando Cloudinary:', error);
        setCloudinaryReady(false);
      }
    }
    checkCloudinary();
  }, []);

  // Cargar evidencias existentes del draft
  useEffect(() => {
    async function loadEvidencias() {
      try {
        const evidencias = await getEvidencias(draftUuid);
        console.log(`[MULTIMEDIA] Cargadas ${evidencias.length} evidencias para draft ${draftUuid}`);

        // Mapear evidencias a slots
        const newSlots = [...slots];
        evidencias.forEach((ev) => {
          if (ev.tipo === 'FOTO' && ev.orden && ev.orden <= 3) {
            newSlots[ev.orden - 1] = {
              ...newSlots[ev.orden - 1],
              evidencia: ev,
            };
          } else if (ev.tipo === 'VIDEO') {
            newSlots[3] = {
              ...newSlots[3],
              evidencia: ev,
            };
          }
        });
        setSlots(newSlots);
      } catch (error) {
        console.error('[MULTIMEDIA] Error cargando evidencias:', error);
      }
    }

    if (draftUuid) {
      loadEvidencias();
    }
  }, [draftUuid]);

  // Verificar completitud
  useEffect(() => {
    const fotosCompletas = slots.filter(
      (s) => s.tipo === 'FOTO' && s.evidencia?.estado_upload === 'UPLOADED'
    ).length;
    const videoCompleto = slots.find(
      (s) => s.tipo === 'VIDEO' && s.evidencia?.estado_upload === 'UPLOADED'
    );

    const isComplete = fotosCompletas >= 3 && !!videoCompleto;

    if (onComplete) {
      onComplete(isComplete);
    }
  }, [slots, onComplete]);

  // Obtener información del archivo
  const getFileInfo = async (uri: string): Promise<{ size: number; width?: number; height?: number }> => {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        // Intentar obtener dimensiones si es imagen
        return {
          size: info.size || 0,
        };
      }
    } catch (error) {
      console.error('[MULTIMEDIA] Error obteniendo info del archivo:', error);
    }
    return { size: 0 };
  };

  // Capturar foto con cámara
  const takePhoto = async (slotIndex: number) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Denegado', 'Se requiere acceso a la cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        await processMedia(slotIndex, result.assets[0].uri, 'FOTO', result.assets[0].width, result.assets[0].height);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al tomar foto');
    }
  };

  // Seleccionar foto de galería
  const pickPhoto = async (slotIndex: number) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Denegado', 'Se requiere acceso a la galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        await processMedia(slotIndex, result.assets[0].uri, 'FOTO', result.assets[0].width, result.assets[0].height);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al seleccionar foto');
    }
  };

  // Grabar video
  const recordVideo = async (slotIndex: number) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Denegado', 'Se requiere acceso a la cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 30,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      });

      if (!result.canceled && result.assets[0]) {
        await processMedia(
          slotIndex,
          result.assets[0].uri,
          'VIDEO',
          result.assets[0].width,
          result.assets[0].height,
          result.assets[0].duration
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al grabar video');
    }
  };

  // Seleccionar video de galería
  const pickVideo = async (slotIndex: number) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Denegado', 'Se requiere acceso a la galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 30,
      });

      if (!result.canceled && result.assets[0]) {
        await processMedia(
          slotIndex,
          result.assets[0].uri,
          'VIDEO',
          result.assets[0].width,
          result.assets[0].height,
          result.assets[0].duration
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al seleccionar video');
    }
  };

  // Procesar media capturada
  const processMedia = async (
    slotIndex: number,
    uri: string,
    tipo: 'FOTO' | 'VIDEO',
    width?: number,
    height?: number,
    duration?: number
  ) => {
    try {
      console.log(`[MULTIMEDIA] Procesando ${tipo} para slot ${slotIndex}`);

      // Obtener info del archivo
      const fileInfo = await getFileInfo(uri);

      // Crear evidencia en SQLite
      const evidenciaData: Omit<Evidencia, 'id' | 'created_at'> = {
        draft_uuid: draftUuid,
        tipo,
        orden: tipo === 'FOTO' ? slotIndex + 1 : undefined,
        local_uri: uri,
        estado_upload: 'PENDING',
        upload_attempts: 0,
        file_size: fileInfo.size,
        width: width || fileInfo.width,
        height: height || fileInfo.height,
        duration: duration ? Math.round(duration / 1000) : undefined,
      };

      const evidenciaId = await saveEvidencia(evidenciaData);
      console.log(`[MULTIMEDIA] Evidencia guardada con ID ${evidenciaId}`);

      // Actualizar slot con evidencia
      const newEvidencia: Evidencia = {
        ...evidenciaData,
        id: evidenciaId,
        created_at: new Date().toISOString(),
      };

      setSlots((prev) => {
        const newSlots = [...prev];
        newSlots[slotIndex] = {
          ...newSlots[slotIndex],
          evidencia: newEvidencia,
          isUploading: false,
          uploadProgress: 0,
        };
        return newSlots;
      });

      // Si hay conexión y Cloudinary está listo, intentar subir inmediatamente
      if (isOnline && cloudinaryReady) {
        await uploadMedia(slotIndex, newEvidencia);
      } else {
        console.log('[MULTIMEDIA] Sin conexión o Cloudinary no listo, quedará en cola');
      }
    } catch (error: any) {
      console.error('[MULTIMEDIA] Error procesando media:', error);
      Alert.alert('Error', error.message || 'No se pudo guardar el archivo');
    }
  };

  // Subir media a Cloudinary
  const uploadMedia = async (slotIndex: number, evidencia: Evidencia) => {
    if (!evidencia.id) return;

    try {
      console.log(`[MULTIMEDIA] Subiendo ${evidencia.tipo} (ID: ${evidencia.id})...`);

      // Marcar como uploading
      setSlots((prev) => {
        const newSlots = [...prev];
        newSlots[slotIndex] = {
          ...newSlots[slotIndex],
          isUploading: true,
          uploadProgress: 0,
        };
        return newSlots;
      });

      await updateEvidenciaUploadStatus(evidencia.id, 'UPLOADING');

      // Upload con retry
      const result = await uploadFileWithRetry(
        evidencia.local_uri,
        draftUuid,
        evidencia.tipo === 'FOTO' ? 'image' : 'video',
        evidencia.tipo,
        evidencia.width,
        evidencia.height,
        evidencia.duration,
        (progress) => {
          setSlots((prev) => {
            const newSlots = [...prev];
            newSlots[slotIndex] = {
              ...newSlots[slotIndex],
              uploadProgress: progress,
            };
            return newSlots;
          });
        }
      );

      if (result.success) {
        console.log(`[MULTIMEDIA] Upload exitoso: ${result.cloudinaryPublicId}`);

        await updateEvidenciaUploadStatus(
          evidencia.id,
          'UPLOADED',
          result.cloudinaryPublicId,
          result.cloudinaryUrl
        );

        // Actualizar slot con datos de Cloudinary
        setSlots((prev) => {
          const newSlots = [...prev];
          newSlots[slotIndex] = {
            ...newSlots[slotIndex],
            isUploading: false,
            uploadProgress: 100,
            evidencia: {
              ...newSlots[slotIndex].evidencia!,
              estado_upload: 'UPLOADED',
              cloudinary_public_id: result.cloudinaryPublicId,
              cloudinary_url: result.cloudinaryUrl,
            },
          };
          return newSlots;
        });
      } else {
        throw new Error(result.error || 'Upload falló');
      }
    } catch (error: any) {
      console.error(`[MULTIMEDIA] Error en upload:`, error);

      if (evidencia.id) {
        await updateEvidenciaUploadStatus(evidencia.id, 'ERROR', undefined, undefined, error.message);
      }

      setSlots((prev) => {
        const newSlots = [...prev];
        newSlots[slotIndex] = {
          ...newSlots[slotIndex],
          isUploading: false,
          uploadProgress: 0,
          evidencia: newSlots[slotIndex].evidencia
            ? {
              ...newSlots[slotIndex].evidencia!,
              estado_upload: 'ERROR',
              error_message: error.message,
            }
            : null,
        };
        return newSlots;
      });
    }
  };

  // Reintentar upload
  const retryUpload = async (slotIndex: number) => {
    const slot = slots[slotIndex];
    if (slot.evidencia && slot.evidencia.estado_upload === 'ERROR') {
      await uploadMedia(slotIndex, slot.evidencia);
    }
  };

  // Mostrar opciones de captura
  const showPhotoOptions = (slotIndex: number) => {
    if (readOnly) return;

    Alert.alert('Agregar Foto', '¿Cómo deseas agregar la foto?', [
      { text: 'Cámara', onPress: () => takePhoto(slotIndex) },
      { text: 'Galería', onPress: () => pickPhoto(slotIndex) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const showVideoOptions = (slotIndex: number) => {
    if (readOnly) return;

    Alert.alert('Agregar Video', '¿Cómo deseas agregar el video? (máx 30s)', [
      { text: 'Grabar', onPress: () => recordVideo(slotIndex) },
      { text: 'Galería', onPress: () => pickVideo(slotIndex) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  // Obtener icono de estado
  const getStatusIcon = (evidencia: Evidencia | null) => {
    if (!evidencia) return null;

    switch (evidencia.estado_upload) {
      case 'UPLOADED':
        return <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />;
      case 'UPLOADING':
        return <ActivityIndicator size="small" color={COLORS.primary} />;
      case 'ERROR':
        return <Ionicons name="alert-circle" size={20} color={COLORS.danger} />;
      case 'PENDING':
        return <Ionicons name="cloud-upload-outline" size={20} color={COLORS.warning} />;
      default:
        return null;
    }
  };

  // Obtener color de borde según estado
  const getBorderColor = (evidencia: Evidencia | null) => {
    if (!evidencia) return COLORS.gray[200];

    switch (evidencia.estado_upload) {
      case 'UPLOADED':
        return COLORS.success;
      case 'UPLOADING':
        return COLORS.primary;
      case 'ERROR':
        return COLORS.danger;
      case 'PENDING':
        return COLORS.warning;
      default:
        return COLORS.gray[200];
    }
  };

  // Renderizar slot de foto
  const renderPhotoSlot = (slot: MediaSlot, index: number) => {
    const hasContent = slot.evidencia?.local_uri || slot.evidencia?.cloudinary_url;
    const imageUri = slot.evidencia?.cloudinary_url || slot.evidencia?.local_uri;

    return (
      <TouchableOpacity
        key={slot.index}
        style={[
          styles.photoSlot,
          { borderColor: getBorderColor(slot.evidencia) },
          slot.evidencia && styles.photoSlotFilled,
        ]}
        onPress={() => {
          if (hasContent && !slot.isUploading) {
            setPreviewModal({
              visible: true,
              type: 'FOTO',
              uri: imageUri || '',
            });
          } else if (!slot.isUploading) {
            showPhotoOptions(index);
          }
        }}
        disabled={slot.isUploading}
      >
        {slot.isUploading ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.progressText}>{slot.uploadProgress}%</Text>
          </View>
        ) : hasContent ? (
          <>
            <Image source={{ uri: imageUri }} style={styles.photoPreview} />
            <View style={styles.statusBadge}>{getStatusIcon(slot.evidencia)}</View>
            {slot.evidencia?.estado_upload === 'ERROR' && (
              <TouchableOpacity style={styles.retryButton} onPress={() => retryUpload(index)}>
                <Ionicons name="refresh" size={16} color={COLORS.white} />
              </TouchableOpacity>
            )}
            {!readOnly && slot.evidencia?.estado_upload !== 'UPLOADING' && (
              <TouchableOpacity style={styles.changeButton} onPress={() => showPhotoOptions(index)}>
                <Ionicons name="camera" size={14} color={COLORS.white} />
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <Ionicons name="camera-outline" size={28} color={COLORS.gray[400]} />
            <Text style={styles.slotLabel}>Foto {slot.index}</Text>
            <Text style={styles.requiredLabel}>Obligatoria</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  // Renderizar slot de video
  const renderVideoSlot = () => {
    const videoSlot = slots[3];
    const hasContent = videoSlot.evidencia?.local_uri || videoSlot.evidencia?.cloudinary_url;
    const videoUri = videoSlot.evidencia?.cloudinary_url || videoSlot.evidencia?.local_uri;

    return (
      <TouchableOpacity
        style={[
          styles.videoSlot,
          { borderColor: getBorderColor(videoSlot.evidencia) },
          videoSlot.evidencia && styles.videoSlotFilled,
        ]}
        onPress={() => {
          if (hasContent && !videoSlot.isUploading) {
            setPreviewModal({
              visible: true,
              type: 'VIDEO',
              uri: videoUri || '',
            });
          } else if (!videoSlot.isUploading) {
            showVideoOptions(3);
          }
        }}
        disabled={videoSlot.isUploading}
      >
        {videoSlot.isUploading ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.progressText}>{videoSlot.uploadProgress}%</Text>
            <Text style={styles.uploadingText}>Subiendo video...</Text>
          </View>
        ) : hasContent ? (
          <View style={styles.videoPreviewContainer}>
            <Ionicons name="videocam" size={36} color={COLORS.primary} />
            <Text style={styles.videoLabel}>Video grabado</Text>
            {videoSlot.evidencia?.duration && (
              <Text style={styles.videoDuration}>{videoSlot.evidencia.duration}s</Text>
            )}
            <View style={styles.statusBadgeVideo}>{getStatusIcon(videoSlot.evidencia)}</View>
            {videoSlot.evidencia?.estado_upload === 'ERROR' && (
              <TouchableOpacity style={styles.retryButtonVideo} onPress={() => retryUpload(3)}>
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <Ionicons name="videocam-outline" size={36} color={COLORS.gray[400]} />
            <Text style={styles.videoSlotLabel}>Video (máx 30s)</Text>
            <Text style={styles.requiredLabel}>Obligatorio</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  // Calcular progreso general
  const uploadedPhotos = slots.filter(
    (s) => s.tipo === 'FOTO' && s.evidencia?.estado_upload === 'UPLOADED'
  ).length;
  const pendingPhotos = slots.filter(
    (s) => s.tipo === 'FOTO' && s.evidencia && s.evidencia.estado_upload !== 'UPLOADED'
  ).length;
  const videoUploaded = slots[3].evidencia?.estado_upload === 'UPLOADED';
  const videoPending = slots[3].evidencia && slots[3].evidencia.estado_upload !== 'UPLOADED';

  const totalRequired = 4;
  const totalUploaded = uploadedPhotos + (videoUploaded ? 1 : 0);
  const totalPending = pendingPhotos + (videoPending ? 1 : 0);
  const progressPercent = (totalUploaded / totalRequired) * 100;

  return (
    <View style={styles.container}>
      {/* Header con progreso */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>
            Evidencia Multimedia <Text style={styles.requiredStar}>*</Text>
          </Text>
          {cloudinaryReady === false && (
            <View style={styles.warningBadge}>
              <Ionicons name="warning" size={14} color={COLORS.warning} />
              <Text style={styles.warningText}>Cloudinary no configurado</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle}>
          {uploadedPhotos}/3 fotos subidas • {videoUploaded ? '1/1' : '0/1'} video
          {totalPending > 0 && ` • ${totalPending} pendiente${totalPending > 1 ? 's' : ''}`}
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* Indicador de conexión */}
      <View style={[styles.connectionIndicator, isOnline ? styles.online : styles.offline]}>
        <Ionicons name={isOnline ? 'cloud-done' : 'cloud-offline'} size={16} color={isOnline ? COLORS.success : COLORS.gray[500]} />
        <Text style={[styles.connectionText, { color: isOnline ? COLORS.success : COLORS.gray[500] }]}>
          {isOnline ? 'Subida automática activa' : 'Sin conexión - se subirá después'}
        </Text>
      </View>

      {/* Grid de fotos */}
      <View style={styles.photosGrid}>
        {slots.slice(0, 3).map((slot, index) => renderPhotoSlot(slot, index))}
      </View>

      {/* Slot de video */}
      {renderVideoSlot()}

      {/* Mensaje de completitud */}
      {totalUploaded === totalRequired && (
        <View style={styles.completeMessage}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.completeText}>Multimedia completa y sincronizada</Text>
        </View>
      )}

      {/* Info del draft */}
      <Text style={styles.draftInfo}>Draft: {draftUuid.substring(0, 8)}...</Text>

      {/* Modal de preview */}
      <Modal
        visible={previewModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewModal({ ...previewModal, visible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setPreviewModal({ ...previewModal, visible: false })}
            >
              <Ionicons name="close" size={28} color={COLORS.white} />
            </TouchableOpacity>

            {previewModal.type === 'FOTO' ? (
              <Image source={{ uri: previewModal.uri }} style={styles.fullPreview} resizeMode="contain" />
            ) : (
              <VideoPreview uri={previewModal.uri} style={styles.fullPreview} />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  requiredStar: {
    color: COLORS.danger,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  warningText: {
    fontSize: 10,
    color: COLORS.warning,
    marginLeft: 4,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.gray[200],
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 2,
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  online: {
    backgroundColor: COLORS.success + '10',
  },
  offline: {
    backgroundColor: COLORS.gray[100],
  },
  connectionText: {
    fontSize: 12,
    marginLeft: 8,
  },
  photosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  photoSlot: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: COLORS.gray[100],
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoSlotFilled: {
    borderStyle: 'solid',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  slotLabel: {
    fontSize: 11,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  requiredLabel: {
    fontSize: 9,
    color: COLORS.danger,
    marginTop: 2,
  },
  statusBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 2,
  },
  retryButton: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    padding: 4,
  },
  changeButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  uploadingContainer: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
  },
  uploadingText: {
    fontSize: 10,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  videoSlot: {
    height: 100,
    backgroundColor: COLORS.gray[100],
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoSlotFilled: {
    borderStyle: 'solid',
  },
  videoSlotLabel: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  videoPreviewContainer: {
    alignItems: 'center',
  },
  videoLabel: {
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 4,
  },
  videoDuration: {
    fontSize: 12,
    color: COLORS.gray[500],
  },
  statusBadgeVideo: {
    position: 'absolute',
    top: -8,
    right: -40,
  },
  retryButtonVideo: {
    marginTop: 8,
  },
  retryText: {
    fontSize: 12,
    color: COLORS.danger,
    textDecorationLine: 'underline',
  },
  completeMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: COLORS.success + '10',
    borderRadius: 8,
  },
  completeText: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '500',
    marginLeft: 8,
  },
  draftInfo: {
    fontSize: 10,
    color: COLORS.gray[400],
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullPreview: {
    width: '95%',
    height: '80%',
  },
});
