import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import type { LeafletMouseEvent } from 'leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import HeatmapLayer from '../components/HeatmapLayer';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { situacionesAPI, api } from '../services/api';
import { situacionesPersistentesAPI } from '../services/movimientos.service';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Wifi, WifiOff, AlertTriangle, Layers, Filter, X, LogOut, Search, Map as MapIcon, Plus, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDashboardSocket } from '../hooks/useSocket';
import ResumenUnidadesTable from '../components/ResumenUnidadesTable';
import SituacionIcon from '../components/SituacionIcon';
import CrearSituacionModal from '../components/forms/CrearSituacionModal';
import CrearActividadModal from '../components/forms/CrearActividadModal';
import CrearPuntoMapaModal from '../components/forms/CrearPuntoMapaModal';
import { useAuthStore } from '../store/authStore';

// Emoji corto por nombre de icono MDI (para el pin del mapa)
const MDI_EMOJI: Record<string, string> = {
  'car-crash': '💥', 'car-impact': '💥', 'car-side': '🔄', 'road-variant': '🚗',
  'tire': '🛞', 'tow-truck': '🚛', 'car-off': '🚫',
  'car-brake-alert': '⚠', 'car-police': '🚔', 'car-wash': '🧼', 'car-multiple': '🚗',
  'police-station': '📍', 'map-marker-radius': '📍', 'traffic-cone': '🔶',
  'counter': '🔢', 'speedometer': '⏱', 'traffic-light': '🚦',
  'eye-check': '👁', 'clipboard-check': '📋', 'file-document': '📄', 'file-sign': '📝',
  'police-badge': '🛡', 'police-badge-outline': '🛡', 'shield-account': '🛡',
  'account-group': '👥', 'account-switch': '🔄', 'stop-circle': '⛔',
  'road-barrier': '🚧', 'bullhorn': '📢', 'scale': '⚖',
  'truck-wide': '🚚', 'truck-cargo-container': '🚚', 'package-down': '📦',
  'weight': '⚖', 'axis-arrow': '🔧',
  'gavel': '⚖', 'road-worker': '🔧', 'bike': '🚲', 'run': '🏃', 'run-fast': '🏃',
  'swim': '🏊', 'fire': '🔥', 'fire-truck': '🔥', 'bank': '🏛',
  'toilet': '🚻', 'atm': '💳', 'food': '🍽', 'wrench-clock': '🔧',
  'oil': '💧', 'tree': '🌳', 'landslide': '⛰', 'waves': '🌊',
  'slope-downhill': '⛰', 'arrow-down-bold-box': '⬇', 'table-row-remove': '⛰',
  'water': '💧', 'home-flood': '🌊', 'water-alert': '💧', 'volcano': '🌋',
  'image-filter-hdr': '⛰', 'pistol': '🔫', 'account-injury': '🤕', 'coffin': '⚰',
  'home-city': '🏘', 'airplane': '✈', 'car-emergency': '🚨',
  'traffic-cone-off': '🔶',
};

// Fix para iconos de Leaflet
const createCustomIcon = (color: string, emoji?: string) => {
  const displayEmoji = emoji || '';
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="46" viewBox="0 0 32 46">
      <path fill="${color}" stroke="#fff" stroke-width="1.5" d="M16 1C7.7 1 1 7.7 1 16c0 10.5 15 29 15 29s15-18.5 15-29C31 7.7 24.3 1 16 1z"/>
      <circle cx="16" cy="16" r="10" fill="#fff" fill-opacity="0.9"/>
      <text x="16" y="21" text-anchor="middle" font-size="13">${displayEmoji}</text>
    </svg>
  `;

  return new Icon({
    iconUrl: `data:image/svg+xml,${encodeURIComponent(svgIcon)}`,
    iconSize: [32, 46],
    iconAnchor: [16, 46],
    popupAnchor: [0, -40],
  });
};

// Cache de iconos para no recrear en cada render
const iconCache = new Map<string, ReturnType<typeof createCustomIcon>>();
const getIconForUnidad = (unidad: any) => {
  const color = unidad.situacion_color || COLORES_SEDE[unidad.sede_id] || '#6B7280';
  const mdiIcon = unidad.situacion_icono || unidad.icono || null;
  const emoji = mdiIcon ? (MDI_EMOJI[mdiIcon] || '') : '';
  const key = `${color}-${emoji}`;

  if (!iconCache.has(key)) {
    iconCache.set(key, createCustomIcon(color, emoji));
  }
  return iconCache.get(key)!;
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




const createPersistenteIcon = () => {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="#DC2626" stroke="#fff" stroke-width="2"/>
      <text x="12" y="17" text-anchor="middle" fill="white" font-size="18" font-weight="bold">!</text>
    </svg>
  `;
  return new Icon({
    iconUrl: `data:image/svg+xml,${encodeURIComponent(svgIcon)}`,
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

function CoordClickListener({ onCoord }: { onCoord: (lat: number, lng: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const handler = (e: LeafletMouseEvent) => onCoord(e.latlng.lat, e.latlng.lng);
    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [map, onCoord]);
  return null;
}

export default function COPMapaPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
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
  const [showCrearSituacionModal, setShowCrearSituacionModal] = useState(false);
  const [showCrearActividadModal, setShowCrearActividadModal] = useState(false);
  const [preselectedUnidadId, setPreselectedUnidadId] = useState<number | undefined>(undefined);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapDias, setHeatmapDias] = useState(30);
  const [showCapasPanel, setShowCapasPanel] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [capassVisibles, setCapasVisibles] = useState<Set<number>>(new Set());
  const [showCrearPuntoModal, setShowCrearPuntoModal] = useState(false);
  const [clickedCoord, setClickedCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [coordCopied, setCoordCopied] = useState(false);
  const [showCrearCapaInline, setShowCrearCapaInline] = useState(false);
  const [nuevaCapa, setNuevaCapa] = useState({ nombre: '', color: '#3B82F6' });
  const [creandoCapa, setCreandoCapa] = useState(false);

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

  const { data: heatmapData = [] } = useQuery({
    queryKey: ['heatmap-situaciones', heatmapDias],
    queryFn: async () => {
      const { data } = await api.get(`/situaciones/heatmap?dias=${heatmapDias}`);
      return data.points || [];
    },
    enabled: showHeatmap,
    staleTime: 5 * 60 * 1000,
  });

  const { data: capas = [], refetch: refetchCapas } = useQuery({
    queryKey: ['capas-mapa'],
    queryFn: async () => {
      const { data } = await api.get('/capas-mapa');
      return data.capas || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: todosPuntos = [], refetch: refetchPuntos } = useQuery({
    queryKey: ['puntos-mapa'],
    queryFn: async () => {
      const { data } = await api.get('/capas-mapa/puntos');
      return data.puntos || [];
    },
    enabled: capassVisibles.size > 0,
    staleTime: 60 * 1000,
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

  const handleCoord = useCallback((lat: number, lng: number) => {
    setClickedCoord({ lat, lng });
    setCoordCopied(false);
  }, []);

  const copyCoord = () => {
    if (!clickedCoord) return;
    navigator.clipboard.writeText(`${clickedCoord.lat.toFixed(6)}, ${clickedCoord.lng.toFixed(6)}`);
    setCoordCopied(true);
    setTimeout(() => setCoordCopied(false), 2000);
  };

  const handleCrearCapa = async () => {
    if (!nuevaCapa.nombre.trim()) return;
    setCreandoCapa(true);
    try {
      await api.post('/capas-mapa', { nombre: nuevaCapa.nombre.trim(), color: nuevaCapa.color });
      refetchCapas();
      setNuevaCapa({ nombre: '', color: '#3B82F6' });
      setShowCrearCapaInline(false);
    } catch (e) {
      console.error('Error creando capa:', e);
    } finally {
      setCreandoCapa(false);
    }
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
        const pasaEstado = !filters.soloActivas || u.estado_situacion === 'ACTIVA';
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
      <div className={`transition-all duration-300 ${showSidebar ? 'w-96' : 'w-0'} bg-white shadow-lg flex flex-col overflow-hidden flex-shrink-0`}>
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
                  : unidad.estado_situacion === 'ACTIVA'
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
                    unidad.estado_situacion
                  )}`}
                >
                  {unidad.estado_situacion || 'EN RUTA'}
                </span>
              </div>

              {(unidad.situacion_nombre || unidad.ultima_situacion) && (
                <p className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <SituacionIcon icono={unidad.situacion_icono} color={unidad.situacion_color} size={16} />
                  {unidad.situacion_nombre || getTipoSituacionLabel(unidad.ultima_situacion)}
                  {unidad.tipo_registro === 'ACTIVIDAD' && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">ACT</span>
                  )}
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
                {unidad.clima && (
                  <p>🌤 {unidad.clima}{unidad.carga_vehicular ? ` · 🚗 ${unidad.carga_vehicular}` : ''}</p>
                )}
                {unidad.observaciones && (
                  <p className="italic text-gray-500 truncate" title={unidad.observaciones}>
                    💬 {unidad.observaciones}
                  </p>
                )}
                {unidad.created_at && (
                  <p className="text-gray-400">
                    🕐 {new Date(unidad.created_at).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
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
        {/* Sidebar toggle button */}
        <button
          onClick={() => setShowSidebar(s => !s)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-[1001] bg-white border border-gray-200 border-l-0 shadow-md rounded-r-lg p-1.5 hover:bg-gray-50 transition"
          title={showSidebar ? 'Ocultar panel' : 'Mostrar panel'}
        >
          {showSidebar ? <ChevronLeft className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
        </button>

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
              <CoordClickListener onCoord={handleCoord} />
              {showHeatmap && heatmapData.length > 0 && (
                <HeatmapLayer points={heatmapData} />
              )}

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
              icon={getIconForUnidad(unidad)}
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
                  {(unidad.situacion_nombre || unidad.ultima_situacion) && (
                    <p className="font-semibold text-gray-700 mb-2 flex items-center gap-1">
                      <SituacionIcon icono={unidad.situacion_icono} color={unidad.situacion_color} size={14} />
                      {unidad.situacion_nombre || getTipoSituacionLabel(unidad.ultima_situacion)}
                      {unidad.tipo_registro === 'ACTIVIDAD' && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">ACTIVIDAD</span>
                      )}
                    </p>
                  )}
                  <div className="text-sm space-y-1">
                    {(unidad.ruta_activa_codigo || unidad.ruta_codigo) && (
                      <p>
                        🛣️ {unidad.ruta_activa_codigo || unidad.ruta_codigo}{' '}
                        {unidad.km && `Km ${unidad.km}`}{' '}
                        {unidad.sentido && `(${unidad.sentido})`}
                      </p>
                    )}
                    {unidad.estado_situacion && (
                      <p>
                        Estado:{' '}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          unidad.estado_situacion === 'ACTIVA'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {unidad.estado_situacion}
                        </span>
                      </p>
                    )}

                    {unidad.clima && (
                      <p>🌤 Clima: {unidad.clima}</p>
                    )}
                    {unidad.carga_vehicular && (
                      <p>🚗 Carga: {unidad.carga_vehicular}</p>
                    )}
                    {unidad.obstruccion_data && (
                      <p>🚧 Obstrucción: {typeof unidad.obstruccion_data === 'string' ? unidad.obstruccion_data : JSON.stringify(unidad.obstruccion_data)}</p>
                    )}
                    {unidad.observaciones && (
                      <p className="mt-1 text-gray-700 italic">💬 {unidad.observaciones}</p>
                    )}
                    {unidad.created_at && (
                      <p className="text-gray-400 text-xs">
                        🕐 {new Date(unidad.created_at).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}

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



        {/* Marcadores de Capas del Mapa */}
        {todosPuntos
          .filter((p: any) => capassVisibles.has(p.capa_id))
          .map((p: any) => {
            const lat = Number(p.latitud);
            const lng = Number(p.longitud);
            if (isNaN(lat) || isNaN(lng)) return null;
            const puntoEmoji = p.icono_url || '📍';
            const svgPin = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46"><path fill="${p.capa_color || '#3B82F6'}" stroke="#fff" stroke-width="1.5" d="M17 1C8.7 1 2 7.7 2 16c0 10.5 15 29 15 29s15-18.5 15-29C32 7.7 25.3 1 17 1z"/><circle cx="17" cy="16" r="11" fill="#fff" fill-opacity="0.95"/><text x="17" y="21" text-anchor="middle" font-size="14">${puntoEmoji}</text></svg>`;
            const capaIcon = new Icon({
              iconUrl: `data:image/svg+xml,${encodeURIComponent(svgPin)}`,
              iconSize: [28, 40], iconAnchor: [14, 40], popupAnchor: [0, -40],
            });
            return (
              <Marker key={`capa-${p.id}`} position={[lat, lng]} icon={capaIcon}>
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.capa_color || '#3B82F6' }} />
                      <span className="text-xs text-gray-500">{p.capa_nombre}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{p.titulo}</h3>
                    {p.categoria && <p className="text-xs text-blue-600 mb-1">🏷 {p.categoria}</p>}
                    {p.descripcion && <p className="text-sm text-gray-700">{p.descripcion}</p>}
                    {p.datos && Object.keys(p.datos).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5">
                        {Object.entries(p.datos).map(([k, v]) => (
                          <p key={k} className="text-xs text-gray-600">
                            <span className="font-medium">{k.replace(/_/g, ' ')}:</span> {String(v)}
                          </p>
                        ))}
                      </div>
                    )}
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
            <div className="absolute top-4 left-4 z-[1000]">
              {showSearch ? (
                <div className="w-80">
                  <div className="relative">
                    <div className="flex items-center bg-white rounded-lg shadow-lg">
                      <Search className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0" />
                      <input
                        autoFocus
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar lugar en Guatemala..."
                        className="w-full px-3 py-3 rounded-lg focus:outline-none"
                      />
                      <button
                        onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearch(false); }}
                        className="p-2 hover:bg-gray-100 rounded-r-lg flex-shrink-0"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>

                    {/* Resultados de búsqueda */}
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {searchResults.map((result: any, index: number) => (
                          <button
                            key={index}
                            onClick={() => {
                              const lat = parseFloat(result.lat);
                              const lng = parseFloat(result.lon);
                              if (!isNaN(lat) && !isNaN(lng)) {
                                setSearchQuery(result.display_name.split(',')[0]);
                                setSearchResults([]);
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
              ) : (
                <button
                  onClick={() => setShowSearch(true)}
                  className="p-3 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition"
                  title="Buscar lugar en Guatemala"
                >
                  <Search className="w-5 h-5 text-gray-700" />
                </button>
              )}
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
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`p-3 rounded-lg shadow-lg transition text-xs font-bold ${showHeatmap ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                title="Mapa de calor de incidentes"
              >
                🔥
              </button>
              <button
                onClick={() => setShowCapasPanel(!showCapasPanel)}
                className={`p-3 rounded-lg shadow-lg transition ${showCapasPanel ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                title="Capas del mapa"
              >
                <MapIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Panel de capas cuando heatmap está activo */}
            {showHeatmap && (
              <div className="absolute bottom-8 right-4 z-[1000] bg-white rounded-lg shadow-lg p-3 text-sm w-52">
                <p className="font-semibold text-gray-800 mb-2">🔥 Mapa de Calor</p>
                <label className="text-xs text-gray-500">Período</label>
                <select
                  value={heatmapDias}
                  onChange={e => setHeatmapDias(parseInt(e.target.value))}
                  className="w-full mt-1 border border-gray-200 rounded px-2 py-1 text-xs"
                >
                  <option value={7}>Últimos 7 días</option>
                  <option value={30}>Últimos 30 días</option>
                  <option value={90}>Últimos 90 días</option>
                  <option value={365}>Último año</option>
                </select>
                <p className="mt-2 text-xs text-gray-400">
                  {heatmapData.length} puntos con coordenadas
                </p>
                <div className="mt-2 flex items-center gap-1">
                  <div className="flex-1 h-2 rounded" style={{ background: 'linear-gradient(to right, #3B82F6, #F59E0B, #EF4444)' }} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>Bajo</span><span>Alto</span>
                </div>
              </div>
            )}

            {/* Panel de Capas del Mapa */}
            {showCapasPanel && (
              <div className="absolute top-20 right-16 z-[1000] bg-white rounded-lg shadow-lg p-3 w-64">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
                    <MapIcon className="w-4 h-4 text-indigo-600" /> Capas del Mapa
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setShowCrearCapaInline(!showCrearCapaInline)}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition ${
                        showCrearCapaInline ? 'bg-indigo-600 text-white' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                      }`}
                      title="Nueva capa"
                    >
                      <Plus className="w-3 h-3" /> Capa
                    </button>
                    <button
                      onClick={() => setShowCrearPuntoModal(true)}
                      className="flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded"
                      title="Nuevo punto"
                    >
                      <Plus className="w-3 h-3" /> Punto
                    </button>
                  </div>
                </div>

                {/* Formulario inline nueva capa */}
                {showCrearCapaInline && (
                  <div className="mb-3 p-2 bg-indigo-50 rounded-lg space-y-2">
                    <input
                      type="text"
                      value={nuevaCapa.nombre}
                      onChange={e => setNuevaCapa(p => ({ ...p, nombre: e.target.value }))}
                      placeholder="Nombre de la capa..."
                      className="w-full px-2 py-1.5 text-xs border border-indigo-200 rounded focus:ring-1 focus:ring-indigo-400 focus:outline-none"
                      onKeyDown={e => { if (e.key === 'Enter') handleCrearCapa(); }}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={nuevaCapa.color}
                        onChange={e => setNuevaCapa(p => ({ ...p, color: e.target.value }))}
                        className="w-8 h-7 rounded cursor-pointer border border-indigo-200"
                        title="Color de la capa"
                      />
                      <button
                        onClick={handleCrearCapa}
                        disabled={creandoCapa || !nuevaCapa.nombre.trim()}
                        className="flex-1 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition"
                      >
                        {creandoCapa ? '...' : 'Crear capa'}
                      </button>
                      <button
                        onClick={() => setShowCrearCapaInline(false)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {capas.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">No hay capas — crea una arriba</p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {capas.map((capa: any) => {
                      const visible = capassVisibles.has(capa.id);
                      return (
                        <div key={capa.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: capa.color }} />
                          <span className="flex-1 text-sm text-gray-700 truncate">{capa.nombre}</span>
                          <span className="text-xs text-gray-400">{capa.total_puntos || 0}</span>
                          <button
                            onClick={() => {
                              setCapasVisibles(prev => {
                                const next = new Set(prev);
                                if (next.has(capa.id)) next.delete(capa.id);
                                else next.add(capa.id);
                                return next;
                              });
                            }}
                            className={`p-0.5 rounded ${visible ? 'text-indigo-600' : 'text-gray-300'}`}
                          >
                            {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {capassVisibles.size > 0 && (
                  <p className="text-xs text-gray-400 mt-2 border-t pt-2">
                    {todosPuntos.filter((p: any) => capassVisibles.has(p.capa_id)).length} puntos visibles
                  </p>
                )}
              </div>
            )}

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

            {/* Barra flotante de coordenadas */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-3 text-sm">
              {clickedCoord ? (
                <>
                  <span className="text-xs text-gray-400">📍</span>
                  <span className="font-mono text-gray-800 select-all">
                    {clickedCoord.lat.toFixed(6)}, {clickedCoord.lng.toFixed(6)}
                  </span>
                  <button
                    onClick={copyCoord}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition ${
                      coordCopied
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {coordCopied ? '✓ Copiado' : 'Copiar'}
                  </button>
                </>
              ) : (
                <span className="text-gray-400 text-xs">Haz clic en el mapa para ver coordenadas</span>
              )}
            </div>

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
                    {filteredUnidades.filter((u: any) => u.estado_situacion === 'ACTIVA').length}
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
                    setModoVista('mapa');
                    const unidad = resumenUnidades.find((u: any) => u.unidad_id === unidadId);
                    if (unidad) {
                      setSelectedUnidad(unidad);
                    }
                  }}
                  onCreateSituacion={(unidadId) => {
                    setPreselectedUnidadId(unidadId);
                    setShowCrearSituacionModal(true);
                  }}
                  onCreateActividad={(unidadId) => {
                    setPreselectedUnidadId(unidadId);
                    setShowCrearActividadModal(true);
                  }}
                />
              );
            })()}
          </div>
        )}
      </div>

      {/* Modal crear situación */}
      <CrearSituacionModal
        isOpen={showCrearSituacionModal}
        onClose={() => setShowCrearSituacionModal(false)}
        onCreated={() => { refetchResumen(); }}
        unidades={resumenUnidades}
        preselectedUnidadId={preselectedUnidadId}
      />

      {/* Modal crear actividad */}
      <CrearActividadModal
        isOpen={showCrearActividadModal}
        onClose={() => setShowCrearActividadModal(false)}
        onCreated={() => { refetchResumen(); }}
        unidades={resumenUnidades}
        preselectedUnidadId={preselectedUnidadId}
      />

      {/* Modal crear punto de capa */}
      <CrearPuntoMapaModal
        isOpen={showCrearPuntoModal}
        onClose={() => setShowCrearPuntoModal(false)}
        onCreated={() => { refetchPuntos(); refetchCapas(); }}
        capas={capas}
      />
    </div>
  );
}
