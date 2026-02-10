import React, { useEffect, useState, useCallback } from 'react';
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
import { useAuthStore } from '../../store/authStore';
import { useSituacionesStore } from '../../store/situacionesStore';
import { COLORS } from '../../constants/colors';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { turnosAPI, salidasAPI } from '../../services/api';
import RutaSelector from '../../components/RutaSelector';
import AsignacionDetalleCard from '../../components/AsignacionDetalleCard';

export default function BrigadaHomeScreen() {
  const navigation = useNavigation();
  const { usuario, asignacion, salidaActiva, salidaHoy, ingresoActivo, verificarAcceso, refreshEstadoBrigada } = useAuthStore();
  const { situacionActiva, actividadActiva, fetchMisSituacionesHoy, cerrarSituacion, cerrarActividad, isLoading } = useSituacionesStore();

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [accesoInfo, setAccesoInfo] = useState<{ tiene_acceso: boolean; motivo_bloqueo: string | null } | null>(null);
  const [mostrarCambioRuta, setMostrarCambioRuta] = useState(false);
  const [nuevaRutaId, setNuevaRutaId] = useState<number | null>(null);
  const [cambiandoRuta, setCambiandoRuta] = useState(false);
  const [asignacionDia, setAsignacionDia] = useState<any>(null);
  const [loadingAsignacionDia, setLoadingAsignacionDia] = useState(false);
  const [finalizandoJornada, setFinalizandoJornada] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Refrescar situaciones cuando la pantalla vuelve a estar en foco (ej: al volver de crear situación)
  useFocusEffect(
    useCallback(() => {
      fetchMisSituacionesHoy();
    }, [])
  );

  const loadData = async () => {
    try {
      setInitialLoading(true);

      // Cargar todo en paralelo para mayor velocidad
      await Promise.all([
        verificarAcceso().then(acceso => setAccesoInfo(acceso)),
        refreshEstadoBrigada(),
        fetchMisSituacionesHoy(),
        loadAsignacionDia()
      ]);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadAsignacionDia = async () => {
    try {
      setLoadingAsignacionDia(true);
      const asignacion = await turnosAPI.getMiAsignacionHoy();
      setAsignacionDia(asignacion);
    } catch (error: any) {
      // Si no hay asignación, no es un error crítico
      console.log('[ASIGNACION DIA] No hay asignación para hoy');
      setAsignacionDia(null);
    } finally {
      setLoadingAsignacionDia(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const abrirEdicionSituacionActiva = () => {
    if (!situacionActiva) return;

    switch (situacionActiva.tipo_situacion) {
      case 'INCIDENTE':
        // @ts-ignore - React Navigation typing issue
        navigation.navigate('Incidente' as any, {
          editMode: true,
          situacionId: situacionActiva.id,
          situacionData: situacionActiva
        });
        return;
      case 'ASISTENCIA_VEHICULAR':
        // @ts-ignore - React Navigation typing issue
        navigation.navigate('Asistencia' as any, {
          editMode: true,
          situacionId: situacionActiva.id,
          situacionData: situacionActiva
        });
        return;
      case 'EMERGENCIA' as any:
        // @ts-ignore - React Navigation typing issue
        navigation.navigate('Emergencia' as any, {
          editMode: true,
          situacionId: situacionActiva.id,
          situacionData: situacionActiva
        });
        return;
      default:
        // @ts-ignore - React Navigation typing issue
        navigation.navigate('NuevaSituacion' as any, {
          editMode: true,
          situacionId: situacionActiva.id,
          situacionData: situacionActiva
        });
        return;
    }
  };

  const handleCerrarSituacion = () => {
    if (!situacionActiva) return;

    Alert.alert(
      'Cerrar Situación',
      '¿Desea cerrar la situación actual?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar',
          onPress: async () => {
            try {
              await cerrarSituacion(situacionActiva.id);
              Alert.alert('Éxito', 'Situación cerrada correctamente');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo cerrar la situación');
            }
          },
        },
      ]
    );
  };

  const handleCerrarActividad = () => {
    if (!actividadActiva) return;

    Alert.alert(
      'Cerrar Actividad',
      `¿Desea cerrar "${actividadActiva.tipo_actividad_nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar',
          onPress: async () => {
            try {
              await cerrarActividad(actividadActiva.id);
              Alert.alert('Éxito', 'Actividad cerrada correctamente');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo cerrar la actividad');
            }
          },
        },
      ]
    );
  };

  // Una unidad tiene algo activo si tiene situacion O actividad
  const tieneAlgoActivo = !!situacionActiva || !!actividadActiva;

  const handleCambiarRuta = async () => {
    if (!nuevaRutaId) {
      Alert.alert('Error', 'Debes seleccionar una ruta');
      return;
    }

    try {
      setCambiandoRuta(true);
      console.log('[CAMBIAR RUTA] Cambiando a ruta ID:', nuevaRutaId);

      const response = await turnosAPI.cambiarRuta(nuevaRutaId);
      console.log('[CAMBIAR RUTA] Respuesta:', response);

      console.log('[CAMBIAR RUTA] Refrescando estado...');
      await refreshEstadoBrigada();

      setMostrarCambioRuta(false);
      setNuevaRutaId(null);
      Alert.alert('Éxito', 'Ruta cambiada correctamente');
    } catch (error: any) {
      console.error('[CAMBIAR RUTA] Error:', error);
      const mensaje = error.response?.data?.error || error.message || 'No se pudo cambiar la ruta';
      Alert.alert('Error al cambiar ruta', mensaje);
    } finally {
      setCambiandoRuta(false);
    }
  };


  const handleFinalizarJornada = async () => {
    if (situacionActiva || actividadActiva) {
      Alert.alert(
        situacionActiva ? 'Situación Activa' : 'Actividad Activa',
        situacionActiva
          ? 'Debes cerrar la situación activa antes de finalizar la jornada.'
          : 'Debes cerrar la actividad activa antes de finalizar la jornada.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Verificar que hay ingreso activo con FINALIZACION_JORNADA
    if (!ingresoActivo || ingresoActivo.tipo_ingreso !== 'FINALIZACION_JORNADA') {
      Alert.alert(
        'Ingreso Requerido',
        'Para finalizar la jornada, primero debes ingresar a sede con motivo "Finalización Jornada".',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Finalizar Jornada',
      '¿Estás seguro de que deseas finalizar tu jornada laboral?\n\nEsta acción cerrará tu salida y liberará la unidad.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          style: 'destructive',
          onPress: async () => {
            try {
              setFinalizandoJornada(true);
              await salidasAPI.finalizarJornadaCompleta();

              // Limpiar TODOS los estados relacionados con la jornada
              await refreshEstadoBrigada();
              setAsignacionDia(null); // Limpiar asignación del día (estado local)

              Alert.alert(
                'Jornada Finalizada',
                'Tu jornada ha sido finalizada exitosamente. ¡Buen trabajo!',
                [{ text: 'OK' }]
              );
            } catch (error: any) {
              console.error('[FINALIZAR JORNADA] Error:', error);
              const mensaje = error.response?.data?.message || error.response?.data?.error || error.message || 'No se pudo finalizar la jornada';
              Alert.alert('Error', mensaje);
            } finally {
              setFinalizandoJornada(false);
            }
          }
        }
      ]
    );
  };

  const getTipoSituacionColor = (tipo: string) => {
    const tipoLower = tipo.toLowerCase();
    if (tipoLower.includes('incidente')) return COLORS.tipoSituacion.incidente;
    if (tipoLower.includes('patrullaje')) return COLORS.tipoSituacion.patrullaje;
    if (tipoLower.includes('salida')) return COLORS.tipoSituacion.salida;
    if (tipoLower.includes('parada')) return COLORS.tipoSituacion.parada;
    if (tipoLower.includes('comida')) return COLORS.tipoSituacion.comida;
    if (tipoLower.includes('asistencia')) return COLORS.tipoSituacion.asistencia;
    return COLORS.primary;
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-GT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formatear fecha de asignacion de forma segura
  const formatFechaAsignacion = (fecha: string | null | undefined) => {
    if (!fecha) return 'Fecha no disponible';
    try {
      // PostgreSQL puede devolver YYYY-MM-DD o con tiempo
      const fechaStr = fecha.includes('T') ? fecha.split('T')[0] : fecha;
      const date = new Date(fechaStr + 'T00:00:00');
      if (isNaN(date.getTime())) return 'Fecha no disponible';
      return date.toLocaleDateString('es-GT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    } catch {
      return 'Fecha no disponible';
    }
  };

  // Mostrar pantalla de carga mientras se cargan los datos iniciales
  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando información...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header con información del usuario */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.welcomeText}>Bienvenido,</Text>
              <Text style={styles.userName}>
                {usuario?.nombre?.split(' ')[0] || usuario?.email || 'Usuario'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                Alert.alert(
                  'Cerrar Sesión',
                  '¿Estás seguro que deseas cerrar sesión?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Salir',
                      style: 'destructive',
                      onPress: async () => {
                        await useAuthStore.getState().logout();
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.logoutButtonText}>Salir</Text>
            </TouchableOpacity>
          </View>

          {/* Indicador de acceso */}
          {accesoInfo && (
            <View style={[
              styles.accesoIndicator,
              { backgroundColor: accesoInfo.tiene_acceso ? COLORS.success : COLORS.warning }
            ]}>
              <Text style={styles.accesoText}>
                {accesoInfo.tiene_acceso
                  ? '✓ Acceso permitido hoy'
                  : `⚠ ${accesoInfo.motivo_bloqueo}`}
              </Text>
            </View>
          )}
        </View>

        {/* Card de Asignación Unificada - Solo mostrar si NO hay salida activa */}
        {!salidaActiva && loadingAsignacionDia ? (
          <View style={styles.card}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={{ textAlign: 'center', color: COLORS.text.secondary, marginTop: 8 }}>
              Cargando información de asignación...
            </Text>
          </View>
        ) : !salidaActiva && (asignacion?.unidad_codigo || asignacionDia?.unidad_codigo) ? (
          <AsignacionDetalleCard
            titulo="Mi Asignación"
            badgeText={
              asignacionDia?.dias_para_salida === 0
                ? 'HOY'
                : asignacionDia?.dias_para_salida === 1
                  ? 'MAÑANA'
                  : `EN ${asignacionDia?.dias_para_salida || 0} DÍAS`
            }
            badgeColor={asignacionDia?.dias_para_salida === 0 ? COLORS.success : COLORS.info}
            primeraSeccionLabel={asignacionDia?.fecha && (asignacionDia.dias_para_salida || 0) > 0 ? "Fecha de Salida" : undefined}
            primeraSeccionValor={asignacionDia?.fecha && (asignacionDia.dias_para_salida || 0) > 0 ? formatFechaAsignacion(asignacionDia.fecha) : undefined}
            primeraSeccionColor={COLORS.primary}
            unidad_codigo={asignacionDia?.unidad_codigo || asignacion?.unidad_codigo}
            tipo_unidad={asignacionDia?.tipo_unidad || asignacion?.tipo_unidad}
            mi_rol={asignacionDia?.mi_rol || asignacion?.rol_tripulacion}
            es_comandante={asignacionDia?.es_comandante}
            ruta_codigo={asignacionDia?.ruta_codigo}
            sentido={asignacionDia?.sentido}
            hora_salida={asignacionDia?.hora_salida}
            recorrido_permitido={asignacionDia?.recorrido_permitido}
            acciones={asignacionDia?.acciones}
            tripulacion={asignacionDia?.tripulacion}
            usuario_id={usuario?.id}
          />
        ) : !salidaActiva && !salidaHoy?.jornada_finalizada ? (
          <View style={[styles.card, styles.noAsignacionCard]}>
            <Text style={styles.noAsignacionIcon}>📋</Text>
            <Text style={styles.noAsignacionTitle}>Sin Asignación</Text>
            <Text style={styles.noAsignacionText}>
              No tienes una unidad asignada actualmente. Contacta a Operaciones para que te asignen a un turno o unidad.
            </Text>
          </View>
        ) : null}

        {/* Card de Salida Activa */}
        {salidaActiva ? (
          <AsignacionDetalleCard
            titulo="Jornada Activa"
            badgeText="EN CURSO"
            badgeColor={COLORS.success}
            primeraSeccionLabel="Inicio de Jornada"
            primeraSeccionValor={formatFecha(salidaActiva.fecha_hora_salida)}
            primeraSeccionColor={COLORS.success}
            unidad_codigo={salidaActiva.unidad_codigo}
            tipo_unidad={salidaActiva.tipo_unidad}
            mi_rol={salidaActiva.mi_rol}
            es_comandante={salidaActiva.mi_rol === 'PILOTO'}
            ruta_codigo={salidaActiva.ruta_codigo}
            sentido={undefined}
            hora_salida={undefined}
            recorrido_permitido={undefined}
            acciones={undefined}
            tripulacion={salidaActiva.tripulacion}
            usuario_id={usuario?.id}
          />
        ) : salidaHoy?.jornada_finalizada ? (
          /* Card de Jornada Finalizada */
          <TouchableOpacity
            style={[styles.card, { borderLeftWidth: 4, borderLeftColor: COLORS.info }]}
            onPress={() => navigation.navigate('Bitacora' as never)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Jornada Finalizada ✅</Text>
              <View style={[styles.tipoBadge, { backgroundColor: COLORS.info }]}>
                <Text style={styles.tipoBadgeText}>COMPLETA</Text>
              </View>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Unidad:</Text>
                <Text style={styles.infoValue}>{salidaHoy.unidad_codigo}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Inicio:</Text>
                <Text style={styles.infoValue}>
                  {formatFecha(salidaHoy.fecha_hora_salida)}
                </Text>
              </View>
              {salidaHoy.fecha_hora_regreso && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Fin:</Text>
                  <Text style={styles.infoValue}>
                    {formatFecha(salidaHoy.fecha_hora_regreso)}
                  </Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Horas Trabajadas:</Text>
                <Text style={styles.infoValue}>
                  {salidaHoy.resumen?.horas_trabajadas?.toFixed(1) || '0'} hrs
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Situaciones:</Text>
                <Text style={styles.infoValue}>
                  {salidaHoy.resumen?.total_situaciones || 0}
                </Text>
              </View>
              {salidaHoy.resumen?.km_recorridos > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Km Recorridos:</Text>
                  <Text style={styles.infoValue}>{salidaHoy.resumen.km_recorridos} km</Text>
                </View>
              )}
              <Text style={{ textAlign: 'center', color: COLORS.info, marginTop: 12, fontSize: 12 }}>
                Toca para ver el resumen completo en Bitácora
              </Text>
            </View>
          </TouchableOpacity>
        ) : (asignacion?.unidad_codigo || asignacionDia?.unidad_codigo) ? (
          <View style={[styles.card, styles.warningCard]}>
            <Text style={styles.warningText}>
              No has iniciado salida hoy
            </Text>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton, { marginHorizontal: 16, marginTop: 12 }]}
              onPress={() => navigation.navigate('IniciarSalida' as never)}
            >
              <Text style={styles.actionButtonText}>🚗 Iniciar Salida</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Card de Ingreso Activo */}
        {ingresoActivo && !ingresoActivo.es_ingreso_final && (
          <View style={[styles.card, {
            borderLeftWidth: 4,
            borderLeftColor: ingresoActivo.tipo_ingreso === 'FINALIZACION_JORNADA' ? COLORS.danger : COLORS.warning
          }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {ingresoActivo.tipo_ingreso === 'FINALIZACION_JORNADA' ? 'Finalizando Jornada' : 'En Sede'}
              </Text>
              <View style={[styles.tipoBadge, {
                backgroundColor: ingresoActivo.tipo_ingreso === 'FINALIZACION_JORNADA' ? COLORS.danger : COLORS.warning
              }]}>
                <Text style={styles.tipoBadgeText}>
                  {ingresoActivo.tipo_ingreso?.replace(/_/g, ' ')}
                </Text>
              </View>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Sede:</Text>
                <Text style={styles.infoValue}>{ingresoActivo.sede_nombre}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ingreso:</Text>
                <Text style={styles.infoValue}>
                  {formatFecha(ingresoActivo.fecha_hora_ingreso)}
                </Text>
              </View>
              {ingresoActivo.km_ingreso && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Km Final:</Text>
                  <Text style={styles.infoValue}>{ingresoActivo.km_ingreso} km</Text>
                </View>
              )}
            </View>

            {/* Botones según tipo de ingreso */}
            {ingresoActivo.tipo_ingreso === 'FINALIZACION_JORNADA' ? (
              <View style={{ gap: 8 }}>
                <TouchableOpacity
                  style={[styles.cerrarButton, { backgroundColor: COLORS.danger }]}
                  onPress={handleFinalizarJornada}
                  disabled={finalizandoJornada}
                >
                  {finalizandoJornada ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.cerrarButtonText}>🏁 Finalizar Jornada</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cerrarButton, { backgroundColor: COLORS.primary }]}
                  onPress={() => navigation.navigate('Bitacora' as never)}
                >
                  <Text style={styles.cerrarButtonText}>📋 Ver Bitácora</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cerrarButton, { backgroundColor: COLORS.gray[500] }]}
                  onPress={() => navigation.navigate('SalidaDeSede' as never)}
                >
                  <Text style={styles.cerrarButtonText}>↩️ Salir de Sede (Cancelar)</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.cerrarButton, { backgroundColor: COLORS.success }]}
                onPress={() => navigation.navigate('SalidaDeSede' as never)}
              >
                <Text style={styles.cerrarButtonText}>Salir de Sede</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Card de Actividad Activa */}
        {actividadActiva && !situacionActiva && (
          <View style={[styles.card, styles.situacionActivaCard, { borderLeftColor: '#3b82f6' }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Actividad Activa</Text>
              <View style={[styles.tipoBadge, { backgroundColor: '#3b82f6' }]}>
                <Text style={styles.tipoBadgeText}>{actividadActiva.tipo_actividad_categoria}</Text>
              </View>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tipo:</Text>
                <Text style={styles.infoValue}>{actividadActiva.tipo_actividad_nombre}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Inicio:</Text>
                <Text style={styles.infoValue}>
                  {formatFecha(actividadActiva.created_at)}
                </Text>
              </View>
              {actividadActiva.ruta_codigo && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Ubicación:</Text>
                  <Text style={styles.infoValue}>
                    {actividadActiva.ruta_codigo} Km {actividadActiva.km || '-'}
                  </Text>
                </View>
              )}
              {actividadActiva.observaciones && (
                <View style={styles.descriptionRow}>
                  <Text style={styles.infoLabel}>Observaciones:</Text>
                  <Text style={styles.descripcionText}>{actividadActiva.observaciones}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[styles.cerrarButton]}
              onPress={handleCerrarActividad}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.cerrarButtonText}>Cerrar Actividad</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Card de Situación Activa */}
        {situacionActiva && situacionActiva.evento_persistente_id ? (
          // Card de Evento Persistente
          <View style={[styles.card, styles.situacionActivaCard, { borderLeftColor: COLORS.purple, backgroundColor: '#faf5ff' }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.cardTitle, { color: COLORS.purple }]}>Asignado a Evento</Text>
                <Text style={{ fontSize: 12, color: COLORS.text.secondary }}>{situacionActiva.evento_tipo}</Text>
              </View>
              <View style={[styles.tipoBadge, { backgroundColor: COLORS.purple }]}>
                <Text style={styles.tipoBadgeText}>{situacionActiva.estado}</Text>
              </View>
            </View>

            <View style={styles.cardContent}>
              <Text style={[styles.infoValue, { fontSize: 16, marginBottom: 8 }]}>
                {situacionActiva.evento_titulo}
              </Text>
              {situacionActiva.descripcion && (
                <Text style={[styles.descripcionText, { marginBottom: 12 }]}>
                  {situacionActiva.descripcion}
                </Text>
              )}

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ubicación:</Text>
                <Text style={styles.infoValue}>
                  {situacionActiva.ruta_codigo} Km {situacionActiva.km}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton, { marginTop: 12, backgroundColor: COLORS.purple }]}
                onPress={() => {
                  Alert.alert('Reportar', 'Funcionalidad de reporte rápido en desarrollo');
                  // navigation.navigate('ReportarEvento', { eventoId: situacionActiva.evento_persistente_id });
                }}
              >
                <Text style={styles.actionButtonText}>📝 Reportar Novedad</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ marginTop: 12, padding: 8, alignItems: 'center' }}
                onPress={handleCerrarSituacion}
              >
                <Text style={{ color: COLORS.danger }}>Finalizar Participación</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : situacionActiva ? (
          <TouchableOpacity
            style={[styles.card, styles.situacionActivaCard]}
            onPress={abrirEdicionSituacionActiva}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Situación Activa</Text>
              <View style={[
                styles.tipoBadge,
                { backgroundColor: getTipoSituacionColor(situacionActiva.tipo_situacion) }
              ]}>
                <Text style={styles.tipoBadgeText}>{situacionActiva.tipo_situacion}</Text>
              </View>
            </View>
            <View style={styles.cardContent}>
              {situacionActiva.tipo_situacion_nombre && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tipo:</Text>
                  <Text style={styles.infoValue}>{situacionActiva.tipo_situacion_nombre}</Text>
                </View>
              )}
              {situacionActiva.numero_situacion && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>No. Situación:</Text>
                  <Text style={styles.infoValue}>{situacionActiva.numero_situacion}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Inicio:</Text>
                <Text style={styles.infoValue}>
                  {formatFecha(situacionActiva.created_at)}
                </Text>
              </View>
              {situacionActiva.ruta_codigo && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Ubicación:</Text>
                  <Text style={styles.infoValue}>
                    {situacionActiva.ruta_codigo} Km {situacionActiva.km || '-'}
                  </Text>
                </View>
              )}
              {situacionActiva.observaciones && (
                <View style={styles.descriptionRow}>
                  <Text style={styles.infoLabel}>Observaciones:</Text>
                  <Text style={styles.descripcionText}>{situacionActiva.observaciones}</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 12, color: '#888', textAlign: 'center', marginBottom: 8 }}>
              Toca para editar o completar datos
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.cerrarButton, { flex: 1, backgroundColor: COLORS.primary || '#1e40af' }]}
                onPress={abrirEdicionSituacionActiva}
              >
                <Text style={styles.cerrarButtonText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cerrarButton, { flex: 1 }]}
                onPress={handleCerrarSituacion}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.cerrarButtonText}>Cerrar</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ) : !actividadActiva ? (
          <View style={styles.card}>
            <Text style={styles.noSituacionText}>
              No hay situación activa
            </Text>
          </View>
        ) : null}

        {/* Mensaje informativo cuando hay situación/actividad activa */}
        {tieneAlgoActivo && salidaActiva && !ingresoActivo && (
          <View style={[styles.helpBox, { borderLeftColor: COLORS.warning, backgroundColor: COLORS.warning + '15' }]}>
            <Text style={styles.helpText}>
              {actividadActiva && !situacionActiva
                ? '⚠️ Tienes una actividad activa. Ciérrala antes de reportar una nueva.'
                : '⚠️ Tienes una situación activa. Complétala o ciérrala antes de reportar una nueva.'}
            </Text>
          </View>
        )}

        {/* Botones de acción */}
        {salidaActiva && !ingresoActivo && (
          <View style={styles.actionsContainer}>
            {/* Sección Reportar Situación */}
            <View style={tieneAlgoActivo ? { opacity: 0.5 } : undefined}>
              <Text style={styles.actionsTitle}>Reportar Situación</Text>

              <TouchableOpacity
                style={[styles.actionButton, styles.incidenteButton]}
                onPress={() => navigation.navigate('Incidente' as never)}
                disabled={tieneAlgoActivo || !accesoInfo?.tiene_acceso}
              >
                <Text style={styles.actionButtonIcon}>🚗💥</Text>
                <Text style={styles.actionButtonText}>Hecho de Tránsito</Text>
                <Text style={styles.actionButtonSubtext}>Colisión, vuelco, atropello</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.asistenciaButton]}
                onPress={() => navigation.navigate('Asistencia' as never)}
                disabled={tieneAlgoActivo || !accesoInfo?.tiene_acceso}
              >
                <Text style={styles.actionButtonIcon}>🔧</Text>
                <Text style={styles.actionButtonText}>Asistencia Vial</Text>
                <Text style={styles.actionButtonSubtext}>Pinchazo, desperfectos, varado</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.emergenciaButton]}
                onPress={() => navigation.navigate('Emergencia' as never)}
                disabled={tieneAlgoActivo || !accesoInfo?.tiene_acceso}
              >
                <Text style={styles.actionButtonIcon}>⚠️</Text>
                <Text style={styles.actionButtonText}>Emergencia Vial</Text>
                <Text style={styles.actionButtonSubtext}>Derrumbe, inundación, caída</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => navigation.navigate('NuevaSituacion' as never)}
                disabled={tieneAlgoActivo || !accesoInfo?.tiene_acceso}
              >
                <Text style={styles.secondaryButtonText}>+ Otra Situación</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.separator} />

            {/* Sección Gestión de Jornada */}
            <View style={tieneAlgoActivo ? { opacity: 0.5 } : undefined}>
              <Text style={styles.actionsTitle}>Gestión de Jornada</Text>

              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => navigation.navigate('IngresoSede' as never)}
                disabled={tieneAlgoActivo}
              >
                <Text style={styles.secondaryButtonText}>🏢 Ingresar a Sede</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => setMostrarCambioRuta(true)}
                disabled={tieneAlgoActivo}
              >
                <Text style={styles.secondaryButtonText}>🔄 Cambio de Ruta</Text>
              </TouchableOpacity>
            </View>

            {/* Botones siempre activos */}
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => navigation.navigate('Relevo' as never)}
            >
              <Text style={styles.secondaryButtonText}>⚡ Registrar Relevo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => navigation.navigate('Bitacora' as never)}
            >
              <Text style={styles.secondaryButtonText}>📋 Ver Bitácora</Text>
            </TouchableOpacity>
          </View>
        )}


        {/* Modal de cambio de ruta */}
        {mostrarCambioRuta && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Cambiar Ruta</Text>
              <Text style={styles.modalSubtitle}>
                Ruta actual: {salidaActiva?.ruta_codigo || 'Sin ruta asignada'}
              </Text>

              <RutaSelector
                value={nuevaRutaId || undefined}
                onChange={(rutaId) => setNuevaRutaId(rutaId)}
                label="Nueva Ruta"
                required
                showSearch
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setMostrarCambioRuta(false);
                    setNuevaRutaId(null);
                  }}
                  disabled={cambiandoRuta}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={handleCambiarRuta}
                  disabled={!nuevaRutaId || cambiandoRuta}
                >
                  {cambiandoRuta ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonTextConfirm}>Confirmar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}


        {salidaHoy?.jornada_finalizada && (
          <View style={[styles.helpBox, { borderLeftColor: COLORS.success }]}>
            <Text style={styles.helpText}>
              Tu jornada de hoy ha sido completada. Revisa el resumen de tus actividades tocando el card de arriba.
            </Text>
          </View>
        )}
        {ingresoActivo && !ingresoActivo.es_ingreso_final && (
          <View style={styles.helpBox}>
            <Text style={styles.helpText}>
              Estas en sede. No puedes reportar situaciones hasta que registres la salida de sede.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingBottom: 80, // Add padding for bottom navigation/safe area
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: COLORS.text.inverse,
    opacity: 0.9,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoutButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  accesoIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 5,
  },
  accesoText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.white,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  situacionActivaCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  warningCard: {
    backgroundColor: COLORS.warning + '20',
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  tipoBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  tipoBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  descriptionRow: {
    marginTop: 8,
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
  descripcionText: {
    fontSize: 14,
    color: COLORS.text.primary,
    marginTop: 4,
    lineHeight: 20,
  },
  warningText: {
    padding: 16,
    fontSize: 16,
    color: COLORS.warning,
    textAlign: 'center',
    fontWeight: '500',
  },
  noSituacionText: {
    padding: 20,
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  cerrarButton: {
    backgroundColor: COLORS.danger,
    margin: 16,
    marginTop: 0,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cerrarButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  actionsContainer: {
    padding: 16,
    paddingTop: 8,
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  tertiaryButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.warning,
  },
  tertiaryButtonText: {
    color: COLORS.warning,
    fontSize: 16,
    fontWeight: '600',
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  incidenteButton: {
    backgroundColor: COLORS.danger,
  },
  asistenciaButton: {
    backgroundColor: COLORS.warning,
  },
  emergenciaButton: {
    backgroundColor: '#f97316', // Orange
  },
  actionButtonIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  actionButtonSubtext: {
    color: COLORS.white,
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
  },
  helpBox: {
    backgroundColor: COLORS.info + '20',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
  },
  helpText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButtonConfirm: {
    backgroundColor: COLORS.primary,
  },
  modalButtonTextCancel: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtonTextConfirm: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  // Estilos para el panel de asignación unificado
  asignacionCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  asignacionGrid: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  asignacionItem: {
    flex: 1,
    paddingRight: 8,
  },
  asignacionItemLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  asignacionItemValue: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  asignacionItemSubtext: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  asignacionFullRow: {
    marginBottom: 16,
  },
  companerosList: {
    marginTop: 8,
  },
  companeroItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  companeroNombre: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  companeroRol: {
    fontSize: 12,
    color: COLORS.text.secondary,
    backgroundColor: COLORS.info + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  // Estilos para el card de Sin Asignación
  noAsignacionCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.text.secondary,
    alignItems: 'center',
    padding: 24,
  },
  noAsignacionIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noAsignacionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  noAsignacionText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
