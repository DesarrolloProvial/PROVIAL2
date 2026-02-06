/**
 * CrossPlatformPicker - Selector compatible con iOS y Android
 *
 * - Android: Usa el Picker nativo (dropdown)
 * - iOS: Muestra un botón que abre un modal con el picker wheel
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export interface PickerOption {
  label: string;
  value: string | number | null;
}

interface CrossPlatformPickerProps {
  selectedValue: string | number | null | undefined;
  onValueChange: (value: any) => void;
  options: PickerOption[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  style?: any;
}

export default function CrossPlatformPicker({
  selectedValue,
  onValueChange,
  options,
  placeholder = 'Seleccionar...',
  label,
  required = false,
  disabled = false,
  style,
}: CrossPlatformPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempValue, setTempValue] = useState(selectedValue);

  // Encontrar el label del valor seleccionado
  const selectedOption = options.find(opt => opt.value === selectedValue);
  const displayText = selectedOption?.label || placeholder;

  const handleConfirm = () => {
    onValueChange(tempValue);
    setModalVisible(false);
  };

  const handleCancel = () => {
    setTempValue(selectedValue);
    setModalVisible(false);
  };

  const openPicker = () => {
    setTempValue(selectedValue);
    setModalVisible(true);
  };

  // En Android, usar el Picker nativo directamente
  if (Platform.OS === 'android') {
    return (
      <View style={style}>
        {label && (
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        )}
        <View style={styles.androidPickerContainer}>
          <Picker
            selectedValue={selectedValue}
            onValueChange={onValueChange}
            style={styles.androidPicker}
            enabled={!disabled}
          >
            <Picker.Item label={placeholder} value={null} />
            {options.map((option, index) => (
              <Picker.Item
                key={`${option.value}-${index}`}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </View>
      </View>
    );
  }

  // En iOS, usar botón + modal
  return (
    <View style={style}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.iosButton,
          disabled && styles.iosButtonDisabled,
        ]}
        onPress={openPicker}
        disabled={disabled}
      >
        <Text
          style={[
            styles.iosButtonText,
            !selectedOption && styles.iosPlaceholder,
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.text.secondary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header con botones */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCancel} style={styles.modalButton}>
                <Text style={styles.modalButtonCancel}>Cancelar</Text>
              </TouchableOpacity>

              <Text style={styles.modalTitle}>{label || 'Seleccionar'}</Text>

              <TouchableOpacity onPress={handleConfirm} style={styles.modalButton}>
                <Text style={styles.modalButtonConfirm}>Listo</Text>
              </TouchableOpacity>
            </View>

            {/* Picker wheel */}
            <Picker
              selectedValue={tempValue}
              onValueChange={setTempValue}
              style={styles.iosPicker}
            >
              <Picker.Item label={placeholder} value={null} />
              {options.map((option, index) => (
                <Picker.Item
                  key={`${option.value}-${index}`}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </Picker>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  required: {
    color: '#d32f2f',
  },
  // Android styles
  androidPickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  androidPicker: {
    height: 50,
  },
  // iOS styles
  iosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 14,
    minHeight: 50,
  },
  iosButtonDisabled: {
    backgroundColor: '#f5f5f5',
  },
  iosButtonText: {
    fontSize: 16,
    color: COLORS.text.primary,
    flex: 1,
  },
  iosPlaceholder: {
    color: COLORS.text.secondary,
  },
  // Modal styles
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
    color: COLORS.text.secondary,
  },
  modalButtonConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  iosPicker: {
    height: 216,
  },
});
