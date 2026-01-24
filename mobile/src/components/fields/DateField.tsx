/**
 * DateField Component
 * 
 * Campo para selección de fecha y hora.
 * Soporta modos: date, time, datetime.
 * 
 * Fecha: 2026-01-22
 * FASE 1 - Campos Avanzados
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../core/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DateFieldProps {
    label: string;
    value: Date | string | null;
    onChange: (value: Date) => void;
    mode?: 'date' | 'time' | 'datetime';
    error?: string;
    helperText?: string;
    required?: boolean;
    disabled?: boolean;
    minDate?: Date;
    maxDate?: Date;
}

export default function DateField({
    label,
    value,
    onChange,
    mode = 'date',
    error,
    helperText,
    required,
    disabled,
    minDate,
    maxDate,
}: DateFieldProps) {
    const theme = useTheme();
    const [showPicker, setShowPicker] = useState(false);

    // Parse value to Date object
    const dateValue = value ? new Date(value) : new Date();
    const hasValue = value !== null && value !== undefined && value !== '';

    const handleChange = (event: any, selectedDate?: Date) => {
        // En Android, hay que cerrar el picker manual o automáticamente
        if (Platform.OS === 'android') {
            setShowPicker(false);
        }

        if (selectedDate) {
            onChange(selectedDate);
        }
    };

    // Formato de visualización
    const formatValue = () => {
        if (!hasValue) return 'Seleccionar...';

        const date = new Date(value);

        switch (mode) {
            case 'date':
                return date.toLocaleDateString('es-GT');
            case 'time':
                return date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
            case 'datetime':
                return `${date.toLocaleDateString('es-GT')} ${date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}`;
            default:
                return date.toString();
        }
    };

    const getIcon = () => {
        switch (mode) {
            case 'time': return 'clock-outline';
            default: return 'calendar';
        }
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

            {/* Touchable Display */}
            <TouchableOpacity
                onPress={() => !disabled && setShowPicker(true)}
                disabled={disabled}
                style={[
                    styles.inputContainer,
                    {
                        backgroundColor: disabled ? theme.components.input.disabledBackgroundColor : theme.components.input.backgroundColor,
                        borderColor: error ? theme.components.input.errorBorderColor : theme.components.input.borderColor,
                        borderWidth: theme.components.input.borderWidth,
                        borderRadius: theme.components.input.borderRadius,
                    }
                ]}
            >
                <Text style={{
                    fontSize: theme.components.input.fontSize,
                    color: !hasValue ? theme.components.input.placeholderColor : (disabled ? theme.components.input.disabledTextColor : theme.components.input.color),
                    flex: 1,
                }}>
                    {formatValue()}
                </Text>

                <MaterialCommunityIcons
                    name={getIcon()}
                    size={24}
                    color={disabled ? theme.colors.text.disabled : theme.colors.primary}
                />
            </TouchableOpacity>

            {/* Native Picker */}
            {showPicker && (
                <DateTimePicker
                    value={dateValue}
                    mode={mode}
                    is24Hour={true}
                    display="default"
                    onChange={handleChange}
                    minimumDate={minDate}
                    maximumDate={maxDate}
                />
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
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        minHeight: 48,
    },
    helperText: {
        marginTop: 4,
    },
});
