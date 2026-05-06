import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Controller, Control, useWatch } from 'react-hook-form';
import { useTheme } from '../core/theme';
import CrossPlatformPicker from './CrossPlatformPicker';

interface PersonaFormProps {
    control: Control<any>;
    vehiculoIndex: number;
    personaIndex: number;
    onRemove: () => void;
}

const TIPO_PERSONA_OPTIONS = [
    { label: 'Acompañante', value: 'ACOMPANANTE' },
    { label: 'Pasajero', value: 'PASAJERO' },
    { label: 'Peatón', value: 'PEATON' },
];

const ESTADO_OPTIONS = [
    { label: 'Ileso', value: 'ILESO' },
    { label: 'Herido', value: 'HERIDO' },
    { label: 'Trasladado', value: 'TRASLADADO' },
    { label: 'Fallecido', value: 'FALLECIDO' },
    { label: 'Fugado', value: 'FUGADO' },
    { label: 'Desconocido', value: 'DESCONOCIDO' },
];

export const PersonaForm: React.FC<PersonaFormProps> = ({ control, vehiculoIndex, personaIndex, onRemove }) => {
    const theme = useTheme();
    const c = theme.colors;

    const prefix = `vehiculos.${vehiculoIndex}.personas.${personaIndex}`;
    const estado = useWatch({ control, name: `${prefix}.estado` });

    const inputStyle = [
        styles.input,
        { borderColor: c.border, backgroundColor: c.surface, color: c.text.primary },
    ];

    return (
        <View style={[styles.container, { borderColor: c.border, backgroundColor: c.surface }]}>
            <View style={[styles.header, { borderBottomColor: c.border }]}>
                <Text style={[styles.title, { color: c.text.primary }]}>Persona {personaIndex + 1}</Text>
                <TouchableOpacity
                    onPress={() => Alert.alert(
                        'Eliminar persona',
                        `¿Deseas eliminar a la persona ${personaIndex + 1}?`,
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

            <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Nombre</Text>
                <Controller
                    control={control}
                    name={`${prefix}.nombre`}
                    render={({ field: { onChange, value } }) => (
                        <TextInput
                            value={value || ''}
                            onChangeText={onChange}
                            style={inputStyle}
                            placeholderTextColor={c.text.disabled}
                        />
                    )}
                />
            </View>

            <View style={styles.row}>
                <View style={[styles.fieldGroup, styles.flex1]}>
                    <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>DPI</Text>
                    <Controller
                        control={control}
                        name={`${prefix}.dpi`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                value={value || ''}
                                onChangeText={onChange}
                                keyboardType="numeric"
                                style={inputStyle}
                                placeholderTextColor={c.text.disabled}
                            />
                        )}
                    />
                </View>
                <View style={[styles.fieldGroup, { width: 80 }]}>
                    <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Edad</Text>
                    <Controller
                        control={control}
                        name={`${prefix}.edad`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput
                                value={value?.toString() || ''}
                                onChangeText={(t) => onChange(parseInt(t) || '')}
                                keyboardType="numeric"
                                style={inputStyle}
                                placeholderTextColor={c.text.disabled}
                            />
                        )}
                    />
                </View>
            </View>

            {/* Género — radio row */}
            <Controller
                control={control}
                name={`${prefix}.genero`}
                render={({ field: { onChange, value } }) => (
                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Género</Text>
                        <View style={styles.radioRow}>
                            {[{ label: 'Masculino', val: 'M' }, { label: 'Femenino', val: 'F' }].map(({ label, val }) => {
                                const selected = value === val;
                                return (
                                    <TouchableOpacity
                                        key={val}
                                        onPress={() => onChange(val)}
                                        style={styles.radioOption}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.radioOuter, { borderColor: selected ? c.primary : c.border }]}>
                                            {selected && <View style={[styles.radioInner, { backgroundColor: c.primary }]} />}
                                        </View>
                                        <Text style={[styles.radioLabel, { color: c.text.primary }]}>{label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}
            />

            <Controller
                control={control}
                name={`${prefix}.tipo_persona`}
                render={({ field: { onChange, value } }) => (
                    <CrossPlatformPicker
                        label="Tipo de Persona"
                        selectedValue={value}
                        onValueChange={onChange}
                        options={TIPO_PERSONA_OPTIONS}
                        placeholder="Seleccione..."
                    />
                )}
            />

            <Controller
                control={control}
                name={`${prefix}.estado`}
                render={({ field: { onChange, value } }) => (
                    <CrossPlatformPicker
                        label="Estado"
                        selectedValue={value}
                        onValueChange={onChange}
                        options={ESTADO_OPTIONS}
                        placeholder="Seleccione..."
                    />
                )}
            />

            {(estado === 'HERIDO' || estado === 'TRASLADADO') && (
                <>
                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Hospital de Traslado</Text>
                        <Controller
                            control={control}
                            name={`${prefix}.hospital_traslado`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    value={value || ''}
                                    onChangeText={onChange}
                                    style={inputStyle}
                                    placeholderTextColor={c.text.disabled}
                                />
                            )}
                        />
                    </View>
                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Descripción de Lesiones</Text>
                        <Controller
                            control={control}
                            name={`${prefix}.descripcion_lesiones`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    value={value || ''}
                                    onChangeText={onChange}
                                    style={[inputStyle, { minHeight: 72, textAlignVertical: 'top' }]}
                                    multiline
                                    numberOfLines={2}
                                    placeholderTextColor={c.text.disabled}
                                />
                            )}
                        />
                    </View>
                </>
            )}

            {estado === 'FALLECIDO' && (
                <>
                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Causa Aparente de Fallecimiento</Text>
                        <Controller
                            control={control}
                            name={`${prefix}.causa_fallecimiento`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    value={value || ''}
                                    onChangeText={onChange}
                                    style={[inputStyle, { minHeight: 72, textAlignVertical: 'top' }]}
                                    multiline
                                    numberOfLines={2}
                                    placeholderTextColor={c.text.disabled}
                                />
                            )}
                        />
                    </View>
                    <Controller
                        control={control}
                        name={`${prefix}.lugar_fallecimiento`}
                        render={({ field: { onChange, value } }) => (
                            <CrossPlatformPicker
                                label="Lugar de Fallecimiento"
                                selectedValue={value}
                                onValueChange={onChange}
                                options={[
                                    { label: 'En el lugar del hecho', value: 'EN_LUGAR' },
                                    { label: 'En traslado al hospital', value: 'EN_TRASLADO' },
                                    { label: 'En el hospital', value: 'EN_HOSPITAL' },
                                    { label: 'Otro', value: 'OTRO' },
                                ]}
                                placeholder="Seleccione..."
                            />
                        )}
                    />
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 10,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: { fontSize: 14, fontWeight: '600' },
    removeBtn: { paddingVertical: 4, paddingHorizontal: 8 },
    removeBtnText: { fontSize: 13, fontWeight: '600' },
    fieldGroup: { marginBottom: 8, paddingHorizontal: 12 },
    fieldLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
    },
    row: { flexDirection: 'row', gap: 8 },
    flex1: { flex: 1 },
    radioRow: { flexDirection: 'row', gap: 20, marginTop: 4 },
    radioOption: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioInner: { width: 10, height: 10, borderRadius: 5 },
    radioLabel: { fontSize: 15 },
});
