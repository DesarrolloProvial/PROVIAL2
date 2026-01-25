import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
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
    unidades?: any[];
}

const TIPOS_VEHICULO = ['Automóvil', 'Pickup', 'Camioneta', 'Bus', 'Camión C-2', 'Camión C-3', 'Trailer', 'Moto'];

export default function DynamicFormFields({ situacionNombre, formularioTipo, detalles, setDetalles, auxiliares, unidades }: Props) {

    // ==========================================
    // STATES LOCALES (Hooks siempre al inicio)
    // ==========================================
    const [velocidadInput, setVelocidadInput] = useState('');
    const [tipoInput, setTipoInput] = useState('Automóvil');

    const [llamadaOp, setLlamadaOp] = useState({ motivo: '', piloto: '', vehiculo: '' });

    // ==========================================
    // HANDLERS
    // ==========================================
    const handleChange = (field: string, value: any) => {
        setDetalles({ ...detalles, [field]: value });
    };

    const handleConteo = (tipo: string, delta: number) => {
        const conteos = detalles.conteos || {};
        const current = conteos[tipo] || 0;
        const newVal = Math.max(0, current + delta);
        handleChange('conteos', { ...conteos, [tipo]: newVal });
    };

    const handleAddVelocidad = () => {
        if (!velocidadInput) return;
        const regs = detalles.velocidades || [];
        handleChange('velocidades', [...regs, { tipo: tipoInput, velocidad: velocidadInput }]);
        setVelocidadInput('');
    };

    const handleAddLlamada = () => {
        if (!llamadaOp.motivo) return;
        const regs = detalles.llamadas_detalles || [];
        handleChange('llamadas_detalles', [...regs, llamadaOp]);
        setLlamadaOp({ motivo: '', piloto: '', vehiculo: '' });
    };

    // ==========================================
    // RENDERS POR TIPO
    // ==========================================

    // 0. INCIDENTE (ACCIDENTE)
    if (formularioTipo === 'INCIDENTE' || situacionNombre === 'Accidente de Tránsito') {
        const lista = auxiliares?.tipos_hecho || [];
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Tipo de Accidente / Hecho</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={detalles.tipo_hecho_id}
                        onValueChange={(v) => {
                            // Convertir a número si no es vacío, sino null
                            const valor = v === '' || v === null ? null : parseInt(String(v), 10);
                            handleChange('tipo_hecho_id', valor);
                            console.log('🔍 [Picker] tipo_hecho_id seleccionado:', valor, 'tipo:', typeof valor);
                        }}
                    >
                        <Picker.Item label="Seleccione..." value={null} />
                        {lista.map((item: any) => <Picker.Item key={item.id} label={item.nombre} value={item.id} />)}
                    </Picker>
                </View>
                <TextInput style={styles.input} placeholder="Vehículos Involucrados (Cant)" keyboardType="numeric" value={detalles.vehiculos_involucrados} onChangeText={t => handleChange('vehiculos_involucrados', t)} />
                <TextInput style={styles.input} placeholder="Personas Heridas (Cant)" keyboardType="numeric" value={detalles.heridos} onChangeText={t => handleChange('heridos', t)} />
                <TextInput style={styles.input} placeholder="Fallecidos (Cant)" keyboardType="numeric" value={detalles.fallecidos} onChangeText={t => handleChange('fallecidos', t)} />
            </View>
        );
    }

    // 0.1 ASISTENCIA
    if (formularioTipo === 'ASISTENCIA_VEHICULAR') {
        const lista = auxiliares?.tipos_asistencia || [];
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Tipo de Asistencia</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={detalles.tipo_asistencia_id}
                        onValueChange={(v) => {
                            // Convertir a número si no es vacío, sino null
                            const valor = v === '' || v === null ? null : parseInt(String(v), 10);
                            handleChange('tipo_asistencia_id', valor);
                            console.log('🔍 [Picker] tipo_asistencia_id seleccionado:', valor, 'tipo:', typeof valor);
                        }}
                    >
                        <Picker.Item label="Seleccione..." value={null} />
                        {lista.map((item: any) => <Picker.Item key={item.id} label={item.nombre} value={item.id} />)}
                    </Picker>
                </View>
            </View>
        );
    }

    // 0.2 EMERGENCIA / OBSTACULO
    if (formularioTipo === 'OBSTACULO') {
        const lista = auxiliares?.tipos_emergencia || [];
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Tipo de Emergencia / Obstáculo</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={detalles.tipo_emergencia_id}
                        onValueChange={(v) => {
                            // Convertir a número si no es vacío, sino null
                            const valor = v === '' || v === null ? null : parseInt(String(v), 10);
                            handleChange('tipo_emergencia_id', valor);
                            console.log('🔍 [Picker] tipo_emergencia_id seleccionado:', valor, 'tipo:', typeof valor);
                        }}
                    >
                        <Picker.Item label="Seleccione..." value={null} />
                        {lista.map((item: any) => <Picker.Item key={item.id} label={item.nombre} value={item.id} />)}
                    </Picker>
                </View>
            </View>
        );
    }

    // 1. CONTEO VEHICULAR
    if (situacionNombre === 'Conteo vehicular') {
        const conteos = detalles.conteos || {};
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
        const registros = detalles.velocidades || [];
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Toma de Velocidad</Text>
                <View style={styles.row}>
                    <View style={{ flex: 1, ...styles.pickerContainer, marginBottom: 0 }}>
                        <Picker selectedValue={tipoInput} onValueChange={setTipoInput} style={{ height: 50 }}>
                            {TIPOS_VEHICULO.map(t => <Picker.Item key={t} label={t} value={t} />)}
                        </Picker>
                    </View>
                    <TextInput
                        style={[styles.input, { width: 80, marginBottom: 0 }]}
                        value={velocidadInput}
                        onChangeText={setVelocidadInput}
                        keyboardType="numeric"
                        placeholder="Km/h"
                    />
                    <TouchableOpacity onPress={handleAddVelocidad} style={styles.btnAdd}><Text style={{ color: 'white' }}>+</Text></TouchableOpacity>
                </View>
                <View style={styles.list}>
                    {registros.map((r: any, i: number) => (
                        <Text key={i} style={styles.listItem}>{r.tipo}: {r.velocidad} km/h</Text>
                    ))}
                </View>
            </View>
        );
    }

    // 3. SUPERVISANDO UNIDAD
    if (situacionNombre === 'Supervisando unidad') {
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Unidad Supervisada</Text>
                <View style={styles.pickerContainer}>
                    <Picker selectedValue={detalles.unidad_supervisada_id} onValueChange={v => handleChange('unidad_supervisada_id', v)}>
                        <Picker.Item label="Seleccione unidad..." value="" />
                        {unidades?.map(u => <Picker.Item key={u.id} label={`${u.codigo} ${u.placa || ''}`} value={u.id} />)}
                    </Picker>
                </View>
            </View>
        )
    }

    // 4. ESCOLTANDO CARGA ANCHA
    if (situacionNombre === 'Escoltando carga ancha') {
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Datos Escolta</Text>
                <TextInput style={styles.input} placeholder="Empresa" value={detalles.empresa} onChangeText={t => handleChange('empresa', t)} />
                <TextInput style={styles.input} placeholder="Nombre Piloto" value={detalles.piloto} onChangeText={t => handleChange('piloto', t)} />
                <TextInput style={styles.input} placeholder="Datos Vehículo" value={detalles.vehiculo_datos} onChangeText={t => handleChange('vehiculo_datos', t)} />
                <TextInput style={styles.input} placeholder="Motivo" value={detalles.motivo} onChangeText={t => handleChange('motivo', t)} />
                <TextInput style={styles.input} placeholder="Punto Inicio (Coords/Ref)" value={detalles.punto_inicio} onChangeText={t => handleChange('punto_inicio', t)} />
                <TextInput style={styles.input} placeholder="Punto Fin (Coords/Ref)" value={detalles.punto_fin} onChangeText={t => handleChange('punto_fin', t)} />
            </View>
        )
    }

    // 5. OPERATIVOS
    if (situacionNombre.includes('Operativo') || situacionNombre === 'Puesto de Control') {
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Operativo</Text>
                <TextInput style={styles.input} placeholder="Vehículos Registrados (Cant)" keyboardType="numeric" value={detalles.registrados} onChangeText={t => handleChange('registrados', t)} />
                <TextInput style={styles.input} placeholder="Sanciones Impuestas (Cant)" keyboardType="numeric" value={detalles.sanciones} onChangeText={t => handleChange('sanciones', t)} />
                <TextInput style={styles.input} placeholder="Autoridad presente" value={detalles.autoridad} onChangeText={t => handleChange('autoridad', t)} />

                <Text style={[styles.title, { fontSize: 14, marginTop: 10 }]}>Llamadas de Atención</Text>
                <View style={styles.row}>
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder="Motivo" value={llamadaOp.motivo} onChangeText={t => setLlamadaOp({ ...llamadaOp, motivo: t })} />
                </View>
                <View style={styles.row}>
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder="Piloto" value={llamadaOp.piloto} onChangeText={t => setLlamadaOp({ ...llamadaOp, piloto: t })} />
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder="Vehículo" value={llamadaOp.vehiculo} onChangeText={t => setLlamadaOp({ ...llamadaOp, vehiculo: t })} />
                </View>
                <TouchableOpacity onPress={handleAddLlamada} style={[styles.btnAdd, { marginTop: 0 }]}><Text style={{ color: 'white' }}>Agregar Llamada</Text></TouchableOpacity>
                <View style={{ marginTop: 10 }}>
                    {(detalles.llamadas_detalles || []).map((l: any, i: number) => (
                        <Text key={i} style={styles.listItem}>- {l.motivo} ({l.piloto})</Text>
                    ))}
                </View>
            </View>
        )
    }

    // 6. CONSIGNACION
    if (situacionNombre === 'Consignación') {
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Consignación</Text>
                <TextInput style={styles.input} placeholder="Motivo Consignación" value={detalles.motivo} onChangeText={t => handleChange('motivo', t)} />
                <View style={styles.pickerContainer}>
                    <Picker selectedValue={detalles.tipo_consignacion} onValueChange={v => handleChange('tipo_consignacion', v)}>
                        <Picker.Item label="¿Qué se consigna?" value="" />
                        <Picker.Item label="Vehículo" value="VEHICULO" />
                        <Picker.Item label="Piloto" value="PILOTO" />
                        <Picker.Item label="Ambos" value="AMBOS" />
                    </Picker>
                </View>
                <TextInput style={styles.input} placeholder="Datos Piloto" value={detalles.piloto} onChangeText={t => handleChange('piloto', t)} />
                <TextInput style={styles.input} placeholder="Datos Vehículo" value={detalles.vehiculo} onChangeText={t => handleChange('vehiculo', t)} />
                <TextInput style={styles.input} placeholder="Autoridad Presente" value={detalles.autoridad} onChangeText={t => handleChange('autoridad', t)} />
                <TextInput style={styles.input} placeholder="Destino Traslado" value={detalles.destino} onChangeText={t => handleChange('destino', t)} />
            </View>
        )
    }

    // 7. FALLA MECANICA
    if (situacionNombre === 'Falla Mecánica de unidad') {
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Falla Mecánica</Text>
                <TextInput style={styles.input} placeholder="Tipo de falla" value={detalles.tipo_falla} onChangeText={t => handleChange('tipo_falla', t)} />
                <View style={styles.row}>
                    <Text style={{ alignSelf: 'center' }}>Requiere Grúa?</Text>
                    <View style={{ ...styles.pickerContainer, flex: 1, marginBottom: 0 }}>
                        <Picker selectedValue={detalles.requiere_grua} onValueChange={(v) => handleChange('requiere_grua', v)}>
                            <Picker.Item label="No" value="No" />
                            <Picker.Item label="Sí" value="Sí" />
                        </Picker>
                    </View>
                </View>
                <TouchableOpacity style={styles.btnAdd}><Text style={{ color: 'white' }}>Adjuntar Foto (Pendiente)</Text></TouchableOpacity>
            </View>
        )
    }

    // 8. COMIDA
    if (situacionNombre === 'Comida') {
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Tiempo de Comida</Text>
                <View style={styles.pickerContainer}>
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

    // 9. APOYO (General)
    if (situacionNombre.startsWith('Apoyo')) {
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Datos de Apoyo</Text>
                <TextInput style={styles.input} placeholder="Institución / Encargado" value={detalles.institucion} onChangeText={t => handleChange('institucion', t)} />
                <TextInput style={styles.input} placeholder="Punto Inicio" value={detalles.punto_inicio} onChangeText={t => handleChange('punto_inicio', t)} />
                <TextInput style={styles.input} placeholder="Punto Finalización" value={detalles.punto_fin} onChangeText={t => handleChange('punto_fin', t)} />
                <TextInput style={styles.input} placeholder="Puntos Regulación" value={detalles.puntos_regulacion} onChangeText={t => handleChange('puntos_regulacion', t)} />
            </View>
        )
    }

    // 10. REGULACION / REVERSIBLE
    if (situacionNombre === 'Regulación de Tráfico' || situacionNombre.includes('Reversible')) {
        return (
            <View style={styles.section}>
                <Text style={styles.title}>Regulación de Tráfico</Text>
                <TextInput style={styles.input} placeholder="Instrucción / Motivo" value={detalles.motivo} onChangeText={t => handleChange('motivo', t)} />
            </View>
        )
    }

    // 11. HOSPITAL / ENFERMO
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

    // 12. ABASTECIMIENTO
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

    return null;
}

const styles = StyleSheet.create({
    section: { marginBottom: 15, backgroundColor: '#f9fafb', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
    title: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#374151' },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 5, color: '#4b5563' },
    input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, padding: 8, marginBottom: 8 },
    row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    pickerContainer: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, backgroundColor: 'white', marginBottom: 8 },
    btnAdd: { backgroundColor: COLORS.primary, padding: 8, borderRadius: 6, alignItems: 'center', marginTop: 5 },
    list: { marginTop: 10 },
    listItem: { padding: 5, borderBottomWidth: 1, borderBottomColor: '#eee', fontSize: 14 },
    conteoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    conteoLabel: { fontSize: 14, color: '#374151', flex: 1 },
    conteoControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    conteoValue: { width: 30, textAlign: 'center', fontWeight: 'bold' },
    btn: { width: 30, height: 30, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center', borderRadius: 15 },
    btnMinus: { backgroundColor: '#fee2e2' },
    btnPlus: { backgroundColor: '#dcfce7' },
    totalRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#ccc', alignItems: 'flex-end' },
    totalLabel: { fontWeight: 'bold', fontSize: 16 }
});
