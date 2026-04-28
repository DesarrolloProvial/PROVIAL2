/**
 * CrossPlatformPicker
 *
 * Android: Picker nativo inline (muestra diálogo al tocar — comportamiento nativo Android).
 * iOS: TouchableOpacity trigger → Modal con Picker completo + botón "Listo".
 *   El Picker embebido en iOS queda clipado a 48px con overflow:hidden, por lo que
 *   se prefiere el patrón modal para que el usuario vea el scroll wheel completo.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Platform,
  Modal, TouchableOpacity, SafeAreaView,
} from 'react-native';
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
  const [iosVisible, setIosVisible] = useState(false);

  const selectedLabel =
    options.find(o => String(o.value) === String(selectedValue))?.label ?? placeholder;

  const isPlaceholder = selectedValue === null || selectedValue === undefined;

  if (Platform.OS === 'ios') {
    return (
      <View style={style}>
        {label && (
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.iosTrigger, disabled && styles.iosTriggerDisabled]}
          onPress={() => { if (!disabled) setIosVisible(true); }}
          activeOpacity={disabled ? 1 : 0.7}
        >
          <Text style={[styles.iosTriggerText, isPlaceholder && styles.iosPlaceholder]}>
            {selectedLabel}
          </Text>
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
              selectedValue={selectedValue}
              onValueChange={(val) => onValueChange(val)}
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
          </SafeAreaView>
        </Modal>
      </View>
    );
  }

  // Android: picker inline nativo (comportamiento original)
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

  // ── iOS ──────────────────────────────────────────────────────────────────
  iosTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  iosTriggerDisabled: {
    backgroundColor: '#f5f5f5',
  },
  iosTriggerText: {
    fontSize: 15,
    color: '#333',
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

  // ── Android ──────────────────────────────────────────────────────────────
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
