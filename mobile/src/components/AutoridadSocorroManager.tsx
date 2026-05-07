import React from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../core/theme';
import { AUTORIDADES, UNIDADES_SOCORRO } from '../constants/situacionTypes';

export interface DetalleAutoridad {
    nombre: string;
    hora_llegada?: string;
    nip_chapa?: string;
    numero_unidad?: string;
    nombre_comandante?: string;
    cantidad_elementos?: string;
    subestacion?: string;
    cantidad_unidades?: string;
}

export interface DetallesSocorro {
    nombre: string;
    hora_llegada?: string;
    nip_chapa?: string;
    numero_unidad?: string;
    nombre_comandante?: string;
    cantidad_elementos?: string;
    subestacion?: string;
    cantidad_unidades?: string;
}

interface Props {
    tipo: 'autoridad' | 'socorro';
    seleccionados: string[];
    detalles: Record<string, DetalleAutoridad | DetallesSocorro>;
    onChange: (data: { seleccionados: string[], detalles: Record<string, DetalleAutoridad | DetallesSocorro> }) => void;
}

export default function AutoridadSocorroManager({
    tipo,
    seleccionados,
    detalles,
    onChange,
}: Props) {
    const theme = useTheme();
    const c = theme.colors;

    const opciones = tipo === 'autoridad' ? AUTORIDADES : UNIDADES_SOCORRO;
    const titulo = tipo === 'autoridad' ? 'Autoridades Presentes' : 'Unidades de Socorro';

    const toggleSeleccion = (nombre: string) => {
        if (nombre === 'Ninguna') {
            onChange({ seleccionados: ['Ninguna'], detalles: {} });
        } else {
            const base = seleccionados.filter((s) => s !== 'Ninguna');
            let nuevosDetalles = { ...detalles };

            if (base.includes(nombre)) {
                // Solo quitar de seleccionados — conservar detalles como caché
                onChange({
                    seleccionados: base.filter((s) => s !== nombre),
                    detalles: { ...detalles },
                });
            } else {
                onChange({
                    seleccionados: [...base, nombre],
                    detalles: {
                        ...detalles,
                        // Reusar datos previos si existen, solo inicializar si es la primera vez
                        [nombre]: detalles[nombre] || {
                            nombre,
                            hora_llegada: '',
                            nip_chapa: '',
                            numero_unidad: '',
                            nombre_comandante: '',
                            cantidad_elementos: '',
                            subestacion: '',
                            cantidad_unidades: '',
                        },
                    },
                });
            }
        }
    };

    const actualizarDetalle = (nombre: string, campo: keyof DetalleAutoridad, valor: string) => {
        onChange({
            seleccionados,
            detalles: {
                ...detalles,
                [nombre]: { ...detalles[nombre], [campo]: valor },
            },
        });
    };

    const renderDetallesFormulario = (nombre: string) => {
        if (nombre === 'PROVIAL' || nombre === 'Ninguna') return null;

        const detalle = detalles[nombre] || {
            nombre: '',
            hora_llegada: '',
            nip_chapa: '',
            numero_unidad: '',
            nombre_comandante: '',
            cantidad_elementos: '',
            subestacion: '',
            cantidad_unidades: '',
        } as DetalleAutoridad;

        const inputStyle = [
            styles.fieldInput,
            { borderColor: c.border, backgroundColor: c.surface, color: c.text.primary },
        ];

        return (
            <View
                key={`detalles-${nombre}`}
                style={[styles.detallesCard, { backgroundColor: c.surface, borderColor: c.border, borderLeftColor: c.primary }]}
            >
                <Text style={[styles.detallesTitle, { color: c.primary }]}>Detalles de {nombre}</Text>

                <View style={styles.formRow}>
                    <View style={styles.formField}>
                        <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Hora de llegada</Text>
                        <TextInput
                            style={inputStyle}
                            value={detalle.hora_llegada}
                            onChangeText={(val) => actualizarDetalle(nombre, 'hora_llegada', val)}
                            placeholder="HH:MM"
                            placeholderTextColor={c.text.disabled}
                        />
                    </View>
                    <View style={styles.formField}>
                        <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>NIP/Chapa</Text>
                        <TextInput
                            style={inputStyle}
                            value={detalle.nip_chapa}
                            onChangeText={(val) => actualizarDetalle(nombre, 'nip_chapa', val)}
                            placeholder="Ingrese NIP o Chapa"
                            placeholderTextColor={c.text.disabled}
                        />
                    </View>
                </View>

                <View style={styles.formRow}>
                    <View style={styles.formField}>
                        <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>No. de unidad</Text>
                        <TextInput
                            style={inputStyle}
                            value={detalle.numero_unidad}
                            onChangeText={(val) => actualizarDetalle(nombre, 'numero_unidad', val)}
                            placeholder="Ej: 001"
                            placeholderTextColor={c.text.disabled}
                        />
                    </View>
                    <View style={styles.formField}>
                        <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Nombre de comandante</Text>
                        <TextInput
                            style={inputStyle}
                            value={detalle.nombre_comandante}
                            onChangeText={(val) => actualizarDetalle(nombre, 'nombre_comandante', val)}
                            placeholder="Nombre completo"
                            placeholderTextColor={c.text.disabled}
                        />
                    </View>
                </View>

                <View style={styles.formRow}>
                    <View style={styles.formField}>
                        <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Cantidad de elementos</Text>
                        <TextInput
                            style={inputStyle}
                            value={detalle.cantidad_elementos}
                            onChangeText={(val) => actualizarDetalle(nombre, 'cantidad_elementos', val)}
                            placeholder="Ej: 5"
                            keyboardType="numeric"
                            placeholderTextColor={c.text.disabled}
                        />
                    </View>
                    <View style={styles.formField}>
                        <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Subestación</Text>
                        <TextInput
                            style={inputStyle}
                            value={detalle.subestacion}
                            onChangeText={(val) => actualizarDetalle(nombre, 'subestacion', val)}
                            placeholder="Nombre de subestación"
                            placeholderTextColor={c.text.disabled}
                        />
                    </View>
                </View>

                <View style={styles.formField}>
                    <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Cantidad de unidades</Text>
                    <TextInput
                        style={inputStyle}
                        value={detalle.cantidad_unidades}
                        onChangeText={(val) => actualizarDetalle(nombre, 'cantidad_unidades', val)}
                        placeholder="Ej: 2"
                        keyboardType="numeric"
                        placeholderTextColor={c.text.disabled}
                    />
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.sectionTitle, { color: c.text.primary }]}>{titulo}</Text>

            <View style={styles.chipGrid}>
                {opciones.map((opcion) => {
                    const selected = seleccionados.includes(opcion);
                    return (
                        <TouchableOpacity
                            key={opcion}
                            onPress={() => toggleSeleccion(opcion)}
                            activeOpacity={0.7}
                            style={[
                                styles.chip,
                                {
                                    backgroundColor: selected ? c.primary : c.surface,
                                    borderColor: selected ? c.primary : c.border,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.chipText,
                                    { color: selected ? c.text.inverse : c.text.primary },
                                ]}
                            >
                                {opcion}
                            </Text>
                            {selected && (
                                <MaterialCommunityIcons
                                    name="check"
                                    size={14}
                                    color={c.text.inverse}
                                    style={styles.chipCheck}
                                />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.detallesContainer}>
                {seleccionados
                    .filter((nombre) => nombre !== 'Ninguna' && nombre !== 'PROVIAL')
                    .map((nombre) => renderDetallesFormulario(nombre))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 8,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 12,
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    chipCheck: {
        marginLeft: 5,
    },
    detallesContainer: {
        marginTop: 16,
    },
    detallesCard: {
        padding: 14,
        borderRadius: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderLeftWidth: 4,
    },
    detallesTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    formRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    formField: {
        flex: 1,
    },
    fieldLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginBottom: 4,
    },
    fieldInput: {
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
    },
});
