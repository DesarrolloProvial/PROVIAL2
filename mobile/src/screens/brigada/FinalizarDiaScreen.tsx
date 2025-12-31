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

import FuelSelector from '../../components/FuelSelector';

export default function FinalizarDiaScreen() {
  const navigation = useNavigation();
  const { salidaActiva, ingresoActivo, miSede, refreshEstadoBrigada } = useAuthStore();

  const [kmIngreso, setKmIngreso] = useState('');
  const [combustibleFraccion, setCombustibleFraccion] = useState<string | null>(null);
  const [combustibleDecimal, setCombustibleDecimal] = useState<number>(0);
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCombustibleChange = (fraccion: string, decimal: number) => {
    setCombustibleFraccion(fraccion);
    setCombustibleDecimal(decimal);
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calcularDuracion = (fechaInicio: string) => {
    const inicio = new Date(fechaInicio);
    const ahora = new Date();
    const diff = ahora.getTime() - inicio.getTime();
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${horas}h ${minutos}m`;
  };

  const handleFinalizarDia = async () => {
    // Validar campos requeridos
    if (!kmIngreso.trim()) {
      Alert.alert('Error', 'Debes ingresar el kilometraje final');
      return;
    }

    if (!combustibleFraccion) {
      Alert.alert('Error', 'Debes ingresar el nivel de combustible final');
      return;
    }

    const kmNum = parseInt(kmIngreso, 10);

    if (isNaN(kmNum) || kmNum < 0) {
      Alert.alert('Error', 'El kilometraje debe ser un número válido');
      return;
    }

    // Confirmación
    Alert.alert(
      'Confirmar Finalización',
      '¿Estás seguro que deseas finalizar tu jornada laboral? Esta acción liberará la unidad y la tripulación.',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Finalizar',
          style: 'destructive',
          onPress: async () => {
            await realizarFinalizacion(kmNum, combustibleDecimal);
          }
        }
      ]
    );
  };

  const realizarFinalizacion = async (kmNum: number, combustibleNum: number) => {
    try {
      setLoading(true);

      // Si ya estamos ingresados (flujo correcto), usamos la sede del ingreso activo o la asignada
      const sedeId = ingresoActivo?.sede_id || miSede?.mi_sede_id;

      if (!sedeId) {
        Alert.alert('Error', 'No se pudo determinar la sede. Contacta a soporte.');
        setLoading(false);
        return;
      }

      const response = await axios.post(`${API_URL}/ingresos/registrar`, {
        tipo_ingreso: 'FINALIZACION',
        sede_id: sedeId,
        km_ingreso: kmNum,
        combustible_ingreso: combustibleNum,
        combustible_fraccion: combustibleFraccion,
        observaciones: observaciones.trim() || undefined,
        es_ingreso_final: true,
      });

      console.log('[FINALIZAR DIA] Respuesta:', response.data);

      // Actualizar estado
      await refreshEstadoBrigada();

      Alert.alert(
        '¡Día Finalizado!',
        'Tu jornada laboral ha finalizado. La unidad y tripulación han sido liberadas. Descansa y nos vemos mañana.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navegar al home
              navigation.reset({
                index: 0,
                routes: [{ name: 'BrigadaHome' as never }],
              });
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('[FINALIZAR DIA] Error:', error);
      const mensaje = error.response?.data?.error || error.message || 'No se pudo finalizar el día';
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
            No tienes una salida activa para finalizar.
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

  if (ingresoActivo && !ingresoActivo.es_ingreso_final) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Ingreso Activo</Text>
          <Text style={styles.errorText}>
            Tienes un ingreso temporal activo. Debes registrar la salida de sede antes de finalizar el día.
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
        <Text style={styles.headerTitle}>Finalizar Jornada</Text>
        <Text style={styles.headerSubtitle}>
          Registra el fin de tu día laboral
        </Text>
      </View>

      {/* Resumen de la Salida */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen del Día</Text>
        <View style={styles.resumenInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Unidad:</Text>
            <Text style={styles.infoValue}>{salidaActiva.unidad_codigo}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Inicio:</Text>
            <Text style={styles.infoValue}>
              {formatFecha(salidaActiva.fecha_hora_salida)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duración:</Text>
            <Text style={styles.infoValue}>
              {calcularDuracion(salidaActiva.fecha_hora_salida)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tu Rol:</Text>
            <Text style={styles.infoValue}>{salidaActiva.mi_rol}</Text>
          </View>
        </View>
      </View>

      {/* Card de Sede */}
      {miSede && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ingreso a Sede</Text>
          <View style={styles.sedeInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sede:</Text>
              <Text style={styles.infoValue}>{miSede.mi_sede_nombre}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Formulario */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Datos Finales</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Kilometraje Final <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={kmIngreso}
            onChangeText={(text) => setKmIngreso(text.replace(/[^0-9]/g, ''))}
            placeholder="Ej: 125000"
            keyboardType="number-pad"
            editable={!loading}
          />
          <Text style={styles.hint}>Kilometraje al finalizar el día</Text>
        </View>

        <View style={styles.formGroup}>
          <FuelSelector
            value={combustibleFraccion}
            onChange={handleCombustibleChange}
            label="Combustible Final"
            required
          />
          <Text style={styles.hint}>Nivel de combustible al finalizar</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Observaciones Finales (Opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={observaciones}
            onChangeText={setObservaciones}
            placeholder="Novedades del día, estado de la unidad, pendientes para mañana..."
            multiline
            numberOfLines={4}
            editable={!loading}
          />
        </View>
      </View>

      {/* Advertencia */}
      <View style={styles.warningCard}>
        <Text style={styles.warningIcon}>⚠️</Text>
        <Text style={styles.warningTitle}>Importante</Text>
        <Text style={styles.warningText}>
          Al finalizar tu jornada:{'\n\n'}
          • La salida se marcará como FINALIZADA{'\n'}
          • La unidad y tripulación quedarán libres{'\n'}
          • No podrás reportar más situaciones hoy{'\n'}
          • Mañana deberás iniciar una nueva salida
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
          onPress={handleFinalizarDia}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>Finalizar Jornada</Text>
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
    backgroundColor: COLORS.danger,
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
  resumenInfo: {
    backgroundColor: COLORS.success + '10',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  sedeInfo: {
    backgroundColor: COLORS.info + '10',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
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
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  required: {
    color: COLORS.danger,
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
    height: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  warningCard: {
    backgroundColor: COLORS.warning + '20',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  warningIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 22,
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
    backgroundColor: COLORS.danger,
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
