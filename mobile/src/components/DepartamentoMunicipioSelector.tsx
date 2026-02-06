import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import CrossPlatformPicker from './CrossPlatformPicker';
import { geografiaAPI } from '../services/api';

interface Departamento {
  id: number;
  codigo: string;
  nombre: string;
}

interface Municipio {
  id: number;
  codigo: string;
  nombre: string;
  departamento_id: number;
}

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
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loadingDepartamentos, setLoadingDepartamentos] = useState(true);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);

  useEffect(() => {
    loadDepartamentos();
  }, []);

  useEffect(() => {
    if (departamentoValue) {
      loadMunicipios(departamentoValue);
    } else {
      setMunicipios([]);
      onMunicipioChange(undefined);
    }
  }, [departamentoValue]);

  const loadDepartamentos = async () => {
    try {
      setLoadingDepartamentos(true);
      const data = await geografiaAPI.getDepartamentos();
      setDepartamentos(data);
    } catch (error) {
      console.error('[DepartamentoMunicipioSelector] Error al cargar departamentos:', error);
    } finally {
      setLoadingDepartamentos(false);
    }
  };

  const loadMunicipios = async (departamentoId: number) => {
    try {
      setLoadingMunicipios(true);
      const data = await geografiaAPI.getMunicipiosPorDepartamento(departamentoId);
      setMunicipios(data);
    } catch (error) {
      console.error('[DepartamentoMunicipioSelector] Error al cargar municipios:', error);
      setMunicipios([]);
    } finally {
      setLoadingMunicipios(false);
    }
  };

  const handleDepartamentoChange = (value: any) => {
    if (value === null || value === '') {
      onDepartamentoChange(undefined);
    } else {
      onDepartamentoChange(typeof value === 'number' ? value : parseInt(value, 10));
    }
  };

  const handleMunicipioChange = (value: any) => {
    if (value === null || value === '') {
      onMunicipioChange(undefined);
    } else {
      onMunicipioChange(typeof value === 'number' ? value : parseInt(value, 10));
    }
  };

  const departamentoOptions = departamentos.map(depto => ({
    label: depto.nombre,
    value: depto.id,
  }));

  const municipioOptions = municipios.map(muni => ({
    label: muni.nombre,
    value: muni.id,
  }));

  return (
    <View style={styles.container}>
      {/* Selector de Departamento */}
      <View style={styles.selectorContainer}>
        {loadingDepartamentos ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" />
            <Text style={styles.loadingText}>Cargando departamentos...</Text>
          </View>
        ) : (
          <CrossPlatformPicker
            label={departamentoLabel}
            required={required}
            selectedValue={departamentoValue || null}
            onValueChange={handleDepartamentoChange}
            options={departamentoOptions}
            placeholder="Seleccionar departamento..."
          />
        )}
      </View>

      {/* Selector de Municipio (solo visible si hay departamento seleccionado) */}
      {departamentoValue && (
        <View style={styles.selectorContainer}>
          {loadingMunicipios ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" />
              <Text style={styles.loadingText}>Cargando municipios...</Text>
            </View>
          ) : municipios.length > 0 ? (
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
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
