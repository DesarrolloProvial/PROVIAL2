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

export default function SalidaDeSedeScreen() {
  const navigation = useNavigation();
  const { ingresoActivo, refreshEstadoBrigada } = useAuthStore();

  const [kmSalida, setKmSalida] = useState('');
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
    return date.toLocaleTimeString('es-GT', {
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

    if (horas > 0) {
      return `${horas}h ${minutos}m`;
    }
    return `${minutos}m`;
  };

  const getTipoIngresoLabel = (tipo: string) => {
    const tipos: { [key: string]: string } = {
      'COMBUSTIBLE': '⛽ Combustible',
      'COMISION': '📋 Comisión',
      'APOYO': '🤝 Apoyo',
      'ALMUERZO': '🍽️ Almuerzo',
      'MANTENIMIENTO': '🔧 Mantenimiento',
    };
    return tipos[tipo] || tipo;
  };

  const handleSalidaDeSede = async () => {
    if (!ingresoActivo) return;

    const data: any = {
      ingreso_id: ingresoActivo.ingreso_id,
    };

    // Validar campos opcionales
    if (kmSalida.trim()) {
      const kmNum = parseInt(kmSalida, 10);
      if (isNaN(kmNum) || kmNum < 0) {
        Alert.alert('Error', 'El kilometraje debe ser un número válido');
        return;
      }
      data.km_salida = kmNum;
    }

    if (combustibleFraccion) {
      data.combustible_salida = combustibleDecimal;
      data.combustible_fraccion = combustibleFraccion;
    }

    if (observaciones.trim()) {
      data.observaciones = observaciones.trim();
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/ingresos/${ingresoActivo.ingreso_id}/salir`,
        data
      );

      console.log('[SALIDA SEDE] Respuesta:', response.data);

      // Actualizar estado
      await refreshEstadoBrigada();

      Alert.alert(
        'Salida Registrada',
        'Has salido de sede exitosamente. Puedes continuar patrullando y reportando situaciones.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error: any) {
      console.error('[SALIDA SEDE] Error:', error);
      const mensaje = error.response?.data?.error || error.message || 'No se pudo registrar la salida';
      Alert.alert('Error', mensaje);
    } finally {
      setLoading(false);
    }
  };

  if (!ingresoActivo) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>No Estás en Sede</Text>
          <Text style={styles.errorText}>
            No tienes un ingreso activo. Ya estás en la calle.
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

  if (ingresoActivo.es_ingreso_final) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>🏁</Text>
          <Text style={styles.errorTitle}>Jornada Finalizada</Text>
          <Text style={styles.errorText}>
            Este es un ingreso final. Tu jornada laboral ha terminado. No puedes volver a salir hoy.
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
        <Text style={styles.headerTitle}>Salir de Sede</Text>
        <Text style={styles.headerSubtitle}>
          Volver a patrullar
        </Text>
      </View>

      {/* Card de Ingreso Actual */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tu Ingreso Actual</Text>
        <View style={styles.ingresoInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tipo:</Text>
            <Text style={styles.infoValue}>
              {getTipoIngresoLabel(ingresoActivo.tipo_ingreso)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sede:</Text>
            <Text style={styles.infoValue}>{ingresoActivo.sede_nombre}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hora Ingreso:</Text>
            <Text style={styles.infoValue}>
              {formatFecha(ingresoActivo.fecha_hora_ingreso)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tiempo en Sede:</Text>
            <Text style={styles.infoValue}>
              {calcularDuracion(ingresoActivo.fecha_hora_ingreso)}
            </Text>
          </View>
          {ingresoActivo.km_ingreso && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>KM Ingreso:</Text>
              <Text style={styles.infoValue}>{ingresoActivo.km_ingreso}</Text>
            </View>
          )}
          {ingresoActivo.combustible_ingreso && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Combustible Ingreso:</Text>
              <Text style={styles.infoValue}>{ingresoActivo.combustible_ingreso}%</Text>
            </View>
          )}
        </View>
      </View>

      {/* Formulario */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Datos de Salida (Opcionales)</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Kilometraje de Salida</Text>
          <TextInput
            style={styles.input}
            value={kmSalida}
            onChangeText={(text) => setKmSalida(text.replace(/[^0-9]/g, ''))}
            placeholder="Ej: 125000"
            keyboardType="number-pad"
            editable={!loading}
          />
          <Text style={styles.hint}>
            Registra si hubo cambio significativo en el kilometraje
          </Text>
        </View>

        <View style={styles.formGroup}>
          <FuelSelector
            value={combustibleFraccion}
            onChange={handleCombustibleChange}
            label="Nivel de Combustible"
          />
          <Text style={styles.hint}>
            Registra especialmente si cargaste combustible
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Observaciones</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={observaciones}
            onChangeText={setObservaciones}
            placeholder="Notas sobre lo realizado en sede..."
            multiline
            numberOfLines={3}
            editable={!loading}
          />
        </View>
      </View>

      {/* Instrucciones */}
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>📋 Al Salir de Sede</Text>
        <Text style={styles.instructionsText}>
          • Podrás volver a reportar situaciones{'\n'}
          • Seguirás en tu misma jornada laboral{'\n'}
          • Puedes volver a ingresar a sede cuando lo necesites{'\n'}
          • Para finalizar el día, usa "Finalizar Jornada"
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
          onPress={handleSalidaDeSede}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>Salir de Sede</Text>
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
    backgroundColor: COLORS.success,
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
  ingresoInfo: {
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
    backgroundColor: COLORS.success + '20',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
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
    backgroundColor: COLORS.success,
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
