/**
 * JornadaDetalleCard Component
 * 
 * Componente reutilizable para mostrar detalles de una jornada/asignación.
 * Se usa tanto para asignaciones sin salida como para salidas activas.
 * 
 * Fecha: 2026-02-08
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

interface JornadaDetalleCardProps {
    // Datos pueden venir de asignacionDia o salidaActiva
    unidad_codigo?: string;
    mi_rol?: string;
    rol_tripulacion?: string;
    es_comandante?: boolean;
    ruta_codigo?: string;
    sentido?: string;
    hora_salida?: string;
    recorrido_permitido?: string;
    acciones?: string;
    tripulacion?: Array<{
        nombre: string;
        rol: string;
        es_comandante?: boolean;
        usuario_id?: number;
    }>;
    usuario_id?: number; // Para marcar "Tú" en la tripulación
}

export default function JornadaDetalleCard({
    unidad_codigo,
    mi_rol,
    rol_tripulacion,
    es_comandante,
    ruta_codigo,
    sentido,
    hora_salida,
    recorrido_permitido,
    acciones,
    tripulacion,
    usuario_id,
}: JornadaDetalleCardProps) {

    const rol = mi_rol || rol_tripulacion;

    return (
        <View style={styles.container}>
            {/* Unidad y Rol */}
            <View style={styles.grid}>
                {unidad_codigo && (
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>Unidad</Text>
                        <Text style={styles.value}>{unidad_codigo}</Text>
                    </View>
                )}
                {rol && (
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>Mi Rol</Text>
                        <Text style={styles.value}>
                            {rol}
                            {es_comandante && ' ⭐'}
                        </Text>
                        {es_comandante && (
                            <Text style={styles.comandanteBadge}>COMANDANTE</Text>
                        )}
                    </View>
                )}
            </View>

            {/* Ruta y Hora de Salida */}
            {(ruta_codigo || hora_salida) && (
                <View style={styles.grid}>
                    {ruta_codigo && (
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Ruta Asignada</Text>
                            <Text style={styles.value}>{ruta_codigo}</Text>
                            {sentido && (
                                <Text style={styles.subtext}>{sentido}</Text>
                            )}
                        </View>
                    )}
                    {hora_salida && (
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Hora Salida</Text>
                            <Text style={styles.value}>{hora_salida}</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Recorrido Permitido */}
            {recorrido_permitido && (
                <View style={styles.fullRow}>
                    <Text style={styles.label}>Recorrido Permitido</Text>
                    <Text style={styles.value}>{recorrido_permitido}</Text>
                </View>
            )}

            {/* Acciones a Realizar */}
            {acciones && (
                <View style={styles.fullRow}>
                    <Text style={styles.label}>Acciones a Realizar</Text>
                    <Text style={styles.descripcion}>{acciones}</Text>
                </View>
            )}

            {/* Tripulación Completa */}
            {tripulacion && tripulacion.length > 0 && (
                <View style={styles.fullRow}>
                    <Text style={styles.label}>Tripulación ({tripulacion.length})</Text>
                    <View style={styles.tripulacionList}>
                        {tripulacion.map((t, idx) => (
                            <View
                                key={idx}
                                style={[
                                    styles.tripulacionItem,
                                    t.es_comandante && styles.tripulacionItemComandante
                                ]}
                            >
                                <View style={styles.tripulacionRow}>
                                    <Text style={styles.tripulacionNombre} numberOfLines={1}>
                                        {t.nombre}
                                        {t.usuario_id === usuario_id && ' (Tú)'}
                                    </Text>
                                    <View style={styles.tripulacionRolContainer}>
                                        <Text style={styles.tripulacionRol}>{t.rol}</Text>
                                        {t.es_comandante && <Text style={styles.estrella}>⭐</Text>}
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    grid: {
        flexDirection: 'row',
        gap: 12,
    },
    gridItem: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
    },
    fullRow: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
    },
    label: {
        fontSize: 11,
        color: '#666',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    value: {
        fontSize: 15,
        color: '#000',
        fontWeight: '600',
    },
    subtext: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    comandanteBadge: {
        fontSize: 11,
        color: COLORS.warning,
        fontWeight: '600',
        marginTop: 4,
    },
    descripcion: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    tripulacionList: {
        gap: 8,
        marginTop: 8,
    },
    tripulacionItem: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    tripulacionItemComandante: {
        borderLeftWidth: 3,
        borderLeftColor: COLORS.warning,
        paddingLeft: 8,
    },
    tripulacionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    tripulacionNombre: {
        flex: 1,
        fontSize: 14,
        color: '#000',
        fontWeight: '500',
    },
    tripulacionRolContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    tripulacionRol: {
        fontSize: 12,
        color: '#666',
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    estrella: {
        fontSize: 12,
    },
});
