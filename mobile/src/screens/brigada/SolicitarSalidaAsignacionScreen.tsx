/**
 * Pantalla para solicitar salida de una unidad asignada
 *
 * El brigada ingresa:
 * - Kilometraje actual
 * - Nivel de combustible (fracciones)
 * - Observaciones
 *
 * Al confirmar, se notifica a TODA la tripulación para autorización
 */

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
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { API_URL } from '../../constants/config';
import FuelSelector from '../../components/FuelSelector';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SolicitarSalidaAsignacionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { asignacion_id } = route.params as { asignacion_id: number };

  const [kmSalida, setKmSalida] = useState('');
  const [combustibleFraccion, setCombustibleFraccion] = useState<string | null>(null);
  const [combustibleDecimal, setCombustibleDecimal] = useState<number>(0);
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCombustibleChange = (fraccion: string, decimal: number) => {
    setCombustibleFraccion(fraccion);
    setCombustibleDecimal(decimal);
  };

  const validarFormulario = (): boolean => {
    if (!kmSalida.trim()) {
      Alert.alert('Error', 'Debes ingresar el kilometraje de salida');
      return false;
    }

    const kmNum = parseInt(kmSalida, 10);
    if (isNaN(kmNum) || kmNum < 0) {
      Alert.alert('Error', 'El kilometraje debe ser un número válido mayor o igual a 0');
      return false;
    }

    if (!combustibleFraccion) {
      Alert.alert('Error', 'Debes seleccionar el nivel de combustible');
      return false;
    }

    return true;
  };

  const handleSolicitarSalida = async () => {
    if (!validarFormulario()) return;

    Alert.alert(
      'Confirmar Solicitud',
      'Se notificará a TODA la tripulación para que autoricen la salida. Todos deben estar de acuerdo para que la unidad salga.\n\n¿Deseas continuar?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Solicitar Salida',
          style: 'default',
          onPress: enviarSolicitud
        }
      ]
    );
  };

  const enviarSolicitud = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem('token');

      const payload = {
        asignacion_programada_id: asignacion_id,
        km_salida: parseInt(kmSalida, 10),
        combustible_salida: combustibleDecimal,
        combustible_fraccion: combustibleFraccion,
        observaciones: observaciones.trim() || undefined,
      };

      const response = await axios.post(
        `${API_URL}/solicitudes-salida`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('[SOLICITAR SALIDA] Respuesta:', response.data);

      Alert.alert(
        '✅ Solicitud Enviada',
        `Tu solicitud ha sido enviada a ${response.data.tripulantes_a_autorizar} tripulantes.\n\nTienes ${response.data.tiempo_limite_minutos} minutos para que todos autoricen la salida.\n\nSi todos autorizan, la unidad saldrá automáticamente.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navegar a la pantalla de autorización para ver el estado
              navigation.reset({
                index: 0,
                routes: [
                  { name: 'BrigadaHome' as never },
                  { name: 'AutorizarSalida' as never }
                ],
              });
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('[SOLICITAR SALIDA] Error:', error);
      const mensaje = error.response?.data?.error || error.message || 'No se pudo crear la solicitud';
      Alert.alert('Error', mensaje);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Solicitar Salida</Text>
        <Text style={styles.headerSubtitle}>
          Ingresa los datos de salida de la unidad
        </Text>
      </View>

      {/* Información importante */}
      <View style={styles.infoCard}>
        <Text style={styles.infoIcon}>⚠️</Text>
        <Text style={styles.infoTitle}>Importante</Text>
        <Text style={styles.infoText}>
          Al solicitar la salida, se notificará a TODOS los tripulantes asignados.{'\n\n'}
          Cada uno tendrá 5 minutos para autorizar o rechazar.{'\n\n'}
          Si TODOS autorizan → Salida aprobada ✅{'\n'}
          Si UNO rechaza → Solicitud rechazada ❌{'\n'}
          Si expira el tiempo → Solicitud expirada ⏱️
        </Text>
      </View>

      {/* Formulario */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Datos de Salida</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Kilometraje de Salida <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={kmSalida}
            onChangeText={(text) => setKmSalida(text.replace(/[^0-9]/g, ''))}
            placeholder="Ej: 125000"
            keyboardType="number-pad"
            editable={!loading}
          />
          <Text style={styles.hint}>Kilometraje actual del odómetro de la unidad</Text>
        </View>

        <View style={styles.formGroup}>
          <FuelSelector
            value={combustibleFraccion}
            onChange={handleCombustibleChange}
            label="Nivel de Combustible"
            required
          />
          <Text style={styles.hint}>Nivel actual de combustible en el tanque</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Observaciones (Opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={observaciones}
            onChangeText={setObservaciones}
            placeholder="Cualquier observación sobre el estado de la unidad, novedades, etc..."
            multiline
            numberOfLines={4}
            editable={!loading}
          />
          <Text style={styles.hint}>
            Describe cualquier novedad o situación especial que deba conocer la tripulación
          </Text>
        </View>
      </View>

      {/* Checklist */}
      <View style={styles.checklistCard}>
        <Text style={styles.checklistTitle}>✓ Verifica antes de solicitar</Text>
        <View style={styles.checklistItem}>
          <Text style={styles.checklistBullet}>•</Text>
          <Text style={styles.checklistText}>
            El kilometraje es el correcto y coincide con el odómetro
          </Text>
        </View>
        <View style={styles.checklistItem}>
          <Text style={styles.checklistBullet}>•</Text>
          <Text style={styles.checklistText}>
            El nivel de combustible es el adecuado para el recorrido
          </Text>
        </View>
        <View style={styles.checklistItem}>
          <Text style={styles.checklistBullet}>•</Text>
          <Text style={styles.checklistText}>
            La unidad está en condiciones mecánicas óptimas
          </Text>
        </View>
        <View style={styles.checklistItem}>
          <Text style={styles.checklistBullet}>•</Text>
          <Text style={styles.checklistText}>
            Toda la tripulación está lista para salir
          </Text>
        </View>
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
          style={[styles.button, styles.submitButton]}
          onPress={handleSolicitarSalida}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>🚀 Solicitar Salida</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
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
  infoCard: {
    backgroundColor: COLORS.warning + '20',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  infoIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  card: {
    backgroundColor: COLORS.white,
    margin: 16,
    marginTop: 0,
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
    lineHeight: 16,
  },
  checklistCard: {
    backgroundColor: COLORS.success + '10',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  checklistTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  checklistBullet: {
    fontSize: 16,
    color: COLORS.success,
    marginRight: 8,
    fontWeight: 'bold',
  },
  checklistText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
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
  submitButton: {
    backgroundColor: COLORS.success,
  },
  cancelButtonText: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
