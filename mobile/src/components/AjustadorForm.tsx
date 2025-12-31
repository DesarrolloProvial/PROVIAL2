import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Controller, Control } from 'react-hook-form';
import { TextInput, Button, List } from 'react-native-paper';

interface AjustadorFormProps {
    control: Control<any>;
    index: number;
    onRemove: () => void;
}

export const AjustadorForm: React.FC<AjustadorFormProps> = ({ control, index, onRemove }) => {
    const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
        datosAjustador: true,
        vehiculo: false,
    });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Ajustador {index + 1}</Text>
                <Button onPress={onRemove} textColor="red" mode="text">Eliminar</Button>
            </View>

            {/* Sección 1: Datos del Ajustador */}
            <List.Accordion
                title="Datos del Ajustador"
                expanded={expandedSections.datosAjustador}
                onPress={() => toggleSection('datosAjustador')}
                style={styles.accordion}
                titleStyle={styles.accordionTitle}
            >
                <View style={styles.section}>
                    <Controller
                        control={control}
                        name={`ajustadores.${index}.empresa`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                label="Aseguradora"
                                value={value || ''}
                                onChangeText={onChange}
                                mode="outlined"
                                placeholder="Ej: El Roble, Seguros G&T"
                                style={styles.input}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name={`ajustadores.${index}.nombre`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                label="Nombre del Ajustador"
                                value={value || ''}
                                onChangeText={onChange}
                                mode="outlined"
                                style={styles.input}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name={`ajustadores.${index}.telefono`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                label="Teléfono"
                                value={value || ''}
                                onChangeText={onChange}
                                mode="outlined"
                                keyboardType="phone-pad"
                                placeholder="Ej: 5555-5555"
                                style={styles.input}
                            />
                        )}
                    />
                </View>
            </List.Accordion>

            {/* Sección 2: Vehículo del Ajustador */}
            <List.Accordion
                title="Vehículo del Ajustador"
                expanded={expandedSections.vehiculo}
                onPress={() => toggleSection('vehiculo')}
                style={styles.accordion}
                titleStyle={styles.accordionTitle}
            >
                <View style={styles.section}>
                    <Controller
                        control={control}
                        name={`ajustadores.${index}.vehiculo_placa`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                label="Placa"
                                value={value || ''}
                                onChangeText={onChange}
                                mode="outlined"
                                autoCapitalize="characters"
                                placeholder="P512KJF"
                                style={styles.input}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name={`ajustadores.${index}.vehiculo_marca`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                label="Marca"
                                value={value || ''}
                                onChangeText={onChange}
                                mode="outlined"
                                placeholder="Ej: Toyota, Honda"
                                style={styles.input}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name={`ajustadores.${index}.vehiculo_color`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                label="Color"
                                value={value || ''}
                                onChangeText={onChange}
                                mode="outlined"
                                placeholder="Ej: Blanco, Negro"
                                style={styles.input}
                            />
                        )}
                    />
                </View>
            </List.Accordion>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 10,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    accordion: {
        backgroundColor: '#f5f5f5',
        marginBottom: 8,
        borderRadius: 4,
    },
    accordionTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    section: {
        padding: 12,
        backgroundColor: '#fff',
    },
    input: {
        marginBottom: 10,
        backgroundColor: '#fff',
    },
});
