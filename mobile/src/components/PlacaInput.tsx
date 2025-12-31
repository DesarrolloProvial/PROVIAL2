import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { TextInput, Checkbox, HelperText, Card, IconButton } from 'react-native-paper';
import { api } from '../services/api';

/**
 * Formato de placa Guatemala: L###LLL
 * Ejemplo: P512KJF, C589SJY
 */
const PLACA_REGEX = /^[A-Z]\d{3}[A-Z]{3}$/;

interface VehiculoReincidente {
  id: number;
  placa: string;
  total_incidentes: number;
  nivel_riesgo: number;
  dias_desde_ultimo_incidente: number;
  tipo_vehiculo: string;
  marca: string;
  color: string;
}

interface PlacaInputProps {
  value: string;
  onChange: (value: string) => void;
  esExtranjero?: boolean;
  onExtranjeroChange?: (value: boolean) => void;
  label?: string;
  error?: string;
}

export const PlacaInput: React.FC<PlacaInputProps> = ({
  value,
  onChange,
  esExtranjero = false,
  onExtranjeroChange,
  label = 'Placa',
  error
}) => {
  const [localExtranjero, setLocalExtranjero] = useState(esExtranjero);
  const [vehiculoInfo, setVehiculoInfo] = useState<VehiculoReincidente | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [alertaVisible, setAlertaVisible] = useState(false);

  useEffect(() => {
    setLocalExtranjero(esExtranjero);
  }, [esExtranjero]);

  // Consultar endpoint de inteligencia cuando placa es válida
  useEffect(() => {
    const checkVehiculoReincidente = async () => {
      const safeVal = value || '';
      // Solo consultar si la placa es válida y no es extranjera
      if (!localExtranjero && PLACA_REGEX.test(safeVal)) {
        setIsChecking(true);
        try {
          // Usar el nuevo endpoint /intelligence/vehiculo/:placa
          const response = await api.get(`/intelligence/vehiculo/${value}`);
          if (response.data.success && response.data.data) {
            const historial = response.data.data;
            // Solo mostrar alerta si tiene incidentes
            if (historial.total_incidentes > 0) {
              setVehiculoInfo({
                id: historial.id,
                placa: historial.placa,
                total_incidentes: historial.total_incidentes,
                nivel_riesgo: historial.nivel_alerta === 'ALTO' ? 5 :
                             historial.nivel_alerta === 'MEDIO' ? 3 : 1,
                dias_desde_ultimo_incidente: historial.dias_desde_ultimo_incidente,
                tipo_vehiculo: historial.tipo_vehiculo,
                marca: historial.marca,
                color: historial.color
              });
              setAlertaVisible(true);
            } else {
              setVehiculoInfo(null);
              setAlertaVisible(false);
            }
          } else {
            setVehiculoInfo(null);
            setAlertaVisible(false);
          }
        } catch (error: any) {
          // Si hay error, simplemente no mostrar alerta
          setVehiculoInfo(null);
          setAlertaVisible(false);
          console.log('No se encontró historial para esta placa (normal si es primera vez)');
        } finally {
          setIsChecking(false);
        }
      } else {
        setVehiculoInfo(null);
        setAlertaVisible(false);
      }
    };

    // Debounce de 800ms para no hacer muchas peticiones
    const timeoutId = setTimeout(() => {
      checkVehiculoReincidente();
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [value, localExtranjero]);

  const handleExtranjeroChange = () => {
    const newValue = !localExtranjero;
    setLocalExtranjero(newValue);
    if (onExtranjeroChange) {
      onExtranjeroChange(newValue);
    }
  };

  // Validación - asegurar que value nunca sea undefined
  const safeValue = value || '';
  const isValid = localExtranjero || PLACA_REGEX.test(safeValue) || safeValue === '';
  const showError = safeValue.length > 0 && !isValid;

  // Color del nivel de riesgo
  const getRiskColor = (nivel: number) => {
    if (nivel >= 5) return '#d32f2f'; // Rojo oscuro - Muy alto
    if (nivel >= 4) return '#f44336'; // Rojo - Alto
    if (nivel >= 3) return '#ff9800'; // Naranja - Medio
    if (nivel >= 2) return '#ffc107'; // Amarillo - Bajo
    return '#4caf50'; // Verde - Muy bajo
  };

  const getRiskLabel = (nivel: number) => {
    if (nivel >= 5) return 'MUY ALTO';
    if (nivel >= 4) return 'ALTO';
    if (nivel >= 3) return 'MEDIO';
    if (nivel >= 2) return 'BAJO';
    return 'MUY BAJO';
  };

  return (
    <View style={styles.container}>
      <TextInput
        label={label}
        value={safeValue}
        onChangeText={onChange}
        autoCapitalize="characters"
        maxLength={7}
        placeholder="P512KJF"
        mode="outlined"
        error={showError || !!error}
        right={
          isValid && safeValue.length > 0 && !localExtranjero ? (
            <TextInput.Icon icon="check-circle" color="#4caf50" />
          ) : undefined
        }
        style={[
          styles.input,
          showError && styles.inputError,
          isValid && safeValue.length > 0 && styles.inputValid
        ]}
      />

      {showError && !localExtranjero && (
        <HelperText type="error" visible={true}>
          Formato inválido. Debe ser: L###LLL (Ej: P512KJF)
        </HelperText>
      )}

      {error && (
        <HelperText type="error" visible={true}>
          {error}
        </HelperText>
      )}

      <View style={styles.checkboxContainer}>
        <Checkbox.Item
          label="Placa Extranjera"
          status={localExtranjero ? 'checked' : 'unchecked'}
          onPress={handleExtranjeroChange}
          mode="android"
          position="leading"
          labelStyle={styles.checkboxLabel}
        />
      </View>

      {!localExtranjero && (
        <HelperText type="info" visible={true}>
          Formato Guatemala: 1 letra + 3 números + 3 letras (Ej: P512KJF)
        </HelperText>
      )}

      {/* Indicador de carga */}
      {isChecking && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#1976d2" />
          <Text style={styles.loadingText}>Verificando historial...</Text>
        </View>
      )}

      {/* Alerta de vehículo reincidente */}
      {alertaVisible && vehiculoInfo && (
        <Card style={[styles.alertCard, { borderLeftColor: getRiskColor(vehiculoInfo.nivel_riesgo) }]}>
          <Card.Content>
            <View style={styles.alertHeader}>
              <View style={styles.alertTitleContainer}>
                <IconButton
                  icon="alert-circle"
                  size={24}
                  iconColor={getRiskColor(vehiculoInfo.nivel_riesgo)}
                  style={styles.alertIcon}
                />
                <Text style={[styles.alertTitle, { color: getRiskColor(vehiculoInfo.nivel_riesgo) }]}>
                  VEHÍCULO REINCIDENTE DETECTADO
                </Text>
              </View>
              <IconButton
                icon="close"
                size={20}
                onPress={() => setAlertaVisible(false)}
                style={styles.closeButton}
              />
            </View>

            <View style={styles.riskBadge}>
              <Text style={[styles.riskBadgeText, { backgroundColor: getRiskColor(vehiculoInfo.nivel_riesgo) }]}>
                NIVEL DE RIESGO: {getRiskLabel(vehiculoInfo.nivel_riesgo)}
              </Text>
            </View>

            <View style={styles.alertInfoGrid}>
              <View style={styles.alertInfoItem}>
                <Text style={styles.alertInfoLabel}>Total de Incidentes:</Text>
                <Text style={styles.alertInfoValue}>{vehiculoInfo.total_incidentes}</Text>
              </View>
              <View style={styles.alertInfoItem}>
                <Text style={styles.alertInfoLabel}>Último Incidente:</Text>
                <Text style={styles.alertInfoValue}>
                  Hace {vehiculoInfo.dias_desde_ultimo_incidente} días
                </Text>
              </View>
              <View style={styles.alertInfoItem}>
                <Text style={styles.alertInfoLabel}>Tipo de Vehículo:</Text>
                <Text style={styles.alertInfoValue}>{vehiculoInfo.tipo_vehiculo || 'N/A'}</Text>
              </View>
              <View style={styles.alertInfoItem}>
                <Text style={styles.alertInfoLabel}>Marca:</Text>
                <Text style={styles.alertInfoValue}>{vehiculoInfo.marca || 'N/A'}</Text>
              </View>
              <View style={styles.alertInfoItem}>
                <Text style={styles.alertInfoLabel}>Color:</Text>
                <Text style={styles.alertInfoValue}>{vehiculoInfo.color || 'N/A'}</Text>
              </View>
            </View>

            <HelperText type="info" visible={true} style={styles.alertHelper}>
              Este vehículo tiene historial de incidentes. Proceda con precaución.
            </HelperText>
          </Card.Content>
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ef5350',
  },
  inputValid: {
    borderColor: '#4caf50',
  },
  checkboxContainer: {
    marginTop: -8,
    marginBottom: -8,
  },
  checkboxLabel: {
    fontSize: 14,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1976d2',
  },
  alertCard: {
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  alertTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertIcon: {
    margin: 0,
    marginRight: -4,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    margin: 0,
    marginTop: -8,
    marginRight: -8,
  },
  riskBadge: {
    marginBottom: 12,
  },
  riskBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  alertInfoGrid: {
    marginBottom: 8,
  },
  alertInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  alertInfoLabel: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  alertInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  alertHelper: {
    marginTop: 4,
    marginBottom: -8,
  },
});
