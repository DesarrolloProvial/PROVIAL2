import React, { useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Infografia, InfografiaManagerProps, FotoItem, VideoItem } from '../types/multimedia';
import { COLORS } from '../constants/colors';
import { validateInfografia, createNewInfografia } from '../utils/infografiaValidation';
import { generateMultimediaFilename } from '../utils/multimediaFilename';
import MultimediaCaptureOffline from './MultimediaCaptureOffline';
import type { MultimediaRef } from '../services/draftStorage';

export default function InfografiaManager({
  situacionId,
  infografias: propInfografias,
  onChange,
  disabled = false,
}: InfografiaManagerProps) {
  const [showCaptureModal, setShowCaptureModal] = React.useState(false);

  const infografias = React.useMemo(() => {
    if (!Array.isArray(propInfografias)) return [];
    return propInfografias.map(inf => ({
      ...inf,
      numero: typeof inf.numero === 'number' ? inf.numero : 0,
      titulo: inf.titulo || 'Infografía',
      fotos: Array.isArray(inf.fotos) ? inf.fotos : [],
      video: inf.video || null,
    }));
  }, [propInfografias]);

  // Una sola infografía — siempre trabajamos con infografias[0]
  const infografia = infografias[0] ?? null;

  useEffect(() => {
    if ((!propInfografias || propInfografias.length === 0) && !disabled && onChange) {
      onChange([createNewInfografia([])]);
    }
  }, [propInfografias, disabled, onChange]);

  const handleUpdateTitulo = (titulo: string) => {
    if (!infografia) return;
    onChange([{ ...infografia, titulo }]);
  };

  const handleEliminar = () => {
    if (!infografia) return;
    Alert.alert(
      'Eliminar evidencia',
      `¿Eliminar "${infografia.titulo}"?\n\nSe perderán ${infografia.fotos?.length || 0} foto(s) y ${infografia.video ? '1 video' : '0 videos'}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => onChange([]) },
      ]
    );
  };

  const getMultimediaForCapture = (inf: Infografia): MultimediaRef[] => {
    const refs: MultimediaRef[] = [];
    inf.fotos?.forEach(foto => {
      refs.push({ tipo: 'FOTO', uri: foto.uri, orden: foto.orden });
    });
    if (inf.video) {
      refs.push({ tipo: 'VIDEO', uri: inf.video.uri, duracion_segundos: inf.video.duracion_segundos });
    }
    return refs;
  };

  const handleMultimediaChange = (multimedia: MultimediaRef[]) => {
    if (!infografia) return;
    const fotos: FotoItem[] = [];
    let video: VideoItem | null = null;

    multimedia?.forEach(item => {
      if (item.tipo === 'FOTO' && item.orden) {
        fotos.push({
          orden: item.orden,
          uri: item.uri,
          filename: generateMultimediaFilename({
            situacionId,
            infografiaNumero: infografia.numero,
            tipo: 'FOTO',
            orden: item.orden,
          }),
          estado: 'PENDIENTE',
        });
      } else if (item.tipo === 'VIDEO') {
        video = {
          uri: item.uri,
          filename: generateMultimediaFilename({
            situacionId,
            infografiaNumero: infografia.numero,
            tipo: 'VIDEO',
          }),
          duracion_segundos: item.duracion_segundos,
          estado: 'PENDIENTE',
        };
      }
    });

    onChange([{ ...infografia, fotos, video }]);
  };

  // Estado vacío
  if (!infografia) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrapper}>
            <Text style={styles.emptyIcon}>📷</Text>
          </View>
          <Text style={styles.emptyTitle}>Sin Evidencia Fotográfica</Text>
          <Text style={styles.emptyText}>
            Agrega fotos y video para documentar esta situación
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              if (!disabled && onChange) onChange([createNewInfografia([])]);
            }}
            disabled={disabled}
          >
            <Text style={styles.primaryBtnText}>+ Agregar evidencia</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const validation = validateInfografia(infografia);
  const fotoCount = infografia.fotos?.length ?? 0;
  const hasMedia = fotoCount > 0 || !!infografia.video;

  return (
    <View style={styles.container}>
      {/* Card de infografía */}
      <View style={styles.card}>
        {/* Título */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Título</Text>
          <TextInput
            style={[styles.titleInput, disabled && styles.inputDisabled]}
            value={infografia.titulo}
            onChangeText={handleUpdateTitulo}
            placeholder="Describe esta evidencia..."
            placeholderTextColor={COLORS.text.secondary}
            maxLength={100}
            editable={!disabled}
          />
        </View>

        {/* Botón captura multimedia */}
        <TouchableOpacity
          style={[styles.captureBtn, disabled && styles.captureBtnDisabled]}
          onPress={() => setShowCaptureModal(true)}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <Text style={styles.captureBtnIcon}>📷</Text>
          <Text style={styles.captureBtnText}>
            {hasMedia ? 'Editar fotos y video' : 'Agregar fotos y video'}
          </Text>
          {hasMedia && (
            <View style={styles.mediaBadge}>
              <Text style={styles.mediaBadgeText}>
                {fotoCount} foto{fotoCount !== 1 ? 's' : ''}{infografia.video ? ' · 1 video' : ''}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Preview de fotos */}
        {fotoCount > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.previewScroll}
            contentContainerStyle={styles.previewContent}
          >
            {infografia.fotos?.map((foto, idx) => (
              <View key={`foto-${foto.orden}-${idx}`} style={styles.previewItem}>
                <Image source={{ uri: foto.uri }} style={styles.previewImage} />
                <View style={styles.previewBadge}>
                  <Text style={styles.previewBadgeText}>{foto.orden}</Text>
                </View>
              </View>
            ))}
            {infografia.video && (
              <View style={styles.previewItem}>
                <View style={[styles.previewImage, styles.videoPreview]}>
                  <Text style={styles.videoIcon}>🎥</Text>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Errores de validación */}
        {!validation.isValid && (
          <View style={styles.validationBox}>
            {validation.errors?.map((err, i) => (
              <Text key={i} style={styles.validationText}>• {err}</Text>
            ))}
          </View>
        )}

        {/* Footer: eliminar */}
        {!disabled && (
          <TouchableOpacity style={styles.deleteRow} onPress={handleEliminar}>
            <Text style={styles.deleteText}>🗑 Eliminar evidencia</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal captura */}
      <Modal
        visible={showCaptureModal}
        animationType="slide"
        onRequestClose={() => setShowCaptureModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{infografia.titulo}</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowCaptureModal(false)}
            >
              <Text style={styles.modalCloseText}>✕ Cerrar</Text>
            </TouchableOpacity>
          </View>

          <MultimediaCaptureOffline
            draftUuid={`${situacionId}_I${infografia.numero}`}
            tipoSituacion="INFOGRAFIA"
            manualMode
            initialMedia={getMultimediaForCapture(infografia)}
            onMultimediaChange={handleMultimediaChange}
          />

          <TouchableOpacity
            style={styles.modalDoneBtn}
            onPress={() => setShowCaptureModal(false)}
          >
            <Text style={styles.modalDoneText}>Listo</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  // Title field
  fieldGroup: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleInput: {
    fontSize: 15,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
  },
  inputDisabled: {
    color: COLORS.text.secondary,
  },

  // Capture button
  captureBtn: {
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  captureBtnDisabled: {
    opacity: 0.5,
  },
  captureBtnIcon: {
    fontSize: 22,
  },
  captureBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  mediaBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mediaBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
  },

  // Preview
  previewScroll: {
    marginBottom: 8,
  },
  previewContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    paddingBottom: 4,
  },
  previewItem: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  previewBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  videoPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray[100],
  },
  videoIcon: {
    fontSize: 28,
  },

  // Validation
  validationBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.danger + '10',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
    borderRadius: 6,
    padding: 10,
  },
  validationText: {
    fontSize: 13,
    color: COLORS.danger,
    lineHeight: 18,
  },

  // Delete row
  deleteRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 14,
    color: COLORS.danger,
    fontWeight: '500',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    flex: 1,
  },
  modalCloseBtn: {
    padding: 8,
  },
  modalCloseText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  modalDoneBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  modalDoneText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 16,
  },
});
