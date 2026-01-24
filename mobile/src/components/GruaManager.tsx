/**
 * GruaManager
 * 
 * Wrapper para GruaForm que maneja múltiples grúas.
 * Similar a VehiculoManager pero para grúas.
 * 
 * Fecha: 2026-01-22
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Control, useFieldArray } from 'react-hook-form';
import { Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { GruaForm } from './GruaForm';
import { COLORS } from '../constants/colors';

interface Props {
    control: Control<any>;
    name?: string;
    maxGruas?: number;
    readonly?: boolean;
    label?: string;
}

export default function GruaManager({
    control,
    name = 'gruas',
    maxGruas = 10,
    readonly = false,
    label = 'Grúas',
}: Props) {
    const { fields, append, remove } = useFieldArray({
        control,
        name,
    });

    const agregarGrua = () => {
        try {
            if (fields.length >= maxGruas) {
                console.warn('Máximo de grúas alcanzado');
                return;
            }

            // Agregar con valores por defecto completos
            append({
                empresa: '',
                placa: '',
                tipo: '',
                piloto: '',
                traslado: false,
                traslado_a: '',
                costo_traslado: 0,
            });
        } catch (error) {
            console.error('Error al agregar grúa:', error);
        }
    };

    const eliminarGrua = (index: number) => {
        try {
            if (fields.length === 0) {
                console.warn('No hay grúas para eliminar');
                return;
            }
            remove(index);
        } catch (error) {
            console.error('Error al eliminar grúa:', error);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{label}</Text>
                {!readonly && fields.length < maxGruas && (
                    <Button
                        mode="contained"
                        icon="plus"
                        onPress={agregarGrua}
                        compact
                        style={styles.addButton}
                    >
                        Agregar Grúa
                    </Button>
                )}
            </View>

            <ScrollView style={styles.listContainer}>
                {fields.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="local-shipping" size={48} color={COLORS.text.disabled} />
                        <Text style={styles.emptyText}>
                            {readonly ? 'No hay grúas registradas' : 'Presiona "Agregar Grúa" para comenzar'}
                        </Text>
                    </View>
                ) : (
                    fields.map((field, index) => (
                        <View key={field.id}>
                            <GruaForm
                                control={control}
                                index={index}
                                onRemove={() => eliminarGrua(index)}
                            />
                        </View>
                    ))
                )}
            </ScrollView>
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
    addButton: {
        backgroundColor: COLORS.primary,
    },
    listContainer: {
        flex: 1,
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
});
