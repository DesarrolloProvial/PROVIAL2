import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { COLORS } from '../constants/colors';
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
    const opciones = tipo === 'autoridad' ? AUTORIDADES : UNIDADES_SOCORRO;
    const titulo = tipo === 'autoridad' ? 'Autoridades Presentes' : 'Unidades de Socorro';

    const toggleSeleccion = (nombre: string) => {
        if (nombre === 'Ninguna') {
            onChange({
                seleccionados: ['Ninguna'],
                detalles: {}
            });
        } else {
            const nuevosSeleccionados = seleccionados.filter((s) => s !== 'Ninguna');
            let nuevosDetalles = { ...detalles };
            let seleccionFinal: string[];

            if (nuevosSeleccionados.includes(nombre)) {
                // Deseleccionar
                seleccionFinal = nuevosSeleccionados.filter((s) => s !== nombre);
                // Eliminar detalles
                delete nuevosDetalles[nombre];
            } else {
                // Seleccionar
                seleccionFinal = [...nuevosSeleccionados, nombre];

                // Crear entrada de detalles vacía
                nuevosDetalles[nombre] = {
                    nombre,
                    hora_llegada: '',
                    nip_chapa: '',
                    numero_unidad: '',
                    nombre_comandante: '',
                    cantidad_elementos: '',
                    subestacion: '',
                    cantidad_unidades: '',
                };
            }

            // Actualizar TODO de una vez
            onChange({
                seleccionados: seleccionFinal,
                detalles: nuevosDetalles
            });
        }
    };

    const actualizarDetalle = (nombre: string, campo: keyof DetalleAutoridad, valor: string) => {
        const nuevosDetalles = {
            ...detalles,
            [nombre]: {
                ...detalles[nombre],
                [campo]: valor,
            },
        };

        onChange({
            seleccionados,
            detalles: nuevosDetalles
        });
    };

    const renderDetallesFormulario = (nombre: string) => {
        if (nombre === 'PROVIAL' || nombre === 'Ninguna') return null;
        if (!seleccionados.includes(nombre)) return null;

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

        return (
            <View key={`detalles-${nombre}`} style={styles.detallesCard}>
                <Text style={styles.detallesTitle}>Detalles de {nombre}</Text>

                <View style={styles.formRow}>
                    <View style={styles.formField}>
                        <Text style={styles.fieldLabel}>Hora de llegada</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={detalle.hora_llegada}
                            onChangeText={(val) => actualizarDetalle(nombre, 'hora_llegada', val)}
                            placeholder="HH:MM"
                        />
                    </View>

                    <View style={styles.formField}>
                        <Text style={styles.fieldLabel}>NIP/Chapa</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={detalle.nip_chapa}
                            onChangeText={(val) => actualizarDetalle(nombre, 'nip_chapa', val)}
                            placeholder="Ingrese NIP o Chapa"
                        />
                    </View>
                </View>

                <View style={styles.formRow}>
                    <View style={styles.formField}>
                        <Text style={styles.fieldLabel}>Número de unidad</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={detalle.numero_unidad}
                            onChangeText={(val) => actualizarDetalle(nombre, 'numero_unidad', val)}
                            placeholder="Ej: 001"
                        />
                    </View>

                    <View style={styles.formField}>
                        <Text style={styles.fieldLabel}>Nombre de comandante</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={detalle.nombre_comandante}
                            onChangeText={(val) => actualizarDetalle(nombre, 'nombre_comandante', val)}
                            placeholder="Nombre completo"
                        />
                    </View>
                </View>

                <View style={styles.formRow}>
                    <View style={styles.formField}>
                        <Text style={styles.fieldLabel}>Cantidad de elementos</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={detalle.cantidad_elementos}
                            onChangeText={(val) => actualizarDetalle(nombre, 'cantidad_elementos', val)}
                            placeholder="Ej: 5"
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.formField}>
                        <Text style={styles.fieldLabel}>Subestación</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={detalle.subestacion}
                            onChangeText={(val) => actualizarDetalle(nombre, 'subestacion', val)}
                            placeholder="Nombre de subestación"
                        />
                    </View>
                </View>

                <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Cantidad de unidades</Text>
                    <TextInput
                        style={styles.fieldInput}
                        value={detalle.cantidad_unidades}
                        onChangeText={(val) => actualizarDetalle(nombre, 'cantidad_unidades', val)}
                        placeholder="Ej: 2"
                        keyboardType="numeric"
                    />
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>{titulo}</Text>

            <View style={styles.checkboxGrid}>
                {opciones.map((opcion) => (
                    <TouchableOpacity
                        key={opcion}
                        style={styles.checkboxItem}
                        onPress={() => toggleSeleccion(opcion)}
                    >
                        <View
                            style={[
                                styles.checkbox,
                                seleccionados.includes(opcion) && styles.checkboxChecked,
                            ]}
                        >
                            {seleccionados.includes(opcion) && (
                                <Text style={styles.checkboxCheck}>✓</Text>
                            )}
                        </View>
                        <Text style={styles.checkboxLabel}>{opcion}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Formularios de detalles */}
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
        marginVertical: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text.primary,
        marginBottom: 12,
    },
    checkboxGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    checkboxItem: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '48%',
        marginBottom: 8,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: COLORS.border,
        borderRadius: 4,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    checkboxCheck: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    checkboxLabel: {
        fontSize: 14,
        color: COLORS.text.primary,
        flex: 1,
    },
    detallesContainer: {
        marginTop: 16,
    },
    detallesCard: {
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderLeftWidth: 4,
    },
    detallesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.primary,
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
        fontSize: 12,
        fontWeight: '500',
        color: COLORS.text.secondary,
        marginBottom: 4,
    },
    fieldInput: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 6,
        padding: 8,
        fontSize: 14,
        backgroundColor: COLORS.background,
    },
});
