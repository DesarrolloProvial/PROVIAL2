import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Search, Truck, ChevronDown, ChevronRight,
  Clock, MapPin, AlertTriangle, Activity, Users, Loader2,
} from 'lucide-react';
import api from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Unidad {
  id: number;
  codigo: string;
  tipo_unidad: string;
  sede_nombre: string;
  activa: boolean;
}

interface SituacionItem {
  id: number;
  tipo_macro: string;
  tipo_nombre: string | null;
  km: number | null;
  sentido: string | null;
  observaciones: string | null;
  created_at: string;
  cerrado_at: string | null;
}

interface ActividadItem {
  id: number;
  tipo_nombre: string | null;
  km: number | null;
  sentido: string | null;
  observaciones: string | null;
  estado: string;
  created_at: string;
  closed_at: string | null;
}

interface TripulanteSalida {
  brigada_id?: number;
  chapa?: string;
  nombre?: string;
  rol?: string;
}

interface SalidaConEvento {
  id: number;
  unidad_id: number;
  unidad_codigo: string;
  ruta_codigo: string | null;
  ruta_nombre: string | null;
  fecha_hora_salida: string;
  fecha_hora_regreso: string | null;
  estado: string;
  km_inicio: number | null;
  km_final: number | null;
  km_recorridos: number | null;
  combustible_inicial: number | null;
  combustible_final: number | null;
  tripulacion: TripulanteSalida[] | null;
  observaciones_salida: string | null;
  observaciones_regreso: string | null;
  situaciones: SituacionItem[];
  actividades: ActividadItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
}

function duracion(desde: string, hasta: string | null) {
  if (!hasta) return null;
  const mins = Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function estadoBadge(estado: string) {
  switch (estado) {
    case 'EN_SALIDA':  return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';
    case 'FINALIZADA': return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300';
    case 'CANCELADA':  return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';
    default:           return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
  }
}

function macroBadge(tipo: string) {
  switch (tipo) {
    case 'INCIDENTE':           return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';
    case 'ASISTENCIA_VEHICULAR':return 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300';
    case 'EMERGENCIA':
    case 'OBSTACULO':           return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300';
    default:                    return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function COPBitacoraPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedUnidad, setSelectedUnidad] = useState<Unidad | null>(null);
  const [expandedSalida, setExpandedSalida] = useState<number | null>(null);
  const [fechaDesde, setFechaDesde] = useState('');

  // Lista de unidades
  const { data: unidades = [], isLoading: loadingUnidades } = useQuery<Unidad[]>({
    queryKey: ['cop-bitacora-unidades'],
    queryFn: async () => {
      const res = await api.get('/unidades');
      return res.data?.unidades ?? res.data ?? [];
    },
  });

  // Bitácora de la unidad seleccionada
  const { data: bitacora = [], isLoading: loadingBitacora } = useQuery<SalidaConEvento[]>({
    queryKey: ['cop-bitacora', selectedUnidad?.id, fechaDesde],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (fechaDesde) params.set('fecha_desde', fechaDesde);
      const res = await api.get(`/salidas/bitacora/${selectedUnidad!.id}?${params}`);
      return res.data.data ?? [];
    },
    enabled: !!selectedUnidad,
  });

  const filteredUnidades = unidades.filter((u) =>
    u.codigo.toLowerCase().includes(search.toLowerCase()) ||
    u.tipo_unidad?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/cop/mapa')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Bitácora por Unidad</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Historial de salidas, situaciones y actividades</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto px-4 py-4 gap-4">

        {/* Panel izquierdo — selección de unidad */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar unidad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex-1 overflow-y-auto">
            {loadingUnidades ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : filteredUnidades.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">Sin unidades</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredUnidades.map((u) => (
                  <li key={u.id}>
                    <button
                      onClick={() => { setSelectedUnidad(u); setExpandedSalida(null); }}
                      className={`w-full text-left px-4 py-3 transition flex items-center gap-3 ${
                        selectedUnidad?.id === u.id
                          ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/40 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <Truck className="w-4 h-4 flex-shrink-0 opacity-60" />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{u.codigo}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.tipo_unidad}</p>
                      </div>
                      {selectedUnidad?.id === u.id && (
                        <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Panel derecho — bitácora */}
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">

          {!selectedUnidad ? (
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-3">
              <Truck className="w-12 h-12 opacity-30" />
              <p className="text-sm">Selecciona una unidad para ver su bitácora</p>
            </div>
          ) : (
            <>
              {/* Filtros */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-purple-500" />
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedUnidad.codigo}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{selectedUnidad.tipo_unidad}</span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Desde:</label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  {fechaDesde && (
                    <button onClick={() => setFechaDesde('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de salidas */}
              <div className="flex-1 overflow-y-auto space-y-3">
                {loadingBitacora ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : bitacora.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500 gap-2">
                    <Clock className="w-10 h-10 opacity-30" />
                    <p className="text-sm">Sin salidas registradas</p>
                  </div>
                ) : (
                  bitacora.map((salida) => {
                    const isExpanded = expandedSalida === salida.id;
                    const totalEventos = (salida.situaciones?.length ?? 0) + (salida.actividades?.length ?? 0);
                    const dur = duracion(salida.fecha_hora_salida, salida.fecha_hora_regreso);
                    const tripulacion: TripulanteSalida[] = Array.isArray(salida.tripulacion)
                      ? salida.tripulacion
                      : (typeof salida.tripulacion === 'string' ? JSON.parse(salida.tripulacion) : []);

                    return (
                      <div
                        key={salida.id}
                        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                      >
                        {/* Salida header */}
                        <button
                          onClick={() => setExpandedSalida(isExpanded ? null : salida.id)}
                          className="w-full px-5 py-4 flex items-start justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${estadoBadge(salida.estado)}`}>
                                {salida.estado === 'EN_SALIDA' ? 'En ruta' : salida.estado === 'FINALIZADA' ? 'Finalizada' : 'Cancelada'}
                              </span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {fmtDT(salida.fecha_hora_salida)}
                              </span>
                              {dur && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">· {dur}</span>
                              )}
                            </div>

                            <div className="mt-1 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                              {salida.ruta_codigo && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />{salida.ruta_codigo}
                                </span>
                              )}
                              {salida.km_recorridos !== null && salida.km_recorridos !== undefined && (
                                <span>{salida.km_recorridos} km</span>
                              )}
                              {totalEventos > 0 && (
                                <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                                  <Activity className="w-3 h-3" />{totalEventos} evento{totalEventos !== 1 ? 's' : ''}
                                </span>
                              )}
                              {tripulacion.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />{tripulacion.length} tripulante{tripulacion.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          )}
                        </button>

                        {/* Detalle expandido */}
                        {isExpanded && (
                          <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 space-y-4">

                            {/* Tripulación */}
                            {tripulacion.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5" /> Tripulación
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {tripulacion.map((t, i) => (
                                    <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                        {t.nombre || t.chapa || `Tripulante ${i + 1}`}
                                      </span>
                                      {t.rol && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">· {t.rol}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Situaciones */}
                            {salida.situaciones && salida.situaciones.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500" /> Situaciones ({salida.situaciones.length})
                                </h4>
                                <div className="space-y-1.5">
                                  {salida.situaciones.map((sit) => (
                                    <div key={sit.id} className="flex items-start gap-2 text-sm">
                                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${macroBadge(sit.tipo_macro)}`}>
                                        {sit.tipo_nombre || sit.tipo_macro}
                                      </span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        {fmtTime(sit.created_at)}
                                        {sit.cerrado_at && ` → ${fmtTime(sit.cerrado_at)}`}
                                      </span>
                                      {sit.km && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">km {sit.km}</span>
                                      )}
                                      {sit.observaciones && (
                                        <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{sit.observaciones}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Actividades */}
                            {salida.actividades && salida.actividades.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                  <Activity className="w-3.5 h-3.5 text-blue-500" /> Actividades ({salida.actividades.length})
                                </h4>
                                <div className="space-y-1.5">
                                  {salida.actividades.map((act) => (
                                    <div key={act.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                      <span className="font-medium text-gray-800 dark:text-gray-200">
                                        {act.tipo_nombre || 'Actividad'}
                                      </span>
                                      <span className="text-gray-400 dark:text-gray-500">
                                        {fmtTime(act.created_at)}
                                        {act.closed_at && ` → ${fmtTime(act.closed_at)}`}
                                        {act.closed_at && ` (${duracion(act.created_at, act.closed_at)})`}
                                      </span>
                                      {act.km && <span>km {act.km}</span>}
                                      {act.sentido && <span className="capitalize">{act.sentido.toLowerCase()}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Observaciones */}
                            {(salida.observaciones_salida || salida.observaciones_regreso) && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Observaciones</h4>
                                {salida.observaciones_salida && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Salida:</span> {salida.observaciones_salida}
                                  </p>
                                )}
                                {salida.observaciones_regreso && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                    <span className="font-medium">Regreso:</span> {salida.observaciones_regreso}
                                  </p>
                                )}
                              </div>
                            )}

                            {totalEventos === 0 && tripulacion.length === 0 && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">Sin eventos ni tripulación registrados</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
