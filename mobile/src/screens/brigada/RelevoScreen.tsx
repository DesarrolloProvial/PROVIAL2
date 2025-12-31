import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../constants/colors';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { API_URL } from '../../constants/config';

const TIPOS_RELEVO = [
  {
    value: 'UNIDAD_COMPLETA',
    label: 'Unidad Completa',
    icon: '🔄',
    color: '#3b82f6',
    descripcion: 'Una unidad se retira y otra llega para relevar'
  },
  {
    value: 'CRUZADO',
    label: 'Relevo Cruzado',
    icon: '⚡',
    color: '#8b5cf6',
    descripcion: 'La tripulación se queda con otra unidad'
  },
];

export default function RelevoScreen() {
  const navigation = useNavigation();
  const { salidaActiva, asignacion, refreshEstadoBrigada } = useAuthStore();

  const [tipoRelevo, setTipoRelevo] = useState('');
  const [unidadEntrante, setUnidadEntrante] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegistrarRelevo = async () => {
    // Validar campos
    if (!tipoRelevo) {
      Alert.alert('Error', 'Debes seleccionar el tipo de relevo');
      return;
    }

    if (!unidadEntrante.trim()) {
      Alert.alert('Error', 'Debes ingresar el código de la unidad entrante');
      return;
    }

    if (!salidaActiva) {
      Alert.alert('Error', 'No hay salida activa para relevar');
      return;
    }

    // Confirmación
    const tipoLabel = TIPOS_RELEVO.find(t => t.value === tipoRelevo)?.label || tipoRelevo;
    Alert.alert(
      'Confirmar Relevo',
      `¿Estás seguro que deseas registrar un relevo de tipo "${tipoLabel}"?\n\nUnidad saliente: ${salidaActiva.unidad_codigo}\nUnidad entrante: ${unidadEntrante}`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Confirmar',
          onPress: async () => {
            await realizarRelevo();
          }
        }
      ]
    );
  };

  const realizarRelevo = async () => {
    try {
      setLoading(true);

      const response = await axios.post(`${API_URL}/salidas/relevos`, {
        tipo_relevo: tipoRelevo,
        unidad_saliente_codigo: salidaActiva!.unidad_codigo,
        unidad_entrante_codigo: unidadEntrante.trim(),
        observaciones: observaciones.trim() || undefined,
      });

      console.log('[RELEVO] Respuesta:', response.data);

      // Actualizar estado
      await refreshEstadoBrigada();

      Alert.alert(
        'Relevo Registrado',
        'El relevo ha sido registrado exitosamente. La unidad entrante ahora está en servicio.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error: any) {
      console.error('[RELEVO] Error:', error);
      const mensaje = error.response?.data?.error || error.message || 'No se pudo registrar el relevo';
      Alert.alert('Error', mensaje);
    } finally {
      setLoading(false);
    }
  };

  if (!salidaActiva) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Sin Salida Activa</Text>
          <Text style={styles.errorText}>
            Debes tener una salida activa para poder registrar un relevo.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Registrar Relevo</Text>
        <Text style={styles.headerSubtitle}>
          Cambio de unidades en el punto
        </Text>
      </View>

      {/* Card de Salida Actual */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Unidad Saliente</Text>
        <View style={styles.unidadInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Unidad:</Text>
            <Text style={styles.infoValue}>{salidaActiva.unidad_codigo}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tipo:</Text>
            <Text style={styles.infoValue}>{salidaActiva.tipo_unidad}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tu Rol:</Text>
            <Text style={styles.infoValue}>{salidaActiva.mi_rol}</Text>
          </View>
        </View>
      </View>

      {/* Selección de Tipo de Relevo */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Tipo de Relevo <Text style={styles.required}>*</Text>
        </Text>
        {TIPOS_RELEVO.map((tipo) => (
          <TouchableOpacity
            key={tipo.value}
            style={[
              styles.tipoCard,
              tipoRelevo === tipo.value && styles.tipoCardSelected,
              { borderLeftColor: tipo.color }
            ]}
            onPress={() => setTipoRelevo(tipo.value)}
            disabled={loading}
          >
            <View style={styles.tipoHeader}>
              <Text style={styles.tipoIcon}>{tipo.icon}</Text>
              <Text style={[
                styles.tipoLabel,
                tipoRelevo === tipo.value && { color: tipo.color, fontWeight: '700' }
              ]}>
                {tipo.label}
              </Text>
            </View>
            <Text style={styles.tipoDescripcion}>{tipo.descripcion}</Text>
            {tipoRelevo === tipo.value && (
              <View style={[styles.selectedBadge, { backgroundColor: tipo.color }]}>
                <Text style={styles.selectedBadgeText}>Seleccionado</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Formulario de Unidad Entrante */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Unidad Entrante</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Código de Unidad <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={unidadEntrante}
            onChangeText={setUnidadEntrante}
            placeholder="Ej: PROV-002"
            autoCapitalize="characters"
            editable={!loading}
          />
          <Text style={styles.hint}>
            Ingresa el código de la unidad que entra en servicio
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Observaciones (Opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={observaciones}
            onChangeText={setObservaciones}
            placeholder="Motivo del relevo, condiciones, novedades..."
            multiline
            numberOfLines={3}
            editable={!loading}
          />
        </View>
      </View>

      {/* Instrucciones según tipo seleccionado */}
      {tipoRelevo && (
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>
            {tipoRelevo === 'UNIDAD_COMPLETA' ? '🔄 Relevo de Unidad Completa' : '⚡ Relevo Cruzado'}
          </Text>
          <Text style={styles.instructionsText}>
            {tipoRelevo === 'UNIDAD_COMPLETA'
              ? `• Tu unidad (${salidaActiva.unidad_codigo}) finalizará su salida\n• La unidad ${unidadEntrante || 'entrante'} comenzará el servicio\n• La tripulación de tu unidad regresa a sede\n• Nueva tripulación asume el servicio`
              : `• Tu tripulación se queda en el punto\n• Tu unidad (${salidaActiva.unidad_codigo}) regresa a sede\n• La unidad ${unidadEntrante || 'entrante'} te releva\n• Continuarás el servicio con la nueva unidad`
            }
          </Text>
        </View>
      )}

      {/* Advertencia */}
      <View style={styles.warningCard}>
        <Text style={styles.warningIcon}>⚠️</Text>
        <Text style={styles.warningText}>
          El relevo debe ser coordinado con COP y registrado en ambas unidades (saliente y entrante).
        </Text>
      </View>

      {/* Botones */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.confirmButton]}
          onPress={handleRegistrarRelevo}
          disabled={loading || !tipoRelevo || !unidadEntrante}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>Registrar Relevo</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: '#8b5cf6',
    padding: 20,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },
  card: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  unidadInfo: {
    backgroundColor: COLORS.primary + '10',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  required: {
    color: COLORS.danger,
  },
  tipoCard: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  tipoCardSelected: {
    backgroundColor: COLORS.background,
    borderWidth: 3,
  },
  tipoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipoIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  tipoLabel: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  tipoDescripcion: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  selectedBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS.white,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  instructionsCard: {
    backgroundColor: '#8b5cf6' + '20',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  warningCard: {
    backgroundColor: COLORS.warning + '20',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  warningText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
    flex: 1,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  confirmButton: {
    backgroundColor: '#8b5cf6',
  },
  cancelButtonText: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: COLORS.white,
    margin: 20,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 48,
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
    lineHeight: 20,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
