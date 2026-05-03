import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { turnosAPI } from '../../services/api';
import FuelSelector from '../../components/FuelSelector';

export default function RegistroCombustibleScreen() {
  const navigation = useNavigation();

  const [nivel, setNivel] = useState<string | null>(null);
  const [nivelDecimal, setNivelDecimal] = useState<number>(0);
  const [tipo, setTipo] = useState<'INICIAL' | 'ACTUAL' | 'FINAL'>('ACTUAL');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegistrar = async () => {
    if (!nivel) {
      Alert.alert('Error', 'Debes seleccionar un nivel de combustible');
      return;
    }

    try {
      setLoading(true);

      await turnosAPI.registrarCombustible({
        nivel_fraccion: nivel,
        nivel_decimal: nivelDecimal,
        tipo,
        observaciones: observaciones.trim() || undefined,
      });

      Alert.alert(
        'Registro Exitoso',
        'El nivel de combustible ha sido registrado correctamente',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      const mensaje =
        error.response?.data?.error ||
        error.message ||
        'No se pudo registrar el combustible';
      Alert.alert('Error', mensaje);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⛽ Registro de Combustible</Text>
        <Text style={styles.subtitle}>
          Registra el nivel de combustible actual de tu unidad
        </Text>
      </View>

      <View style={styles.form}>
        {/* Tipo de registro */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tipo de Registro</Text>
          <View style={styles.tipoButtons}>
            <TouchableOpacity
              style={[
                styles.tipoButton,
                tipo === 'INICIAL' && styles.tipoButtonActive,
              ]}
              onPress={() => setTipo('INICIAL')}
            >
              <Text
                style={[
                  styles.tipoButtonText,
                  tipo === 'INICIAL' && styles.tipoButtonTextActive,
                ]}
              >
                Inicial
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tipoButton,
                tipo === 'ACTUAL' && styles.tipoButtonActive,
              ]}
              onPress={() => setTipo('ACTUAL')}
            >
              <Text
                style={[
                  styles.tipoButtonText,
                  tipo === 'ACTUAL' && styles.tipoButtonTextActive,
                ]}
              >
                Actual
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tipoButton,
                tipo === 'FINAL' && styles.tipoButtonActive,
              ]}
              onPress={() => setTipo('FINAL')}
            >
              <Text
                style={[
                  styles.tipoButtonText,
                  tipo === 'FINAL' && styles.tipoButtonTextActive,
                ]}
              >
                Final
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helpText}>
            • Inicial: Al inicio del turno{'\n'}
            • Actual: Durante el turno{'\n'}
            • Final: Al finalizar el turno
          </Text>
        </View>

        {/* Nivel de combustible */}
        <View style={styles.formGroup}>
          <FuelSelector
            value={nivel}
            onChange={(fraccion, decimal) => {
              setNivel(fraccion);
              setNivelDecimal(decimal);
            }}
            label="Nivel de Combustible"
            required
          />
        </View>

        {/* Observaciones */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Observaciones (Opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={observaciones}
            onChangeText={setObservaciones}
            placeholder="Ej: Tanque casi lleno..."
            multiline
            numberOfLines={3}
            maxLength={200}
          />
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
            onPress={handleRegistrar}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Registrar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Info card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ Información</Text>
        <Text style={styles.infoText}>
          Selecciona el nivel actual del tanque de tu unidad. Este registro
          ayuda a llevar un control del combustible disponible durante la jornada.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },
  form: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 8,
    lineHeight: 18,
  },
  tipoButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  tipoButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  tipoButtonActive: {
    backgroundColor: COLORS.primary,
  },
  tipoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  tipoButtonTextActive: {
    color: COLORS.white,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
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
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  infoCard: {
    backgroundColor: COLORS.info + '20',
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
});
