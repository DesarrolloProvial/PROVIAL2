/**
 * SwitchField Component
 * 
 * Campo tipo interruptor (Switch) para valores booleanos.
 * Útil para opciones de activación/desactivación rápida.
 * 
 * Fecha: 2026-01-22
 * FASE 1 - Campos Adicionales
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Switch } from 'react-native-paper';
import { useTheme } from '../../core/theme';

interface SwitchFieldProps {
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
    error?: string;
    helperText?: string;
    required?: boolean;
    disabled?: boolean;
}

export default function SwitchField({
    label,
    value,
    onChange,
    error,
    helperText,
    required,
    disabled,
}: SwitchFieldProps) {
    const theme = useTheme();

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <Text style={[
                    styles.label,
                    theme.typography.bodySmall,
                    {
                        color: error ? theme.colors.danger : theme.colors.text.primary,
                        flex: 1
                    }
                ]}>
                    {label}
                    {required && <Text style={{ color: theme.colors.danger }}> *</Text>}
                </Text>

                <Switch
                    value={value}
                    onValueChange={onChange}
                    disabled={disabled}
                    color={theme.colors.primary}
                />
            </View>

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
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 48,
    },
    label: {
        fontWeight: '500',
        marginRight: 16,
    },
    helperText: {
        marginTop: 4,
    },
});
