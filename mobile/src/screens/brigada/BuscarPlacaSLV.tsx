import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Alert,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { verificarPlaca } from '../../services/publicApi';

export default function BuscarPlacaSLVScreen() {
    const [placa, setPlaca] = useState('');
    const [loading, setLoading] = useState(false);
    const [resultado, setResultado] = useState<any>(null);

    const handleBuscar = async () => {
        const limpia = placa.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
        if (limpia.length < 3) {
            Alert.alert('Placa inválida', 'Ingresa al menos 3 caracteres de la placa.');
            return;
        }
        setLoading(true);
        setResultado(null);
        try {
            const data = await verificarPlaca(limpia);
            setResultado(data);
        } catch {
            Alert.alert('Error', 'No se pudo consultar el servidor. Verifica tu conexión.');
        } finally {
            setLoading(false);
        }
    };

    const estadoColor = (estado?: string) => {
        if (!estado) return COLORS.text.secondary;
        if (estado === 'VIGENTE') return COLORS.success;
        if (estado === 'VENCIDO') return COLORS.danger;
        return COLORS.warning;
    };

    return (
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.titulo}>Verificar Limitador de Velocidad</Text>
            <Text style={styles.subtitulo}>Consulta si un vehículo tiene SLV registrado</Text>

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    value={placa}
                    onChangeText={v => setPlaca(v.toUpperCase())}
                    placeholder="Ej: P123ABC"
                    placeholderTextColor={COLORS.text.secondary}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={10}
                    returnKeyType="search"
                    onSubmitEditing={handleBuscar}
                />
                <TouchableOpacity
                    style={[styles.boton, loading && styles.botonDisabled]}
                    onPress={handleBuscar}
                    disabled={loading}
                >
                    {loading
                        ? <ActivityIndicator color={COLORS.white} />
                        : <Text style={styles.botonText}>Buscar</Text>
                    }
                </TouchableOpacity>
            </View>

            {resultado && (
                <View style={styles.card}>
                    {resultado.valido ? (
                        <>
                            <View style={[styles.estadoBadge, { backgroundColor: estadoColor(resultado.estado) + '20' }]}>
                                <Text style={[styles.estadoText, { color: estadoColor(resultado.estado) }]}>
                                    {resultado.tiene_limitador ? '✅ TIENE LIMITADOR SLV' : '❌ SIN LIMITADOR REGISTRADO'}
                                </Text>
                            </View>

                            <View style={styles.fila}>
                                <Text style={styles.label}>Placa</Text>
                                <Text style={styles.valor}>{resultado.placa}</Text>
                            </View>

                            {resultado.codigo_slv && (
                                <View style={styles.fila}>
                                    <Text style={styles.label}>Código SLV</Text>
                                    <Text style={[styles.valor, styles.codigo]}>{resultado.codigo_slv}</Text>
                                </View>
                            )}

                            {resultado.estado && (
                                <View style={styles.fila}>
                                    <Text style={styles.label}>Estado</Text>
                                    <Text style={[styles.valor, { color: estadoColor(resultado.estado) }]}>
                                        {resultado.estado}
                                    </Text>
                                </View>
                            )}

                            {resultado.tipo_sistema && (
                                <View style={styles.fila}>
                                    <Text style={styles.label}>Tipo sistema</Text>
                                    <Text style={styles.valor}>{resultado.tipo_sistema}</Text>
                                </View>
                            )}

                            {resultado.velocidad_limitada && (
                                <View style={styles.fila}>
                                    <Text style={styles.label}>Velocidad limitada</Text>
                                    <Text style={styles.valor}>{resultado.velocidad_limitada} km/h</Text>
                                </View>
                            )}

                            {resultado.empresa && (
                                <View style={styles.fila}>
                                    <Text style={styles.label}>Empresa</Text>
                                    <Text style={styles.valor}>{resultado.empresa}</Text>
                                </View>
                            )}

                            {resultado.implementadora && (
                                <View style={styles.fila}>
                                    <Text style={styles.label}>Implementadora</Text>
                                    <Text style={styles.valor}>{resultado.implementadora}</Text>
                                </View>
                            )}

                            {resultado.fecha_vencimiento && (
                                <View style={styles.fila}>
                                    <Text style={styles.label}>Vence</Text>
                                    <Text style={[styles.valor, { color: estadoColor(resultado.estado) }]}>
                                        {new Date(resultado.fecha_vencimiento).toLocaleDateString('es-GT')}
                                    </Text>
                                </View>
                            )}

                            {resultado.historial && resultado.historial.length > 1 && (
                                <Text style={styles.historialNote}>
                                    * Este vehículo tiene {resultado.historial.length} registros históricos
                                </Text>
                            )}
                        </>
                    ) : (
                        <View style={styles.noEncontrado}>
                            <Text style={styles.noEncontradoIcon}>🔍</Text>
                            <Text style={styles.noEncontradoText}>
                                {resultado.mensaje || 'Vehículo no encontrado en el registro SLV'}
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        padding: 16,
    },
    titulo: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text.primary,
        marginBottom: 4,
        marginTop: 8,
    },
    subtitulo: {
        fontSize: 14,
        color: COLORS.text.secondary,
        marginBottom: 20,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    input: {
        flex: 1,
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text.primary,
        backgroundColor: COLORS.white,
        letterSpacing: 2,
    },
    boton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 80,
    },
    botonDisabled: {
        opacity: 0.6,
    },
    botonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '700',
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginTop: 4,
    },
    estadoBadge: {
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 16,
        alignItems: 'center',
    },
    estadoText: {
        fontSize: 16,
        fontWeight: '700',
    },
    fila: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    label: {
        fontSize: 14,
        color: COLORS.text.secondary,
        fontWeight: '500',
    },
    valor: {
        fontSize: 14,
        color: COLORS.text.primary,
        fontWeight: '600',
        maxWidth: '60%',
        textAlign: 'right',
    },
    codigo: {
        fontSize: 16,
        letterSpacing: 1,
        color: COLORS.primary,
    },
    historialNote: {
        marginTop: 12,
        fontSize: 12,
        color: COLORS.text.secondary,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    noEncontrado: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    noEncontradoIcon: {
        fontSize: 40,
        marginBottom: 8,
    },
    noEncontradoText: {
        fontSize: 15,
        color: COLORS.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
    },
});
