import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, Platform,
  Modal, TouchableOpacity, SafeAreaView, Text,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { TextInput } from 'react-native-paper';

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

    const renderPicker = (inModal = false) => (
        <Picker
            selectedValue={pickerValue}
            onValueChange={(v) => {
                handlePickerChange(v);
                if (inModal) setIosVisible(false);
            }}
            style={!inModal ? styles.picker : undefined}
        >
            <Picker.Item label={placeholder} value={null} />
            {allOptions.map((opt, i) => (
                <Picker.Item key={`${opt.value}-${i}`} label={opt.label} value={opt.value} />
            ))}
        </Picker>
    );

    return (
        <View style={[styles.container, style]}>
            {Platform.OS === 'ios' ? (
                <>
                    <TouchableOpacity
                        style={styles.iosTrigger}
                        onPress={() => setIosVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.iosTriggerText, !value && styles.iosPlaceholder]}>
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
                            {renderPicker(true)}
                        </SafeAreaView>
                    </Modal>
                </>
            ) : (
                <View style={styles.pickerWrapper}>
                    {renderPicker()}
                </View>
            )}

            {showOtroInput && (
                <TextInput
                    label={`${label} (especifique)`}
                    value={otroText}
                    onChangeText={handleOtroTextChange}
                    mode="outlined"
                    style={styles.otroInput}
                    placeholder={`Escriba ${label.toLowerCase()}...`}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 8,
    },

    // Android
    pickerWrapper: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    picker: {
        height: 50,
    },

    // iOS
    iosTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 50,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        backgroundColor: '#fff',
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

    otroInput: {
        marginTop: 6,
    },
});
