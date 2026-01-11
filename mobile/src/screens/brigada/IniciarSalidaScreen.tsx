import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../constants/colors';
import { useNavigation, useRoute, CommonActions, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../../constants/config';
import FuelSelector from '../../components/FuelSelector';
import { Picker } from '@react-native-picker/picker';
import { turnosAPI, geografiaAPI } from '../../services/api';
import api from '../../services/api';

// Interface para inspeccion 360
interface Inspeccion360Estado {
  tiene_inspeccion: boolean;
  inspeccion?: {
    id: number;
    estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
    fecha_realizacion: string;
    motivo_rechazo?: string;
  };
  es_comandante: boolean;
}

type IniciarSalidaScreenRouteProp = RouteProp<{
  IniciarSalida: {
    editMode?: boolean;
    salidaData?: any;
  };
}, 'IniciarSalida'>;

export default function IniciarSalidaScreen() {
  const navigation = useNavigation();
  const route = useRoute<IniciarSalidaScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { editMode, salidaData } = route.params || {};

  const { asignacion, salidaActiva, refreshEstadoBrigada, refreshSalidaActiva } = useAuthStore();

  const [kmSalida, setKmSalida] = useState('');
  const [combustibleFraccion, setCombustibleFraccion] = useState<string | null>(null);
  const [combustibleDecimal, setCombustibleDecimal] = useState<number>(0);
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);

  // Asignacion de turno (sistema nuevo)
  const [asignacionTurno, setAsignacionTurno] = useState<any>(null);
  const [loadingAsignacion, setLoadingAsignacion] = useState(true);

  // Seleccion de ruta (para unidades de reaccion)
  const [rutas, setRutas] = useState<any[]>([]);
  const [rutaSeleccionadaId, setRutaSeleccionadaId] = useState<number | null>(null);
  const [loadingRutas, setLoadingRutas] = useState(false);

  // Query para verificar estado del 360 (solo en modo creacion)
  const { data: inspeccion360Estado, isLoading: loadingInspeccion360, refetch: refetchInspeccion360 } = useQuery<Inspeccion360Estado>({
    queryKey: ['inspeccion-360-estado', asignacionTurno?.unidad_id || asignacion?.unidad_id],
    queryFn: async () => {
      const unidadId = asignacionTurno?.unidad_id || asignacion?.unidad_id;
      if (!unidadId) throw new Error('No hay unidad asignada');
      const response = await api.get(`/inspeccion360/verificar-unidad/${unidadId}`);
      return response.data;
    },
    enabled: !editMode && !loadingAsignacion && !!(asignacionTurno?.unidad_id || asignacion?.unidad_id),
  });

  const handleCombustibleChange = (fraccion: string, decimal: number) => {
    setCombustibleFraccion(fraccion);
    setCombustibleDecimal(decimal);
  };

  // Cargar datos en modo edición
  useEffect(() => {
    if (editMode && salidaData) {
      // Pre-llenar formulario con datos existentes
      const kmValue = salidaData.km_inicial || salidaData.km_salida;
      setKmSalida(kmValue ? Math.round(kmValue).toString() : '');
      setObservaciones(salidaData.observaciones_salida || '');

      // Convertir decimal a fracción para el selector
      const combustible = salidaData.combustible_inicial || salidaData.combustible_salida;
      if (combustible !== null && combustible !== undefined) {
        setCombustibleDecimal(combustible);
        if (combustible >= 1) setCombustibleFraccion('LLENO');
        else if (combustible >= 0.75) setCombustibleFraccion('3/4');
        else if (combustible >= 0.5) setCombustibleFraccion('1/2');
        else if (combustible >= 0.25) setCombustibleFraccion('1/4');
        else setCombustibleFraccion('VACIO');
      }

      // En modo edición no necesitamos cargar asignación de turno
      setLoadingAsignacion(false);
    }
  }, [editMode, salidaData]);

  // Cargar asignacion de turno al montar (solo si NO es modo edición)
  useEffect(() => {
    if (editMode) {
      setLoadingAsignacion(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoadingAsignacion(true);
        const data = await turnosAPI.getMiAsignacionHoy();
        setAsignacionTurno(data);

        // Si es unidad de reaccion (es_reaccion=true) o no tiene ruta (null), cargamos rutas
        // Nota: data puede traer es_reaccion, o deducimos por falta de ruta
        if (data && (data.es_reaccion || !data.ruta_id)) {
          setLoadingRutas(true);
          try {
            const rutasData = await geografiaAPI.getRutas();
            setRutas(rutasData);
          } catch (err) {
            console.error('Error cargando rutas:', err);
            Alert.alert('Error', 'No se pudieron cargar las rutas. Verifica tu conexión.');
          } finally {
            setLoadingRutas(false);
          }
        }
      } catch (error) {
        console.log('[INICIAR SALIDA] No hay asignacion de turno');
        setAsignacionTurno(null);
      } finally {
        setLoadingAsignacion(false);
      }
    };
    loadData();
  }, [editMode]);

  // Verificar si ya tiene salida activa AL MONTAR (solo si NO es modo edición)
  useEffect(() => {
    // En modo edición, no verificar salida activa (es la que estamos editando)
    if (editMode) return;

    // Solo verificar si ya tenía salida activa al entrar a la pantalla
    // (no cuando cambia después de iniciar)
    if (salidaActiva && !loading) {
      Alert.alert(
        'Salida Activa',
        'Ya tienes una salida activa. Ve al Home para continuar tu jornada.',
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]); // Solo al montar

  // La asignacion efectiva es la de turno o la permanente
  const asignacionEfectiva = asignacionTurno || asignacion;

  const handleIniciarSalida = async () => {
    // Validar campos
    if (!kmSalida.trim()) {
      Alert.alert('Error', 'Debes ingresar el kilometraje de salida');
      return;
    }

    if (!combustibleFraccion) {
      Alert.alert('Error', 'Debes seleccionar el nivel de combustible');
      return;
    }

    // Validar ruta si es REACCION (solo en modo creación)
    if (!editMode && (asignacionTurno?.es_reaccion || (asignacionTurno && !asignacionTurno.ruta_id)) && !rutaSeleccionadaId) {
      Alert.alert('Error', 'Debes seleccionar una ruta para iniciar salida (Unidad de Reacción)');
      return;
    }

    const kmNum = parseInt(kmSalida, 10);

    if (isNaN(kmNum) || kmNum < 0) {
      Alert.alert('Error', 'El kilometraje debe ser un número válido');
      return;
    }

    try {
      setLoading(true);

      if (editMode) {
        // MODO EDICIÓN: PATCH para actualizar datos de salida existente
        await api.patch('/salidas/editar-datos-salida', {
          km_inicial: kmNum,
          combustible_inicial_fraccion: combustibleFraccion,
          observaciones_salida: observaciones.trim() || undefined,
        });

        console.log('[EDITAR SALIDA] Actualización exitosa');

        await refreshSalidaActiva();

        Alert.alert(
          'Salida Actualizada',
          'Los datos de salida han sido actualizados correctamente.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        // MODO CREACIÓN: POST para iniciar nueva salida
        const response = await axios.post(`${API_URL}/salidas/iniciar`, {
          unidad_id: asignacionEfectiva.unidad_id,
          ruta_inicial_id: rutaSeleccionadaId || undefined,
          km_inicial: kmNum,
          combustible_inicial: combustibleDecimal,
          observaciones_salida: observaciones.trim() || undefined,
        });

        console.log('[INICIAR SALIDA] Respuesta:', response.data);

        // Actualizar estado
        await refreshEstadoBrigada();

        Alert.alert(
          '¡Salida Iniciada!',
          response.data.message || 'Tu jornada laboral ha comenzado. Ya puedes reportar situaciones.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Usar reset para volver al home de forma segura
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'BrigadaHome' }],
                  })
                );
              }
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('[INICIAR/EDITAR SALIDA] Error:', error);
      const mensaje = error.response?.data?.error || error.message || (editMode ? 'No se pudo actualizar la salida' : 'No se pudo iniciar la salida');
      Alert.alert('Error', mensaje);
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading mientras carga asignacion de turno
  if (loadingAsignacion) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 16, color: COLORS.text.secondary }}>
          Verificando asignacion...
        </Text>
      </View>
    );
  }

  // Mostrar error si no hay ninguna asignacion (ni turno ni permanente) - SOLO en modo creación
  if (!editMode && !asignacionEfectiva) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Sin Asignacion</Text>
          <Text style={styles.errorText}>
            No tienes una unidad asignada para hoy. Contacta a Operaciones para que te asignen.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingBottom: 50 }}>
      <ScrollView style={styles.container}>
        {/* Header con botón de regresar */}
        <View style={[styles.header, editMode && { backgroundColor: COLORS.warning }]}>
          <View style={styles.headerTitleRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {editMode ? 'Editar Salida' : 'Iniciar Salida'}
            </Text>
          </View>
          <Text style={styles.headerSubtitle}>
            {editMode
              ? 'Modifica los datos de tu salida de unidad'
              : 'Registra el inicio de tu jornada laboral'
            }
          </Text>
        </View>

        {/* Card de Unidad Asignada (en modo edición mostramos datos de la salida) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {editMode ? 'Datos de la Salida' : 'Tu Unidad Asignada'}
          </Text>
          {/* Indicador si es asignacion de turno (solo en modo creación) */}
          {!editMode && asignacionTurno && (
            <View style={[styles.tipoBadge, { backgroundColor: asignacionTurno.dias_para_salida === 0 ? COLORS.success : COLORS.info }]}>
              <Text style={styles.tipoBadgeText}>
                {asignacionTurno.dias_para_salida === 0 ? 'TURNO DE HOY' : asignacionTurno.dias_para_salida === 1 ? 'TURNO DE MANANA' : `EN ${asignacionTurno.dias_para_salida} DIAS`}
              </Text>
            </View>
          )}
          <View style={styles.unidadInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Unidad:</Text>
              <Text style={styles.infoValue}>
                {editMode
                  ? (salidaData?.unidad_codigo || '-')
                  : (asignacionEfectiva?.unidad_codigo || asignacionEfectiva?.codigo || '-')
                }
              </Text>
            </View>
            {!editMode && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tipo:</Text>
                  <Text style={styles.infoValue}>
                    {asignacionEfectiva?.tipo_unidad || 'N/A'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tu Rol:</Text>
                  <Text style={styles.infoValue}>
                    {asignacionEfectiva?.mi_rol || asignacionEfectiva?.rol_tripulacion || 'N/A'}
                  </Text>
                </View>
                {asignacionTurno?.ruta_codigo && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Ruta:</Text>
                    <Text style={styles.infoValue}>{asignacionTurno.ruta_codigo}</Text>
                  </View>
                )}
              </>
            )}
            {editMode && salidaData?.mi_rol && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tu Rol:</Text>
                <Text style={styles.infoValue}>{salidaData.mi_rol}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Verificacion de Inspeccion 360 (solo en modo creacion) */}
        {!editMode && !loadingInspeccion360 && inspeccion360Estado && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Inspeccion 360</Text>

            {/* Caso 1: No tiene inspeccion - debe crearla */}
            {!inspeccion360Estado.tiene_inspeccion && (
              <View style={[styles.alertBox, { backgroundColor: COLORS.warning + '20', borderLeftColor: COLORS.warning }]}>
                <Text style={styles.alertTitle}>Inspeccion 360 Requerida</Text>
                <Text style={styles.alertText}>
                  Debes completar la inspeccion vehicular 360 antes de iniciar la salida.
                </Text>
                <TouchableOpacity
                  style={[styles.alertButton, { backgroundColor: COLORS.warning }]}
                  onPress={() => {
                    const unidadId = asignacionTurno?.unidad_id || asignacion?.unidad_id;
                    const tipoUnidad = asignacionTurno?.tipo_unidad || asignacion?.tipo_unidad;
                    (navigation as any).navigate('Inspeccion360', { unidadId, tipoUnidad });
                  }}
                >
                  <Text style={styles.alertButtonText}>Iniciar Inspeccion 360</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Caso 2: Tiene inspeccion PENDIENTE */}
            {inspeccion360Estado.tiene_inspeccion && inspeccion360Estado.inspeccion?.estado === 'PENDIENTE' && (
              <View style={[styles.alertBox, { backgroundColor: COLORS.info + '20', borderLeftColor: COLORS.info }]}>
                <Text style={styles.alertTitle}>Inspeccion Pendiente de Aprobacion</Text>
                <Text style={styles.alertText}>
                  La inspeccion 360 esta pendiente de aprobacion por el comandante.
                </Text>
                {inspeccion360Estado.es_comandante ? (
                  <TouchableOpacity
                    style={[styles.alertButton, { backgroundColor: COLORS.info }]}
                    onPress={() => {
                      (navigation as any).navigate('AprobarInspeccion360', {
                        inspeccionId: inspeccion360Estado.inspeccion?.id,
                      });
                    }}
                  >
                    <Text style={styles.alertButtonText}>Revisar y Aprobar</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.alertText, { fontStyle: 'italic', marginTop: 8 }]}>
                    Esperando al comandante...
                  </Text>
                )}
              </View>
            )}

            {/* Caso 3: Tiene inspeccion RECHAZADA */}
            {inspeccion360Estado.tiene_inspeccion && inspeccion360Estado.inspeccion?.estado === 'RECHAZADA' && (
              <View style={[styles.alertBox, { backgroundColor: COLORS.danger + '20', borderLeftColor: COLORS.danger }]}>
                <Text style={styles.alertTitle}>Inspeccion Rechazada</Text>
                <Text style={styles.alertText}>
                  {inspeccion360Estado.inspeccion?.motivo_rechazo || 'Debes corregir y enviar una nueva inspeccion.'}
                </Text>
                <TouchableOpacity
                  style={[styles.alertButton, { backgroundColor: COLORS.danger }]}
                  onPress={() => {
                    const unidadId = asignacionTurno?.unidad_id || asignacion?.unidad_id;
                    const tipoUnidad = asignacionTurno?.tipo_unidad || asignacion?.tipo_unidad;
                    (navigation as any).navigate('Inspeccion360', { unidadId, tipoUnidad });
                  }}
                >
                  <Text style={styles.alertButtonText}>Nueva Inspeccion 360</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Caso 4: Tiene inspeccion APROBADA */}
            {inspeccion360Estado.tiene_inspeccion && inspeccion360Estado.inspeccion?.estado === 'APROBADA' && (
              <View style={[styles.alertBox, { backgroundColor: COLORS.success + '20', borderLeftColor: COLORS.success }]}>
                <Text style={[styles.alertTitle, { color: COLORS.success }]}>Inspeccion Aprobada</Text>
                <Text style={styles.alertText}>
                  La inspeccion 360 fue aprobada. Puedes iniciar la salida.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Formulario */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Datos de Salida</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Kilometraje de Salida <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={kmSalida}
              onChangeText={(text) => setKmSalida(text.replace(/[^0-9]/g, ''))}
              placeholder="Ej: 125000"
              keyboardType="number-pad"
              editable={!loading}
            />
            <Text style={styles.hint}>Kilometraje actual del odómetro</Text>
          </View>

          <View style={styles.formGroup}>
            <FuelSelector
              value={combustibleFraccion}
              onChange={handleCombustibleChange}
              label="Nivel de Combustible"
              required
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Observaciones (Opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={observaciones}
              onChangeText={setObservaciones}
              placeholder="Cualquier observación sobre el estado de la unidad..."
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>
        </View>

        {/* Instrucciones (solo en modo creación) */}
        {!editMode && (
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>📋 Importante</Text>
            <Text style={styles.instructionsText}>
              • Verifica el kilometraje y combustible antes de iniciar{'\n'}
              • Una vez iniciada la salida, podrás reportar situaciones{'\n'}
              • Puedes ingresar a sedes durante tu jornada{'\n'}
              • Al finalizar el día, debes registrar el ingreso final
            </Text>
          </View>
        )}

        {/* Botones */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          {(() => {
            // Verificar si el 360 esta aprobado (solo en modo creacion)
            const inspeccion360Aprobada = editMode || (inspeccion360Estado?.tiene_inspeccion && inspeccion360Estado.inspeccion?.estado === 'APROBADA');
            const botonDeshabilitado = loading || (!editMode && !inspeccion360Aprobada);

            return (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.confirmButton,
                  editMode && { backgroundColor: COLORS.warning },
                  botonDeshabilitado && !loading && { backgroundColor: COLORS.text.secondary, opacity: 0.5 },
                ]}
                onPress={handleIniciarSalida}
                disabled={botonDeshabilitado}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {editMode ? 'Guardar Cambios' : 'Iniciar Salida'}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })()}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 16,
    paddingTop: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButton: {
    paddingRight: 4,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 32,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 2,
    marginLeft: 36,
  },
  card: {
    backgroundColor: COLORS.white,
    margin: 16,
    marginBottom: 8,
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
    marginBottom: 16,
  },
  unidadInfo: {
    backgroundColor: COLORS.primary + '10',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 20,
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
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS.white,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  instructionsCard: {
    backgroundColor: COLORS.info + '20',
    margin: 16,
    marginBottom: 8,
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
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  confirmButton: {
    backgroundColor: COLORS.success,
  },
  cancelButtonText: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: COLORS.white,
    margin: 20,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  tipoBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  tipoBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  // Estilos para alert boxes del 360
  alertBox: {
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  alertText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  alertButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  alertButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
