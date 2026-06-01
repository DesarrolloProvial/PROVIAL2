import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import CrossPlatformPicker from './CrossPlatformPicker';
import { catalogoStorage } from '../core/storage/catalogoStorage';

interface Option { label: string; value: number; }

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
  const [departamentos, setDepartamentos] = useState<Option[]>([]);
  const [municipios, setMunicipios] = useState<Option[]>([]);
  const [loadingDeptos, setLoadingDeptos] = useState(true);
  const [loadingMunis, setLoadingMunis] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await catalogoStorage.init();
        const deptos = await catalogoStorage.getDepartamentos();
        setDepartamentos(deptos.map(d => ({ label: d.nombre, value: d.id })));
      } catch {
        setDepartamentos([]);
      } finally {
        setLoadingDeptos(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!departamentoValue) {
      setMunicipios([]);
      return;
    }
    setLoadingMunis(true);
    (async () => {
      try {
        await catalogoStorage.init();
        const munis = await catalogoStorage.getMunicipiosByDepartamento(departamentoValue);
        setMunicipios(munis.map(m => ({ label: m.nombre, value: m.id })));
      } catch {
        setMunicipios([]);
      } finally {
        setLoadingMunis(false);
      }
    })();
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
        {loadingDeptos ? (
          <ActivityIndicator size="small" />
        ) : (
          <CrossPlatformPicker
            label={departamentoLabel}
            required={required}
            selectedValue={departamentoValue || null}
            onValueChange={handleDepartamentoChange}
            options={departamentos}
            placeholder="Seleccionar departamento..."
          />
        )}
      </View>

      {departamentoValue && (
        <View style={styles.selectorContainer}>
          {loadingMunis ? (
            <ActivityIndicator size="small" />
          ) : municipios.length > 0 ? (
            <CrossPlatformPicker
              label={municipioLabel}
              required={required}
              selectedValue={municipioValue || null}
              onValueChange={handleMunicipioChange}
              options={municipios}
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
