import React, { useState, useEffect } from 'react';
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
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import FuelSelector from '../../components/FuelSelector';

export default function EditarSalidaScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { refreshSalidaActiva } = useAuthStore();

  // Datos de la salida a editar
  const salidaData = (route.params as any)?.salidaData;

  const [kmSalida, setKmSalida] = useState('');
  const [combustibleFraccion, setCombustibleFraccion] = useState<string | null>(null);
  const [combustibleDecimal, setCombustibleDecimal] = useState<number>(0);
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (salidaData) {
      // Cargar datos existentes
      const kmValue = salidaData.km_inicial || salidaData.km_salida;
      setKmSalida(kmValue ? Math.round(kmValue).toString() : '');
      setObservaciones(salidaData.observaciones_salida || '');

      // Convertir decimal a fracción
      const combustible = salidaData.combustible_inicial || salidaData.combustible_salida;
      if (combustible !== null && combustible !== undefined) {
        setCombustibleDecimal(combustible);
        if (combustible >= 1) setCombustibleFraccion('LLENO');
        else if (combustible >= 0.75) setCombustibleFraccion('3/4');
        else if (combustible >= 0.5) setCombustibleFraccion('1/2');
        else if (combustible >= 0.25) setCombustibleFraccion('1/4');
        else setCombustibleFraccion('VACIO');
      }
    }
  }, [salidaData]);

  const handleCombustibleChange = (fraccion: string, decimal: number) => {
    setCombustibleFraccion(fraccion);
    setCombustibleDecimal(decimal);
  };

  const handleGuardar = async () => {
    if (!kmSalida.trim()) {
      Alert.alert('Error', 'Debes ingresar el kilometraje');
      return;
    }

    if (!combustibleFraccion) {
      Alert.alert('Error', 'Debes seleccionar el nivel de combustible');
      return;
    }

    const kmNum = parseInt(kmSalida, 10);
    if (isNaN(kmNum) || kmNum < 0) {
      Alert.alert('Error', 'El kilometraje debe ser un número válido');
      return;
    }

    try {
      setLoading(true);

      await api.patch('/salidas/editar-datos-salida', {
        km_inicial: kmNum,
        combustible_inicial_fraccion: combustibleFraccion,
        observaciones_salida: observaciones.trim() || undefined,
      });

      await refreshSalidaActiva();
      Alert.alert('Éxito', 'Datos de salida actualizados correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Error al editar salida:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo actualizar la salida'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Editar Salida de Unidad</Text>
      <Text style={styles.subtitle}>
        Unidad: {salidaData?.unidad_codigo || '-'}
      </Text>

      {/* Kilometraje */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Kilometraje Inicial *</Text>
        <TextInput
          style={styles.input}
          value={kmSalida}
          onChangeText={(text) => setKmSalida(text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          placeholder="Ej: 125000"
          placeholderTextColor={COLORS.text.disabled}
        />
      </View>

      {/* Combustible */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nivel de Combustible *</Text>
        <FuelSelector
          value={combustibleFraccion}
          onChange={handleCombustibleChange}
        />
      </View>

      {/* Observaciones */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Observaciones (opcional)</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={observaciones}
          onChangeText={setObservaciones}
          multiline
          numberOfLines={3}
          placeholder="Observaciones adicionales..."
          placeholderTextColor={COLORS.text.disabled}
        />
      </View>

      {/* Botones */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonCancel]}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.buttonCancelText}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSave]}
          onPress={handleGuardar}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Text style={styles.buttonSaveText}>Guardar Cambios</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  inputMultiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCancel: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonSave: {
    backgroundColor: COLORS.primary,
  },
  buttonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  buttonSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
