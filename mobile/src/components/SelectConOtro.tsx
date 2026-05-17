import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, Platform,
  Modal, TouchableOpacity, Text, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../core/theme';

const OTRO_VALUE = '__OTRO__';

interface Option {
    label: string;
    value: string;
}

interface SelectConOtroProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    otroLabel?: string;
    style?: any;
}

export default function SelectConOtro({
    label,
    value,
    onChange,
    options,
    placeholder = 'Seleccionar...',
    otroLabel = 'Otro',
    style,
}: SelectConOtroProps) {
    const theme = useTheme();
    const c = theme.colors;

    const isOtro = value !== '' && value !== null && value !== undefined
        && !options.some(o => o.value === value)
        && value !== OTRO_VALUE;

    const [showOtroInput, setShowOtroInput] = useState(isOtro);
    const [otroText, setOtroText] = useState(isOtro ? value : '');
    const [iosVisible, setIosVisible] = useState(false);

    const pickerValue = showOtroInput ? OTRO_VALUE : (value || null);

    useEffect(() => {
        if (value && options.some(o => o.value === value) && showOtroInput) {
            setShowOtroInput(false);
        }
    }, [options]);

    const handlePickerChange = (selected: any) => {
        if (selected === null || selected === '') {
            setShowOtroInput(false);
            setOtroText('');
            onChange('');
        } else if (selected === OTRO_VALUE) {
            setShowOtroInput(true);
            if (otroText) onChange(otroText);
        } else {
            setShowOtroInput(false);
            setOtroText('');
            onChange(selected);
        }
    };

    const handleOtroTextChange = (text: string) => {
        setOtroText(text);
        onChange(text);
    };

    const allOptions: Option[] = [
        ...options,
        { label: `${otroLabel}...`, value: OTRO_VALUE },
    ];

    const selectedLabel = showOtroInput
        ? `${otroLabel}...`
        : (options.find(o => o.value === value)?.label ?? placeholder);

    return (
        <View style={[styles.container, style]}>
            <Text style={[styles.label, { color: c.text.secondary }]}>{label}</Text>

            {Platform.OS === 'ios' ? (
                <>
                    <TouchableOpacity
                        style={[styles.trigger, { borderColor: c.border, backgroundColor: c.surface }]}
                        onPress={() => setIosVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.triggerText, { color: value ? c.text.primary : c.text.disabled }]}>
                            {selectedLabel}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color={c.text.secondary} />
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
                                    <Text style={[styles.doneText, { color: c.primary }]}>Listo</Text>
                                </TouchableOpacity>
                            </View>
                            <Picker
                                selectedValue={pickerValue}
                                onValueChange={(v) => {
                                    handlePickerChange(v);
                                    setIosVisible(false);
                                }}
                                itemStyle={{ color: c.text.primary, fontSize: 18 }}
                            >
                                <Picker.Item label={placeholder} value={null} color={c.text.disabled} />
                                {allOptions.map((opt, i) => (
                                    <Picker.Item
                                        key={`${opt.value}-${i}`}
                                        label={opt.label}
                                        value={opt.value}
                                        color={c.text.primary}
                                    />
                                ))}
                            </Picker>
                        </SafeAreaView>
                    </Modal>
                </>
            ) : (
                <View style={[styles.androidWrapper, { borderColor: c.border, backgroundColor: c.surface }]}>
                    <Picker
                        selectedValue={pickerValue}
                        onValueChange={handlePickerChange}
                        style={[styles.androidPicker, { color: c.text.primary }]}
                        dropdownIconColor={c.text.secondary}
                    >
                        <Picker.Item label={placeholder} value={null} color={c.text.disabled} />
                        {allOptions.map((opt, i) => (
                            <Picker.Item
                                key={`${opt.value}-${i}`}
                                label={opt.label}
                                value={opt.value}
                                color={c.text.primary}
                            />
                        ))}
                    </Picker>
                </View>
            )}

            {showOtroInput && (
                <View style={styles.otroGroup}>
                    <Text style={[styles.label, { color: c.text.secondary }]}>{label} (especifique)</Text>
                    <TextInput
                        value={otroText}
                        onChangeText={handleOtroTextChange}
                        style={[styles.otroInput, { borderColor: c.border, backgroundColor: c.surface, color: c.text.primary }]}
                        placeholder={`Escriba ${label.toLowerCase()}...`}
                        placeholderTextColor={c.text.disabled}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    label: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4,
    },
    // iOS trigger
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 48,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderRadius: 8,
    },
    triggerText: {
        fontSize: 15,
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    sheet: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    doneText: {
        fontSize: 16,
        fontWeight: '600',
    },
    // Android
    androidWrapper: {
        borderWidth: 1,
        borderRadius: 8,
        justifyContent: 'center',
    },
    androidPicker: {
        height: 50,
    },
    // Otro input
    otroGroup: {
        marginTop: 6,
    },
    otroInput: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
    },
});
