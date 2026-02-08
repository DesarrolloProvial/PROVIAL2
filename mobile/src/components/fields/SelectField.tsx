/**
 * SelectField Component
 *
 * Campo de selección (dropdown) reutilizable para el FormBuilder.
 * Soporta selección única y múltiple, con opciones desde catálogos.
 *
 * Fecha: 2026-01-22
 * FASE 1 - DÍA 2
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
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
    formData?: Record<string, any>;
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
    formData,
}: SelectFieldProps) {
    const theme = useTheme();
    const [resolvedOptions, setResolvedOptions] = useState<FieldOption[]>([]);
    const [loading, setLoading] = useState(typeof options === 'string');

    // Guardar el valor que viene del form para protegerlo del Picker
    const preservedValueRef = useRef<any>(value);

    // Actualizar ref cuando el valor cambia externamente (form reset, edición)
    useEffect(() => {
        if (value !== null && value !== undefined && value !== '') {
            preservedValueRef.current = value;
        }
    }, [value]);

    // Extraer departamento_id para dependencia de municipios
    const departamentoId = formData?.departamento_id;

    // Resolver opciones (si es ref a catálogo)
    useEffect(() => {
        const loadOptions = async () => {
            if (typeof options === 'string') {
                setLoading(true);
                try {
                    if (options === '@catalogos.municipios' && departamentoId) {
                        const resolved = await CatalogResolver.resolveMunicipiosByDepartamento(departamentoId);
                        setResolvedOptions(resolved);
                    } else {
                        const resolved = await CatalogResolver.resolveOptions(options);
                        setResolvedOptions(resolved);
                    }
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
    }, [options, departamentoId]);

    // Diagnóstico: log cuando cambia el valor o las opciones
    useEffect(() => {
        if (resolvedOptions.length > 0 || value != null) {
            const optionValues = resolvedOptions.map(o => `${o.value}(${typeof o.value})`).join(',');
            console.log(`[SelectField:${label}] value=${value} (${typeof value}) | preserved=${preservedValueRef.current} | options=[${optionValues}] | loading=${loading}`);
        }
    }, [value, resolvedOptions.length, loading]);

    // Después de cargar opciones: si el valor fue borrado, restaurarlo
    useEffect(() => {
        if (!loading && resolvedOptions.length > 0 && preservedValueRef.current != null && preservedValueRef.current !== '') {
            const currentIsEmpty = value === null || value === undefined || value === '';
            if (currentIsEmpty) {
                const match = resolvedOptions.some(o => String(o.value) === String(preservedValueRef.current));
                if (match) {
                    console.log(`[SelectField:${label}] Restaurando valor preservado:`, preservedValueRef.current);
                    onChange(preservedValueRef.current);
                }
            }
        }
    }, [loading, resolvedOptions.length, value]);

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

            {/* Picker o Loading */}
            <View style={[
                styles.pickerContainer,
                {
                    backgroundColor: disabled ? theme.components.input.disabledBackgroundColor : theme.components.input.backgroundColor,
                    borderColor: error ? theme.components.input.errorBorderColor : theme.components.input.borderColor,
                    borderWidth: theme.components.input.borderWidth,
                    borderRadius: theme.components.input.borderRadius,
                }
            ]}>
                {loading ? (
                    // NO montar el Picker mientras carga opciones - evita que borre el valor
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                        <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
                            Cargando opciones...
                        </Text>
                    </View>
                ) : (
                    <Picker
                        selectedValue={value}
                        onValueChange={(v) => {
                            // Si el Picker intenta poner null pero tenemos un valor preservado
                            // que coincide con una opción, restaurar en vez de borrar
                            if (v === null && preservedValueRef.current != null && preservedValueRef.current !== '') {
                                const match = resolvedOptions.some(o => String(o.value) === String(preservedValueRef.current));
                                if (match) {
                                    onChange(preservedValueRef.current);
                                    return;
                                }
                            }
                            onChange(v);
                            // Actualizar el ref si el usuario selecciona algo válido
                            if (v !== null && v !== undefined && v !== '') {
                                preservedValueRef.current = v;
                            }
                        }}
                        enabled={!disabled}
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
                )}
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
    loadingContainer: {
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        gap: 8,
    },
    loadingText: {
        fontSize: 14,
    },
    helperText: {
        marginTop: 4,
    },
});
