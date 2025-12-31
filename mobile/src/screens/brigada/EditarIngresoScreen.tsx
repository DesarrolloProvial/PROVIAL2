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
import api from '../../services/api';
import FuelSelector from '../../components/FuelSelector';

export default function EditarIngresoScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  // Datos del ingreso a editar
  const ingresoData = (route.params as any)?.ingresoData;

  const [kmIngreso, setKmIngreso] = useState('');
  const [combustibleFraccion, setCombustibleFraccion] = useState<string | null>(null);
  const [combustibleDecimal, setCombustibleDecimal] = useState<number>(0);
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ingresoData) {
      // Cargar datos existentes
      setKmIngreso(ingresoData.km_ingreso ? Math.round(ingresoData.km_ingreso).toString() : '');
      setObservaciones(ingresoData.observaciones_ingreso || '');

      // Convertir decimal a fracción
      const combustible = ingresoData.combustible_ingreso;
      if (combustible !== null && combustible !== undefined) {
        setCombustibleDecimal(combustible);
        if (combustible >= 1) setCombustibleFraccion('LLENO');
        else if (combustible >= 0.75) setCombustibleFraccion('3/4');
        else if (combustible >= 0.5) setCombustibleFraccion('1/2');
        else if (combustible >= 0.25) setCombustibleFraccion('1/4');
        else setCombustibleFraccion('VACIO');
      }
    }
  }, [ingresoData]);

  const handleCombustibleChange = (fraccion: string, decimal: number) => {
    setCombustibleFraccion(fraccion);
    setCombustibleDecimal(decimal);
  };

  const handleGuardar = async () => {
    if (!ingresoData?.id) {
      Alert.alert('Error', 'No se encontró el ID del ingreso');
      return;
    }

    const data: any = {};

    if (kmIngreso.trim()) {
      const kmNum = parseInt(kmIngreso, 10);
      if (isNaN(kmNum) || kmNum < 0) {
        Alert.alert('Error', 'El kilometraje debe ser un número válido');
        return;
      }
      data.km_ingreso = kmNum;
    }

    if (combustibleFraccion) {
      data.combustible_fraccion = combustibleFraccion;
    }

    if (observaciones !== undefined) {
      data.observaciones_ingreso = observaciones.trim();
    }

    if (Object.keys(data).length === 0) {
      Alert.alert('Error', 'Debes modificar al menos un campo');
      return;
    }

    try {
      setLoading(true);

      await api.patch(`/ingresos/${ingresoData.id}`, data);

      Alert.alert('Éxito', 'Ingreso actualizado correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Error al editar ingreso:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo actualizar el ingreso'
      );
    } finally {
      setLoading(false);
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: { [key: string]: string } = {
      'COMBUSTIBLE': 'Combustible',
      'ALMUERZO': 'Almuerzo',
      'MANTENIMIENTO': 'Mantenimiento',
      'COMISION': 'Comisión',
      'APOYO': 'Apoyo',
      'FINALIZACION_JORNADA': 'Finalización de Jornada',
      'FINALIZAR_JORNADA': 'Finalización de Jornada',
      'FINALIZACION': 'Finalización',
    };
    return labels[tipo] || tipo?.replace(/_/g, ' ') || '-';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Editar Ingreso a Sede</Text>
      <Text style={styles.subtitle}>
        {ingresoData?.sede_nombre || 'Sede'} - {getTipoLabel(ingresoData?.tipo_ingreso)}
      </Text>

      {/* Kilometraje */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Kilometraje</Text>
        <TextInput
          style={styles.input}
          value={kmIngreso}
          onChangeText={(text) => setKmIngreso(text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          placeholder="Ej: 125000"
          placeholderTextColor={COLORS.text.disabled}
        />
      </View>

      {/* Combustible */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nivel de Combustible</Text>
        <FuelSelector
          value={combustibleFraccion}
          onChange={handleCombustibleChange}
        />
      </View>

      {/* Observaciones */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Observaciones</Text>
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
