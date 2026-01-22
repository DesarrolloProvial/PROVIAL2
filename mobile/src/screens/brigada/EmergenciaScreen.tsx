import React, { useState, useEffect } from 'react';
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
import api from '../../services/api';
import {
    TIPOS_EMERGENCIA,
    SENTIDOS,
} from '../../constants/situacionTypes';
import { useAuthStore } from '../../store/authStore';
import { useTestMode } from '../../context/TestModeContext';
import AutoridadSocorroManager, { DetalleAutoridad, DetallesSocorro } from '../../components/AutoridadSocorroManager';
import ObstruccionManager from '../../components/ObstruccionManager';

// New Imports
import { useForm, Controller } from 'react-hook-form';
import { Provider as PaperProvider, SegmentedButtons, TextInput as PaperInput, Button, Switch, Chip } from 'react-native-paper';
import MultimediaCapture from '../../components/MultimediaCapture';
import MultimediaCaptureOffline from '../../components/MultimediaCaptureOffline';

// Offline-First Imports
import { saveDraft, addToSyncQueue, type Draft } from '../../services/database';
import { useSyncQueue } from '../../hooks/useSyncQueue';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

// Route params type for edit mode
type EmergenciaScreenRouteProp = RouteProp<{
    EmergenciaScreen: {
        editMode?: boolean;
        situacionId?: number;
        situacionData?: any;
    };
}, 'EmergenciaScreen'>;

export default function EmergenciaScreen() {
    const navigation = useNavigation();
    const route = useRoute<EmergenciaScreenRouteProp>();
    const { editMode, situacionId: situacionIdParam, situacionData } = route.params || {};

    const { salidaActiva, usuario } = useAuthStore();
    const { testModeEnabled } = useTestMode();

    // OFFLINE-FIRST: UUID del draft y estado de sincronización
    const [draftUuid] = useState<string>(() => editMode ? '' : uuidv4());
    const { isOnline, isSyncing, pendingDrafts, forceSync } = useSyncQueue();

    // Estado para situacionId (se obtiene después de crear o desde params en editMode)
    const [situacionId, setSituacionId] = useState<number | null>(editMode && situacionIdParam ? situacionIdParam : null);
    const [multimediaComplete, setMultimediaComplete] = useState(false);

    // Coordenadas manuales para modo pruebas
    const [latitudManual, setLatitudManual] = useState('14.6349');
    const [longitudManual, setLongitudManual] = useState('-90.5069');

    // Form Setup
    const { control, handleSubmit, setValue, watch, reset, getValues } = useForm({
        defaultValues: {
            tipoEmergencia: '',
            rutaId: null, // Se auto-asignará desde salida activa
            kmInicio: '',
            kmFin: '',
            esRango: false,
            sentido: '',
            autoridadesSeleccionadas: [],
            detallesAutoridades: {},
            socorroSeleccionado: [],
            detallesSocorro: {},
            obstruye: '',
            observaciones: '',
            jurisdiccion: '', // New field
        }
    });

    // Auto-asignar ruta desde salida activa
    useEffect(() => {
        // Note: rutaId se obtiene dinámicamente desde salidaActiva, no se necesita asignar en el form
        // La ruta se mostrará solo como información de solo lectura
    }, [salidaActiva]);

    // Watchers
    const esRango = watch('esRango');

    // UI State
    const [activeTab, setActiveTab] = useState('general');
    const [guardando, setGuardando] = useState(false);
    const [coordenadas, setCoordenadas] = useState<{ latitud: number; longitud: number } | null>(null);
    const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);

    // Draft Save - EXCLUIR coordenadas (siempre obtener GPS fresco)
    const formData = watch();
    const { coordenadas: _, ...draftData } = formData || {};

    const { loadDraft, clearDraft } = useDraftSave(
        'draft_emergencia_v2',
        draftData,
        { enabled: !guardando }
    );

    useEffect(() => {
        // Si estamos en modo edición, cargar los datos de la situación
        if (editMode && situacionData) {
            console.log('[EDIT MODE] Cargando datos de emergencia:', situacionData);
            reset({
                tipoEmergencia: situacionData.tipo_emergencia || situacionData.tipo_situacion || '',
                rutaId: situacionData.ruta_id,
                kmInicio: situacionData.km?.toString() || '',
                kmFin: situacionData.km_fin?.toString() || '',
                esRango: !!situacionData.km_fin,
                sentido: situacionData.sentido || '',
                autoridadesSeleccionadas: situacionData.autoridades_seleccionadas || [],
                detallesAutoridades: situacionData.detalles_autoridades || {},
                socorroSeleccionado: situacionData.socorro_seleccionado || [],
                detallesSocorro: situacionData.detalles_socorro || {},
                obstruye: situacionData.obstruye || '',
                observaciones: situacionData.observaciones || '',
                jurisdiccion: situacionData.jurisdiccion || '',
            });
            // Cargar coordenadas si existen
            if (situacionData.latitud && situacionData.longitud) {
                setCoordenadas({
                    latitud: parseFloat(situacionData.latitud),
                    longitud: parseFloat(situacionData.longitud),
                });
                setLatitudManual(situacionData.latitud.toString());
                setLongitudManual(situacionData.longitud.toString());
            }
            return; // No cargar borrador ni GPS en modo edición
        }

        // Auto-restaurar borrador sin diálogo de confirmación (solo en modo creación)
        const loadPreviousDraft = async () => {
            const draft = await loadDraft();
            if (draft) {
                console.log('[DRAFT] Auto-restaurando borrador de emergencia');
                reset(draft);
            }
        };
        loadPreviousDraft();
        // Solo obtener GPS automatico si NO esta en modo pruebas
        if (!testModeEnabled) {
            obtenerUbicacion();
        }
    }, [testModeEnabled, editMode, situacionData]);

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
        // En modo edición, no requerimos salida activa
        if (!editMode) {
            // Validar que haya salida activa y ruta (solo en creación)
            if (!salidaActiva) {
                Alert.alert('Error', 'No hay salida activa. Debes iniciar una salida primero.');
                return;
            }
            if (!salidaActiva.ruta_codigo) {
                Alert.alert('Error', 'No tienes ruta asignada. Ve a "Cambio de Ruta" para asignar una ruta primero.');
                return;
            }
        }
        if (!data.tipoEmergencia || !data.kmInicio) {
            Alert.alert('Error', 'Complete los campos obligatorios (Tipo, Km)');
            return;
        }
        if (data.esRango && !data.kmFin) {
            Alert.alert('Error', 'Debes ingresar el kilómetro final del rango');
            return;
        }
        // Determinar coordenadas segun modo
        const latFinal = testModeEnabled ? parseFloat(latitudManual) : coordenadas?.latitud;
        const lonFinal = testModeEnabled ? parseFloat(longitudManual) : coordenadas?.longitud;

        if (!latFinal || !lonFinal || isNaN(latFinal) || isNaN(lonFinal)) {
            Alert.alert('Error', 'Se requieren coordenadas GPS válidas');
            return;
        }

        try {
            setGuardando(true);

            if (editMode && situacionId) {
                // Modo edición: actualizar situación existente
                const updateData = {
                    tipo_emergencia: data.tipoEmergencia,
                    km: parseFloat(data.kmInicio),
                    km_fin: data.esRango ? parseFloat(data.kmFin) : null,
                    sentido: data.sentido || null,
                    obstruye: data.obstruye || null,
                    observaciones: data.observaciones || null,
                    jurisdiccion: data.jurisdiccion || null,
                    autoridades_seleccionadas: data.autoridadesSeleccionadas,
                    detalles_autoridades: data.detallesAutoridades,
                    socorro_seleccionado: data.socorroSeleccionado,
                    detalles_socorro: data.detallesSocorro,
                    latitud: latFinal,
                    longitud: lonFinal,
                };

                console.log('Actualizando emergencia:', situacionId, updateData);
                await api.patch(`/situaciones/${situacionId}`, updateData);
                Alert.alert('Éxito', 'Emergencia actualizada', [{ text: 'OK', onPress: () => navigation.goBack() }]);
            } else {
                // OFFLINE-FIRST: Guardar localmente primero
                const emergenciaData = {
                    tipoEmergencia: data.tipoEmergencia,
                    kmInicio: parseFloat(data.kmInicio),
                    kmFin: data.esRango ? parseFloat(data.kmFin) : null,
                    esRango: data.esRango,
                    sentido: data.sentido,
                    jurisdiccion: data.jurisdiccion,
                    obstruye: data.obstruye,
                    observaciones: data.observaciones,
                    autoridadesSeleccionadas: data.autoridadesSeleccionadas,
                    detallesAutoridades: data.detallesAutoridades,
                    socorroSeleccionado: data.socorroSeleccionado,
                    detallesSocorro: data.detallesSocorro,
                    latitud: latFinal,
                    longitud: lonFinal,
                    ubicacion_manual: testModeEnabled,
                    unidad_id: salidaActiva!.unidad_id,
                    salida_unidad_id: salidaActiva!.salida_id,
                    tipo_situacion: 'OTROS',
                    ruta_id: salidaActiva!.ruta_codigo,
                };

                // Crear draft local
                const draft: Omit<Draft, 'created_at' | 'updated_at'> = {
                    draft_uuid: draftUuid,
                    tipo_situacion: 'EMERGENCIA',
                    payload_json: JSON.stringify(emergenciaData),
                    estado_sync: 'LOCAL',
                    usuario_id: usuario?.id || 0,
                    sync_attempts: 0
                };

                console.log('[EMERGENCIA-OFFLINE] Guardando draft local:', draftUuid);
                await saveDraft(draft);
                await addToSyncQueue(draftUuid, 'DRAFT');

                await clearDraft();

                const mensaje = isOnline
                    ? 'Emergencia guardada. Sincronizando...'
                    : 'Emergencia guardada localmente. Se sincronizará cuando haya conexión.';

                Alert.alert('Éxito', mensaje, [{ text: 'OK', onPress: () => navigation.goBack() }]);
            }
        } catch (error: any) {
            console.error('Error guardando emergencia:', error);
            Alert.alert('Error', error.response?.data?.message || error.message || 'No se pudo guardar');
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
                            { value: 'recursos', label: 'Recursos' },
                            { value: 'otros', label: 'Otros' },
                            { value: 'evidencia', label: 'Evidencia' },
                        ]}
                    />
                    {/* OFFLINE-FIRST: Indicadores de estado de sincronización */}
                    <View style={styles.syncIndicators}>
                        <Chip
                            icon={isOnline ? 'wifi' : 'wifi-off'}
                            style={[styles.syncChip, isOnline ? styles.onlineChip : styles.offlineChip]}
                            textStyle={styles.chipText}
                        >
                            {isOnline ? 'Conectado' : 'Sin conexión'}
                        </Chip>
                        {isSyncing && (
                            <Chip icon="sync" style={[styles.syncChip, styles.syncingChip]} textStyle={styles.chipText}>
                                Sincronizando...
                            </Chip>
                        )}
                        {pendingDrafts > 0 && (
                            <Chip
                                icon="cloud-upload"
                                style={[styles.syncChip, styles.pendingChip]}
                                textStyle={styles.chipText}
                                onPress={forceSync}
                            >
                                {pendingDrafts} pendiente{pendingDrafts > 1 ? 's' : ''}
                            </Chip>
                        )}
                    </View>
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
                                name="tipoEmergencia"
                                render={({ field: { onChange, value } }) => (
                                    <View style={styles.pickerContainer}>
                                        <Text>Tipo de Emergencia *</Text>
                                        <Picker selectedValue={value} onValueChange={onChange}>
                                            <Picker.Item label="Seleccionar..." value="" />
                                            {TIPOS_EMERGENCIA.map(t => <Picker.Item key={t} label={t} value={t} />)}
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

                            <View style={styles.checkboxRow}>
                                <Controller
                                    control={control}
                                    name="esRango"
                                    render={({ field: { onChange, value } }) => (
                                        <TouchableOpacity
                                            style={styles.checkboxItem}
                                            onPress={() => onChange(!value)}
                                        >
                                            <View style={[styles.checkbox, value && styles.checkboxChecked]}>
                                                {value && <Text style={styles.checkboxCheck}>✓</Text>}
                                            </View>
                                            <Text style={styles.checkboxLabel}>Área afectada (rango de kilómetros)</Text>
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>

                            <View style={styles.row}>
                                <Controller
                                    control={control}
                                    name="kmInicio"
                                    render={({ field: { onChange, value } }) => (
                                        <PaperInput
                                            label={esRango ? "Km Inicial *" : "Kilómetro *"}
                                            value={value || ''}
                                            onChangeText={onChange}
                                            keyboardType="numeric"
                                            style={[styles.input, esRango ? styles.half : { width: '100%' }]}
                                        />
                                    )}
                                />
                                {esRango && (
                                    <Controller
                                        control={control}
                                        name="kmFin"
                                        render={({ field: { onChange, value } }) => (
                                            <PaperInput
                                                label="Km Final *"
                                                value={value || ''}
                                                onChangeText={onChange}
                                                keyboardType="numeric"
                                                style={[styles.input, styles.half]}
                                            />
                                        )}
                                    />
                                )}
                            </View>

                            <Controller
                                control={control}
                                name="sentido"
                                render={({ field: { onChange, value } }) => (
                                    <View style={styles.pickerContainer}>
                                        <Text>Sentido</Text>
                                        <Picker selectedValue={value || ''} onValueChange={onChange}>
                                            <Picker.Item label="Seleccionar..." value="" />
                                            {SENTIDOS.map(s => <Picker.Item key={s.value} label={s.label} value={s.value} />)}
                                        </Picker>
                                    </View>
                                )}
                            />

                            <Controller
                                control={control}
                                name="jurisdiccion"
                                render={({ field: { onChange, value } }) => (
                                    <PaperInput label="Jurisdicción (Muni/Depto)" value={value || ''} onChangeText={onChange} style={styles.input} />
                                )}
                            />

                            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Obstrucción de Vía</Text>
                            <ObstruccionManager
                                value={watch('obstruye')}
                                onChange={(val) => setValue('obstruye', val)}
                            />
                        </View>
                    )}

                    {activeTab === 'recursos' && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Autoridades y Socorro</Text>
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
                            <Text style={styles.sectionTitle}>Observaciones</Text>
                            <Controller
                                control={control}
                                name="observaciones"
                                render={({ field: { onChange, value } }) => (
                                    <PaperInput label="Observaciones" value={value || ''} onChangeText={onChange} multiline numberOfLines={4} style={styles.textArea} />
                                )}
                            />
                        </View>
                    )}

                    {activeTab === 'evidencia' && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Evidencia Fotográfica y Video</Text>
                            <Text style={{ color: COLORS.gray[500], marginBottom: 12, fontSize: 13 }}>
                                Se requieren 3 fotos y 1 video para completar la documentación.
                            </Text>
                            {editMode && situacionId ? (
                                // Modo edición: usar MultimediaCapture con situacionId
                                <MultimediaCapture
                                    situacionId={situacionId}
                                    tipoSituacion="EMERGENCIA"
                                    onComplete={setMultimediaComplete}
                                    location={coordenadas ? { latitude: coordenadas.latitud, longitude: coordenadas.longitud } : undefined}
                                />
                            ) : (
                                // OFFLINE-FIRST: usar MultimediaCaptureOffline con draftUuid
                                <MultimediaCaptureOffline
                                    draftUuid={draftUuid}
                                    tipoSituacion="EMERGENCIA"
                                    onComplete={setMultimediaComplete}
                                    location={coordenadas ? { latitude: coordenadas.latitud, longitude: coordenadas.longitud } : undefined}
                                />
                            )}
                        </View>
                    )}

                    <View style={styles.buttonContainer}>
                        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.button}>Cancelar</Button>
                        <Button mode="contained" onPress={handleSubmit(onSubmit)} loading={guardando} disabled={guardando} style={styles.button}>
                            {editMode ? 'Actualizar Emergencia' : 'Guardar Emergencia'}
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
    input: { marginBottom: 10, backgroundColor: '#fff' },
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
    checkboxRow: { marginBottom: 10 },
    checkboxItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    checkbox: { width: 24, height: 24, borderWidth: 2, borderColor: COLORS.border, borderRadius: 4, marginRight: 8, justifyContent: 'center', alignItems: 'center' },
    checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    checkboxCheck: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
    checkboxLabel: { fontSize: 14, color: COLORS.text.primary, flex: 1 },
    // Estilos para modo pruebas GPS manual
    testModeGps: { padding: 12, backgroundColor: '#fff3e0', borderRadius: 8, borderWidth: 1, borderColor: '#ff9800', marginBottom: 10 },
    testModeLabel: { fontSize: 14, fontWeight: '600', color: '#e65100', marginBottom: 8 },
    coordsRow: { flexDirection: 'row', gap: 12 },
    coordField: { flex: 1 },
    coordLabel: { fontSize: 12, fontWeight: '500', color: '#666', marginBottom: 4 },
    coordInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, fontSize: 14 },
    // Sync indicators
    syncIndicators: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, paddingHorizontal: 4 },
    syncChip: { height: 28 },
    chipText: { fontSize: 11 },
    onlineChip: { backgroundColor: '#e8f5e9' },
    offlineChip: { backgroundColor: '#ffebee' },
    syncingChip: { backgroundColor: '#e3f2fd' },
    pendingChip: { backgroundColor: '#fff3e0' },
});
