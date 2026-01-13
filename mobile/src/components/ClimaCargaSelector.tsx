import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { CLIMA_OPCIONES, CARGA_VEHICULAR_OPCIONES } from '../constants/geografia';
import { COLORS } from '../constants/colors';

interface Props {
    clima: string;
    setClima: (v: string) => void;
    carga: string;
    setCarga: (v: string) => void;
}

export default function ClimaCargaSelector({ clima, setClima, carga, setCarga }: Props) {
    return (
        <View style={styles.container}>
            <View style={styles.field}>
                <Text style={styles.label}>Clima</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={clima}
                        onValueChange={setClima}
                        style={styles.picker}
                    >
                        <Picker.Item label="Seleccione..." value="" />
                        {CLIMA_OPCIONES.map(op => <Picker.Item key={op} label={op} value={op} />)}
                    </Picker>
                </View>
            </View>
            <View style={styles.field}>
                <Text style={styles.label}>Carga Vehicular</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={carga}
                        onValueChange={setCarga}
                        style={styles.picker}
                    >
                        <Picker.Item label="Seleccione..." value="" />
                        {CARGA_VEHICULAR_OPCIONES.map(op => <Picker.Item key={op} label={op} value={op} />)}
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
