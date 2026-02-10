import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SituacionIcon from './SituacionIcon';


interface ResumenUnidad {
  unidad_id: number;
  unidad_codigo: string;
  tipo_unidad: string;
  placa: string;
  sede_id: number | null;
  sede_nombre: string;
  situacion_id: number | null;
  actividad_id: number | null;
  ultima_situacion: string | null;
  estado_situacion: string | null;
  tipo_registro: 'SITUACION' | 'ACTIVIDAD' | null;
  created_at: string | null;
  sa_updated_at: string | null;
  km: number | null;
  sentido: string | null;
  ruta_codigo: string | null;
  ruta_activa_codigo: string | null;
  observaciones: string | null;
  situacion_icono: string | null;
  situacion_color: string | null;
  situacion_nombre: string | null;
}

// Colores por sede (mismo que en DashboardPage)
const COLORES_SEDE: Record<number, string> = {
  1: '#3B82F6', // Central - Azul
  2: '#10B981', // Mazatenango - Verde
  3: '#F59E0B', // Poptún - Amarillo
  4: '#8B5CF6', // San Cristóbal - Púrpura
  5: '#EC4899', // Quetzaltenango - Rosa
  6: '#14B8A6', // Coatepeque - Teal
  7: '#EF4444', // Palín - Rojo
  8: '#6366F1', // Morales - Indigo
  9: '#F97316', // Río Dulce - Naranja
};

interface Props {
  resumen: ResumenUnidad[];
  onSelectUnidad?: (unidadId: number) => void;
}

export default function ResumenUnidadesTable({ resumen, onSelectUnidad }: Props) {
  const [search, setSearch] = useState('');
  const [soloActivas, setSoloActivas] = useState(true); // Por defecto, solo mostrar activas
  const navigate = useNavigate();

  const formatHora = (fecha: string | null) => {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
  };

  const getEstadoBadgeClass = (estado: string | null) => {
    switch (estado) {
      case 'ACTIVA':
        return 'bg-green-100 text-green-800';
      case 'CERRADA':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getTipoSituacionBadgeClass = (tipo: string | null) => {
    if (!tipo) return 'bg-gray-100 text-gray-600';

    const tipoLower = tipo.toLowerCase();
    if (tipoLower.includes('incidente')) return 'bg-red-100 text-red-800';
    if (tipoLower.includes('patrullaje')) return 'bg-blue-100 text-blue-800';
    if (tipoLower.includes('parada')) return 'bg-yellow-100 text-yellow-800';
    if (tipoLower.includes('comida')) return 'bg-orange-100 text-orange-800';
    return 'bg-purple-100 text-purple-800';
  };

  const filteredResumen = resumen.filter((u) => {
    // Filtro de búsqueda
    const searchLower = search.toLowerCase();
    const matchesSearch =
      u.unidad_codigo.toLowerCase().includes(searchLower) ||
      u.tipo_unidad.toLowerCase().includes(searchLower) ||
      u.sede_nombre?.toLowerCase().includes(searchLower) ||
      u.placa?.toLowerCase().includes(searchLower);

    // Filtro de solo activas (unidades con situación o actividad activa)
    const isActiva = u.estado_situacion === 'ACTIVA' || u.ultima_situacion !== null;

    if (soloActivas) {
      return matchesSearch && isActiva;
    }
    return matchesSearch;
  });

  // Contar unidades activas para el contador
  const unidadesActivas = resumen.filter(u => u.estado_situacion === 'ACTIVA' || u.ultima_situacion !== null).length;

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header con búsqueda */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-800">
            Resumen de Unidades
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {filteredResumen.length} de {resumen.length} unidades
              {soloActivas && ` (${unidadesActivas} activas)`}
            </span>
          </div>
        </div>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Buscar unidad, tipo, sede..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {/* Toggle para mostrar solo activas */}
          <button
            onClick={() => setSoloActivas(!soloActivas)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${soloActivas
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            title={soloActivas ? 'Mostrando solo activas' : 'Mostrando todas'}
          >
            {soloActivas ? 'Solo Activas' : 'Ver Todas'}
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unidad
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Situación Actual
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ubicación
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ruta Activa
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Última Hora
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredResumen.map((unidad) => (
              <tr
                key={unidad.unidad_id}
                onClick={() => navigate(`/bitacora/${unidad.unidad_id}`)}
                className="hover:bg-gray-50 cursor-pointer transition"
              >
                {/* Unidad */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-start gap-2">
                    {/* Indicador de color de sede */}
                    <div
                      className="w-2 h-full min-h-[40px] rounded-full flex-shrink-0"
                      style={{ backgroundColor: unidad.sede_id ? COLORES_SEDE[unidad.sede_id] || '#6B7280' : '#6B7280' }}
                      title={unidad.sede_nombre || 'Sin sede'}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {unidad.unidad_codigo}
                      </div>
                      <div className="text-xs text-gray-500">
                        {unidad.tipo_unidad}
                      </div>
                      {unidad.sede_nombre && (
                        <div className="text-xs" style={{ color: unidad.sede_id ? COLORES_SEDE[unidad.sede_id] : '#6B7280' }}>
                          {unidad.sede_nombre}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Situación Actual */}
                <td className="px-4 py-4">
                  {unidad.ultima_situacion ? (
                    <div className="space-y-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getTipoSituacionBadgeClass(
                          unidad.ultima_situacion
                        )}`}
                      >
                        <SituacionIcon icono={unidad.situacion_icono} color={unidad.situacion_color} size={14} />
                        {unidad.situacion_nombre || unidad.ultima_situacion.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-1">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs rounded-full ${getEstadoBadgeClass(
                            unidad.estado_situacion
                          )}`}
                        >
                          {unidad.estado_situacion || 'EN RUTA'}
                        </span>
                        {unidad.tipo_registro === 'ACTIVIDAD' && (
                          <span className="inline-block px-1.5 py-0.5 text-[10px] rounded bg-blue-50 text-blue-600 font-medium">
                            ACT
                          </span>
                        )}
                      </div>
                      {unidad.observaciones && (
                        <div className="text-[11px] text-gray-500 truncate max-w-[180px]" title={unidad.observaciones}>
                          {unidad.observaciones}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Sin actividad</span>
                  )}
                </td>

                {/* Ubicación */}
                <td className="px-4 py-4 whitespace-nowrap">
                  {unidad.ruta_codigo ? (
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {unidad.ruta_codigo} Km {unidad.km || '-'}
                      </div>
                      {unidad.sentido && (
                        <div className="text-xs text-gray-500">
                          {unidad.sentido}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>

                {/* Ruta Activa */}
                <td className="px-4 py-4 whitespace-nowrap">
                  {unidad.ruta_activa_codigo || unidad.ruta_codigo ? (
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {unidad.ruta_activa_codigo || unidad.ruta_codigo}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Sin ruta</span>
                  )}
                </td>



                {/* Última Hora */}
                <td className="px-4 py-4 whitespace-nowrap">
                  {(unidad.sa_updated_at || unidad.created_at) ? (
                    <div>
                      <div className="text-sm text-gray-900">
                        {formatHora(unidad.sa_updated_at || unidad.created_at)}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {(() => {
                          const fecha = unidad.sa_updated_at || unidad.created_at;
                          if (!fecha) return '';
                          const d = new Date(fecha);
                          const hoy = new Date();
                          if (d.toDateString() === hoy.toDateString()) return 'Hoy';
                          return d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short' });
                        })()}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>

                {/* Acciones */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Evitar navegar a bitácora
                      onSelectUnidad?.(unidad.unidad_id);
                    }}
                    className="text-green-600 hover:text-green-900 text-sm font-medium"
                  >
                    📍 Ver en mapa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredResumen.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron unidades
        </div>
      )}
    </div>
  );
}
