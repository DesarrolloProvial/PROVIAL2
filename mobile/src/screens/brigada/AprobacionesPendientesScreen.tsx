import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { aprobacionesService, AprobacionPendiente } from '../../services/aprobaciones.service';
import * as Location from 'expo-location';

// ============================================
// COMPONENTES
// ============================================

interface AprobacionCardProps {
  aprobacion: AprobacionPendiente;
  onResponder: (id: number, respuesta: 'APROBADO' | 'RECHAZADO', motivo?: string) => void;
  isLoading: boolean;
}

function AprobacionCard({ aprobacion, onResponder, isLoading }: AprobacionCardProps) {
  const [modalRechazo, setModalRechazo] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'CONFIRMAR_PRESENCIA':
        return 'Confirmar Presencia';
      case 'APROBAR_FIN_JORNADA':
        return 'Aprobar Fin de Jornada';
      case 'APROBAR_360':
        return 'Aprobar Inspeccion 360';
      default:
        return tipo;
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'CONFIRMAR_PRESENCIA':
        return 'people';
      case 'APROBAR_FIN_JORNADA':
        return 'exit';
      case 'APROBAR_360':
        return 'clipboard-outline';
      default:
        return 'checkmark-circle';
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'CONFIRMAR_PRESENCIA':
        return '#3b82f6';
      case 'APROBAR_FIN_JORNADA':
        return '#f59e0b';
      case 'APROBAR_360':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  const handleRechazar = () => {
    if (!motivoRechazo.trim()) {
      Alert.alert('Error', 'Debe ingresar un motivo para rechazar');
      return;
    }
    setModalRechazo(false);
    onResponder(aprobacion.aprobacion_id, 'RECHAZADO', motivoRechazo);
    setMotivoRechazo('');
  };

  const tiempoRestante = Math.max(0, Math.floor(aprobacion.minutos_restantes));
  const tiempoUrgente = tiempoRestante < 5;

  return (
    <View style={[styles.card, { borderLeftColor: getTipoColor(aprobacion.tipo) }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Ionicons name={getTipoIcon(aprobacion.tipo) as any} size={24} color={getTipoColor(aprobacion.tipo)} />
          <View style={styles.cardTitleText}>
            <Text style={styles.cardTitle}>{getTipoLabel(aprobacion.tipo)}</Text>
            <Text style={styles.cardSubtitle}>
              Unidad {aprobacion.unidad_codigo} ({aprobacion.tipo_unidad})
            </Text>
          </View>
        </View>
        <View style={[styles.tiempoBadge, tiempoUrgente && styles.tiempoBadgeUrgente]}>
          <Ionicons name="time-outline" size={14} color={tiempoUrgente ? '#dc2626' : '#6b7280'} />
          <Text style={[styles.tiempoTexto, tiempoUrgente && styles.tiempoTextoUrgente]}>
            {tiempoRestante} min
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.iniciadoPor}>
          Solicitado por: <Text style={styles.bold}>{aprobacion.iniciado_por_nombre}</Text>
        </Text>
        {aprobacion.observaciones && (
          <Text style={styles.observaciones}>{aprobacion.observaciones}</Text>
        )}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.btnRechazar, isLoading && styles.btnDisabled]}
          onPress={() => setModalRechazo(true)}
          disabled={isLoading}
        >
          <Ionicons name="close-circle" size={20} color="#dc2626" />
          <Text style={styles.btnRechazarText}>Rechazar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnAprobar, isLoading && styles.btnDisabled]}
          onPress={() => onResponder(aprobacion.aprobacion_id, 'APROBADO')}
          disabled={isLoading}
        >
          <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
          <Text style={styles.btnAprobarText}>Aprobar</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de rechazo */}
      <Modal visible={modalRechazo} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Motivo del Rechazo</Text>
            <Text style={styles.modalSubtitle}>
              Explique por que rechaza esta solicitud
            </Text>
            <TextInput
              style={styles.motivoInput}
              placeholder="Escriba el motivo..."
              value={motivoRechazo}
              onChangeText={setMotivoRechazo}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancelar}
                onPress={() => {
                  setModalRechazo(false);
                  setMotivoRechazo('');
                }}
              >
                <Text style={styles.modalBtnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnConfirmar}
                onPress={handleRechazar}
              >
                <Text style={styles.modalBtnConfirmarText}>Confirmar Rechazo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================
// PANTALLA PRINCIPAL
// ============================================

export default function AprobacionesPendientesScreen() {
  const queryClient = useQueryClient();

  // Query de aprobaciones pendientes
  const { data: aprobaciones = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['aprobaciones-pendientes'],
    queryFn: () => aprobacionesService.obtenerPendientes(),
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });

  // Mutation para responder
  const responderMutation = useMutation({
    mutationFn: async ({
      id,
      respuesta,
      motivo,
    }: {
      id: number;
      respuesta: 'APROBADO' | 'RECHAZADO';
      motivo?: string;
    }) => {
      // Si es confirmacion de presencia, obtener ubicacion
      let ubicacion: { latitud: number; longitud: number } | undefined;
      if (respuesta === 'APROBADO') {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
            ubicacion = {
              latitud: loc.coords.latitude,
              longitud: loc.coords.longitude,
            };
          }
        } catch (e) {
          console.log('No se pudo obtener ubicacion:', e);
        }
      }

      return aprobacionesService.responder(id, respuesta, motivo, ubicacion);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['aprobaciones-pendientes'] });

      if (data.estado === 'COMPLETADA') {
        Alert.alert('Exito', 'Todos aprobaron. La solicitud fue completada.');
      } else if (data.estado === 'RECHAZADA') {
        Alert.alert('Rechazada', 'La solicitud fue rechazada.');
      } else {
        Alert.alert(
          'Respuesta Registrada',
          `Aprobados: ${data.conteo.aprobados}/${data.conteo.total}\nPendientes: ${data.conteo.pendientes}`
        );
      }
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo registrar la respuesta'
      );
    },
  });

  const handleResponder = (id: number, respuesta: 'APROBADO' | 'RECHAZADO', motivo?: string) => {
    responderMutation.mutate({ id, respuesta, motivo });
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Cargando aprobaciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aprobaciones Pendientes</Text>
        <Text style={styles.headerSubtitle}>
          {aprobaciones.length} {aprobaciones.length === 1 ? 'solicitud' : 'solicitudes'}
        </Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={aprobaciones.length === 0 && styles.emptyContainer}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {aprobaciones.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#10b981" />
            <Text style={styles.emptyTitle}>Todo al dia</Text>
            <Text style={styles.emptySubtitle}>
              No tienes aprobaciones pendientes
            </Text>
          </View>
        ) : (
          aprobaciones.map((ap) => (
            <AprobacionCard
              key={ap.aprobacion_id}
              aprobacion={ap}
              onResponder={handleResponder}
              isLoading={responderMutation.isPending}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#1e3a5f',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  list: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitleText: {
    marginLeft: 12,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  tiempoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tiempoBadgeUrgente: {
    backgroundColor: '#fee2e2',
  },
  tiempoTexto: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  tiempoTextoUrgente: {
    color: '#dc2626',
    fontWeight: '600',
  },
  cardBody: {
    padding: 16,
  },
  iniciadoPor: {
    fontSize: 14,
    color: '#6b7280',
  },
  bold: {
    fontWeight: '600',
    color: '#1f2937',
  },
  observaciones: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  btnRechazar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: '#f3f4f6',
  },
  btnRechazarText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#dc2626',
    marginLeft: 6,
  },
  btnAprobar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#10b981',
    borderBottomRightRadius: 12,
  },
  btnAprobarText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 6,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  motivoInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    fontSize: 15,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  modalBtnCancelar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  modalBtnCancelarText: {
    fontSize: 15,
    color: '#6b7280',
  },
  modalBtnConfirmar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  modalBtnConfirmarText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
