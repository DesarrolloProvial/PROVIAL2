import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Checkbox } from 'react-native-paper';
import { catalogoStorage, CatalogoCausaHecho } from '../core/storage/catalogoStorage';

interface Props {
    value: number[];
    onChange: (ids: number[]) => void;
}

export default function CausasSelector({ value, onChange }: Props) {
    const [causas, setCausas] = useState<CatalogoCausaHecho[]>([]);

    useEffect(() => {
        catalogoStorage.init().then(() => {
            catalogoStorage.getCausasHecho().then(items => {
                if (items && items.length > 0) setCausas(items);
            }).catch(() => {});
        }).catch(() => {});
    }, []);

    const selected = Array.isArray(value) ? value : [];

    const toggle = (id: number) => {
        if (selected.includes(id)) {
            onChange(selected.filter(v => v !== id));
        } else {
            onChange([...selected, id]);
        }
    };

    if (causas.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Causas del Hecho</Text>
                <Text style={styles.loading}>Sin causas (sincronice catálogos)</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Causas del Hecho</Text>
            <Text style={styles.subtitle}>Seleccione una o más causas</Text>
            {causas.map((causa) => {
                const isChecked = selected.includes(causa.id);
                return (
                    <View key={causa.id} style={styles.row}>
                        <Checkbox
                            status={isChecked ? 'checked' : 'unchecked'}
                            onPress={() => toggle(causa.id)}
                        />
                        <Text
                            style={[styles.label, isChecked && styles.labelActive]}
                            onPress={() => toggle(causa.id)}
                        >
                            {causa.nombre}
                        </Text>
                    </View>
                );
            })}
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
    title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, color: '#444' },
    subtitle: { fontSize: 12, color: '#888', marginBottom: 10 },
    loading: { color: '#999', fontSize: 13, padding: 10 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 2,
    },
    label: { flex: 1, fontSize: 14, color: '#555' },
    labelActive: { color: '#111', fontWeight: '500' },
});
