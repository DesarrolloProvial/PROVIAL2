/**
 * CrossPlatformPicker - Selector usando Picker nativo para ambas plataformas
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';

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
  return (
    <View style={style}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={onValueChange}
          style={styles.picker}
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#333',
  },
});
