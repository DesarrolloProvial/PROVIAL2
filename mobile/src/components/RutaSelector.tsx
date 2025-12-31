import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { COLORS } from '../constants/colors';
import { geografiaAPI } from '../services/api';

interface Ruta {
  id: number;
  codigo: string;
  nombre: string;
  tipo_ruta?: string;
}

interface Props {
  value?: number;
  onChange: (rutaId: number) => void;
  label?: string;
  required?: boolean;
  showSearch?: boolean;
}

export default function RutaSelector({ value, onChange, label = 'Ruta', required = false, showSearch = false }: Props) {
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadRutas();
  }, []);

  const loadRutas = async () => {
    try {
      setLoading(true);
      console.log('[RutaSelector] Cargando rutas...');
      const data = await geografiaAPI.getRutas();
      console.log('[RutaSelector] Rutas cargadas:', data.length);
      setRutas(data);
    } catch (error: any) {
      console.error('[RutaSelector] Error al cargar rutas:', error);
      console.error('[RutaSelector] Error response:', error.response?.data);
      console.error('[RutaSelector] Error status:', error.response?.status);

      // Show user-friendly error
      if (error.response?.status === 401) {
        console.error('[RutaSelector] Error 401 - Token inválido o expirado');
      }
    } finally {
      setLoading(false);
    }
  };

  // Filtrar rutas según el texto de búsqueda
  const rutasFiltradas = useMemo(() => {
    if (!searchText.trim()) return rutas;
    const searchLower = searchText.toLowerCase().trim();
    return rutas.filter(
      (ruta) =>
        ruta.codigo.toLowerCase().includes(searchLower) ||
        ruta.nombre.toLowerCase().includes(searchLower)
    );
  }, [rutas, searchText]);

  // Obtener la ruta seleccionada para mostrar info
  const rutaSeleccionada = useMemo(() => {
    return rutas.find((r) => r.id === value);
  }, [rutas, value]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando rutas...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      {/* Mostrar ruta seleccionada actual */}
      {rutaSeleccionada && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedLabel}>Seleccionada:</Text>
          <Text style={styles.selectedValue}>{rutaSeleccionada.codigo} - {rutaSeleccionada.nombre}</Text>
        </View>
      )}

      {/* Campo de búsqueda */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar ruta por código o nombre..."
            placeholderTextColor={COLORS.text.disabled}
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchText('')}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Contador de resultados */}
      {showSearch && searchText.trim() && (
        <Text style={styles.resultCount}>
          {rutasFiltradas.length} ruta{rutasFiltradas.length !== 1 ? 's' : ''} encontrada{rutasFiltradas.length !== 1 ? 's' : ''}
        </Text>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {rutasFiltradas.map((ruta) => {
          const isSelected = value === ruta.id;

          return (
            <TouchableOpacity
              key={ruta.id}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
              ]}
              onPress={() => onChange(ruta.id)}
            >
              <Text
                style={[
                  styles.optionCodigo,
                  isSelected && styles.optionCodigoSelected,
                ]}
              >
                {ruta.codigo}
              </Text>
              <Text
                style={[
                  styles.optionNombre,
                  isSelected && styles.optionNombreSelected,
                ]}
                numberOfLines={1}
              >
                {ruta.nombre}
              </Text>
            </TouchableOpacity>
          );
        })}
        {rutasFiltradas.length === 0 && searchText.trim() && (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>No se encontraron rutas</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  required: {
    color: COLORS.danger,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '20',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  selectedLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginRight: 4,
  },
  selectedValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  clearButtonText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  resultCount: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  scrollContent: {
    gap: 8,
    paddingHorizontal: 2,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 8,
    minWidth: 120,
  },
  optionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionCodigo: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  optionCodigoSelected: {
    color: COLORS.white,
  },
  optionNombre: {
    fontSize: 11,
    color: COLORS.text.secondary,
  },
  optionNombreSelected: {
    color: COLORS.white,
    opacity: 0.9,
  },
  noResultsContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
});
