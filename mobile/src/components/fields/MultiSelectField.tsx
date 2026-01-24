/**
 * MultiSelectField Component
 * 
 * Campo de selección múltiple con Modal.
 * Muestra las opciones seleccionadas y permite buscar/filtrar.
 * 
 * Fecha: 2026-01-22
 * FASE 1 - Campos Adicionales
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, SafeAreaView, TextInput } from 'react-native';
import { Button, Checkbox, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../core/theme';
import { FieldOption } from '../../core/FormBuilder/types';
import { CatalogResolver } from '../../core/FormBuilder/catalogResolver';

interface MultiSelectFieldProps {
    label: string;
    value: any[]; // Array of selected values
    onChange: (value: any[]) => void;
    options: FieldOption[] | string;
    error?: string;
    helperText?: string;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
}

export default function MultiSelectField({
    label,
    value = [],
    onChange,
    options,
    error,
    helperText,
    required,
    disabled,
    placeholder = 'Seleccionar opciones...',
}: MultiSelectFieldProps) {
    const theme = useTheme();
    const [modalVisible, setModalVisible] = useState(false);
    const [resolvedOptions, setResolvedOptions] = useState<FieldOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');

    // Internal state for modal selection (before confirming)
    const [tempSelected, setTempSelected] = useState<any[]>([]);

    useEffect(() => {
        const loadOptions = async () => {
            if (typeof options === 'string') {
                setLoading(true);
                try {
                    const resolved = await CatalogResolver.resolveOptions(options);
                    setResolvedOptions(resolved);
                } catch (err) {
                    console.error('[MultiSelect] Error loading options:', err);
                    setResolvedOptions([]);
                } finally {
                    setLoading(false);
                }
            } else {
                setResolvedOptions(options);
            }
        };
        loadOptions();
    }, [options]);

    const handleOpen = () => {
        setTempSelected(Array.isArray(value) ? [...value] : []);
        setSearchText('');
        setModalVisible(true);
    };

    const handleToggleOption = (val: any) => {
        const index = tempSelected.indexOf(val);
        if (index >= 0) {
            setTempSelected(prev => prev.filter(item => item !== val));
        } else {
            setTempSelected(prev => [...prev, val]);
        }
    };

    const handleConfirm = () => {
        onChange(tempSelected);
        setModalVisible(false);
    };

    // Filter options
    const filteredOptions = resolvedOptions.filter(opt =>
        opt.label.toLowerCase().includes(searchText.toLowerCase())
    );

    // Render display text
    const getDisplayText = () => {
        if (!value || value.length === 0) return placeholder;

        const count = value.length;
        if (count === 1) {
            const opt = resolvedOptions.find(o => o.value === value[0]);
            return opt ? opt.label : '1 seleccionado';
        }
        return `${count} seleccionados`;
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

            {/* Touchable Operator */}
            <TouchableOpacity
                onPress={() => !disabled && handleOpen()}
                disabled={disabled}
                style={[
                    styles.inputContainer,
                    {
                        backgroundColor: disabled ? theme.components.input.disabledBackgroundColor : theme.components.input.backgroundColor,
                        borderColor: error ? theme.theme.colors.danger : theme.components.input.borderColor,
                        borderWidth: theme.components.input.borderWidth,
                        borderRadius: theme.components.input.borderRadius,
                    }
                ]}
            >
                <Text style={{
                    fontSize: theme.components.input.fontSize,
                    color: (!value || value.length === 0) ? theme.components.input.placeholderColor : theme.components.input.color,
                    flex: 1,
                }} numberOfLines={1}>
                    {getDisplayText()}
                </Text>

                <MaterialCommunityIcons
                    name="chevron-down"
                    size={24}
                    color={disabled ? theme.colors.text.disabled : theme.colors.text.secondary}
                />
            </TouchableOpacity>

            {/* Helper/Error */}
            {(error || helperText) && (
                <Text style={[
                    styles.helperText,
                    theme.typography.caption,
                    { color: error ? theme.colors.danger : theme.colors.text.secondary }
                ]}>
                    {error || helperText}
                </Text>
            )}

            {/* MODAL */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <IconButton icon="close" onPress={() => setModalVisible(false)} />
                        <Text style={[theme.typography.h4, { flex: 1, textAlign: 'center' }]}>
                            {label}
                        </Text>
                        <IconButton icon="check" onPress={handleConfirm} iconColor={theme.colors.primary} />
                    </View>

                    {/* Search */}
                    <View style={styles.searchContainer}>
                        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                            <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.text.secondary} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Buscar..."
                                value={searchText}
                                onChangeText={setSearchText}
                                placeholderTextColor={theme.colors.text.disabled}
                            />
                            {searchText.length > 0 && (
                                <IconButton
                                    icon="close-circle"
                                    size={16}
                                    onPress={() => setSearchText('')}
                                    style={{ margin: 0 }}
                                />
                            )}
                        </View>
                    </View>

                    {/* List */}
                    <FlatList
                        data={filteredOptions}
                        keyExtractor={item => String(item.value)}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => {
                            const isSelected = tempSelected.includes(item.value);
                            return (
                                <TouchableOpacity
                                    style={[styles.listItem, { borderBottomColor: theme.colors.border }]}
                                    onPress={() => !item.disabled && handleToggleOption(item.value)}
                                    disabled={item.disabled}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[
                                            theme.typography.body,
                                            { color: item.disabled ? theme.colors.text.disabled : theme.colors.text.primary }
                                        ]}>
                                            {item.label}
                                        </Text>
                                    </View>
                                    <Checkbox.Android
                                        status={isSelected ? 'checked' : 'unchecked'}
                                        onPress={() => !item.disabled && handleToggleOption(item.value)}
                                        disabled={item.disabled}
                                        color={theme.colors.primary}
                                    />
                                </TouchableOpacity>
                            );
                        }}
                    />

                    {/* Footer Stats */}
                    <View style={[styles.modalFooter, { borderTopColor: theme.colors.border }]}>
                        <Text style={theme.typography.caption}>
                            {tempSelected.length} seleccionados
                        </Text>
                        <Button mode="contained" onPress={handleConfirm}>
                            Confirmar
                        </Button>
                    </View>
                </SafeAreaView>
            </Modal>
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
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        height: 56,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    searchContainer: {
        padding: 12,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        borderRadius: 8,
        height: 48,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        height: '100%',
    },
    listContent: {
        paddingHorizontal: 16,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    modalFooter: {
        padding: 16,
        borderTopWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});
