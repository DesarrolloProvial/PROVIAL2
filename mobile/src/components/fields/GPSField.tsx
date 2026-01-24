/**
 * GPSField Component
 * 
 * Campo para captura de coordenadas GPS.
 * Permite captura automática y refresco manual.
 * Muestra latitud/longitud y precisión.
 * 
 * Fecha: 2026-01-22
 * FASE 1 - Campos Avanzados
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useTheme } from '../../core/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface GPSValue {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    timestamp?: number;
}

interface GPSFieldProps {
    label: string;
    value: GPSValue | null;
    onChange: (value: GPSValue) => void;
    error?: string;
    helperText?: string;
    required?: boolean;
    disabled?: boolean;
    autoCapture?: boolean;
}

export default function GPSField({
    label,
    value,
    onChange,
    error,
    helperText,
    required,
    disabled,
    autoCapture,
}: GPSFieldProps) {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Auto-captura al montar si no hay valor
    useEffect(() => {
        if (autoCapture && !value && !disabled) {
            capturarUbicacion();
        }
    }, []); // Run once

    const capturarUbicacion = async () => {
        if (disabled) return;

        setLoading(true);
        setStatus('idle');

        try {
            // Permisos
            const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
            if (permStatus !== 'granted') {
                Alert.alert('Permiso denegado', 'Se necesita acceso a ubicación para capturar coordenadas.');
                setLoading(false);
                setStatus('error');
                return;
            }

            // Obtener ubicación
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            onChange({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy,
                timestamp: location.timestamp,
            });

            setStatus('success');

        } catch (err) {
            console.error('[GPS] Error capturando ubicación:', err);
            Alert.alert('Error', 'No se pudo obtener la ubicación. Verifique que el GPS esté activo.');
            setStatus('error');
        } finally {
            setLoading(false);
        }
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

            {/* Content Box */}
            <View style={[
                styles.contentBox,
                {
                    backgroundColor: theme.colors.surface,
                    borderColor: error
                        ? theme.colors.danger
                        : (status === 'success' ? theme.colors.success : theme.colors.border),
                }
            ]}>
                {value ? (
                    <View style={styles.valueContainer}>
                        <View>
                            <Text style={[theme.typography.h4, { color: theme.colors.text.primary }]}>
                                {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
                            </Text>
                            <Text style={[theme.typography.caption, { color: theme.colors.text.secondary }]}>
                                Precisión: {value.accuracy ? `±${value.accuracy.toFixed(1)}m` : 'N/A'} • {new Date(value.timestamp || Date.now()).toLocaleTimeString()}
                            </Text>
                        </View>

                        <MaterialCommunityIcons
                            name="check-circle"
                            size={24}
                            color={theme.colors.success}
                        />
                    </View>
                ) : (
                    <View style={styles.placeholderContainer}>
                        <Text style={[theme.typography.body, { color: theme.colors.text.disabled }]}>
                            Sin coordenadas
                        </Text>
                    </View>
                )}

                {/* Botón de Captura */}
                {!disabled && (
                    <TouchableOpacity
                        style={[
                            styles.captureButton,
                            {
                                backgroundColor: theme.colors.gray[100],
                                borderTopColor: theme.colors.border,
                            }
                        ]}
                        onPress={capturarUbicacion}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                            <>
                                <MaterialCommunityIcons
                                    name={value ? "refresh" : "crosshairs-gps"}
                                    size={20}
                                    color={theme.colors.primary}
                                />
                                <Text style={[
                                    styles.captureText,
                                    theme.typography.button,
                                    { color: theme.colors.primary }
                                ]}>
                                    {value ? 'Actualizar Ubicación' : 'Capturar Ubicación'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>

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
    contentBox: {
        borderRadius: 8,
        borderWidth: 1,
        overflow: 'hidden',
    },
    valueContainer: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    placeholderContainer: {
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 70,
    },
    captureButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderTopWidth: 1,
        gap: 8,
    },
    captureText: {
        fontSize: 14,
    },
    helperText: {
        marginTop: 4,
    },
});
