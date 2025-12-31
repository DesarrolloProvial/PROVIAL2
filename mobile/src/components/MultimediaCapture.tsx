/**
 * Componente de Captura de Multimedia
 * Para situaciones que requieren 3 fotos + 1 video obligatorios
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { COLORS } from '../constants/colors';

// Componente interno para reproducir video (expo-video requiere hook fuera de condicionales)
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
import MultimediaService, {
  MediaFile,
  UploadProgress,
  UploadResult,
} from '../services/multimedia.service';

interface MultimediaCaptureProps {
  situacionId: number;
  tipoSituacion: string;
  onComplete?: (complete: boolean) => void;
  onMultimediaChange?: (fotos: MediaFile[], video: MediaFile | null) => void;
  location?: { latitude: number; longitude: number };
  readOnly?: boolean;
  initialData?: {
    fotos: any[];
    videos: any[];
  };
}

interface PhotoSlot {
  index: number;
  file: MediaFile | null;
  uploaded: boolean;
  uploading: boolean;
  progress: number;
  serverUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export default function MultimediaCapture({
  situacionId,
  tipoSituacion,
  onComplete,
  onMultimediaChange,
  location,
  readOnly = false,
  initialData,
}: MultimediaCaptureProps) {
  // Estados para las 3 fotos
  const [photos, setPhotos] = useState<PhotoSlot[]>([
    { index: 1, file: null, uploaded: false, uploading: false, progress: 0 },
    { index: 2, file: null, uploaded: false, uploading: false, progress: 0 },
    { index: 3, file: null, uploaded: false, uploading: false, progress: 0 },
  ]);

  // Estado para el video
  const [video, setVideo] = useState<{
    file: MediaFile | null;
    uploaded: boolean;
    uploading: boolean;
    progress: number;
    serverUrl?: string;
    error?: string;
  }>({ file: null, uploaded: false, uploading: false, progress: 0 });

  // Estado para modal de preview
  const [previewModal, setPreviewModal] = useState<{
    visible: boolean;
    type: 'photo' | 'video';
    uri: string;
  }>({ visible: false, type: 'photo', uri: '' });

  // Determinar si multimedia es obligatoria
  const isRequired = ['INCIDENTE', 'ASISTENCIA_VEHICULAR', 'EMERGENCIA'].includes(
    tipoSituacion
  );

  // Cargar datos iniciales
  useEffect(() => {
    if (initialData) {
      // Cargar fotos existentes
      if (initialData.fotos && initialData.fotos.length > 0) {
        const loadedPhotos = [...photos];
        initialData.fotos.forEach((foto: any, idx: number) => {
          if (idx < 3) {
            loadedPhotos[idx] = {
              ...loadedPhotos[idx],
              uploaded: true,
              serverUrl: foto.url_original,
              thumbnailUrl: foto.url_thumbnail,
            };
          }
        });
        setPhotos(loadedPhotos);
      }

      // Cargar video existente
      if (initialData.videos && initialData.videos.length > 0) {
        setVideo({
          file: null,
          uploaded: true,
          uploading: false,
          progress: 100,
          serverUrl: initialData.videos[0].url_original,
        });
      }
    }
  }, [initialData]);

  // Verificar completitud
  useEffect(() => {
    const photosComplete = photos.filter((p) => p.uploaded).length >= 3;
    const videoComplete = video.uploaded;
    const isComplete = isRequired ? photosComplete && videoComplete : true;

    if (onComplete) {
      onComplete(isComplete);
    }
  }, [photos, video, isRequired, onComplete]);

  // Notificar cambios
  useEffect(() => {
    if (onMultimediaChange) {
      const files = photos.filter((p) => p.file).map((p) => p.file as MediaFile);
      onMultimediaChange(files, video.file);
    }
  }, [photos, video.file, onMultimediaChange]);

  // Capturar foto
  const handleTakePhoto = async (slotIndex: number) => {
    try {
      const photo = await MultimediaService.takePhoto();
      if (!photo) return;

      // Actualizar slot
      const newPhotos = [...photos];
      newPhotos[slotIndex] = {
        ...newPhotos[slotIndex],
        file: photo,
        uploaded: false,
        uploading: true,
        progress: 0,
        error: undefined,
      };
      setPhotos(newPhotos);

      // Subir foto
      const result = await MultimediaService.uploadPhoto(
        situacionId,
        photo,
        location,
        (progress) => {
          const updated = [...newPhotos];
          updated[slotIndex].progress = progress.percentage;
          setPhotos(updated);
        }
      );

      // Actualizar resultado
      const finalPhotos = [...photos];
      finalPhotos[slotIndex] = {
        ...finalPhotos[slotIndex],
        uploading: false,
        uploaded: result.success,
        serverUrl: result.url,
        thumbnailUrl: result.thumbnailUrl,
        error: result.error,
        progress: result.success ? 100 : 0,
      };
      setPhotos(finalPhotos);

      if (!result.success) {
        Alert.alert('Error', result.error || 'No se pudo subir la foto');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al tomar la foto');
    }
  };

  // Seleccionar foto de galería
  const handlePickPhoto = async (slotIndex: number) => {
    try {
      const photo = await MultimediaService.pickPhoto();
      if (!photo) return;

      // Actualizar slot
      const newPhotos = [...photos];
      newPhotos[slotIndex] = {
        ...newPhotos[slotIndex],
        file: photo,
        uploaded: false,
        uploading: true,
        progress: 0,
        error: undefined,
      };
      setPhotos(newPhotos);

      // Subir foto
      const result = await MultimediaService.uploadPhoto(
        situacionId,
        photo,
        location,
        (progress) => {
          const updated = [...newPhotos];
          updated[slotIndex].progress = progress.percentage;
          setPhotos(updated);
        }
      );

      // Actualizar resultado
      const finalPhotos = [...photos];
      finalPhotos[slotIndex] = {
        ...finalPhotos[slotIndex],
        uploading: false,
        uploaded: result.success,
        serverUrl: result.url,
        thumbnailUrl: result.thumbnailUrl,
        error: result.error,
        progress: result.success ? 100 : 0,
      };
      setPhotos(finalPhotos);

      if (!result.success) {
        Alert.alert('Error', result.error || 'No se pudo subir la foto');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al seleccionar la foto');
    }
  };

  // Mostrar opciones de captura
  const showPhotoOptions = (slotIndex: number) => {
    if (readOnly) return;

    Alert.alert('Agregar Foto', '¿Cómo deseas agregar la foto?', [
      { text: 'Cámara', onPress: () => handleTakePhoto(slotIndex) },
      { text: 'Galería', onPress: () => handlePickPhoto(slotIndex) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  // Grabar video
  const handleRecordVideo = async () => {
    try {
      const videoFile = await MultimediaService.recordVideo();
      if (!videoFile) return;

      setVideo({
        file: videoFile,
        uploaded: false,
        uploading: true,
        progress: 0,
        error: undefined,
      });

      const result = await MultimediaService.uploadVideo(
        situacionId,
        videoFile,
        location,
        (progress) => {
          setVideo((prev) => ({ ...prev, progress: progress.percentage }));
        }
      );

      setVideo({
        file: videoFile,
        uploaded: result.success,
        uploading: false,
        progress: result.success ? 100 : 0,
        serverUrl: result.url,
        error: result.error,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'No se pudo subir el video');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al grabar video');
      setVideo((prev) => ({ ...prev, uploading: false, error: error.message }));
    }
  };

  // Seleccionar video de galería
  const handlePickVideo = async () => {
    try {
      const videoFile = await MultimediaService.pickVideo();
      if (!videoFile) return;

      setVideo({
        file: videoFile,
        uploaded: false,
        uploading: true,
        progress: 0,
        error: undefined,
      });

      const result = await MultimediaService.uploadVideo(
        situacionId,
        videoFile,
        location,
        (progress) => {
          setVideo((prev) => ({ ...prev, progress: progress.percentage }));
        }
      );

      setVideo({
        file: videoFile,
        uploaded: result.success,
        uploading: false,
        progress: result.success ? 100 : 0,
        serverUrl: result.url,
        error: result.error,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'No se pudo subir el video');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al seleccionar video');
      setVideo((prev) => ({ ...prev, uploading: false, error: error.message }));
    }
  };

  // Mostrar opciones de video
  const showVideoOptions = () => {
    if (readOnly || video.uploaded) return;

    Alert.alert('Agregar Video', '¿Cómo deseas agregar el video? (máx 30s)', [
      { text: 'Grabar', onPress: handleRecordVideo },
      { text: 'Galería', onPress: handlePickVideo },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  // Renderizar slot de foto
  const renderPhotoSlot = (slot: PhotoSlot) => {
    const hasContent = slot.file || slot.thumbnailUrl || slot.serverUrl;
    const imageUri = slot.file?.uri || slot.thumbnailUrl || slot.serverUrl;

    return (
      <TouchableOpacity
        key={slot.index}
        style={[
          styles.photoSlot,
          slot.uploaded && styles.photoSlotUploaded,
          slot.error && styles.photoSlotError,
        ]}
        onPress={() => {
          if (hasContent && !slot.uploading) {
            setPreviewModal({
              visible: true,
              type: 'photo',
              uri: slot.serverUrl || slot.file?.uri || '',
            });
          } else {
            showPhotoOptions(slot.index - 1);
          }
        }}
        disabled={slot.uploading}
      >
        {slot.uploading ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.progressText}>{slot.progress}%</Text>
          </View>
        ) : hasContent ? (
          <>
            <Image source={{ uri: imageUri }} style={styles.photoPreview} />
            {slot.uploaded && (
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              </View>
            )}
            {!readOnly && (
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => showPhotoOptions(slot.index - 1)}
              >
                <Ionicons name="camera" size={16} color={COLORS.white} />
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <Ionicons name="camera-outline" size={32} color={COLORS.gray[400]} />
            <Text style={styles.slotLabel}>Foto {slot.index}</Text>
            {isRequired && <Text style={styles.requiredLabel}>Obligatoria</Text>}
          </>
        )}
      </TouchableOpacity>
    );
  };

  // Renderizar slot de video
  const renderVideoSlot = () => {
    const hasContent = video.file || video.serverUrl;
    const videoUri = video.serverUrl || video.file?.uri;

    return (
      <TouchableOpacity
        style={[
          styles.videoSlot,
          video.uploaded && styles.videoSlotUploaded,
          video.error && styles.photoSlotError,
        ]}
        onPress={() => {
          if (hasContent && !video.uploading) {
            setPreviewModal({
              visible: true,
              type: 'video',
              uri: videoUri || '',
            });
          } else {
            showVideoOptions();
          }
        }}
        disabled={video.uploading}
      >
        {video.uploading ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.progressText}>{video.progress}%</Text>
            <Text style={styles.uploadingText}>Subiendo video...</Text>
          </View>
        ) : hasContent ? (
          <>
            <View style={styles.videoPreviewContainer}>
              <Ionicons name="videocam" size={40} color={COLORS.primary} />
              <Text style={styles.videoLabel}>Video grabado</Text>
              {video.uploaded && (
                <View style={styles.checkBadgeVideo}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                </View>
              )}
            </View>
            {!readOnly && !video.uploaded && (
              <TouchableOpacity style={styles.retakeVideoButton} onPress={showVideoOptions}>
                <Text style={styles.retakeVideoText}>Cambiar video</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <Ionicons name="videocam-outline" size={40} color={COLORS.gray[400]} />
            <Text style={styles.videoSlotLabel}>Video (máx 30s)</Text>
            {isRequired && <Text style={styles.requiredLabel}>Obligatorio</Text>}
          </>
        )}
      </TouchableOpacity>
    );
  };

  // Calcular progreso general
  const uploadedPhotos = photos.filter((p) => p.uploaded).length;
  const totalRequired = isRequired ? 4 : 0; // 3 fotos + 1 video
  const totalUploaded = uploadedPhotos + (video.uploaded ? 1 : 0);
  const progressPercent = totalRequired > 0 ? (totalUploaded / totalRequired) * 100 : 100;

  return (
    <View style={styles.container}>
      {/* Header con progreso */}
      <View style={styles.header}>
        <Text style={styles.title}>
          Evidencia Multimedia
          {isRequired && <Text style={styles.requiredStar}> *</Text>}
        </Text>
        <Text style={styles.subtitle}>
          {uploadedPhotos}/3 fotos • {video.uploaded ? '1/1' : '0/1'} video
        </Text>
        {isRequired && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        )}
      </View>

      {/* Grid de fotos */}
      <View style={styles.photosGrid}>{photos.map(renderPhotoSlot)}</View>

      {/* Slot de video */}
      {renderVideoSlot()}

      {/* Mensaje de completitud */}
      {isRequired && totalUploaded === totalRequired && (
        <View style={styles.completeMessage}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.completeText}>Multimedia completa</Text>
        </View>
      )}

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

            {previewModal.type === 'photo' ? (
              <Image
                source={{ uri: previewModal.uri }}
                style={styles.fullPreview}
                resizeMode="contain"
              />
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
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  requiredStar: {
    color: COLORS.danger,
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
    borderColor: COLORS.gray[200],
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoSlotUploaded: {
    borderColor: COLORS.success,
    borderStyle: 'solid',
  },
  photoSlotError: {
    borderColor: COLORS.danger,
    borderStyle: 'solid',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  slotLabel: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  requiredLabel: {
    fontSize: 10,
    color: COLORS.danger,
    marginTop: 2,
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  retakeButton: {
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
    borderColor: COLORS.gray[200],
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoSlotUploaded: {
    borderColor: COLORS.success,
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
  checkBadgeVideo: {
    position: 'absolute',
    top: -8,
    right: -40,
  },
  retakeVideoButton: {
    marginTop: 8,
  },
  retakeVideoText: {
    fontSize: 12,
    color: COLORS.primary,
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
