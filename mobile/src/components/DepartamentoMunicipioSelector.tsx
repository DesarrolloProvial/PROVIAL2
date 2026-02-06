import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CrossPlatformPicker from './CrossPlatformPicker';
import { DEPARTAMENTOS, getMunicipios } from '../data/geografia';

interface Props {
  departamentoValue?: number;
  municipioValue?: number;
  onDepartamentoChange: (departamentoId: number | undefined) => void;
  onMunicipioChange: (municipioId: number | undefined) => void;
  departamentoLabel?: string;
  municipioLabel?: string;
  required?: boolean;
}

export const DepartamentoMunicipioSelector: React.FC<Props> = ({
  departamentoValue,
  municipioValue,
  onDepartamentoChange,
  onMunicipioChange,
  departamentoLabel = 'Departamento',
  municipioLabel = 'Municipio',
  required = false,
}) => {
  const departamentoOptions = useMemo(() =>
    DEPARTAMENTOS.map(depto => ({
      label: depto.nombre,
      value: depto.id,
    })),
  []);

  const municipioOptions = useMemo(() => {
    if (!departamentoValue) return [];
    return getMunicipios(departamentoValue).map(muni => ({
      label: muni.nombre,
      value: muni.id,
    }));
  }, [departamentoValue]);

  const handleDepartamentoChange = (value: any) => {
    if (value === null || value === '') {
      onDepartamentoChange(undefined);
      onMunicipioChange(undefined);
    } else {
      const id = typeof value === 'number' ? value : parseInt(value, 10);
      onDepartamentoChange(id);
      onMunicipioChange(undefined);
    }
  };

  const handleMunicipioChange = (value: any) => {
    if (value === null || value === '') {
      onMunicipioChange(undefined);
    } else {
      onMunicipioChange(typeof value === 'number' ? value : parseInt(value, 10));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.selectorContainer}>
        <CrossPlatformPicker
          label={departamentoLabel}
          required={required}
          selectedValue={departamentoValue || null}
          onValueChange={handleDepartamentoChange}
          options={departamentoOptions}
          placeholder="Seleccionar departamento..."
        />
      </View>

      {departamentoValue && (
        <View style={styles.selectorContainer}>
          {municipioOptions.length > 0 ? (
            <CrossPlatformPicker
              label={municipioLabel}
              required={required}
              selectedValue={municipioValue || null}
              onValueChange={handleMunicipioChange}
              options={municipioOptions}
              placeholder="Seleccionar municipio..."
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay municipios disponibles</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  selectorContainer: {
    marginBottom: 10,
  },
  emptyContainer: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
