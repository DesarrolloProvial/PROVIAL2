import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Controller, Control } from 'react-hook-form';
import { Checkbox } from 'react-native-paper';
import { catalogoStorage, CatalogoDispositivoSeguridad } from '../core/storage/catalogoStorage';
import { syncCatalogosAuxiliares } from '../services/catalogSync';

interface Props {
    control: Control<any>;
    vehiculoIndex: number;
}

const ESTADO_OPTIONS = ['FUNCIONANDO', 'DANADO', 'NO_APLICA'] as const;
const ESTADO_LABELS: Record<string, string> = {
    FUNCIONANDO: 'OK',
    DANADO: 'Dañado',
    NO_APLICA: 'N/A',
};

export default function DispositivosSeguridad({ control, vehiculoIndex }: Props) {
    const [catalogo, setCatalogo] = useState<CatalogoDispositivoSeguridad[]>([]);

    useEffect(() => {
        const load = async () => {
            await catalogoStorage.init().catch(() => {});
            let items = await catalogoStorage.getDispositivosSeguridad().catch(() => [] as CatalogoDispositivoSeguridad[]);
            if (!items || items.length === 0) {
                // Intentar sincronizar desde el backend
                await syncCatalogosAuxiliares().catch(() => {});
                items = await catalogoStorage.getDispositivosSeguridad().catch(() => [] as CatalogoDispositivoSeguridad[]);
            }
            if (items && items.length > 0) setCatalogo(items);
        };
        load();
    }, []);

    if (catalogo.length === 0) {
        return <Text style={styles.loading}>Sin dispositivos (sincronice catálogos)</Text>;
    }

    return (
        <Controller
            control={control}
            name={`vehiculos.${vehiculoIndex}.dispositivos`}
            defaultValue={[]}
            render={({ field: { onChange, value } }) => {
                const selected: { id: number; estado: string }[] = Array.isArray(value) ? value : [];

                const toggle = (dispositivo: CatalogoDispositivoSeguridad) => {
                    const existing = selected.find(d => d.id === dispositivo.id);
                    if (existing) {
                        onChange(selected.filter(d => d.id !== dispositivo.id));
                    } else {
                        onChange([...selected, { id: dispositivo.id, estado: 'FUNCIONANDO' }]);
                    }
                };

                const changeEstado = (id: number, estado: string) => {
                    onChange(selected.map(d => d.id === id ? { ...d, estado } : d));
                };

                return (
                    <View>
                        {catalogo.map((disp) => {
                            const item = selected.find(d => d.id === disp.id);
                            const isChecked = !!item;

                            return (
                                <View key={disp.id} style={styles.row}>
                                    <Checkbox
                                        status={isChecked ? 'checked' : 'unchecked'}
                                        onPress={() => toggle(disp)}
                                    />
                                    <Text style={[styles.name, isChecked && styles.nameActive]}>{disp.nombre}</Text>
                                    {isChecked && (
                                        <View style={styles.estadoContainer}>
                                            {ESTADO_OPTIONS.map(est => (
                                                <TouchableOpacity
                                                    key={est}
                                                    onPress={() => changeEstado(disp.id, est)}
                                                    style={[
                                                        styles.estadoChip,
                                                        item?.estado === est && styles.estadoChipActive,
                                                    ]}
                                                >
                                                    <Text style={[
                                                        styles.estadoChipText,
                                                        item?.estado === est && styles.estadoChipTextActive,
                                                    ]}>
                                                        {ESTADO_LABELS[est]}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                );
            }}
        />
    );
}

const styles = StyleSheet.create({
    loading: { color: '#999', fontSize: 13, padding: 10 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        flexWrap: 'wrap',
    },
    name: { flex: 1, fontSize: 14, color: '#555' },
    nameActive: { color: '#111', fontWeight: '500' },
    estadoContainer: { flexDirection: 'row', gap: 4, marginLeft: 8 },
    estadoChip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        backgroundColor: '#e5e7eb',
    },
    estadoChipActive: {
        backgroundColor: '#1e40af',
    },
    estadoChipText: {
        fontSize: 11,
        color: '#555',
    },
    estadoChipTextActive: {
        color: '#fff',
    },
});
