import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { situacionesAPI, incidentesAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ArrowLeft, Search, Filter, MapPin, ChevronDown, ChevronUp, Eye, X, Wifi, WifiOff } from 'lucide-react';
import { useDashboardSocket } from '../hooks/useSocket';

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

const TIPOS_SITUACION = [
  'PATRULLAJE',
  'INCIDENTE',
  'PARADA_REGULACION',
  'COMIDA',
  'COMBUSTIBLE',
  'HOSPITAL',
  'OTRO',
];

export default function COPSituacionesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });
  const [selectedSituacion, setSelectedSituacion] = useState<any | null>(null);
  const [filters, setFilters] = useState({
    sede: '',
    tipoSituacion: '',
    estado: 'ACTIVA',
  });

  const { isConnected: socketConnected, lastUpdate } = useDashboardSocket(queryClient);

  // Queries
  const { data: situaciones = [], isLoading, refetch: refetchSituaciones } = useQuery({
    queryKey: ['situaciones-cop', filters.estado],
    queryFn: () => situacionesAPI.getAll({ estado: filters.estado || undefined }),
    refetchInterval: socketConnected ? false : 30000,
  });

  const { refetch: refetchResumen } = useQuery({
    queryKey: ['resumen-unidades'],
    queryFn: situacionesAPI.getResumenUnidades,
    refetchInterval: socketConnected ? false : 30000,
  });

  const { data: incidentes = [] } = useQuery({
    queryKey: ['incidentes-activos'],
    queryFn: incidentesAPI.getActivos,
    refetchInterval: socketConnected ? false : 30000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchSituaciones(), refetchResumen()]);
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

  const formatDateTime = (fecha: string | null) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filtrar y ordenar
  const filteredSituaciones = situaciones.filter((s: any) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      s.unidad_codigo?.toLowerCase().includes(searchLower) ||
      s.tipo_situacion?.toLowerCase().includes(searchLower) ||
      s.ruta_codigo?.toLowerCase().includes(searchLower) ||
      s.descripcion?.toLowerCase().includes(searchLower);

    const matchesSede = !filters.sede || s.sede_id === Number(filters.sede);
    const matchesTipo = !filters.tipoSituacion || s.tipo_situacion === filters.tipoSituacion;

    return matchesSearch && matchesSede && matchesTipo;
  });

  const sortedSituaciones = [...filteredSituaciones].sort((a: any, b: any) => {
    const aVal = a[sortConfig.key] || '';
    const bVal = b[sortConfig.key] || '';

    if (sortConfig.direction === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return null;
    return sortConfig.direction === 'asc' ?
      <ChevronUp className="w-4 h-4 inline ml-1" /> :
      <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  const getTipoSituacionBadge = (tipo: string | null) => {
    if (!tipo) return 'bg-gray-100 text-gray-600';
    const tipoLower = tipo.toLowerCase();
    if (tipoLower.includes('incidente')) return 'bg-red-100 text-red-800';
    if (tipoLower.includes('patrullaje')) return 'bg-blue-100 text-blue-800';
    if (tipoLower.includes('parada')) return 'bg-yellow-100 text-yellow-800';
    if (tipoLower.includes('comida')) return 'bg-orange-100 text-orange-800';
    if (tipoLower.includes('combustible')) return 'bg-green-100 text-green-800';
    return 'bg-purple-100 text-purple-800';
  };

  // Estadísticas
  const stats = {
    totalActivas: situaciones.filter((s: any) => s.estado === 'ACTIVA').length,
    incidentes: incidentes.length,
    porTipo: TIPOS_SITUACION.reduce((acc, tipo) => {
      acc[tipo] = situaciones.filter((s: any) => s.tipo_situacion === tipo).length;
      return acc;
    }, {} as Record<string, number>),
    porSede: Object.keys(SEDES_NOMBRES).reduce((acc, sedeId) => {
      acc[sedeId] = situaciones.filter((s: any) => s.sede_id === Number(sedeId)).length;
      return acc;
    }, {} as Record<string, number>),
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-full px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">COP - Situaciones en Tiempo Real</h1>
                <p className="text-sm text-gray-500">
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

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/cop/mapa')}
                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Ver Mapa
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500">Situaciones Activas</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalActivas}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500">Incidentes</p>
            <p className="text-2xl font-bold text-red-600">{stats.incidentes}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500">Patrullajes</p>
            <p className="text-2xl font-bold text-blue-600">{stats.porTipo['PATRULLAJE'] || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500">En Parada</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.porTipo['PARADA_REGULACION'] || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500">Comida</p>
            <p className="text-2xl font-bold text-orange-600">{stats.porTipo['COMIDA'] || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500">Combustible</p>
            <p className="text-2xl font-bold text-green-600">{stats.porTipo['COMBUSTIBLE'] || 0}</p>
          </div>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar unidad, ruta, descripción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                showFilters ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>

            <select
              value={filters.estado}
              onChange={(e) => setFilters(prev => ({ ...prev, estado: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="ACTIVA">Solo Activas</option>
              <option value="">Todas</option>
              <option value="CERRADA">Cerradas</option>
            </select>

            <span className="text-sm text-gray-500">
              {sortedSituaciones.length} resultados
            </span>
          </div>

          {/* Panel de filtros expandido */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sede</label>
                <select
                  value={filters.sede}
                  onChange={(e) => setFilters(prev => ({ ...prev, sede: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Todas las sedes</option>
                  {Object.entries(SEDES_NOMBRES).map(([id, nombre]) => (
                    <option key={id} value={id}>{nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Situación</label>
                <select
                  value={filters.tipoSituacion}
                  onChange={(e) => setFilters(prev => ({ ...prev, tipoSituacion: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Todos los tipos</option>
                  {TIPOS_SITUACION.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ sede: '', tipoSituacion: '', estado: 'ACTIVA' })}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabla de Situaciones */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Cargando situaciones...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th
                      onClick={() => handleSort('unidad_codigo')}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    >
                      Unidad <SortIcon column="unidad_codigo" />
                    </th>
                    <th
                      onClick={() => handleSort('tipo_situacion')}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    >
                      Tipo <SortIcon column="tipo_situacion" />
                    </th>
                    <th
                      onClick={() => handleSort('ruta_codigo')}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    >
                      Ubicación <SortIcon column="ruta_codigo" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Sede
                    </th>
                    <th
                      onClick={() => handleSort('created_at')}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    >
                      Hora <SortIcon column="created_at" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedSituaciones.map((situacion: any) => (
                    <tr
                      key={situacion.id}
                      className="hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => setSelectedSituacion(situacion)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-8 rounded-full"
                            style={{ backgroundColor: situacion.sede_id ? COLORES_SEDE[situacion.sede_id] || '#6B7280' : '#6B7280' }}
                          />
                          <div>
                            <p className="font-medium text-gray-900">{situacion.unidad_codigo || `U-${situacion.unidad_id}`}</p>
                            <p className="text-xs text-gray-500">{situacion.tipo_unidad || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTipoSituacionBadge(situacion.tipo_situacion)}`}>
                          {situacion.tipo_situacion?.replace(/_/g, ' ') || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {situacion.ruta_codigo ? (
                          <div>
                            <p className="text-sm font-medium">{situacion.ruta_codigo} Km {situacion.km || '-'}</p>
                            {situacion.sentido && <p className="text-xs text-gray-500">{situacion.sentido}</p>}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-sm"
                          style={{ color: situacion.sede_id ? COLORES_SEDE[situacion.sede_id] : '#6B7280' }}
                        >
                          {situacion.sede_nombre || SEDES_NOMBRES[situacion.sede_id] || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDateTime(situacion.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          situacion.estado === 'ACTIVA' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {situacion.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/bitacora/${situacion.unidad_id}`);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Ver bitácora"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {sortedSituaciones.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No se encontraron situaciones con los filtros aplicados
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resumen por Sede */}
        <div className="mt-4 bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Distribución por Sede</h3>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
            {Object.entries(SEDES_NOMBRES).map(([sedeId, nombre]) => (
              <div
                key={sedeId}
                className="p-2 rounded-lg text-center cursor-pointer hover:opacity-80 transition"
                style={{ backgroundColor: `${COLORES_SEDE[Number(sedeId)]}20` }}
                onClick={() => setFilters(prev => ({ ...prev, sede: sedeId }))}
              >
                <p
                  className="text-lg font-bold"
                  style={{ color: COLORES_SEDE[Number(sedeId)] }}
                >
                  {stats.porSede[sedeId] || 0}
                </p>
                <p className="text-xs text-gray-600 truncate">{nombre}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de detalle de situación */}
      {selectedSituacion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2
                    className="text-2xl font-bold"
                    style={{ color: COLORES_SEDE[selectedSituacion.sede_id] || '#374151' }}
                  >
                    {selectedSituacion.unidad_codigo || `Unidad #${selectedSituacion.unidad_id}`}
                  </h2>
                  <p className="text-gray-500">{selectedSituacion.tipo_unidad}</p>
                </div>
                <button
                  onClick={() => setSelectedSituacion(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getTipoSituacionBadge(selectedSituacion.tipo_situacion)}`}>
                    {selectedSituacion.tipo_situacion?.replace(/_/g, ' ')}
                  </span>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    selectedSituacion.estado === 'ACTIVA' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedSituacion.estado}
                  </span>
                </div>

                {selectedSituacion.ruta_codigo && (
                  <div>
                    <p className="text-sm text-gray-500">Ubicación</p>
                    <p className="font-medium">
                      {selectedSituacion.ruta_codigo} Km {selectedSituacion.km}
                      {selectedSituacion.sentido && ` (${selectedSituacion.sentido})`}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-500">Sede</p>
                  <p
                    className="font-medium"
                    style={{ color: COLORES_SEDE[selectedSituacion.sede_id] || '#374151' }}
                  >
                    {selectedSituacion.sede_nombre || SEDES_NOMBRES[selectedSituacion.sede_id] || '-'}
                  </p>
                </div>

                {selectedSituacion.descripcion && (
                  <div>
                    <p className="text-sm text-gray-500">Descripción</p>
                    <p className="text-gray-800">{selectedSituacion.descripcion}</p>
                  </div>
                )}

                {selectedSituacion.observaciones && (
                  <div>
                    <p className="text-sm text-gray-500">Observaciones</p>
                    <p className="text-gray-800">{selectedSituacion.observaciones}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Inicio</p>
                    <p className="font-medium">{formatDateTime(selectedSituacion.created_at)}</p>
                  </div>
                  {selectedSituacion.updated_at && selectedSituacion.updated_at !== selectedSituacion.created_at && (
                    <div>
                      <p className="text-sm text-gray-500">Última actualización</p>
                      <p className="font-medium">{formatDateTime(selectedSituacion.updated_at)}</p>
                    </div>
                  )}
                </div>

                {selectedSituacion.combustible !== null && selectedSituacion.combustible !== undefined && (
                  <div>
                    <p className="text-sm text-gray-500">Combustible</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 rounded-full h-2"
                          style={{ width: `${Math.min(selectedSituacion.combustible * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{Math.round(selectedSituacion.combustible * 100)}%</span>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedSituacion(null);
                      navigate(`/bitacora/${selectedSituacion.unidad_id}`);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
                  >
                    Ver Bitácora Completa
                  </button>
                  <button
                    onClick={() => setSelectedSituacion(null)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
