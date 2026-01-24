/**
 * SelectField Component
 * 
 * Campo de selección (dropdown) reutilizable para el FormBuilder.
 * Soporta selección única y múltiple, con opciones desde catálogos.
 * 
 * Fecha: 2026-01-22
 * FASE 1 - DÍA 2
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../core/theme';
import { FieldOption } from '../../core/FormBuilder/types';
import { CatalogResolver } from '../../core/FormBuilder/catalogResolver';

interface SelectFieldProps {
    label: string;
    value: any;
    onChange: (value: any) => void;
    options: FieldOption[] | string; // Array directo o referencia a catálogo
    error?: string;
    helperText?: string;
    required?: boolean;
    disabled?: boolean;
    multiple?: boolean;
    placeholder?: string;
}

export default function SelectField({
    label,
    value,
    onChange,
    options,
    error,
    helperText,
    required,
    disabled,
    multiple,
    placeholder = 'Seleccionar...',
}: SelectFieldProps) {
    const theme = useTheme();
    const [resolvedOptions, setResolvedOptions] = useState<FieldOption[]>([]);
    const [loading, setLoading] = useState(false);

    // Resolver opciones (si es ref a catálogo)
    useEffect(() => {
        const loadOptions = async () => {
            if (typeof options === 'string') {
                setLoading(true);
                try {
                    const resolved = await CatalogResolver.resolveOptions(options);
                    setResolvedOptions(resolved);
                } catch (error) {
                    console.error('[SelectField] Error cargando opciones:', error);
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

    // Renderizado para selección múltiple (simplificado por ahora)
    if (multiple) {
        return (
            <View style={styles.container}>
                <Text style={[styles.label, theme.typography.bodySmall]}>
                    {label}
                    {required && <Text style={{ color: theme.colors.danger }}> *</Text>}
                </Text>
                <Text style={[theme.typography.caption, { color: theme.colors.text.secondary }]}>
                    Multi-select no implementado aún (usar componente custom)
                </Text>
            </View>
        );
    }

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

            {/* Picker */}
            <View style={[
                styles.pickerContainer,
                {
                    backgroundColor: disabled ? theme.components.input.disabledBackgroundColor : theme.components.input.backgroundColor,
                    borderColor: error ? theme.components.input.errorBorderColor : theme.components.input.borderColor,
                    borderWidth: theme.components.input.borderWidth,
                    borderRadius: theme.components.input.borderRadius,
                }
            ]}>
                <Picker
                    selectedValue={value}
                    onValueChange={onChange}
                    enabled={!disabled && !loading}
                    style={styles.picker}
                >
                    <Picker.Item label={placeholder} value={null} color={theme.components.input.placeholderColor} />
                    {resolvedOptions.map(option => (
                        <Picker.Item
                            key={String(option.value)}
                            label={option.label}
                            value={option.value}
                            enabled={!option.disabled}
                        />
                    ))}
                </Picker>
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
    label: {
        marginBottom: 6,
        fontWeight: '500',
    },
    pickerContainer: {
        overflow: 'hidden',
    },
    picker: {
        height: 48,
    },
    helperText: {
        marginTop: 4,
    },
});
