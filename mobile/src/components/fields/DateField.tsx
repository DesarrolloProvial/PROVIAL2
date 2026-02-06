/**
 * DateField Component
 *
 * Campo para selección de fecha y hora.
 * Soporta modos: date, time, datetime.
 * Compatible con iOS y Android.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../core/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

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
    const [tempDate, setTempDate] = useState<Date>(new Date());

    // Parse value to Date object
    const dateValue = value ? new Date(value) : new Date();
    const hasValue = value !== null && value !== undefined && value !== '';

    const openPicker = () => {
        if (disabled) return;
        setTempDate(dateValue);
        setShowPicker(true);
    };

    const handleChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            // En Android, cerrar el picker inmediatamente
            setShowPicker(false);
            if (event.type === 'set' && selectedDate) {
                onChange(selectedDate);
            }
        } else {
            // En iOS, solo actualizar el valor temporal
            if (selectedDate) {
                setTempDate(selectedDate);
            }
        }
    };

    const handleIOSConfirm = () => {
        onChange(tempDate);
        setShowPicker(false);
    };

    const handleIOSCancel = () => {
        setShowPicker(false);
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

    // Renderizar picker según plataforma
    const renderPicker = () => {
        if (!showPicker) return null;

        if (Platform.OS === 'ios') {
            // iOS: Mostrar en modal con botones
            return (
                <Modal
                    visible={showPicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={handleIOSCancel}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            {/* Header con botones */}
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={handleIOSCancel} style={styles.modalButton}>
                                    <Text style={styles.modalButtonCancel}>Cancelar</Text>
                                </TouchableOpacity>

                                <Text style={styles.modalTitle}>{label}</Text>

                                <TouchableOpacity onPress={handleIOSConfirm} style={styles.modalButton}>
                                    <Text style={styles.modalButtonConfirm}>Listo</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Picker */}
                            <DateTimePicker
                                value={tempDate}
                                mode={mode === 'datetime' ? 'date' : mode}
                                is24Hour={true}
                                display="spinner"
                                onChange={handleChange}
                                minimumDate={minDate}
                                maximumDate={maxDate}
                                style={{ height: 200 }}
                            />

                            {/* Si es datetime, mostrar también el time picker */}
                            {mode === 'datetime' && (
                                <DateTimePicker
                                    value={tempDate}
                                    mode="time"
                                    is24Hour={true}
                                    display="spinner"
                                    onChange={(event, date) => {
                                        if (date) {
                                            const newDate = new Date(tempDate);
                                            newDate.setHours(date.getHours());
                                            newDate.setMinutes(date.getMinutes());
                                            setTempDate(newDate);
                                        }
                                    }}
                                    style={{ height: 200 }}
                                />
                            )}
                        </View>
                    </View>
                </Modal>
            );
        }

        // Android: Picker nativo
        return (
            <DateTimePicker
                value={dateValue}
                mode={mode === 'datetime' ? 'date' : mode}
                is24Hour={true}
                display="default"
                onChange={handleChange}
                minimumDate={minDate}
                maximumDate={maxDate}
            />
        );
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

            {/* Picker (platform-specific) */}
            {renderPicker()}

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
    // iOS Modal styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    modalButtonCancel: {
        fontSize: 16,
        color: '#666',
    },
    modalButtonConfirm: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.primary,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
});
