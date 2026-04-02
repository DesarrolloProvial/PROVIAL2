import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useController, Control } from 'react-hook-form';
import { useTheme } from '../core/theme';
import { COLORS } from '../constants/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ObservacionesManagerProps {
    name: string;
    control: Control<any>;
    label?: string;
    disabled?: boolean;
}

export default function ObservacionesManager({ name, control, label, disabled }: ObservacionesManagerProps) {
    const theme = useTheme();

    // UseController for the original array structure
    const { field: originalField } = useController({
        control,
        name: name, // typically 'observaciones'
        defaultValue: []
    });

    // UseController for the new observation text (this maps to form_data.nueva_observacion)
    const { field: newObsField } = useController({
        control,
        name: 'nueva_observacion',
        defaultValue: ''
    });

    // Determine the array to map
    const historyData = Array.isArray(originalField.value) ? originalField.value : [];

    return (
        <View style={styles.container}>
            {label && (
                <Text style={[styles.label, { color: theme.colors.text.secondary }]}>
                    {label}
                </Text>
            )}

            {/* Render Timeline history */}
            {historyData.length > 0 ? (
                <View style={styles.timelineContainer}>
                    {historyData.map((item: any, index: number) => {
                        let hora = item.hora;
                        const isOffline = typeof hora === 'string' && hora.includes('¡');
                        
                        return (
                            <View key={index} style={styles.timelineItem}>
                                <View style={styles.timelineHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <MaterialCommunityIcons name="account-circle" size={18} color={COLORS.primary} />
                                        <Text style={styles.userName}>{item.usuario}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        {isOffline && (
                                            <MaterialCommunityIcons name="cloud-alert" size={14} color={COLORS.warning} style={{ marginRight: 4 }} />
                                        )}
                                        <Text style={styles.timeText}>{item.hora}</Text>
                                    </View>
                                </View>
                                <View style={styles.messageContainer}>
                                    <Text style={styles.messageText}>{item.mensaje}</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            ) : (
                <Text style={{ fontStyle: 'italic', color: '#888', marginBottom: 12 }}>Sin observaciones previas.</Text>
            )}

            {/* Nueva observación Input */}
            <View style={styles.newInputContainer}>
                <Text style={[styles.label, { color: theme.colors.text.primary, fontSize: 14, fontWeight: '600' }]}>
                    Añadir Observación
                </Text>
                <TextInput
                    style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text.primary }]}
                    placeholder="Escriba aquí para añadir a la bitácora..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                    value={newObsField.value}
                    onChangeText={newObsField.onChange}
                    editable={!disabled}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 8,
    },
    timelineContainer: {
        marginBottom: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    timelineItem: {
        marginBottom: 12,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
        paddingLeft: 12,
    },
    timelineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    userName: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#444',
        marginLeft: 6,
    },
    timeText: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'monospace',
    },
    messageContainer: {
        backgroundColor: '#fff',
        padding: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    messageText: {
        fontSize: 14,
        color: '#333',
    },
    newInputContainer: {
        marginTop: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 6,
        padding: 12,
        minHeight: 80,
        textAlignVertical: 'top',
        backgroundColor: '#fff',
    }
});
