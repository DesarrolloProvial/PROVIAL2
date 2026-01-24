import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { COLORS } from '../constants/colors';

// ========================================
// INTERFACES (Nuevo modelo v2)
// ========================================

export interface CarrilObstruccion {
    nombre: string;
    porcentaje: number; // 0-100
}

export interface SentidoObstruccion {
    cantidad_carriles: number; // 1-5
    carriles: CarrilObstruccion[];
}

export type TipoObstruccion = 'ninguna' | 'total_sentido' | 'total_ambos' | 'parcial';

export interface ObstruccionData {
    hay_vehiculo_fuera_via: boolean;
    tipo_obstruccion: TipoObstruccion;
    sentido_principal: SentidoObstruccion | null;
    sentido_contrario: SentidoObstruccion | null;
    descripcion_manual: string;
}

interface Props {
    value: ObstruccionData;
    onChange: (data: ObstruccionData) => void;
    sentidoSituacion?: string;
    readonly?: boolean;
}

// ========================================
// HELPERS
// ========================================

function generarNombresCarriles(cantidad: number, sentido?: string): string[] {
    switch (cantidad) {
        case 1:
            return [`Carril hacia ${sentido || 'el sentido'}`];
        case 2:
            return ['Carril izquierdo', 'Carril derecho'];
        case 3:
            return ['Carril izquierdo', 'Carril central', 'Carril derecho'];
        case 4:
            return ['Carril izquierdo', 'Carril central izquierdo', 'Carril central derecho', 'Carril derecho'];
        case 5:
            return ['Carril izquierdo', 'Carril central izquierdo', 'Carril central', 'Carril central derecho', 'Carril derecho'];
        default:
            return [];
    }
}

function crearSentidoObstruccion(cantidadCarriles: number, sentido?: string): SentidoObstruccion {
    const nombres = generarNombresCarriles(cantidadCarriles, sentido);
    return {
        cantidad_carriles: cantidadCarriles,
        carriles: nombres.map(nombre => ({ nombre, porcentaje: 0 }))
    };
}

export function getDefaultObstruccion(): ObstruccionData {
    return {
        hay_vehiculo_fuera_via: false,
        tipo_obstruccion: 'ninguna',
        sentido_principal: null,
        sentido_contrario: null,
        descripcion_manual: ''
    };
}

// ========================================
// SUBCOMPONENTE: Editor de carriles
// ========================================

interface CarrilesEditorProps {
    sentido: SentidoObstruccion;
    onChange: (sentido: SentidoObstruccion) => void;
    label: string;
    readonly?: boolean;
    sentidoNombre?: string;
}

function CarrilesEditor({ sentido, onChange, label, readonly, sentidoNombre }: CarrilesEditorProps) {
    const handleCantidadChange = (cantidad: number) => {
        const nuevoSentido = crearSentidoObstruccion(cantidad, sentidoNombre);
        nuevoSentido.carriles = nuevoSentido.carriles.map((carril, i) => ({
            ...carril,
            porcentaje: sentido.carriles[i]?.porcentaje || 0
        }));
        onChange(nuevoSentido);
    };

    const handlePorcentajeChange = (index: number, valor: string) => {
        // Validar que sea un numero entre 0 y 100
        let porcentaje = parseInt(valor, 10);
        if (isNaN(porcentaje)) porcentaje = 0;
        if (porcentaje < 0) porcentaje = 0;
        if (porcentaje > 100) porcentaje = 100;

        const nuevosCarriles = [...sentido.carriles];
        nuevosCarriles[index] = { ...nuevosCarriles[index], porcentaje };
        onChange({ ...sentido, carriles: nuevosCarriles });
    };

    const setAllPercentage = (porcentaje: number) => {
        const nuevosCarriles = sentido.carriles.map(c => ({ ...c, porcentaje }));
        onChange({ ...sentido, carriles: nuevosCarriles });
    };

    const getColorPorcentaje = (pct: number) => {
        if (pct === 0) return { bg: '#D1FAE5', text: '#065F46', border: '#10B981' };
        if (pct <= 25) return { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' };
        if (pct <= 50) return { bg: '#FFEDD5', text: '#9A3412', border: '#F97316' };
        if (pct <= 75) return { bg: '#FED7AA', text: '#C2410C', border: '#EA580C' };
        return { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' };
    };

    return (
        <View style={styles.carrilesContainer}>
            <View style={styles.carrilesHeader}>
                <Text style={styles.carrilesLabel}>{label}</Text>
                <View style={styles.cantidadButtons}>
                    <Text style={styles.cantidadLabel}>Carriles:</Text>
                    {[1, 2, 3, 4, 5].map(num => (
                        <TouchableOpacity
                            key={num}
                            onPress={() => !readonly && handleCantidadChange(num)}
                            style={[
                                styles.cantidadButton,
                                sentido.cantidad_carriles === num && styles.cantidadButtonActive
                            ]}
                            disabled={readonly}
                        >
                            <Text style={[
                                styles.cantidadButtonText,
                                sentido.cantidad_carriles === num && styles.cantidadButtonTextActive
                            ]}>
                                {num}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {sentido.carriles.map((carril, index) => {
                const colors = getColorPorcentaje(carril.porcentaje);
                return (
                    <View key={index} style={styles.carrilRow}>
                        <Text style={styles.carrilNombre} numberOfLines={1}>
                            {carril.nombre}
                        </Text>
                        <View style={styles.porcentajeInputRow}>
                            <View
                                style={[
                                    styles.porcentajeBarContainer,
                                    { backgroundColor: '#E5E7EB' }
                                ]}
                            >
                                <View
                                    style={[
                                        styles.porcentajeBarFill,
                                        {
                                            width: `${carril.porcentaje}%`,
                                            backgroundColor: colors.border
                                        }
                                    ]}
                                />
                            </View>
                            <TextInput
                                style={[
                                    styles.porcentajeInput,
                                    {
                                        backgroundColor: colors.bg,
                                        borderColor: colors.border,
                                        color: colors.text
                                    }
                                ]}
                                value={carril.porcentaje.toString()}
                                onChangeText={(val) => handlePorcentajeChange(index, val)}
                                keyboardType="numeric"
                                maxLength={3}
                                editable={!readonly}
                                selectTextOnFocus
                            />
                            <Text style={[styles.porcentajeSymbol, { color: colors.text }]}>%</Text>
                        </View>
                    </View>
                );
            })}

            {!readonly && (
                <View style={styles.quickButtons}>
                    <TouchableOpacity
                        style={[styles.quickButton, { backgroundColor: '#D1FAE5' }]}
                        onPress={() => setAllPercentage(0)}
                    >
                        <Text style={[styles.quickButtonText, { color: '#065F46' }]}>Todos 0%</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.quickButton, { backgroundColor: '#FEF3C7' }]}
                        onPress={() => setAllPercentage(50)}
                    >
                        <Text style={[styles.quickButtonText, { color: '#92400E' }]}>Todos 50%</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.quickButton, { backgroundColor: '#FEE2E2' }]}
                        onPress={() => setAllPercentage(100)}
                    >
                        <Text style={[styles.quickButtonText, { color: '#991B1B' }]}>Todos 100%</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

export default function ObstruccionManager({
    value,
    onChange,
    sentidoSituacion,
    readonly = false
}: Props) {
    // Usar valor por defecto si value es undefined
    const safeValue = value || getDefaultObstruccion();

    const [mostrarSentidoContrario, setMostrarSentidoContrario] = useState(
        safeValue.sentido_contrario !== null
    );

    useEffect(() => {
        if (safeValue.tipo_obstruccion === 'parcial' && !safeValue.sentido_principal) {
            onChange({
                ...safeValue,
                sentido_principal: crearSentidoObstruccion(2, sentidoSituacion)
            });
        }
    }, [safeValue.tipo_obstruccion]);

    const handleVehiculoFueraViaChange = () => {
        onChange({
            ...safeValue,
            hay_vehiculo_fuera_via: !safeValue.hay_vehiculo_fuera_via
        });
    };

    const handleTipoObstruccionChange = (tipo: TipoObstruccion) => {
        const nuevoValue: ObstruccionData = {
            ...safeValue,
            tipo_obstruccion: tipo,
            sentido_principal: tipo === 'parcial' ? crearSentidoObstruccion(2, sentidoSituacion) : null,
            sentido_contrario: null
        };

        if (tipo === 'ninguna' || tipo === 'total_sentido' || tipo === 'total_ambos') {
            setMostrarSentidoContrario(false);
        }

        onChange(nuevoValue);
    };

    const handleSentidoPrincipalChange = (sentido: SentidoObstruccion) => {
        onChange({
            ...safeValue,
            sentido_principal: sentido
        });
    };

    const handleSentidoContrarioChange = (sentido: SentidoObstruccion) => {
        onChange({
            ...safeValue,
            sentido_contrario: sentido
        });
    };

    const toggleSentidoContrario = () => {
        if (mostrarSentidoContrario) {
            setMostrarSentidoContrario(false);
            onChange({ ...safeValue, sentido_contrario: null });
        } else {
            setMostrarSentidoContrario(true);
            onChange({
                ...safeValue,
                sentido_contrario: crearSentidoObstruccion(
                    safeValue.sentido_principal?.cantidad_carriles || 2,
                    sentidoSituacion ? `contrario a ${sentidoSituacion}` : undefined
                )
            });
        }
    };

    const generarDescripcion = useCallback(() => {
        let desc = '';

        if (safeValue.hay_vehiculo_fuera_via) {
            desc = 'Vehiculo fuera de la via';
            if (safeValue.tipo_obstruccion !== 'ninguna') {
                desc += '. Ademas, ';
            }
        }

        switch (safeValue.tipo_obstruccion) {
            case 'ninguna':
                if (!safeValue.hay_vehiculo_fuera_via) {
                    desc = 'Sin obstruccion de via';
                }
                break;
            case 'total_sentido':
                desc += `Obstruccion total del sentido ${sentidoSituacion || 'principal'}`;
                break;
            case 'total_ambos':
                desc += 'Obstruccion total de ambos sentidos (via cerrada)';
                break;
            case 'parcial':
                if (safeValue.sentido_principal) {
                    const carrilesAfectados = safeValue.sentido_principal.carriles
                        .filter(c => c.porcentaje > 0)
                        .map(c => `${c.nombre} (${c.porcentaje}%)`)
                        .join(', ');

                    if (carrilesAfectados) {
                        desc += `Obstruccion parcial: ${carrilesAfectados}`;
                    } else {
                        desc += 'Obstruccion parcial sin carriles especificados';
                    }
                }
                break;
        }

        onChange({ ...safeValue, descripcion_manual: desc });
    }, [safeValue, sentidoSituacion, onChange]);

    const tieneObstruccionActiva = safeValue.hay_vehiculo_fuera_via || safeValue.tipo_obstruccion !== 'ninguna';

    const tiposObstruccion: { value: TipoObstruccion; label: string; color: string }[] = [
        { value: 'ninguna', label: 'Sin obstruccion', color: COLORS.success },
        { value: 'total_sentido', label: 'Total (1 sentido)', color: '#F97316' },
        { value: 'total_ambos', label: 'Total (ambos)', color: COLORS.error },
        { value: 'parcial', label: 'Parcial', color: COLORS.primary },
    ];

    return (
        <ScrollView style={styles.container} nestedScrollEnabled>
            {/* Checkbox: Vehiculo fuera de via */}
            <TouchableOpacity
                style={styles.fueraViaContainer}
                onPress={!readonly ? handleVehiculoFueraViaChange : undefined}
                disabled={readonly}
            >
                <View style={[styles.checkbox, safeValue.hay_vehiculo_fuera_via && styles.checkboxCheckedYellow]}>
                    {safeValue.hay_vehiculo_fuera_via && <Text style={styles.checkboxCheck}>✓</Text>}
                </View>
                <View style={styles.fueraViaTexts}>
                    <Text style={styles.fueraViaTitle}>Vehiculo fuera de la via</Text>
                    <Text style={styles.fueraViaSubtitle}>Puede combinarse con obstruccion parcial</Text>
                </View>
            </TouchableOpacity>

            {/* Tipo de obstruccion */}
            <Text style={styles.sectionLabel}>Tipo de Obstruccion de Via</Text>
            <View style={styles.tipoGrid}>
                {tiposObstruccion.map((tipo) => (
                    <TouchableOpacity
                        key={tipo.value}
                        style={[
                            styles.tipoButton,
                            safeValue.tipo_obstruccion === tipo.value && { borderColor: tipo.color, backgroundColor: tipo.color + '15' }
                        ]}
                        onPress={() => !readonly && handleTipoObstruccionChange(tipo.value)}
                        disabled={readonly}
                    >
                        <Text style={[
                            styles.tipoButtonText,
                            safeValue.tipo_obstruccion === tipo.value && { color: tipo.color, fontWeight: '600' }
                        ]}>
                            {tipo.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Editor de carriles (solo para obstruccion parcial) */}
            {safeValue.tipo_obstruccion === 'parcial' && safeValue.sentido_principal && (
                <View style={styles.parcialContainer}>
                    <CarrilesEditor
                        sentido={safeValue.sentido_principal}
                        onChange={handleSentidoPrincipalChange}
                        label={`Sentido ${sentidoSituacion || 'principal'}`}
                        readonly={readonly}
                        sentidoNombre={sentidoSituacion}
                    />

                    {!readonly && (
                        <TouchableOpacity
                            style={[
                                styles.toggleSentidoButton,
                                mostrarSentidoContrario && styles.toggleSentidoButtonActive
                            ]}
                            onPress={toggleSentidoContrario}
                        >
                            <Text style={[
                                styles.toggleSentidoText,
                                mostrarSentidoContrario && styles.toggleSentidoTextActive
                            ]}>
                                {mostrarSentidoContrario ? '- Ocultar sentido contrario' : '+ Agregar sentido contrario'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {mostrarSentidoContrario && safeValue.sentido_contrario && (
                        <CarrilesEditor
                            sentido={safeValue.sentido_contrario}
                            onChange={handleSentidoContrarioChange}
                            label={`Sentido ${sentidoSituacion ? `contrario` : 'contrario'}`}
                            readonly={readonly}
                            sentidoNombre={sentidoSituacion ? `contrario a ${sentidoSituacion}` : undefined}
                        />
                    )}
                </View>
            )}

            {/* Seccion de descripcion */}
            {tieneObstruccionActiva && (
                <View style={styles.descripcionContainer}>
                    {!readonly && (
                        <TouchableOpacity
                            style={styles.generarButton}
                            onPress={generarDescripcion}
                        >
                            <Text style={styles.generarButtonText}>Generar Descripcion</Text>
                        </TouchableOpacity>
                    )}

                    <Text style={styles.label}>Descripcion (puede editarse)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={safeValue.descripcion_manual}
                        onChangeText={(text) => onChange({ ...safeValue, descripcion_manual: text })}
                        placeholder="Descripcion de la obstruccion..."
                        multiline
                        numberOfLines={3}
                        editable={!readonly}
                    />
                </View>
            )}

            {/* Resumen visual */}
            {tieneObstruccionActiva && (
                <View style={styles.resumenContainer}>
                    <Text style={styles.resumenTitle}>RESUMEN</Text>
                    <View style={styles.resumenTags}>
                        {safeValue.hay_vehiculo_fuera_via && (
                            <View style={[styles.tag, { backgroundColor: '#FEF3C7' }]}>
                                <Text style={[styles.tagText, { color: '#92400E' }]}>Vehiculo fuera de via</Text>
                            </View>
                        )}
                        {safeValue.tipo_obstruccion === 'total_sentido' && (
                            <View style={[styles.tag, { backgroundColor: '#FFEDD5' }]}>
                                <Text style={[styles.tagText, { color: '#9A3412' }]}>Total (1 sentido)</Text>
                            </View>
                        )}
                        {safeValue.tipo_obstruccion === 'total_ambos' && (
                            <View style={[styles.tag, { backgroundColor: '#FEE2E2' }]}>
                                <Text style={[styles.tagText, { color: '#991B1B' }]}>Via cerrada</Text>
                            </View>
                        )}
                        {safeValue.tipo_obstruccion === 'parcial' && safeValue.sentido_principal && (
                            <View style={[styles.tag, { backgroundColor: '#DBEAFE' }]}>
                                <Text style={[styles.tagText, { color: '#1E40AF' }]}>
                                    Parcial: {safeValue.sentido_principal.carriles.filter(c => c.porcentaje > 0).length}/{safeValue.sentido_principal.cantidad_carriles} carriles
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    fueraViaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FCD34D',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: COLORS.border,
        borderRadius: 4,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.white,
    },
    checkboxCheckedYellow: {
        backgroundColor: '#D97706',
        borderColor: '#D97706',
    },
    checkboxCheck: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    fueraViaTexts: {
        flex: 1,
    },
    fueraViaTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#92400E',
    },
    fueraViaSubtitle: {
        fontSize: 12,
        color: '#B45309',
        marginTop: 2,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text.primary,
        marginBottom: 8,
    },
    tipoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    tipoButton: {
        flex: 1,
        minWidth: '45%',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
        alignItems: 'center',
    },
    tipoButtonText: {
        fontSize: 13,
        color: COLORS.text.secondary,
    },
    parcialContainer: {
        backgroundColor: '#EFF6FF',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    carrilesContainer: {
        backgroundColor: COLORS.white,
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    carrilesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    carrilesLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text.primary,
    },
    cantidadButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cantidadLabel: {
        fontSize: 11,
        color: COLORS.text.secondary,
        marginRight: 4,
    },
    cantidadButton: {
        width: 28,
        height: 28,
        borderRadius: 4,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cantidadButtonActive: {
        backgroundColor: COLORS.primary,
    },
    cantidadButtonText: {
        fontSize: 12,
        color: COLORS.text.secondary,
        fontWeight: '500',
    },
    cantidadButtonTextActive: {
        color: COLORS.white,
    },
    carrilRow: {
        marginBottom: 12,
    },
    carrilNombre: {
        fontSize: 13,
        color: COLORS.text.primary,
        marginBottom: 8,
        fontWeight: '500',
    },
    porcentajeInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    porcentajeBarContainer: {
        flex: 1,
        height: 12,
        borderRadius: 6,
        overflow: 'hidden',
    },
    porcentajeBarFill: {
        height: '100%',
        borderRadius: 6,
    },
    porcentajeInput: {
        width: 50,
        height: 36,
        borderWidth: 2,
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '700',
    },
    porcentajeSymbol: {
        fontSize: 14,
        fontWeight: '600',
    },
    quickButtons: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    quickButton: {
        flex: 1,
        paddingVertical: 6,
        borderRadius: 4,
        alignItems: 'center',
    },
    quickButtonText: {
        fontSize: 11,
        fontWeight: '600',
    },
    toggleSentidoButton: {
        backgroundColor: '#DBEAFE',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    toggleSentidoButtonActive: {
        backgroundColor: COLORS.primary,
    },
    toggleSentidoText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1E40AF',
    },
    toggleSentidoTextActive: {
        color: COLORS.white,
    },
    descripcionContainer: {
        backgroundColor: COLORS.background,
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    generarButton: {
        backgroundColor: COLORS.success,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    generarButtonText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '600',
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text.primary,
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        backgroundColor: COLORS.white,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    resumenContainer: {
        backgroundColor: COLORS.background,
        padding: 12,
        borderRadius: 8,
    },
    resumenTitle: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.text.secondary,
        marginBottom: 8,
    },
    resumenTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '500',
    },
});
