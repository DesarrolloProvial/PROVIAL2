/**
 * Pantalla para que el brigada vea su asignación activa
 *
 * Muestra:
 * - Unidad asignada
 * - Fecha y hora programada
 * - Su rol en la tripulación
 * - Compañeros de tripulación
 * - Ruta y recorrido
 * - Actividades del día
 * - Quién es el comandante
 * - Botón para solicitar salida
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { API_URL } from '../../constants/config';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Tripulante {
  usuario_id: number;
  nombre: string;
  chapa: string;
  rol: string;
  telefono?: string;
  es_comandante: boolean;
}

interface Asignacion {
  usuario_id: number;
  nombre_completo: string;
  turno_id: number;
  fecha: string;
  fecha_fin?: string;
  turno_estado: string;
  asignacion_id: number;
  unidad_id: number;
  unidad_codigo: string;
  tipo_unidad: string;
  mi_rol: string;
  es_comandante: boolean;
  ruta_id?: number;
  ruta_codigo?: string;
  ruta_nombre?: string;
  km_inicio?: number;
  km_final?: number;
  sentido?: string;
  acciones?: string;
  estado_nomina: string;
  recorrido_permitido?: string;
  hora_salida?: string;
  hora_entrada_estimada?: string;
  hora_salida_real?: string;
  dias_para_salida: number;
  tripulacion: Tripulante[];
  companeros?: Tripulante[];
}

export default function MiAsignacionScreen() {
  const navigation = useNavigation();
  const [asignacion, setAsignacion] = useState<Asignacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [miUsuarioId, setMiUsuarioId] = useState<number | null>(null);

  useEffect(() => {
    cargarMiUsuarioId();
  }, []);

  useEffect(() => {
    if (miUsuarioId) {
      cargarAsignacion();
    }
  }, [miUsuarioId]);

  const cargarMiUsuarioId = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setMiUsuarioId(user.id);
      }
    } catch (error) {
      console.error('Error al obtener usuario:', error);
    }
  };

  const cargarAsignacion = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');

      const response = await axios.get(`${API_URL}/turnos/mi-asignacion-hoy`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setAsignacion(response.data);
    } catch (error: any) {
      console.error('[MI ASIGNACION] Error:', error);
      // Si no hay asignación, simplemente mostrar pantalla vacía
      setAsignacion(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarAsignacion();
  };

  const handleSolicitarSalida = () => {
    if (!asignacion) return;

    if (asignacion.turno_estado !== 'PLANIFICADO') {
      Alert.alert(
        'No Disponible',
        `Esta asignación está ${asignacion.turno_estado}. Solo puedes solicitar salida para asignaciones PLANIFICADAS.`
      );
      return;
    }

    navigation.navigate('SolicitarSalidaAsignacion' as never, {
      asignacion_id: asignacion.asignacion_id
    } as never);
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha + 'T00:00:00');
    return date.toLocaleDateString('es-GT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'PLANIFICADO': return COLORS.info;
      case 'ACTIVO': return COLORS.success;
      case 'CERRADO': return COLORS.text.secondary;
      default: return COLORS.text.secondary;
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'PLANIFICADO': return '📋 Planificado';
      case 'ACTIVO': return '🚨 Activo';
      case 'CERRADO': return '✅ Cerrado';
      default: return estado;
    }
  };

  const getRolIcon = (rol: string) => {
    switch (rol) {
      case 'PILOTO': return '🚗';
      case 'COPILOTO': return '👨‍✈️';
      case 'ACOMPAÑANTE': return '👤';
      default: return '👤';
    }
  };

  const miTripulacion = asignacion?.tripulacion?.find(t => t.usuario_id === miUsuarioId);
  const esComandante = asignacion?.es_comandante || false;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando asignación...</Text>
      </View>
    );
  }

  if (!asignacion) {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>Sin Asignación</Text>
          <Text style={styles.emptyText}>
            No tienes una asignación activa en este momento.
          </Text>
          <Text style={styles.emptySubtext}>
            El departamento de Operaciones te notificará cuando seas asignado a una unidad.
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: getEstadoBadgeColor(asignacion.turno_estado) }]}>
        <Text style={styles.headerTitle}>Tu Asignación</Text>
        <Text style={styles.headerSubtitle}>{getEstadoLabel(asignacion.turno_estado)}</Text>
      </View>

      {/* Unidad Asignada */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>🚓</Text>
          <Text style={styles.cardTitle}>Unidad Asignada</Text>
        </View>
        <View style={styles.unidadInfo}>
          <Text style={styles.unidadCodigo}>{asignacion.unidad_codigo}</Text>
          <Text style={styles.unidadTipo}>{asignacion.unidad_tipo}</Text>
        </View>
      </View>

      {/* Fecha y Hora */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>📅</Text>
          <Text style={styles.cardTitle}>Fecha Programada</Text>
        </View>
        <Text style={styles.fechaText}>{formatFecha(asignacion.fecha)}</Text>
        {asignacion.hora_salida && (
          <Text style={styles.fechaText}>Hora salida: {asignacion.hora_salida}</Text>
        )}
      </View>

      {/* Tu Rol */}
      {miTripulacion && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>{getRolIcon(miTripulacion.rol)}</Text>
            <Text style={styles.cardTitle}>Tu Rol</Text>
          </View>
          <Text style={styles.rolText}>{miTripulacion.rol}</Text>
          {esComandante && (
            <View style={styles.comandanteBadge}>
              <Text style={styles.comandanteBadgeText}>⭐ COMANDANTE DE UNIDAD</Text>
            </View>
          )}
        </View>
      )}

      {/* Tripulación */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>👥</Text>
          <Text style={styles.cardTitle}>Tripulación ({asignacion.tripulacion?.length || 0})</Text>
        </View>
        {(asignacion.tripulacion || []).map((tripulante) => (
          <View key={tripulante.usuario_id} style={styles.tripulanteRow}>
            <View style={styles.tripulanteInfo}>
              <Text style={styles.tripulanteIcon}>
                {getRolIcon(tripulante.rol)}
              </Text>
              <View style={styles.tripulanteTexts}>
                <Text style={styles.tripulanteNombre}>
                  {tripulante.nombre}
                  {tripulante.es_comandante && ' ⭐'}
                  {tripulante.usuario_id === miUsuarioId && ' (Tú)'}
                </Text>
                <Text style={styles.tripulantePlaca}>{tripulante.chapa}</Text>
              </View>
            </View>
            <View style={styles.tripulanteRol}>
              <Text style={styles.tripulanteRolText}>{tripulante.rol}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Ruta y Recorrido */}
      {asignacion.ruta_nombre && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🛣️</Text>
            <Text style={styles.cardTitle}>Ruta Asignada</Text>
          </View>
          <Text style={styles.rutaNombre}>
            {asignacion.ruta_codigo} - {asignacion.ruta_nombre}
          </Text>
          {(asignacion.km_inicio || asignacion.km_final) && (
            <View style={styles.recorridoInfo}>
              <Text style={styles.recorridoLabel}>Recorrido:</Text>
              <Text style={styles.recorridoText}>
                Km {asignacion.km_inicio || '?'} al {asignacion.km_final || '?'}
              </Text>
            </View>
          )}
          {asignacion.sentido && (
            <View style={styles.recorridoInfo}>
              <Text style={styles.recorridoLabel}>Sentido:</Text>
              <Text style={styles.recorridoText}>{asignacion.sentido}</Text>
            </View>
          )}
        </View>
      )}

      {/* Actividades */}
      {asignacion.acciones && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📋</Text>
            <Text style={styles.cardTitle}>Actividades del Día</Text>
          </View>
          <Text style={styles.actividadesText}>{asignacion.acciones}</Text>
        </View>
      )}

      {/* Instrucciones */}
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>📌 Instrucciones</Text>
        <Text style={styles.instructionsText}>
          {asignacion.turno_estado === 'PLANIFICADO' ? (
            <>
              • A la hora programada, cualquier miembro puede solicitar la salida{'\n'}
              • TODOS los tripulantes deben autorizar la salida{'\n'}
              • Si uno rechaza, la unidad no sale{'\n'}
              • En emergencias, el COP puede aprobar la salida manualmente
            </>
          ) : asignacion.turno_estado === 'ACTIVO' ? (
            <>
              • La unidad está actualmente en servicio{'\n'}
              • Puedes reportar situaciones durante el patrullaje{'\n'}
              • Para finalizar, debes regresar a sede{'\n'}
              • Registra el ingreso final al terminar tu jornada
            </>
          ) : (
            'Esta asignación ha finalizado o fue cancelada.'
          )}
        </Text>
      </View>

      {/* Botón de acción */}
      {asignacion.turno_estado === 'PLANIFICADO' && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.inspeccionButton}
            onPress={() => navigation.navigate('Inspeccion360' as never, {
              unidadId: asignacion.unidad_id,
              unidadCodigo: asignacion.unidad_codigo,
              tipoUnidad: asignacion.tipo_unidad,
            } as never)}
          >
            <Text style={styles.inspeccionButtonText}>📋 Realizar Inspección 360</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.solicitarButton}
            onPress={handleSolicitarSalida}
          >
            <Text style={styles.solicitarButtonText}>🚀 Solicitar Salida de Unidad</Text>
          </TouchableOpacity>
          <Text style={styles.actionHint}>
            Todos los tripulantes deben autorizar
          </Text>
        </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    padding: 20,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.95,
  },
  card: {
    backgroundColor: COLORS.white,
    margin: 16,
    marginBottom: 0,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  unidadInfo: {
    backgroundColor: COLORS.primary + '15',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  unidadCodigo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  unidadTipo: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  fechaText: {
    fontSize: 16,
    color: COLORS.text.primary,
    lineHeight: 24,
  },
  rolText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginVertical: 8,
  },
  comandanteBadge: {
    backgroundColor: COLORS.warning + '20',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  comandanteBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
    textAlign: 'center',
  },
  tripulanteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tripulanteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tripulanteIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  tripulanteTexts: {
    flex: 1,
  },
  tripulanteNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  tripulantePlaca: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  tripulanteRol: {
    backgroundColor: COLORS.primary + '15',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  tripulanteRolText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  rutaNombre: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  recorridoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  recorridoLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginRight: 8,
  },
  recorridoText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  actividadesText: {
    fontSize: 15,
    color: COLORS.text.primary,
    lineHeight: 22,
    whiteSpace: 'pre-wrap' as any,
  },
  instructionsCard: {
    backgroundColor: COLORS.info + '15',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  actionContainer: {
    padding: 16,
  },
  inspeccionButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 12,
  },
  inspeccionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
  },
  solicitarButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  solicitarButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  autorizarButton: {
    backgroundColor: COLORS.warning,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  autorizarButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  actionHint: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
