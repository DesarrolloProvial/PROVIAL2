/**
 * ContadorVehicular
 * 
 * Componente para conteo de vehículos por tipo.
 * Usado en situaciones como "Conteo Vehicular" y "Operativos".
 * 
 * Interfaz: Lista de tipos con botones +/- (sin búsqueda)
 * Solo muestra tipos con count > 0
 * 
 * Fecha: 2026-01-22
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export interface ConteoVehicular {
    [tipoVehiculo: string]: number; // { 'sedan': 25, 'pickup': 12 }
}

interface Props {
    value: ConteoVehicular;
    onChange: (value: ConteoVehicular) => void;
    readonly?: boolean;
}

// Tipos de vehículos disponibles (catálogo simplificado)
const TIPOS_VEHICULOS = [
    { value: 'sedan', label: 'Sedán' },
    { value: 'pickup', label: 'Pick-up' },
    { value: 'camion', label: 'Camión' },
    { value: 'bus', label: 'Bus' },
    { value: 'panel', label: 'Panel' },
    { value: 'motocicleta', label: 'Motocicleta' },
    { value: 'microbus', label: 'Microbús' },
    { value: 'camioneta', label: 'Camioneta' },
    { value: 'trailer', label: 'Tráiler' },
    { value: 'furgon', label: 'Furgón' },
];

export default function ContadorVehicular({ value, onChange, readonly = false }: Props) {
    const [conteos, setConteos] = useState<ConteoVehicular>(value || {});

    useEffect(() => {
        setConteos(value || {});
    }, [value]);

    const incrementar = (tipo: string) => {
        if (readonly) return;
        const nuevoConteo = { ...conteos, [tipo]: (conteos[tipo] || 0) + 1 };
        setConteos(nuevoConteo);
        onChange(nuevoConteo);
    };

    const decrementar = (tipo: string) => {
        if (readonly) return;
        const valorActual = conteos[tipo] || 0;
        if (valorActual > 0) {
            const nuevoConteo = { ...conteos, [tipo]: valorActual - 1 };
            // Si llega a 0, eliminar del objeto
            if (nuevoConteo[tipo] === 0) {
                delete nuevoConteo[tipo];
            }
            setConteos(nuevoConteo);
            onChange(nuevoConteo);
        }
    };

    const calcularTotal = () => {
        return Object.values(conteos).reduce((sum, count) => sum + count, 0);
    };

    // Filtrar: mostrar todos los tipos si no hay conteos, o solo los que tienen count > 0
    const tiposMostrar = Object.keys(conteos).length === 0
        ? TIPOS_VEHICULOS
        : TIPOS_VEHICULOS.filter(t => (conteos[t.value] || 0) > 0);

    // Agregar tipos que no están en el catálogo pero sí en el conteo
    const tiposExtra = Object.keys(conteos).filter(
        key => !TIPOS_VEHICULOS.find(t => t.value === key)
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Conteo de Vehículos</Text>
                <View style={styles.totalBadge}>
                    <Text style={styles.totalText}>Total: {calcularTotal()}</Text>
                </View>
            </View>

            <ScrollView style={styles.listContainer}>
                {tiposMostrar.map(tipo => (
                    <View key={tipo.value} style={styles.row}>
                        <Text style={styles.label}>{tipo.label}</Text>
                        <View style={styles.controls}>
                            <TouchableOpacity
                                style={[styles.button, readonly && styles.buttonDisabled]}
                                onPress={() => decrementar(tipo.value)}
                                disabled={readonly}
                            >
                                <MaterialIcons name="remove" size={20} color={readonly ? COLORS.text.disabled : '#fff'} />
                            </TouchableOpacity>
                            <Text style={styles.count}>{conteos[tipo.value] || 0}</Text>
                            <TouchableOpacity
                                style={[styles.button, readonly && styles.buttonDisabled]}
                                onPress={() => incrementar(tipo.value)}
                                disabled={readonly}
                            >
                                <MaterialIcons name="add" size={20} color={readonly ? COLORS.text.disabled : '#fff'} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

                {/* Tipos extra no en catálogo */}
                {tiposExtra.map(tipo => (
                    <View key={tipo} style={styles.row}>
                        <Text style={styles.label}>{tipo} (custom)</Text>
                        <View style={styles.controls}>
                            <TouchableOpacity
                                style={[styles.button, readonly && styles.buttonDisabled]}
                                onPress={() => decrementar(tipo)}
                                disabled={readonly}
                            >
                                <MaterialIcons name="remove" size={20} color={readonly ? COLORS.text.disabled : '#fff'} />
                            </TouchableOpacity>
                            <Text style={styles.count}>{conteos[tipo] || 0}</Text>
                            <TouchableOpacity
                                style={[styles.button, readonly && styles.buttonDisabled]}
                                onPress={() => incrementar(tipo)}
                                disabled={readonly}
                            >
                                <MaterialIcons name="add" size={20} color={readonly ? COLORS.text.disabled : '#fff'} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

                {Object.keys(conteos).length === 0 && (
                    <Text style={styles.emptyText}>
                        Usa los botones + para agregar vehículos al conteo
                    </Text>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text.primary,
    },
    totalBadge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    totalText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    listContainer: {
        maxHeight: 400,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border + '30',
    },
    label: {
        fontSize: 14,
        color: COLORS.text.primary,
        flex: 1,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    button: {
        backgroundColor: COLORS.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: COLORS.text.disabled,
    },
    count: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text.primary,
        minWidth: 40,
        textAlign: 'center',
    },
    emptyText: {
        textAlign: 'center',
        color: COLORS.text.secondary,
        fontSize: 14,
        marginTop: 20,
        fontStyle: 'italic',
    },
});
