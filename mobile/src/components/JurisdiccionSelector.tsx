import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { DEPARTAMENTOS, MUNICIPIOS_MOCK } from '../constants/geografia';

interface Props {
    deptoId: number | null;
    setDeptoId: (id: number | null) => void;
    muniId: number | null;
    setMuniId: (id: number | null) => void;
}

export default function JurisdiccionSelector({ deptoId, setDeptoId, muniId, setMuniId }: Props) {
    const municipios = deptoId ? (MUNICIPIOS_MOCK[deptoId.toString()] || []) : [];

    return (
        <View style={styles.container}>
            <View style={styles.field}>
                <Text style={styles.label}>Departamento</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={deptoId}
                        onValueChange={(val) => {
                            setDeptoId(val);
                            setMuniId(null);
                        }}
                        style={styles.picker}
                    >
                        <Picker.Item label="Seleccione..." value={null} />
                        {DEPARTAMENTOS.map(d => <Picker.Item key={d.id} label={d.nombre} value={d.id} />)}
                    </Picker>
                </View>
            </View>
            <View style={styles.field}>
                <Text style={styles.label}>Municipio</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={muniId}
                        onValueChange={setMuniId}
                        enabled={municipios.length > 0}
                        style={[styles.picker, !deptoId && { opacity: 0.5 }]}
                    >
                        <Picker.Item label="Seleccione..." value={null} />
                        {municipios.map(m => <Picker.Item key={m.id} label={m.nombre} value={m.id} />)}
                    </Picker>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flexDirection: 'row', gap: 10, marginVertical: 10 },
    field: { flex: 1 },
    label: { fontSize: 12, fontWeight: 'bold', marginBottom: 4, color: '#666' },
    pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: 'white', overflow: 'hidden' },
    picker: { height: 50, width: '100%' }
});
