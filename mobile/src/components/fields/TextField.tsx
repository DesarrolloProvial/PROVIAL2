/**
 * TextField Component
 * 
 * Campo de texto reutilizable para el FormBuilder.
 * Soporta validación, estados de error, y estilos del tema.
 * 
 * Fecha: 2026-01-22
 * FASE 1 - DÍA 2
 */

import React from 'react';
import { View, Text, TextInput as RNTextInput, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '../../core/theme';

interface TextFieldProps extends Omit<TextInputProps, 'onChange'> {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    helperText?: string;
    required?: boolean;
    disabled?: boolean;
    multiline?: boolean;
}

export default function TextField({
    label,
    value,
    onChange,
    error,
    helperText,
    required,
    disabled,
    multiline,
    ...textInputProps
}: TextFieldProps) {
    const theme = useTheme();

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
            <RNTextInput
                style={[
                    multiline ? styles.textArea : styles.input,
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
                value={value}
                onChangeText={onChange}
                editable={!disabled}
                placeholderTextColor={theme.components.input.placeholderColor}
                multiline={multiline}
                numberOfLines={multiline ? 4 : 1}
                textAlignVertical={multiline ? 'top' : 'center'}
                {...textInputProps}
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
    textArea: {
        minHeight: 100,
        paddingTop: 12,
    },
    helperText: {
        marginTop: 4,
    },
});
