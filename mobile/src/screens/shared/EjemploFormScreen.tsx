/**
 * EjemploFormScreen
 * 
 * Pantalla de ejemplo mostrando cómo usar el FormBuilder.
 * Esta pantalla demuestra el uso completo del sistema.
 * 
 * Fecha: 2026-01-22
 * FASE 1 - DÍA 2
 */

import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { FormBuilder } from '../../core/FormBuilder';
import { ejemploFormularioSimple } from '../../config/formularios/ejemploForms';

export default function EjemploFormScreen() {
    const handleSubmit = async (data: any) => {
        console.log('Datos del formulario:', data);

        // Aquí iría la lógica de guardado/envío
        // Por ejemplo:
        // await api.post('/situaciones', data);

        Alert.alert(
            'Formulario Enviado',
            `Datos recibidos:\n${JSON.stringify(data, null, 2)}`,
            [{ text: 'OK' }]
        );
    };

    const handleChange = (data: any) => {
        console.log('Formulario actualizado:', data);
        // Aquí podrías implementar auto-guardado
    };

    return (
        <View style={styles.container}>
            <FormBuilder
                config={ejemploFormularioSimple}
                onSubmit={handleSubmit}
                onChange={handleChange}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
