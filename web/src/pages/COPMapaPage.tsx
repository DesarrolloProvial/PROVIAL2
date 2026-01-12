import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { incidentesAPI, situacionesAPI } from '../services/api';
import { situacionesPersistentesAPI } from '../services/movimientos.service';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ArrowLeft, Wifi, WifiOff, AlertTriangle, Layers, Filter, X } from 'lucide-react';
import { useDashboardSocket } from '../hooks/useSocket';

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

// Iconos para Incidentes
const iconReportado = createCustomIcon('#EF4444');
const iconEnAtencion = createCustomIcon('#F59E0B');
const iconRegulacion = createCustomIcon('#3B82F6');
const iconCerrado = createCustomIcon('#10B981');

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
  console.log('🗺️ COPMapaPage montado/renderizado');

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [filters, setFilters] = useState({
    incidentes: true,
    situaciones: true,

    persistentes: true,
    sedes: [] as number[],
  });

  const { isConnected: socketConnected, lastUpdate } = useDashboardSocket(queryClient);
  const defaultCenter: LatLngExpression = [14.6407, -90.5133];

  console.log('📊 Filters estado:', filters);

  // Queries
  const { data: incidentes = [], refetch: refetchIncidentes } = useQuery({
    queryKey: ['incidentes-activos'],
    queryFn: incidentesAPI.getActivos,
    refetchInterval: socketConnected ? false : 30000,
  });

  const { data: situaciones = [], refetch: refetchSituaciones } = useQuery({
    queryKey: ['resumen-unidades'],
    queryFn: situacionesAPI.getResumenUnidades,
    refetchInterval: socketConnected ? false : 30000,
  });

  const { data: situacionesPersistentes = [] } = useQuery({
    queryKey: ['situaciones-persistentes-mapa'],
    queryFn: situacionesPersistentesAPI.getActivas,
    refetchInterval: 60000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchIncidentes(), refetchSituaciones()]);
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
      case 'REPORTADO': return iconReportado;
      case 'EN_ATENCION': return iconEnAtencion;
      case 'REGULACION': return iconRegulacion;
      case 'CERRADO': return iconCerrado;
      default: return iconReportado;
    }
  };

  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'REPORTADO': return 'bg-red-100 text-red-800';
      case 'EN_ATENCION': return 'bg-yellow-100 text-yellow-800';
      case 'REGULACION': return 'bg-blue-100 text-blue-800';
      case 'CERRADO': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filtrar datos
  const filteredIncidentes = filters.incidentes
    ? incidentes.filter((i: any) =>
      filters.sedes.length === 0 || (i.sede_id && filters.sedes.includes(i.sede_id))
    )
    : [];

  const filteredSituaciones = filters.situaciones
    ? situaciones.filter((s: any) =>
      filters.sedes.length === 0 || (s.sede_id && filters.sedes.includes(s.sede_id))
    )
    : [];



  const filteredPersistentes = filters.persistentes
    ? situacionesPersistentes.filter((p: any) =>
      filters.sedes.length === 0 || (p.sede_id && filters.sedes.includes(p.sede_id))
    ) // Asumiendo que persistentes también tienen sede_id, si no, se mostrarán solo si no hay filtro de sede o se añade lógica extra
    : [];

  // DEBUG: Ver datos recibidos (después de calcular variables filtradas)
  console.log('=== DEBUG COPMapaPage ===');
  console.log('📥 Datos RAW:');
  console.log('  - Situaciones recibidas:', situaciones?.length || 0, situaciones);
  console.log('  - Incidentes recibidos:', incidentes?.length || 0);
  console.log('  - Persistentes recibidos:', situacionesPersistentes?.length || 0);
  console.log('');
  console.log('🎛️ Filtros activos:', filters);
  console.log('');
  console.log('✅ Datos FILTRADOS:');
  console.log('  - Situaciones filtradas:', filteredSituaciones?.length || 0, filteredSituaciones);
  console.log('  - Incidentes filtrados:', filteredIncidentes?.length || 0);
  console.log('  - Persistentes filtrados:', filteredPersistentes?.length || 0);

  // Mostrar primera situación con coordenadas
  if (situaciones && situaciones.length > 0) {
    const primera = situaciones[0];
    console.log('');
    console.log('📍 Primera situación (ejemplo):');
    console.log('  - Unidad:', primera.unidad_codigo);
    console.log('  - Latitud (raw):', primera.latitud, typeof primera.latitud);
    console.log('  - Longitud (raw):', primera.longitud, typeof primera.longitud);
    console.log('  - Sede ID:', primera.sede_id);
  }
  console.log('========================');

  return (
    <div className="h-screen w-full relative">
      {/* DEBUG PANEL - Visible on page */}
      <div className="absolute top-4 right-4 z-[1000] bg-black bg-opacity-75 text-white p-3 rounded-lg text-xs font-mono">
        <div className="font-bold mb-1">🐛 DEBUG MARKERS</div>
        <div>Situaciones RAW: {situaciones?.length || 0}</div>
        <div>Situaciones FILTRADAS: {filteredSituaciones?.length || 0}</div>
        <div>Incidentes FILTRADOS: {filteredIncidentes?.length || 0}</div>
        <div>Persistentes FILTRADOS: {filteredPersistentes?.length || 0}</div>
        <div className="mt-1 pt-1 border-t border-gray-500">
          <div>Filter situaciones: {filters.situaciones ? '✓' : '✗'}</div>
          <div>Filter sedes: [{filters.sedes.join(', ') || 'vacío'}]</div>
        </div>
      </div>

      {/* Mapa */}
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
        {filteredIncidentes.map((incidente: any) => {
          const lat = incidente.latitud != null ? Number(incidente.latitud) : null;
          const lng = incidente.longitud != null ? Number(incidente.longitud) : null;

          if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            console.log('❌ Incidente sin coordenadas:', {
              id: incidente.id,
              numero: incidente.numero_reporte,
              latitud_raw: incidente.latitud,
              longitud_raw: incidente.longitud
            });
            return null;
          }

          return (
            <Marker
              key={`incidente-${incidente.id}`}
              position={[lat, lng]}
              icon={getIncidenteIcon(incidente.estado)}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-bold text-lg mb-2">
                    {incidente.numero_reporte || `#${incidente.id}`}
                  </h3>
                  <p className="font-semibold text-gray-700 mb-2">{incidente.tipo_hecho}</p>
                  <div className="text-sm space-y-1">
                    <p>📍 {incidente.ruta_codigo} Km {incidente.km}</p>
                    <p>
                      Estado:{' '}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoBadgeColor(incidente.estado)}`}>
                        {incidente.estado}
                      </span>
                    </p>
                    {incidente.unidad_codigo && <p>🚓 {incidente.unidad_codigo}</p>}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Marcadores de Situaciones */}
        {filteredSituaciones.map((situacion: any, index: number) => {
          // Parse coordinates - conversión robusta
          const lat = situacion.latitud != null ? Number(situacion.latitud) : null;
          const lng = situacion.longitud != null ? Number(situacion.longitud) : null;

          console.log(`🎯 Procesando situación #${index}:`, {
            unidad: situacion.unidad_codigo,
            latitud_raw: situacion.latitud,
            latitud_tipo: typeof situacion.latitud,
            longitud_raw: situacion.longitud,
            longitud_tipo: typeof situacion.longitud,
            lat_parsed: lat,
            lng_parsed: lng,
            lat_isNaN: lat === null ? 'null' : isNaN(lat),
            lng_isNaN: lng === null ? 'null' : isNaN(lng),
            sede_id: situacion.sede_id
          });

          // Debug individual
          if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
            console.log('❌ Coordenadas inválidas - MARCADOR NO RENDERIZADO:', {
              unidad: situacion.unidad_codigo,
              latitud_raw: situacion.latitud,
              longitud_raw: situacion.longitud,
              lat_parsed: lat,
              lng_parsed: lng
            });
            return null;
          }

          console.log(`✅ Creando marcador para ${situacion.unidad_codigo} en [${lat}, ${lng}]`);

          return (
            <Marker
              key={`situacion-${situacion.unidad_id || situacion.id}`}
              position={[lat, lng]}
              icon={getIconBySede(situacion.sede_id)}
            >
              <Popup>
                <div className="p-2 min-w-[220px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORES_SEDE[situacion.sede_id] || '#6B7280' }}
                    />
                    <h3 className="font-bold text-lg" style={{ color: COLORES_SEDE[situacion.sede_id] || '#6B7280' }}>
                      🚓 {situacion.unidad_codigo || `Unidad #${situacion.unidad_id}`}
                    </h3>
                  </div>
                  {situacion.sede_nombre && (
                    <p className="text-xs text-gray-500 mb-2">📍 Sede: {situacion.sede_nombre}</p>
                  )}
                  <p className="font-semibold text-gray-700 mb-2">
                    {situacion.tipo_situacion?.replace(/_/g, ' ')}
                  </p>
                  <div className="text-sm space-y-1">
                    {situacion.ruta_codigo && (
                      <p>🛣️ {situacion.ruta_codigo} Km {situacion.km} {situacion.sentido && `(${situacion.sentido})`}</p>
                    )}
                    {situacion.descripcion && <p className="mt-2 text-gray-700">{situacion.descripcion}</p>}
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => navigate(`/bitacora/${situacion.unidad_id}`)}
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

      {/* Header flotante */}
      <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="p-3 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="bg-white rounded-lg shadow-lg px-4 py-2">
          <h1 className="text-lg font-bold text-gray-800">COP - Mapa en Tiempo Real</h1>
          <p className="text-xs text-gray-500">
            Actualizado: {formatLastUpdate()}
            {socketConnected ? (
              <span className="ml-2 text-green-600 inline-flex items-center gap-1">
                <Wifi className="w-3 h-3" /> En vivo
              </span>
            ) : (
              <span className="ml-2 text-orange-600 inline-flex items-center gap-1">
                <WifiOff className="w-3 h-3" /> Polling
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Controles flotantes */}
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
                checked={filters.incidentes}
                onChange={(e) => setFilters(prev => ({ ...prev, incidentes: e.target.checked }))}
                className="rounded text-blue-600"
              />
              <span className="text-sm">Incidentes ({incidentes.length})</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.situaciones}
                onChange={(e) => setFilters(prev => ({ ...prev, situaciones: e.target.checked }))}
                className="rounded text-blue-600"
              />
              <span className="text-sm">Situaciones ({situaciones.length})</span>
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
                          // Si todas están visibles, al hacer clic solo muestra esa
                          setFilters(prev => ({ ...prev, sedes: [sedeId] }));
                        } else if (filters.sedes.includes(sedeId)) {
                          // Si está seleccionada, quitarla
                          const newSedes = filters.sedes.filter(s => s !== sedeId);
                          setFilters(prev => ({ ...prev, sedes: newSedes }));
                        } else {
                          // Si no está seleccionada, agregarla
                          setFilters(prev => ({ ...prev, sedes: [...prev.sedes, sedeId] }));
                        }
                      }}
                      className={`flex items-center gap-2 w-full text-left text-sm px-2 py-1 rounded transition ${isActive ? 'bg-gray-100' : 'opacity-50'
                        }`}
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
            <p className="text-xs font-semibold text-gray-500 mb-1">Estados Incidente:</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs">Reportado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-xs">En Atención</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs">Regulación</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs">Cerrado</span>
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
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-xs text-gray-500">Incidentes</p>
            <p className="text-lg font-bold text-red-600">{filteredIncidentes.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Unidades</p>
            <p className="text-lg font-bold text-purple-600">{filteredSituaciones.length}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Persistentes</p>
            <p className="text-lg font-bold text-orange-600">{filteredPersistentes.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
