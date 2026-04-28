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
import {
  View, Text, StyleSheet, ActivityIndicator,
  Platform, Modal, TouchableOpacity, SafeAreaView,
} from 'react-native';
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
    const [iosVisible, setIosVisible] = useState(false);

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
            {Platform.OS === 'ios' ? (
                // iOS: trigger button + Modal con picker completo
                <>
                    <TouchableOpacity
                        style={[
                            styles.iosTrigger,
                            {
                                backgroundColor: disabled ? theme.components.input.disabledBackgroundColor : theme.components.input.backgroundColor,
                                borderColor: error ? theme.components.input.errorBorderColor : theme.components.input.borderColor,
                                borderWidth: theme.components.input.borderWidth,
                                borderRadius: theme.components.input.borderRadius,
                            },
                        ]}
                        onPress={() => { if (!disabled && !loading) setIosVisible(true); }}
                        activeOpacity={disabled ? 1 : 0.7}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                            <Text style={[
                                styles.iosTriggerText,
                                (value === null || value === undefined || value === '') && styles.iosPlaceholder,
                                { color: disabled ? theme.colors.text.secondary : theme.colors.text.primary },
                            ]}>
                                {resolvedOptions.find(o => String(o.value) === String(value))?.label ?? placeholder}
                            </Text>
                        )}
                        <Text style={styles.iosChevron}>▾</Text>
                    </TouchableOpacity>

                    <Modal
                        visible={iosVisible}
                        transparent
                        animationType="slide"
                        onRequestClose={() => setIosVisible(false)}
                    >
                        <TouchableOpacity
                            style={styles.iosOverlay}
                            activeOpacity={1}
                            onPress={() => setIosVisible(false)}
                        />
                        <SafeAreaView style={styles.iosSheet}>
                            <View style={styles.iosSheetHeader}>
                                <TouchableOpacity onPress={() => setIosVisible(false)}>
                                    <Text style={styles.iosDone}>Listo</Text>
                                </TouchableOpacity>
                            </View>
                            <Picker
                                selectedValue={value}
                                onValueChange={(v) => {
                                    if (v === null && preservedValueRef.current != null && preservedValueRef.current !== '') {
                                        const match = resolvedOptions.some(o => String(o.value) === String(preservedValueRef.current));
                                        if (match) { onChange(preservedValueRef.current); return; }
                                    }
                                    onChange(v);
                                    if (v !== null && v !== undefined && v !== '') {
                                        preservedValueRef.current = v;
                                    }
                                }}
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
                        </SafeAreaView>
                    </Modal>
                </>
            ) : (
                // Android: picker inline nativo
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
                                if (v === null && preservedValueRef.current != null && preservedValueRef.current !== '') {
                                    const match = resolvedOptions.some(o => String(o.value) === String(preservedValueRef.current));
                                    if (match) { onChange(preservedValueRef.current); return; }
                                }
                                onChange(v);
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
            )}

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

    // ── Android ──────────────────────────────────────────────────────────────
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

    // ── iOS ──────────────────────────────────────────────────────────────────
    iosTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 48,
        paddingHorizontal: 12,
    },
    iosTriggerText: {
        fontSize: 15,
        flex: 1,
    },
    iosPlaceholder: {
        color: '#999',
    },
    iosChevron: {
        fontSize: 16,
        color: '#666',
        marginLeft: 8,
    },
    iosOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    iosSheet: {
        backgroundColor: '#fff',
    },
    iosSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    iosDone: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '600',
    },

    helperText: {
        marginTop: 4,
    },
});
