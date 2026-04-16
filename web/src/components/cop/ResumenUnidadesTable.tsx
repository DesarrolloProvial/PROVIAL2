import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Plus, Activity, Route } from 'lucide-react';
import SituacionIcon from '../common/SituacionIcon';


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
  onCreateSituacion?: (unidadId: number) => void;
  onCreateActividad?: (unidadId: number) => void;
  onCambiarRuta?: (unidadId: number) => void;
}

export default function ResumenUnidadesTable({ resumen, onSelectUnidad, onCreateSituacion, onCreateActividad, onCambiarRuta }: Props) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // observaciones puede ser string (legacy) o JSONB array [{hora,mensaje,usuario}]
  const extractObservaciones = (obs: any): string | null => {
    if (!obs) return null;
    if (typeof obs === 'string') return obs;
    if (Array.isArray(obs) && obs.length > 0) return obs[obs.length - 1]?.mensaje ?? null;
    return null;
  };

  const formatHora = (fecha: string | null) => {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
  };

  const getEstadoBadgeClass = (estado: string | null) => {
    switch (estado) {
      case 'ACTIVA':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
      case 'CERRADA':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    }
  };

  const getTipoSituacionBadgeClass = (tipo: string | null) => {
    if (!tipo) return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';

    const tipoLower = tipo.toLowerCase();
    if (tipoLower.includes('incidente')) return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    if (tipoLower.includes('patrullaje')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    if (tipoLower.includes('parada')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
    if (tipoLower.includes('comida')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300';
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
  };

  const filteredResumen = resumen.filter((u) => {
    const searchLower = search.toLowerCase();
    return (
      u.unidad_codigo.toLowerCase().includes(searchLower) ||
      u.tipo_unidad.toLowerCase().includes(searchLower) ||
      u.sede_nombre?.toLowerCase().includes(searchLower) ||
      u.placa?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow h-full flex flex-col">
      {/* Header con búsqueda */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Resumen de Unidades
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredResumen.length} de {resumen.length} unidades
          </span>
        </div>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Buscar unidad, tipo, sede..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-auto flex-1">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Unidad
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Situación Actual
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Ubicación
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Ruta Activa
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Última Hora
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ minWidth: '300px' }}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredResumen.map((unidad) => (
              <tr
                key={unidad.unidad_id}
                onClick={() => navigate(`/bitacora/${unidad.unidad_id}`)}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition"
              >
                {/* Unidad */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-start gap-2">
                    <div
                      className="w-2 h-full min-h-[40px] rounded-full flex-shrink-0"
                      style={{ backgroundColor: unidad.sede_id ? COLORES_SEDE[unidad.sede_id] || '#6B7280' : '#6B7280' }}
                      title={unidad.sede_nombre || 'Sin sede'}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {unidad.unidad_codigo}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
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
                          <span className="inline-block px-1.5 py-0.5 text-[10px] rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium">
                            ACT
                          </span>
                        )}
                      </div>
                      {extractObservaciones(unidad.observaciones) && (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[180px]" title={extractObservaciones(unidad.observaciones)!}>
                          {extractObservaciones(unidad.observaciones)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">Sin actividad</span>
                  )}
                </td>

                {/* Ubicación */}
                <td className="px-4 py-4 whitespace-nowrap">
                  {unidad.ruta_codigo ? (
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {unidad.ruta_codigo} Km {unidad.km || '-'}
                      </div>
                      {unidad.sentido && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {unidad.sentido}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                  )}
                </td>

                {/* Ruta Activa */}
                <td className="px-4 py-4 whitespace-nowrap">
                  {unidad.ruta_activa_codigo || unidad.ruta_codigo ? (
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {unidad.ruta_activa_codigo || unidad.ruta_codigo}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">Sin ruta</span>
                  )}
                </td>

                {/* Última Hora */}
                <td className="px-4 py-4 whitespace-nowrap">
                  {(unidad.sa_updated_at || unidad.created_at) ? (
                    <div>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {formatHora(unidad.sa_updated_at || unidad.created_at)}
                      </div>
                      <div className="text-[11px] text-gray-400 dark:text-gray-500">
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
                    <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                  )}
                </td>

                {/* Acciones */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/bitacora/${unidad.unidad_id}`);
                      }}
                      className="flex items-center gap-1 px-2 py-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition text-xs font-medium"
                      title="Ver bitácora"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Bitácora
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateSituacion?.(unidad.unidad_id);
                      }}
                      className="flex items-center gap-1 px-2 py-1.5 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-lg transition text-xs font-medium"
                      title="Crear situación para esta unidad"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Situación
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateActividad?.(unidad.unidad_id);
                      }}
                      className="flex items-center gap-1 px-2 py-1.5 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition text-xs font-medium"
                      title="Crear actividad para esta unidad"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      Actividad
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCambiarRuta?.(unidad.unidad_id);
                      }}
                      className="flex items-center gap-1 px-2 py-1.5 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 rounded-lg transition text-xs font-medium"
                      title="Cambiar ruta de esta unidad"
                    >
                      <Route className="w-3.5 h-3.5" />
                      Ruta
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectUnidad?.(unidad.unidad_id);
                      }}
                      className="flex items-center gap-1 px-2 py-1.5 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition text-xs font-medium"
                      title="Ver en mapa"
                    >
                      📍
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredResumen.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No se encontraron unidades
        </div>
      )}
    </div>
  );
}
