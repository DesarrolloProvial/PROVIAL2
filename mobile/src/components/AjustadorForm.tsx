import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Controller, Control, useWatch } from 'react-hook-form';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../core/theme';
import CrossPlatformPicker from './CrossPlatformPicker';

interface AjustadorFormProps {
    control: Control<any>;
    index: number;
    onRemove: () => void;
}

export const AjustadorForm: React.FC<AjustadorFormProps> = ({ control, index, onRemove }) => {
    const theme = useTheme();
    const c = theme.colors;

    const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
        datosAjustador: true,
        vehiculo: false,
    });

    const vehiculos = useWatch({ control, name: 'vehiculos' }) || [];

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const inputStyle = [
        styles.input,
        { borderColor: c.border, backgroundColor: c.surface, color: c.text.primary },
    ];

    return (
        <View style={[styles.container, { borderColor: c.border, backgroundColor: c.surface }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: c.border }]}>
                <Text style={[styles.title, { color: c.text.primary }]}>Ajustador {index + 1}</Text>
                <TouchableOpacity
                    onPress={() => Alert.alert(
                        'Eliminar ajustador',
                        `¿Deseas eliminar el ajustador ${index + 1}?`,
                        [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Eliminar', style: 'destructive', onPress: onRemove },
                        ]
                    )}
                    style={styles.removeBtn}
                >
                    <Text style={[styles.removeBtnText, { color: c.danger }]}>Eliminar</Text>
                </TouchableOpacity>
            </View>

            {/* Sección 1: Datos del Ajustador */}
            <TouchableOpacity
                style={[styles.accordionHeader, { backgroundColor: c.background, borderColor: c.border }]}
                onPress={() => toggleSection('datosAjustador')}
                activeOpacity={0.7}
            >
                <Text style={[styles.accordionTitle, { color: c.text.primary }]}>Datos del Ajustador</Text>
                <MaterialCommunityIcons
                    name={expandedSections.datosAjustador ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={c.text.secondary}
                />
            </TouchableOpacity>

            {expandedSections.datosAjustador && (
                <View style={[styles.section, { backgroundColor: c.surface }]}>
                    {vehiculos.length > 0 && (
                        <Controller
                            control={control}
                            name={`ajustadores.${index}.vehiculo_index`}
                            render={({ field: { onChange, value } }) => (
                                <CrossPlatformPicker
                                    label="Vehículo Atendido"
                                    selectedValue={value ?? ''}
                                    onValueChange={onChange}
                                    placeholder="Ninguno / General"
                                    options={vehiculos.map((v: any, idx: number) => ({
                                        label: `Vehículo ${idx + 1} - ${v.placa || 'Sin placa'} (${v.marca || 'Marca?'})`,
                                        value: idx.toString(),
                                    }))}
                                />
                            )}
                        />
                    )}

                    {[
                        { name: 'empresa', label: 'Aseguradora', placeholder: 'Ej: El Roble, Seguros G&T', keyboard: 'default' as const },
                        { name: 'nombre', label: 'Nombre del Ajustador', placeholder: '', keyboard: 'default' as const },
                        { name: 'telefono', label: 'Teléfono', placeholder: 'Ej: 5555-5555', keyboard: 'phone-pad' as const },
                    ].map(({ name, label, placeholder, keyboard }) => (
                        <View key={name} style={styles.fieldGroup}>
                            <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>{label}</Text>
                            <Controller
                                control={control}
                                name={`ajustadores.${index}.${name}`}
                                render={({ field: { onChange, value } }) => (
                                    <TextInput
                                        value={value || ''}
                                        onChangeText={onChange}
                                        keyboardType={keyboard}
                                        style={inputStyle}
                                        placeholder={placeholder}
                                        placeholderTextColor={c.text.disabled}
                                    />
                                )}
                            />
                        </View>
                    ))}
                </View>
            )}

            {/* Sección 2: Vehículo del Ajustador */}
            <TouchableOpacity
                style={[styles.accordionHeader, { backgroundColor: c.background, borderColor: c.border }]}
                onPress={() => toggleSection('vehiculo')}
                activeOpacity={0.7}
            >
                <Text style={[styles.accordionTitle, { color: c.text.primary }]}>Vehículo del Ajustador</Text>
                <MaterialCommunityIcons
                    name={expandedSections.vehiculo ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={c.text.secondary}
                />
            </TouchableOpacity>

            {expandedSections.vehiculo && (
                <View style={[styles.section, { backgroundColor: c.surface }]}>
                    {[
                        { name: 'vehiculo_placa', label: 'Placa', placeholder: 'P512KJF', caps: 'characters' as const },
                        { name: 'vehiculo_marca', label: 'Marca', placeholder: 'Ej: Toyota, Honda', caps: 'sentences' as const },
                        { name: 'vehiculo_color', label: 'Color', placeholder: 'Ej: Blanco, Negro', caps: 'sentences' as const },
                    ].map(({ name, label, placeholder, caps }) => (
                        <View key={name} style={styles.fieldGroup}>
                            <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>{label}</Text>
                            <Controller
                                control={control}
                                name={`ajustadores.${index}.${name}`}
                                render={({ field: { onChange, value } }) => (
                                    <TextInput
                                        value={value || ''}
                                        onChangeText={onChange}
                                        autoCapitalize={caps}
                                        style={inputStyle}
                                        placeholder={placeholder}
                                        placeholderTextColor={c.text.disabled}
                                    />
                                )}
                            />
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 12,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: { fontSize: 17, fontWeight: '700' },
    removeBtn: { paddingVertical: 6, paddingHorizontal: 10 },
    removeBtnText: { fontSize: 14, fontWeight: '600' },
    accordionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    accordionTitle: { fontSize: 15, fontWeight: '600' },
    section: { paddingHorizontal: 14, paddingVertical: 10 },
    fieldGroup: { marginBottom: 12 },
    fieldLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
    },
});
