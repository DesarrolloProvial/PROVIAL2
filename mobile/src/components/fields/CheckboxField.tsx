/**
 * CheckboxField Component
 * 
 * Campo booleano tipo checkbox.
 * 
 * Fecha: 2026-01-22
 * FASE 1 - Campos Avanzados
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';

interface CheckboxFieldProps {
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
    error?: string;
    helperText?: string;
    required?: boolean;
    disabled?: boolean;
}

export default function CheckboxField({
    label,
    value,
    onChange,
    error,
    helperText,
    required,
    disabled,
}: CheckboxFieldProps) {
    const theme = useTheme();

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.touchable}
                onPress={() => !disabled && onChange(!value)}
                disabled={disabled}
                activeOpacity={0.7}
            >
                <MaterialCommunityIcons
                    name={value ? "checkbox-marked" : "checkbox-blank-outline"}
                    size={24}
                    color={
                        disabled
                            ? theme.colors.text.disabled
                            : (value ? theme.colors.primary : theme.colors.text.secondary)
                    }
                />

                <Text style={[
                    styles.label,
                    theme.typography.body,
                    {
                        color: error
                            ? theme.colors.danger
                            : (disabled ? theme.colors.text.disabled : theme.colors.text.primary)
                    }
                ]}>
                    {label}
                    {required && <Text style={{ color: theme.colors.danger }}> *</Text>}
                </Text>
            </TouchableOpacity>

            {/* Helper/Error Text */}
            {(error || helperText) && (
                <Text style={[
                    styles.helperText,
                    theme.typography.caption,
                    {
                        color: error ? theme.colors.danger : theme.colors.text.secondary,
                        marginLeft: 32 // Alinear con texto
                    }
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
    touchable: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        marginLeft: 8,
        flex: 1,
    },
    helperText: {
        marginTop: 4,
    },
});
