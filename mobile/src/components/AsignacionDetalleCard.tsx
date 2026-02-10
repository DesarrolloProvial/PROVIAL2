/**
 * AsignacionDetalleCard
 * 
 * Componente reutilizable que muestra los detalles completos de una asignación o jornada activa.
 * Usado en:
 * - Card "Mi Asignación" (cuando no hay salida activa)
 * - Card "Jornada Activa" (cuando sí hay salida activa)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

interface TripulanteData {
    nombre: string;
    rol: string;
    usuario_id: number;
    es_comandante?: boolean;
}

export interface AsignacionDetalleCardProps {
    // Header
    titulo: string;
    badgeText: string;
    badgeColor: string;

    // Primera sección (opcional)
    primeraSeccionLabel?: string;
    primeraSeccionValor?: string;
    primeraSeccionColor?: string;

    // Datos de unidad
    unidad_codigo?: string;
    tipo_unidad?: string;

    // Datos de rol
    mi_rol?: string;
    es_comandante?: boolean;

    // Datos de ruta
    ruta_codigo?: string;
    sentido?: string;
    hora_salida?: string;

    // Instrucciones
    recorrido_permitido?: string;
    acciones?: string;

    // Tripulación
    tripulacion?: TripulanteData[];
    usuario_id?: number;
}

export default function AsignacionDetalleCard(props: AsignacionDetalleCardProps) {
    // DEBUG: Log all props to see what data is arriving
    console.log('📋 [AsignacionDetalleCard] Props recibidos:', {
        titulo: props.titulo,
        unidad_codigo: props.unidad_codigo,
        tipo_unidad: props.tipo_unidad,
        mi_rol: props.mi_rol,
        es_comandante: props.es_comandante,
        ruta_codigo: props.ruta_codigo,
        sentido: props.sentido,
        hora_salida: props.hora_salida,
        recorrido_permitido: props.recorrido_permitido,
        acciones: props.acciones,
        tripulacion: props.tripulacion,
        primeraSeccionLabel: props.primeraSeccionLabel,
        primeraSeccionValor: props.primeraSeccionValor,
    });

    const {
        titulo,
        badgeText,
        badgeColor,
        primeraSeccionLabel,
        primeraSeccionValor,
        primeraSeccionColor,
        unidad_codigo,
        tipo_unidad,
        mi_rol,
        es_comandante,
        ruta_codigo,
        sentido,
        hora_salida,
        recorrido_permitido,
        acciones,
        tripulacion,
        usuario_id
    } = props;

    return (
        <View style={[styles.card, styles.asignacionCard]}>
            {/* Header */}
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{titulo}</Text>
                <View style={[styles.tipoBadge, { backgroundColor: badgeColor }]}>
                    <Text style={styles.tipoBadgeText}>{badgeText}</Text>
                </View>
            </View>

            <View style={styles.cardContent}>
                {/* Primera sección (Fecha o Inicio según contexto) */}
                {primeraSeccionLabel && primeraSeccionValor && (
                    <View style={[styles.asignacionFullRow, {
                        marginBottom: 12,
                        paddingBottom: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: COLORS.border
                    }]}>
                        <Text style={styles.asignacionItemLabel}>{primeraSeccionLabel}</Text>
                        <Text style={[
                            styles.asignacionItemValue,
                            primeraSeccionColor && { color: primeraSeccionColor }
                        ]}>
                            {primeraSeccionValor}
                        </Text>
                    </View>
                )}

                {/* Unidad y Rol */}
                <View style={styles.asignacionGrid}>
                    <View style={styles.asignacionItem}>
                        <Text style={styles.asignacionItemLabel}>Unidad</Text>
                        <Text style={styles.asignacionItemValue}>
                            {unidad_codigo || 'Sin asignar'}
                        </Text>
                        {tipo_unidad && (
                            <Text style={styles.asignacionItemSubtext}>{tipo_unidad}</Text>
                        )}
                    </View>
                    <View style={styles.asignacionItem}>
                        <Text style={styles.asignacionItemLabel}>Mi Rol</Text>
                        <Text style={styles.asignacionItemValue}>
                            {mi_rol || 'Sin asignar'}
                            {es_comandante && ' ⭐'}
                        </Text>
                        {es_comandante && (
                            <Text style={{ fontSize: 11, color: COLORS.warning, fontWeight: '600' }}>
                                COMANDANTE
                            </Text>
                        )}
                    </View>
                </View>

                {/* Ruta y Hora de Salida */}
                {(ruta_codigo || hora_salida) && (
                    <View style={styles.asignacionGrid}>
                        {ruta_codigo && (
                            <View style={styles.asignacionItem}>
                                <Text style={styles.asignacionItemLabel}>Ruta Asignada</Text>
                                <Text style={styles.asignacionItemValue}>{ruta_codigo}</Text>
                                {sentido && (
                                    <Text style={styles.asignacionItemSubtext}>{sentido}</Text>
                                )}
                            </View>
                        )}
                        {hora_salida && (
                            <View style={styles.asignacionItem}>
                                <Text style={styles.asignacionItemLabel}>Hora Salida</Text>
                                <Text style={styles.asignacionItemValue}>{hora_salida}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Recorrido Permitido */}
                {recorrido_permitido && (
                    <View style={styles.asignacionFullRow}>
                        <Text style={styles.asignacionItemLabel}>Recorrido Permitido</Text>
                        <Text style={styles.asignacionItemValue}>{recorrido_permitido}</Text>
                    </View>
                )}

                {/* Acciones a Realizar */}
                {acciones && (
                    <View style={styles.asignacionFullRow}>
                        <Text style={styles.asignacionItemLabel}>Acciones a Realizar</Text>
                        <Text style={styles.descripcionText}>{acciones}</Text>
                    </View>
                )}

                {/* Tripulación Completa */}
                {tripulacion && tripulacion.length > 0 && (
                    <View style={styles.asignacionFullRow}>
                        <Text style={styles.asignacionItemLabel}>
                            Tripulación ({tripulacion.length})
                        </Text>
                        <View style={styles.companerosList}>
                            {tripulacion.map((t, idx) => (
                                <View
                                    key={idx}
                                    style={[
                                        styles.companeroItem,
                                        t.es_comandante && {
                                            borderLeftWidth: 3,
                                            borderLeftColor: COLORS.warning,
                                            paddingLeft: 8
                                        }
                                    ]}
                                >
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <Text style={[styles.companeroNombre, { flex: 1 }]} numberOfLines={1}>
                                            {t.nombre}{t.usuario_id === usuario_id && ' (Tú)'}
                                        </Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Text style={styles.companeroRol}>{t.rol}</Text>
                                            {t.es_comandante && <Text style={{ fontSize: 12 }}>⭐</Text>}
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}

// Estos estilos deben coincidir con los de BrigadaHomeScreen
// Se pueden mover a un archivo de estilos compartidos si se prefiere
const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    asignacionCard: {
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text.primary,
    },
    tipoBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    tipoBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    cardContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    asignacionFullRow: {
        marginBottom: 12,
    },
    asignacionGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        gap: 12,
    },
    asignacionItem: {
        flex: 1,
    },
    asignacionItemLabel: {
        fontSize: 12,
        color: COLORS.text.secondary,
        marginBottom: 4,
        fontWeight: '600',
    },
    asignacionItemValue: {
        fontSize: 15,
        color: COLORS.text.primary,
        fontWeight: '600',
    },
    asignacionItemSubtext: {
        fontSize: 12,
        color: COLORS.text.secondary,
        marginTop: 2,
    },
    descripcionText: {
        fontSize: 14,
        color: COLORS.text.primary,
        lineHeight: 20,
    },
    companerosList: {
        marginTop: 8,
    },
    companeroItem: {
        backgroundColor: COLORS.background,
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    companeroNombre: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text.primary,
    },
    companeroRol: {
        fontSize: 12,
        color: COLORS.text.secondary,
    },
});
