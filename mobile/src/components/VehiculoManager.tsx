/**
 * VehiculoManager
 * 
 * Wrapper para VehiculoForm que maneja múltiples vehículos.
 * Permite agregar/eliminar vehículos y renderiza VehiculoForm para cada uno.
 * 
 * Fecha: 2026-01-22
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Control, useFieldArray } from 'react-hook-form';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../core/theme';
import { VehiculoForm } from './VehiculoForm';

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
    const theme = useTheme();
    const c = theme.colors;

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
            estado_piloto: 'ILESO',
            ebriedad: false,
            personas: [],
            dispositivos: [],
            custodia_estado: 'LIBRE',
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
    const didAutoAppend = useRef(false);
    React.useEffect(() => {
        if (!didAutoAppend.current && fields.length === 0 && (required || minVehiculos > 0)) {
            didAutoAppend.current = true;
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
                estado_piloto: 'ILESO',
                ebriedad: false,
                personas: [],
                dispositivos: [],
                custodia_estado: 'LIBRE',
            });
        }
    }, []); // Solo ejecutar una vez al montar

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: c.text.primary }]}>{label}</Text>
                    {maxVehiculos > 1 && (
                        <Text style={[styles.subtitle, { color: c.text.secondary }]}>
                            {fields.length} de {maxVehiculos} vehículos
                        </Text>
                    )}
                </View>
                {!readonly && fields.length < maxVehiculos && (
                    <TouchableOpacity
                        onPress={agregarVehiculo}
                        style={[styles.addButton, { backgroundColor: c.primary }]}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="plus" size={16} color={c.text.inverse} />
                        <Text style={[styles.addButtonText, { color: c.text.inverse }]}>Agregar Vehículo</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView style={styles.vehiculosContainer}>
                {fields.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="directions-car" size={48} color={c.text.disabled} />
                        <Text style={[styles.emptyText, { color: c.text.secondary }]}>
                            {readonly ? 'No hay vehículos registrados' : 'Presiona "Agregar Vehículo" para comenzar'}
                        </Text>
                    </View>
                ) : (
                    fields.map((field, index) => (
                        <View key={field.id} style={[styles.vehiculoCard, { borderColor: c.border, backgroundColor: c.surface }]}>
                            <View style={[styles.vehiculoHeader, { borderBottomColor: c.border }]}>
                                <Text style={[styles.vehiculoNumber, { color: c.primary }]}>Vehículo #{index + 1}</Text>
                                {!readonly && fields.length > minVehiculos && (
                                    <TouchableOpacity
                                        onPress={() => eliminarVehiculo(index)}
                                        style={styles.deleteButton}
                                    >
                                        <MaterialIcons name="delete" size={24} color={c.danger} />
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
                <Text style={[styles.errorText, { color: c.danger }]}>Se requiere al menos un vehículo</Text>
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
    },
    subtitle: {
        fontSize: 14,
        marginTop: 2,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 8,
    },
    addButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    vehiculosContainer: {
        flex: 1,
    },
    vehiculoCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
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
    },
    vehiculoNumber: {
        fontSize: 16,
        fontWeight: '600',
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
        textAlign: 'center',
    },
    errorText: {
        fontSize: 14,
        marginTop: 8,
        paddingHorizontal: 4,
    },
});
