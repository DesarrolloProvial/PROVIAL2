/**
 * Pantalla de Configuración y Herramientas de Prueba
 *
 * Permite:
 * - Activar/desactivar modo de pruebas
 * - Resetear estados (salida, ingresos, situaciones)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { useTestMode } from '../../context/TestModeContext';
import { useAuthStore } from '../../store/authStore';

export default function ConfiguracionPruebasScreen() {
  const {
    testModeEnabled,
    toggleTestMode,
    resetSalida,
    resetIngresos,
    resetSituaciones,
    resetAll,
  } = useTestMode();

  const { salidaActiva, ingresoActivo } = useAuthStore();

  const confirmarReset = (tipo: string, action: () => Promise<void>) => {
    Alert.alert(
      '🔄 Resetear Estado',
      `¿Estás seguro que quieres resetear ${tipo}?\n\n📝 Lo que hará:\n• Finalizará tu salida activa\n• Eliminará ingresos a sede\n• Eliminará situaciones de hoy\n\nDespués podrás iniciar una nueva salida limpia.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Resetear',
          style: 'destructive',
          onPress: async () => {
            try {
              await action();
              Alert.alert(
                '✅ Completado',
                'Estado reseteado correctamente.\n\nAhora puedes iniciar una nueva salida.'
              );
            } catch (error: any) {
              Alert.alert('❌ Error', error.message || `No se pudo resetear ${tipo}`);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={[
        styles.header,
        { backgroundColor: testModeEnabled ? COLORS.warning : COLORS.primary }
      ]}>
        <Text style={styles.headerTitle}>
          {testModeEnabled ? '🧪 Modo de Pruebas' : '⚙️ Configuración'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {testModeEnabled
            ? 'Las herramientas de testing están activas'
            : 'Herramientas de desarrollo desactivadas'
          }
        </Text>
      </View>

      {/* Toggle Principal */}
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>🧪 Modo de Pruebas</Text>
            <Text style={styles.settingDescription}>
              Activa herramientas para testing y demos
            </Text>
          </View>
          <Switch
            value={testModeEnabled}
            onValueChange={toggleTestMode}
            trackColor={{ false: COLORS.border, true: COLORS.warning }}
            thumbColor={testModeEnabled ? COLORS.white : COLORS.text.secondary}
          />
        </View>
      </View>

      {testModeEnabled && (
        <>
          {/* Estado Actual */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 Estado Actual</Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Salida Activa:</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: salidaActiva ? COLORS.success + '20' : COLORS.danger + '20' }
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  { color: salidaActiva ? COLORS.success : COLORS.danger }
                ]}>
                  {salidaActiva ? 'SÍ' : 'NO'}
                </Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Ingreso Activo:</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: ingresoActivo ? COLORS.warning + '20' : COLORS.success + '20' }
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  { color: ingresoActivo ? COLORS.warning : COLORS.success }
                ]}>
                  {ingresoActivo ? 'SÍ (En Sede)' : 'NO (En Calle)'}
                </Text>
              </View>
            </View>
          </View>

          {/* Herramientas de Reset */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔄 Herramientas de Reset</Text>
            <Text style={styles.cardSubtitle}>
              Resetea el estado para iniciar nuevas pruebas
            </Text>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => confirmarReset('la salida activa', resetSalida)}
            >
              <Text style={styles.resetButtonIcon}>🚓</Text>
              <View style={styles.resetButtonTexts}>
                <Text style={styles.resetButtonTitle}>Resetear Salida</Text>
                <Text style={styles.resetButtonDescription}>
                  Finaliza la salida activa para poder iniciar nueva
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => confirmarReset('los ingresos activos', resetIngresos)}
            >
              <Text style={styles.resetButtonIcon}>🏢</Text>
              <View style={styles.resetButtonTexts}>
                <Text style={styles.resetButtonTitle}>Resetear Ingresos</Text>
                <Text style={styles.resetButtonDescription}>
                  Elimina ingresos a sede activos
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => confirmarReset('las situaciones', resetSituaciones)}
            >
              <Text style={styles.resetButtonIcon}>🚨</Text>
              <View style={styles.resetButtonTexts}>
                <Text style={styles.resetButtonTitle}>Resetear Situaciones</Text>
                <Text style={styles.resetButtonDescription}>
                  Elimina todas las situaciones reportadas hoy
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={[styles.resetButton, styles.resetAllButton]}
              onPress={() => confirmarReset('TODO (salida, ingresos y situaciones)', resetAll)}
            >
              <Text style={styles.resetButtonIcon}>💣</Text>
              <View style={styles.resetButtonTexts}>
                <Text style={[styles.resetButtonTitle, { color: COLORS.danger }]}>
                  Resetear TODO
                </Text>
                <Text style={styles.resetButtonDescription}>
                  Vuelve la app al estado inicial completamente
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Advertencia */}
          <View style={styles.warningCard}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningTitle}>Modo de Pruebas Activo</Text>
            <Text style={styles.warningText}>
              Este modo es solo para desarrollo y pruebas.{'\n\n'}
              Desactívalo antes de usar la app en producción.{'\n\n'}
              🔄 Resetear finaliza tu salida activa y elimina ingresos/situaciones del día. Después podrás iniciar una nueva salida limpia.
            </Text>
          </View>
        </>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 24,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  resetAllButton: {
    backgroundColor: COLORS.danger + '10',
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  resetButtonIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  resetButtonTexts: {
    flex: 1,
  },
  resetButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  resetButtonDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
    lineHeight: 16,
  },
  warningCard: {
    backgroundColor: COLORS.warning + '15',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  warningIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
});
