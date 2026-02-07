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
  Switch,
} from 'react-native';
import { useForm } from 'react-hook-form';
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
// Componentes
import CrossPlatformPicker from '../../components/CrossPlatformPicker';
import ClimaCargaSelector from '../../components/ClimaCargaSelector';
import { DepartamentoMunicipioSelector } from '../../components/DepartamentoMunicipioSelector';
import DynamicFormFields from '../../components/DynamicFormFields';
import MultimediaCaptureOffline from '../../components/MultimediaCaptureOffline';
import { MultimediaRef } from '../../services/draftStorage';
import VehiculoManager from '../../components/VehiculoManager';
import CausasSelector from '../../components/CausasSelector';
import CondicionesVia from '../../components/CondicionesVia';

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

  // State para multimedia
  const [multimedia, setMultimedia] = useState<MultimediaRef[]>([]);
  const [draftUuid] = useState(() => `temp-${Date.now()}`); // UUID temporal para el componente

  // Hecho de tránsito: vehiculos form, causas, acuerdo, conteos
  const vehiculosForm = useForm({ defaultValues: { vehiculos: [] as any[] } });
  const [causasSeleccionadas, setCausasSeleccionadas] = useState<number[]>([]);
  const [acuerdoInvolucrados, setAcuerdoInvolucrados] = useState(false);
  const [acuerdoDetalle, setAcuerdoDetalle] = useState('');
  const [conteosHT, setConteosHT] = useState({
    ilesos: '0', heridos_leves: '0', heridos_graves: '0',
    trasladados: '0', fallecidos: '0', fugados: '0',
  });

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
          km: km ? parseFloat(km) : null,
          sentido: sentido || null,
          latitud: latitud ? parseFloat(latitud) : null,
          longitud: longitud ? parseFloat(longitud) : null,
          combustible: combustibleInput ? parseFloat(combustibleInput) : null,
          kilometraje_unidad: kilometraje ? parseInt(kilometraje, 10) : null,
          observaciones: observaciones || null,
          clima: clima || null,
          carga_vehicular: carga || null,
          departamento_id: deptoId || null,
          municipio_id: muniId || null,
        };
        await api.patch(`/situaciones/${situacionId}`, data);
      } else {
        // Extraer campos de detallesDinamicos para enviar a nivel raíz
        const dd = detallesDinamicos as any;

        // Transformar detalles dinámicos a estructura del backend (solo para datos complejos)
        const detallesArray: any[] = [];
        if (Object.keys(detallesDinamicos).length > 0) {
          if (nombreTipoSeleccionado === 'Conteo vehicular') {
            if (dd.conteos) detallesArray.push({ tipo_detalle: 'CONTEO', datos: dd.conteos });
          } else if (nombreTipoSeleccionado === 'Toma de velocidad') {
            if (dd.velocidades) detallesArray.push({ tipo_detalle: 'VELOCIDAD', datos: dd.velocidades });
          } else if (dd.llamadas_detalles || dd.empresa || dd.piloto || dd.institucion) {
            // Datos complejos van a detalles
            detallesArray.push({ tipo_detalle: 'INFO_EXTRA', datos: detallesDinamicos });
          }
        }

        // CREACION
        // Determinar ruta: Tomar de asignación EXCEPTO si es "Cambio de Ruta"
        let rutaParaSituacion = salidaActiva?.ruta_id || undefined;

        const data: any = {
          tipo_situacion: tipoSeleccionado,
          tipo_situacion_id: tipoSituacionId || null,
          unidad_id: salidaActiva!.unidad_id,
          salida_unidad_id: salidaActiva!.salida_id,
          ruta_id: rutaParaSituacion,
          km: km ? parseFloat(km) : null,
          sentido: sentido || null,
          latitud: latitud ? parseFloat(latitud) : null,
          longitud: longitud ? parseFloat(longitud) : null,
          combustible: combustibleInput ? parseFloat(combustibleInput) : null,
          kilometraje_unidad: kilometraje ? parseInt(kilometraje, 10) : null,
          observaciones: observaciones || null,
          ubicacion_manual: testModeEnabled,
          // Contexto
          clima: clima || null,
          carga_vehicular: carga || null,
          departamento_id: deptoId || null,
          municipio_id: muniId || null,
          // Campos dinámicos a nivel raíz (extraídos de detallesDinamicos)
          tipo_hecho_id: dd.tipo_hecho_id || null,
          tipo_asistencia_id: dd.tipo_asistencia_id || null,
          tipo_emergencia_id: dd.tipo_emergencia_id || null,
          grupo: dd.grupo || null,
          // Detalles complejos (arrays de datos)
          detalles: detallesArray.length > 0 ? detallesArray : null,
          // Multimedia (URIs locales - se subirán a Cloudinary después)
          multimedia: multimedia.length > 0 ? multimedia : null
        };

        // Si es INCIDENTE, agregar datos completos de hecho de tránsito
        const isIncidente = tipoSeleccionado === 'INCIDENTE';
        if (isIncidente) {
          // Vehiculos del form de react-hook-form
          const vehiculosData = vehiculosForm.getValues('vehiculos') || [];
          const vehiculosSerialized = vehiculosData.map((v: any) => ({
            ...v,
            tipo_vehiculo_id: null, // Se resuelve por nombre en backend
            marca_id: null,
            es_extranjero: v.placa_extranjera || false,
            datos_piloto: {
              estado_persona: v.estado_piloto || 'ILESO',
              ebriedad: v.ebriedad || false,
              traslado: v.hospital_traslado_piloto || null,
              descripcion_lesiones: v.descripcion_lesiones_piloto || null,
              causa_fallecimiento: v.causa_fallecimiento || null,
              lugar_fallecimiento: v.lugar_fallecimiento || null,
              consignado_por: v.consignado_por || null,
            },
            custodia_estado: v.custodia_estado || 'LIBRE',
            custodia_datos: v.custodia_estado && v.custodia_estado !== 'LIBRE' ? {
              autoridad: v.custodia_autoridad || null,
              motivo: v.custodia_motivo || null,
              destino: v.custodia_destino || null,
            } : null,
            // Sancion
            sancion: v.tiene_sancion || false,
            sancion_detalle: v.tiene_sancion ? {
              articulo: v.sancion_articulo || null,
              descripcion: v.sancion_descripcion || null,
              monto: v.sancion_monto || null,
            } : null,
            // Documentos consignados
            documentos_consignados: {
              licencia: v.doc_consignado_licencia || false,
              tarjeta_circulacion: v.doc_consignado_tarjeta_circulacion || false,
              tarjeta_propiedad: v.doc_consignado_tarjeta || false,
              licencia_transporte: v.doc_consignado_licencia_transporte || false,
              tarjeta_operaciones: v.doc_consignado_tarjeta_operaciones || false,
              poliza: v.doc_consignado_poliza || false,
              consignado_por: v.doc_consignado_por || null,
            },
            // Contenedor
            contenedor: v.tiene_contenedor || false,
            contenedor_detalle: v.tiene_contenedor ? {
              numero: v.contenedor_numero || null,
              empresa: v.contenedor_empresa || null,
            } : null,
            // Bus
            bus_extraurbano: v.es_bus || false,
            bus_detalle: v.es_bus ? {
              empresa: v.bus_empresa || null,
              ruta: v.bus_ruta || null,
              pasajeros: v.bus_pasajeros || null,
            } : null,
          }));
          data.vehiculos = vehiculosSerialized;
          data.causas = causasSeleccionadas.length > 0 ? causasSeleccionadas : null;
          data.acuerdo_involucrados = acuerdoInvolucrados;
          data.acuerdo_detalle = acuerdoInvolucrados ? acuerdoDetalle : null;
          data.ilesos = parseInt(conteosHT.ilesos, 10) || 0;
          data.heridos_leves = parseInt(conteosHT.heridos_leves, 10) || 0;
          data.heridos_graves = parseInt(conteosHT.heridos_graves, 10) || 0;
          data.trasladados = parseInt(conteosHT.trasladados, 10) || 0;
          data.fallecidos = parseInt(conteosHT.fallecidos, 10) || 0;
          data.fugados = parseInt(conteosHT.fugados, 10) || 0;
          data.heridos = (parseInt(conteosHT.heridos_leves, 10) || 0) + (parseInt(conteosHT.heridos_graves, 10) || 0);
          // Condiciones de vía desde detallesDinamicos
          data.via_estado = dd.via_estado || null;
          data.via_topografia = dd.via_topografia || null;
          data.via_geometria = dd.via_geometria || null;
          data.via_peralte = dd.via_peralte || null;
          data.via_condicion = dd.via_condicion || null;
        }

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
            <View style={styles.card}>
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
                  <CrossPlatformPicker
                    label="Sentido"
                    selectedValue={sentido || null}
                    onValueChange={(v) => setSentido(v || '')}
                    placeholder="Sel..."
                    options={[
                      { label: 'Norte', value: 'NORTE' },
                      { label: 'Sur', value: 'SUR' },
                      { label: 'Oriente', value: 'ORIENTE' },
                      { label: 'Occidente', value: 'OCCIDENTE' },
                    ]}
                  />
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
              <View style={styles.card}>
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

            {/* VEHICULOS - Solo para INCIDENTE */}
            {tipoSeleccionado === 'INCIDENTE' && (
              <>
                <VehiculoManager
                  control={vehiculosForm.control}
                  name="vehiculos"
                  required
                  minVehiculos={1}
                  label="Vehículos Involucrados"
                />

                {/* Conteos globales */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Conteo de Personas</Text>
                  <View style={styles.row}>
                    <View style={styles.half}>
                      <Text style={styles.label}>Ilesos</Text>
                      <TextInput style={styles.input} value={conteosHT.ilesos} onChangeText={t => setConteosHT(p => ({ ...p, ilesos: t }))} keyboardType="numeric" />
                    </View>
                    <View style={styles.half}>
                      <Text style={styles.label}>Heridos Leves</Text>
                      <TextInput style={styles.input} value={conteosHT.heridos_leves} onChangeText={t => setConteosHT(p => ({ ...p, heridos_leves: t }))} keyboardType="numeric" />
                    </View>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.half}>
                      <Text style={styles.label}>Heridos Graves</Text>
                      <TextInput style={styles.input} value={conteosHT.heridos_graves} onChangeText={t => setConteosHT(p => ({ ...p, heridos_graves: t }))} keyboardType="numeric" />
                    </View>
                    <View style={styles.half}>
                      <Text style={styles.label}>Trasladados</Text>
                      <TextInput style={styles.input} value={conteosHT.trasladados} onChangeText={t => setConteosHT(p => ({ ...p, trasladados: t }))} keyboardType="numeric" />
                    </View>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.half}>
                      <Text style={styles.label}>Fallecidos</Text>
                      <TextInput style={styles.input} value={conteosHT.fallecidos} onChangeText={t => setConteosHT(p => ({ ...p, fallecidos: t }))} keyboardType="numeric" />
                    </View>
                    <View style={styles.half}>
                      <Text style={styles.label}>Fugados</Text>
                      <TextInput style={styles.input} value={conteosHT.fugados} onChangeText={t => setConteosHT(p => ({ ...p, fugados: t }))} keyboardType="numeric" />
                    </View>
                  </View>
                </View>

                {/* Causas del hecho */}
                <CausasSelector
                  value={causasSeleccionadas}
                  onChange={setCausasSeleccionadas}
                />

                {/* Condiciones de la vía */}
                <CondicionesVia
                  detalles={detallesDinamicos}
                  setDetalles={setDetallesDinamicos}
                />

                {/* Acuerdo entre involucrados */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Acuerdo entre Involucrados</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text>¿Hubo acuerdo?</Text>
                    <Switch value={acuerdoInvolucrados} onValueChange={setAcuerdoInvolucrados} />
                  </View>
                  {acuerdoInvolucrados && (
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Detalle del acuerdo..."
                      multiline
                      numberOfLines={3}
                      value={acuerdoDetalle}
                      onChangeText={setAcuerdoDetalle}
                    />
                  )}
                </View>
              </>
            )}

            {/* MULTIMEDIA - Solo para tipos que requieren evidencia */}
            {['INCIDENTE', 'ASISTENCIA_VEHICULAR', 'EMERGENCIA'].includes(tipoSeleccionado || '') && (
              <MultimediaCaptureOffline
                draftUuid={draftUuid}
                tipoSituacion={tipoSeleccionado || 'OTROS'}
                manualMode={true}
                initialMedia={multimedia}
                onMultimediaChange={setMultimedia}
              />
            )}

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
  textArea: { height: 80, textAlignVertical: 'top' },
  saveButton: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  gpsContainer: { marginTop: 4, flexDirection: 'row', justifyContent: 'space-between' }
});
