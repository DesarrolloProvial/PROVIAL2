import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { useSituacionesStore, SituacionCompleta } from '../../store/situacionesStore';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../constants/colors';
import { SITUACIONES_CONFIG, TipoSituacion } from '../../constants/situacionTypes';
import { useNavigation } from '@react-navigation/native';
import api, { ingresosAPI } from '../../services/api';

type RegistroBitacora = {
  tipo: 'SALIDA' | 'SITUACION' | 'INGRESO';
  id: number;
  created_at: string;
  data?: any;
};

export default function BitacoraScreen() {
  const navigation = useNavigation();
  const { situacionesHoy, fetchMisSituacionesHoy, cambiarTipoSituacion, isLoading } = useSituacionesStore();
  const { salidaActiva, refreshSalidaActiva } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<TipoSituacion | 'SALIDA' | 'INGRESO' | null>(null);
  const [ingresosHoy, setIngresosHoy] = useState<any[]>([]);

  // Modal de edición de salida
  const [modalEdicionSalidaVisible, setModalEdicionSalidaVisible] = useState(false);
  const [kmEdicionSalida, setKmEdicionSalida] = useState('');
  const [combustibleEdicionSalida, setCombustibleEdicionSalida] = useState<string>('');
  const [guardandoEdicionSalida, setGuardandoEdicionSalida] = useState(false);

  // Modal de edición de situación
  const [modalEdicionSituacionVisible, setModalEdicionSituacionVisible] = useState(false);
  const [situacionEditando, setSituacionEditando] = useState<SituacionCompleta | null>(null);
  const [descripcionEdicion, setDescripcionEdicion] = useState('');
  const [observacionesEdicion, setObservacionesEdicion] = useState('');
  const [kmEdicionSituacion, setKmEdicionSituacion] = useState('');
  const [guardandoEdicionSituacion, setGuardandoEdicionSituacion] = useState(false);

  // Modal de edición de ingreso
  const [modalEdicionIngresoVisible, setModalEdicionIngresoVisible] = useState(false);
  const [ingresoEditando, setIngresoEditando] = useState<any>(null);
  const [kmEdicionIngreso, setKmEdicionIngreso] = useState('');
  const [combustibleEdicionIngreso, setCombustibleEdicionIngreso] = useState<string>('');
  const [observacionesEdicionIngreso, setObservacionesEdicionIngreso] = useState('');
  const [guardandoEdicionIngreso, setGuardandoEdicionIngreso] = useState(false);

  // Modal de cambio de tipo situación
  const [modalCambioTipoVisible, setModalCambioTipoVisible] = useState(false);
  const [situacionCambiandoTipo, setSituacionCambiandoTipo] = useState<SituacionCompleta | null>(null);
  const [motivoCambioTipo, setMotivoCambioTipo] = useState('');
  const [guardandoCambioTipo, setGuardandoCambioTipo] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        fetchMisSituacionesHoy(),
        loadIngresos(),
      ]);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  };

  const loadIngresos = async () => {
    try {
      const response = await ingresosAPI.getMisIngresosHoy();
      setIngresosHoy(response.ingresos || []);
    } catch (error) {
      console.error('Error al cargar ingresos:', error);
      setIngresosHoy([]);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await refreshSalidaActiva();
    setRefreshing(false);
  };

  const abrirEdicionSalida = (salida: any) => {
    if (!salida) return;

    // Navegar a pantalla IniciarSalida en modo edición con los datos
    navigation.navigate('IniciarSalida' as never, {
      editMode: true,
      salidaData: salida,
    } as never);
  };

  const guardarEdicionSalida = async () => {
    try {
      setGuardandoEdicionSalida(true);

      const km_inicial = kmEdicionSalida ? parseInt(kmEdicionSalida) : undefined;
      const combustible_inicial_fraccion = combustibleEdicionSalida || undefined;

      if (!km_inicial && !combustible_inicial_fraccion) {
        Alert.alert('Error', 'Debes modificar al menos un campo');
        return;
      }

      await api.patch('/salidas/editar-datos-salida', {
        km_inicial,
        combustible_inicial_fraccion,
      });

      await refreshSalidaActiva();
      setModalEdicionSalidaVisible(false);
      Alert.alert('Éxito', 'Datos de salida actualizados correctamente');
    } catch (error: any) {
      console.error('Error al editar salida:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo actualizar la salida'
      );
    } finally {
      setGuardandoEdicionSalida(false);
    }
  };

  const abrirModalEdicionSituacion = (situacion: SituacionCompleta) => {
    console.log('[BITACORA] Abriendo edición de situación:', situacion);

    // Navegar a la pantalla correspondiente según el tipo de situación
    switch (situacion.tipo_situacion) {
      case 'INCIDENTE':
        navigation.navigate('Incidente' as never, {
          editMode: true,
          situacionId: situacion.id,
          incidenteId: situacion.incidente_id,
          situacionData: situacion
        } as never);
        return;

      case 'ASISTENCIA_VEHICULAR':
        navigation.navigate('Asistencia' as never, {
          editMode: true,
          situacionId: situacion.id,
          situacionData: situacion
        } as never);
        return;

      case 'EMERGENCIA':
        navigation.navigate('Emergencia' as never, {
          editMode: true,
          situacionId: situacion.id,
          situacionData: situacion
        } as never);
        return;

      case 'PATRULLAJE':
      case 'PARADA_ESTRATEGICA':
      case 'COMIDA':
      case 'DESCANSO':
      case 'REGULACION_TRAFICO':
      case 'OTROS':
        // Para estos tipos, navegar a NuevaSituacionScreen en modo edición
        navigation.navigate('NuevaSituacion' as never, {
          editMode: true,
          situacionId: situacion.id,
          situacionData: situacion
        } as never);
        return;

      default:
        // Para otros tipos (SALIDA_SEDE, CAMBIO_RUTA), usar el modal simple
        setSituacionEditando(situacion);
        setDescripcionEdicion(situacion.descripcion || '');
        setObservacionesEdicion(situacion.observaciones || '');
        setKmEdicionSituacion(situacion.km?.toString() || '');
        setModalEdicionSituacionVisible(true);
    }
  };

  const guardarEdicionSituacion = async () => {
    if (!situacionEditando) return;

    try {
      setGuardandoEdicionSituacion(true);

      await api.patch(`/situaciones/${situacionEditando.id}`, {
        descripcion: descripcionEdicion,
        observaciones: observacionesEdicion,
        km: kmEdicionSituacion ? parseFloat(kmEdicionSituacion) : undefined,
      });

      await fetchMisSituacionesHoy();
      setModalEdicionSituacionVisible(false);
      Alert.alert('Éxito', 'Situación actualizada correctamente');
    } catch (error: any) {
      console.error('Error al editar situación:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo actualizar la situación'
      );
    } finally {
      setGuardandoEdicionSituacion(false);
    }
  };

  // Funciones para edición de ingreso
  const abrirEdicionIngreso = (ingreso: any) => {
    if (!ingreso) return;

    // Navegar a pantalla IngresoSede en modo edición con los datos
    navigation.navigate('IngresoSede' as never, {
      editMode: true,
      ingresoData: ingreso,
    } as never);
  };

  const guardarEdicionIngreso = async () => {
    if (!ingresoEditando) return;

    try {
      setGuardandoEdicionIngreso(true);

      const data: any = {};
      if (kmEdicionIngreso) data.km_ingreso = parseFloat(kmEdicionIngreso);
      if (combustibleEdicionIngreso) data.combustible_fraccion = combustibleEdicionIngreso;
      if (observacionesEdicionIngreso !== undefined) data.observaciones_ingreso = observacionesEdicionIngreso;

      if (Object.keys(data).length === 0) {
        Alert.alert('Error', 'Debes modificar al menos un campo');
        return;
      }

      await api.patch(`/ingresos/${ingresoEditando.id}`, data);

      await loadIngresos();
      setModalEdicionIngresoVisible(false);
      Alert.alert('Éxito', 'Ingreso actualizado correctamente');
    } catch (error: any) {
      console.error('Error al editar ingreso:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo actualizar el ingreso'
      );
    } finally {
      setGuardandoEdicionIngreso(false);
    }
  };

  // Funciones para cambio de tipo de situación
  const abrirModalCambioTipo = (situacion: SituacionCompleta) => {
    // Solo permitir cambio entre INCIDENTE y ASISTENCIA_VEHICULAR
    if (situacion.tipo_situacion !== 'INCIDENTE' && situacion.tipo_situacion !== 'ASISTENCIA_VEHICULAR') {
      Alert.alert(
        'No permitido',
        'Solo se puede cambiar el tipo entre Incidente y Asistencia Vehicular'
      );
      return;
    }
    setSituacionCambiandoTipo(situacion);
    setMotivoCambioTipo('');
    setModalCambioTipoVisible(true);
  };

  const ejecutarCambioTipo = async () => {
    if (!situacionCambiandoTipo) return;

    const nuevoTipo: 'INCIDENTE' | 'ASISTENCIA_VEHICULAR' =
      situacionCambiandoTipo.tipo_situacion === 'INCIDENTE' ? 'ASISTENCIA_VEHICULAR' : 'INCIDENTE';

    try {
      setGuardandoCambioTipo(true);
      await cambiarTipoSituacion(situacionCambiandoTipo.id, nuevoTipo, motivoCambioTipo || undefined);
      setModalCambioTipoVisible(false);
      Alert.alert(
        'Tipo Cambiado',
        `La situación ahora es de tipo ${nuevoTipo === 'INCIDENTE' ? 'Incidente' : 'Asistencia Vehicular'}`
      );
    } catch (error: any) {
      console.error('Error al cambiar tipo:', error);
      Alert.alert(
        'Error',
        error.message || 'No se pudo cambiar el tipo de situación'
      );
    } finally {
      setGuardandoCambioTipo(false);
    }
  };

  const getTipoColor = (tipo: TipoSituacion) => {
    return SITUACIONES_CONFIG[tipo]?.color || COLORS.primary;
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-GT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuracion = (inicio: string, fin?: string) => {
    const start = new Date(inicio);
    const end = fin ? new Date(fin) : new Date();
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Combinar salida, situaciones e ingresos en un solo array
  const registrosBitacora: RegistroBitacora[] = React.useMemo(() => {
    const registros: RegistroBitacora[] = [];

    // Agregar salida si existe
    if (salidaActiva) {
      registros.push({
        tipo: 'SALIDA',
        id: salidaActiva.id,
        created_at: salidaActiva.fecha_hora_salida,
        data: salidaActiva,
      });
    }

    // Agregar situaciones
    situacionesHoy.forEach((situacion) => {
      registros.push({
        tipo: 'SITUACION',
        id: situacion.id,
        created_at: situacion.created_at,
        data: situacion,
      });
    });

    // Agregar ingresos a sede
    ingresosHoy.forEach((ingreso) => {
      registros.push({
        tipo: 'INGRESO',
        id: ingreso.id,
        created_at: ingreso.fecha_hora_ingreso,
        data: ingreso,
      });
    });

    // Ordenar por fecha (más reciente primero)
    return registros.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [salidaActiva, situacionesHoy, ingresosHoy]);

  const registrosFiltrados = filtroTipo
    ? registrosBitacora.filter((r) => {
      if (filtroTipo === 'SALIDA') return r.tipo === 'SALIDA';
      if (filtroTipo === 'INGRESO') return r.tipo === 'INGRESO';
      return r.tipo === 'SITUACION' && r.data.tipo_situacion === filtroTipo;
    })
    : registrosBitacora;

  const renderSalidaCard = (salida: any) => {
    // La vista v_mi_salida_activa usa km_inicial y combustible_inicial
    const kmSalida = salida.km_inicial || salida.km_salida;
    const combustibleDecimal = salida.combustible_inicial || salida.combustible_salida;

    // Convertir decimal a fraccion para mostrar
    let combustibleFraccion = '-';
    if (combustibleDecimal !== null && combustibleDecimal !== undefined) {
      if (combustibleDecimal >= 1) combustibleFraccion = 'LLENO';
      else if (combustibleDecimal >= 0.75) combustibleFraccion = '3/4';
      else if (combustibleDecimal >= 0.5) combustibleFraccion = '1/2';
      else if (combustibleDecimal >= 0.25) combustibleFraccion = '1/4';
      else combustibleFraccion = 'VACIO';
    }

    const combustiblePorcentaje = combustibleDecimal !== null && combustibleDecimal !== undefined
      ? `${Math.round(combustibleDecimal * 100)}%`
      : '-';

    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftWidth: 4, borderLeftColor: COLORS.primary }]}
        onPress={() => abrirEdicionSalida(salida)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.tipoBadge, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.tipoBadgeText}>SALIDA DE UNIDAD</Text>
            </View>
          </View>
          <Text style={styles.numeroSituacion}>🚗 {salida.unidad_codigo || '-'}</Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hora de Salida:</Text>
            <Text style={styles.infoValue}>{formatFecha(salida.fecha_hora_salida)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kilometraje:</Text>
            <Text style={styles.infoValue}>{kmSalida || '-'} km</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Combustible:</Text>
            <Text style={styles.infoValue}>{combustibleFraccion} ({combustiblePorcentaje})</Text>
          </View>

          {salida.ruta_codigo && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ruta:</Text>
              <Text style={styles.infoValue}>{salida.ruta_codigo}</Text>
            </View>
          )}

          {salida.observaciones_salida && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descripcionText} numberOfLines={2}>
                {salida.observaciones_salida}
              </Text>
            </View>
          )}

          <View style={[styles.descriptionContainer, { marginTop: 8, paddingTop: 8, backgroundColor: COLORS.background }]}>
            <Text style={[styles.infoLabel, { fontSize: 12, color: COLORS.text.disabled }]}>
              Toca para editar kilometraje o combustible
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSituacionCard = ({ item }: { item: SituacionCompleta }) => {
    const config = SITUACIONES_CONFIG[item.tipo_situacion];
    const isActiva = item.estado === 'ACTIVA';

    // Determinar si mostrar campos adicionales (INCIDENTE, ASISTENCIA_VEHICULAR, OBSTACULO/EMERGENCIA)
    const mostrarCamposAdicionales = ['INCIDENTE', 'ASISTENCIA_VEHICULAR', 'OBSTACULO'].includes(item.tipo_situacion);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isActiva && { borderLeftWidth: 4, borderLeftColor: COLORS.success },
        ]}
        onPress={() => abrirModalEdicionSituacion(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View
              style={[styles.tipoBadge, { backgroundColor: getTipoColor(item.tipo_situacion) }]}
            >
              <Text style={styles.tipoBadgeText}>{config?.label || item.tipo_situacion}</Text>
            </View>
            {isActiva && (
              <View style={[styles.estadoBadge, { backgroundColor: COLORS.success }]}>
                <Text style={styles.estadoBadgeText}>ACTIVA</Text>
              </View>
            )}
          </View>
          {item.numero_situacion && (
            <Text style={styles.numeroSituacion}>{item.numero_situacion}</Text>
          )}
        </View>

        <View style={styles.cardContent}>
          {/* Tipo específico del catálogo (Choque, Calentamiento, Derrumbe, etc.) */}
          {mostrarCamposAdicionales && item.tipo_situacion_nombre && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipo:</Text>
              <Text style={[styles.infoValue, { color: getTipoColor(item.tipo_situacion) }]}>
                {item.tipo_situacion_nombre}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Inicio:</Text>
            <Text style={styles.infoValue}>{formatFecha(item.created_at)}</Text>
          </View>

          {!isActiva && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Duración:</Text>
              <Text style={styles.infoValue}>
                {formatDuracion(item.created_at, item.updated_at)}
              </Text>
            </View>
          )}

          {item.ruta_codigo && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ubicación:</Text>
              <Text style={styles.infoValue}>
                {item.ruta_codigo} {item.km ? `Km ${item.km}` : ''}
              </Text>
            </View>
          )}

          {/* Material de vía (tipo_pavimento) */}
          {mostrarCamposAdicionales && item.tipo_pavimento && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Material Vía:</Text>
              <Text style={styles.infoValue}>{item.tipo_pavimento}</Text>
            </View>
          )}

          {/* Clima */}
          {mostrarCamposAdicionales && item.clima && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Clima:</Text>
              <Text style={styles.infoValue}>{item.clima}</Text>
            </View>
          )}

          {/* Área */}
          {mostrarCamposAdicionales && item.area && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Área:</Text>
              <Text style={styles.infoValue}>{item.area}</Text>
            </View>
          )}

          {!!item.descripcion && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descripcionText} numberOfLines={2}>
                {item.descripcion}
              </Text>
            </View>
          )}

          {/* Botón para cambiar tipo (solo INCIDENTE <-> ASISTENCIA_VEHICULAR) */}
          {(item.tipo_situacion === 'INCIDENTE' || item.tipo_situacion === 'ASISTENCIA_VEHICULAR') && (
            <TouchableOpacity
              style={styles.cambiarTipoButton}
              onPress={(e) => {
                e.stopPropagation();
                abrirModalCambioTipo(item);
              }}
            >
              <Text style={styles.cambiarTipoButtonText}>
                Cambiar a {item.tipo_situacion === 'INCIDENTE' ? 'Asistencia' : 'Incidente'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderIngresoCard = (ingreso: any) => {
    const tieneHoraSalida = !!ingreso.fecha_hora_salida;
    const esFinal = ingreso.es_ingreso_final;

    // Determinar color según tipo
    const getColorIngreso = (tipo: string) => {
      switch (tipo) {
        case 'COMBUSTIBLE': return '#f59e0b';
        case 'ALMUERZO': return '#10b981';
        case 'MANTENIMIENTO': return '#6b7280';
        case 'COMISION': return '#3b82f6';
        case 'APOYO': return '#8b5cf6';
        case 'FINALIZACION_JORNADA':
        case 'FINALIZAR_JORNADA':
        case 'FINALIZACION': return '#dc2626';
        default: return COLORS.primary;
      }
    };

    const getIconIngreso = (tipo: string) => {
      switch (tipo) {
        case 'COMBUSTIBLE': return '⛽';
        case 'ALMUERZO': return '🍽️';
        case 'MANTENIMIENTO': return '🔧';
        case 'COMISION': return '📋';
        case 'APOYO': return '🤝';
        case 'FINALIZACION_JORNADA':
        case 'FINALIZAR_JORNADA':
        case 'FINALIZACION': return '🏁';
        default: return '🏢';
      }
    };

    const colorIngreso = getColorIngreso(ingreso.tipo_ingreso);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { borderLeftWidth: 4, borderLeftColor: colorIngreso }
        ]}
        onPress={() => abrirEdicionIngreso(ingreso)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.tipoBadge, { backgroundColor: colorIngreso }]}>
              <Text style={styles.tipoBadgeText}>
                {getIconIngreso(ingreso.tipo_ingreso)} INGRESO A SEDE
              </Text>
            </View>
            {esFinal && (
              <View style={[styles.estadoBadge, { backgroundColor: '#dc2626' }]}>
                <Text style={styles.estadoBadgeText}>FINAL</Text>
              </View>
            )}
            {!esFinal && !tieneHoraSalida && (
              <View style={[styles.estadoBadge, { backgroundColor: COLORS.warning }]}>
                <Text style={styles.estadoBadgeText}>EN SEDE</Text>
              </View>
            )}
          </View>
          <Text style={styles.numeroSituacion}>
            {ingreso.sede_nombre || ingreso.sede_codigo || 'Sede'}
          </Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Motivo:</Text>
            <Text style={[styles.infoValue, { color: colorIngreso }]}>
              {ingreso.tipo_ingreso?.replace(/_/g, ' ')}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hora Ingreso:</Text>
            <Text style={styles.infoValue}>{formatFecha(ingreso.fecha_hora_ingreso)}</Text>
          </View>

          {tieneHoraSalida && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Hora Salida:</Text>
              <Text style={styles.infoValue}>{formatFecha(ingreso.fecha_hora_salida)}</Text>
            </View>
          )}

          {tieneHoraSalida && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Duración:</Text>
              <Text style={styles.infoValue}>
                {formatDuracion(ingreso.fecha_hora_ingreso, ingreso.fecha_hora_salida)}
              </Text>
            </View>
          )}

          {ingreso.km_ingreso && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Km Ingreso:</Text>
              <Text style={styles.infoValue}>{ingreso.km_ingreso} km</Text>
            </View>
          )}

          {ingreso.combustible_ingreso !== null && ingreso.combustible_ingreso !== undefined && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Combustible:</Text>
              <Text style={styles.infoValue}>
                {Math.round(ingreso.combustible_ingreso * 100)}%
              </Text>
            </View>
          )}

          {ingreso.observaciones_ingreso && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descripcionText} numberOfLines={2}>
                {ingreso.observaciones_ingreso}
              </Text>
            </View>
          )}

          <Text style={{ textAlign: 'center', color: COLORS.info, marginTop: 8, fontSize: 11 }}>
            Toca para editar
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRegistroCard = ({ item }: { item: RegistroBitacora }) => {
    if (item.tipo === 'SALIDA') {
      return renderSalidaCard(item.data);
    }
    if (item.tipo === 'INGRESO') {
      return renderIngresoCard(item.data);
    }
    return renderSituacionCard({ item: item.data });
  };

  const renderFiltros = () => {
    // Obtener tipos únicos de las situaciones del día
    const tiposDisponibles = Array.from(
      new Set(situacionesHoy.map((s) => s.tipo_situacion))
    ) as TipoSituacion[];

    return (
      <View style={styles.filtrosContainer}>
        <TouchableOpacity
          style={[
            styles.filtroButton,
            !filtroTipo && styles.filtroButtonSelected,
          ]}
          onPress={() => setFiltroTipo(null)}
        >
          <Text
            style={[
              styles.filtroButtonText,
              !filtroTipo && styles.filtroButtonTextSelected,
            ]}
          >
            Todos ({registrosBitacora.length})
          </Text>
        </TouchableOpacity>

        {/* Filtro para salida */}
        {salidaActiva && (
          <TouchableOpacity
            style={[
              styles.filtroButton,
              filtroTipo === 'SALIDA' && {
                backgroundColor: COLORS.primary,
                borderColor: COLORS.primary,
              },
            ]}
            onPress={() => setFiltroTipo('SALIDA')}
          >
            <Text
              style={[
                styles.filtroButtonText,
                filtroTipo === 'SALIDA' && styles.filtroButtonTextSelected,
              ]}
            >
              Salida (1)
            </Text>
          </TouchableOpacity>
        )}

        {/* Filtro para ingresos a sede */}
        {ingresosHoy.length > 0 && (
          <TouchableOpacity
            style={[
              styles.filtroButton,
              filtroTipo === 'INGRESO' && {
                backgroundColor: '#f59e0b',
                borderColor: '#f59e0b',
              },
            ]}
            onPress={() => setFiltroTipo('INGRESO')}
          >
            <Text
              style={[
                styles.filtroButtonText,
                filtroTipo === 'INGRESO' && styles.filtroButtonTextSelected,
              ]}
            >
              Ingresos ({ingresosHoy.length})
            </Text>
          </TouchableOpacity>
        )}

        {tiposDisponibles.map((tipo) => {
          const config = SITUACIONES_CONFIG[tipo];
          const count = situacionesHoy.filter((s) => s.tipo_situacion === tipo).length;

          return (
            <TouchableOpacity
              key={tipo}
              style={[
                styles.filtroButton,
                filtroTipo === tipo && {
                  backgroundColor: config.color,
                  borderColor: config.color,
                },
              ]}
              onPress={() => setFiltroTipo(tipo)}
            >
              <Text
                style={[
                  styles.filtroButtonText,
                  filtroTipo === tipo && styles.filtroButtonTextSelected,
                ]}
              >
                {config.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        {filtroTipo
          ? 'No hay registros de este tipo hoy'
          : 'No hay registros para hoy'}
      </Text>
      <Text style={styles.emptyStateSubtext}>
        {!salidaActiva
          ? 'Inicia una salida de unidad para comenzar el registro'
          : 'Las situaciones que reportes aparecerán aquí'}
      </Text>
    </View>
  );

  if (isLoading && registrosBitacora.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando bitácora...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con resumen */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bitácora de Hoy</Text>
        <Text style={styles.headerSubtitle}>
          {registrosBitacora.length} registro{registrosBitacora.length !== 1 ? 's' : ''}
          {salidaActiva && ` • Salida: ${formatFecha(salidaActiva.fecha_hora_salida)}`}
        </Text>
      </View>

      {/* Filtros */}
      {registrosBitacora.length > 0 && renderFiltros()}

      {/* Lista de registros (salida + situaciones) */}
      <FlatList
        data={registrosFiltrados}
        keyExtractor={(item) => `${item.tipo}-${item.id}`}
        renderItem={renderRegistroCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
      />

      {/* Modal de edición de salida */}
      <Modal
        visible={modalEdicionSalidaVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalEdicionSalidaVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalEdicionSalidaVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Editar Salida de Unidad</Text>

            {/* Kilometraje */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Kilometraje Inicial</Text>
              <TextInput
                style={styles.input}
                value={kmEdicionSalida}
                onChangeText={setKmEdicionSalida}
                keyboardType="number-pad"
                placeholder="Ingresa el kilometraje"
                placeholderTextColor={COLORS.text.disabled}
              />
            </View>

            {/* Combustible */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Combustible Inicial</Text>
              <View style={styles.combustibleButtons}>
                {['VACIO', '1/4', '1/2', '3/4', 'LLENO'].map((nivel) => (
                  <TouchableOpacity
                    key={nivel}
                    style={[
                      styles.combustibleButton,
                      combustibleEdicionSalida === nivel && styles.combustibleButtonSelected,
                    ]}
                    onPress={() => setCombustibleEdicionSalida(nivel)}
                  >
                    <Text
                      style={[
                        styles.combustibleButtonText,
                        combustibleEdicionSalida === nivel && styles.combustibleButtonTextSelected,
                      ]}
                    >
                      {nivel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Botones */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalEdicionSalidaVisible(false)}
                disabled={guardandoEdicionSalida}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={guardarEdicionSalida}
                disabled={guardandoEdicionSalida}
              >
                {guardandoEdicionSalida ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.modalButtonTextSave}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal de edición de situación */}
      <Modal
        visible={modalEdicionSituacionVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalEdicionSituacionVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalEdicionSituacionVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              Editar Situación {situacionEditando?.numero_situacion || ''}
            </Text>

            {/* Kilometraje */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Kilometraje</Text>
              <TextInput
                style={styles.input}
                value={kmEdicionSituacion}
                onChangeText={setKmEdicionSituacion}
                keyboardType="numeric"
                placeholder="Ej: 125.5"
                placeholderTextColor={COLORS.text.disabled}
              />
            </View>

            {/* Descripción */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={descripcionEdicion}
                onChangeText={setDescripcionEdicion}
                multiline
                numberOfLines={3}
                placeholder="Describe la situación..."
                placeholderTextColor={COLORS.text.disabled}
              />
            </View>

            {/* Observaciones */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Observaciones</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={observacionesEdicion}
                onChangeText={setObservacionesEdicion}
                multiline
                numberOfLines={3}
                placeholder="Observaciones adicionales..."
                placeholderTextColor={COLORS.text.disabled}
              />
            </View>

            {/* Botones */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalEdicionSituacionVisible(false)}
                disabled={guardandoEdicionSituacion}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={guardarEdicionSituacion}
                disabled={guardandoEdicionSituacion}
              >
                {guardandoEdicionSituacion ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.modalButtonTextSave}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal de edición de ingreso */}
      <Modal
        visible={modalEdicionIngresoVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalEdicionIngresoVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalEdicionIngresoVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Editar Ingreso a Sede</Text>

            {/* Tipo de ingreso (solo informativo) */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Tipo de Ingreso</Text>
              <Text style={[styles.input, { paddingVertical: 14, color: COLORS.text.secondary }]}>
                {ingresoEditando?.tipo_ingreso?.replace(/_/g, ' ') || '-'}
              </Text>
            </View>

            {/* Kilometraje */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Kilometraje</Text>
              <TextInput
                style={styles.input}
                value={kmEdicionIngreso}
                onChangeText={setKmEdicionIngreso}
                keyboardType="number-pad"
                placeholder="Ingresa el kilometraje"
                placeholderTextColor={COLORS.text.disabled}
              />
            </View>

            {/* Combustible */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Combustible</Text>
              <View style={styles.combustibleButtons}>
                {['VACIO', '1/4', '1/2', '3/4', 'LLENO'].map((nivel) => (
                  <TouchableOpacity
                    key={nivel}
                    style={[
                      styles.combustibleButton,
                      combustibleEdicionIngreso === nivel && styles.combustibleButtonSelected,
                    ]}
                    onPress={() => setCombustibleEdicionIngreso(nivel)}
                  >
                    <Text
                      style={[
                        styles.combustibleButtonText,
                        combustibleEdicionIngreso === nivel && styles.combustibleButtonTextSelected,
                      ]}
                    >
                      {nivel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Observaciones */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Observaciones</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={observacionesEdicionIngreso}
                onChangeText={setObservacionesEdicionIngreso}
                multiline
                numberOfLines={3}
                placeholder="Observaciones..."
                placeholderTextColor={COLORS.text.disabled}
              />
            </View>

            {/* Botones */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalEdicionIngresoVisible(false)}
                disabled={guardandoEdicionIngreso}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={guardarEdicionIngreso}
                disabled={guardandoEdicionIngreso}
              >
                {guardandoEdicionIngreso ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.modalButtonTextSave}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal de cambio de tipo de situación */}
      <Modal
        visible={modalCambioTipoVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalCambioTipoVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalCambioTipoVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Cambiar Tipo de Situación</Text>

            {situacionCambiandoTipo && (
              <>
                {/* Información actual */}
                <View style={[styles.inputContainer, { marginBottom: 16 }]}>
                  <Text style={styles.inputLabel}>Tipo actual:</Text>
                  <View style={[
                    styles.tipoBadge,
                    { backgroundColor: getTipoColor(situacionCambiandoTipo.tipo_situacion), alignSelf: 'flex-start', marginTop: 8 }
                  ]}>
                    <Text style={styles.tipoBadgeText}>
                      {SITUACIONES_CONFIG[situacionCambiandoTipo.tipo_situacion]?.label || situacionCambiandoTipo.tipo_situacion}
                    </Text>
                  </View>
                </View>

                {/* Nuevo tipo */}
                <View style={[styles.inputContainer, { marginBottom: 16 }]}>
                  <Text style={styles.inputLabel}>Se cambiará a:</Text>
                  <View style={[
                    styles.tipoBadge,
                    {
                      backgroundColor: getTipoColor(
                        situacionCambiandoTipo.tipo_situacion === 'INCIDENTE' ? 'ASISTENCIA_VEHICULAR' : 'INCIDENTE'
                      ),
                      alignSelf: 'flex-start',
                      marginTop: 8
                    }
                  ]}>
                    <Text style={styles.tipoBadgeText}>
                      {situacionCambiandoTipo.tipo_situacion === 'INCIDENTE' ? 'Asistencia Vehicular' : 'Incidente'}
                    </Text>
                  </View>
                </View>

                {/* Motivo (opcional) */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Motivo del cambio (opcional)</Text>
                  <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    value={motivoCambioTipo}
                    onChangeText={setMotivoCambioTipo}
                    multiline
                    numberOfLines={3}
                    placeholder="Explica por qué cambias el tipo..."
                    placeholderTextColor={COLORS.text.disabled}
                  />
                </View>
              </>
            )}

            {/* Botones */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalCambioTipoVisible(false)}
                disabled={guardandoCambioTipo}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave, { backgroundColor: COLORS.warning }]}
                onPress={ejecutarCambioTipo}
                disabled={guardandoCambioTipo}
              >
                {guardandoCambioTipo ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.modalButtonTextSave}>Cambiar Tipo</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
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
  header: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  filtrosContainer: {
    backgroundColor: COLORS.white,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filtroButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filtroButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filtroButtonText: {
    fontSize: 13,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  filtroButtonTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
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
  estadoBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  estadoBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  numeroSituacion: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  cardContent: {
    padding: 12,
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
  descriptionContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  descripcionText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.text.disabled,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    minHeight: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text.primary,
    backgroundColor: COLORS.white,
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  combustibleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  combustibleButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  combustibleButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  combustibleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  combustibleButtonTextSelected: {
    color: COLORS.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButtonSave: {
    backgroundColor: COLORS.primary,
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  modalButtonTextSave: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  cambiarTipoButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.warning + '20',
    borderWidth: 1,
    borderColor: COLORS.warning,
    borderRadius: 8,
    alignItems: 'center',
  },
  cambiarTipoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.warning,
  },
});
