import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Controller, Control, useWatch } from 'react-hook-form';
import { TextInput, RadioButton } from 'react-native-paper';
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
    const prefix = `vehiculos.${vehiculoIndex}.personas.${personaIndex}`;
    const estado = useWatch({ control, name: `${prefix}.estado` });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Persona {personaIndex + 1}</Text>
                <Text onPress={onRemove} style={styles.removeBtn}>Eliminar</Text>
            </View>

            <Controller
                control={control}
                name={`${prefix}.nombre`}
                render={({ field: { onChange, value } }) => (
                    <TextInput label="Nombre" value={value || ''} onChangeText={onChange} mode="outlined" style={styles.input} />
                )}
            />

            <View style={styles.row}>
                <Controller
                    control={control}
                    name={`${prefix}.dpi`}
                    render={({ field: { onChange, value } }) => (
                        <TextInput label="DPI" value={value || ''} onChangeText={onChange} keyboardType="numeric" mode="outlined" style={[styles.input, styles.flex1]} />
                    )}
                />
                <Controller
                    control={control}
                    name={`${prefix}.edad`}
                    render={({ field: { onChange, value } }) => (
                        <TextInput label="Edad" value={value?.toString() || ''} onChangeText={t => onChange(parseInt(t) || '')} keyboardType="numeric" mode="outlined" style={[styles.input, { width: 80 }]} />
                    )}
                />
            </View>

            <Text style={styles.label}>Género</Text>
            <Controller
                control={control}
                name={`${prefix}.genero`}
                render={({ field: { onChange, value } }) => (
                    <RadioButton.Group onValueChange={onChange} value={value || ''}>
                        <View style={styles.radioRow}>
                            <RadioButton.Item label="M" value="M" mode="android" style={styles.radioItem} />
                            <RadioButton.Item label="F" value="F" mode="android" style={styles.radioItem} />
                        </View>
                    </RadioButton.Group>
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
                    <Controller
                        control={control}
                        name={`${prefix}.hospital_traslado`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput label="Hospital de Traslado" value={value || ''} onChangeText={onChange} mode="outlined" style={styles.input} />
                        )}
                    />
                    <Controller
                        control={control}
                        name={`${prefix}.descripcion_lesiones`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput label="Descripción de Lesiones" value={value || ''} onChangeText={onChange} mode="outlined" multiline numberOfLines={2} style={styles.input} />
                        )}
                    />
                </>
            )}

            {estado === 'FALLECIDO' && (
                <>
                    <Controller
                        control={control}
                        name={`${prefix}.causa_fallecimiento`}
                        render={({ field: { onChange, value } }) => (
                            <TextInput label="Causa Aparente de Fallecimiento" value={value || ''} onChangeText={onChange} mode="outlined" multiline numberOfLines={2} style={styles.input} />
                        )}
                    />
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
        padding: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        marginBottom: 10,
        backgroundColor: '#fafafa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: { fontSize: 14, fontWeight: '600' },
    removeBtn: { color: '#ef4444', fontSize: 13 },
    input: { marginBottom: 8, backgroundColor: '#fff' },
    row: { flexDirection: 'row', gap: 8 },
    flex1: { flex: 1 },
    label: { fontSize: 13, color: '#666', marginBottom: 4, marginTop: 4 },
    radioRow: { flexDirection: 'row' },
    radioItem: { flex: 1 },
});
