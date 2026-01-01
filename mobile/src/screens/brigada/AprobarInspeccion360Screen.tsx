import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '../../constants/colors';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

// ============================================
// TYPES
// ============================================

type AprobarInspeccion360RouteProp = RouteProp<{
  AprobarInspeccion360: {
    inspeccionId: number;
    salidaId?: number;
  };
}, 'AprobarInspeccion360'>;

interface Inspeccion360 {
  id: number;
  salida_id: number | null;
  unidad_id: number;
  plantilla_id: number;
  realizado_por: number;
  aprobado_por: number | null;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  fecha_realizacion: string;
  fecha_aprobacion: string | null;
  respuestas: Respuesta360[];
  observaciones: string | null;
  motivo_rechazo: string | null;
  // Campos joined
  unidad_codigo?: string;
  tipo_unidad?: string;
  inspector_nombre?: string;
  plantilla_nombre?: string;
}

interface Respuesta360 {
  seccion: string;
  items: RespuestaItem[];
}

interface RespuestaItem {
  codigo: string;
  descripcion: string;
  tipo: string;
  valor: any;
  foto_url?: string;
  observacion?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AprobarInspeccion360Screen() {
  const navigation = useNavigation();
  const route = useRoute<AprobarInspeccion360RouteProp>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { inspeccionId, salidaId } = route.params || {};

  // Estados locales
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [seccionActiva, setSeccionActiva] = useState(0);

  // Query para obtener la inspeccion
  const { data: inspeccion, isLoading, error } = useQuery<Inspeccion360>({
    queryKey: ['inspeccion-360', inspeccionId],
    queryFn: async () => {
      const response = await api.get(`/inspeccion360/${inspeccionId}`);
      return response.data.inspeccion;
    },
    enabled: !!inspeccionId,
  });

  // Mutation para aprobar
  const aprobarMutation = useMutation({
    mutationFn: async () => {
      const response = await api.put(`/inspeccion360/${inspeccionId}/aprobar`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspeccion-360'] });
      queryClient.invalidateQueries({ queryKey: ['mi-asignacion'] });
      Alert.alert(
        'Inspeccion Aprobada',
        'La inspeccion 360 ha sido aprobada. Ahora pueden iniciar la salida.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'No se pudo aprobar la inspeccion');
    },
  });

  // Mutation para rechazar
  const rechazarMutation = useMutation({
    mutationFn: async (motivo: string) => {
      const response = await api.put(`/inspeccion360/${inspeccionId}/rechazar`, {
        motivo_rechazo: motivo,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspeccion-360'] });
      setShowRejectModal(false);
      Alert.alert(
        'Inspeccion Rechazada',
        'La inspeccion 360 ha sido rechazada. El inspector debe corregir y reenviar.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'No se pudo rechazar la inspeccion');
    },
  });

  // Calcular resumen por seccion
  const resumenSecciones = useMemo(() => {
    if (!inspeccion?.respuestas) return [];

    return inspeccion.respuestas.map((seccion, idx) => {
      const itemsConProblemas = seccion.items.filter((item) => {
        // Contar items con problemas potenciales
        if (item.tipo === 'CHECKBOX' && item.valor === false) return true;
        if (item.tipo === 'ESTADO' && item.valor === 'MALO') return true;
        if (item.tipo === 'TEXTO_FOTO' && item.foto_url) return true;
        return false;
      });

      return {
        nombre: seccion.seccion,
        totalItems: seccion.items.length,
        problemas: itemsConProblemas.length,
        items: seccion.items,
      };
    });
  }, [inspeccion]);

  const handleAprobar = () => {
    Alert.alert(
      'Confirmar Aprobacion',
      'Al aprobar esta inspeccion, confirmas que la unidad esta en condiciones para salir. ¿Estas seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Aprobar', style: 'default', onPress: () => aprobarMutation.mutate() },
      ]
    );
  };

  const handleRechazar = () => {
    if (!motivoRechazo.trim()) {
      Alert.alert('Error', 'Debes indicar el motivo del rechazo');
      return;
    }
    rechazarMutation.mutate(motivoRechazo.trim());
  };

  // Renderizar valor segun tipo
  const renderValor = (item: RespuestaItem) => {
    switch (item.tipo) {
      case 'CHECKBOX':
        return (
          <View style={[
            styles.valorBadge,
            { backgroundColor: item.valor ? COLORS.success + '20' : COLORS.danger + '20' }
          ]}>
            <Text style={{ color: item.valor ? COLORS.success : COLORS.danger, fontWeight: '600' }}>
              {item.valor ? 'SI' : 'NO'}
            </Text>
          </View>
        );

      case 'ESTADO':
        const colorEstado = item.valor === 'BUENO' ? COLORS.success :
                          item.valor === 'REGULAR' ? COLORS.warning : COLORS.danger;
        return (
          <View style={[styles.valorBadge, { backgroundColor: colorEstado + '20' }]}>
            <Text style={{ color: colorEstado, fontWeight: '600' }}>{item.valor}</Text>
          </View>
        );

      case 'NUMERO':
        return (
          <Text style={styles.valorTexto}>{item.valor || 'N/A'}</Text>
        );

      case 'TEXTO':
      case 'TEXTO_FOTO':
        return (
          <View style={styles.valorTextoContainer}>
            {item.valor && <Text style={styles.valorTexto}>{item.valor}</Text>}
            {item.foto_url && (
              <View style={styles.fotoIndicador}>
                <Text style={styles.fotoIndicadorText}>Tiene foto adjunta</Text>
              </View>
            )}
            {!item.valor && !item.foto_url && (
              <Text style={[styles.valorTexto, { color: COLORS.text.secondary }]}>Sin observaciones</Text>
            )}
          </View>
        );

      default:
        return <Text style={styles.valorTexto}>{String(item.valor)}</Text>;
    }
  };

  // Loading
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando inspeccion...</Text>
      </View>
    );
  }

  // Error
  if (error || !inspeccion) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorIcon}>!</Text>
        <Text style={styles.errorTitle}>Error al cargar</Text>
        <Text style={styles.errorText}>
          No se pudo cargar la inspeccion. Intenta de nuevo.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Ya aprobada o rechazada
  if (inspeccion.estado !== 'PENDIENTE') {
    return (
      <ScrollView style={styles.container}>
        <View style={[
          styles.header,
          { backgroundColor: inspeccion.estado === 'APROBADA' ? COLORS.success : COLORS.danger }
        ]}>
          <Text style={styles.headerTitle}>
            Inspeccion {inspeccion.estado}
          </Text>
          <Text style={styles.headerSubtitle}>
            {inspeccion.estado === 'APROBADA'
              ? 'Esta inspeccion ya fue aprobada'
              : 'Esta inspeccion fue rechazada'}
          </Text>
        </View>

        {/* Info de la inspeccion */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Unidad:</Text>
            <Text style={styles.infoValue}>{inspeccion.unidad_codigo || `#${inspeccion.unidad_id}`}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Inspector:</Text>
            <Text style={styles.infoValue}>{inspeccion.inspector_nombre || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fecha:</Text>
            <Text style={styles.infoValue}>
              {new Date(inspeccion.fecha_realizacion).toLocaleString()}
            </Text>
          </View>
          {inspeccion.fecha_aprobacion && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Aprobada:</Text>
              <Text style={styles.infoValue}>
                {new Date(inspeccion.fecha_aprobacion).toLocaleString()}
              </Text>
            </View>
          )}
          {inspeccion.motivo_rechazo && (
            <View style={styles.motivoRechazoBox}>
              <Text style={styles.motivoRechazoLabel}>Motivo del rechazo:</Text>
              <Text style={styles.motivoRechazoText}>{inspeccion.motivo_rechazo}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.volverButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.volverButtonText}>Volver</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Pantalla principal de aprobacion
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aprobar Inspeccion 360</Text>
        <Text style={styles.headerSubtitle}>
          Revisa y aprueba la inspeccion de la unidad
        </Text>
      </View>

      {/* Info resumen */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Unidad</Text>
            <Text style={styles.summaryValue}>{inspeccion.unidad_codigo || `#${inspeccion.unidad_id}`}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Tipo</Text>
            <Text style={styles.summaryValue}>{inspeccion.tipo_unidad || 'N/A'}</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Inspector</Text>
            <Text style={styles.summaryValue}>{inspeccion.inspector_nombre || '-'}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Fecha</Text>
            <Text style={styles.summaryValue}>
              {new Date(inspeccion.fecha_realizacion).toLocaleTimeString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs de secciones */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.seccionesTabsContainer}
        contentContainerStyle={styles.seccionesTabsContent}
      >
        {resumenSecciones.map((seccion, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.seccionTab,
              seccionActiva === idx && styles.seccionTabActiva,
              seccion.problemas > 0 && styles.seccionTabProblema,
            ]}
            onPress={() => setSeccionActiva(idx)}
          >
            <Text style={[
              styles.seccionTabText,
              seccionActiva === idx && styles.seccionTabTextActiva,
            ]}>
              {seccion.nombre}
            </Text>
            {seccion.problemas > 0 && (
              <View style={styles.problemaBadge}>
                <Text style={styles.problemaBadgeText}>{seccion.problemas}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Contenido de la seccion activa */}
      <ScrollView style={styles.seccionContenido}>
        {resumenSecciones[seccionActiva]?.items.map((item, idx) => (
          <View key={idx} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemCodigo}>{item.codigo}</Text>
              <Text style={styles.itemDescripcion}>{item.descripcion}</Text>
            </View>
            <View style={styles.itemValor}>
              {renderValor(item)}
            </View>
          </View>
        ))}

        {/* Observaciones generales */}
        {inspeccion.observaciones && (
          <View style={styles.observacionesCard}>
            <Text style={styles.observacionesTitle}>Observaciones del Inspector</Text>
            <Text style={styles.observacionesText}>{inspeccion.observaciones}</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botones de accion */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rechazarButton]}
          onPress={() => setShowRejectModal(true)}
          disabled={aprobarMutation.isPending || rechazarMutation.isPending}
        >
          <Text style={styles.rechazarButtonText}>Rechazar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.aprobarButton]}
          onPress={handleAprobar}
          disabled={aprobarMutation.isPending || rechazarMutation.isPending}
        >
          {aprobarMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.aprobarButtonText}>Aprobar</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de rechazo */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rechazar Inspeccion</Text>
            <Text style={styles.modalSubtitle}>
              Indica el motivo del rechazo para que el inspector pueda corregir
            </Text>

            <TextInput
              style={styles.modalInput}
              value={motivoRechazo}
              onChangeText={setMotivoRechazo}
              placeholder="Ej: Falta revisar nivel de aceite, foto de llanta trasera borrosa..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowRejectModal(false);
                  setMotivoRechazo('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleRechazar}
                disabled={rechazarMutation.isPending}
              >
                {rechazarMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Confirmar Rechazo</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.text.secondary,
    fontSize: 16,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  seccionesTabsContainer: {
    maxHeight: 50,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  seccionesTabsContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  seccionTab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
  },
  seccionTabActiva: {
    borderBottomColor: COLORS.primary,
  },
  seccionTabProblema: {},
  seccionTabText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  seccionTabTextActiva: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  problemaBadge: {
    backgroundColor: COLORS.warning,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  problemaBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  seccionContenido: {
    flex: 1,
    padding: 16,
  },
  itemRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemCodigo: {
    fontSize: 11,
    color: COLORS.text.secondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemDescripcion: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  itemValor: {
    marginLeft: 12,
  },
  valorBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  valorTexto: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  valorTextoContainer: {},
  fotoIndicador: {
    backgroundColor: COLORS.info + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  fotoIndicadorText: {
    fontSize: 11,
    color: COLORS.info,
    fontWeight: '500',
  },
  observacionesCard: {
    backgroundColor: COLORS.info + '15',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
  },
  observacionesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  observacionesText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rechazarButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  rechazarButtonText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '600',
  },
  aprobarButton: {
    backgroundColor: COLORS.success,
  },
  aprobarButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: COLORS.background,
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelButtonText: {
    color: COLORS.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  modalConfirmButton: {
    backgroundColor: COLORS.danger,
  },
  modalConfirmButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  // Error states
  errorIcon: {
    fontSize: 48,
    color: COLORS.danger,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Card/Info
  card: {
    backgroundColor: COLORS.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  motivoRechazoBox: {
    backgroundColor: COLORS.danger + '15',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  motivoRechazoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.danger,
    marginBottom: 4,
  },
  motivoRechazoText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  volverButton: {
    backgroundColor: COLORS.primary,
    margin: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  volverButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
