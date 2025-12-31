import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Controller, Control, useWatch } from 'react-hook-form';
import { TextInput, Button, Switch, List } from 'react-native-paper';

interface GruaFormProps {
    control: Control<any>;
    index: number;
    onRemove: () => void;
}

export const GruaForm: React.FC<GruaFormProps> = ({ control, index, onRemove }) => {
    const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
        datosGrua: true,
        traslado: false,
    });

    const realizoTraslado = useWatch({ control, name: `gruas.${index}.traslado` });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Grúa {index + 1}</Text>
                <Button onPress={onRemove} textColor="red" mode="text">Eliminar</Button>
            </View>

            {/* Sección 1: Datos de Grúa */}
            <List.Accordion
                title="Datos de Grúa"
                expanded={expandedSections.datosGrua}
                onPress={() => toggleSection('datosGrua')}
                style={styles.accordion}
                titleStyle={styles.accordionTitle}
            >
                <View style={styles.section}>
                    <Controller
                        control={control}
                        name={`gruas.${index}.empresa`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                label="Empresa"
                                value={value || ''}
                                onChangeText={onChange}
                                mode="outlined"
                                style={styles.input}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name={`gruas.${index}.placa`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                label="Placa Grúa"
                                value={value || ''}
                                onChangeText={onChange}
                                mode="outlined"
                                autoCapitalize="characters"
                                style={styles.input}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name={`gruas.${index}.tipo`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                label="Tipo de Grúa"
                                value={value || ''}
                                onChangeText={onChange}
                                mode="outlined"
                                placeholder="Ej: Plataforma, Gancho"
                                style={styles.input}
                            />
                        )}
                    />
                    <Controller
                        control={control}
                        name={`gruas.${index}.piloto`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                label="Nombre del Operador"
                                value={value || ''}
                                onChangeText={onChange}
                                mode="outlined"
                                style={styles.input}
                            />
                        )}
                    />
                </View>
            </List.Accordion>

            {/* Sección 2: Traslado (condicional) */}
            <View style={styles.switchRow}>
                <Text>¿Realizó traslado?</Text>
                <Controller
                    control={control}
                    name={`gruas.${index}.traslado`}
                    render={({ field: { onChange, value } }) => (
                        <Switch value={value || false} onValueChange={onChange} />
                    )}
                />
            </View>

            {realizoTraslado && (
                <List.Accordion
                    title="Datos de Traslado"
                    expanded={expandedSections.traslado}
                    onPress={() => toggleSection('traslado')}
                    style={styles.accordion}
                    titleStyle={styles.accordionTitle}
                >
                    <View style={styles.section}>
                        <Controller
                            control={control}
                            name={`gruas.${index}.traslado_a`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    label="Lugar de Traslado"
                                    value={value || ''}
                                    onChangeText={onChange}
                                    mode="outlined"
                                    placeholder="Ej: Parqueo municipal, Taller XYZ"
                                    multiline
                                    numberOfLines={2}
                                    style={styles.input}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name={`gruas.${index}.costo_traslado`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    label="Costo de Traslado (Q)"
                                    value={value?.toString() || ''}
                                    onChangeText={(text) => onChange(parseFloat(text) || 0)}
                                    mode="outlined"
                                    keyboardType="decimal-pad"
                                    style={styles.input}
                                />
                            )}
                        />
                    </View>
                </List.Accordion>
            )}
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
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 4,
        marginBottom: 8,
    },
});
