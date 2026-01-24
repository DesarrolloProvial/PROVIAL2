/**
 * SituacionDinamicaScreen
 *
 * Pantalla ÚNICA para TODAS las situaciones.
 * Renderiza dinámicamente cualquier formulario basado en configuración.
 *
 * Integrado con:
 * - FormBuilder para renderizado dinámico
 * - useDraftSituacion para offline-first
 * - Manejo de conflictos
 *
 * Fecha: 2026-01-22
 * OPTIMIZACIÓN: Reemplaza AsistenciaScreen, EmergenciaScreen, IncidenteScreen
 */

import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, StyleSheet, Alert, Text, Modal, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ActivityIndicator, Button, Chip } from 'react-native-paper';
import * as Location from 'expo-location';

import { FormBuilder } from '../../core/FormBuilder';
import { getFormConfigForSituation } from '../../config/formularios';
import { SituacionDinamicaParams, BrigadaStackParamList } from '../../types/navigation';
import { COLORS } from '../../constants/colors';
import api from '../../services/api';

// Offline-First
import { useDraftSituacion } from '../../hooks/useDraftSituacion';
import { TipoSituacion } from '../../services/draftStorage';
import { useAuthStore } from '../../store/authStore';
import { useTestMode } from '../../context/TestModeContext';

type SituacionNavProp = StackNavigationProp<BrigadaStackParamList>;

export default function SituacionDinamicaScreen() {
    const navigation = useNavigation<SituacionNavProp>();
    const route = useRoute<RouteProp<any, any>>(); // Usamos genérico para aceptar Incidente, Emergencia, Asistencia
    const params = route.params as SituacionDinamicaParams;

    const {
        codigoSituacion,
        tipoSituacionId,
        nombreSituacion,
        tipoSituacion,
        editMode,
        situacionId,
        situacionData
    } = params || {};

    const { salidaActiva } = useAuthStore();
    const { testModeEnabled } = useTestMode();

    // Offline-First Hook
    const {
        draft,
        loading: draftLoading,
        saving,
        sending,
        isOnline,
        hasPendiente,
        canCreateNew,
        crearDraft,
        actualizarDraft,
        enviarDraft,
        eliminarDraft,
        loadDraft,
        resolverConflictoUsarLocal,
        resolverConflictoUsarServidor,
        resolverConflictoEsperar,
    } = useDraftSituacion();

    // Estado local
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showPendingModal, setShowPendingModal] = useState(false);
    const [showConflictModal, setShowConflictModal] = useState(false);
    const [coordenadas, setCoordenadas] = useState<{ latitud: number; longitud: number } | null>(null);
    const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);
    const [initialValues, setInitialValues] = useState<any>({});

    // Header Title
    useLayoutEffect(() => {
        navigation.setOptions({
            title: nombreSituacion || 'Nueva Situación',
            headerShown: true,
        });
    }, [navigation, nombreSituacion]);

    // Helper para transformar datos de DB a Formulario
    const transformarDatosParaFormulario = (data: any) => {
        console.log('[TRANSFORM] Datos de entrada:', JSON.stringify(data, null, 2));
        const formValues: Record<string, any> = {};

        // === CAMPOS BÁSICOS ===
        // Copiar campos que tienen el mismo nombre
        const camposDirectos = [
            'sentido', 'observaciones', 'descripcion',
            'clima', 'carga_vehicular', 'area', 'material_via',
            'tipo_asistencia', 'tipo_hecho', 'tipo_emergencia',
            'apoyo_proporcionado'
        ];

        camposDirectos.forEach(campo => {
            if (data[campo] !== undefined && data[campo] !== null) {
                formValues[campo] = data[campo];
            }
        });

        // === COORDENADAS (DB planos -> Form objeto GPS) ===
        if (data.latitud && data.longitud) {
            formValues.coordenadas = {
                latitude: parseFloat(data.latitud),
                longitude: parseFloat(data.longitud),
                accuracy: null,
                timestamp: data.created_at ? new Date(data.created_at).getTime() : Date.now()
            };
        }

        // === OBSTRUCCIÓN (DB obstruccion_data -> Form obstruccion) ===
        if (data.obstruccion_data) {
            formValues.obstruccion = typeof data.obstruccion_data === 'string'
                ? JSON.parse(data.obstruccion_data)
                : data.obstruccion_data;
            // Activar el switch para hacer visible la sección
            formValues.obstruye = true;
        }

        // === CAMPOS NUMÉRICOS ===
        if (data.km !== undefined && data.km !== null) {
            formValues.km = Number(data.km);
        }
        if (data.departamento_id) {
            formValues.departamento_id = Number(data.departamento_id);
        }
        if (data.municipio_id) {
            formValues.municipio_id = Number(data.municipio_id);
        }

        // === DETALLES (vienen organizados en objeto 'detalles') ===
        if (data.detalles) {
            // Datos específicos guardados en 'otros' (apoyo, area, material, etc.)
            if (data.detalles.otros) {
                const otros = data.detalles.otros;
                if (otros.apoyo_proporcionado) formValues.apoyo_proporcionado = otros.apoyo_proporcionado;
                if (otros.area) formValues.area = otros.area;
                if (otros.material_via) formValues.material_via = otros.material_via;
                if (otros.tipo_asistencia) formValues.tipo_asistencia = otros.tipo_asistencia;
                if (otros.tipo_hecho) formValues.tipo_hecho = otros.tipo_hecho;
                if (otros.tipo_emergencia) formValues.tipo_emergencia = otros.tipo_emergencia;
            }

            // Vehículos
            if (data.detalles.vehiculos && Array.isArray(data.detalles.vehiculos)) {
                formValues.vehiculos = data.detalles.vehiculos;
            }
            // Grúas
            if (data.detalles.gruas && Array.isArray(data.detalles.gruas)) {
                formValues.gruas = data.detalles.gruas;
            }
            // Ajustadores
            if (data.detalles.ajustadores && Array.isArray(data.detalles.ajustadores)) {
                formValues.ajustadores = data.detalles.ajustadores;
            }
            // Autoridades y Socorro
            if (data.detalles.autoridades_socorro) {
                const as = data.detalles.autoridades_socorro;
                formValues.autoridadesSeleccionadas = as.autoridades || [];
                formValues.detallesAutoridades = as.detallesAutoridades || {};
                formValues.socorroSeleccionado = as.socorro || [];
                formValues.detallesSocorro = as.detallesSocorro || {};
            }
            // Subtipo/Tipo de incidente
            if (data.detalles.subtipo) {
                formValues.tipoIncidente = data.detalles.subtipo.subtipo;
            }
        }

        console.log('[TRANSFORM] Valores transformados:', JSON.stringify(formValues, null, 2));
        return formValues;
    };

    // Cargar config del formulario
    useEffect(() => {
        if (codigoSituacion) {
            const formConfig = getFormConfigForSituation(codigoSituacion);
            if (!formConfig) {
                console.warn(`[SITUACION] No existe config para: ${codigoSituacion}`);
                Alert.alert('Error', 'Formulario no disponible para este tipo de situación');
                navigation.goBack();
                return;
            }
            setConfig(formConfig);
        }
    }, [codigoSituacion, navigation]);

    // Cargar datos para EDICIÓN (cuando hay situacionData)
    useEffect(() => {
        const cargarDatosEdicion = async () => {
            if (!editMode || !situacionData) return;

            console.log('[SITUACION] Modo edición - cargando datos existentes:', situacionData.id);
            setLoading(true);

            try {
                // Intentar cargar los detalles completos desde la API
                let datosCompletos = { ...situacionData };

                if (situacionId) {
                    try {
                        const response = await api.get(`/situaciones/${situacionId}`);
                        if (response.data?.situacion) {
                            datosCompletos = response.data.situacion;
                            console.log('[SITUACION] Datos completos de API:', JSON.stringify(datosCompletos, null, 2));
                        }
                    } catch (apiError) {
                        console.warn('[SITUACION] No se pudieron cargar detalles de API, usando datos locales:', apiError);
                    }
                }

                const transformed = transformarDatosParaFormulario(datosCompletos);
                console.log('[SITUACION] Datos transformados para edición:', JSON.stringify(transformed, null, 2));
                setInitialValues(transformed);

                // Si hay coordenadas, actualizarlas también
                if (datosCompletos.latitud && datosCompletos.longitud) {
                    setCoordenadas({
                        latitud: parseFloat(datosCompletos.latitud),
                        longitud: parseFloat(datosCompletos.longitud),
                    });
                }
            } catch (error) {
                console.error('[SITUACION] Error cargando datos de edición:', error);
            } finally {
                setLoading(false);
            }
        };

        cargarDatosEdicion();
    }, [editMode, situacionData, situacionId]);

    // Verificar draft pendiente (solo si NO es modo edición)
    useEffect(() => {
        const checkDraft = async () => {
            if (editMode) {
                // En modo edición no verificamos drafts
                return;
            }

            setLoading(true);
            try {
                const check = await canCreateNew();

                if (!check.allowed && draft) {
                    if (draft.tipo_situacion === tipoSituacion) {
                        // Draft del mismo tipo - cargar datos
                        console.log('[SITUACION] Cargando draft existente:', draft.id);
                        cargarDraftEnFormulario(draft);
                    } else {
                        // Draft de otro tipo - mostrar modal
                        setShowPendingModal(true);
                    }
                }

                // Verificar conflicto
                if (draft?.estado === 'CONFLICTO') {
                    setShowConflictModal(true);
                }
            } catch (error) {
                console.error('[SITUACION] Error verificando draft:', error);
            } finally {
                setLoading(false);
            }
        };

        checkDraft();
    }, [editMode, draft, tipoSituacion, canCreateNew]);

    // Obtener GPS al iniciar
    useEffect(() => {
        if (!testModeEnabled && !editMode) {
            obtenerUbicacion();
        }
    }, [testModeEnabled, editMode]);

    /**
     * Cargar datos del draft en el formulario
     */
    const cargarDraftEnFormulario = (draftData: any) => {
        setInitialValues({
            km: draftData.km?.toString() || '',
            sentido: draftData.sentido || '',
            observaciones: draftData.observaciones || '',
            descripcion: draftData.descripcion || '',
            // Campos específicos según tipo
            tipo_hecho: draftData.tipo_hecho || '',
            tipo_asistencia: draftData.tipo_asistencia || '',
            tipo_emergencia: draftData.tipo_emergencia || '',
            vehiculos: draftData.vehiculos || [],
            autoridades: draftData.autoridades || [],
            // ... otros campos del draft
        });

        if (draftData.latitud && draftData.longitud) {
            setCoordenadas({
                latitud: draftData.latitud,
                longitud: draftData.longitud,
            });
        }
    };

    /**
     * Obtener ubicación GPS
     */
    const obtenerUbicacion = async () => {
        try {
            setObteniendoUbicacion(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permisos requeridos', 'Se necesita acceso a la ubicación');
                return;
            }
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High
            });
            setCoordenadas({
                latitud: location.coords.latitude,
                longitud: location.coords.longitude,
            });
        } catch (error) {
            console.error('[SITUACION] Error GPS:', error);
        } finally {
            setObteniendoUbicacion(false);
        }
    };

    /**
     * Manejar envío del formulario
     */
    const handleSubmit = async (formData: any) => {
        // Validaciones básicas
        if (!editMode && !salidaActiva) {
            Alert.alert('Error', 'No hay salida activa. Debes iniciar una salida primero.');
            return;
        }

        if (!editMode && !salidaActiva?.ruta_codigo && !salidaActiva?.ruta_id) {
            Alert.alert('Error', 'No tienes ruta asignada.');
            return;
        }

        // Obtener coordenadas
        const latitud = testModeEnabled
            ? (formData.latitud_manual || 14.6349)
            : (coordenadas?.latitud || formData.coordenadas?.latitud);
        const longitud = testModeEnabled
            ? (formData.longitud_manual || -90.5069)
            : (coordenadas?.longitud || formData.coordenadas?.longitud);

        if (!latitud || !longitud) {
            Alert.alert('Error', 'Se requieren coordenadas GPS válidas');
            return;
        }

        try {
            if (editMode && situacionId) {
                console.log('[SITUACION] Actualizando situación existente:', situacionId);
                setLoading(true);

                // Preparar payload para actualización
                const payload = {
                    km: parseFloat(formData.km) || 0,
                    sentido: formData.sentido,
                    latitud,
                    longitud,
                    observaciones: formData.observaciones,
                    descripcion: formData.descripcion,
                    // Campos específicos
                    tipo_hecho: formData.tipo_hecho || formData.tipoIncidente,
                    tipo_asistencia: formData.tipo_asistencia || formData.tipoAsistencia,
                    tipo_emergencia: formData.tipo_emergencia || formData.tipoEmergencia,
                    vehiculos: formData.vehiculos,
                    // Estructura nueva para backend
                    autoridades_socorro: {
                        autoridades: formData.autoridadesSeleccionadas || [],
                        detalles_autoridades: formData.detallesAutoridades || {},
                        socorro: formData.socorroSeleccionado || [],
                        detalles_socorro: formData.detallesSocorro || {}
                    },
                    danios: {
                        materiales: formData.danios_materiales,
                        infraestructura: formData.danios_infraestructura,
                        descripcion_infra: formData.descripcion_danios_infra
                    },
                    // Campos específicos de asistencia/otros
                    area: formData.area,
                    material_via: formData.material_via,
                    apoyo_proporcionado: formData.apoyo_proporcionado,
                    obstruccion: formData.obstruye ? formData.obstruccion : null,
                    jurisdiccion: formData.jurisdiccion,

                    // Asegurar envío de tipoIncidente para subtipo
                    tipoIncidente: formData.tipoIncidente,
                    subtipo_situacion: formData.subtipo_situacion
                };

                console.log('[SITUACION] Enviando update:', JSON.stringify(payload, null, 2));

                await api.patch(`/situaciones/${situacionId}`, payload);

                Alert.alert(
                    'Éxito',
                    'Situación actualizada correctamente',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
                return;
            }

            // === FLUJO OFFLINE-FIRST (CREACIÓN) ===
            console.log('[SITUACION] Iniciando flujo offline-first (Creación)');

            // 1. Crear draft si no existe
            if (!draft) {
                console.log('[SITUACION] Creando nuevo draft');
                await crearDraft({
                    tipo_situacion: tipoSituacion,
                    tipo_situacion_id: tipoSituacionId, // Asegurar que viaja el ID
                    unidad_codigo: salidaActiva!.unidad_codigo,
                    ruta_id: salidaActiva!.ruta_id,
                    ruta_nombre: salidaActiva!.ruta_codigo,
                    km: parseFloat(formData.km) || 0,
                    sentido: formData.sentido || '',
                    latitud,
                    longitud,
                });
            }

            // 2. Actualizar draft con todos los datos del formulario
            console.log('[SITUACION] Actualizando draft con datos del formulario');
            await actualizarDraft({
                km: parseFloat(formData.km) || 0,
                sentido: formData.sentido,
                latitud,
                longitud,
                ubicacion_manual: testModeEnabled,
                observaciones: formData.observaciones,
                descripcion: formData.descripcion,
                // Campos específicos por tipo
                tipo_hecho: formData.tipo_hecho || formData.tipoIncidente,
                tipo_asistencia: formData.tipo_asistencia || formData.tipoAsistencia,
                tipo_emergencia: formData.tipo_emergencia || formData.tipoEmergencia,
                vehiculos: formData.vehiculos,
                autoridades: formData.autoridadesSeleccionadas,
                detalles_autoridades: formData.detallesAutoridades,
                socorro: formData.socorroSeleccionado,
                detalles_socorro: formData.detallesSocorro,
                obstruye: formData.obstruye,
                obstruccion: formData.obstruye ? formData.obstruccion : null, // Incluir datos obstruccion
                jurisdiccion: formData.jurisdiccion,

                // Campos nuevos para asistencia
                area: formData.area,
                material_via: formData.material_via,
                apoyo_proporcionado: formData.apoyo_proporcionado,

                // Asegurar tipo_situacion_id
                tipo_situacion_id: tipoSituacionId
            }, true);

            // 3. Intentar enviar
            console.log('[SITUACION] Enviando draft al servidor');
            const result = await enviarDraft();

            if (result.success) {
                Alert.alert(
                    'Éxito',
                    `${nombreSituacion} guardada correctamente.\nNúmero: ${result.numero_situacion || result.situacion_id}`,
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            } else if (result.conflicto) {
                setShowConflictModal(true);
            } else {
                // Error de red - draft guardado localmente
                Alert.alert(
                    'Guardado Localmente',
                    result.error || 'Sin conexión. Se enviará cuando haya conexión.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            }

        } catch (error: any) {
            console.error('[SITUACION] Error:', error);
            Alert.alert('Error', error.message || 'No se pudo guardar');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Modal de draft pendiente
     */
    const renderPendingModal = () => (
        <Modal visible={showPendingModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Draft Pendiente</Text>
                    <Text style={styles.modalText}>
                        Tienes una situación de tipo "{draft?.tipo_situacion}" sin enviar.
                        {'\n\n'}
                        Debes enviarla o eliminarla antes de crear una nueva.
                    </Text>
                    <View style={styles.modalButtons}>
                        <Button
                            mode="outlined"
                            onPress={async () => {
                                await eliminarDraft();
                                setShowPendingModal(false);
                            }}
                            style={styles.modalButton}
                        >
                            Eliminar Draft
                        </Button>
                        <Button
                            mode="contained"
                            onPress={() => {
                                setShowPendingModal(false);
                                navigation.goBack();
                            }}
                            style={styles.modalButton}
                        >
                            Volver
                        </Button>
                    </View>
                </View>
            </View>
        </Modal>
    );

    /**
     * Modal de conflicto
     */
    const renderConflictModal = () => (
        <Modal visible={showConflictModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Conflicto Detectado</Text>
                    <Text style={styles.modalText}>
                        Esta situación ya existe en el servidor con datos diferentes.
                    </Text>

                    {draft?.conflicto?.diferencias && (
                        <ScrollView style={styles.diferenciasContainer}>
                            <Text style={styles.diferenciasTitle}>Diferencias:</Text>
                            {draft.conflicto.diferencias.map((dif, idx) => (
                                <Text key={idx} style={styles.diferenciaItem}>
                                    • {dif.campo}: Local={String(dif.local)} vs Servidor={String(dif.servidor)}
                                </Text>
                            ))}
                        </ScrollView>
                    )}

                    <View style={styles.modalButtonsVertical}>
                        <Button
                            mode="contained"
                            onPress={async () => {
                                const ok = await resolverConflictoUsarLocal();
                                if (ok) {
                                    setShowConflictModal(false);
                                    Alert.alert('Éxito', 'Datos locales enviados', [
                                        { text: 'OK', onPress: () => navigation.goBack() }
                                    ]);
                                }
                            }}
                            style={styles.modalButtonFull}
                        >
                            Usar Mis Datos
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={async () => {
                                await resolverConflictoUsarServidor();
                                setShowConflictModal(false);
                                Alert.alert('OK', 'Se mantuvieron datos del servidor', [
                                    { text: 'OK', onPress: () => navigation.goBack() }
                                ]);
                            }}
                            style={styles.modalButtonFull}
                        >
                            Usar Datos del Servidor
                        </Button>
                        <Button
                            mode="text"
                            onPress={async () => {
                                const ok = await resolverConflictoEsperar();
                                if (ok) {
                                    setShowConflictModal(false);
                                    Alert.alert('Enviado al COP', 'Un operador resolverá el conflicto', [
                                        { text: 'OK', onPress: () => navigation.goBack() }
                                    ]);
                                }
                            }}
                            style={styles.modalButtonFull}
                        >
                            Esperar Decisión del COP
                        </Button>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // Loading
    if (loading || draftLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Cargando...</Text>
            </View>
        );
    }

    // Sin config
    if (!config) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Formulario no disponible</Text>
                <Button mode="contained" onPress={() => navigation.goBack()}>
                    Volver
                </Button>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Status Bar */}
            <View style={styles.statusBar}>
                <Chip
                    icon={isOnline ? 'wifi' : 'wifi-off'}
                    style={[styles.statusChip, isOnline ? styles.onlineChip : styles.offlineChip]}
                    textStyle={styles.chipText}
                >
                    {isOnline ? 'Online' : 'Offline'}
                </Chip>
                {saving && (
                    <Chip icon="content-save" style={[styles.statusChip, styles.savingChip]} textStyle={styles.chipText}>
                        Guardando...
                    </Chip>
                )}
                {draft && (
                    <Chip icon="file-document-outline" style={[styles.statusChip, styles.draftChip]} textStyle={styles.chipText}>
                        Draft: {draft.estado}
                    </Chip>
                )}
                {obteniendoUbicacion && (
                    <Chip icon="crosshairs-gps" style={[styles.statusChip, styles.gpsChip]} textStyle={styles.chipText}>
                        GPS...
                    </Chip>
                )}
                {coordenadas && (
                    <Chip icon="map-marker" style={[styles.statusChip, styles.gpsOkChip]} textStyle={styles.chipText}>
                        GPS OK
                    </Chip>
                )}
            </View>

            {/* Ruta Info */}
            {salidaActiva?.ruta_codigo && (
                <View style={styles.rutaInfo}>
                    <Text style={styles.rutaLabel}>Ruta:</Text>
                    <Text style={styles.rutaValue}>{salidaActiva.ruta_codigo}</Text>
                </View>
            )}

            {/* FormBuilder */}
            <FormBuilder
                config={config}
                onSubmit={handleSubmit}
                loading={sending}
                initialValues={initialValues}
            />

            {renderPendingModal()}
            {renderConflictModal()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.text.secondary,
    },
    errorText: {
        fontSize: 16,
        color: COLORS.text.secondary,
        marginBottom: 20,
    },
    statusBar: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        padding: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    statusChip: {
        height: 28,
    },
    chipText: {
        fontSize: 11,
    },
    onlineChip: { backgroundColor: '#e8f5e9' },
    offlineChip: { backgroundColor: '#ffebee' },
    savingChip: { backgroundColor: '#e3f2fd' },
    draftChip: { backgroundColor: '#fff3e0' },
    gpsChip: { backgroundColor: '#f3e5f5' },
    gpsOkChip: { backgroundColor: '#e8f5e9' },
    rutaInfo: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: COLORS.primaryLight + '15',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    rutaLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text.secondary,
        marginRight: 8,
    },
    rutaValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        color: COLORS.text.primary,
    },
    modalText: {
        fontSize: 14,
        color: COLORS.text.secondary,
        marginBottom: 20,
        lineHeight: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    modalButton: {
        flex: 1,
    },
    modalButtonsVertical: {
        gap: 10,
    },
    modalButtonFull: {
        width: '100%',
    },
    diferenciasContainer: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        maxHeight: 150,
    },
    diferenciasTitle: {
        fontWeight: 'bold',
        marginBottom: 8,
        color: COLORS.text.primary,
    },
    diferenciaItem: {
        fontSize: 12,
        color: COLORS.text.secondary,
        marginBottom: 4,
    },
});
