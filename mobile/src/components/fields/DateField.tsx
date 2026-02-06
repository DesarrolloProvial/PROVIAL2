/**
 * DateField Component
 *
 * Campo para selección de fecha y hora.
 * iOS: Modal fullscreen con picker wheel + botones Cancelar/Listo
 * Android: Picker nativo del sistema
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  SafeAreaView,
} from 'react-native';
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
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const dateValue = value ? new Date(value) : new Date();
  const hasValue = value !== null && value !== undefined && value !== '';

  // iOS: Confirmar selección
  const handleIOSConfirm = () => {
    onChange(tempDate);
    setShowPicker(false);
  };

  // iOS: Cancelar
  const handleIOSCancel = () => {
    setShowPicker(false);
  };

  // iOS: Cambio en el picker (solo actualiza temp)
  const handleIOSChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  // Android: Cambio directo
  const handleAndroidChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && selectedDate) {
      onChange(selectedDate);
    }
  };

  const openPicker = () => {
    if (!disabled) {
      setTempDate(dateValue);
      setShowPicker(true);
    }
  };

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
    return mode === 'time' ? 'clock-outline' : 'calendar';
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

      {/* Botón para abrir picker */}
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

      {/* iOS: Modal fullscreen con picker */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          animationType="slide"
          transparent={false}
          onRequestClose={handleIOSCancel}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalFullScreen}>
              {/* Header con botones */}
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={handleIOSCancel}
                  style={styles.headerButton}
                >
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>

                <Text style={styles.headerTitle}>{label}</Text>

                <TouchableOpacity
                  onPress={handleIOSConfirm}
                  style={styles.headerButton}
                >
                  <Text style={styles.confirmText}>Listo</Text>
                </TouchableOpacity>
              </View>

              {/* Picker centrado */}
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={tempDate}
                  mode={mode === 'datetime' ? 'date' : mode}
                  display="spinner"
                  onChange={handleIOSChange}
                  minimumDate={minDate}
                  maximumDate={maxDate}
                  style={styles.iosPicker}
                  textColor="#000"
                />

                {mode === 'datetime' && (
                  <DateTimePicker
                    value={tempDate}
                    mode="time"
                    display="spinner"
                    onChange={(event, date) => {
                      if (date) {
                        const newDate = new Date(tempDate);
                        newDate.setHours(date.getHours());
                        newDate.setMinutes(date.getMinutes());
                        setTempDate(newDate);
                      }
                    }}
                    style={styles.iosPicker}
                    textColor="#000"
                  />
                )}
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {/* Android: Picker nativo */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={dateValue}
          mode={mode === 'datetime' ? 'date' : mode}
          display="default"
          onChange={handleAndroidChange}
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
  // Modal iOS - Fullscreen
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  modalFullScreen: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#c6c6c8',
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 70,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    flex: 1,
  },
  cancelText: {
    fontSize: 17,
    color: '#007AFF',
  },
  confirmText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'right',
  },
  pickerContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginTop: 20,
  },
  iosPicker: {
    height: 200,
    width: '100%',
  },
});
