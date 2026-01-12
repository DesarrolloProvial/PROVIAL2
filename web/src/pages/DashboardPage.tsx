import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { incidentesAPI, situacionesAPI, turnosAPI } from '../services/api';
import { situacionesPersistentesAPI } from '../services/movimientos.service';
import type { Incidente } from '../types';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import ResumenUnidadesTable from '../components/ResumenUnidadesTable';
import { RefreshCw, Settings, X, Wifi, WifiOff, AlertTriangle, Crown, LogOut } from 'lucide-react';
import { useDashboardSocket } from '../hooks/useSocket';

// Fix para iconos de Leaflet en Vite
const createCustomIcon = (color: string) => {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
      <path fill="${color}" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.3 12.5 28.5 12.5 28.5S25 20.8 25 12.5C25 5.6 19.4 0 12.5 0zm0 18c-3 0-5.5-2.5-5.5-5.5S9.5 7 12.5 7s5.5 2.5 5.5 5.5S15.5 18 12.5 18z"/>
    </svg>
  `;

  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svgIcon)}`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

// Iconos para Incidentes
const iconReportado = createCustomIcon('#EF4444'); // Rojo
const iconEnAtencion = createCustomIcon('#F59E0B'); // Amarillo
const iconRegulacion = createCustomIcon('#3B82F6'); // Azul
const iconCerrado = createCustomIcon('#10B981'); // Verde

// Colores por sede para unidades en el mapa
const COLORES_SEDE: Record<number, string> = {
  1: '#3B82F6', // Central - Azul
  2: '#10B981', // Mazatenango - Verde
  3: '#F59E0B', // Poptún - Amarillo/Naranja
  4: '#8B5CF6', // San Cristóbal - Púrpura
  5: '#EC4899', // Quetzaltenango - Rosa
  6: '#14B8A6', // Coatepeque - Teal
  7: '#EF4444', // Palín - Rojo
  8: '#6366F1', // Morales - Indigo
  9: '#F97316', // Río Dulce - Naranja
};

// Función para obtener icono por sede
const getIconBySede = (sedeId: number | null) => {
  const color = sedeId ? (COLORES_SEDE[sedeId] || '#6B7280') : '#6B7280';
  return createCustomIcon(color);
};



// Icono de exclamación para situaciones persistentes
const createPersistenteIcon = () => {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="#DC2626" stroke="#fff" stroke-width="2"/>
      <text x="12" y="17" text-anchor="middle" fill="white" font-size="18" font-weight="bold">!</text>
    </svg>
  `;
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svgIcon)}`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

const persistenteIcon = createPersistenteIcon();

// Componente para actualizar el centro del mapa
function MapController({ center }: { center: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function DashboardPage() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedIncidente, setSelectedIncidente] = useState<Incidente | null>(null);
  const [selectedSituacion, setSelectedSituacion] = useState<any | null>(null);

  const [modoVista, setModoVista] = useState<'mapa' | 'tabla'>('mapa');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPanelConfig, setShowPanelConfig] = useState(false);
  const [panelConfig, setPanelConfig] = useState({
    bgColor: '#1e3a5f',
    textColor: '#ffffff',
    accentColor: '#3b82f6',
    fontSize: 'normal' as 'small' | 'normal' | 'large',
    columns: 4,
  });

  // WebSocket para actualizaciones en tiempo real
  const { isConnected: socketConnected, lastUpdate } = useDashboardSocket(queryClient);

  // Centro de Guatemala (CA-9 aprox)
  const defaultCenter: LatLngExpression = [14.6407, -90.5133];

  // Obtener incidentes activos
  // WebSocket actualiza automáticamente, polling solo como fallback cada 2 min si WS desconectado
  const { data: incidentes = [], isLoading: loadingIncidentes, isError: errorIncidentes, refetch: refetchIncidentes } = useQuery({
    queryKey: ['incidentes-activos'],
    queryFn: incidentesAPI.getActivos,
    refetchInterval: socketConnected ? false : 30000, // Sin polling si WS conectado
    retry: 2,
  });

  // Obtener situaciones activas
  const { data: situaciones = [], isLoading: loadingSituaciones, isError: errorSituaciones, refetch: refetchSituaciones } = useQuery({
    queryKey: ['situaciones-activas'],
    queryFn: situacionesAPI.getActivas,
    refetchInterval: socketConnected ? false : 30000,
    retry: 2,
  });

  // Obtener resumen de unidades
  const { data: resumenUnidades = [], isLoading: loadingResumen, isError: errorResumen, refetch: refetchResumen } = useQuery({
    queryKey: ['resumen-unidades'],
    queryFn: situacionesAPI.getResumenUnidades,
    refetchInterval: socketConnected ? false : 30000,
    retry: 2,
  });



  // Obtener situaciones persistentes activas (para el mapa)
  const { data: situacionesPersistentes = [] } = useQuery({
    queryKey: ['situaciones-persistentes-mapa'],
    queryFn: situacionesPersistentesAPI.getActivas,
    refetchInterval: 60000,
    retry: 2,
  });

  // Obtener asignaciones del turno de hoy
  const { data: turnoData, refetch: refetchTurno } = useQuery({
    queryKey: ['turno-hoy-dashboard'],
    queryFn: turnosAPI.getHoy,
    refetchInterval: socketConnected ? false : 30000,
    retry: 2,
  });

  const asignacionesTurno = turnoData?.asignaciones || [];

  const isLoading = loadingIncidentes || loadingSituaciones || loadingResumen;
  const hasError = errorIncidentes || errorSituaciones || errorResumen;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchIncidentes(),
        refetchSituaciones(),
        refetchResumen(),
        refetchTurno(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatLastUpdate = () => {
    return lastUpdate.toLocaleTimeString('es-GT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getIncidenteIcon = (estado: string) => {
    switch (estado) {
      case 'REPORTADO':
        return iconReportado;
      case 'EN_ATENCION':
        return iconEnAtencion;
      case 'REGULACION':
        return iconRegulacion;
      case 'CERRADO':
        return iconCerrado;
      default:
        return iconReportado;
    }
  };

  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'REPORTADO':
        return 'bg-red-100 text-red-800';
      case 'EN_ATENCION':
        return 'bg-yellow-100 text-yellow-800';
      case 'REGULACION':
        return 'bg-blue-100 text-blue-800';
      case 'CERRADO':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-96 bg-white shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-bold text-white">PROVIAL COP</h1>
            <div className="flex items-center gap-2">
              {/* Indicador de WebSocket */}
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${socketConnected
                    ? 'bg-green-500/20 text-green-100'
                    : 'bg-red-500/20 text-red-100'
                  }`}
                title={socketConnected ? 'Tiempo real activo' : 'Modo polling (reconectando...)'}
              >
                {socketConnected ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    <span>En vivo</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    <span>Polling</span>
                  </>
                )}
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition disabled:opacity-50"
                title="Recargar datos"
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => logout()}
                className="p-2 bg-white/20 hover:bg-red-500/50 text-white rounded-lg transition"
                title="Cerrar sesion"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
          <p className="text-blue-100 text-sm">Centro de Operaciones</p>
          <p className="text-blue-200 text-xs mt-1">
            Actualizado: {formatLastUpdate()}
            {socketConnected && <span className="ml-2 text-green-200">● WebSocket</span>}
          </p>
        </div>

        {/* Stats */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white p-2 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Incidentes</p>
              <p className="text-xl font-bold text-red-600">
                {incidentes.length}
              </p>
            </div>
            <div className="bg-white p-2 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Unidades</p>
              <p className="text-xl font-bold text-purple-600">
                {situaciones.length}
              </p>
            </div>
            <div className="bg-white p-2 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Con heridos</p>
              <p className="text-xl font-bold text-orange-600">
                {incidentes.filter((i) => i.hay_heridos).length}
              </p>
            </div>
          </div>
        </div>

        {/* Toggle Mapa/Tabla */}
        <div className="p-3 border-b border-gray-200 bg-white">
          <div className="flex gap-2">
            <button
              onClick={() => setModoVista('mapa')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${modoVista === 'mapa'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Mapa
            </button>
            <button
              onClick={() => setModoVista('tabla')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${modoVista === 'tabla'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Tabla
            </button>
          </div>
        </div>

        {/* Accesos rapidos */}
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 mb-2 font-medium">Accesos Rapidos</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate('/movimientos-brigadas')}
              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition flex items-center gap-1"
            >
              <span>Movimientos</span>
            </button>
            <button
              onClick={() => navigate('/situaciones-persistentes')}
              className="px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-xs font-medium transition flex items-center gap-1"
            >
              <span>Persistentes</span>
            </button>
            <button
              onClick={() => navigate('/cop/situaciones')}
              className="px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition flex items-center gap-1"
            >
              <span>Situaciones</span>
            </button>
          </div>
        </div>

        {/* Lista de Incidentes y Situaciones */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-800">
              Situación General
            </h2>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
              title="Actualizar"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoading && (
            <div className="text-center py-8 text-gray-500">
              Cargando datos...
            </div>
          )}

          {hasError && !isLoading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <span className="text-red-500 text-xl">⚠️</span>
                <div>
                  <h3 className="font-semibold text-red-800">Error al cargar datos</h3>
                  <p className="text-sm text-red-600 mt-1">
                    No se pudieron obtener algunos datos del servidor.
                    Verifica tu conexión e intenta de nuevo.
                  </p>
                  <button
                    onClick={handleRefresh}
                    className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !hasError && incidentes.length === 0 && situaciones.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay elementos activos
            </div>
          )}

          {/* Mostrar Incidentes */}
          {incidentes.map((incidente) => (
            <div
              key={incidente.id}
              onClick={() => setSelectedIncidente(incidente)}
              className={`bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer border-l-4 ${selectedIncidente?.id === incidente.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200'
                }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-semibold text-gray-800">
                  {incidente.numero_reporte || `#${incidente.id}`}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoBadgeColor(
                    incidente.estado
                  )}`}
                >
                  {incidente.estado}
                </span>
              </div>

              <p className="text-sm font-medium text-gray-700 mb-1">
                {incidente.tipo_hecho}
              </p>

              <div className="text-xs text-gray-600 space-y-1">
                <p>
                  📍 {incidente.ruta_codigo} Km {incidente.km}
                  {incidente.sentido && ` (${incidente.sentido})`}
                </p>
                {incidente.unidad_codigo && (
                  <p>🚓 {incidente.unidad_codigo}</p>
                )}
                {(incidente.hay_heridos || incidente.hay_fallecidos) && (
                  <p className="text-red-600 font-medium">
                    ⚠️ {incidente.cantidad_heridos} heridos
                    {incidente.hay_fallecidos &&
                      `, ${incidente.cantidad_fallecidos} fallecidos`}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Mostrar Situaciones */}
          {situaciones.map((situacion: any) => (
            <div
              key={`situacion-${situacion.id}`}
              onClick={() => {
                setSelectedSituacion(situacion);
                setSelectedIncidente(null);
              }}
              className={`bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer border-l-4 ${selectedSituacion?.id === situacion.id
                ? 'border-purple-500 bg-purple-50'
                : 'border-purple-200'
                }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-semibold text-gray-800">
                  🚓 {situacion.unidad_codigo || `Unidad #${situacion.unidad_id}`}
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {situacion.tipo_situacion?.replace(/_/g, ' ')}
                </span>
              </div>

              <p className="text-sm font-medium text-purple-700 mb-1">
                {situacion.descripcion || 'Sin descripción'}
              </p>

              <div className="text-xs text-gray-600 space-y-1">
                {situacion.ruta_codigo && (
                  <p>
                    📍 {situacion.ruta_codigo} Km {situacion.km}
                    {situacion.sentido && ` (${situacion.sentido})`}
                  </p>
                )}
                {situacion.turno_fecha && (
                  <p>📅 {new Date(situacion.turno_fecha).toLocaleDateString('es-GT')}</p>
                )}
                {situacion.observaciones && (
                  <p className="text-gray-500 italic text-xs mt-1">
                    {situacion.observaciones}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Área principal: Mapa o Tabla */}
      <div className="flex-1 relative">
        {modoVista === 'mapa' ? (
          <>
            <MapContainer
              center={defaultCenter}
              zoom={11}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapController center={defaultCenter} />

              {/* Marcadores de Incidentes */}
              {incidentes.map((incidente) => {
                if (!incidente.latitud || !incidente.longitud) return null;

                return (
                  <Marker
                    key={`incidente-${incidente.id}`}
                    position={[incidente.latitud, incidente.longitud]}
                    icon={getIncidenteIcon(incidente.estado)}
                    eventHandlers={{
                      click: () => setSelectedIncidente(incidente),
                    }}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <h3 className="font-bold text-lg mb-2">
                          {incidente.numero_reporte || `#${incidente.id}`}
                        </h3>
                        <p className="font-semibold text-gray-700 mb-2">
                          {incidente.tipo_hecho}
                        </p>
                        <div className="text-sm space-y-1">
                          <p>
                            📍 {incidente.ruta_codigo} Km {incidente.km}
                          </p>
                          <p>
                            Estado:{' '}
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoBadgeColor(
                                incidente.estado
                              )}`}
                            >
                              {incidente.estado}
                            </span>
                          </p>
                          {incidente.unidad_codigo && (
                            <p>🚓 {incidente.unidad_codigo}</p>
                          )}
                          {incidente.observaciones_iniciales && (
                            <p className="mt-2 text-gray-600">
                              {incidente.observaciones_iniciales}
                            </p>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Marcadores de Unidades (Resumen) - Muestra todas las unidades EN_SALIDA */}
              {resumenUnidades.map((unidad: any) => {
                // Convertir coordenadas de string a número
                const lat = unidad.latitud != null ? Number(unidad.latitud) : null;
                const lng = unidad.longitud != null ? Number(unidad.longitud) : null;

                if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;

                return (
                  <Marker
                    key={`unidad-${unidad.unidad_id}`}
                    position={[lat, lng]}
                    icon={getIconBySede(unidad.sede_id)}
                    eventHandlers={{
                      click: () => {
                        setSelectedSituacion(unidad);
                        setSelectedIncidente(null);
                      },
                    }}
                  >
                    <Popup>
                      <div className="p-2 min-w-[220px]">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORES_SEDE[unidad.sede_id] || '#6B7280' }}
                          />
                          <h3 className="font-bold text-lg" style={{ color: COLORES_SEDE[unidad.sede_id] || '#6B7280' }}>
                            🚓 {unidad.unidad_codigo || `Unidad #${unidad.unidad_id}`}
                          </h3>
                        </div>
                        {unidad.sede_nombre && (
                          <p className="text-xs text-gray-500 mb-2">
                            📍 Sede: {unidad.sede_nombre}
                          </p>
                        )}
                        {unidad.tipo_situacion && (
                          <p className="font-semibold text-gray-700 mb-2">
                            {unidad.tipo_situacion?.replace(/_/g, ' ')}
                          </p>
                        )}
                        <div className="text-sm space-y-1">
                          {unidad.ruta_codigo && (
                            <p>
                              🛣️ {unidad.ruta_codigo} Km {unidad.km}
                              {unidad.sentido && ` (${unidad.sentido})`}
                            </p>
                          )}
                          {unidad.situacion_estado && (
                            <p>
                              Estado Situación:{' '}
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                unidad.situacion_estado === 'ACTIVA'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {unidad.situacion_estado}
                              </span>
                            </p>
                          )}
                          {unidad.situacion_descripcion && (
                            <p className="mt-2 text-gray-700">
                              {unidad.situacion_descripcion}
                            </p>
                          )}
                          <div className="mt-3 pt-2 border-t border-gray-100">
                            <button
                              onClick={() => navigate(`/bitacora/${unidad.unidad_id}`)}
                              className="w-full flex items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold py-1.5 px-3 rounded text-sm transition"
                            >
                              📄 Ver Bitácora
                            </button>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}



              {/* Marcadores de Situaciones Persistentes (Extraordinarias) */}
              {situacionesPersistentes.map((sp: any) => {
                // Las situaciones persistentes no tienen latitud/longitud propias aún
                // pero podemos mostrarlas si la tienen
                if (!sp.latitud || !sp.longitud) return null;

                return (
                  <Marker
                    key={`persistente-${sp.id}`}
                    position={[sp.latitud, sp.longitud]}
                    icon={persistenteIcon}
                  >
                    <Popup>
                      <div className="p-2 min-w-[220px]">
                        <div className="flex items-start gap-2 mb-2">
                          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                          <div>
                            <h3 className="font-bold text-lg text-red-800">{sp.titulo}</h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${sp.importancia === 'CRITICA' ? 'bg-red-100 text-red-800' :
                                sp.importancia === 'ALTA' ? 'bg-orange-100 text-orange-800' :
                                  'bg-blue-100 text-blue-800'
                              }`}>
                              {sp.importancia}
                            </span>
                          </div>
                        </div>
                        <p className="font-semibold text-gray-700 mb-1">
                          {sp.tipo || 'Situacion Extraordinaria'}
                        </p>
                        <div className="text-sm space-y-1">
                          {sp.ruta_codigo && (
                            <p>📍 {sp.ruta_codigo} Km {sp.km_inicio}{sp.km_fin && ` - ${sp.km_fin}`}</p>
                          )}
                          {sp.descripcion && (
                            <p className="italic text-gray-600">{sp.descripcion}</p>
                          )}
                          <p className="font-medium text-gray-800">
                            {sp.unidades_asignadas_count || 0} Unidades asignadas
                          </p>
                          <div className="mt-3 pt-2 border-t border-gray-100">
                            <button
                              onClick={() => navigate('/situaciones-persistentes')}
                              className="w-full bg-red-50 text-red-700 hover:bg-red-100 font-semibold py-1.5 px-3 rounded text-sm transition flex items-center justify-center gap-2"
                            >
                              <AlertTriangle className="w-4 h-4" />
                              Ver Detalles
                            </button>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Leyenda de Colores por Sede */}
            <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000] max-h-48 overflow-y-auto">
              <h4 className="text-xs font-bold text-gray-600 mb-2 uppercase">Sedes</h4>
              <div className="space-y-1">
                {Object.entries(COLORES_SEDE).map(([sedeId, color]) => {
                  const sedeNames: Record<number, string> = {
                    1: 'Central',
                    2: 'Mazatenango',
                    3: 'Poptún',
                    4: 'San Cristóbal',
                    5: 'Quetzaltenango',
                    6: 'Coatepeque',
                    7: 'Palín',
                    8: 'Morales',
                    9: 'Río Dulce',
                  };
                  return (
                    <div key={sedeId} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-gray-700">{sedeNames[parseInt(sedeId)]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          // Vista de Tabla
          <div className="h-full overflow-auto p-4 bg-gray-50">
            <ResumenUnidadesTable
              resumen={resumenUnidades}
              onSelectUnidad={(unidadId) => {
                // Encontrar la unidad y centrar el mapa en ella
                const unidad = resumenUnidades.find((u: any) => u.unidad_id === unidadId);
                if (unidad) {
                  setModoVista('mapa');
                  // Aquí podrías agregar lógica para centrar el mapa
                }
              }}
            />
          </div>
        )}

        {/* NOTA: Vista de Paneles eliminada - solo Mapa y Tabla */}
        {false && (
          // Vista de Paneles - Unidades Asignadas en Pantalla Completa
          <div
            className="h-full overflow-auto relative"
            style={{ backgroundColor: panelConfig.bgColor }}
          >
            {/* Botón de configuración */}
            <button
              onClick={() => setShowPanelConfig(true)}
              className="absolute top-4 right-4 z-10 p-3 bg-white/20 hover:bg-white/30 rounded-full transition shadow-lg"
              title="Configurar paneles"
            >
              <Settings className="w-6 h-6" style={{ color: panelConfig.textColor }} />
            </button>

            {/* Header */}
            <div className="p-4 border-b" style={{ borderColor: `${panelConfig.textColor}20` }}>
              <div className="flex items-center justify-between">
                <div>
                  <h1
                    className="font-bold"
                    style={{
                      color: panelConfig.textColor,
                      fontSize: panelConfig.fontSize === 'small' ? '1.5rem' : panelConfig.fontSize === 'large' ? '2.5rem' : '2rem'
                    }}
                  >
                    ASIGNACIONES PENDIENTES
                  </h1>
                  <p style={{ color: `${panelConfig.textColor}80` }}>
                    {asignacionesTurno.length} unidades asignadas (hoy y pr&oacute;ximos d&iacute;as)
                  </p>
                </div>
                <div
                  className="text-right"
                  style={{ color: `${panelConfig.textColor}80` }}
                >
                  <p className="text-sm">Actualizado: {formatLastUpdate()}</p>
                </div>
              </div>
            </div>

            {/* Grid de Unidades */}
            <div
              className="p-4 grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${panelConfig.columns}, minmax(0, 1fr))`
              }}
            >
              {asignacionesTurno.length === 0 ? (
                <div
                  className="col-span-full text-center py-20"
                  style={{ color: panelConfig.textColor }}
                >
                  <p className="text-2xl font-semibold">No hay unidades asignadas para hoy</p>
                  <p className="mt-2 opacity-70">Las asignaciones aparecerán aquí cuando se creen</p>
                </div>
              ) : (
                asignacionesTurno.map((asig: any) => {
                  const fontSize = panelConfig.fontSize === 'small' ? 'text-sm' : panelConfig.fontSize === 'large' ? 'text-xl' : 'text-base';
                  const titleSize = panelConfig.fontSize === 'small' ? 'text-xl' : panelConfig.fontSize === 'large' ? 'text-4xl' : 'text-2xl';

                  // Determinar estado
                  let estado = 'PENDIENTE';
                  let estadoColor = '#6b7280';
                  if (asig.hora_salida_real && !asig.hora_entrada_real) {
                    estado = 'EN RUTA';
                    estadoColor = '#10b981';
                  } else if (asig.hora_entrada_real) {
                    estado = 'FINALIZADO';
                    estadoColor = '#3b82f6';
                  }

                  return (
                    <div
                      key={asig.asignacion_id || asig.id}
                      className="rounded-xl p-4 transition-all hover:scale-[1.02] cursor-pointer"
                      style={{
                        backgroundColor: `${panelConfig.accentColor}20`,
                        borderLeft: `4px solid ${panelConfig.accentColor}`,
                      }}
                      onClick={() => navigate(`/bitacora/${asig.unidad_id}`)}
                    >
                      {/* Código de Unidad */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h2
                            className={`${titleSize} font-bold`}
                            style={{ color: panelConfig.textColor }}
                          >
                            {asig.unidad_codigo || `U-${asig.unidad_id}`}
                          </h2>
                          {asig.fecha && (
                            <p className="text-xs opacity-70" style={{ color: panelConfig.textColor }}>
                              {new Date(asig.fecha).toLocaleDateString('es-GT', { weekday: 'short', day: 'numeric', month: 'short' })}
                              {asig.dia_salida === 'HOY' && ' (HOY)'}
                              {asig.dia_salida === 'MANANA' && ' (MAÑANA)'}
                            </p>
                          )}
                        </div>
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold uppercase"
                          style={{
                            backgroundColor: estadoColor,
                            color: '#fff'
                          }}
                        >
                          {estado}
                        </span>
                      </div>

                      {/* Info de Ruta */}
                      <div className={`${fontSize} space-y-2`} style={{ color: `${panelConfig.textColor}cc` }}>
                        {asig.ruta_codigo && (
                          <p className="flex items-center gap-2">
                            <span style={{ color: panelConfig.accentColor }}>Ruta:</span>
                            <span className="font-semibold">{asig.ruta_codigo}</span>
                          </p>
                        )}

                        {(asig.km_inicio || asig.km_final) && (
                          <p className="flex items-center gap-2">
                            <span style={{ color: panelConfig.accentColor }}>KM:</span>
                            <span className="font-semibold">{asig.km_inicio || '-'} - {asig.km_final || '-'}</span>
                          </p>
                        )}

                        {asig.sentido && (
                          <p className="flex items-center gap-2">
                            <span style={{ color: panelConfig.accentColor }}>Sentido:</span>
                            <span className="font-semibold">{asig.sentido}</span>
                          </p>
                        )}

                        {/* Tripulación */}
                        {asig.tripulacion && asig.tripulacion.length > 0 && (
                          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${panelConfig.textColor}20` }}>
                            <p style={{ color: panelConfig.accentColor }} className="text-xs uppercase font-semibold mb-1">Tripulación:</p>
                            {asig.tripulacion.slice(0, 3).map((t: any, idx: number) => (
                              <p key={idx} className="text-sm truncate flex items-center gap-1">
                                {t.es_comandante && (
                                  <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                )}
                                {t.nombre_completo || t.usuario_nombre || `Usuario ${t.usuario_id}`}
                                {t.rol_tripulacion && <span className="opacity-70"> ({t.rol_tripulacion})</span>}
                              </p>
                            ))}
                            {asig.tripulacion.length > 3 && (
                              <p className="text-xs opacity-60">+{asig.tripulacion.length - 3} más</p>
                            )}
                          </div>
                        )}

                        {/* Horario */}
                        <div className="mt-3 pt-3 flex justify-between items-center" style={{ borderTop: `1px solid ${panelConfig.textColor}20` }}>
                          <div>
                            <p className="text-xs opacity-60">Salida</p>
                            <p className="font-bold">{asig.hora_salida || '--:--'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs opacity-60">Entrada Est.</p>
                            <p className="font-bold">{asig.hora_entrada_estimada || '--:--'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal de Configuración */}
            {showPanelConfig && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-96 max-w-[90vw] shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Configurar Paneles</h3>
                    <button
                      onClick={() => setShowPanelConfig(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Color de Fondo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Color de Fondo
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={panelConfig.bgColor}
                          onChange={(e) => setPanelConfig({ ...panelConfig, bgColor: e.target.value })}
                          className="w-12 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={panelConfig.bgColor}
                          onChange={(e) => setPanelConfig({ ...panelConfig, bgColor: e.target.value })}
                          className="flex-1 px-3 py-2 border rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Color de Texto */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Color de Texto
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={panelConfig.textColor}
                          onChange={(e) => setPanelConfig({ ...panelConfig, textColor: e.target.value })}
                          className="w-12 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={panelConfig.textColor}
                          onChange={(e) => setPanelConfig({ ...panelConfig, textColor: e.target.value })}
                          className="flex-1 px-3 py-2 border rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Color de Acento */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Color de Acento
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={panelConfig.accentColor}
                          onChange={(e) => setPanelConfig({ ...panelConfig, accentColor: e.target.value })}
                          className="w-12 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={panelConfig.accentColor}
                          onChange={(e) => setPanelConfig({ ...panelConfig, accentColor: e.target.value })}
                          className="flex-1 px-3 py-2 border rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Tamaño de Fuente */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tamaño de Fuente
                      </label>
                      <div className="flex gap-2">
                        {(['small', 'normal', 'large'] as const).map((size) => (
                          <button
                            key={size}
                            onClick={() => setPanelConfig({ ...panelConfig, fontSize: size })}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${panelConfig.fontSize === size
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                          >
                            {size === 'small' ? 'Pequeña' : size === 'normal' ? 'Normal' : 'Grande'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Columnas */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Columnas: {panelConfig.columns}
                      </label>
                      <input
                        type="range"
                        min="2"
                        max="6"
                        value={panelConfig.columns}
                        onChange={(e) => setPanelConfig({ ...panelConfig, columns: parseInt(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>2</span>
                        <span>3</span>
                        <span>4</span>
                        <span>5</span>
                        <span>6</span>
                      </div>
                    </div>

                    {/* Presets */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Temas Predefinidos
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => setPanelConfig({
                            ...panelConfig,
                            bgColor: '#1e3a5f',
                            textColor: '#ffffff',
                            accentColor: '#3b82f6'
                          })}
                          className="p-2 rounded-lg border-2 hover:border-blue-500 transition"
                          style={{ backgroundColor: '#1e3a5f' }}
                        >
                          <span className="text-white text-xs">Azul</span>
                        </button>
                        <button
                          onClick={() => setPanelConfig({
                            ...panelConfig,
                            bgColor: '#1a1a2e',
                            textColor: '#eaeaea',
                            accentColor: '#e94560'
                          })}
                          className="p-2 rounded-lg border-2 hover:border-blue-500 transition"
                          style={{ backgroundColor: '#1a1a2e' }}
                        >
                          <span className="text-white text-xs">Oscuro</span>
                        </button>
                        <button
                          onClick={() => setPanelConfig({
                            ...panelConfig,
                            bgColor: '#f0f4f8',
                            textColor: '#1a202c',
                            accentColor: '#4299e1'
                          })}
                          className="p-2 rounded-lg border-2 hover:border-blue-500 transition"
                          style={{ backgroundColor: '#f0f4f8' }}
                        >
                          <span className="text-gray-800 text-xs">Claro</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowPanelConfig(false)}
                    className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Panel de detalles flotante */}
        {selectedIncidente && (
          <div className="absolute top-4 right-4 w-96 bg-white rounded-lg shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedIncidente.numero_reporte || `#${selectedIncidente.id}`}
                  </h2>
                  <p className="text-gray-600">{selectedIncidente.tipo_hecho}</p>
                </div>
                <button
                  onClick={() => setSelectedIncidente(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <svg
                    className="w-6 h-6 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getEstadoBadgeColor(
                      selectedIncidente.estado
                    )}`}
                  >
                    {selectedIncidente.estado}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">
                    Ubicación
                  </h3>
                  <p className="text-gray-800">
                    {selectedIncidente.ruta_codigo} Km {selectedIncidente.km}
                    {selectedIncidente.sentido && ` (${selectedIncidente.sentido})`}
                  </p>
                  {selectedIncidente.referencia_ubicacion && (
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedIncidente.referencia_ubicacion}
                    </p>
                  )}
                </div>

                {selectedIncidente.unidad_codigo && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">
                      Unidad Asignada
                    </h3>
                    <p className="text-gray-800">
                      🚓 {selectedIncidente.unidad_codigo}
                    </p>
                    {selectedIncidente.brigada_nombre && (
                      <p className="text-sm text-gray-600">
                        {selectedIncidente.brigada_nombre}
                      </p>
                    )}
                  </div>
                )}

                {(selectedIncidente.hay_heridos ||
                  selectedIncidente.hay_fallecidos) && (
                    <div className="bg-red-50 p-3 rounded-lg">
                      <h3 className="text-sm font-semibold text-red-800 mb-2">
                        ⚠️ Víctimas
                      </h3>
                      <div className="space-y-1 text-sm">
                        {selectedIncidente.hay_heridos && (
                          <p className="text-red-700">
                            🤕 {selectedIncidente.cantidad_heridos} heridos
                          </p>
                        )}
                        {selectedIncidente.hay_fallecidos && (
                          <p className="text-red-700">
                            💀 {selectedIncidente.cantidad_fallecidos} fallecidos
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                {selectedIncidente.observaciones_iniciales && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">
                      Observaciones
                    </h3>
                    <p className="text-gray-700 text-sm">
                      {selectedIncidente.observaciones_iniciales}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">
                    Hora de Reporte
                  </h3>
                  <p className="text-gray-700 text-sm">
                    {new Date(selectedIncidente.fecha_hora_aviso).toLocaleString(
                      'es-GT'
                    )}
                  </p>
                </div>

                <button
                  onClick={() => navigate(`/incidentes/${selectedIncidente.id}`)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Ver Detalles Completos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Panel de detalles de Situación */}
        {selectedSituacion && !selectedIncidente && (
          <div className="absolute top-4 right-4 w-96 bg-white rounded-lg shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-purple-700">
                    🚓 {selectedSituacion.unidad_codigo || `Unidad #${selectedSituacion.unidad_id}`}
                  </h2>
                  <p className="text-gray-600">{selectedSituacion.tipo_situacion?.replace(/_/g, ' ')}</p>
                </div>
                <button
                  onClick={() => setSelectedSituacion(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <svg
                    className="w-6 h-6 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    {selectedSituacion.estado || 'ACTIVA'}
                  </span>
                </div>

                {selectedSituacion.ruta_codigo && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">
                      Ubicación
                    </h3>
                    <p className="text-gray-800">
                      {selectedSituacion.ruta_codigo} Km {selectedSituacion.km}
                      {selectedSituacion.sentido && ` (${selectedSituacion.sentido})`}
                    </p>
                  </div>
                )}

                {selectedSituacion.descripcion && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">
                      Descripción
                    </h3>
                    <p className="text-gray-700 text-sm">
                      {selectedSituacion.descripcion}
                    </p>
                  </div>
                )}

                {selectedSituacion.observaciones && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">
                      Observaciones
                    </h3>
                    <p className="text-gray-700 text-sm">
                      {selectedSituacion.observaciones}
                    </p>
                  </div>
                )}

                {selectedSituacion.combustible !== null && selectedSituacion.combustible !== undefined && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">
                      Nivel de Combustible
                    </h3>
                    <p className="text-gray-800">{selectedSituacion.combustible}%</p>
                  </div>
                )}

                {selectedSituacion.kilometraje_unidad && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">
                      Kilometraje de Unidad
                    </h3>
                    <p className="text-gray-800">{selectedSituacion.kilometraje_unidad.toLocaleString()} km</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">
                    Hora de Registro
                  </h3>
                  <p className="text-gray-700 text-sm">
                    {new Date(selectedSituacion.created_at).toLocaleString('es-GT')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
