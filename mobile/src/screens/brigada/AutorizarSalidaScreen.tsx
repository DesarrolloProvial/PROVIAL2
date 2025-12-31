/**
 * Pantalla para autorizar o rechazar una solicitud de salida
 *
 * Muestra:
 * - Detalles de la solicitud (quién la solicitó, datos)
 * - Estado de autorizaciones (quién votó)
 * - Tiempo restante
 * - Botones para autorizar o rechazar
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { API_URL } from '../../constants/config';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Autorizacion {
  usuario_id: number;
  nombre: string;
  placa: string;
  autoriza: boolean;
  fecha_respuesta: string;
  observaciones?: string;
}

interface Solicitud {
  id: number;
  asignacion_programada_id: number;
  solicitante_usuario_id: number;
  solicitante_nombre: string;
  solicitante_placa: string;
  fecha_hora_solicitud: string;
  km_salida: number;
  combustible_salida: number;
  combustible_fraccion: string;
  observaciones?: string;
  estado: string;
  fecha_expiracion: string;
  autorizaciones: Autorizacion[];
  votos_a_favor: number;
  votos_en_contra: number;
  total_votos: number;
}

interface MiRespuesta {
  autoriza: boolean;
  fecha_hora_respuesta: string;
}

export default function AutorizarSalidaScreen() {
  const navigation = useNavigation();
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [miRespuesta, setMiRespuesta] = useState<MiRespuesta | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState<string>('');
  const [observacionesRechazo, setObservacionesRechazo] = useState('');
  const [mostrarDialogRechazo, setMostrarDialogRechazo] = useState(false);

  useEffect(() => {
    cargarSolicitud();
    const interval = setInterval(cargarSolicitud, 5000); // Actualizar cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (solicitud) {
      const interval = setInterval(() => {
        actualizarTiempoRestante();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [solicitud]);

  const cargarSolicitud = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');

      const response = await axios.get(
        `${API_URL}/solicitudes-salida/pendiente`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSolicitud(response.data.solicitud);
      setMiRespuesta(response.data.mi_respuesta);

    } catch (error: any) {
      console.error('[AUTORIZAR SALIDA] Error:', error);
      setSolicitud(null);
      setMiRespuesta(null);
    } finally {
      setLoading(false);
    }
  };

  const actualizarTiempoRestante = () => {
    if (!solicitud) return;

    const ahora = new Date();
    const expira = new Date(solicitud.fecha_expiracion);
    const diff = expira.getTime() - ahora.getTime();

    if (diff <= 0) {
      setTiempoRestante('⏱️ EXPIRADO');
      return;
    }

    const minutos = Math.floor(diff / 60000);
    const segundos = Math.floor((diff % 60000) / 1000);

    setTiempoRestante(`${minutos}:${segundos.toString().padStart(2, '0')}`);
  };

  const handleAutorizar = () => {
    Alert.alert(
      '✅ Confirmar Autorización',
      '¿Autorizas que esta unidad salga con los datos registrados?\n\nSi todos autorizan, la salida se aprobará automáticamente.',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Autorizar',
          style: 'default',
          onPress: () => enviarAutorizacion(true, undefined)
        }
      ]
    );
  };

  const handleRechazar = () => {
    setMostrarDialogRechazo(true);
  };

  const confirmarRechazo = () => {
    if (!observacionesRechazo.trim()) {
      Alert.alert('Error', 'Debes indicar el motivo del rechazo');
      return;
    }

    setMostrarDialogRechazo(false);

    Alert.alert(
      '❌ Confirmar Rechazo',
      `Estás a punto de RECHAZAR esta solicitud.\n\nMotivo: ${observacionesRechazo}\n\nLa unidad NO podrá salir y se notificará a todos.\n\n¿Estás seguro?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => setMostrarDialogRechazo(true)
        },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: () => enviarAutorizacion(false, observacionesRechazo)
        }
      ]
    );
  };

  const enviarAutorizacion = async (autoriza: boolean, observaciones?: string) => {
    try {
      setProcesando(true);

      const token = await AsyncStorage.getItem('token');

      const payload = {
        autoriza,
        observaciones: observaciones || undefined,
      };

      const response = await axios.post(
        `${API_URL}/solicitudes-salida/${solicitud?.id}/autorizar`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('[AUTORIZAR] Respuesta:', response.data);

      if (response.data.todos_autorizaron) {
        Alert.alert(
          '🎉 ¡Salida Aprobada!',
          'Todos los tripulantes han autorizado. La unidad ha salido automáticamente. ¡Buen patrullaje!',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'BrigadaHome' as never }],
                });
              }
            }
          ]
        );
      } else if (autoriza) {
        Alert.alert(
          '✅ Autorización Registrada',
          'Tu autorización ha sido registrada. Esperando a los demás tripulantes...',
          [
            {
              text: 'OK',
              onPress: () => cargarSolicitud()
            }
          ]
        );
      } else {
        Alert.alert(
          '❌ Solicitud Rechazada',
          'Has rechazado la solicitud. La unidad no saldrá. Se ha notificado a todos.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'BrigadaHome' as never }],
                });
              }
            }
          ]
        );
      }

    } catch (error: any) {
      console.error('[AUTORIZAR] Error:', error);
      const mensaje = error.response?.data?.error || error.message || 'No se pudo procesar tu respuesta';
      Alert.alert('Error', mensaje);
    } finally {
      setProcesando(false);
      setObservacionesRechazo('');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando solicitud...</Text>
      </View>
    );
  }

  if (!solicitud) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>Sin Solicitudes Pendientes</Text>
          <Text style={styles.emptyText}>
            No hay solicitudes de salida esperando tu autorización en este momento.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const combustiblePorcentaje = (solicitud.combustible_salida * 100).toFixed(0);
  const yaRespondi = miRespuesta !== null;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={[
        styles.header,
        { backgroundColor: yaRespondi ? COLORS.success : COLORS.warning }
      ]}>
        <Text style={styles.headerTitle}>
          {yaRespondi ? '✅ Ya Respondiste' : '⏳ Autorización Pendiente'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {yaRespondi
            ? (miRespuesta.autoriza ? 'Has autorizado esta salida' : 'Has rechazado esta salida')
            : 'Revisa y decide'
          }
        </Text>
      </View>

      {/* Tiempo restante */}
      {!yaRespondi && (
        <View style={styles.tiempoCard}>
          <Text style={styles.tiempoLabel}>Tiempo restante:</Text>
          <Text style={styles.tiempoValor}>{tiempoRestante}</Text>
        </View>
      )}

      {/* Solicitante */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>👤</Text>
          <Text style={styles.cardTitle}>Solicitado por</Text>
        </View>
        <Text style={styles.solicitanteNombre}>{solicitud.solicitante_nombre}</Text>
        <Text style={styles.solicitantePlaca}>Placa: {solicitud.solicitante_placa}</Text>
        <Text style={styles.solicitanteFecha}>
          {new Date(solicitud.fecha_hora_solicitud).toLocaleString('es-GT')}
        </Text>
      </View>

      {/* Datos de salida */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>📊</Text>
          <Text style={styles.cardTitle}>Datos de Salida</Text>
        </View>

        <View style={styles.datoRow}>
          <Text style={styles.datoLabel}>Kilometraje:</Text>
          <Text style={styles.datoValor}>{solicitud.km_salida.toLocaleString('es-GT')} km</Text>
        </View>

        <View style={styles.datoRow}>
          <Text style={styles.datoLabel}>Combustible:</Text>
          <Text style={styles.datoValor}>
            {solicitud.combustible_fraccion} ({combustiblePorcentaje}%)
          </Text>
        </View>

        {solicitud.observaciones && (
          <View style={styles.observacionesBox}>
            <Text style={styles.observacionesLabel}>Observaciones:</Text>
            <Text style={styles.observacionesTexto}>{solicitud.observaciones}</Text>
          </View>
        )}
      </View>

      {/* Estado de autorizaciones */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>📋</Text>
          <Text style={styles.cardTitle}>
            Autorizaciones ({solicitud.total_votos} respuestas)
          </Text>
        </View>

        <View style={styles.votosResumen}>
          <View style={styles.votosStat}>
            <Text style={styles.votosNumero}>{solicitud.votos_a_favor}</Text>
            <Text style={styles.votosLabel}>A favor</Text>
          </View>
          <View style={styles.votosSeparador} />
          <View style={styles.votosStat}>
            <Text style={styles.votosNumero}>{solicitud.votos_en_contra}</Text>
            <Text style={styles.votosLabel}>En contra</Text>
          </View>
        </View>

        {solicitud.autorizaciones && solicitud.autorizaciones.length > 0 && (
          <View style={styles.autorizacionesList}>
            <Text style={styles.autorizacionesTitle}>Respuestas:</Text>
            {solicitud.autorizaciones.map((auth) => (
              <View key={auth.usuario_id} style={styles.autorizacionRow}>
                <View style={styles.autorizacionInfo}>
                  <Text style={styles.autorizacionNombre}>{auth.nombre}</Text>
                  <Text style={styles.autorizacionPlaca}>{auth.placa}</Text>
                </View>
                <View style={[
                  styles.autorizacionBadge,
                  { backgroundColor: auth.autoriza ? COLORS.success + '20' : COLORS.danger + '20' }
                ]}>
                  <Text style={[
                    styles.autorizacionBadgeText,
                    { color: auth.autoriza ? COLORS.success : COLORS.danger }
                  ]}>
                    {auth.autoriza ? '✓ Autorizó' : '✗ Rechazó'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Mi respuesta (si ya respondí) */}
      {yaRespondi && miRespuesta && (
        <View style={[
          styles.card,
          {
            backgroundColor: miRespuesta.autoriza ? COLORS.success + '15' : COLORS.danger + '15',
            borderLeftWidth: 4,
            borderLeftColor: miRespuesta.autoriza ? COLORS.success : COLORS.danger,
          }
        ]}>
          <Text style={styles.miRespuestaTitle}>
            {miRespuesta.autoriza ? '✅ Autorizaste esta salida' : '❌ Rechazaste esta salida'}
          </Text>
          <Text style={styles.miRespuestaFecha}>
            {new Date(miRespuesta.fecha_hora_respuesta).toLocaleString('es-GT')}
          </Text>
        </View>
      )}

      {/* Botones de acción */}
      {!yaRespondi && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rechazarButton]}
            onPress={handleRechazar}
            disabled={procesando}
          >
            <Text style={styles.rechazarButtonText}>❌ Rechazar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.autorizarButton]}
            onPress={handleAutorizar}
            disabled={procesando}
          >
            {procesando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.autorizarButtonText}>✅ Autorizar</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Dialog de rechazo */}
      {mostrarDialogRechazo && (
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>❌ Rechazar Solicitud</Text>
            <Text style={styles.dialogSubtitle}>
              Indica el motivo del rechazo (obligatorio):
            </Text>

            <TextInput
              style={styles.dialogInput}
              value={observacionesRechazo}
              onChangeText={setObservacionesRechazo}
              placeholder="Ej: Unidad presenta falla mecánica en el motor"
              multiline
              numberOfLines={4}
              autoFocus
            />

            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogCancelButton]}
                onPress={() => {
                  setMostrarDialogRechazo(false);
                  setObservacionesRechazo('');
                }}
              >
                <Text style={styles.dialogCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogConfirmButton]}
                onPress={confirmarRechazo}
              >
                <Text style={styles.dialogConfirmText}>Confirmar Rechazo</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    lineHeight: 24,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.95,
  },
  tiempoCard: {
    backgroundColor: COLORS.danger,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  tiempoLabel: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 4,
  },
  tiempoValor: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
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
  solicitanteNombre: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  solicitantePlaca: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  solicitanteFecha: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  datoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  datoLabel: {
    fontSize: 15,
    color: COLORS.text.secondary,
  },
  datoValor: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  observacionesBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  observacionesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 6,
  },
  observacionesTexto: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  votosResumen: {
    flexDirection: 'row',
    marginVertical: 12,
  },
  votosStat: {
    flex: 1,
    alignItems: 'center',
  },
  votosSeparador: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  votosNumero: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  votosLabel: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  autorizacionesList: {
    marginTop: 12,
  },
  autorizacionesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  autorizacionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  autorizacionInfo: {
    flex: 1,
  },
  autorizacionNombre: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  autorizacionPlaca: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  autorizacionBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  autorizacionBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  miRespuestaTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  miRespuestaFecha: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  rechazarButton: {
    backgroundColor: COLORS.danger,
  },
  autorizarButton: {
    backgroundColor: COLORS.success,
  },
  rechazarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  autorizarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  dialogSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 16,
  },
  dialogInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  dialogButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dialogCancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dialogConfirmButton: {
    backgroundColor: COLORS.danger,
  },
  dialogCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  dialogConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
});
