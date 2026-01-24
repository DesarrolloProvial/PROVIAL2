/**
 * LlamadaAtencionManager
 * 
 * Componente para gestionar llamadas de atención en operativos.
 * Cada llamada incluye: motivo, datos de piloto y datos de vehículo.
 * 
 * Fecha: 2026-01-22
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export interface DatosPiloto {
    nombre: string;
    dpi: string;
    licencia?: string;
    telefono?: string;
}

export interface DatosVehiculo {
    tipo: string;
    marca: string;
    placa: string;
    color?: string;
}

export interface LlamadaAtencion {
    id: string;
    motivo: string;
    piloto: DatosPiloto;
    vehiculo: DatosVehiculo;
}

interface Props {
    value: LlamadaAtencion[];
    onChange: (value: LlamadaAtencion[]) => void;
    readonly?: boolean;
}

const MOTIVOS_COMUNES = [
    'Exceso de velocidad',
    'No usar cinturón',
    'Uso de celular',
    'Documentos vencidos',
    'Luces apagadas',
    'Otro',
];

export default function LlamadaAtencionManager({ value, onChange, readonly = false }: Props) {
    const [llamadas, setLlamadas] = useState<LlamadaAtencion[]>(value || []);
    const [modalVisible, setModalVisible] = useState(false);
    const [editando, setEditando] = useState<LlamadaAtencion | null>(null);

    // Estado del formulario
    const [motivo, setMotivo] = useState('');
    const [motivoOtro, setMotivoOtro] = useState('');
    const [nombrePiloto, setNombrePiloto] = useState('');
    const [dpiPiloto, setDpiPiloto] = useState('');
    const [licenciaPiloto, setLicenciaPiloto] = useState('');
    const [telefonoPiloto, setTelefonoPiloto] = useState('');
    const [tipoVehiculo, setTipoVehiculo] = useState('');
    const [marcaVehiculo, setMarcaVehiculo] = useState('');
    const [placaVehiculo, setPlacaVehiculo] = useState('');
    const [colorVehiculo, setColorVehiculo] = useState('');

    const abrirModal = (llamada?: LlamadaAtencion) => {
        if (llamada) {
            setEditando(llamada);
            setMotivo(llamada.motivo);
            setNombrePiloto(llamada.piloto.nombre);
            setDpiPiloto(llamada.piloto.dpi);
            setLicenciaPiloto(llamada.piloto.licencia || '');
            setTelefonoPiloto(llamada.piloto.telefono || '');
            setTipoVehiculo(llamada.vehiculo.tipo);
            setMarcaVehiculo(llamada.vehiculo.marca);
            setPlacaVehiculo(llamada.vehiculo.placa);
            setColorVehiculo(llamada.vehiculo.color || '');
        } else {
            limpiarFormulario();
        }
        setModalVisible(true);
    };

    const limpiarFormulario = () => {
        setEditando(null);
        setMotivo('');
        setMotivoOtro('');
        setNombrePiloto('');
        setDpiPiloto('');
        setLicenciaPiloto('');
        setTelefonoPiloto('');
        setTipoVehiculo('');
        setMarcaVehiculo('');
        setPlacaVehiculo('');
        setColorVehiculo('');
    };

    const guardarLlamada = () => {
        // Validaciones
        if (!motivo) {
            Alert.alert('Error', 'Selecciona un motivo');
            return;
        }
        if (motivo === 'Otro' && !motivoOtro.trim()) {
            Alert.alert('Error', 'Especifica el motivo');
            return;
        }
        if (!nombrePiloto.trim() || !dpiPiloto.trim()) {
            Alert.alert('Error', 'Ingresa nombre y DPI del piloto');
            return;
        }
        if (!tipoVehiculo.trim() || !marcaVehiculo.trim() || !placaVehiculo.trim()) {
            Alert.alert('Error', 'Ingresa tipo, marca y placa del vehículo');
            return;
        }

        const motivoFinal = motivo === 'Otro' ? motivoOtro : motivo;

        const nuevaLlamada: LlamadaAtencion = {
            id: editando?.id || Date.now().toString(),
            motivo: motivoFinal,
            piloto: {
                nombre: nombrePiloto.trim(),
                dpi: dpiPiloto.trim(),
                licencia: licenciaPiloto.trim() || undefined,
                telefono: telefonoPiloto.trim() || undefined,
            },
            vehiculo: {
                tipo: tipoVehiculo.trim(),
                marca: marcaVehiculo.trim(),
                placa: placaVehiculo.trim().toUpperCase(),
                color: colorVehiculo.trim() || undefined,
            },
        };

        let nuevasLlamadas: LlamadaAtencion[];
        if (editando) {
            nuevasLlamadas = llamadas.map(l => l.id === editando.id ? nuevaLlamada : l);
        } else {
            nuevasLlamadas = [...llamadas, nuevaLlamada];
        }

        setLlamadas(nuevasLlamadas);
        onChange(nuevasLlamadas);
        setModalVisible(false);
        limpiarFormulario();
    };

    const eliminarLlamada = (id: string) => {
        Alert.alert(
            'Confirmar',
            '¿Eliminar esta llamada de atención?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => {
                        const nuevasLlamadas = llamadas.filter(l => l.id !== id);
                        setLlamadas(nuevasLlamadas);
                        onChange(nuevasLlamadas);
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Llamadas de Atención</Text>
                {!readonly && (
                    <TouchableOpacity style={styles.addButton} onPress={() => abrirModal()}>
                        <MaterialIcons name="add" size={20} color="#fff" />
                        <Text style={styles.addButtonText}>Agregar</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView style={styles.listContainer}>
                {llamadas.length === 0 ? (
                    <Text style={styles.emptyText}>
                        {readonly ? 'No hay llamadas de atención registradas' : 'Presiona "Agregar" para registrar una llamada de atención'}
                    </Text>
                ) : (
                    llamadas.map((llamada, index) => (
                        <View key={llamada.id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardNumber}>#{index + 1}</Text>
                                {!readonly && (
                                    <View style={styles.cardActions}>
                                        <TouchableOpacity onPress={() => abrirModal(llamada)}>
                                            <MaterialIcons name="edit" size={20} color={COLORS.primary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => eliminarLlamada(llamada.id)}>
                                            <MaterialIcons name="delete" size={20} color={COLORS.error} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            <View style={styles.cardContent}>
                                <Text style={styles.cardLabel}>Motivo:</Text>
                                <Text style={styles.cardValue}>{llamada.motivo}</Text>

                                <Text style={styles.cardLabel}>Piloto:</Text>
                                <Text style={styles.cardValue}>
                                    {llamada.piloto.nombre} (DPI: {llamada.piloto.dpi})
                                </Text>

                                <Text style={styles.cardLabel}>Vehículo:</Text>
                                <Text style={styles.cardValue}>
                                    {llamada.vehiculo.placa} ({llamada.vehiculo.tipo}, {llamada.vehiculo.marca})
                                </Text>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Modal de formulario */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editando ? 'Editar Llamada de Atención' : 'Nueva Llamada de Atención'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <MaterialIcons name="close" size={24} color={COLORS.text.primary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll}>
                            {/* Motivo */}
                            <Text style={styles.inputLabel}>Motivo *</Text>
                            <View style={styles.motivosContainer}>
                                {MOTIVOS_COMUNES.map(m => (
                                    <TouchableOpacity
                                        key={m}
                                        style={[styles.motivoChip, motivo === m && styles.motivoChipSelected]}
                                        onPress={() => setMotivo(m)}
                                    >
                                        <Text style={[styles.motivoChipText, motivo === m && styles.motivoChipTextSelected]}>
                                            {m}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {motivo === 'Otro' && (
                                <>
                                    <Text style={styles.inputLabel}>Especificar motivo *</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={motivoOtro}
                                        onChangeText={setMotivoOtro}
                                        placeholder="Describe el motivo..."
                                    />
                                </>
                            )}

                            {/* Datos del Piloto */}
                            <Text style={styles.sectionTitle}>Datos del Piloto</Text>
                            <Text style={styles.inputLabel}>Nombre completo *</Text>
                            <TextInput
                                style={styles.input}
                                value={nombrePiloto}
                                onChangeText={setNombrePiloto}
                                placeholder="Nombre del piloto"
                            />

                            <Text style={styles.inputLabel}>DPI *</Text>
                            <TextInput
                                style={styles.input}
                                value={dpiPiloto}
                                onChangeText={setDpiPiloto}
                                placeholder="Número de DPI"
                                keyboardType="numeric"
                            />

                            <Text style={styles.inputLabel}>Licencia (opcional)</Text>
                            <TextInput
                                style={styles.input}
                                value={licenciaPiloto}
                                onChangeText={setLicenciaPiloto}
                                placeholder="Número de licencia"
                            />

                            <Text style={styles.inputLabel}>Teléfono (opcional)</Text>
                            <TextInput
                                style={styles.input}
                                value={telefonoPiloto}
                                onChangeText={setTelefonoPiloto}
                                placeholder="Teléfono"
                                keyboardType="phone-pad"
                            />

                            {/* Datos del Vehículo */}
                            <Text style={styles.sectionTitle}>Datos del Vehículo</Text>
                            <Text style={styles.inputLabel}>Tipo *</Text>
                            <TextInput
                                style={styles.input}
                                value={tipoVehiculo}
                                onChangeText={setTipoVehiculo}
                                placeholder="Ej: Sedán, Pick-up"
                            />

                            <Text style={styles.inputLabel}>Marca *</Text>
                            <TextInput
                                style={styles.input}
                                value={marcaVehiculo}
                                onChangeText={setMarcaVehiculo}
                                placeholder="Ej: Toyota, Ford"
                            />

                            <Text style={styles.inputLabel}>Placa *</Text>
                            <TextInput
                                style={styles.input}
                                value={placaVehiculo}
                                onChangeText={setPlacaVehiculo}
                                placeholder="Ej: P-123ABC"
                                autoCapitalize="characters"
                            />

                            <Text style={styles.inputLabel}>Color (opcional)</Text>
                            <TextInput
                                style={styles.input}
                                value={colorVehiculo}
                                onChangeText={setColorVehiculo}
                                placeholder="Ej: Blanco, Negro"
                            />
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonSecondary]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.buttonSecondaryText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={guardarLlamada}>
                                <Text style={styles.buttonPrimaryText}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text.primary,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        gap: 4,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    listContainer: {
        maxHeight: 400,
    },
    emptyText: {
        textAlign: 'center',
        color: COLORS.text.secondary,
        fontSize: 14,
        marginTop: 20,
        fontStyle: 'italic',
    },
    card: {
        backgroundColor: COLORS.background,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    cardNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cardContent: {
        gap: 4,
    },
    cardLabel: {
        fontSize: 12,
        color: COLORS.text.secondary,
        marginTop: 4,
    },
    cardValue: {
        fontSize: 14,
        color: COLORS.text.primary,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text.primary,
    },
    modalScroll: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text.primary,
        marginTop: 16,
        marginBottom: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text.primary,
        marginBottom: 6,
        marginTop: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        backgroundColor: '#fff',
    },
    motivosContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    motivoChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: '#fff',
    },
    motivoChipSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    motivoChipText: {
        fontSize: 12,
        color: COLORS.text.secondary,
    },
    motivoChipTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonPrimary: {
        backgroundColor: COLORS.primary,
    },
    buttonPrimaryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonSecondary: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    buttonSecondaryText: {
        color: COLORS.text.primary,
        fontSize: 16,
        fontWeight: '600',
    },
});
