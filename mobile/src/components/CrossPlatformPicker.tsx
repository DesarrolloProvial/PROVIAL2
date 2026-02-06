/**
 * CrossPlatformPicker - Selector compatible con iOS y Android
 *
 * - Android: Usa el Picker nativo (dropdown)
 * - iOS: Muestra un botón que abre ActionSheet con picker wheel
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

  // En iOS, usar botón + modal fullscreen
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
        activeOpacity={0.7}
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
        <Ionicons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={false}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCancel}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Header con botones */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalButtonCancel}>Cancelar</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>{label || 'Seleccionar'}</Text>

            <TouchableOpacity onPress={handleConfirm} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalButtonConfirm}>Listo</Text>
            </TouchableOpacity>
          </View>

          {/* Picker wheel - centrado */}
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={tempValue}
              onValueChange={setTempValue}
              style={styles.iosPicker}
              itemStyle={styles.iosPickerItem}
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
        </SafeAreaView>
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
    color: '#333',
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
    color: '#333',
    flex: 1,
  },
  iosPlaceholder: {
    color: '#999',
  },
  // Modal styles - iOS pageSheet
  modalContainer: {
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
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalButtonCancel: {
    fontSize: 17,
    color: '#007AFF',
  },
  modalButtonConfirm: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  pickerContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  iosPicker: {
    width: '100%',
    height: 216,
  },
  iosPickerItem: {
    fontSize: 20,
    color: '#000',
  },
});
