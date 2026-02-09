import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { situacionesAPI } from '../services/api';
import { situacionesPersistentesAPI } from '../services/movimientos.service';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Wifi, WifiOff, AlertTriangle, Layers, Filter, X, LogOut, Search } from 'lucide-react';
import { useDashboardSocket } from '../hooks/useSocket';
import ResumenUnidadesTable from '../components/ResumenUnidadesTable';
import SituacionIcon from '../components/SituacionIcon';
import { useAuthStore } from '../store/authStore';

// Fix para iconos de Leaflet
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

// Colores por sede
const COLORES_SEDE: Record<number, string> = {
  1: '#3B82F6',
  2: '#10B981',
  3: '#F59E0B',
  4: '#8B5CF6',
  5: '#EC4899',
  6: '#14B8A6',
  7: '#EF4444',
  8: '#6366F1',
  9: '#F97316',
};

const SEDES_NOMBRES: Record<number, string> = {
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

const getIconBySede = (sedeId: number | null) => {
  const color = sedeId ? (COLORES_SEDE[sedeId] || '#6B7280') : '#6B7280';
  return createCustomIcon(color);
};



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

function MapController({ center, zoom }: { center: LatLngExpression; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (zoom) {
      map.setView(center, zoom);
    } else {
      map.setView(center, map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

export default function COPMapaPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [modoVista, setModoVista] = useState<'mapa' | 'tabla'>('mapa');
  const [selectedUnidad, setSelectedUnidad] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState({
    unidades: true,
    persistentes: true,
    soloActivas: false, // Si true, solo muestra situaciones ACTIVAS
    sedes: [] as number[],
  });

  const { isConnected: socketConnected, lastUpdate } = useDashboardSocket(queryClient);
  const defaultCenter: LatLngExpression = [14.6407, -90.5133];

  // Query principal: Resumen de unidades (última situación por unidad activa en patrullaje)
  const { data: resumenUnidades = [], refetch: refetchResumen, isLoading: loadingResumen, isError: errorResumen } = useQuery({
    queryKey: ['resumen-unidades'],
    queryFn: async () => {
      const data = await situacionesAPI.getResumenUnidades() as any;
      console.log('📊 [COP] Resumen unidades recibido:', data);

      // Si data es un array directamente, retornarlo
      if (Array.isArray(data)) {
        return data;
      }

      // Si es un objeto con propiedad resumen, extraer el array
      if (data && data.resumen && Array.isArray(data.resumen)) {
        return data.resumen;
      }

      console.warn('⚠️ [COP] Data no tiene formato esperado:', data);
      return [];
    },
    refetchInterval: socketConnected ? false : 30000,
  });

  const { data: situacionesPersistentes = [], refetch: refetchPersistentes } = useQuery({
    queryKey: ['situaciones-persistentes-mapa'],
    queryFn: situacionesPersistentesAPI.getActivas,
    refetchInterval: 60000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchResumen(), refetchPersistentes()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Búsqueda de lugares con Nominatim (OpenStreetMap)
  const searchPlaces = async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Buscar en Guatemala
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=gt&limit=5`
      );
      const results = await response.json();
      setSearchResults(results);
    } catch (error) {
      console.error('Error buscando lugares:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      searchPlaces(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isLoading = loadingResumen;
  const hasError = errorResumen;

  const formatLastUpdate = () => {
    return lastUpdate.toLocaleTimeString('es-GT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'ACTIVA': return 'bg-red-100 text-red-800';
      case 'CERRADA': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoSituacionLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'INCIDENTE': 'Hecho de Tránsito',
      'ASISTENCIA_VEHICULAR': 'Asistencia Vehicular',
      'EMERGENCIA': 'Emergencia',
      'OBSTACULO': 'Obstáculo en Vía',
      'PATRULLAJE': 'Patrullaje',
      'PUNTO_FIJO': 'Punto Fijo',
      'REGULACION': 'Regulación de Tráfico',
    };
    return labels[tipo] || tipo?.replace(/_/g, ' ') || 'Sin tipo';
  };

  // Filtrar datos
  const filteredUnidades = filters.unidades
    ? resumenUnidades.filter((u: any) => {
        // Filtro por sede
        const pasaSede = filters.sedes.length === 0 || (u.sede_id && filters.sedes.includes(u.sede_id));
        // Filtro por estado (solo activas si está activado)
        const pasaEstado = !filters.soloActivas || u.situacion_estado === 'ACTIVA';
        return pasaSede && pasaEstado;
      })
    : [];

  const filteredPersistentes = filters.persistentes
    ? situacionesPersistentes.filter((p: any) =>
        filters.sedes.length === 0 || (p.sede_id && filters.sedes.includes(p.sede_id))
      )
    : [];


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
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                  socketConnected
                    ? 'bg-green-500/20 text-green-100'
                    : 'bg-red-500/20 text-red-100'
                }`}
              >
                {socketConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span>{socketConnected ? 'En vivo' : 'Polling'}</span>
              </div>
              {/* Botón de Logout */}
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-white/10 rounded-lg transition"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
          <p className="text-sm text-blue-100">
            Actualizado: {formatLastUpdate()}
          </p>
        </div>

        {/* Toggle Mapa/Tabla */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setModoVista('mapa')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                modoVista === 'mapa'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Mapa
            </button>
            <button
              onClick={() => setModoVista('tabla')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                modoVista === 'tabla'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tabla
            </button>
          </div>
        </div>

        {/* Accesos Rápidos */}
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 mb-2 font-medium">Accesos Rápidos</p>
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

          {!isLoading && !hasError && resumenUnidades.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay unidades activas
            </div>
          )}

          {/* Mostrar Unidades con su última situación */}
          {filteredUnidades.map((unidad: any) => (
            <div
              key={`unidad-${unidad.unidad_id}`}
              onClick={() => setSelectedUnidad(unidad)}
              className={`bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer border-l-4 ${
                selectedUnidad?.unidad_id === unidad.unidad_id
                  ? 'border-blue-500 bg-blue-50'
                  : unidad.situacion_estado === 'ACTIVA'
                    ? 'border-red-400'
                    : 'border-green-400'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-semibold text-gray-800">
                  🚓 {unidad.unidad_codigo || `Unidad #${unidad.unidad_id}`}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoBadgeColor(
                    unidad.situacion_estado
                  )}`}
                >
                  {unidad.situacion_estado || 'EN RUTA'}
                </span>
              </div>

              {unidad.tipo_situacion && (
                <p className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <SituacionIcon icono={unidad.situacion_icono} color={unidad.situacion_color} size={16} />
                  {unidad.situacion_nombre || getTipoSituacionLabel(unidad.tipo_situacion)}
                </p>
              )}

              <div className="text-xs text-gray-600 space-y-1">
                {(unidad.ruta_activa_codigo || unidad.ruta_codigo) && (
                  <p>
                    📍 {unidad.ruta_activa_codigo || unidad.ruta_codigo}
                    {unidad.km && ` Km ${unidad.km}`}
                    {unidad.sentido && ` (${unidad.sentido})`}
                  </p>
                )}
                {unidad.sede_nombre && (
                  <p>🏢 {unidad.sede_nombre}</p>
                )}
                {unidad.situacion_descripcion && (
                  <p className="italic text-gray-500 truncate">
                    {unidad.situacion_descripcion}
                  </p>
                )}
              </div>

              {/* Miniaturas de fotos */}
              {unidad.fotos && unidad.fotos.length > 0 && (
                <div className="mt-2 flex gap-1">
                  {unidad.fotos.slice(0, 3).map((foto: any) => (
                    <img
                      key={foto.id}
                      src={foto.thumbnail || foto.url}
                      alt={`Foto ${foto.orden}`}
                      className="w-12 h-9 object-cover rounded border border-gray-200"
                    />
                  ))}
                  {unidad.fotos.length > 3 && (
                    <span className="w-12 h-9 flex items-center justify-center bg-gray-100 rounded text-xs text-gray-500">
                      +{unidad.fotos.length - 3}
                    </span>
                  )}
                </div>
              )}
              {unidad.foto_preview && !unidad.fotos && (
                <div className="mt-2">
                  <img
                    src={unidad.foto_preview}
                    alt="Preview"
                    className="w-full h-16 object-cover rounded border border-gray-200"
                  />
                </div>
              )}
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

        {/* Marcadores de Unidades (última situación reportada) */}
        {filteredUnidades.map((unidad: any) => {
          // Convertir coordenadas de string a número
          const lat = unidad.latitud != null ? Number(unidad.latitud) : null;
          const lng = unidad.longitud != null ? Number(unidad.longitud) : null;

          // Validar coordenadas
          if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
            return null;
          }

          return (
            <Marker
              key={`unidad-${unidad.unidad_id}`}
              position={[lat, lng]}
              icon={getIconBySede(unidad.sede_id)}
            >
              <Popup>
                <div className="p-2 min-w-[250px]">
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
                    <p className="text-xs text-gray-500 mb-2">📍 Sede: {unidad.sede_nombre}</p>
                  )}
                  {unidad.tipo_situacion && (
                    <p className="font-semibold text-gray-700 mb-2 flex items-center gap-1">
                      <SituacionIcon icono={unidad.situacion_icono} color={unidad.situacion_color} size={14} />
                      {unidad.situacion_nombre || unidad.tipo_situacion?.replace(/_/g, ' ')}
                    </p>
                  )}
                  <div className="text-sm space-y-1">
                    {/* Ruta activa o ruta de situación */}
                    {(unidad.ruta_activa_codigo || unidad.ruta_codigo) && (
                      <p>
                        🛣️ {unidad.ruta_activa_codigo || unidad.ruta_codigo}{' '}
                        {unidad.km && `Km ${unidad.km}`}{' '}
                        {unidad.sentido && `(${unidad.sentido})`}
                      </p>
                    )}
                    {unidad.situacion_estado && (
                      <p>
                        Estado:{' '}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          unidad.situacion_estado === 'ACTIVA'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {unidad.situacion_estado}
                        </span>
                      </p>
                    )}

                    {unidad.situacion_descripcion && <p className="mt-2 text-gray-700">{unidad.situacion_descripcion}</p>}

                    {/* Galería de fotos */}
                    {unidad.fotos && unidad.fotos.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">📷 {unidad.total_fotos || unidad.fotos.length} foto(s)</p>
                        <div className="flex gap-1 overflow-x-auto">
                          {unidad.fotos.slice(0, 3).map((foto: any) => (
                            <a
                              key={foto.id}
                              href={foto.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0"
                            >
                              <img
                                src={foto.thumbnail || foto.url}
                                alt={`Foto ${foto.orden}`}
                                className="w-16 h-12 object-cover rounded border border-gray-200 hover:border-blue-400 transition"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {unidad.foto_preview && !unidad.fotos && (
                      <div className="mt-3 pt-2 border-t border-gray-100">
                        <a href={unidad.foto_preview.replace('/c_fill,h_200,w_300/', '/')} target="_blank" rel="noopener noreferrer">
                          <img
                            src={unidad.foto_preview}
                            alt="Preview"
                            className="w-full h-20 object-cover rounded border border-gray-200 hover:border-blue-400 transition"
                          />
                        </a>
                      </div>
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



        {/* Marcadores de Situaciones Persistentes */}
        {filteredPersistentes.map((sp: any) => {
          const lat = sp.latitud != null ? Number(sp.latitud) : null;
          const lng = sp.longitud != null ? Number(sp.longitud) : null;

          if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            console.log('❌ Situación Persistente sin coordenadas:', {
              id: sp.id,
              tipo: sp.tipo_situacion,
              latitud_raw: sp.latitud,
              longitud_raw: sp.longitud
            });
            return null;
          }

          return (
            <Marker
              key={`persistente-${sp.id}`}
              position={[lat, lng]}
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
                  <div className="text-sm space-y-1">
                    {sp.ruta_codigo && (
                      <p>📍 {sp.ruta_codigo} Km {sp.km_inicio}{sp.km_fin && ` - ${sp.km_fin}`}</p>
                    )}
                    {sp.descripcion && <p className="italic text-gray-600">{sp.descripcion}</p>}
                    <p className="font-medium text-gray-800">
                      {sp.unidades_asignadas_count || 0} Unidades asignadas
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
            </MapContainer>

            {/* Buscador de lugares */}
            <div className="absolute top-4 left-4 z-[1000] w-80">
              <div className="relative">
                <div className="flex items-center bg-white rounded-lg shadow-lg">
                  <Search className="w-5 h-5 text-gray-400 ml-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar lugar en Guatemala..."
                    className="w-full px-3 py-3 rounded-lg focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-r-lg"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                </div>

                {/* Resultados de búsqueda */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((result: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => {
                          // Navegar al lugar en el mapa
                          const lat = parseFloat(result.lat);
                          const lng = parseFloat(result.lon);
                          if (!isNaN(lat) && !isNaN(lng)) {
                            // Usar el MapController para centrar
                            setSearchQuery(result.display_name.split(',')[0]);
                            setSearchResults([]);
                            // El mapa se centrará en esta ubicación
                            const mapEl = document.querySelector('.leaflet-container') as any;
                            if (mapEl && mapEl._leaflet_map) {
                              mapEl._leaflet_map.setView([lat, lng], 15);
                            }
                          }
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-0"
                      >
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {result.display_name.split(',')[0]}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {result.display_name.split(',').slice(1, 3).join(',')}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {isSearching && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg p-3 text-center text-gray-500 text-sm">
                    Buscando...
                  </div>
                )}
              </div>
            </div>

            {/* Controles flotantes del mapa */}
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-3 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition disabled:opacity-50"
                title="Actualizar"
              >
                <RefreshCw className={`w-5 h-5 text-gray-700 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-3 rounded-lg shadow-lg transition ${showFilters ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                title="Filtros"
              >
                <Filter className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowLegend(!showLegend)}
                className={`p-3 rounded-lg shadow-lg transition ${showLegend ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                title="Leyenda"
              >
                <Layers className="w-5 h-5" />
              </button>
            </div>

            {/* Panel de Filtros */}
            {showFilters && (
              <div className="absolute top-20 right-4 z-[1000] bg-white rounded-lg shadow-lg p-4 w-64">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">Filtros</h3>
                  <button onClick={() => setShowFilters(false)} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.unidades}
                      onChange={(e) => setFilters(prev => ({ ...prev, unidades: e.target.checked }))}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm">Unidades ({resumenUnidades.length})</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.soloActivas}
                      onChange={(e) => setFilters(prev => ({ ...prev, soloActivas: e.target.checked }))}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm">Solo situaciones activas</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.persistentes}
                      onChange={(e) => setFilters(prev => ({ ...prev, persistentes: e.target.checked }))}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm">Persistentes ({situacionesPersistentes.length})</span>
                  </label>

                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-500">Filtrar por sede:</p>
                      {filters.sedes.length > 0 ? (
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, sedes: [] }))}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Ver todas
                        </button>
                      ) : (
                        <span className="text-xs text-green-600">Todas visibles</span>
                      )}
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {Object.entries(SEDES_NOMBRES).map(([id, nombre]) => {
                        const sedeId = Number(id);
                        const isActive = filters.sedes.length === 0 || filters.sedes.includes(sedeId);
                        return (
                          <button
                            key={id}
                            onClick={() => {
                              if (filters.sedes.length === 0) {
                                setFilters(prev => ({ ...prev, sedes: [sedeId] }));
                              } else if (filters.sedes.includes(sedeId)) {
                                const newSedes = filters.sedes.filter(s => s !== sedeId);
                                setFilters(prev => ({ ...prev, sedes: newSedes }));
                              } else {
                                setFilters(prev => ({ ...prev, sedes: [...prev.sedes, sedeId] }));
                              }
                            }}
                            className={`flex items-center gap-2 w-full text-left text-sm px-2 py-1 rounded transition ${isActive ? 'bg-gray-100' : 'opacity-50'}`}
                          >
                            <div
                              className={`w-3 h-3 rounded-full ${isActive ? '' : 'opacity-30'}`}
                              style={{ backgroundColor: COLORES_SEDE[sedeId] }}
                            />
                            <span className={isActive ? '' : 'line-through'}>{nombre}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Leyenda */}
            {showLegend && (
              <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 max-h-64 overflow-y-auto">
                <h4 className="text-xs font-bold text-gray-600 mb-2 uppercase">Leyenda</h4>

                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Estado Situación:</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-xs">Situación Activa</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-xs">Situación Cerrada</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Sedes:</p>
                  <div className="space-y-1">
                    {Object.entries(COLORES_SEDE).map(([sedeId, color]) => (
                      <div key={sedeId} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-xs text-gray-700">{SEDES_NOMBRES[parseInt(sedeId)]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Stats flotantes */}
            <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 backdrop-blur rounded-lg shadow-lg p-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-gray-500">Unidades</p>
                  <p className="text-lg font-bold text-blue-600">{filteredUnidades.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Con Situación Activa</p>
                  <p className="text-lg font-bold text-red-600">
                    {filteredUnidades.filter((u: any) => u.situacion_estado === 'ACTIVA').length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Persistentes</p>
                  <p className="text-lg font-bold text-orange-600">{filteredPersistentes.length}</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full overflow-auto">
            {(() => {
              console.log('📊 [COP] Pasando a tabla:', {
                resumenUnidades,
                length: resumenUnidades?.length,
                isArray: Array.isArray(resumenUnidades)
              });
              return (
                <ResumenUnidadesTable
                  resumen={resumenUnidades}
                  onSelectUnidad={(unidadId) => {
                    // Cambiar a vista de mapa y seleccionar la unidad
                    setModoVista('mapa');
                    const unidad = resumenUnidades.find((u: any) => u.unidad_id === unidadId);
                    if (unidad) {
                      setSelectedUnidad(unidad);
                    }
                  }}
                />
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
