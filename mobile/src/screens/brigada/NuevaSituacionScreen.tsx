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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useSituacionesStore } from '../../store/situacionesStore';
import { useTestMode } from '../../context/TestModeContext';
import { COLORS } from '../../constants/colors';
import {
  TipoSituacion,
  SITUACIONES_CONFIG,
  SENTIDOS,
} from '../../constants/situacionTypes';
import FuelSelector from '../../components/FuelSelector';
import RutaSelector from '../../components/RutaSelector';
import * as Location from 'expo-location';
import api from '../../services/api';

type NuevaSituacionRouteProp = RouteProp<{
  NuevaSituacion: {
    editMode?: boolean;
    situacionId?: number;
    situacionData?: any;
  };
}, 'NuevaSituacion'>;

export default function NuevaSituacionScreen() {
  const navigation = useNavigation();
  const route = useRoute<NuevaSituacionRouteProp>();
  const { salidaActiva } = useAuthStore();
  const { createSituacion, fetchMisSituacionesHoy, isLoading } = useSituacionesStore();
  const { testModeEnabled } = useTestMode();

  // Parámetros de edición
  const editMode = route.params?.editMode || false;
  const situacionId = route.params?.situacionId;
  const situacionData = route.params?.situacionData;

  // Estado del formulario
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoSituacion | null>(null);
  const [km, setKm] = useState('');
  const [sentido, setSentido] = useState('');
  const [combustibleFraccion, setCombustibleFraccion] = useState<string | null>(null);
  const [combustibleDecimal, setCombustibleDecimal] = useState<number>(0);
  const [kilometraje, setKilometraje] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Coordenadas GPS
  const [latitud, setLatitud] = useState('14.6349'); // Guatemala City por defecto
  const [longitud, setLongitud] = useState('-90.5069');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Obtener ubicacion GPS automaticamente si NO esta en modo pruebas
  useEffect(() => {
    if (!testModeEnabled && !editMode) {
      obtenerUbicacionGPS();
    }
  }, [testModeEnabled, editMode]);

  // Pre-llenar formulario en modo edición
  useEffect(() => {
    if (editMode && situacionData) {
      console.log('[NuevaSituacion] Modo edición, cargando datos:', situacionData);

      // Tipo de situación
      if (situacionData.tipo_situacion) {
        setTipoSeleccionado(situacionData.tipo_situacion as TipoSituacion);
      }

      // Kilómetro
      if (situacionData.km !== null && situacionData.km !== undefined) {
        setKm(situacionData.km.toString());
      }

      // Sentido
      if (situacionData.sentido) {
        setSentido(situacionData.sentido);
      }

      // Coordenadas
      if (situacionData.latitud) {
        setLatitud(situacionData.latitud.toString());
      }
      if (situacionData.longitud) {
        setLongitud(situacionData.longitud.toString());
      }

      // Combustible
      if (situacionData.combustible !== null && situacionData.combustible !== undefined) {
        setCombustibleDecimal(situacionData.combustible);
        // Convertir decimal a fracción
        if (situacionData.combustible >= 1) {
          setCombustibleFraccion('LLENO');
        } else if (situacionData.combustible >= 0.75) {
          setCombustibleFraccion('3/4');
        } else if (situacionData.combustible >= 0.5) {
          setCombustibleFraccion('1/2');
        } else if (situacionData.combustible >= 0.25) {
          setCombustibleFraccion('1/4');
        } else {
          setCombustibleFraccion('VACIO');
        }
      }

      // Kilometraje de unidad
      if (situacionData.kilometraje_unidad) {
        setKilometraje(situacionData.kilometraje_unidad.toString());
      }

      // Observaciones
      if (situacionData.observaciones) {
        setObservaciones(situacionData.observaciones);
      }

      // Ruta
      if (situacionData.ruta_id) {
        setRutaSeleccionada(situacionData.ruta_id);
      }
    }
  }, [editMode, situacionData]);

  const obtenerUbicacionGPS = async () => {
    try {
      setGpsLoading(true);
      setGpsError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsError('Permiso de ubicacion denegado');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLatitud(location.coords.latitude.toFixed(6));
      setLongitud(location.coords.longitude.toFixed(6));
    } catch (error: any) {
      console.error('[GPS] Error obteniendo ubicacion:', error);
      setGpsError('No se pudo obtener ubicacion GPS');
    } finally {
      setGpsLoading(false);
    }
  };

  // Ruta (se puede cambiar solo en SALIDA_SEDE o CAMBIO_RUTA)
  const [rutaSeleccionada, setRutaSeleccionada] = useState<number | null>(null);

  // Handler para el selector de combustible
  const handleCombustibleChange = (fraccion: string, decimal: number) => {
    setCombustibleFraccion(fraccion);
    setCombustibleDecimal(decimal);
  };

  const handleCrearSituacion = async () => {
    if (!tipoSeleccionado) {
      Alert.alert('Error', 'Debes seleccionar un tipo de situación');
      return;
    }

    // En modo edición no necesitamos salidaActiva
    if (!editMode && !salidaActiva) {
      Alert.alert('Error', 'No tienes una salida activa. Debes iniciar salida primero.');
      return;
    }

    const config = SITUACIONES_CONFIG[tipoSeleccionado];

    // Validaciones según el tipo (solo para creación)
    if (!editMode) {
      if (tipoSeleccionado === 'SALIDA_SEDE' && !rutaSeleccionada) {
        Alert.alert('Error', 'Debes seleccionar una ruta para salir de sede');
        return;
      }

      if (config.requiereCombustible && !combustibleFraccion) {
        Alert.alert('Error', 'El nivel de combustible es requerido');
        return;
      }

      if (config.requiereKilometraje && !kilometraje) {
        Alert.alert('Error', 'El kilometraje de la unidad es requerido');
        return;
      }

      if (config.requiereRuta && !km) {
        Alert.alert('Error', 'El kilómetro de ubicación es requerido');
        return;
      }

      // Determinar qué ruta usar
      let rutaFinal = rutaSeleccionada; // Para SALIDA_SEDE o CAMBIO_RUTA

      // Si requiere ruta y no es SALIDA_SEDE/CAMBIO_RUTA, validar que existe ruta en salida activa
      if (config.requiereRuta && !['SALIDA_SEDE', 'CAMBIO_RUTA'].includes(tipoSeleccionado)) {
        if (!salidaActiva?.ruta_codigo) {
          Alert.alert(
            'Error',
            'No tienes una ruta asignada en tu salida. Realiza un "Cambio de Ruta" desde el menú principal primero.'
          );
          return;
        }
      }
    }

    try {
      if (editMode && situacionId) {
        // Modo edición - PATCH
        const data = {
          km: km ? parseFloat(km) : undefined,
          sentido: sentido || undefined,
          latitud: latitud ? parseFloat(latitud) : undefined,
          longitud: longitud ? parseFloat(longitud) : undefined,
          combustible: combustibleDecimal || undefined,
          kilometraje_unidad: kilometraje ? parseInt(kilometraje, 10) : undefined,
          observaciones: observaciones || undefined,
        };

        await api.patch(`/situaciones/${situacionId}`, data);
        await fetchMisSituacionesHoy();

        Alert.alert('Éxito', 'Situación actualizada correctamente', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        // Modo creación - POST
        const data = {
          tipo_situacion: tipoSeleccionado,
          unidad_id: salidaActiva!.unidad_id,
          salida_unidad_id: salidaActiva!.salida_id,
          ruta_id: rutaSeleccionada || undefined,
          km: km ? parseFloat(km) : undefined,
          sentido: sentido || undefined,
          latitud: latitud ? parseFloat(latitud) : undefined,
          longitud: longitud ? parseFloat(longitud) : undefined,
          combustible: combustibleDecimal || undefined,
          combustible_fraccion: combustibleFraccion || undefined,
          kilometraje_unidad: kilometraje ? parseInt(kilometraje, 10) : undefined,
          observaciones: observaciones || undefined,
          ubicacion_manual: testModeEnabled,
        };

        await createSituacion(data);

        Alert.alert('Éxito', 'Situación creada correctamente', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error: any) {
      const mensaje = editMode ? 'No se pudo actualizar la situación' : 'No se pudo crear la situación';
      Alert.alert('Error', error.response?.data?.error || error.message || mensaje);
    }
  };

  const renderTipoSelector = () => {
    // En modo edición, no permitir cambiar el tipo
    if (editMode && tipoSeleccionado) {
      const config = SITUACIONES_CONFIG[tipoSeleccionado];
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Situación</Text>
          <View style={[styles.tipoButton, { backgroundColor: config.color, borderColor: config.color }]}>
            <Text style={styles.tipoButtonTextSelected}>{config.label}</Text>
          </View>
          <Text style={styles.helperText}>El tipo de situación no se puede cambiar en modo edición</Text>
        </View>
      );
    }

    // Filtrar los tipos que ya tienen su propia pantalla en el home
    const tipos = (Object.keys(SITUACIONES_CONFIG) as TipoSituacion[]).filter(
      (t) => !['SALIDA_SEDE', 'CAMBIO_RUTA', 'ASISTENCIA_VEHICULAR', 'INCIDENTE'].includes(t)
    );

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tipo de Situación</Text>
        <View style={styles.tiposContainer}>
          {tipos.map((tipo) => {
            const config = SITUACIONES_CONFIG[tipo];
            const isSelected = tipoSeleccionado === tipo;

            return (
              <TouchableOpacity
                key={tipo}
                style={[
                  styles.tipoButton,
                  isSelected && {
                    backgroundColor: config.color,
                    borderColor: config.color,
                  },
                ]}
                onPress={() => setTipoSeleccionado(tipo)}
              >
                <Text
                  style={[
                    styles.tipoButtonText,
                    isSelected && styles.tipoButtonTextSelected,
                  ]}
                >
                  {config.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderUbicacionFields = () => {
    if (!tipoSeleccionado) return null;

    const config = SITUACIONES_CONFIG[tipoSeleccionado];
    const puedeSeleccionarRuta = ['SALIDA_SEDE', 'CAMBIO_RUTA'].includes(tipoSeleccionado);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ubicación</Text>

        {/* Selector de ruta para SALIDA_SEDE y CAMBIO_RUTA */}
        {puedeSeleccionarRuta && (
          <RutaSelector
            value={rutaSeleccionada || undefined}
            onChange={(rutaId) => setRutaSeleccionada(rutaId)}
            label="Seleccionar Ruta"
            required={tipoSeleccionado === 'SALIDA_SEDE'}
          />
        )}

        {/* Mostrar ruta asignada si no puede cambiarla */}
        {!puedeSeleccionarRuta && salidaActiva?.ruta_codigo && (
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Ruta Asignada:</Text>
            <Text style={styles.infoValue}>{salidaActiva.ruta_codigo}</Text>
          </View>
        )}

        <Text style={styles.label}>Kilómetro{config.requiereRuta && ' *'}</Text>
        <TextInput
          style={styles.input}
          value={km}
          onChangeText={setKm}
          placeholder="Ej: 125.5"
          keyboardType="decimal-pad"
          placeholderTextColor={COLORS.text.disabled}
        />

        <Text style={styles.label}>Sentido</Text>
        <View style={styles.sentidosContainer}>
          {SENTIDOS.map((s) => (
            <TouchableOpacity
              key={s.value}
              style={[
                styles.sentidoButton,
                sentido === s.value && styles.sentidoButtonSelected,
              ]}
              onPress={() => setSentido(s.value)}
            >
              <Text
                style={[
                  styles.sentidoButtonText,
                  sentido === s.value && styles.sentidoButtonTextSelected,
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Coordenadas - Manual solo en modo pruebas, automatico en produccion */}
        {testModeEnabled ? (
          <>
            <Text style={styles.label}>Coordenadas GPS (Modo Pruebas - Manual)</Text>
            <View style={styles.coordsContainer}>
              <View style={styles.coordField}>
                <Text style={styles.coordLabel}>Latitud:</Text>
                <TextInput
                  style={styles.coordInput}
                  value={latitud}
                  onChangeText={setLatitud}
                  placeholder="14.6349"
                  keyboardType="decimal-pad"
                  placeholderTextColor={COLORS.text.disabled}
                />
              </View>
              <View style={styles.coordField}>
                <Text style={styles.coordLabel}>Longitud:</Text>
                <TextInput
                  style={styles.coordInput}
                  value={longitud}
                  onChangeText={setLongitud}
                  placeholder="-90.5069"
                  keyboardType="decimal-pad"
                  placeholderTextColor={COLORS.text.disabled}
                />
              </View>
            </View>
          </>
        ) : (
          <View style={styles.gpsStatusContainer}>
            <Text style={styles.label}>Ubicacion GPS</Text>
            {gpsLoading ? (
              <View style={styles.gpsLoadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.gpsLoadingText}>Obteniendo ubicacion...</Text>
              </View>
            ) : gpsError ? (
              <View style={styles.gpsErrorContainer}>
                <Text style={styles.gpsErrorText}>{gpsError}</Text>
                <TouchableOpacity onPress={obtenerUbicacionGPS} style={styles.gpsRetryButton}>
                  <Text style={styles.gpsRetryText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.gpsSuccessContainer}>
                <Text style={styles.gpsSuccessText}>📍 {latitud}, {longitud}</Text>
                <TouchableOpacity onPress={obtenerUbicacionGPS} style={styles.gpsRefreshButton}>
                  <Text style={styles.gpsRefreshText}>Actualizar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderCamposAdicionales = () => {
    if (!tipoSeleccionado) return null;

    const config = SITUACIONES_CONFIG[tipoSeleccionado];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información de la Unidad</Text>

        {/* Combustible siempre disponible */}
        <FuelSelector
          value={combustibleFraccion}
          onChange={handleCombustibleChange}
          label={config.requiereCombustible ? 'Nivel de Combustible *' : 'Nivel de Combustible (Opcional)'}
          required={config.requiereCombustible}
        />

        {config.requiereKilometraje && (
          <>
            <Text style={styles.label}>Kilometraje de Unidad *</Text>
            <TextInput
              style={styles.input}
              value={kilometraje}
              onChangeText={setKilometraje}
              placeholder="Ej: 145000"
              keyboardType="number-pad"
              placeholderTextColor={COLORS.text.disabled}
            />
          </>
        )}

        {!config.requiereCombustible && (
          <Text style={styles.helperText}>
            💡 Tip: Reportar el combustible ayuda a analizar el rendimiento de la unidad
          </Text>
        )}
      </View>
    );
  };

  const renderDescripcionFields = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detalles</Text>

        <Text style={styles.label}>Observaciones</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={observaciones}
          onChangeText={setObservaciones}
          placeholder="Observaciones de la situación"
          multiline
          numberOfLines={4}
          placeholderTextColor={COLORS.text.disabled}
        />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Información de salida activa o modo edición */}
        {editMode ? (
          <View style={[styles.headerCard, { backgroundColor: COLORS.warning }]}>
            <Text style={styles.headerTitle}>✏️ Modo Edición</Text>
            <Text style={styles.headerSubtitle}>
              Editando situación {situacionData?.numero_situacion || `#${situacionId}`}
            </Text>
          </View>
        ) : salidaActiva ? (
          <View style={styles.headerCard}>
            <Text style={styles.headerTitle}>Unidad: {salidaActiva.unidad_codigo}</Text>
            {salidaActiva.ruta_codigo && (
              <Text style={styles.headerSubtitle}>
                Ruta: {salidaActiva.ruta_codigo}
              </Text>
            )}
          </View>
        ) : null}

        {/* Tipo de situación */}
        {renderTipoSelector()}

        {/* Campos según el tipo seleccionado */}
        {tipoSeleccionado && (
          <>
            {renderUbicacionFields()}
            {renderCamposAdicionales()}
            {renderDescripcionFields()}
          </>
        )}
      </ScrollView>

      {/* Botón de crear/actualizar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.createButton,
            (!tipoSeleccionado || isLoading) && styles.buttonDisabled,
            editMode && { backgroundColor: COLORS.warning }
          ]}
          onPress={handleCrearSituacion}
          disabled={!tipoSeleccionado || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>
              {editMode ? 'Actualizar Situación' : 'Crear Situación'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerCard: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 4,
  },
  section: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  tiposContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tipoButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  tipoButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  tipoButtonTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.background,
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
  infoBox: {
    backgroundColor: COLORS.info + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sentidosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sentidoButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sentidoButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sentidoButtonText: {
    fontSize: 13,
    color: COLORS.text.primary,
  },
  sentidoButtonTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
  },
  footer: {
    backgroundColor: COLORS.white,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  coordsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  coordField: {
    flex: 1,
  },
  coordLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginBottom: 6,
  },
  coordInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  gpsStatusContainer: {
    marginTop: 12,
  },
  gpsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.info + '20',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  gpsLoadingText: {
    fontSize: 14,
    color: COLORS.info,
  },
  gpsErrorContainer: {
    backgroundColor: COLORS.danger + '20',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpsErrorText: {
    fontSize: 14,
    color: COLORS.danger,
  },
  gpsRetryButton: {
    backgroundColor: COLORS.danger,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  gpsRetryText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  gpsSuccessContainer: {
    backgroundColor: COLORS.success + '20',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpsSuccessText: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '500',
  },
  gpsRefreshButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  gpsRefreshText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
