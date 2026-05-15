import React, { useEffect, useState } from 'react';
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

// Histórica = no tiene flag editable Y sus fotos ya estaban subidas al recargar del servidor
function isHistorical(inf: Infografia): boolean {
  if (inf.editable) return false;
  return inf.fotos.some(f => f.estado === 'SUBIDO') || (inf.video?.estado === 'SUBIDO' ?? false);
}

export default function InfografiaManager({
  situacionId,
  infografias: propInfografias,
  onChange,
  disabled = false,
}: InfografiaManagerProps) {
  // numero de la infografía cuyo modal de captura está abierto
  const [captureTargetNumero, setCaptureTargetNumero] = useState<number | null>(null);

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

  const historicalInfografias = infografias.filter(isHistorical);
  const sessionInfografias = infografias.filter(inf => !isHistorical(inf));
  const captureTarget = captureTargetNumero !== null
    ? infografias.find(inf => inf.numero === captureTargetNumero) ?? null
    : null;

  // Auto-inicializar en creación (array completamente vacío)
  useEffect(() => {
    if ((!propInfografias || propInfografias.length === 0) && !disabled && onChange) {
      onChange([createNewInfografia([])]);
    }
  }, [propInfografias, disabled, onChange]);

  const handleAddSessionInfografia = () => {
    onChange([...infografias, createNewInfografia(infografias)]);
  };

  const handleUpdateTitulo = (numero: number, titulo: string) => {
    onChange(infografias.map(inf => inf.numero === numero ? { ...inf, titulo } : inf));
  };

  const handleDeleteSession = (target: Infografia) => {
    const fotoCount = target.fotos?.length ?? 0;
    Alert.alert(
      'Eliminar evidencia',
      `¿Eliminar "${target.titulo}"?\n${fotoCount} foto(s) y ${target.video ? '1 video' : '0 videos'} se perderán.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: () => onChange(infografias.filter(inf => inf.numero !== target.numero)),
        },
      ]
    );
  };

  const getMultimediaForCapture = (inf: Infografia): MultimediaRef[] => {
    const refs: MultimediaRef[] = [];
    inf.fotos?.forEach(foto => refs.push({ tipo: 'FOTO', uri: foto.uri, orden: foto.orden }));
    if (inf.video) refs.push({ tipo: 'VIDEO', uri: inf.video.uri, duracion_segundos: inf.video.duracion_segundos });
    return refs;
  };

  const handleMultimediaChange = (targetNumero: number, multimedia: MultimediaRef[]) => {
    const fotos: FotoItem[] = [];
    let video: VideoItem | null = null;

    multimedia?.forEach(item => {
      if (item.tipo === 'FOTO' && item.orden) {
        fotos.push({
          orden: item.orden,
          uri: item.uri,
          filename: generateMultimediaFilename({
            situacionId,
            infografiaNumero: targetNumero,
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
            infografiaNumero: targetNumero,
            tipo: 'VIDEO',
          }),
          duracion_segundos: item.duracion_segundos,
          estado: 'PENDIENTE',
        };
      }
    });

    onChange(infografias.map(inf =>
      inf.numero === targetNumero ? { ...inf, fotos, video } : inf
    ));
  };

  const renderSessionCard = (inf: Infografia) => {
    const validation = validateInfografia(inf);
    const fotoCount = inf.fotos?.length ?? 0;
    const hasMedia = fotoCount > 0 || !!inf.video;

    return (
      <View key={`session-${inf.numero}`} style={styles.card}>
        {/* Título */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Título</Text>
          <TextInput
            style={[styles.titleInput, disabled && styles.inputDisabled]}
            value={inf.titulo}
            onChangeText={(t) => handleUpdateTitulo(inf.numero, t)}
            placeholder="Describe esta evidencia..."
            placeholderTextColor={COLORS.text.secondary}
            maxLength={100}
            editable={!disabled}
          />
        </View>

        {/* Botón captura */}
        <TouchableOpacity
          style={[styles.captureBtn, disabled && styles.captureBtnDisabled]}
          onPress={() => setCaptureTargetNumero(inf.numero)}
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
                {fotoCount} foto{fotoCount !== 1 ? 's' : ''}{inf.video ? ' · 1 video' : ''}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Preview */}
        {fotoCount > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.previewScroll}
            contentContainerStyle={styles.previewContent}
          >
            {inf.fotos?.map((foto, idx) => (
              <View key={`foto-${foto.orden}-${idx}`} style={styles.previewItem}>
                <Image source={{ uri: foto.uri }} style={styles.previewImage} />
                <View style={styles.previewBadge}>
                  <Text style={styles.previewBadgeText}>{foto.orden}</Text>
                </View>
              </View>
            ))}
            {inf.video && (
              <View style={styles.previewItem}>
                <View style={[styles.previewImage, styles.videoPreview]}>
                  <Text style={{ fontSize: 28 }}>🎥</Text>
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

        {/* Eliminar */}
        {!disabled && (
          <TouchableOpacity style={styles.deleteRow} onPress={() => handleDeleteSession(inf)}>
            <Text style={styles.deleteText}>🗑 Eliminar evidencia</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>

      {/* ── Historial de actualizaciones previas ─────────────────────────── */}
      {historicalInfografias.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historySectionLabel}>Evidencia anterior</Text>
          {historicalInfografias.map((inf, idx) => {
            const fCount = inf.fotos?.length ?? 0;
            const hasVideo = !!inf.video;
            return (
              <View key={`hist-${inf.numero}-${idx}`} style={styles.historyCard}>
                <View style={styles.historyCardHeader}>
                  <Text style={styles.historyCardTitle} numberOfLines={1}>{inf.titulo}</Text>
                  <Text style={styles.historyCardMeta}>
                    {fCount} foto{fCount !== 1 ? 's' : ''}{hasVideo ? ' · 1 video' : ''}
                  </Text>
                </View>
                {fCount > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.historyThumbRow}
                    contentContainerStyle={{ gap: 6 }}
                  >
                    {inf.fotos?.slice(0, 5).map((foto, fi) => (
                      <Image
                        key={fi}
                        source={{ uri: foto.url_thumbnail ?? foto.url_original ?? foto.uri }}
                        style={styles.historyThumb}
                      />
                    ))}
                    {hasVideo && (
                      <View style={[styles.historyThumb, styles.historyVideoThumb]}>
                        <Text style={{ fontSize: 20 }}>🎥</Text>
                      </View>
                    )}
                  </ScrollView>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* ── Infografías de sesión (editables) ─────────────────────────────── */}
      {sessionInfografias.map(inf => renderSessionCard(inf))}

      {/* ── Agregar nueva ────────────────────────────────────────────────── */}
      {!disabled && sessionInfografias.length === 0 && (
        <TouchableOpacity style={styles.addCard} onPress={handleAddSessionInfografia} activeOpacity={0.7}>
          <Text style={styles.addCardIcon}>📷</Text>
          <Text style={styles.addCardTitle}>
            {sessionInfografias.length > 0 || historicalInfografias.length > 0
              ? 'Agregar otra evidencia'
              : 'Agregar evidencia fotográfica'}
          </Text>
          <Text style={styles.addCardSub}>Fotos y video de este momento</Text>
        </TouchableOpacity>
      )}

      {/* Modal captura */}
      {captureTarget && (
        <Modal
          visible={captureTargetNumero !== null}
          animationType="slide"
          onRequestClose={() => setCaptureTargetNumero(null)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>{captureTarget.titulo}</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setCaptureTargetNumero(null)}>
                <Text style={styles.modalCloseText}>✕ Cerrar</Text>
              </TouchableOpacity>
            </View>
            <MultimediaCaptureOffline
              draftUuid={`${situacionId}_I${captureTarget.numero}`}
              tipoSituacion="INFOGRAFIA"
              manualMode
              initialMedia={getMultimediaForCapture(captureTarget)}
              onMultimediaChange={(media) => handleMultimediaChange(captureTarget.numero, media)}
            />
            <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setCaptureTargetNumero(null)}>
              <Text style={styles.modalDoneText}>Listo</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Historial ──────────────────────────────────────────────────────────
  historySection: { marginBottom: 12 },
  historySectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
    opacity: 0.75,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
    marginRight: 8,
  },
  historyCardMeta: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  historyThumbRow: { flexGrow: 0 },
  historyThumb: {
    width: 52,
    height: 52,
    borderRadius: 6,
    backgroundColor: COLORS.gray[100],
  },
  historyVideoThumb: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // ── Card sesión actual ─────────────────────────────────────────────────
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
    marginBottom: 10,
  },
  fieldGroup: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
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
  inputDisabled: { color: COLORS.text.secondary },
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
  captureBtnDisabled: { opacity: 0.5 },
  captureBtnIcon: { fontSize: 22 },
  captureBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '600', flex: 1 },
  mediaBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mediaBadgeText: { color: COLORS.white, fontSize: 12, fontWeight: '500' },
  previewScroll: { marginBottom: 8 },
  previewContent: { paddingHorizontal: 16, gap: 8, flexDirection: 'row', paddingBottom: 4 },
  previewItem: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewImage: { width: '100%', height: '100%' },
  previewBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  previewBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '600' },
  videoPreview: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.gray[100] },
  validationBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.danger + '10',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
    borderRadius: 6,
    padding: 10,
  },
  validationText: { fontSize: 13, color: COLORS.danger, lineHeight: 18 },
  deleteRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteText: { fontSize: 14, color: COLORS.danger, fontWeight: '500' },

  // ── Añadir nueva ──────────────────────────────────────────────────────
  addCard: {
    borderWidth: 1.5,
    borderColor: COLORS.primary + '50',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 28,
    alignItems: 'center',
    backgroundColor: COLORS.primary + '06',
    marginTop: 4,
  },
  addCardIcon: { fontSize: 36, marginBottom: 10 },
  addCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  addCardSub: { fontSize: 13, color: COLORS.text.secondary, textAlign: 'center' },

  // ── Modal ──────────────────────────────────────────────────────────────
  modalContainer: { flex: 1, backgroundColor: COLORS.white },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary, flex: 1 },
  modalCloseBtn: { padding: 8 },
  modalCloseText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  modalDoneBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  modalDoneText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
});
