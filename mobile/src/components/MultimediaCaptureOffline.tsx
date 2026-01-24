/**
 * MultimediaCaptureOffline - Captura de Multimedia Simple
 *
 * Version simplificada para sistema offline-first con AsyncStorage.
 * - Captura fotos/videos localmente
 * - Las referencias se guardan en el draft (AsyncStorage)
 * - Persistencia temporal en memoria (manualMode) o en BD (draftUuid)
 */

import React, { useState, useEffect } from 'react';
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
import { useVideoPlayer, VideoView } from 'expo-video';
import { COLORS } from '../constants/colors';
import {
  addMultimediaToDraft,
  removeMultimediaFromDraft,
  getDraftPendiente,
  type MultimediaRef,
} from '../services/draftStorage';

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
  onMultimediaChange?: (multimedia: MultimediaRef[]) => void;
  readOnly?: boolean;
  manualMode?: boolean; // Si es true, no intenta interactuar con BD de drafts
  initialMedia?: MultimediaRef[]; // Datos iniciales para modo manual
}

interface MediaSlot {
  index: number;
  tipo: 'FOTO' | 'VIDEO';
  media: MultimediaRef | null;
}

export default function MultimediaCaptureOffline({
  draftUuid,
  tipoSituacion,
  onComplete,
  onMultimediaChange,
  readOnly = false,
  manualMode = false,
  initialMedia = [],
}: MultimediaCaptureOfflineProps) {
  // Estados para las 3 fotos + 1 video
  const [slots, setSlots] = useState<MediaSlot[]>([
    { index: 1, tipo: 'FOTO', media: null },
    { index: 2, tipo: 'FOTO', media: null },
    { index: 3, tipo: 'FOTO', media: null },
    { index: 4, tipo: 'VIDEO', media: null },
  ]);

  const [loading, setLoading] = useState(false);

  // Estado de preview
  const [previewModal, setPreviewModal] = useState<{
    visible: boolean;
    type: 'FOTO' | 'VIDEO';
    uri: string;
  }>({ visible: false, type: 'FOTO', uri: '' });

  // Cargar multimedia existente (del draft o props)
  useEffect(() => {
    // Definir función loadFromDraft dentro del efecto para usarla
    async function loadFromDraft() {
      try {
        const draft = await getDraftPendiente();
        if (draft && draft.multimedia) {
          mapMediaToSlots(draft.multimedia);
        }
      } catch (error) {
        console.error('[MULTIMEDIA] Error cargando desde draft:', error);
      }
    }

    // Helper para mapear
    function mapMediaToSlots(mediaItems: MultimediaRef[]) {
      setSlots(prevSlots => {
        const newSlots = [...prevSlots]; // Clonar
        mediaItems.forEach((m) => {
          if (m.tipo === 'FOTO' && m.orden && m.orden <= 3) {
            // Actualizar slot de foto
            newSlots[m.orden - 1] = { ...newSlots[m.orden - 1], media: m };
          } else if (m.tipo === 'VIDEO') {
            // Actualizar slot de video (índice 3)
            newSlots[3] = { ...newSlots[3], media: m };
          }
        });
        return newSlots;
      });
    }

    // Logic para carga inicial
    if (manualMode && initialMedia && initialMedia.length > 0) {
      // Usar un timeout pequeño para asegurar que el componente esté montado y slots inicializados
      // O simplemente setear directo. Como es effect on mount/deps, es seguro.
      // Pero debemos evitar re-loops si initialMedia no cambia.

      // Comprobar si ya tenemos estos datos para evitar re-render innecesario
      const hasData = slots.some(s => s.media !== null);
      if (!hasData) {
        mapMediaToSlots(initialMedia);
      }
    } else if (draftUuid && !manualMode) {
      loadFromDraft();
    }
  }, [draftUuid, manualMode, initialMedia]); // Removed slots from deps to avoid loop

  // Verificar completitud y notificar cambios
  useEffect(() => {
    const fotosCompletas = slots.filter((s) => s.tipo === 'FOTO' && s.media).length;
    const videoCompleto = !!slots.find((s) => s.tipo === 'VIDEO' && s.media);
    const isComplete = fotosCompletas >= 3 && videoCompleto;

    if (onComplete) {
      onComplete(isComplete);
    }

    // Notificar cambios al padre (FormBuilder)
    if (onMultimediaChange) {
      const multimedia = slots
        .filter((s) => s.media)
        .map((s) => s.media!);

      // Debounce o check para evitar emitir si no cambió realmente (opcional, pero buena práctica)
      // Por ahora simple.
      onMultimediaChange(multimedia);
    }
  }, [slots, onComplete, onMultimediaChange]);

  // Capturar foto con camara
  const takePhoto = async (slotIndex: number) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Denegado', 'Se requiere acceso a la camara');
        return;
      }

      setLoading(true);

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        await processMedia(slotIndex, result.assets[0].uri, 'FOTO');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al tomar foto');
    } finally {
      setLoading(false);
    }
  };

  // Seleccionar foto de galeria
  const pickPhoto = async (slotIndex: number) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Denegado', 'Se requiere acceso a la galeria');
        return;
      }

      setLoading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        await processMedia(slotIndex, result.assets[0].uri, 'FOTO');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al seleccionar foto');
    } finally {
      setLoading(false);
    }
  };

  // Grabar video
  const recordVideo = async (slotIndex: number) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Denegado', 'Se requiere acceso a la camara');
        return;
      }

      setLoading(true);

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 30,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      });

      if (!result.canceled && result.assets[0]) {
        await processMedia(slotIndex, result.assets[0].uri, 'VIDEO');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al grabar video');
    } finally {
      setLoading(false);
    }
  };

  // Seleccionar video de galeria
  const pickVideo = async (slotIndex: number) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Denegado', 'Se requiere acceso a la galeria');
        return;
      }

      setLoading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 30,
      });

      if (!result.canceled && result.assets[0]) {
        await processMedia(slotIndex, result.assets[0].uri, 'VIDEO');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al seleccionar video');
    } finally {
      setLoading(false);
    }
  };

  // Procesar media capturada
  const processMedia = async (
    slotIndex: number,
    uri: string,
    tipo: 'FOTO' | 'VIDEO'
  ) => {
    try {
      console.log(`[MULTIMEDIA] Procesando ${tipo} para slot ${slotIndex}`);

      const mediaRef: MultimediaRef = {
        tipo,
        uri,
        orden: tipo === 'FOTO' ? slotIndex + 1 : undefined,
      };

      // Guardar en draft solo si NO estamos en modo manual
      if (!manualMode) {
        await addMultimediaToDraft(mediaRef);
      }

      // Actualizar slot local
      setSlots((prev) => {
        const newSlots = [...prev];
        newSlots[slotIndex] = {
          ...newSlots[slotIndex],
          media: mediaRef,
        };
        return newSlots;
      });

      console.log(`[MULTIMEDIA] ${tipo} procesada correctamente`);
    } catch (error: any) {
      console.error('[MULTIMEDIA] Error procesando media:', error);
      Alert.alert('Error', error.message || 'No se pudo guardar el archivo');
    }
  };

  // Eliminar media
  const removeMedia = async (slotIndex: number) => {
    const slot = slots[slotIndex];
    if (!slot.media) return;

    Alert.alert(
      'Eliminar',
      `¿Eliminar esta ${slot.tipo === 'FOTO' ? 'foto' : 'video'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!manualMode) {
                await removeMultimediaFromDraft(slot.media!.uri);
              }
              setSlots((prev) => {
                const newSlots = [...prev];
                newSlots[slotIndex] = {
                  ...newSlots[slotIndex],
                  media: null,
                };
                return newSlots;
              });
            } catch (error) {
              console.error('[MULTIMEDIA] Error eliminando:', error);
            }
          },
        },
      ]
    );
  };

  // Mostrar opciones de captura
  const showPhotoOptions = (slotIndex: number) => {
    if (readOnly) return;

    const slot = slots[slotIndex];
    const hasContent = !!slot.media;

    const options = hasContent
      ? [
        { text: 'Ver', onPress: () => openPreview(slot) },
        { text: 'Cambiar (Camara)', onPress: () => takePhoto(slotIndex) },
        { text: 'Cambiar (Galeria)', onPress: () => pickPhoto(slotIndex) },
        { text: 'Eliminar', style: 'destructive' as const, onPress: () => removeMedia(slotIndex) },
        { text: 'Cancelar', style: 'cancel' as const },
      ]
      : [
        { text: 'Camara', onPress: () => takePhoto(slotIndex) },
        { text: 'Galeria', onPress: () => pickPhoto(slotIndex) },
        { text: 'Cancelar', style: 'cancel' as const },
      ];

    Alert.alert(hasContent ? 'Opciones' : 'Agregar Foto', '', options);
  };

  const showVideoOptions = (slotIndex: number) => {
    if (readOnly) return;

    const slot = slots[slotIndex];
    const hasContent = !!slot.media;

    const options = hasContent
      ? [
        { text: 'Ver', onPress: () => openPreview(slot) },
        { text: 'Cambiar (Grabar)', onPress: () => recordVideo(slotIndex) },
        { text: 'Cambiar (Galeria)', onPress: () => pickVideo(slotIndex) },
        { text: 'Eliminar', style: 'destructive' as const, onPress: () => removeMedia(slotIndex) },
        { text: 'Cancelar', style: 'cancel' as const },
      ]
      : [
        { text: 'Grabar', onPress: () => recordVideo(slotIndex) },
        { text: 'Galeria', onPress: () => pickVideo(slotIndex) },
        { text: 'Cancelar', style: 'cancel' as const },
      ];

    Alert.alert(hasContent ? 'Opciones' : 'Agregar Video (max 30s)', '', options);
  };

  const openPreview = (slot: MediaSlot) => {
    if (slot.media) {
      setPreviewModal({
        visible: true,
        type: slot.tipo,
        uri: slot.media.uri,
      });
    }
  };

  // Renderizar slot de foto
  const renderPhotoSlot = (slot: MediaSlot, index: number) => {
    const hasContent = !!slot.media;

    return (
      <TouchableOpacity
        key={slot.index}
        style={[
          styles.photoSlot,
          hasContent && styles.photoSlotFilled,
        ]}
        onPress={() => showPhotoOptions(index)}
        disabled={loading}
      >
        {loading && index === slots.findIndex(s => !s.media && s.tipo === 'FOTO') ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : hasContent ? (
          <>
            <Image source={{ uri: slot.media!.uri }} style={styles.photoPreview} />
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            </View>
          </>
        ) : (
          <>
            <Ionicons name="camera-outline" size={28} color={COLORS.gray[400]} />
            <Text style={styles.slotLabel}>Foto {slot.index}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  // Renderizar slot de video
  const renderVideoSlot = () => {
    const videoSlot = slots[3];
    const hasContent = !!videoSlot.media;

    return (
      <TouchableOpacity
        style={[
          styles.videoSlot,
          hasContent && styles.videoSlotFilled,
        ]}
        onPress={() => showVideoOptions(3)}
        disabled={loading}
      >
        {loading && !hasContent ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : hasContent ? (
          <View style={styles.videoPreviewContainer}>
            <Ionicons name="videocam" size={36} color={COLORS.success} />
            <Text style={styles.videoLabel}>Video listo</Text>
            <View style={styles.statusBadgeVideo}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            </View>
          </View>
        ) : (
          <>
            <Ionicons name="videocam-outline" size={36} color={COLORS.gray[400]} />
            <Text style={styles.videoSlotLabel}>Video (max 30s)</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  // Calcular progreso
  const capturedPhotos = slots.filter((s) => s.tipo === 'FOTO' && s.media).length;
  const videoCaptured = !!slots[3].media;
  const totalCaptured = capturedPhotos + (videoCaptured ? 1 : 0);
  const progressPercent = (totalCaptured / 4) * 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Evidencia Multimedia</Text>
        <Text style={styles.subtitle}>
          {capturedPhotos}/3 fotos • {videoCaptured ? '1/1' : '0/1'} video
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* Grid de fotos */}
      <View style={styles.photosGrid}>
        {slots.slice(0, 3).map((slot, index) => renderPhotoSlot(slot, index))}
      </View>

      {/* Slot de video */}
      {renderVideoSlot()}

      {/* Mensaje de completitud */}
      {totalCaptured === 4 && (
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
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
  photoSlotFilled: {
    borderStyle: 'solid',
    borderColor: COLORS.success,
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
  statusBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 2,
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
  videoSlotFilled: {
    borderStyle: 'solid',
    borderColor: COLORS.success,
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
    color: COLORS.success,
    marginTop: 4,
  },
  statusBadgeVideo: {
    position: 'absolute',
    top: -8,
    right: -40,
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
