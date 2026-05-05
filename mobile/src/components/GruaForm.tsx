import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Controller, Control, useWatch } from 'react-hook-form';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../core/theme';
import CrossPlatformPicker from './CrossPlatformPicker';

interface GruaFormProps {
  control: Control<any>;
  index: number;
  onRemove: () => void;
}

export const GruaForm: React.FC<GruaFormProps> = ({ control, index, onRemove }) => {
  const theme = useTheme();
  const c = theme.colors;

  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    datosGrua: true,
    traslado: false,
  });

  const realizoTraslado = useWatch({ control, name: `gruas.${index}.traslado` });
  const vehiculos = useWatch({ control, name: 'vehiculos' }) || [];

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const inputStyle = [
    styles.input,
    { borderColor: c.border, backgroundColor: c.surface, color: c.text.primary },
  ];

  return (
    <View style={[styles.container, { borderColor: c.border, backgroundColor: c.surface }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.text.primary }]}>Grúa {index + 1}</Text>
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <Text style={[styles.removeBtnText, { color: c.danger }]}>Eliminar</Text>
        </TouchableOpacity>
      </View>

      {/* Accordion: Datos de Grúa */}
      <TouchableOpacity
        style={[styles.accordionHeader, { backgroundColor: c.background, borderColor: c.border }]}
        onPress={() => toggleSection('datosGrua')}
        activeOpacity={0.7}
      >
        <Text style={[styles.accordionTitle, { color: c.text.primary }]}>Datos de Grúa</Text>
        <MaterialCommunityIcons
          name={expandedSections.datosGrua ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={c.text.secondary}
        />
      </TouchableOpacity>

      {expandedSections.datosGrua && (
        <View style={[styles.section, { backgroundColor: c.surface }]}>
          {vehiculos.length > 0 && (
            <Controller
              control={control}
              name={`gruas.${index}.vehiculo_index`}
              render={({ field: { onChange, value } }) => (
                <CrossPlatformPicker
                  label="Vehículo Asociado"
                  selectedValue={value ?? ''}
                  onValueChange={onChange}
                  placeholder="Ninguno / General"
                  options={vehiculos.map((v: any, idx: number) => ({
                    label: `Vehículo ${idx + 1} - ${v.placa || 'Sin placa'} (${v.marca || 'Marca?'})`,
                    value: idx.toString(),
                  }))}
                />
              )}
            />
          )}

          <Controller
            control={control}
            name={`gruas.${index}.empresa`}
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Empresa</Text>
                <TextInput
                  value={value || ''}
                  onChangeText={onChange}
                  style={inputStyle}
                  placeholderTextColor={c.text.disabled}
                  placeholder="Nombre de la empresa"
                />
              </View>
            )}
          />

          <Controller
            control={control}
            name={`gruas.${index}.placa`}
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Placa Grúa</Text>
                <TextInput
                  value={value || ''}
                  onChangeText={onChange}
                  style={inputStyle}
                  autoCapitalize="characters"
                  placeholderTextColor={c.text.disabled}
                  placeholder="Ej: 123ABC"
                />
              </View>
            )}
          />

          <Controller
            control={control}
            name={`gruas.${index}.tipo`}
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Tipo de Grúa</Text>
                <TextInput
                  value={value || ''}
                  onChangeText={onChange}
                  style={inputStyle}
                  placeholderTextColor={c.text.disabled}
                  placeholder="Ej: Plataforma, Gancho"
                />
              </View>
            )}
          />

          <Controller
            control={control}
            name={`gruas.${index}.piloto`}
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Nombre del Operador</Text>
                <TextInput
                  value={value || ''}
                  onChangeText={onChange}
                  style={inputStyle}
                  placeholderTextColor={c.text.disabled}
                  placeholder="Nombre completo"
                />
              </View>
            )}
          />
        </View>
      )}

      {/* Switch: ¿Realizó traslado? */}
      <View style={[styles.switchRow, { backgroundColor: c.background, borderColor: c.border }]}>
        <Text style={[styles.switchLabel, { color: c.text.primary }]}>¿Realizó traslado?</Text>
        <Controller
          control={control}
          name={`gruas.${index}.traslado`}
          render={({ field: { onChange, value } }) => (
            <Switch
              value={value || false}
              onValueChange={onChange}
              trackColor={{ false: c.gray[200], true: c.primary + '80' }}
              thumbColor={value ? c.primary : c.gray[400]}
            />
          )}
        />
      </View>

      {/* Accordion: Datos de Traslado (condicional) */}
      {realizoTraslado && (
        <>
          <TouchableOpacity
            style={[styles.accordionHeader, { backgroundColor: c.background, borderColor: c.border }]}
            onPress={() => toggleSection('traslado')}
            activeOpacity={0.7}
          >
            <Text style={[styles.accordionTitle, { color: c.text.primary }]}>Datos de Traslado</Text>
            <MaterialCommunityIcons
              name={expandedSections.traslado ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={c.text.secondary}
            />
          </TouchableOpacity>

          {expandedSections.traslado && (
            <View style={[styles.section, { backgroundColor: c.surface }]}>
              <Controller
                control={control}
                name={`gruas.${index}.traslado_a`}
                render={({ field: { onChange, value } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Lugar de Traslado</Text>
                    <TextInput
                      value={value || ''}
                      onChangeText={onChange}
                      style={[inputStyle, { minHeight: 72, textAlignVertical: 'top' }]}
                      multiline
                      numberOfLines={2}
                      placeholderTextColor={c.text.disabled}
                      placeholder="Ej: Parqueo municipal, Taller XYZ"
                    />
                  </View>
                )}
              />

              <Controller
                control={control}
                name={`gruas.${index}.costo_traslado`}
                render={({ field: { onChange, value } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Costo de Traslado (Q)</Text>
                    <TextInput
                      value={value?.toString() || ''}
                      onChangeText={(text) => onChange(parseFloat(text) || 0)}
                      style={inputStyle}
                      keyboardType="decimal-pad"
                      placeholderTextColor={c.text.disabled}
                      placeholder="0.00"
                    />
                  </View>
                )}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  removeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  removeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
});
