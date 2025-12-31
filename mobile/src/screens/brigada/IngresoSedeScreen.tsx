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
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../constants/colors';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import axios from 'axios';
import { API_URL } from '../../constants/config';
import FuelSelector from '../../components/FuelSelector';
import api from '../../services/api';

type IngresoSedeScreenRouteProp = RouteProp<{
  IngresoSede: {
    editMode?: boolean;
    ingresoData?: any;
  };
}, 'IngresoSede'>;

// Motivos de ingreso (sin FINALIZACION_JORNADA - solo motivos temporales)
const MOTIVOS_INGRESO = [
  { value: 'COMBUSTIBLE', label: 'Combustible', icon: '⛽', color: '#f59e0b' },
  { value: 'COMISION', label: 'Comisión', icon: '📋', color: '#3b82f6' },
  { value: 'APOYO', label: 'Apoyo', icon: '🤝', color: '#8b5cf6' },
  { value: 'ALMUERZO', label: 'Almuerzo', icon: '🍽️', color: '#10b981' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento', icon: '🔧', color: '#6b7280' },
  { value: 'FINALIZACION_JORNADA', label: 'Finalizar Jornada', icon: '🏁', color: '#dc2626', esFinal: true },
];

export default function IngresoSedeScreen() {
  const navigation = useNavigation();
  const route = useRoute<IngresoSedeScreenRouteProp>();
  const { editMode, ingresoData } = route.params || {};

  const { salidaActiva, ingresoActivo, miSede, refreshEstadoBrigada } = useAuthStore();

  // Verificar si ya hay ingreso activo al montar (solo en modo creación)
  useEffect(() => {
    if (editMode) return; // En modo edición no verificar

    if (ingresoActivo) {
      Alert.alert(
        'Ya en Sede',
        'Ya tienes un ingreso activo. Debes salir de sede antes de registrar otro ingreso.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [editMode]);

  // Verificar si hay salida activa (solo en modo creación)
  useEffect(() => {
    if (editMode) return; // En modo edición no verificar

    if (!salidaActiva) {
      Alert.alert(
        'Sin Salida Activa',
        'Debes tener una salida activa para poder ingresar a sede.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [editMode]);

  const [motivoIngreso, setMotivoIngreso] = useState('');
  const [kmIngreso, setKmIngreso] = useState('');
  const [combustibleFraccion, setCombustibleFraccion] = useState<string | null>(null);
  const [combustibleDecimal, setCombustibleDecimal] = useState<number>(0);
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);

  // Cargar datos en modo edición
  useEffect(() => {
    if (editMode && ingresoData) {
      // Pre-llenar formulario con datos existentes
      setMotivoIngreso(ingresoData.tipo_ingreso || '');
      setKmIngreso(ingresoData.km_ingreso ? Math.round(ingresoData.km_ingreso).toString() : '');
      setObservaciones(ingresoData.observaciones_ingreso || '');

      // Convertir decimal a fracción para el selector
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
  }, [editMode, ingresoData]);

  const handleCombustibleChange = (fraccion: string, decimal: number) => {
    setCombustibleFraccion(fraccion);
    setCombustibleDecimal(decimal);
  };

  const motivoSeleccionado = MOTIVOS_INGRESO.find(m => m.value === motivoIngreso);
  const esFinalizacion = motivoSeleccionado?.esFinal === true;

  const handleRegistrarIngreso = async () => {
    // En modo creación, validar motivo
    if (!editMode && !motivoIngreso) {
      Alert.alert('Error', 'Debes seleccionar el motivo de ingreso');
      return;
    }

    // En modo creación, validar sede
    if (!editMode && !miSede?.mi_sede_id) {
      Alert.alert('Error', 'No se ha identificado tu sede asignada. Contacta a soporte.');
      return;
    }

    // Si es finalización de jornada, km y combustible son obligatorios (solo en creación)
    if (!editMode && esFinalizacion) {
      if (!kmIngreso.trim()) {
        Alert.alert('Error', 'Para finalizar la jornada debes ingresar el kilometraje final');
        return;
      }
      if (!combustibleFraccion) {
        Alert.alert('Error', 'Para finalizar la jornada debes ingresar el nivel de combustible');
        return;
      }
    }

    // Validar km si se ingresó
    if (kmIngreso.trim()) {
      const kmNum = parseInt(kmIngreso, 10);
      if (isNaN(kmNum) || kmNum < 0) {
        Alert.alert('Error', 'El kilometraje debe ser un número válido');
        return;
      }
    }

    if (editMode) {
      // MODO EDICIÓN: PATCH
      ejecutarEdicion();
    } else {
      // MODO CREACIÓN: POST
      const data: any = {
        tipo_ingreso: motivoIngreso,
        sede_id: miSede.mi_sede_id,
      };

      if (kmIngreso.trim()) {
        data.km_ingreso = parseInt(kmIngreso, 10);
      }

      if (combustibleFraccion) {
        data.combustible_ingreso = combustibleDecimal;
        data.combustible_fraccion = combustibleFraccion;
      }

      if (observaciones.trim()) {
        data.observaciones = observaciones.trim();
      }

      // Confirmación especial para finalización de jornada
      if (esFinalizacion) {
        Alert.alert(
          'Ingreso por Finalización',
          'La unidad quedará en sede. Para completar la finalización, deberás pulsar "Finalizar Jornada" en la pantalla principal.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Continuar', onPress: () => ejecutarIngreso(data) }
          ]
        );
      } else {
        ejecutarIngreso(data);
      }
    }
  };

  const ejecutarEdicion = async () => {
    if (!ingresoData?.id) {
      Alert.alert('Error', 'No se encontró el ID del ingreso');
      return;
    }

    try {
      setLoading(true);

      const data: any = {};
      if (kmIngreso.trim()) data.km_ingreso = parseInt(kmIngreso, 10);
      if (combustibleFraccion) data.combustible_fraccion = combustibleFraccion;
      if (observaciones !== undefined) data.observaciones_ingreso = observaciones.trim();

      if (Object.keys(data).length === 0) {
        Alert.alert('Error', 'Debes modificar al menos un campo');
        setLoading(false);
        return;
      }

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

  const ejecutarIngreso = async (data: any) => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/ingresos/registrar`, data);
      await refreshEstadoBrigada();

      const motivoLabel = MOTIVOS_INGRESO.find(m => m.value === motivoIngreso)?.label || motivoIngreso;

      if (esFinalizacion) {
        Alert.alert(
          'Ingreso Registrado',
          'La unidad está ahora en sede. Ve a la pantalla principal y pulsa "Finalizar Jornada" para completar el cierre.',
          [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'BrigadaHome' as never }] }) }]
        );
      } else {
        Alert.alert(
          'Ingreso Registrado',
          `Has ingresado a sede por: ${motivoLabel}.\n\nCuando termines, registra la salida de sede para continuar patrullando.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error: any) {
      console.error('[INGRESO SEDE] Error:', error);
      const mensaje = error.response?.data?.error || error.message || 'No se pudo registrar el ingreso';
      Alert.alert('Error', mensaje);
    } finally {
      setLoading(false);
    }
  };

  // Solo mostrar error de salida activa en modo creación
  if (!editMode && !salidaActiva) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Sin Salida Activa</Text>
          <Text style={styles.errorText}>
            Debes iniciar una salida antes de poder ingresar a sede.
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
      <View style={[styles.header, editMode && { backgroundColor: COLORS.warning }]}>
        <Text style={styles.headerTitle}>
          {editMode ? 'Editar Ingreso' : 'Ingreso a Sede'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {editMode
            ? 'Modifica los datos del ingreso a sede'
            : 'Registra tu ingreso temporal a sede'
          }
        </Text>
      </View>

      {(miSede || editMode) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {editMode ? 'Datos del Ingreso' : 'Tu Sede'}
          </Text>
          <View style={styles.sedeInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sede:</Text>
              <Text style={styles.infoValue}>
                {editMode ? (ingresoData?.sede_nombre || '-') : miSede?.mi_sede_nombre}
              </Text>
            </View>
            {editMode && ingresoData?.tipo_ingreso && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Motivo:</Text>
                <Text style={styles.infoValue}>
                  {MOTIVOS_INGRESO.find(m => m.value === ingresoData.tipo_ingreso)?.label || ingresoData.tipo_ingreso}
                </Text>
              </View>
            )}
            {!editMode && miSede?.mi_sede_codigo && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Código:</Text>
                <Text style={styles.infoValue}>{miSede.mi_sede_codigo}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Motivo del ingreso - solo mostrar en modo creación */}
      {!editMode && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Motivo del Ingreso <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.motivosGrid}>
            {MOTIVOS_INGRESO.map((motivo) => {
              const isSelected = motivoIngreso === motivo.value;
              const isFinal = motivo.esFinal === true;
              return (
                <TouchableOpacity
                  key={motivo.value}
                  style={[
                    styles.motivoButton,
                    { borderColor: isSelected ? motivo.color : COLORS.border },
                    isSelected && {
                      backgroundColor: motivo.color + '15',
                      borderWidth: 3,
                      borderColor: motivo.color,
                    },
                    isFinal && styles.motivoButtonFinal,
                    isFinal && isSelected && { backgroundColor: motivo.color + '25' },
                  ]}
                  onPress={() => setMotivoIngreso(motivo.value)}
                  disabled={loading}
                >
                  <Text style={[styles.motivoIcon, isFinal && { fontSize: 32 }]}>{motivo.icon}</Text>
                  <Text style={[
                    styles.motivoLabel,
                    isSelected && { color: motivo.color, fontWeight: '700' },
                    isFinal && { fontWeight: '600' },
                  ]}>
                    {motivo.label}
                  </Text>
                  {isSelected && (
                    <View style={[styles.selectedIndicator, { backgroundColor: motivo.color }]}>
                      <Text style={styles.selectedIndicatorText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Aviso especial si seleccionó Finalizar Jornada - solo en modo creación */}
      {!editMode && esFinalizacion && (
        <View style={styles.warningCard}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningTitle}>Finalización de Jornada</Text>
          <Text style={styles.warningText}>
            Al finalizar tu jornada:{'\n'}
            • La salida se marcará como FINALIZADA{'\n'}
            • La unidad quedará libre{'\n'}
            • Debes registrar km y combustible final
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Datos del Ingreso {esFinalizacion ? <Text style={styles.required}>(Obligatorios)</Text> : '(Opcionales)'}
        </Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Kilometraje Final {esFinalizacion && <Text style={styles.required}>*</Text>}
          </Text>
          <TextInput
            style={styles.input}
            value={kmIngreso}
            onChangeText={(text) => setKmIngreso(text.replace(/[^0-9]/g, ''))}
            placeholder="Ej: 125000"
            keyboardType="number-pad"
            editable={!loading}
          />
        </View>

        <View style={styles.formGroup}>
          <FuelSelector
            value={combustibleFraccion}
            onChange={handleCombustibleChange}
            label={esFinalizacion ? "Nivel de Combustible Final *" : "Nivel de Combustible"}
            required={esFinalizacion}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Observaciones</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={observaciones}
            onChangeText={setObservaciones}
            placeholder="Detalles adicionales..."
            multiline
            numberOfLines={3}
            editable={!loading}
          />
        </View>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.confirmButton, editMode && { backgroundColor: COLORS.warning }]}
          onPress={handleRegistrarIngreso}
          disabled={loading || (!editMode && !motivoIngreso)}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>
              {editMode ? 'Guardar Cambios' : 'Registrar Ingreso'}
            </Text>
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
    backgroundColor: COLORS.primary,
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
  required: {
    color: COLORS.danger,
  },
  motivosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  motivoButton: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minHeight: 90,
    justifyContent: 'center',
  },
  motivoButtonSelected: {
    backgroundColor: COLORS.background,
    borderWidth: 3,
  },
  motivoIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  motivoLabel: {
    fontSize: 13,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  motivoButtonFinal: {
    width: '100%',
    minHeight: 100,
    borderStyle: 'dashed',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicatorText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  warningCard: {
    backgroundColor: '#fef3c7',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  warningIcon: {
    fontSize: 28,
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
    backgroundColor: COLORS.primary,
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
