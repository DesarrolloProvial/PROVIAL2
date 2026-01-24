/**
 * AjustadorManager
 * 
 * Wrapper para AjustadorForm que maneja múltiples ajustadores.
 * Similar a VehiculoManager y GruaManager.
 * 
 * Fecha: 2026-01-22
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Control, useFieldArray } from 'react-hook-form';
import { Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { AjustadorForm } from './AjustadorForm';
import { COLORS } from '../constants/colors';

interface Props {
    control: Control<any>;
    name?: string;
    maxAjustadores?: number;
    readonly?: boolean;
    label?: string;
}

export default function AjustadorManager({
    control,
    name = 'ajustadores',
    maxAjustadores = 10,
    readonly = false,
    label = 'Ajustadores',
}: Props) {
    const { fields, append, remove } = useFieldArray({
        control,
        name,
    });

    const agregarAjustador = () => {
        try {
            if (fields.length >= maxAjustadores) {
                console.warn('Máximo de ajustadores alcanzado');
                return;
            }

            // Agregar con valores por defecto completos
            append({
                empresa: '',
                nombre: '',
                telefono: '',
                vehiculo_placa: '',
                vehiculo_marca: '',
                vehiculo_color: '',
            });
        } catch (error) {
            console.error('Error al agregar ajustador:', error);
        }
    };

    const eliminarAjustador = (index: number) => {
        try {
            if (fields.length === 0) {
                console.warn('No hay ajustadores para eliminar');
                return;
            }
            remove(index);
        } catch (error) {
            console.error('Error al eliminar ajustador:', error);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{label}</Text>
                {!readonly && fields.length < maxAjustadores && (
                    <Button
                        mode="contained"
                        icon="plus"
                        onPress={agregarAjustador}
                        compact
                        style={styles.addButton}
                    >
                        Agregar Ajustador
                    </Button>
                )}
            </View>

            <ScrollView style={styles.listContainer}>
                {fields.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="person" size={48} color={COLORS.text.disabled} />
                        <Text style={styles.emptyText}>
                            {readonly ? 'No hay ajustadores registrados' : 'Presiona "Agregar Ajustador" para comenzar'}
                        </Text>
                    </View>
                ) : (
                    fields.map((field, index) => (
                        <View key={field.id}>
                            <AjustadorForm
                                control={control}
                                index={index}
                                onRemove={() => eliminarAjustador(index)}
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
