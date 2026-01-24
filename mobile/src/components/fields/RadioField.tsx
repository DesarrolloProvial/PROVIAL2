/**
 * RadioField Component
 * 
 * Campo de selección única mediante Radio Buttons.
 * Ideal para pocas opciones (2-5). Para más opciones usar SelectField.
 * 
 * Fecha: 2026-01-22
 * FASE 1 - Campos Adicionales
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RadioButton } from 'react-native-paper';
import { useTheme } from '../../core/theme';
import { FieldOption } from '../../core/FormBuilder/types';
import { CatalogResolver } from '../../core/FormBuilder/catalogResolver';

interface RadioFieldProps {
    label: string;
    value: any;
    onChange: (value: any) => void;
    options: FieldOption[] | string;
    error?: string;
    helperText?: string;
    required?: boolean;
    disabled?: boolean;
    row?: boolean; // Layout horizontal
}

export default function RadioField({
    label,
    value,
    onChange,
    options,
    error,
    helperText,
    required,
    disabled,
    row = false,
}: RadioFieldProps) {
    const theme = useTheme();
    const [resolvedOptions, setResolvedOptions] = useState<FieldOption[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadOptions = async () => {
            if (typeof options === 'string') {
                setLoading(true);
                try {
                    const resolved = await CatalogResolver.resolveOptions(options);
                    setResolvedOptions(resolved);
                } catch (err) {
                    console.error('[RadioField] Error loading options:', err);
                    setResolvedOptions([]);
                } finally {
                    setLoading(false);
                }
            } else {
                setResolvedOptions(options);
            }
        };
        loadOptions();
    }, [options]);

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

            {/* Radio Group */}
            <View style={[
                styles.groupContainer,
                row ? styles.rowGroup : styles.columnGroup
            ]}>
                {resolvedOptions.map((opt) => (
                    <TouchableOpacity
                        key={String(opt.value)}
                        style={styles.radioItem}
                        onPress={() => !disabled && !opt.disabled && onChange(opt.value)}
                        activeOpacity={0.7}
                        disabled={disabled || opt.disabled}
                    >
                        <RadioButton.Android
                            value={String(opt.value)}
                            status={value === opt.value ? 'checked' : 'unchecked'}
                            onPress={() => !disabled && !opt.disabled && onChange(opt.value)}
                            disabled={disabled || opt.disabled}
                            color={theme.colors.primary}
                        />
                        <Text style={[
                            styles.radioLabel,
                            theme.typography.body,
                            { color: (disabled || opt.disabled) ? theme.colors.text.disabled : theme.colors.text.primary }
                        ]}>
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Helper/Error */}
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
        marginBottom: 8,
        fontWeight: '500',
    },
    groupContainer: {
        marginTop: 4,
    },
    columnGroup: {
        flexDirection: 'column',
        gap: 8,
    },
    rowGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    radioItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    radioLabel: {
        marginLeft: 8,
    },
    helperText: {
        marginTop: 4,
    },
});
