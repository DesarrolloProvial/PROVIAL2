/**
 * NumberField Component
 * 
 * Campo numérico reutilizable para el FormBuilder.
 * Soporta min/max, step, y validación.
 * 
 * Fecha: 2026-01-22
 * FASE 1 - DÍA 2
 */

import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../core/theme';

interface NumberFieldProps {
    label: string;
    value: number | null;
    onChange: (value: number | null) => void;
    error?: string;
    helperText?: string;
    required?: boolean;
    disabled?: boolean;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
}

export default function NumberField({
    label,
    value,
    onChange,
    error,
    helperText,
    required,
    disabled,
    min,
    max,
    placeholder,
}: NumberFieldProps) {
    const theme = useTheme();

    const handleChange = (text: string) => {
        if (text === '' || text === '-') {
            onChange(null);
            return;
        }

        const numValue = parseFloat(text);

        if (isNaN(numValue)) {
            return; // No actualizar si no es número válido
        }

        // Aplicar min/max si están definidos
        let finalValue = numValue;
        if (min !== undefined && finalValue < min) {
            finalValue = min;
        }
        if (max !== undefined && finalValue > max) {
            finalValue = max;
        }

        onChange(finalValue);
    };

    return (
        <View style={styles.container}>
            {/* Label */}
            <Text style={[
                styles.label,
                theme.typography.bodySmall,
                { color: error ? theme.colors.danger : theme.colors.text.primary }
            ]}>
                {label}
                {required && <Text style={{ color: theme.colors.danger }}> *</Text>}
            </Text>

            {/* Input */}
            <TextInput
                style={[
                    styles.input,
                    {
                        backgroundColor: disabled ? theme.components.input.disabledBackgroundColor : theme.components.input.backgroundColor,
                        borderColor: error ? theme.components.input.errorBorderColor : theme.components.input.borderColor,
                        borderWidth: theme.components.input.borderWidth,
                        borderRadius: theme.components.input.borderRadius,
                        padding: theme.components.input.padding,
                        fontSize: theme.components.input.fontSize,
                        color: disabled ? theme.components.input.disabledTextColor : theme.components.input.color,
                    }
                ]}
                value={value !== null ? String(value) : ''}
                onChangeText={handleChange}
                keyboardType="decimal-pad"
                editable={!disabled}
                placeholder={placeholder}
                placeholderTextColor={theme.components.input.placeholderColor}
            />

            {/* Helper/Error Text */}
            {(error || helperText) && (
                <Text style={[
                    styles.helperText,
                    theme.typography.caption,
                    { color: error ? theme.colors.danger : theme.colors.text.secondary }
                ]}>
                    {error || helperText}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        marginBottom: 6,
        fontWeight: '500',
    },
    input: {
        minHeight: 48,
    },
    helperText: {
        marginTop: 4,
    },
});
