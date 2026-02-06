import React from 'react';
import { View, StyleSheet } from 'react-native';
import CrossPlatformPicker from './CrossPlatformPicker';
import { CLIMA_OPCIONES, CARGA_VEHICULAR_OPCIONES } from '../constants/geografia';

interface Props {
    clima: string;
    setClima: (v: string) => void;
    carga: string;
    setCarga: (v: string) => void;
}

export default function ClimaCargaSelector({ clima, setClima, carga, setCarga }: Props) {
    const climaOptions = CLIMA_OPCIONES.map(op => ({ label: op, value: op }));
    const cargaOptions = CARGA_VEHICULAR_OPCIONES.map(op => ({ label: op, value: op }));

    return (
        <View style={styles.container}>
            <View style={styles.field}>
                <CrossPlatformPicker
                    label="Clima"
                    selectedValue={clima || null}
                    onValueChange={(v) => setClima(v || '')}
                    options={climaOptions}
                    placeholder="Seleccione..."
                />
            </View>
            <View style={styles.field}>
                <CrossPlatformPicker
                    label="Carga Vehicular"
                    selectedValue={carga || null}
                    onValueChange={(v) => setCarga(v || '')}
                    options={cargaOptions}
                    placeholder="Seleccione..."
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flexDirection: 'row', gap: 10, marginVertical: 10 },
    field: { flex: 1 },
});
