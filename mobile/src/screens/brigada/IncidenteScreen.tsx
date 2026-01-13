import React, { useState, useEffect } from 'react';
import api, { geografiaAPI } from '../../services/api';
import * as Location from 'expo-location';
import { useDraftSave } from '../../hooks/useDraftSave';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import {
    TIPOS_HECHO_TRANSITO,
    SENTIDOS,
    AREAS,
    MATERIALES_VIA,
} from '../../constants/situacionTypes';
import { useAuthStore } from '../../store/authStore';
import { useTestMode } from '../../context/TestModeContext';
import AutoridadSocorroManager, { DetalleAutoridad, DetallesSocorro } from '../../components/AutoridadSocorroManager';
import ObstruccionManager from '../../components/ObstruccionManager';

// New Imports
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Provider as PaperProvider, SegmentedButtons, TextInput as PaperInput, Button, Switch } from 'react-native-paper';
import { VehiculoForm } from '../../components/VehiculoForm';
import { GruaForm } from '../../components/GruaForm';
import { AjustadorForm } from '../../components/AjustadorForm';
import MultimediaCapture from '../../components/MultimediaCapture';

interface Departamento {
    id: number;
    nombre: string;
    codigo: string;
}

interface Municipio {
    id: number;
    nombre: string;
    departamento_id: number;
}

type IncidenteScreenRouteProp = RouteProp<{
    IncidenteScreen: {
        editMode?: boolean;
        incidenteId?: number;
        situacionId?: number;
    };
}, 'IncidenteScreen'>;

export default function IncidenteScreen() {
    const navigation = useNavigation();
    const route = useRoute<IncidenteScreenRouteProp>();
    const { editMode, incidenteId, situacionId: situacionIdParam } = route.params || {};

    // Estado para situacionId (se obtiene del param o después de crear)
    const [situacionId, setSituacionId] = useState<number | null>(situacionIdParam || null);
    const [multimediaComplete, setMultimediaComplete] = useState(false);

    const { salidaActiva } = useAuthStore();
    const { testModeEnabled } = useTestMode();
    const [loadingData, setLoadingData] = useState(false);

    // Coordenadas manuales para modo pruebas
    const [latitudManual, setLatitudManual] = useState('14.6349');
    const [longitudManual, setLongitudManual] = useState('-90.5069');

    // Departamentos y Municipios
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [municipios, setMunicipios] = useState<Municipio[]>([]);
    const [loadingGeo, setLoadingGeo] = useState(false);

    // Form Setup
    const { control, handleSubmit, setValue, watch, reset, getValues } = useForm({
        defaultValues: {
            tipoIncidente: '',
            rutaId: null, // Se auto-asignará desde salida activa
            km: '',
            sentido: '',
            vehiculos: [],
            gruas: [],
            ajustadores: [],
            autoridadesSeleccionadas: [],
            detallesAutoridades: {},
            socorroSeleccionado: [],
            detallesSocorro: {},
            daniosMateriales: false,
            daniosInfraestructura: false,
            descripcionDaniosInfra: '',
            obstruye: '',
            observaciones: '',
            departamento_id: null as number | null,
            municipio_id: null as number | null,
            direccion_detallada: '',
            coordenadas: null,
            // Campos accidentología (boleta)
            area: '' as string,
            material_via: '' as string,
            no_grupo_operativo: '' as string,
        }
    });

    // Auto-asignar ruta desde salida activa
    useEffect(() => {
        // Note: rutaId se obtiene dinámicamente desde salidaActiva, no se necesita asignar en el form
        // La ruta se mostrará solo como información de solo lectura
    }, [salidaActiva]);

    // Cargar departamentos al iniciar
    useEffect(() => {
        const loadDepartamentos = async () => {
            try {
                const data = await geografiaAPI.getDepartamentos();
                setDepartamentos(data);
            } catch (error) {
                console.error('Error cargando departamentos:', error);
            }
        };
        loadDepartamentos();
    }, []);

    // Watcher para departamento
    const departamentoId = watch('departamento_id');

    // Cargar municipios cuando cambie el departamento
    useEffect(() => {
        const loadMunicipios = async () => {
            if (departamentoId) {
                setLoadingGeo(true);
                try {
                    const data = await geografiaAPI.getMunicipiosPorDepartamento(departamentoId);
                    setMunicipios(data);
                } catch (error) {
                    console.error('Error cargando municipios:', error);
                    setMunicipios([]);
                } finally {
                    setLoadingGeo(false);
                }
            } else {
                setMunicipios([]);
            }
            // Limpiar municipio si cambia el departamento
            setValue('municipio_id', null);
        };
        loadMunicipios();
    }, [departamentoId]);

    const { fields: vehiculoFields, append: appendVehiculo, remove: removeVehiculo } = useFieldArray({
        control,
        name: "vehiculos"
    });

    const { fields: gruaFields, append: appendGrua, remove: removeGrua } = useFieldArray({
        control,
        name: "gruas"
    });

    const { fields: ajustadorFields, append: appendAjustador, remove: removeAjustador } = useFieldArray({
        control,
        name: "ajustadores"
    });

    // Watchers for summary
    const vehiculos = watch('vehiculos');
    const daniosInfraestructura = watch('daniosInfraestructura');

    // UI State
    const [activeTab, setActiveTab] = useState('general');
    const [guardando, setGuardando] = useState(false);
    const [coordenadas, setCoordenadas] = useState<{ latitud: number; longitud: number } | null>(null);
    const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);

    // Draft Save - EXCLUIR coordenadas (siempre obtener GPS fresco)
    const formData = watch();
    const { coordenadas: _, ...draftData } = formData || {};

    const { loadDraft, clearDraft } = useDraftSave(
        'draft_incidente_v2',
        draftData,
        { enabled: !guardando && !editMode }
    );

    useEffect(() => {
        // Auto-restaurar borrador sin diálogo de confirmación
        const loadPreviousDraft = async () => {
            if (editMode && incidenteId) {
                // Modo edición: Cargar datos del servidor
                setLoadingData(true);
                try {
                    const response = await api.get(`/incidentes/${incidenteId}`);
                    const incidente = response.data.incidente;

                    // Mapear datos al formulario
                    const TIPO_HECHO_NOMBRES: Record<number, string> = {
                        1: 'Accidente Vial',
                        2: 'Vehículo Avariado',
                        3: 'Obstáculo',
                        4: 'Regulación de Tránsito',
                        5: 'Trabajos en la Vía',
                        6: 'Manifestación',
                        7: 'Evento',
                        8: 'Otro',
                    };

                    const formData = {
                        tipoIncidente: TIPO_HECHO_NOMBRES[incidente.tipo_hecho_id] || 'Otro',
                        rutaId: incidente.ruta_id,
                        km: incidente.km?.toString() || '',
                        sentido: incidente.sentido,
                        vehiculos: incidente.vehiculos || [],
                        gruas: incidente.recursos?.filter((r: any) => r.tipo_recurso === 'GRUA') || [],
                        ajustadores: incidente.recursos?.filter((r: any) => r.tipo_recurso === 'AJUSTADOR') || [],
                        autoridadesSeleccionadas: [], // TODO: Mapear si backend devuelve esto estructurado
                        detallesAutoridades: {},
                        socorroSeleccionado: [],
                        detallesSocorro: {},
                        daniosMateriales: incidente.danios_materiales || false,
                        daniosInfraestructura: incidente.danios_infraestructura || false,
                        descripcionDaniosInfra: incidente.danios_infraestructura_desc || '',
                        obstruye: incidente.obstruccion ? 'SI' : 'NO', // Simplificado
                        observaciones: incidente.observaciones_iniciales || '',
                        departamento_id: null, // Se necesita lógica para obtener esto de geoviews o incidente
                        municipio_id: null,
                        direccion_detallada: incidente.direccion_detallada || '',
                        coordenadas: {
                            latitud: parseFloat(incidente.latitud),
                            longitud: parseFloat(incidente.longitud)
                        },
                    };

                    reset(formData);

                    // Set GPS manually
                    setCoordenadas({
                        latitud: parseFloat(incidente.latitud),
                        longitud: parseFloat(incidente.longitud)
                    });
                    setLatitudManual(incidente.latitud.toString());
                    setLongitudManual(incidente.longitud.toString());

                } catch (error) {
                    console.error('Error cargando incidente:', error);
                    Alert.alert('Error', 'No se pudieron cargar los datos del incidente');
                } finally {
                    setLoadingData(false);
                }
            } else {
                // Modo creación: Cargar borrador
                const draft = await loadDraft();
                if (draft) {
                    console.log('[DRAFT] Auto-restaurando borrador de incidente');
                    reset(draft);
                }
            }
        };
        loadPreviousDraft();

        // Solo obtener GPS automatico si NO esta en modo pruebas y NO es edicion
        if (!testModeEnabled && !editMode) {
            obtenerUbicacion();
        }
    }, [testModeEnabled, editMode, incidenteId]);

    const obtenerUbicacion = async () => {
        try {
            setObteniendoUbicacion(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permisos requeridos', 'Se necesita acceso a la ubicación.');
                return;
            }
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setCoordenadas({
                latitud: location.coords.latitude,
                longitud: location.coords.longitude,
            });
        } catch (error) {
            console.error('Error ubicación:', error);
        } finally {
            setObteniendoUbicacion(false);
        }
    };

    const onSubmit = async (data: any) => {
        // Validaciones...
        if (!editMode && !salidaActiva) {
            Alert.alert('Error', 'No hay salida activa. Debes iniciar una salida primero.');
            return;
        }
        // En edit mode, ruta puede venir de los datos cargados, no estrictamente salida activa

        if (!data.tipoIncidente || !data.km) {
            Alert.alert('Error', 'Complete los campos obligatorios (Tipo, Km)');
            return;
        }
        if (vehiculoFields.length === 0) {
            Alert.alert('Error', 'Debe agregar al menos un vehículo');
            return;
        }

        // Determinar coordenadas
        let latFinal, lonFinal;
        if (editMode) {
            // En edicion mantenemos las coordenadas originales a menos que se cambien explicitamente (TODO: UI para cambiar)
            // Por ahora usamos las cargadas o manuales
            latFinal = coordenadas?.latitud;
            lonFinal = coordenadas?.longitud;
        } else {
            latFinal = testModeEnabled ? parseFloat(latitudManual) : coordenadas?.latitud;
            lonFinal = testModeEnabled ? parseFloat(longitudManual) : coordenadas?.longitud;
        }

        if (!latFinal || !lonFinal || isNaN(latFinal) || isNaN(lonFinal)) {
            Alert.alert('Error', 'Se requieren coordenadas GPS válidas');
            return;
        }

        try {
            setGuardando(true);

            // Map fields to backend expected format
            const TIPO_HECHO_IDS: Record<string, number> = {
                'Accidente Vial': 1,
                'Vehículo Avariado': 2,
                'Obstáculo': 3,
                'Regulación de Tránsito': 4,
                'Trabajos en la Vía': 5,
                'Manifestación': 6,
                'Evento': 7,
                'Otro': 8,
            };

            const incidenteData = {
                ...data,
                latitud: latFinal,
                longitud: lonFinal,
                ubicacion_manual: testModeEnabled,
                // Si es edicion, no necesitamos estos IDs si ya existen, pero el backend los puede ignorar
                unidad_id: salidaActiva?.unidad_id,
                salida_unidad_id: salidaActiva?.salida_id,
                tipo_hecho_id: TIPO_HECHO_IDS[data.tipoIncidente] || 8,
                ruta_id: salidaActiva?.ruta_id || data.rutaId,
                km: parseFloat(data.km),
                observaciones_iniciales: data.observaciones, // Map observaciones
            };

            console.log(editMode ? 'Actualizando incidente:' : 'Enviando incidente:', incidenteData);

            if (editMode && incidenteId) {
                await api.patch(`/incidentes/${incidenteId}`, incidenteData);
                Alert.alert('Éxito', 'Incidente actualizado', [{ text: 'OK', onPress: () => navigation.goBack() }]);
            } else {
                await api.post('/incidentes', incidenteData);
                await clearDraft();
                Alert.alert('Éxito', 'Incidente registrado', [{ text: 'OK', onPress: () => navigation.goBack() }]);
            }
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', error.response?.data?.error || error.message || 'No se pudo guardar');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <PaperProvider>
            <View style={styles.container}>
                <View style={styles.tabContainer}>
                    <SegmentedButtons
                        value={activeTab}
                        onValueChange={setActiveTab}
                        buttons={[
                            { value: 'general', label: 'General' },
                            { value: 'vehiculos', label: 'Vehículos' },
                            { value: 'recursos', label: 'Recursos' },
                            { value: 'otros', label: 'Otros' },
                            { value: 'evidencia', label: 'Evidencia', disabled: !situacionId },
                        ]}
                    />
                </View>

                <ScrollView style={styles.content}>
                    {activeTab === 'general' && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Ubicación y Tipo</Text>

                            {/* GPS Indicator - Manual en modo pruebas, automatico en produccion */}
                            {testModeEnabled ? (
                                <View style={styles.testModeGps}>
                                    <Text style={styles.testModeLabel}>📍 Coordenadas (Modo Pruebas - Manual)</Text>
                                    <View style={styles.coordsRow}>
                                        <View style={styles.coordField}>
                                            <Text style={styles.coordLabel}>Latitud:</Text>
                                            <TextInput
                                                style={styles.coordInput}
                                                value={latitudManual}
                                                onChangeText={setLatitudManual}
                                                placeholder="14.6349"
                                                keyboardType="decimal-pad"
                                            />
                                        </View>
                                        <View style={styles.coordField}>
                                            <Text style={styles.coordLabel}>Longitud:</Text>
                                            <TextInput
                                                style={styles.coordInput}
                                                value={longitudManual}
                                                onChangeText={setLongitudManual}
                                                placeholder="-90.5069"
                                                keyboardType="decimal-pad"
                                            />
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <View style={[styles.gpsIndicator, coordenadas ? styles.gpsOk : styles.gpsError]}>
                                    <Text style={styles.gpsText}>
                                        {obteniendoUbicacion ? '📍 Obteniendo...' : coordenadas ? `GPS: ${coordenadas.latitud.toFixed(5)}, ${coordenadas.longitud.toFixed(5)}` : '⚠️ Sin GPS'}
                                    </Text>
                                    {!coordenadas && !obteniendoUbicacion && (
                                        <Button mode="contained-tonal" onPress={obtenerUbicacion} compact>Reintentar</Button>
                                    )}
                                </View>
                            )}

                            <Controller
                                control={control}
                                name="tipoIncidente"
                                render={({ field: { onChange, value } }) => (
                                    <View style={styles.pickerContainer}>
                                        <Text>Tipo de Hecho *</Text>
                                        <Picker selectedValue={value} onValueChange={onChange}>
                                            <Picker.Item label="Seleccionar..." value="" />
                                            {TIPOS_HECHO_TRANSITO.map(t => <Picker.Item key={t} label={t} value={t} />)}
                                        </Picker>
                                    </View>
                                )}
                            />

                            {/* Ruta de la salida activa */}
                            <View style={styles.infoBox}>
                                <Text style={styles.infoLabel}>Ruta Actual</Text>
                                <Text style={styles.infoValue}>
                                    {salidaActiva?.ruta_codigo || 'Sin ruta asignada'}
                                </Text>
                                <Text style={styles.infoHelper}>
                                    Para cambiar de ruta, usa la función "Cambio de Ruta" desde el menú principal.
                                </Text>
                            </View>

                            <View style={styles.row}>
                                <Controller
                                    control={control}
                                    name="km"
                                    render={({ field: { onChange, value } }) => (
                                        <PaperInput label="Kilómetro *" value={value || ''} onChangeText={onChange} keyboardType="numeric" style={[styles.input, styles.half]} />
                                    )}
                                />
                                <Controller
                                    control={control}
                                    name="sentido"
                                    render={({ field: { onChange, value } }) => (
                                        <View style={[styles.pickerContainer, styles.half]}>
                                            <Text>Sentido</Text>
                                            <Picker selectedValue={value || ''} onValueChange={onChange}>
                                                <Picker.Item label="Seleccionar..." value="" />
                                                {SENTIDOS.map(s => <Picker.Item key={s.value} label={s.label} value={s.value} />)}
                                            </Picker>
                                        </View>
                                    )}
                                />
                            </View>

                            {/* Departamento */}
                            <Text style={styles.label}>Departamento</Text>
                            <Controller
                                control={control}
                                name="departamento_id"
                                render={({ field: { onChange, value } }) => (
                                    <View style={styles.pickerContainer}>
                                        <Picker
                                            selectedValue={value}
                                            onValueChange={onChange}
                                            style={styles.picker}
                                        >
                                            <Picker.Item label="Seleccione departamento" value={null} />
                                            {departamentos.map((dep) => (
                                                <Picker.Item key={dep.id} label={dep.nombre} value={dep.id} />
                                            ))}
                                        </Picker>
                                    </View>
                                )}
                            />

                            {/* Municipio */}
                            <Text style={styles.label}>Municipio</Text>
                            <Controller
                                control={control}
                                name="municipio_id"
                                render={({ field: { onChange, value } }) => (
                                    <View style={styles.pickerContainer}>
                                        <Picker
                                            selectedValue={value}
                                            onValueChange={onChange}
                                            style={styles.picker}
                                            enabled={municipios.length > 0 && !loadingGeo}
                                        >
                                            <Picker.Item
                                                label={loadingGeo ? "Cargando..." : (municipios.length === 0 ? "Seleccione departamento primero" : "Seleccione municipio")}
                                                value={null}
                                            />
                                            {municipios.map((mun) => (
                                                <Picker.Item key={mun.id} label={mun.nombre} value={mun.id} />
                                            ))}
                                        </Picker>
                                    </View>
                                )}
                            />

                            {/* Dirección detallada */}
                            <Controller
                                control={control}
                                name="direccion_detallada"
                                render={({ field: { onChange, value } }) => (
                                    <PaperInput
                                        label="Dirección o Referencia (opcional)"
                                        value={value || ''}
                                        onChangeText={onChange}
                                        style={styles.input}
                                        placeholder="Ej: Km 45.5, frente a gasolinera..."
                                    />
                                )}
                            />

                            {/* ============================================ */}
                            {/* CAMPOS DE ACCIDENTOLOGÍA (Boleta) */}
                            {/* ============================================ */}
                            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Datos de Boleta</Text>

                            {/* Área (Urbana/Rural) */}
                            <Controller
                                control={control}
                                name="area"
                                render={({ field: { onChange, value } }) => (
                                    <View style={styles.pickerContainer}>
                                        <Text>Área</Text>
                                        <Picker selectedValue={value || ''} onValueChange={onChange}>
                                            <Picker.Item label="Seleccionar..." value="" />
                                            {AREAS.map(a => <Picker.Item key={a.value} label={a.label} value={a.value} />)}
                                        </Picker>
                                    </View>
                                )}
                            />

                            {/* Material de vía */}
                            <Controller
                                control={control}
                                name="material_via"
                                render={({ field: { onChange, value } }) => (
                                    <View style={styles.pickerContainer}>
                                        <Text>Material de la Vía</Text>
                                        <Picker selectedValue={value || ''} onValueChange={onChange}>
                                            <Picker.Item label="Seleccionar..." value="" />
                                            {MATERIALES_VIA.map(m => <Picker.Item key={m.value} label={m.label} value={m.value} />)}
                                        </Picker>
                                    </View>
                                )}
                            />

                            {/* Grupo Operativo */}
                            <Controller
                                control={control}
                                name="no_grupo_operativo"
                                render={({ field: { onChange, value } }) => (
                                    <PaperInput
                                        label="No. Grupo Operativo"
                                        value={value || ''}
                                        onChangeText={onChange}
                                        style={styles.input}
                                        placeholder="Ej: G-1, G-2..."
                                    />
                                )}
                            />

                            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Obstrucción de Vía</Text>
                            <ObstruccionManager
                                value={watch('obstruye')}
                                onChange={(val) => setValue('obstruye', val)}
                            />
                        </View>
                    )}

                    {activeTab === 'vehiculos' && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Vehículos Involucrados ({vehiculoFields.length})</Text>
                            {vehiculoFields.map((field, index) => (
                                <VehiculoForm
                                    key={field.id}
                                    control={control}
                                    index={index}
                                    onRemove={() => removeVehiculo(index)}
                                />
                            ))}
                            <Button mode="contained" onPress={() => appendVehiculo({
                                tipo_vehiculo: '',
                                color: '',
                                marca: '',
                                placa: '',
                                placa_extranjera: false,
                                estado_piloto: 'ILESO',
                                personas_asistidas: 0,
                                cargado: false,
                                tiene_contenedor: false,
                                es_bus: false,
                                tiene_sancion: false,
                            })} icon="plus" style={styles.addButton}>
                                Agregar Vehículo
                            </Button>
                        </View>
                    )}

                    {activeTab === 'recursos' && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Grúas ({gruaFields.length})</Text>
                            {gruaFields.map((field, index) => (
                                <GruaForm key={field.id} control={control} index={index} onRemove={() => removeGrua(index)} />
                            ))}
                            <Button mode="outlined" onPress={() => appendGrua({})} icon="tow-truck" style={styles.addButton}>
                                Agregar Grúa
                            </Button>

                            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Ajustadores ({ajustadorFields.length})</Text>
                            {ajustadorFields.map((field, index) => (
                                <AjustadorForm key={field.id} control={control} index={index} onRemove={() => removeAjustador(index)} />
                            ))}
                            <Button mode="outlined" onPress={() => appendAjustador({})} icon="account-tie" style={styles.addButton}>
                                Agregar Ajustador
                            </Button>

                            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Autoridades y Socorro</Text>
                            {/* Reusing existing managers but wrapping them in Controllers if possible, or just passing state setters if they are complex */}
                            {/* For simplicity, keeping the existing managers but syncing with form state might be tricky. 
                                Ideally, AutoridadSocorroManager should accept value/onChange.
                                For now, I'll just render them and let them update their own state, 
                                but I need to sync that state to the form data on submit or via useEffect.
                            */}
                            <AutoridadSocorroManager
                                tipo="autoridad"
                                seleccionados={watch('autoridadesSeleccionadas')}
                                detalles={watch('detallesAutoridades')}
                                onSelectionChange={(val) => setValue('autoridadesSeleccionadas', val)}
                                onDetallesChange={(val) => setValue('detallesAutoridades', val)}
                            />
                            <AutoridadSocorroManager
                                tipo="socorro"
                                seleccionados={watch('socorroSeleccionado')}
                                detalles={watch('detallesSocorro')}
                                onSelectionChange={(val) => setValue('socorroSeleccionado', val)}
                                onDetallesChange={(val) => setValue('detallesSocorro', val)}
                            />
                        </View>
                    )}

                    {activeTab === 'otros' && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Daños y Obstrucción</Text>

                            <View style={styles.row}>
                                <Text>Daños Materiales</Text>
                                <Controller
                                    control={control}
                                    name="daniosMateriales"
                                    render={({ field: { onChange, value } }) => (
                                        <Switch value={value || false} onValueChange={onChange} />
                                    )}
                                />
                            </View>

                            <View style={styles.row}>
                                <Text>Daños Infraestructura</Text>
                                <Controller
                                    control={control}
                                    name="daniosInfraestructura"
                                    render={({ field: { onChange, value } }) => (
                                        <Switch value={value || false} onValueChange={onChange} />
                                    )}
                                />
                            </View>

                            {daniosInfraestructura && (
                                <Controller
                                    control={control}
                                    name="descripcionDaniosInfra"
                                    render={({ field: { onChange, value } }) => (
                                        <PaperInput label="Descripción Daños" value={value || ''} onChangeText={onChange} multiline style={styles.input} />
                                    )}
                                />
                            )}

                            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Observaciones</Text>
                            <Controller
                                control={control}
                                name="observaciones"
                                render={({ field: { onChange, value } }) => (
                                    <PaperInput label="Observaciones" value={value || ''} onChangeText={onChange} multiline numberOfLines={4} style={styles.textArea} />
                                )}
                            />
                        </View>
                    )}

                    {activeTab === 'evidencia' && situacionId && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Evidencia Fotográfica y Video</Text>
                            <Text style={{ color: COLORS.gray[500], marginBottom: 12, fontSize: 13 }}>
                                Se requieren 3 fotos y 1 video para completar la documentación del incidente.
                            </Text>
                            <MultimediaCapture
                                situacionId={situacionId}
                                tipoSituacion="INCIDENTE"
                                onComplete={setMultimediaComplete}
                                location={coordenadas ? { latitude: coordenadas.latitud, longitude: coordenadas.longitud } : undefined}
                            />
                        </View>
                    )}

                    {activeTab === 'evidencia' && !situacionId && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Evidencia Fotográfica y Video</Text>
                            <View style={{ padding: 20, backgroundColor: COLORS.gray[100], borderRadius: 8, alignItems: 'center' }}>
                                <Text style={{ color: COLORS.gray[600], textAlign: 'center' }}>
                                    Primero guarda el incidente para poder agregar fotos y video.
                                </Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.buttonContainer}>
                        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.button}>Cancelar</Button>
                        <Button mode="contained" onPress={handleSubmit(onSubmit)} loading={guardando} disabled={guardando} style={styles.button}>
                            {editMode ? 'Actualizar Incidente' : 'Guardar Incidente'}
                        </Button>
                    </View>
                    <View style={{ height: 80 }} />
                </ScrollView>
            </View>
        </PaperProvider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    tabContainer: { padding: 10, backgroundColor: '#fff' },
    content: { padding: 16 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: COLORS.text.primary },
    label: { fontSize: 14, fontWeight: '500', color: COLORS.text.primary, marginBottom: 6, marginTop: 8 },
    input: { marginBottom: 10, backgroundColor: '#fff' },
    picker: { color: COLORS.text.primary },
    pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 5, marginBottom: 10, padding: 5, backgroundColor: '#fff' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    half: { width: '48%' },
    addButton: { marginTop: 10 },
    textArea: { backgroundColor: '#fff' },
    buttonContainer: { flexDirection: 'row', gap: 10, marginBottom: 40, marginTop: 20 },
    button: { flex: 1 },
    gpsIndicator: { padding: 10, borderRadius: 5, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    gpsOk: { backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#4caf50' },
    gpsError: { backgroundColor: '#ffebee', borderWidth: 1, borderColor: '#ef5350' },
    gpsText: { fontSize: 12 },
    infoBox: { padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8, borderLeftWidth: 4, borderLeftColor: COLORS.primary, marginBottom: 10 },
    infoLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 },
    infoValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.text.primary, marginBottom: 4 },
    infoHelper: { fontSize: 11, color: '#999', fontStyle: 'italic' },
    // Estilos para modo pruebas GPS manual
    testModeGps: { padding: 12, backgroundColor: '#fff3e0', borderRadius: 8, borderWidth: 1, borderColor: '#ff9800', marginBottom: 10 },
    testModeLabel: { fontSize: 14, fontWeight: '600', color: '#e65100', marginBottom: 8 },
    coordsRow: { flexDirection: 'row', gap: 12 },
    coordField: { flex: 1 },
    coordLabel: { fontSize: 12, fontWeight: '500', color: '#666', marginBottom: 4 },
    coordInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, fontSize: 14 },
});
