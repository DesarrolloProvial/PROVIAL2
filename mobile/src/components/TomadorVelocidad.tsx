/**
 * TomadorVelocidad
 * 
 * Componente para registro de velocidades por tipo de vehículo.
 * Usado en situación "Toma de Velocidad".
 * 
 * Interfaz: Por tipo con múltiples velocidades + estadísticas
 * 
 * Fecha: 2026-01-22
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export interface MedicionVelocidad {
    tipo_vehiculo: string;
    velocidades: number[]; // Array de velocidades en km/h
}

interface Props {
    value: MedicionVelocidad[];
    onChange: (value: MedicionVelocidad[]) => void;
    readonly?: boolean;
}

// Tipos de vehículos comunes
const TIPOS_VEHICULOS = [
    { value: 'sedan', label: 'Sedán' },
    { value: 'pickup', label: 'Pick-up' },
    { value: 'camion', label: 'Camión' },
    { value: 'bus', label: 'Bus' },
    { value: 'motocicleta', label: 'Motocicleta' },
    { value: 'panel', label: 'Panel' },
];

export default function TomadorVelocidad({ value, onChange, readonly = false }: Props) {
    const [mediciones, setMediciones] = useState<MedicionVelocidad[]>(value || []);
    const [tipoSeleccionado, setTipoSeleccionado] = useState<string>('sedan');
    const [velocidadesInput, setVelocidadesInput] = useState<string>('');

    useEffect(() => {
        setMediciones(value || []);
    }, [value]);

    const agregarMedicion = () => {
        if (!velocidadesInput.trim()) {
            Alert.alert('Error', 'Ingresa al menos una velocidad');
            return;
        }

        // Parsear velocidades separadas por coma
        const velocidadesArray = velocidadesInput
            .split(',')
            .map(v => parseFloat(v.trim()))
            .filter(v => !isNaN(v) && v > 0);

        if (velocidadesArray.length === 0) {
            Alert.alert('Error', 'Ingresa velocidades válidas (números separados por coma)');
            return;
        }

        // Buscar si ya existe medición para este tipo
        const indiceExistente = mediciones.findIndex(m => m.tipo_vehiculo === tipoSeleccionado);

        let nuevasMediciones: MedicionVelocidad[];
        if (indiceExistente >= 0) {
            // Agregar velocidades al tipo existente
            nuevasMediciones = [...mediciones];
            nuevasMediciones[indiceExistente] = {
                ...nuevasMediciones[indiceExistente],
                velocidades: [...nuevasMediciones[indiceExistente].velocidades, ...velocidadesArray],
            };
        } else {
            // Crear nueva medición
            nuevasMediciones = [
                ...mediciones,
                {
                    tipo_vehiculo: tipoSeleccionado,
                    velocidades: velocidadesArray,
                },
            ];
        }

        setMediciones(nuevasMediciones);
        onChange(nuevasMediciones);
        setVelocidadesInput('');
    };

    const eliminarMedicion = (tipo: string) => {
        const nuevasMediciones = mediciones.filter(m => m.tipo_vehiculo !== tipo);
        setMediciones(nuevasMediciones);
        onChange(nuevasMediciones);
    };

    const calcularEstadisticas = (velocidades: number[]) => {
        if (velocidades.length === 0) return null;

        const ordenadas = [...velocidades].sort((a, b) => a - b);
        const promedio = velocidades.reduce((sum, v) => sum + v, 0) / velocidades.length;
        const minima = ordenadas[0];
        const maxima = ordenadas[ordenadas.length - 1];

        return { promedio, minima, maxima, total: velocidades.length };
    };

    const tipoLabel = (tipo: string) => {
        const encontrado = TIPOS_VEHICULOS.find(t => t.value === tipo);
        return encontrado ? encontrado.label : tipo;
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Toma de Velocidad</Text>

            {/* Formulario de entrada */}
            {!readonly && (
                <View style={styles.inputSection}>
                    <Text style={styles.label}>Tipo de Vehículo</Text>
                    <View style={styles.tiposContainer}>
                        {TIPOS_VEHICULOS.map(tipo => (
                            <TouchableOpacity
                                key={tipo.value}
                                style={[
                                    styles.tipoChip,
                                    tipoSeleccionado === tipo.value && styles.tipoChipSelected,
                                ]}
                                onPress={() => setTipoSeleccionado(tipo.value)}
                            >
                                <Text
                                    style={[
                                        styles.tipoChipText,
                                        tipoSeleccionado === tipo.value && styles.tipoChipTextSelected,
                                    ]}
                                >
                                    {tipo.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Velocidades (km/h, separadas por coma)</Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            value={velocidadesInput}
                            onChangeText={setVelocidadesInput}
                            placeholder="Ej: 55, 80, 100, 69"
                            keyboardType="numbers-and-punctuation"
                        />
                        <TouchableOpacity style={styles.addButton} onPress={agregarMedicion}>
                            <MaterialIcons name="add" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.hint}>
                        Ingresa las velocidades medidas separadas por coma
                    </Text>
                </View>
            )}

            {/* Lista de mediciones */}
            <ScrollView style={styles.medicionesContainer}>
                {mediciones.length === 0 ? (
                    <Text style={styles.emptyText}>
                        {readonly ? 'No hay mediciones registradas' : 'Agrega mediciones usando el formulario arriba'}
                    </Text>
                ) : (
                    mediciones.map((medicion, index) => {
                        const stats = calcularEstadisticas(medicion.velocidades);
                        return (
                            <View key={index} style={styles.medicionCard}>
                                <View style={styles.medicionHeader}>
                                    <Text style={styles.medicionTipo}>
                                        {tipoLabel(medicion.tipo_vehiculo)}
                                    </Text>
                                    {!readonly && (
                                        <TouchableOpacity
                                            onPress={() => eliminarMedicion(medicion.tipo_vehiculo)}
                                        >
                                            <MaterialIcons name="delete" size={20} color={COLORS.error} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <Text style={styles.velocidadesText}>
                                    {medicion.velocidades.join(', ')} km/h
                                </Text>

                                {stats && (
                                    <View style={styles.statsContainer}>
                                        <View style={styles.statItem}>
                                            <Text style={styles.statLabel}>Mediciones:</Text>
                                            <Text style={styles.statValue}>{stats.total}</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Text style={styles.statLabel}>Promedio:</Text>
                                            <Text style={styles.statValue}>{stats.promedio.toFixed(1)} km/h</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Text style={styles.statLabel}>Mínima:</Text>
                                            <Text style={styles.statValue}>{stats.minima} km/h</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Text style={styles.statLabel}>Máxima:</Text>
                                            <Text style={styles.statValue}>{stats.maxima} km/h</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        );
                    })
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
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text.primary,
        marginBottom: 12,
    },
    inputSection: {
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text.primary,
        marginBottom: 8,
    },
    tiposContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    tipoChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: '#fff',
    },
    tipoChipSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    tipoChipText: {
        fontSize: 12,
        color: COLORS.text.secondary,
    },
    tipoChipTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    inputRow: {
        flexDirection: 'row',
        gap: 8,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        backgroundColor: '#fff',
    },
    addButton: {
        backgroundColor: COLORS.primary,
        width: 44,
        height: 44,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hint: {
        fontSize: 12,
        color: COLORS.text.secondary,
        marginTop: 4,
        fontStyle: 'italic',
    },
    medicionesContainer: {
        maxHeight: 400,
    },
    emptyText: {
        textAlign: 'center',
        color: COLORS.text.secondary,
        fontSize: 14,
        marginTop: 20,
        fontStyle: 'italic',
    },
    medicionCard: {
        backgroundColor: COLORS.background,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    medicionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    medicionTipo: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text.primary,
    },
    velocidadesText: {
        fontSize: 14,
        color: COLORS.text.secondary,
        marginBottom: 12,
    },
    statsContainer: {
        backgroundColor: '#fff',
        borderRadius: 6,
        padding: 10,
        gap: 6,
    },
    statItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statLabel: {
        fontSize: 13,
        color: COLORS.text.secondary,
    },
    statValue: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text.primary,
    },
});
