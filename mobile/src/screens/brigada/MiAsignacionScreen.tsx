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
  placa: string;
  rol: string;
  notificado: boolean;
  vio_notificacion: boolean;
  acepto: boolean;
}

interface Asignacion {
  id: number;
  unidad_id: number;
  unidad_codigo: string;
  unidad_tipo: string;
  fecha_programada: string;
  fecha_creacion: string;
  estado: string;
  ruta_id?: number;
  ruta_nombre?: string;
  ruta_codigo?: string;
  recorrido_inicio_km?: number;
  recorrido_fin_km?: number;
  actividades_especificas?: string;
  comandante_usuario_id: number;
  comandante_nombre: string;
  comandante_placa: string;
  tripulacion: Tripulante[];
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

      const response = await axios.get(`${API_URL}/asignaciones/mi-asignacion`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setAsignacion(response.data.asignacion);
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

    if (asignacion.estado !== 'PROGRAMADA') {
      Alert.alert(
        'No Disponible',
        `Esta asignación está ${asignacion.estado}. Solo puedes solicitar salida para asignaciones PROGRAMADAS.`
      );
      return;
    }

    navigation.navigate('SolicitarSalidaAsignacion' as never, {
      asignacion_id: asignacion.id
    } as never);
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleString('es-GT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'PROGRAMADA': return COLORS.info;
      case 'EN_AUTORIZACION': return COLORS.warning;
      case 'EN_CURSO': return COLORS.success;
      case 'FINALIZADA': return COLORS.text.secondary;
      case 'CANCELADA': return COLORS.danger;
      default: return COLORS.text.secondary;
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'PROGRAMADA': return '📋 Programada';
      case 'EN_AUTORIZACION': return '⏳ En Autorización';
      case 'EN_CURSO': return '🚨 En Curso';
      case 'FINALIZADA': return '✅ Finalizada';
      case 'CANCELADA': return '❌ Cancelada';
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
  const esComandante = asignacion?.comandante_usuario_id === miUsuarioId;

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
      <View style={[styles.header, { backgroundColor: getEstadoBadgeColor(asignacion.estado) }]}>
        <Text style={styles.headerTitle}>Tu Asignación</Text>
        <Text style={styles.headerSubtitle}>{getEstadoLabel(asignacion.estado)}</Text>
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
        <Text style={styles.fechaText}>{formatFecha(asignacion.fecha_programada)}</Text>
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
                  {tripulante.usuario_id === asignacion.comandante_usuario_id && ' ⭐'}
                  {tripulante.usuario_id === miUsuarioId && ' (Tú)'}
                </Text>
                <Text style={styles.tripulantePlaca}>{tripulante.placa}</Text>
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
          {(asignacion.recorrido_inicio_km || asignacion.recorrido_fin_km) && (
            <View style={styles.recorridoInfo}>
              <Text style={styles.recorridoLabel}>Recorrido:</Text>
              <Text style={styles.recorridoText}>
                Km {asignacion.recorrido_inicio_km || '?'} al {asignacion.recorrido_fin_km || '?'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Actividades */}
      {asignacion.actividades_especificas && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📋</Text>
            <Text style={styles.cardTitle}>Actividades del Día</Text>
          </View>
          <Text style={styles.actividadesText}>{asignacion.actividades_especificas}</Text>
        </View>
      )}

      {/* Instrucciones */}
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>📌 Instrucciones</Text>
        <Text style={styles.instructionsText}>
          {asignacion.estado === 'PROGRAMADA' ? (
            <>
              • A la hora programada, cualquier miembro puede solicitar la salida{'\n'}
              • TODOS los tripulantes deben autorizar la salida{'\n'}
              • Si uno rechaza, la unidad no sale{'\n'}
              • En emergencias, el COP puede aprobar la salida manualmente
            </>
          ) : asignacion.estado === 'EN_AUTORIZACION' ? (
            <>
              • Hay una solicitud de salida pendiente{'\n'}
              • Revisa la solicitud y autoriza o rechaza{'\n'}
              • Tienes 5 minutos para responder{'\n'}
              • La salida requiere consenso de TODA la tripulación
            </>
          ) : asignacion.estado === 'EN_CURSO' ? (
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
      {asignacion.estado === 'PROGRAMADA' && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.inspeccionButton}
            onPress={() => navigation.navigate('Inspeccion360' as never, {
              unidadId: asignacion.unidad_id,
              unidadCodigo: asignacion.unidad_codigo,
              tipoUnidad: asignacion.unidad_tipo,
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

      {asignacion.estado === 'EN_AUTORIZACION' && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.autorizarButton}
            onPress={() => navigation.navigate('AutorizarSalida' as never)}
          >
            <Text style={styles.autorizarButtonText}>⏳ Ver Solicitud Pendiente</Text>
          </TouchableOpacity>
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
