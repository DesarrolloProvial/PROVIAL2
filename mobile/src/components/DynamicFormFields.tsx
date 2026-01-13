import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { COLORS } from '../constants/colors';

interface Props {
    situacionNombre: string;
    formularioTipo?: string;
    detalles: any;
    setDetalles: (d: any) => void;
    auxiliares?: {
        tipos_hecho: any[];
        tipos_asistencia: any[];
        tipos_emergencia: any[];
    };
}

const TIPOS_VEHICULO = ['Automóvil', 'Pickup', 'Camioneta', 'Bus', 'Camión C-2', 'Camión C-3', 'Trailer', 'Moto'];

export default function DynamicFormFields({ situacionNombre, formularioTipo, detalles, setDetalles, auxiliares }: Props) {

    const handleChange = (field: string, value: any) => {
        setDetalles({ ...detalles, [field]: value });
    };

    // 0. SELECTS ESPECIALES (Accidente, Asistencia, Emergencia)
    if (formularioTipo === 'INCIDENTE') {
        const lista = auxiliares?.tipos_hecho || [];
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Tipo de Accidente</Text>
                <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8 }}>
                    <Picker selectedValue={detalles.tipo_hecho_id} onValueChange={(v) => handleChange('tipo_hecho_id', v)}>
                        <Picker.Item label="Seleccione..." value="" />
                        {lista.map((item: any) => <Picker.Item key={item.id} label={item.nombre} value={item.id} />)}
                    </Picker>
                </View>
            </View>
        );
    }

    if (formularioTipo === 'ASISTENCIA_VEHICULAR') {
        const lista = auxiliares?.tipos_asistencia || [];
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Tipo de Asistencia</Text>
                <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8 }}>
                    <Picker selectedValue={detalles.tipo_asistencia_id} onValueChange={(v) => handleChange('tipo_asistencia_id', v)}>
                        <Picker.Item label="Seleccione..." value="" />
                        {lista.map((item: any) => <Picker.Item key={item.id} label={item.nombre} value={item.id} />)}
                    </Picker>
                </View>
            </View>
        );
    }

    if (formularioTipo === 'OBSTACULO') {
        const lista = auxiliares?.tipos_emergencia || [];
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Tipo de Emergencia / Obstáculo</Text>
                <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8 }}>
                    <Picker selectedValue={detalles.tipo_emergencia_id} onValueChange={(v) => handleChange('tipo_emergencia_id', v)}>
                        <Picker.Item label="Seleccione..." value="" />
                        {lista.map((item: any) => <Picker.Item key={item.id} label={item.nombre} value={item.id} />)}
                    </Picker>
                </View>
            </View>
        );
    }

    // 1. CONTEO VEHICULAR
    if (situacionNombre === 'Conteo vehicular') {
        const conteos = detalles.conteos || {};
        const handleConteo = (tipo: string, delta: number) => {
            const current = conteos[tipo] || 0;
            const newVal = Math.max(0, current + delta);
            handleChange('conteos', { ...conteos, [tipo]: newVal });
        };

        return (
            <View style={styles.section}>
                <Text style={styles.title}>Conteo Vehicular</Text>
                {TIPOS_VEHICULO.map(tipo => (
                    <View key={tipo} style={styles.conteoRow}>
                        <Text style={styles.conteoLabel}>{tipo}</Text>
                        <View style={styles.conteoControls}>
                            <TouchableOpacity onPress={() => handleConteo(tipo, -1)} style={[styles.btn, styles.btnMinus]}><Text>-</Text></TouchableOpacity>
                            <Text style={styles.conteoValue}>{conteos[tipo] || 0}</Text>
                            <TouchableOpacity onPress={() => handleConteo(tipo, 1)} style={[styles.btn, styles.btnPlus]}><Text>+</Text></TouchableOpacity>
                        </View>
                    </View>
                ))}
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TOTAL: {String(Object.values(conteos).reduce((a: any, b: any) => a + b, 0))}</Text>
                </View>
            </View>
        );
    }

    // 2. TOMA DE VELOCIDAD
    if (situacionNombre === 'Toma de velocidad') {
        const [velocidadInput, setVelocidadInput] = useState('');
        const [tipoInput, setTipoInput] = useState('Automóvil');
        const registros = detalles.velocidades || [];

        const agregarRegistro = () => {
            if (!velocidadInput) return;
            const newRegs = [...registros, { tipo: tipoInput, velocidad: velocidadInput }];
            handleChange('velocidades', newRegs);
            setVelocidadInput('');
        };

        return (
            <View style={styles.section}>
                <Text style={styles.title}>Toma de Velocidad</Text>
                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Picker selectedValue={tipoInput} onValueChange={setTipoInput} style={{ height: 50 }}>
                            {TIPOS_VEHICULO.map(t => <Picker.Item key={t} label={t} value={t} />)}
                        </Picker>
                    </View>
                    <TextInput
                        style={[styles.input, { width: 80 }]}
                        value={velocidadInput}
                        onChangeText={setVelocidadInput}
                        keyboardType="numeric"
                        placeholder="Km/h"
                    />
                    <TouchableOpacity onPress={agregarRegistro} style={styles.btnAdd}><Text style={{ color: 'white' }}>+</Text></TouchableOpacity>
                </View>
                <View style={styles.list}>
                    {registros.map((r: any, i: number) => (
                        <Text key={i} style={styles.listItem}>{r.tipo}: {r.velocidad} km/h</Text>
                    ))}
                </View>
            </View>
        );
    }

    // 3. ESCOLTANDO CARGA ANCHA
    if (situacionNombre === 'Escoltando carga ancha') {
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Datos de Escolta</Text>
                <TextInput style={styles.input} placeholder="Empresa" value={detalles.empresa} onChangeText={t => handleChange('empresa', t)} />
                <TextInput style={styles.input} placeholder="Nombre Piloto" value={detalles.piloto} onChangeText={t => handleChange('piloto', t)} />
                <TextInput style={styles.input} placeholder="Placa Vehículo" value={detalles.placa} onChangeText={t => handleChange('placa', t)} />
                <TextInput style={styles.input} placeholder="Motivo/Carga" value={detalles.motivo} onChangeText={t => handleChange('motivo', t)} />
                <TextInput style={styles.input} placeholder="Punto Inicio (Coords/Texto)" value={detalles.punto_inicio} onChangeText={t => handleChange('punto_inicio', t)} />
                <TextInput style={styles.input} placeholder="Punto Fin (Coords/Texto)" value={detalles.punto_fin} onChangeText={t => handleChange('punto_fin', t)} />
            </View>
        )
    }

    // 4. HOSPITAL / COMPAÑERO ENFERMO
    if (situacionNombre === 'Hospital' || situacionNombre === 'Compañero enfermo') {
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Detalles Médicos</Text>
                <TextInput style={styles.input} placeholder="Nombre Hospital / Centro" value={detalles.hospital} onChangeText={t => handleChange('hospital', t)} />
                <TextInput style={styles.input} placeholder="Motivo / Malestar" value={detalles.motivo} onChangeText={t => handleChange('motivo', t)} />
                <TextInput style={styles.input} placeholder="Acciones tomadas" value={detalles.acciones} onChangeText={t => handleChange('acciones', t)} multiline />
            </View>
        )
    }

    // 5. ABASTECIMIENTO
    if (situacionNombre === 'Abastecimiento') {
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Datos Combustible</Text>
                <TextInput style={styles.input} placeholder="Combustible Inicial (Gal/%)" value={detalles.combustible_inicial} onChangeText={t => handleChange('combustible_inicial', t)} keyboardType="numeric" />
                <TextInput style={styles.input} placeholder="Combustible Final (Gal/%)" value={detalles.combustible_final} onChangeText={t => handleChange('combustible_final', t)} keyboardType="numeric" />
                <TextInput style={styles.input} placeholder="Odómetro Actual" value={detalles.odometro} onChangeText={t => handleChange('odometro', t)} keyboardType="numeric" />
            </View>
        )
    }

    // 6. OPERATIVOS (General)
    if (situacionNombre.includes('Operativo') || situacionNombre === 'Consignación') {
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Datos Operativos</Text>
                <TextInput style={styles.input} placeholder="Vehículos Registrados (Cant)" value={detalles.registrados} onChangeText={t => handleChange('registrados', t)} keyboardType="numeric" />
                <TextInput style={styles.input} placeholder="Llamadas de atención" value={detalles.llamadas_atencion} onChangeText={t => handleChange('llamadas_atencion', t)} keyboardType="numeric" />
                <TextInput style={styles.input} placeholder="Sanciones Impuestas" value={detalles.sanciones} onChangeText={t => handleChange('sanciones', t)} keyboardType="numeric" />
                <TextInput style={styles.input} placeholder="Autoridad presente" value={detalles.autoridad} onChangeText={t => handleChange('autoridad', t)} />
                {situacionNombre === 'Consignación' && (
                    <>
                        <TextInput style={styles.input} placeholder="Motivo Consignación" value={detalles.motivo_consignacion} onChangeText={t => handleChange('motivo_consignacion', t)} />
                        <TextInput style={styles.input} placeholder="Destino Traslado" value={detalles.destino_traslado} onChangeText={t => handleChange('destino_traslado', t)} />
                    </>
                )}
            </View>
        )
    }

    // 7. APOYO (General)
    if (situacionNombre.startsWith('Apoyo')) {
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Datos de Apoyo</Text>
                <TextInput style={styles.input} placeholder="Institución / Encargado" value={detalles.institucion} onChangeText={t => handleChange('institucion', t)} />
                <TextInput style={styles.input} placeholder="Punto Inicio" value={detalles.punto_inicio} onChangeText={t => handleChange('punto_inicio', t)} />
                <TextInput style={styles.input} placeholder="Punto Finalización" value={detalles.punto_fin} onChangeText={t => handleChange('punto_fin', t)} />
            </View>
        )
    }

    // 8. FALLA MECANICA
    // 8. FALLA MECANICA
    if (situacionNombre === 'Falla Mecánica de unidad') {
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Detalle Falla</Text>
                <TextInput style={styles.input} placeholder="Tipo de falla" value={detalles.tipo_falla} onChangeText={t => handleChange('tipo_falla', t)} />
                <View style={styles.row}>
                    <Text>Requiere Grúa?</Text>
                    <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, flex: 1 }}>
                        <Picker selectedValue={detalles.requiere_grua} onValueChange={(v) => handleChange('requiere_grua', v)}>
                            <Picker.Item label="No" value="No" />
                            <Picker.Item label="Sí" value="Sí" />
                        </Picker>
                    </View>
                </View>
            </View>
        )
    }

    // 9. COMIDA
    if (situacionNombre === 'Comida') {
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Tiempo de Comida</Text>
                <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: 'white' }}>
                    <Picker selectedValue={detalles.tiempo_comida} onValueChange={v => handleChange('tiempo_comida', v)}>
                        <Picker.Item label="Seleccione..." value="" />
                        <Picker.Item label="Desayuno" value="Desayuno" />
                        <Picker.Item label="Almuerzo" value="Almuerzo" />
                        <Picker.Item label="Cena" value="Cena" />
                    </Picker>
                </View>
            </View>
        )
    }

    return null;
}

const styles = StyleSheet.create({
    section: { marginBottom: 16, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 8 },
    title: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: COLORS.primary },
    input: { backgroundColor: 'white', padding: 10, borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: '#ddd' },
    conteoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    conteoLabel: { flex: 1, fontSize: 14 },
    conteoControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    conteoValue: { fontSize: 16, fontWeight: 'bold', width: 30, textAlign: 'center' },
    btn: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0' },
    btnMinus: { backgroundColor: '#ffcccc' },
    btnPlus: { backgroundColor: '#ccffcc' },
    totalRow: { marginTop: 10, borderTopWidth: 1, borderColor: '#ddd', paddingTop: 10 },
    totalLabel: { fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    btnAdd: { backgroundColor: COLORS.primary, padding: 10, borderRadius: 6 },
    list: { marginTop: 10 },
    listItem: { padding: 4, borderBottomWidth: 1, borderColor: '#eee' }
});
