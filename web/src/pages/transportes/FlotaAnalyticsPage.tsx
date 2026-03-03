import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft, BarChart2, Fuel, Truck, Wrench, CheckCircle, AlertTriangle,
  X, Loader2,
} from 'lucide-react';
import api from '../../services/api';
import ThemeToggle from '../../components/ThemeToggle';

// ── Types ──────────────────────────────────────────────────────────────────────

interface EstadisticaUnidad {
  unidad_id: number;
  unidad_codigo: string;
  tipo_unidad: string;
  sede_nombre: string;
  activa: boolean;
  combustible_actual: number | null;
  nivel_combustible: string | null;
  odometro_actual: number;
  turnos_ultimo_mes: number;
  turnos_ultimo_trimestre: number;
  km_ultimo_mes: number | null;
}

interface TendenciaCombustible {
  fecha: string;
  promedio_combustible: number;
  num_registros: number;
}

interface ReparacionActiva {
  id: number;
  unidad_id: number;
  unidad_codigo: string;
  tipo_unidad: string;
  motivo: string;
  descripcion: string | null;
  fecha_inicio: string;
  dias_en_taller: number;
  registrado_por_nombre: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPct(val: number) {
  return `${Math.round(val * 100)}%`;
}

function fmtFecha(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-GT', {
    day: '2-digit', month: 'short',
  });
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function FlotaAnalyticsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [completarId, setCompletarId] = useState<number | null>(null);

  // Estadísticas de unidades (barChart de salidas)
  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ['unidades-estadisticas'],
    queryFn: async () => {
      const res = await api.get('/operaciones/unidades/estadisticas');
      return (res.data.data || []) as EstadisticaUnidad[];
    },
  });

  // Tendencia de combustible
  const { data: tendenciaData, isLoading: loadingTendencia } = useQuery({
    queryKey: ['combustible-tendencia'],
    queryFn: async () => {
      const res = await api.get('/operaciones/combustible/tendencia?dias=30');
      return (res.data.data || []) as TendenciaCombustible[];
    },
  });

  // Reparaciones activas
  const { data: reparaciones, isLoading: loadingRep } = useQuery({
    queryKey: ['reparaciones-activas'],
    queryFn: async () => {
      const res = await api.get('/reparaciones/activas');
      return (res.data.data || []) as ReparacionActiva[];
    },
  });

  // Completar reparación
  const completarMutation = useMutation({
    mutationFn: (id: number) => api.put(`/reparaciones/${id}/completar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reparaciones-activas'] });
      queryClient.invalidateQueries({ queryKey: ['reparaciones-unidad'] });
      setCompletarId(null);
    },
  });

  // KPIs
  const unidades = statsData ?? [];
  const totalActivas = unidades.filter((u) => u.activa).length;
  const enReparacion = reparaciones?.length ?? 0;
  const promCombustible =
    unidades.length > 0
      ? unidades.reduce((acc, u) => acc + (u.combustible_actual ?? 0), 0) / unidades.length
      : 0;
  const bajoCombustible = unidades.filter(
    (u) => u.combustible_actual !== null && u.combustible_actual < 0.25
  ).length;
  const kmMes = unidades.reduce((acc, u) => acc + (u.km_ultimo_mes ?? 0), 0);

  // Top 10 unidades por salidas
  const topSalidas = [...unidades]
    .sort((a, b) => b.turnos_ultimo_mes - a.turnos_ultimo_mes)
    .slice(0, 10)
    .map((u) => ({ nombre: u.unidad_codigo, salidas: u.turnos_ultimo_mes }));

  // Tendencia formateada
  const tendencia = (tendenciaData ?? []).map((t) => ({
    fecha: fmtFecha(t.fecha),
    promedio: Math.round(t.promedio_combustible * 100),
  }));

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/transportes')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-2 bg-teal-600 rounded-lg">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Analytics de Flota</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Últimos 30 días</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-16">

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Unidades activas"
            value={loadingStats ? '…' : String(totalActivas)}
            sub={enReparacion > 0 ? `${enReparacion} en taller` : 'Sin reparaciones'}
            icon={<Truck className="w-5 h-5" />}
            color="blue"
          />
          <KpiCard
            label="Combustible promedio"
            value={loadingStats ? '…' : fmtPct(promCombustible)}
            sub="flota completa"
            icon={<Fuel className="w-5 h-5" />}
            color={promCombustible < 0.25 ? 'red' : 'amber'}
          />
          <KpiCard
            label="Bajo combustible"
            value={loadingStats ? '…' : String(bajoCombustible)}
            sub="unidades < 25%"
            icon={<AlertTriangle className="w-5 h-5" />}
            color={bajoCombustible > 0 ? 'red' : 'green'}
          />
          <KpiCard
            label="Km este mes"
            value={loadingStats ? '…' : kmMes.toLocaleString('es-GT')}
            sub="km recorridos"
            icon={<BarChart2 className="w-5 h-5" />}
            color="teal"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Unidades con más salidas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Unidades con más salidas — último mes
            </h2>
            {loadingStats ? (
              <LoadingChart />
            ) : topSalidas.length === 0 ? (
              <EmptyChart msg="Sin datos de salidas" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topSalidas} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v) => [v ?? 0, 'Salidas']}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="salidas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Tendencia combustible */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Combustible promedio de flota — últimos 30 días (%)
            </h2>
            {loadingTendencia ? (
              <LoadingChart />
            ) : tendencia.length === 0 ? (
              <EmptyChart msg="Sin registros de combustible" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={tendencia} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <defs>
                    <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                  <Tooltip
                    formatter={(v) => [`${v ?? 0}%`, 'Promedio']}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="promedio"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#fuelGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Reparaciones activas */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-orange-500" />
              Unidades en taller
              {enReparacion > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs rounded-full">
                  {enReparacion}
                </span>
              )}
            </h2>
          </div>

          {loadingRep ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : !reparaciones || reparaciones.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              No hay unidades en reparación actualmente
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unidad</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Motivo</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Desde</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Días</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {reparaciones.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-3 px-3">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{r.unidad_codigo}</span>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{r.tipo_unidad}</span>
                      </td>
                      <td className="py-3 px-3 text-gray-700 dark:text-gray-300">
                        <div className="font-medium">{r.motivo}</div>
                        {r.descripcion && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{r.descripcion}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {fmtFecha(r.fecha_inicio)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.dias_en_taller > 7
                            ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                            : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                        }`}>
                          {r.dias_en_taller}d
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setCompletarId(r.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg text-xs hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Completar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Confirmar completar */}
      {completarId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Completar reparación</h3>
              <button onClick={() => setCompletarId(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              ¿Confirmar que la reparación ha sido completada? La unidad quedará disponible nuevamente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCompletarId(null)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => completarMutation.mutate(completarId)}
                disabled={completarMutation.isPending}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {completarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const colorMap: Record<string, string> = {
  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  teal: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
};

function KpiCard({
  label, value, sub, icon, color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className={`inline-flex p-2 rounded-lg ${colorMap[color] ?? colorMap.blue} mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-0.5">{label}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function LoadingChart() {
  return (
    <div className="flex items-center justify-center h-[220px]">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  );
}

function EmptyChart({ msg }: { msg: string }) {
  return (
    <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">{msg}</div>
  );
}
