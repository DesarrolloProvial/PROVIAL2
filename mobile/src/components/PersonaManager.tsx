import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Control, useFieldArray } from 'react-hook-form';
import { Button } from 'react-native-paper';
import { PersonaForm } from './PersonaForm';

interface Props {
    control: Control<any>;
    vehiculoIndex: number;
}

export default function PersonaManager({ control, vehiculoIndex }: Props) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `vehiculos.${vehiculoIndex}.personas`,
    });

    const agregarPersona = () => {
        append({
            nombre: '',
            dpi: '',
            edad: '',
            genero: '',
            tipo_persona: 'ACOMPANANTE',
            estado: 'ILESO',
            hospital_traslado: '',
            descripcion_lesiones: '',
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Personas ({fields.length})</Text>
                <Button mode="outlined" icon="account-plus" onPress={agregarPersona} compact>
                    Agregar
                </Button>
            </View>
            {fields.map((field, index) => (
                <PersonaForm
                    key={field.id}
                    control={control}
                    vehiculoIndex={vehiculoIndex}
                    personaIndex={index}
                    onRemove={() => remove(index)}
                />
            ))}
            {fields.length === 0 && (
                <Text style={styles.emptyText}>Sin personas registradas</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginTop: 4 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: { fontSize: 15, fontWeight: '600', color: '#333' },
    emptyText: { color: '#999', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
});
