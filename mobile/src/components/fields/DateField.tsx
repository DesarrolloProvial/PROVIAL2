/**
 * DateField Component
 *
 * Campo para selección de fecha y hora.
 * Usa el DateTimePicker nativo del sistema en ambas plataformas.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
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
    const [showTimePicker, setShowTimePicker] = useState(false);

    // Parse value to Date object
    const dateValue = value ? new Date(value) : new Date();
    const hasValue = value !== null && value !== undefined && value !== '';

    const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
            setShowTimePicker(false);
        }

        if (event.type === 'set' && selectedDate) {
            if (mode === 'datetime' && Platform.OS === 'android' && !showTimePicker) {
                // En Android con datetime, primero fecha, luego hora
                onChange(selectedDate);
                setShowTimePicker(true);
            } else {
                onChange(selectedDate);
                if (Platform.OS === 'ios') {
                    setShowPicker(false);
                }
            }
        } else if (event.type === 'dismissed') {
            setShowPicker(false);
            setShowTimePicker(false);
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

    const openPicker = () => {
        if (!disabled) {
            setShowPicker(true);
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
                onPress={openPicker}
                disabled={disabled}
                activeOpacity={0.7}
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

            {/* Native DateTimePicker */}
            {showPicker && (
                <DateTimePicker
                    value={dateValue}
                    mode={mode === 'datetime' ? 'date' : mode}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    is24Hour={true}
                    onChange={handleChange}
                    minimumDate={minDate}
                    maximumDate={maxDate}
                />
            )}

            {/* Time picker para datetime en Android */}
            {showTimePicker && Platform.OS === 'android' && (
                <DateTimePicker
                    value={dateValue}
                    mode="time"
                    display="default"
                    is24Hour={true}
                    onChange={handleChange}
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
