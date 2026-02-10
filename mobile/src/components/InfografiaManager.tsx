// components/InfografiaManager.tsx
// Componente principal para gestionar múltiples infografías
// RECONSTRUIDO: Versión robusta con manejo defensivo de null/undefined y Keys únicas
// FIX v5: Optional Chaining agresivo para evitar ReferenceError: map

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    Alert,
    StyleSheet,
    Modal,
} from 'react-native';
import { Infografia, InfografiaManagerProps, FotoItem, VideoItem } from '../types/multimedia';
import { COLORS } from '../constants/colors';
import {
    validateInfografia,
    createNewInfografia,
} from '../utils/infografiaValidation';
import { generateMultimediaFilename } from '../utils/multimediaFilename';
import MultimediaCaptureOffline from './MultimediaCaptureOffline';
import type { MultimediaRef } from '../services/draftStorage';

export default function InfografiaManager({
    situacionId,
    infografias: propInfografias,
    onChange,
    disabled = false,
}: InfografiaManagerProps) {
    const [activeTab, setActiveTab] = useState(0);
    const [showCaptureModal, setShowCaptureModal] = useState(false);
    const [captureForInfografia, setCaptureForInfografia] = useState<number | null>(null);

    // Asegurar que infografias sea siempre un array válido y sus elementos estén completos
    const infografias = React.useMemo(() => {
        if (!Array.isArray(propInfografias)) return [];
        return propInfografias.map(inf => ({
            ...inf,
            numero: typeof inf.numero === 'number' ? inf.numero : 0,
            titulo: inf.titulo || `Infografía`,
            fotos: Array.isArray(inf.fotos) ? inf.fotos : [], // CRITICAL FIX: Asegurar array
            video: inf.video || null,
        }));
    }, [propInfografias]);

    // Obtener infografía activa de forma segura
    const activeInfografia = infografias?.[activeTab] || null;

    // Si no hay infografías, mostrar estado vacío o inicializar una
    useEffect(() => {
        // Usar propInfografias para chequear si debemos inicializar, 
        // para evitar loops con el objeto sanitizado
        if ((!propInfografias || (Array.isArray(propInfografias) && propInfografias.length === 0)) && !disabled && onChange) {
            // Auto-iniciar con una infografía vacía si está vacío
            const newInfo = createNewInfografia([]);
            onChange([newInfo]);
        }
    }, [propInfografias, disabled, onChange]);

    // Agregar nueva infografía
    const handleAgregarInfografia = () => {
        // Evitar duplicados de número
        const newInfografia = createNewInfografia(infografias);

        // Verificación extra de unicidad
        // USAR OPTIONAL CHAINING
        if (infografias?.some(i => i.numero === newInfografia.numero)) {
            const max = infografias?.length > 0
                ? Math.max(...infografias.map(i => i.numero))
                : 0;
            newInfografia.numero = max + 1;
            newInfografia.titulo = `Infografía ${newInfografia.numero}`;
        }

        const updated = [...(infografias || []), newInfografia];
        onChange(updated);
        setActiveTab(updated.length - 1); // Cambiar al nuevo tab
    };

    // Eliminar infografía
    const handleEliminarInfografia = (numero: number) => {
        const infografia = infografias?.find(i => i.numero === numero);
        if (!infografia) return;

        Alert.alert(
            'Eliminar Infografía',
            `¿Seguro que deseas eliminar "${infografia.titulo}"?\n\nSe perderán ${infografia.fotos?.length || 0} foto(s) y ${infografia.video ? '1 video' : '0 videos'}.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => {
                        const updated = infografias?.filter(i => i.numero !== numero) || [];
                        onChange(updated);
                        // Ajustar tab activo si es necesario
                        if (activeTab >= updated.length) {
                            setActiveTab(Math.max(0, updated.length - 1));
                        }
                    },
                },
            ]
        );
    };

    // Actualizar título
    const handleUpdateTitulo = (numero: number, titulo: string) => {
        // USAR OPTIONAL CHAINING
        const updated = infografias?.map(inf =>
            inf.numero === numero ? { ...inf, titulo } : inf
        ) || [];
        onChange(updated);
    };

    // Abrir modal de captura para infografía
    const handleOpenCapture = (infografiaNumero: number) => {
        setCaptureForInfografia(infografiaNumero);
        setShowCaptureModal(true);
    };

    // Obtener multimedia para el componente de captura
    const getMultimediaForCapture = (infografia: Infografia): MultimediaRef[] => {
        const multimediaRefs: MultimediaRef[] = [];

        // Agregar fotos
        // USAR OPTIONAL CHAINING
        infografia.fotos?.forEach(foto => {
            multimediaRefs.push({
                tipo: 'FOTO',
                uri: foto.uri,
                orden: foto.orden,
            });
        });

        // Agregar video
        if (infografia.video) {
            multimediaRefs.push({
                tipo: 'VIDEO',
                uri: infografia.video.uri,
                duracion_segundos: infografia.video.duracion_segundos,
            });
        }

        return multimediaRefs;
    };

    // Manejar cambios de multimedia desde el componente de captura
    const handleMultimediaChange = (multimedia: MultimediaRef[]) => {
        if (captureForInfografia === null) return;

        // USAR OPTIONAL CHAINING
        const updated = infografias?.map(inf => {
            if (inf.numero === captureForInfografia) {
                // Convertir MultimediaRef[] a FotoItem[] y VideoItem
                const fotos: FotoItem[] = [];
                let video: VideoItem | null = null;

                multimedia?.forEach(item => {
                    if (item.tipo === 'FOTO' && item.orden) {
                        const filename = generateMultimediaFilename({
                            situacionId,
                            infografiaNumero: inf.numero,
                            tipo: 'FOTO',
                            orden: item.orden,
                        });

                        fotos.push({
                            orden: item.orden,
                            uri: item.uri,
                            filename,
                            estado: 'PENDIENTE',
                        });
                    } else if (item.tipo === 'VIDEO') {
                        const filename = generateMultimediaFilename({
                            situacionId,
                            infografiaNumero: inf.numero,
                            tipo: 'VIDEO',
                        });

                        video = {
                            uri: item.uri,
                            filename,
                            duracion_segundos: item.duracion_segundos,
                            estado: 'PENDIENTE',
                        };
                    }
                });

                return {
                    ...inf,
                    fotos,
                    video,
                };
            }
            return inf;
        }) || [];

        onChange(updated);
    };

    if (!activeInfografia && (!infografias || infografias.length === 0)) {
        // Sin infografías - mostrar botón para crear primera
        return (
            <View style={styles.container}>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📷</Text>
                    <Text style={styles.emptyTitle}>Sin Evidencia Fotográfica</Text>
                    <Text style={styles.emptyText}>
                        Agrega fotos y videos para documentar esta situación
                    </Text>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={handleAgregarInfografia}
                        disabled={disabled}
                    >
                        <Text style={styles.addButtonText}>➕ Agregar Primera Infografía</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const validation = activeInfografia ? validateInfografia(activeInfografia) : { isValid: true, errors: [] };

    const infografiaParaCaptura = captureForInfografia !== null
        ? infografias?.find(inf => inf.numero === captureForInfografia)
        : null;

    return (
        <View style={styles.container}>
            {/* Header con tabs y botón agregar */}
            <View style={styles.headerContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tabsContainer}
                    contentContainerStyle={styles.tabsContent}
                >
                    {/* USAR OPTIONAL CHAINING EN RENDER */}
                    {infografias?.map((inf, idx) => (
                        <TouchableOpacity
                            // KEY ÚNICA ROBUSTA: Combinación de número e índice
                            key={`tab-${inf.numero}-${idx}`}
                            style={[styles.tab, activeTab === idx && styles.tabActive]}
                            onPress={() => setActiveTab(idx)}
                            disabled={disabled}
                        >
                            <Text style={[styles.tabText, activeTab === idx && styles.tabTextActive]}>
                                Infografía {inf.numero}
                            </Text>
                            {!validateInfografia(inf).isValid && (
                                <View style={styles.errorDot} />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Botón prominente para agregar nueva infografía */}
                <TouchableOpacity
                    style={styles.addInfografiaButton}
                    onPress={handleAgregarInfografia}
                    disabled={disabled}
                >
                    <Text style={styles.addInfografiaButtonText}>➕</Text>
                </TouchableOpacity>
            </View>

            {activeInfografia && (
                <ScrollView style={styles.content}>
                    {/* Título editable */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>📝 Título de Infografía</Text>
                        <TextInput
                            style={[styles.input, disabled && styles.inputDisabled]}
                            value={activeInfografia.titulo}
                            onChangeText={(text) => handleUpdateTitulo(activeInfografia.numero, text)}
                            placeholder="Describe esta infografía..."
                            maxLength={100}
                            editable={!disabled}
                        />
                    </View>

                    {/* Botón para abrir captura de multimedia */}
                    <TouchableOpacity
                        style={styles.captureButton}
                        onPress={() => handleOpenCapture(activeInfografia.numero)}
                        disabled={disabled}
                    >
                        <Text style={styles.captureButtonIcon}>📷 🎥</Text>
                        <Text style={styles.captureButtonText}>
                            {activeInfografia.fotos?.length === 0 && !activeInfografia.video
                                ? 'Agregar Fotos y Video'
                                : 'Editar Fotos y Video'}
                        </Text>
                    </TouchableOpacity>

                    {/* Preview de multimedia capturada */}
                    {((activeInfografia.fotos?.length || 0) > 0 || activeInfografia.video) && (
                        <View style={styles.previewSection}>
                            <Text style={styles.previewLabel}>
                                📷 {activeInfografia.fotos?.length || 0} Foto(s) | 🎥 {activeInfografia.video ? '1' : '0'} Video
                            </Text>
                            <View style={styles.previewGrid}>
                                {/* USAR OPTIONAL CHAINING EN FOTOS */}
                                {activeInfografia.fotos?.map((foto, idx) => (
                                    <View
                                        // KEY ÚNICA ROBUSTA: Combinación de orden e índice
                                        key={`foto-${foto.orden}-${idx}`}
                                        style={styles.previewItem}
                                    >
                                        <Image source={{ uri: foto.uri }} style={styles.previewImage} />
                                        <Text style={styles.previewOrder}>{foto.orden}</Text>
                                    </View>
                                ))}
                                {activeInfografia.video && (
                                    <View style={styles.previewItem}>
                                        <View style={styles.videoPreview}>
                                            <Text style={styles.videoPreviewIcon}>🎥</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Información de contexto */}
                    <View style={styles.infoBar}>
                        <Text style={styles.infoText}>
                            📊 Infografía {activeInfografia.numero} de {infografias?.length || 0}
                        </Text>
                        {(infografias?.length || 0) > 1 && (
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => handleEliminarInfografia(activeInfografia.numero)}
                                disabled={disabled}
                            >
                                <Text style={styles.deleteButtonText}>🗑️ Eliminar</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Errores de validación */}
                    {!validation.isValid && (
                        <View style={styles.validationErrors}>
                            <Text style={styles.errorIcon}>⚠️</Text>
                            <View>
                                {/* USAR OPTIONAL CHAINING EN VALIDATION ERRORS */}
                                {validation.errors?.map((error, idx) => (
                                    <Text key={`error-${idx}`} style={styles.errorText}>• {error}</Text>
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Modal de Captura */}
            {infografiaParaCaptura && (
                <Modal
                    visible={showCaptureModal}
                    animationType="slide"
                    onRequestClose={() => setShowCaptureModal(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {infografiaParaCaptura.titulo}
                            </Text>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setShowCaptureModal(false)}
                            >
                                <Text style={styles.modalCloseText}>✕ Cerrar</Text>
                            </TouchableOpacity>
                        </View>
                        <MultimediaCaptureOffline
                            draftUuid={`${situacionId}_I${infografiaParaCaptura.numero}`}
                            tipoSituacion="INFOGRAFIA"
                            manualMode={true}
                            initialMedia={getMultimediaForCapture(infografiaParaCaptura)}
                            onMultimediaChange={handleMultimediaChange}
                        />
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyIcon: {
        fontSize: 60,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text.primary,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.text.secondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    addButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    tabsContainer: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    tabsContent: {
        paddingRight: 8,
    },
    addInfografiaButton: {
        backgroundColor: COLORS.primary,
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    addInfografiaButtonText: {
        fontSize: 24,
        color: '#FFFFFF',
    },
    tab: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
        position: 'relative',
    },
    tabActive: {
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        color: COLORS.text.secondary,
        fontSize: 14,
        fontWeight: '500',
    },
    tabTextActive: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    errorDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.danger,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text.primary,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: COLORS.text.primary,
    },
    inputDisabled: {
        backgroundColor: COLORS.background,
        color: COLORS.text.secondary,
    },
    captureButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
    },
    captureButtonIcon: {
        fontSize: 40,
        marginBottom: 8,
    },
    captureButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    previewSection: {
        marginBottom: 16,
    },
    previewLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text.secondary,
        marginBottom: 12,
    },
    previewGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    previewItem: {
        width: 80,
        height: 80,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    previewOrder: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        color: '#FFFFFF',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        fontSize: 12,
        fontWeight: '600',
    },
    videoPreview: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background,
    },
    videoPreviewIcon: {
        fontSize: 32,
    },
    validationErrors: {
        flexDirection: 'row',
        backgroundColor: COLORS.danger + '10',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.danger,
        marginBottom: 16,
        gap: 12,
    },
    infoBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 16,
    },
    infoText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text.primary,
    },
    deleteButton: {
        backgroundColor: COLORS.background,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.danger,
    },
    deleteButtonText: {
        color: COLORS.danger,
        fontSize: 13,
        fontWeight: '600',
    },
    errorIcon: {
        fontSize: 20,
    },
    errorText: {
        fontSize: 13,
        color: COLORS.danger,
        marginBottom: 4,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: '#fff',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text.primary,
    },
    modalCloseButton: {
        padding: 8,
    },
    modalCloseText: {
        color: COLORS.primary,
        fontWeight: '600',
    },
});
