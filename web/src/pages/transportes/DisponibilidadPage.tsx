import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { ArrowLeft, CheckSquare, XSquare, Save } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import api from '../../services/api';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface UnidadDisponibilidad {
  id: number;
  codigo: string;
  tipo_unidad: string;
  placa: string | null;
  marca: string | null;
  modelo: string | null;
  sede_id: number;
  sede_nombre: string;
  activa: boolean;
  disponible_transportes: boolean;
  instrucciones_transportes: string | null;
  en_reparacion: boolean;
  reparacion_motivo: string | null;
}

interface EstadoLocal {
  disponible: boolean;
  instrucciones: string;
  modificado: boolean;
}

type FiltroDisp = 'todas' | 'disponibles' | 'no_disponibles';

// ── Componente ────────────────────────────────────────────────────────────────

export default function DisponibilidadPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [filtro, setFiltro] = useState<FiltroDisp>('todas');
  const [estadosLocales, setEstadosLocales] = useState<Record<number, EstadoLocal>>({});
  const [guardando, setGuardando] = useState<Set<number>>(new Set());

  // ── Carga de unidades ──────────────────────────────────────────────────────

  const { data: unidades = [], isLoading } = useQuery<UnidadDisponibilidad[]>({
    queryKey: ['unidades-disponibilidad', user?.sede_id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.sede_id) params.set('sede_id', String(user.sede_id));
      params.set('activa', 'true');
      const res = await api.get(`/unidades?${params.toString()}`);
      return res.data.unidades ?? res.data;
    },
  });

  // ── Estado local de edición ────────────────────────────────────────────────

  const getEstado = useCallback((unidad: UnidadDisponibilidad): EstadoLocal => {
    if (estadosLocales[unidad.id]) return estadosLocales[unidad.id];
    return {
      disponible: unidad.disponible_transportes,
      instrucciones: unidad.instrucciones_transportes ?? '',
      modificado: false,
    };
  }, [estadosLocales]);

  const setDisponible = (id: number, val: boolean, unidad: UnidadDisponibilidad) => {
    setEstadosLocales(prev => {
      const base = prev[id] ?? {
        disponible: unidad.disponible_transportes,
        instrucciones: unidad.instrucciones_transportes ?? '',
        modificado: false,
      };
      return { ...prev, [id]: { ...base, disponible: val, modificado: true } };
    });
  };

  const setInstrucciones = (id: number, val: string, unidad: UnidadDisponibilidad) => {
    setEstadosLocales(prev => {
      const base = prev[id] ?? {
        disponible: unidad.disponible_transportes,
        instrucciones: unidad.instrucciones_transportes ?? '',
        modificado: false,
      };
      return { ...prev, [id]: { ...base, instrucciones: val, modificado: true } };
    });
  };

  // ── Guardar ────────────────────────────────────────────────────────────────

  const guardarUnidad = async (unidad: UnidadDisponibilidad) => {
    const estado = estadosLocales[unidad.id];
    if (!estado || !estado.modificado) return;

    setGuardando(prev => new Set(prev).add(unidad.id));
    try {
      await api.put(`/unidades/${unidad.id}/disponibilidad-transportes`, {
        disponible: estado.disponible,
        instrucciones: estado.instrucciones || null,
      });
      setEstadosLocales(prev => ({
        ...prev,
        [unidad.id]: { ...estado, modificado: false },
      }));
      queryClient.invalidateQueries({ queryKey: ['unidades-disponibilidad'] });
    } catch (err: any) {
      alert(`Error al guardar: ${err.response?.data?.error || err.message}`);
    } finally {
      setGuardando(prev => {
        const next = new Set(prev);
        next.delete(unidad.id);
        return next;
      });
    }
  };

  // ── Filtrado y estadísticas ────────────────────────────────────────────────

  const unidadesFiltradas = unidades.filter(u => {
    if (filtro === 'todas') return true;
    const estado = getEstado(u);
    if (filtro === 'disponibles') return estado.disponible;
    if (filtro === 'no_disponibles') return !estado.disponible;
    return true;
  });

  const totalDisponibles = unidades.filter(u => getEstado(u).disponible).length;
  const totalNoDisponibles = unidades.filter(u => !getEstado(u).disponible).length;
  const totalModificadas = Object.values(estadosLocales).filter(e => e.modificado).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/transportes')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="p-2 bg-green-600 rounded-lg">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Disponibilidad de Unidades
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Autorizar unidades para Operaciones
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {totalModificadas > 0 && (
              <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                {totalModificadas} cambio{totalModificadas !== 1 ? 's' : ''} sin guardar
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{unidades.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-800 p-4">
            <p className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wider">Disponibles</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">{totalDisponibles}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 p-4">
            <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wider">No disponibles</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-1">{totalNoDisponibles}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-4">
          {([
            { key: 'todas', label: 'Todas' },
            { key: 'disponibles', label: 'Disponibles' },
            { key: 'no_disponibles', label: 'No disponibles' },
          ] as { key: FiltroDisp; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtro === key
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tabla */}
        {isLoading ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            Cargando unidades...
          </div>
        ) : unidadesFiltradas.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            No hay unidades en esta categoría
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tipo / Placa
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Sede
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Disponible
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Instrucciones para Operaciones
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {unidadesFiltradas.map(unidad => {
                    const estado = getEstado(unidad);
                    const saving = guardando.has(unidad.id);
                    return (
                      <tr
                        key={unidad.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
                          estado.modificado ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                        }`}
                      >
                        {/* Código */}
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                            {unidad.codigo}
                          </span>
                        </td>

                        {/* Tipo / Placa */}
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {unidad.tipo_unidad}
                          </span>
                          {unidad.placa && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              {unidad.placa}
                            </p>
                          )}
                        </td>

                        {/* Sede */}
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {unidad.sede_nombre}
                        </td>

                        {/* Toggle disponible */}
                        <td className="px-4 py-3 text-center">
                          {unidad.en_reparacion ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 cursor-not-allowed" title="En reparación — finaliza la reparación primero">
                              <XSquare className="w-3.5 h-3.5" /> En taller
                            </span>
                          ) : (
                            <button
                              onClick={() => setDisponible(unidad.id, !estado.disponible, unidad)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                                estado.disponible
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                              }`}
                            >
                              {estado.disponible
                                ? <><CheckSquare className="w-3.5 h-3.5" /> Si</>
                                : <><XSquare className="w-3.5 h-3.5" /> No</>
                              }
                            </button>
                          )}
                        </td>

                        {/* Instrucciones */}
                        <td className="px-4 py-3">
                          <textarea
                            value={estado.instrucciones}
                            onChange={e => setInstrucciones(unidad.id, e.target.value, unidad)}
                            placeholder="Ej: Sale a CA-9 Norte, no exceder 200 km..."
                            rows={2}
                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none min-w-[220px]"
                          />
                        </td>

                        {/* Guardar */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => guardarUnidad(unidad)}
                            disabled={!estado.modificado || saving}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              estado.modificado && !saving
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            <Save className="w-3.5 h-3.5" />
                            {saving ? 'Guardando...' : 'Guardar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
