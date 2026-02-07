import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CrossPlatformPicker from './CrossPlatformPicker';

interface Props {
    detalles: any;
    setDetalles: (d: any) => void;
}

const VIA_ESTADO = [
    { label: 'Bueno', value: 'BUENO' },
    { label: 'Regular', value: 'REGULAR' },
    { label: 'Malo', value: 'MALO' },
];

const VIA_TOPOGRAFIA = [
    { label: 'Plano', value: 'PLANO' },
    { label: 'Ondulado', value: 'ONDULADO' },
    { label: 'Montañoso', value: 'MONTANOSO' },
];

const VIA_GEOMETRIA = [
    { label: 'Recta', value: 'RECTA' },
    { label: 'Curva', value: 'CURVA' },
    { label: 'Intersección', value: 'INTERSECCION' },
];

const VIA_PERALTE = [
    { label: 'Adecuado', value: 'ADECUADO' },
    { label: 'Inadecuado', value: 'INADECUADO' },
    { label: 'Inexistente', value: 'INEXISTENTE' },
];

const VIA_CONDICION = [
    { label: 'Seco', value: 'SECO' },
    { label: 'Mojado', value: 'MOJADO' },
    { label: 'Con Aceite', value: 'CON_ACEITE' },
    { label: 'Con Arena', value: 'CON_ARENA' },
];

export default function CondicionesVia({ detalles, setDetalles }: Props) {
    const handleChange = (field: string, value: any) => {
        setDetalles({ ...detalles, [field]: value });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Condiciones de la Vía</Text>

            <CrossPlatformPicker
                label="Estado de la Vía"
                selectedValue={detalles.via_estado}
                onValueChange={(v) => handleChange('via_estado', v)}
                options={VIA_ESTADO}
                placeholder="Seleccione..."
            />

            <CrossPlatformPicker
                label="Topografía"
                selectedValue={detalles.via_topografia}
                onValueChange={(v) => handleChange('via_topografia', v)}
                options={VIA_TOPOGRAFIA}
                placeholder="Seleccione..."
            />

            <CrossPlatformPicker
                label="Geometría"
                selectedValue={detalles.via_geometria}
                onValueChange={(v) => handleChange('via_geometria', v)}
                options={VIA_GEOMETRIA}
                placeholder="Seleccione..."
            />

            <CrossPlatformPicker
                label="Peralte"
                selectedValue={detalles.via_peralte}
                onValueChange={(v) => handleChange('via_peralte', v)}
                options={VIA_PERALTE}
                placeholder="Seleccione..."
            />

            <CrossPlatformPicker
                label="Condición de Superficie"
                selectedValue={detalles.via_condicion}
                onValueChange={(v) => handleChange('via_condicion', v)}
                options={VIA_CONDICION}
                placeholder="Seleccione..."
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        elevation: 2,
    },
    title: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#444' },
});
