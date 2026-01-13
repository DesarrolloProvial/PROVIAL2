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
} from '../../constants/situacionTypes';
import * as Location from 'expo-location';
import api from '../../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

// Componentes
import ClimaCargaSelector from '../../components/ClimaCargaSelector';
import { DepartamentoMunicipioSelector } from '../../components/DepartamentoMunicipioSelector';
import DynamicFormFields from '../../components/DynamicFormFields';

type NuevaSituacionRouteProp = RouteProp<{
  NuevaSituacion: {
    editMode?: boolean;
    situacionId?: number;
    situacionData?: any;
  };
}, 'NuevaSituacion'>;

const CATEGORIA_COLORS: Record<string, string> = {
  ACCIDENTE: '#ef4444',
  ASISTENCIA: '#14b8a6',
  EMERGENCIA: '#f97316',
  OPERATIVO: '#3b82f6',
  APOYO: '#6366f1',
  ADMINISTRATIVO: '#6b7280',
};

export default function NuevaSituacionScreen() {
  const navigation = useNavigation();
  const route = useRoute<NuevaSituacionRouteProp>();
  const { salidaActiva } = useAuthStore();
  const {
    createSituacion,
    fetchMisSituacionesHoy,
    isLoading,
    fetchCatalogo,
    catalogo,
    fetchCatalogosAuxiliares,
    catalogosAuxiliares
  } = useSituacionesStore();
  const { testModeEnabled } = useTestMode();

  // Parámetros de edición
  const editMode = route.params?.editMode || false;
  const situacionId = route.params?.situacionId;
  const situacionData = route.params?.situacionData;

  // Estado del formulario
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoSituacion | null>(null);
  const [tipoSituacionId, setTipoSituacionId] = useState<number | null>(null);
  const [nombreTipoSeleccionado, setNombreTipoSeleccionado] = useState<string>('');

  const [km, setKm] = useState('');
  const [sentido, setSentido] = useState('');
  const [combustibleDecimal, setCombustibleDecimal] = useState<number>(0); // Simplificado input decimal
  const [combustibleInput, setCombustibleInput] = useState(''); // Input texto
  const [kilometraje, setKilometraje] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Nuevos Estados
  const [clima, setClima] = useState('');
  const [carga, setCarga] = useState('');
  const [deptoId, setDeptoId] = useState<number | null>(null);
  const [muniId, setMuniId] = useState<number | null>(null);
  const [detallesDinamicos, setDetallesDinamicos] = useState({});

  // Ruta se toma automáticamente de la asignación (salidaActiva.ruta_id)

  // Coordenadas GPS
  const [latitud, setLatitud] = useState('14.6349');
  const [longitud, setLongitud] = useState('-90.5069');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // State para unidades (Supervisión)
  const [unidadesList, setUnidadesList] = useState<any[]>([]);

  // Cargar catálogo al inicio y unidades activas
  useEffect(() => {
    fetchCatalogo();
    fetchCatalogosAuxiliares();
    api.get('/unidades/activas').then(r => setUnidadesList(r.data)).catch(console.error);
  }, []);

  // Reset al cambiar tipo
  useEffect(() => {
    if (!editMode) {
      setDetallesDinamicos({});
      setClima('');
      setCarga('');
      setDeptoId(null);
      setMuniId(null);
    }
  }, [tipoSituacionId]);

  // Obtener ubicacion GPS
  useEffect(() => {
    if (!testModeEnabled && !editMode) {
      obtenerUbicacionGPS();
    }
  }, [testModeEnabled, editMode]);

  // Pre-llenar en modo edición
  useEffect(() => {
    if (editMode && situacionData) {
      if (situacionData.tipo_situacion) setTipoSeleccionado(situacionData.tipo_situacion as TipoSituacion);
      if (situacionData.tipo_situacion_id) {
        setTipoSituacionId(situacionData.tipo_situacion_id);
        setNombreTipoSeleccionado(situacionData.subtipo_nombre || '');
      }

      if (situacionData.km) setKm(situacionData.km.toString());
      if (situacionData.sentido) setSentido(situacionData.sentido);
      if (situacionData.latitud) setLatitud(situacionData.latitud.toString());
      if (situacionData.longitud) setLongitud(situacionData.longitud.toString());
      if (situacionData.combustible) setCombustibleInput(situacionData.combustible.toString());
      if (situacionData.kilometraje_unidad) setKilometraje(situacionData.kilometraje_unidad.toString());
      if (situacionData.observaciones) setObservaciones(situacionData.observaciones);
      // La ruta se toma automáticamente de la asignación

      // Nuevos campos en edit mode (asumiendo que backend devuelva en situacionData)
      if (situacionData.clima) setClima(situacionData.clima);
      if (situacionData.carga_vehicular) setCarga(situacionData.carga_vehicular);
      if (situacionData.departamento_id) setDeptoId(situacionData.departamento_id);
      if (situacionData.municipio_id) setMuniId(situacionData.municipio_id);
    }
  }, [editMode, situacionData]);

  const obtenerUbicacionGPS = async () => {
    try {
      setGpsLoading(true);
      setGpsError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsError('Permiso denegado');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatitud(location.coords.latitude.toFixed(6));
      setLongitud(location.coords.longitude.toFixed(6));
    } catch (error) {
      setGpsError('Error GPS');
    } finally {
      setGpsLoading(false);
    }
  };

  const seleccionarTipoDesdeCatalogo = (tipo: any, categoriaCodigo: string) => {
    setTipoSituacionId(tipo.id);
    setNombreTipoSeleccionado(tipo.nombre);

    let tipoMacro: TipoSituacion = 'OTROS';
    switch (tipo.formulario_tipo) {
      case 'INCIDENTE': tipoMacro = 'INCIDENTE'; break;
      case 'ASISTENCIA': tipoMacro = 'ASISTENCIA_VEHICULAR'; break;
      case 'OBSTACULO': tipoMacro = 'OBSTACULO'; break;
      case 'ACTIVIDAD': tipoMacro = 'PATRULLAJE'; break;
      case 'NOVEDAD': tipoMacro = 'PARADA_ESTRATEGICA'; break;
      default: tipoMacro = 'OTROS';
    }
    setTipoSeleccionado(tipoMacro);
  };

  const handleCrearSituacion = async () => {
    if (!tipoSeleccionado) {
      Alert.alert('Error', 'Debes seleccionar un tipo de situación');
      return;
    }

    try {
      if (editMode && situacionId) {
        // EDICION
        const data = {
          km: km ? parseFloat(km) : undefined,
          sentido: sentido || undefined,
          latitud: latitud ? parseFloat(latitud) : undefined,
          longitud: longitud ? parseFloat(longitud) : undefined,
          combustible: combustibleInput ? parseFloat(combustibleInput) : undefined,
          kilometraje_unidad: kilometraje ? parseInt(kilometraje, 10) : undefined,
          observaciones: observaciones || undefined,
          clima: clima || undefined,
          carga_vehicular: carga || undefined,
          departamento_id: deptoId || undefined,
          municipio_id: muniId || undefined,
        };
        await api.patch(`/situaciones/${situacionId}`, data);
      } else {
        // Transformar detalles dinámicos a estructura del backend
        const detallesArray: any[] = [];
        if (Object.keys(detallesDinamicos).length > 0) {
          if (nombreTipoSeleccionado === 'Conteo vehicular') {
            if ((detallesDinamicos as any).conteos) detallesArray.push({ tipo_detalle: 'CONTEO', datos: (detallesDinamicos as any).conteos });
          } else if (nombreTipoSeleccionado === 'Toma de velocidad') {
            if ((detallesDinamicos as any).velocidades) detallesArray.push({ tipo_detalle: 'VELOCIDAD', datos: (detallesDinamicos as any).velocidades });
          } else {
            detallesArray.push({ tipo_detalle: 'INFO_EXTRA', datos: detallesDinamicos });
          }
        }

        // CREACION
        // Determinar ruta: Tomar de asignación EXCEPTO si es "Cambio de Ruta"
        let rutaParaSituacion = salidaActiva?.ruta_id || undefined;
        // Si es cambio de ruta y hay una ruta seleccionada manualmente, usar esa
        // (futuro: agregar selector cuando nombreTipoSeleccionado === 'Cambio de Ruta')

        const data = {
          tipo_situacion: tipoSeleccionado,
          tipo_situacion_id: tipoSituacionId || undefined,
          unidad_id: salidaActiva!.unidad_id,
          salida_unidad_id: salidaActiva!.salida_id,
          ruta_id: rutaParaSituacion,
          km: km ? parseFloat(km) : undefined,
          sentido: sentido || undefined,
          latitud: latitud ? parseFloat(latitud) : undefined,
          longitud: longitud ? parseFloat(longitud) : undefined,
          combustible: combustibleInput ? parseFloat(combustibleInput) : undefined,
          kilometraje_unidad: kilometraje ? parseInt(kilometraje, 10) : undefined,
          observaciones: observaciones || undefined,
          ubicacion_manual: testModeEnabled,
          // Nuevos campos
          clima: clima || undefined,
          carga_vehicular: carga || undefined,
          departamento_id: deptoId || undefined,
          municipio_id: muniId || undefined,
          detalles: detallesArray.length > 0 ? detallesArray : undefined
        };
        await createSituacion(data);
      }

      Alert.alert('Éxito', 'Situación guardada', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error: any) {
      console.error('❌ ERROR COMPLETO AL CREAR SITUACIÓN:', JSON.stringify(error, null, 2));
      console.error('❌ ERROR RESPONSE:', error?.response?.data);
      console.error('❌ ERROR MESSAGE:', error?.message);
      console.error('❌ ERROR MSG:', error?.msg);

      const errorMsg = error?.response?.data?.error
        || error?.response?.data?.message
        || error?.msg
        || error?.message
        || 'Error al guardar';

      Alert.alert('Error al crear situación', errorMsg);
    }
  };

  const renderCatalogo = () => {
    if (editMode) return null;
    if (catalogo.length === 0) return <Text style={{ margin: 20 }}>Cargando catálogo...</Text>;

    return (
      <View style={styles.catalogoContainer}>
        {catalogo.map((cat: any) => (
          <View key={cat.id} style={styles.catSection}>
            <Text style={[styles.catTitle, { color: CATEGORIA_COLORS[cat.codigo] || COLORS.primary }]}>
              {cat.nombre}
            </Text>
            <View style={styles.tiposContainer}>
              {cat.tipos.map((tipo: any) => {
                const isSelected = tipoSituacionId === tipo.id;
                const color = CATEGORIA_COLORS[cat.codigo] || COLORS.primary;
                return (
                  <TouchableOpacity
                    key={tipo.id}
                    style={[styles.tipoButton, { borderColor: color }, isSelected && { backgroundColor: color }]}
                    onPress={() => seleccionarTipoDesdeCatalogo(tipo, cat.codigo)}
                  >
                    <MaterialCommunityIcons
                      name={tipo.icono || 'alert-circle-outline'}
                      size={24}
                      color={isSelected ? 'white' : color}
                    />
                    <Text style={[styles.tipoText, isSelected && { color: 'white' }]}>{tipo.nombre}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        {!editMode && <Text style={styles.headerTitle}>Nueva Situación</Text>}
        {editMode && <Text style={styles.headerTitle}>Editar Situación</Text>}

        {renderCatalogo()}

        {(tipoSeleccionado || editMode) && (
          <View style={styles.formContainer}>
            <Text style={styles.selectedTitle}>Detalles: {nombreTipoSeleccionado}</Text>

            {/* UBICACION */}
            <View style={[styles.card, { zIndex: 100 }]}>
              <Text style={styles.cardTitle}>Ubicación</Text>

              <DepartamentoMunicipioSelector
                departamentoValue={deptoId || undefined}
                municipioValue={muniId || undefined}
                onDepartamentoChange={(id) => setDeptoId(id || null)}
                onMunicipioChange={(id) => setMuniId(id || null)}
              />

              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={styles.label}>Kilómetro</Text>
                  <TextInput
                    style={styles.input}
                    value={km}
                    onChangeText={setKm}
                    keyboardType="numeric"
                    placeholder="Ej. 52.5"
                  />
                </View>
                <View style={styles.half}>
                  <Text style={styles.label}>Sentido</Text>
                  <View style={styles.pickerBox}>
                    <Picker selectedValue={sentido} onValueChange={setSentido} style={styles.picker}>
                      <Picker.Item label="Sel..." value="" />
                      <Picker.Item label="Norte" value="NORTE" />
                      <Picker.Item label="Sur" value="SUR" />
                      <Picker.Item label="Oriente" value="ORIENTE" />
                      <Picker.Item label="Occidente" value="OCCIDENTE" />
                    </Picker>
                  </View>
                </View>
              </View>

              {/* GPS */}
              <View style={styles.gpsContainer}>
                <Text style={{ fontSize: 12, color: '#666' }}>GPS: {latitud}, {longitud}</Text>
                {gpsLoading && <ActivityIndicator size="small" />}
                {gpsError && <Text style={{ color: 'red', fontSize: 10 }}>{gpsError}</Text>}
              </View>
            </View>

            {/* CLIMA Y CARGA */}
            {!['Dejando personal administrativo', 'Comisión', 'Abastecimiento'].includes(nombreTipoSeleccionado) && (
              <View style={[styles.card, { zIndex: 50 }]}>
                <ClimaCargaSelector
                  clima={clima} setClima={setClima}
                  carga={carga} setCarga={setCarga}
                />
              </View>
            )}

            {/* DINAMICOS (solo mostrar si el componente renderiza algo) */}
            <DynamicFormFields
              situacionNombre={nombreTipoSeleccionado}
              formularioTipo={tipoSeleccionado || ''}
              detalles={detallesDinamicos}
              setDetalles={setDetallesDinamicos}
              auxiliares={catalogosAuxiliares}
              unidades={unidadesList}
            />

            {/* OBSERVACIONES */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Observaciones</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Observaciones adicionales..."
                multiline
                numberOfLines={3}
                value={observaciones}
                onChangeText={setObservaciones}
              />
            </View>

            {/* COMBUSTIBLE Y ODOMETRO (solo para Abastecimiento) */}
            {nombreTipoSeleccionado === 'Abastecimiento' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Datos de Unidad</Text>
                <View style={styles.row}>
                  <View style={styles.half}>
                    <Text style={styles.label}>Combustible (Gal)</Text>
                    <TextInput style={styles.input} value={combustibleInput} onChangeText={setCombustibleInput} keyboardType="numeric" placeholder="0.0" />
                  </View>
                  <View style={styles.half}>
                    <Text style={styles.label}>Odómetro</Text>
                    <TextInput style={styles.input} value={kilometraje} onChangeText={setKilometraje} keyboardType="numeric" placeholder="0" />
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleCrearSituacion}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>{editMode ? 'Actualizar' : 'Crear Situación'}</Text>}
            </TouchableOpacity>

          </View>
        )}
        <View style={{ height: 50 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f3f4f6' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: COLORS.text.primary },
  catalogoContainer: { marginBottom: 20 },
  catSection: { marginBottom: 16 },
  catTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  tiposContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tipoButton: {
    width: '30%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 8, borderWidth: 1, padding: 4
  },
  tipoText: { fontSize: 10, textAlign: 'center', marginTop: 4, fontWeight: '500' },
  formContainer: { gap: 16 },
  selectedTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, marginBottom: 8 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#444' },
  label: { fontSize: 12, color: '#666', marginBottom: 4, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  half: { flex: 1 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#fafafa' },
  pickerBox: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden' },
  picker: { height: 50, width: '100%' },
  textArea: { height: 80, textAlignVertical: 'top' },
  saveButton: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  gpsContainer: { marginTop: 4, flexDirection: 'row', justifyContent: 'space-between' }
});
