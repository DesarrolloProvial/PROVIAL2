import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Platform,
  Modal, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../core/theme';

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
  const theme = useTheme();
  const c = theme.colors;

  const [iosVisible, setIosVisible] = useState(false);

  const selectedLabel =
    options.find(o => String(o.value) === String(selectedValue))?.label ?? placeholder;
  const isPlaceholder = selectedValue === null || selectedValue === undefined;

  if (Platform.OS === 'ios') {
    return (
      <View style={style}>
        {label && (
          <Text style={[styles.label, { color: c.text.primary }]}>
            {label}
            {required && <Text style={{ color: c.danger }}> *</Text>}
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.trigger,
            {
              borderColor: c.border,
              backgroundColor: disabled ? c.gray[100] : c.surface,
            },
          ]}
          onPress={() => { if (!disabled) setIosVisible(true); }}
          activeOpacity={disabled ? 1 : 0.7}
        >
          <Text style={[
            styles.triggerText,
            { color: isPlaceholder ? c.text.disabled : c.text.primary },
          ]}>
            {selectedLabel}
          </Text>
          <Text style={[styles.chevron, { color: c.text.secondary }]}>▾</Text>
        </TouchableOpacity>

        <Modal
          visible={iosVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIosVisible(false)}
        >
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setIosVisible(false)}
          />
          <SafeAreaView style={[styles.sheet, { backgroundColor: c.surface }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: c.border }]}>
              <TouchableOpacity onPress={() => setIosVisible(false)}>
                <Text style={{ fontSize: 16, color: c.primary, fontWeight: '600' }}>Listo</Text>
              </TouchableOpacity>
            </View>
            <Picker
              selectedValue={selectedValue}
              onValueChange={onValueChange}
              itemStyle={{ color: c.text.primary, fontSize: 18 }}
            >
              <Picker.Item label={placeholder} value={null} color={c.text.disabled} />
              {options.map((option, index) => (
                <Picker.Item
                  key={`${option.value}-${index}`}
                  label={option.label}
                  value={option.value}
                  color={c.text.primary}
                />
              ))}
            </Picker>
          </SafeAreaView>
        </Modal>
      </View>
    );
  }

  // Android: picker inline nativo
  return (
    <View style={style}>
      {label && (
        <Text style={[styles.label, { color: c.text.primary }]}>
          {label}
          {required && <Text style={{ color: c.danger }}> *</Text>}
        </Text>
      )}
      <View style={[
        styles.pickerContainer,
        { borderColor: c.border, backgroundColor: c.surface },
      ]}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={onValueChange}
          style={[styles.picker, { color: c.text.primary }]}
          enabled={!disabled}
          dropdownIconColor={c.text.secondary}
        >
          <Picker.Item label={placeholder} value={null} color={c.text.disabled} />
          {options.map((option, index) => (
            <Picker.Item
              key={`${option.value}-${index}`}
              label={option.label}
              value={option.value}
              color={c.text.primary}
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
    marginBottom: 6,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
  },
  triggerText: {
    fontSize: 15,
    flex: 1,
  },
  chevron: {
    fontSize: 16,
    marginLeft: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {},
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
  },
  picker: {
    height: 50,
  },
});
