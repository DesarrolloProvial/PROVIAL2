/**
 * VehiculoManager
 * 
 * Wrapper para VehiculoForm que maneja múltiples vehículos.
 * Permite agregar/eliminar vehículos y renderiza VehiculoForm para cada uno.
 * 
 * Fecha: 2026-01-22
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Control, useFieldArray } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { VehiculoForm } from './VehiculoForm';
import { COLORS } from '../constants/colors';

interface Props {
    control: Control<any>;
    name?: string; // Nombre del campo en el formulario (default: 'vehiculos')
    maxVehiculos?: number; // Máximo de vehículos permitidos
    minVehiculos?: number; // Mínimo de vehículos requeridos
    required?: boolean;
    readonly?: boolean;
    label?: string;
}

export default function VehiculoManager({
    control,
    name = 'vehiculos',
    maxVehiculos = 100,
    minVehiculos = 0,
    required = false,
    readonly = false,
    label = 'Vehículos',
}: Props) {
    const { fields, append, remove } = useFieldArray({
        control,
        name,
    });

    const agregarVehiculo = () => {
        if (fields.length >= maxVehiculos) {
            return;
        }
        append({
            // Valores por defecto para un vehículo nuevo
            tipo_vehiculo: '',
            marca: '',
            placa: '',
            color: '',
            sexo_piloto: '',
            cargado: false,
            tiene_contenedor: false,
            es_bus: false,
            tiene_sancion: false,
        });
    };

    const eliminarVehiculo = (index: number) => {
        // Permitir eliminar siempre que queden más de minVehiculos
        if (fields.length <= minVehiculos) {
            return;
        }
        remove(index);
    };

    // Si no hay vehículos y es requerido, agregar uno automáticamente
    React.useEffect(() => {
        if (fields.length === 0 && (required || minVehiculos > 0)) {
            append({
                tipo_vehiculo: '',
                marca: '',
                placa: '',
                color: '',
                sexo_piloto: '',
                cargado: false,
                tiene_contenedor: false,
                es_bus: false,
                tiene_sancion: false,
            });
        }
    }, []); // Solo ejecutar una vez al montar

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>{label}</Text>
                    {maxVehiculos > 1 && (
                        <Text style={styles.subtitle}>
                            {fields.length} de {maxVehiculos} vehículos
                        </Text>
                    )}
                </View>
                {!readonly && fields.length < maxVehiculos && (
                    <Button
                        mode="contained"
                        icon="plus"
                        onPress={agregarVehiculo}
                        style={styles.addButton}
                        compact
                    >
                        Agregar Vehículo
                    </Button>
                )}
            </View>

            <ScrollView style={styles.vehiculosContainer}>
                {fields.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="directions-car" size={48} color={COLORS.text.disabled} />
                        <Text style={styles.emptyText}>
                            {readonly ? 'No hay vehículos registrados' : 'Presiona "Agregar Vehículo" para comenzar'}
                        </Text>
                    </View>
                ) : (
                    fields.map((field, index) => (
                        <View key={field.id} style={styles.vehiculoCard}>
                            <View style={styles.vehiculoHeader}>
                                <Text style={styles.vehiculoNumber}>Vehículo #{index + 1}</Text>
                                {!readonly && fields.length > minVehiculos && (
                                    <TouchableOpacity
                                        onPress={() => eliminarVehiculo(index)}
                                        style={styles.deleteButton}
                                    >
                                        <MaterialIcons name="delete" size={24} color={COLORS.error} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <VehiculoForm
                                control={control}
                                index={index}
                                onRemove={() => eliminarVehiculo(index)}
                            />
                        </View>
                    ))
                )}
            </ScrollView>

            {required && fields.length === 0 && (
                <Text style={styles.errorText}>Se requiere al menos un vehículo</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text.primary,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.text.secondary,
        marginTop: 2,
    },
    addButton: {
        backgroundColor: COLORS.primary,
    },
    vehiculosContainer: {
        flex: 1,
    },
    vehiculoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    vehiculoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    vehiculoNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.primary,
    },
    deleteButton: {
        padding: 4,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 14,
        color: COLORS.text.secondary,
        textAlign: 'center',
    },
    errorText: {
        color: COLORS.error,
        fontSize: 14,
        marginTop: 8,
        paddingHorizontal: 4,
    },
});
