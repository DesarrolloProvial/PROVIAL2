import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { TextInput } from 'react-native-paper';

const OTRO_VALUE = '__OTRO__';

interface Option {
    label: string;
    value: string;
}

interface SelectConOtroProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    otroLabel?: string;
    style?: any;
}

export default function SelectConOtro({
    label,
    value,
    onChange,
    options,
    placeholder = 'Seleccionar...',
    otroLabel = 'Otro',
    style,
}: SelectConOtroProps) {
    // Determinar si el valor actual es "otro" (no está en las opciones)
    const isOtro = value !== '' && value !== null && value !== undefined
        && !options.some(o => o.value === value)
        && value !== OTRO_VALUE;

    const [showOtroInput, setShowOtroInput] = useState(isOtro);
    const [otroText, setOtroText] = useState(isOtro ? value : '');

    // El valor del picker: si es "otro" texto libre, mostrar __OTRO__
    const pickerValue = showOtroInput ? OTRO_VALUE : (value || null);

    useEffect(() => {
        // Si las opciones cambian y el valor ya coincide, salir del modo "otro"
        if (value && options.some(o => o.value === value) && showOtroInput) {
            setShowOtroInput(false);
        }
    }, [options]);

    const handlePickerChange = (selected: any) => {
        if (selected === null || selected === '') {
            setShowOtroInput(false);
            setOtroText('');
            onChange('');
        } else if (selected === OTRO_VALUE) {
            setShowOtroInput(true);
            // No cambiar el valor aún, esperar que escriban
            if (otroText) {
                onChange(otroText);
            }
        } else {
            setShowOtroInput(false);
            setOtroText('');
            onChange(selected);
        }
    };

    const handleOtroTextChange = (text: string) => {
        setOtroText(text);
        onChange(text);
    };

    return (
        <View style={[styles.container, style]}>
            <View style={styles.pickerWrapper}>
                <Picker
                    selectedValue={pickerValue}
                    onValueChange={handlePickerChange}
                    style={styles.picker}
                >
                    <Picker.Item label={placeholder} value={null} />
                    {options.map((opt, i) => (
                        <Picker.Item key={`${opt.value}-${i}`} label={opt.label} value={opt.value} />
                    ))}
                    <Picker.Item label={`${otroLabel}...`} value={OTRO_VALUE} />
                </Picker>
            </View>
            {showOtroInput && (
                <TextInput
                    label={`${label} (especifique)`}
                    value={otroText}
                    onChangeText={handleOtroTextChange}
                    mode="outlined"
                    style={styles.otroInput}
                    placeholder={`Escriba ${label.toLowerCase()}...`}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 8,
    },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    picker: {
        height: 50,
    },
    otroInput: {
        marginTop: 6,
    },
});
