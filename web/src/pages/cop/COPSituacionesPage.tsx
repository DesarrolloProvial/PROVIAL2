import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { situacionesAPI, actividadesAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, ArrowLeft, Search, Filter, MapPin,
  ChevronDown, ChevronUp, X, Wifi, WifiOff, Calendar,
} from 'lucide-react';
import { useDashboardSocket } from '../../hooks/useSocket';
import ThemeToggle from '../../components/common/ThemeToggle';
import { localToday } from '../../utils/dates';

const COLORES_SEDE: Record<number, string> = {
  1: '#3B82F6', 2: '#10B981', 3: '#F59E0B', 4: '#8B5CF6',
  5: '#EC4899', 6: '#14B8A6', 7: '#EF4444', 8: '#6366F1', 9: '#F97316',
};

const SEDES_NOMBRES: Record<number, string> = {
  1: 'Central', 2: 'Mazatenango', 3: 'Poptún', 4: 'San Cristóbal',
  5: 'Quetzaltenango', 6: 'Coatepeque', 7: 'Palín', 8: 'Morales', 9: 'Río Dulce',
};

function todayISO() {
  return localToday();
}

export default function COPSituacionesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [filters, setFilters] = useState({
    sede: '',
    estado: 'ACTIVA',
    fechaDesde: todayISO(),
    fechaHasta: todayISO(),
  });

  const { isConnected: socketConnected, lastUpdate } = useDashboardSocket(queryClient);

  const dateParams = {
    estado: filters.estado || undefined,
    fecha_desde: filters.fechaDesde ? `${filters.fechaDesde}T00:00:00` : undefined,
    fecha_hasta: filters.fechaHasta ? `${filters.fechaHasta}T23:59:59` : undefined,
  };

  const { data: situaciones = [], isLoading: loadingSit, refetch: refetchSit } = useQuery({
    queryKey: ['situaciones-cop', filters.estado, filters.fechaDesde, filters.fechaHasta],
    queryFn: () => situacionesAPI.getAll(dateParams),
    refetchInterval: socketConnected ? false : 30000,
  });

  const { data: actividades = [], isLoading: loadingAct, refetch: refetchAct } = useQuery({
    queryKey: ['actividades-cop', filters.estado, filters.fechaDesde, filters.fechaHasta],
    queryFn: () => actividadesAPI.getAll(dateParams),
    refetchInterval: socketConnected ? false : 30000,
  });

  const isLoading = loadingSit || loadingAct;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchSit(), refetchAct()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatLastUpdate = () =>
    lastUpdate.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const formatDateTime = (fecha: string | null) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleString('es-GT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // Merge situaciones + actividades into a single list with _type tag
  const allItems: any[] = useMemo(() => {
    const sits = (situaciones as any[]).map(s => ({ ...s, _type: 'SITUACION' }));
    const acts = (actividades as any[]).map(a => ({
      ...a,
      _type: 'ACTIVIDAD',
      tipo_situacion: a.tipo_actividad_nombre || a.tipo_actividad_categoria || 'ACTIVIDAD',
      descripcion: a.observaciones,
    }));
    return [...sits, ...acts];
  }, [situaciones, actividades]);

  // Filtrar
  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase();
    return allItems.filter((item: any) => {
      const matchSearch =
        item.unidad_codigo?.toLowerCase().includes(searchLower) ||
        item.tipo_situacion?.toLowerCase().includes(searchLower) ||
        item.ruta_codigo?.toLowerCase().includes(searchLower) ||
        item.descripcion?.toLowerCase().includes(searchLower) ||
        String(item.id).includes(searchLower);

      const matchSede = !filters.sede || item.sede_id === Number(filters.sede);

      return matchSearch && matchSede;
    });
  }, [allItems, search, filters.sede]);

  // Ordenar
  const sorted = useMemo(() => {
    return [...filtered].sort((a: any, b: any) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      return sortConfig.direction === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [filtered, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return null;
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="w-4 h-4 inline ml-1" />
      : <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  const getTypeBadge = (item: any) => {
    if (item._type === 'ACTIVIDAD') return 'bg-indigo-100 text-indigo-800';
    const tipo = (item.tipo_situacion || '').toLowerCase();
    if (tipo.includes('incidente')) return 'bg-red-100 text-red-800';
    if (tipo.includes('patrullaje')) return 'bg-blue-100 text-blue-800';
    if (tipo.includes('parada')) return 'bg-yellow-100 text-yellow-800';
    if (tipo.includes('comida')) return 'bg-orange-100 text-orange-800';
    if (tipo.includes('combustible')) return 'bg-green-100 text-green-800';
    return 'bg-purple-100 text-purple-800';
  };

  const getItemLabel = (item: any) =>
    item._type === 'ACTIVIDAD' ? `ACT-${item.id}` : `#${item.id}`;

  // Estadísticas
  const stats = useMemo(() => ({
    totalActivas: allItems.filter((i: any) => i.estado === 'ACTIVA').length,
    situaciones: situaciones.length,
    actividades: actividades.length,
    incidentes: (situaciones as any[]).filter((s: any) =>
      (s.tipo_situacion || '').toLowerCase().includes('incidente')).length,
    porSede: Object.keys(SEDES_NOMBRES).reduce((acc, sedeId) => {
      acc[sedeId] = allItems.filter((i: any) => i.sede_id === Number(sedeId)).length;
      return acc;
    }, {} as Record<string, number>),
  }), [allItems, situaciones, actividades]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-full px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">COP - Situaciones en Tiempo Real</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
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
              <ThemeToggle />
              <button
                onClick={() => navigate('/cop/mapa')}
                className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Ver Mapa
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Activas (total)</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalActivas}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Situaciones</p>
            <p className="text-2xl font-bold text-purple-600">{stats.situaciones}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Actividades</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.actividades}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Incidentes</p>
            <p className="text-2xl font-bold text-red-600">{stats.incidentes}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total registros</p>
            <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{allItems.length}</p>
          </div>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar unidad, ID, tipo, ruta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Fechas */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="date"
                value={filters.fechaDesde}
                onChange={(e) => setFilters(prev => ({ ...prev, fechaDesde: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500 text-sm">—</span>
              <input
                type="date"
                value={filters.fechaHasta}
                onChange={(e) => setFilters(prev => ({ ...prev, fechaHasta: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filters.estado}
              onChange={(e) => setFilters(prev => ({ ...prev, estado: e.target.value }))}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="ACTIVA">Solo Activas</option>
              <option value="">Todas</option>
              <option value="CERRADA">Cerradas</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                showFilters ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>

            <span className="text-sm text-gray-500 dark:text-gray-400">
              {sorted.length} resultado{sorted.length !== 1 ? 's' : ''}
            </span>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sede</label>
                <select
                  value={filters.sede}
                  onChange={(e) => setFilters(prev => ({ ...prev, sede: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg"
                >
                  <option value="">Todas las sedes</option>
                  {Object.entries(SEDES_NOMBRES).map(([id, nombre]) => (
                    <option key={id} value={id}>{nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ sede: '', estado: 'ACTIVA', fechaDesde: todayISO(), fechaHasta: todayISO() })}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-24">
                      Boleta
                    </th>
                    <th
                      onClick={() => handleSort('unidad_codigo')}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Unidad <SortIcon column="unidad_codigo" />
                    </th>
                    <th
                      onClick={() => handleSort('tipo_situacion')}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Tipo <SortIcon column="tipo_situacion" />
                    </th>
                    <th
                      onClick={() => handleSort('ruta_codigo')}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Ubicación <SortIcon column="ruta_codigo" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Sede
                    </th>
                    <th
                      onClick={() => handleSort('created_at')}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Hora <SortIcon column="created_at" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sorted.map((item: any) => (
                    <tr
                      key={`${item._type}-${item.id}`}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer"
                      onClick={() => setSelectedItem(item)}
                    >
                      {/* Boleta / ID */}
                      <td className="px-3 py-3">
                        <span className={`font-mono text-xs font-bold px-2 py-1 rounded ${
                          item._type === 'ACTIVIDAD'
                            ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                          {getItemLabel(item)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-8 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.sede_id ? COLORES_SEDE[item.sede_id] || '#6B7280' : '#6B7280' }}
                          />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{item.unidad_codigo || `U-${item.unidad_id}`}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.tipo_unidad || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeBadge(item)}`}>
                          {item.tipo_situacion?.replace(/_/g, ' ') || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.ruta_codigo ? (
                          <div>
                            <p className="text-sm font-medium dark:text-gray-200">{item.ruta_codigo} Km {item.km || '-'}</p>
                            {item.sentido && <p className="text-xs text-gray-500 dark:text-gray-400">{item.sentido}</p>}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: item.sede_id ? COLORES_SEDE[item.sede_id] : '#6B7280' }}>
                          {SEDES_NOMBRES[item.sede_id] || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatDateTime(item.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.estado === 'ACTIVA' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          {item.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {sorted.length === 0 && (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No se encontraron registros con los filtros aplicados
                </div>
              )}
            </div>
          )}
        </div>

        {/* Distribución por Sede */}
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Distribución por Sede</h3>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
            {Object.entries(SEDES_NOMBRES).map(([sedeId, nombre]) => (
              <div
                key={sedeId}
                className="p-2 rounded-lg text-center cursor-pointer hover:opacity-80 transition"
                style={{ backgroundColor: `${COLORES_SEDE[Number(sedeId)]}20` }}
                onClick={() => setFilters(prev => ({ ...prev, sede: prev.sede === sedeId ? '' : sedeId }))}
              >
                <p className="text-lg font-bold" style={{ color: COLORES_SEDE[Number(sedeId)] }}>
                  {stats.porSede[sedeId] || 0}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{nombre}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de detalle */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  {/* Boleta prominente */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-mono font-bold text-lg px-3 py-1 rounded-lg ${
                      selectedItem._type === 'ACTIVIDAD'
                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                        : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                    }`}>
                      {getItemLabel(selectedItem)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">
                      {selectedItem._type}
                    </span>
                  </div>
                  <h2
                    className="text-2xl font-bold dark:text-gray-100"
                    style={{ color: COLORES_SEDE[selectedItem.sede_id] || '#374151' }}
                  >
                    {selectedItem.unidad_codigo || `Unidad #${selectedItem.unidad_id}`}
                  </h2>
                  {selectedItem.tipo_unidad && (
                    <p className="text-gray-500 dark:text-gray-400">{selectedItem.tipo_unidad}</p>
                  )}
                </div>
                <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                  <X className="w-5 h-5 dark:text-gray-300" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getTypeBadge(selectedItem)}`}>
                    {selectedItem.tipo_situacion?.replace(/_/g, ' ')}
                  </span>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    selectedItem.estado === 'ACTIVA'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>
                    {selectedItem.estado}
                  </span>
                </div>

                {selectedItem.ruta_codigo && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ubicación</p>
                    <p className="font-medium dark:text-gray-200">
                      {selectedItem.ruta_codigo} Km {selectedItem.km}
                      {selectedItem.sentido && ` (${selectedItem.sentido})`}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Sede</p>
                  <p className="font-medium" style={{ color: COLORES_SEDE[selectedItem.sede_id] || '#374151' }}>
                    {SEDES_NOMBRES[selectedItem.sede_id] || '-'}
                  </p>
                </div>

                {selectedItem.descripcion && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Descripción / Observaciones</p>
                    <p className="text-gray-800 dark:text-gray-200">{selectedItem.descripcion}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Inicio</p>
                    <p className="font-medium dark:text-gray-200">{formatDateTime(selectedItem.created_at)}</p>
                  </div>
                  {selectedItem.closed_at && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Cierre</p>
                      <p className="font-medium dark:text-gray-200">{formatDateTime(selectedItem.closed_at)}</p>
                    </div>
                  )}
                </div>

                {selectedItem.creado_por_nombre && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Registrado por</p>
                    <p className="font-medium dark:text-gray-200">{selectedItem.creado_por_nombre}</p>
                  </div>
                )}

                <div className="pt-4 border-t dark:border-gray-700 flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedItem(null);
                      navigate(`/bitacora/${selectedItem.unidad_id}`);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
                  >
                    Ver Bitácora
                  </button>
                  {selectedItem._type === 'SITUACION' && (
                    <button
                      onClick={() => {
                        setSelectedItem(null);
                        navigate(`/editar-situacion/${selectedItem.id}`);
                      }}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition"
                    >
                      Ver detalle
                    </button>
                  )}
                  {selectedItem._type === 'ACTIVIDAD' && (
                    <button
                      onClick={() => {
                        setSelectedItem(null);
                        navigate(`/ver-actividad/${selectedItem.id}`);
                      }}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition"
                    >
                      Ver detalle
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition"
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
