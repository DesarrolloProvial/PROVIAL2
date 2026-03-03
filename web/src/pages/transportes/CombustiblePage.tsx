import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Fuel, Truck, RefreshCw, X, ChevronRight, AlertTriangle, ArrowLeft,
  Wrench, CheckCircle, Loader2, Plus,
} from 'lucide-react';
import { transportesService, CombustibleRegistro } from '../../services/transportes.service';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import ThemeToggle from '../../components/ThemeToggle';

// ── Constantes de nivel ───────────────────────────────────────────────────────

const NIVELES = [
  { value: 'RESERVA', decimal: 0.0,   label: '0',     symbol: 'Reserva' },
  { value: '1/8',     decimal: 0.125, label: '⅛',     symbol: '1/8' },
  { value: '1/4',     decimal: 0.25,  label: '¼',     symbol: '1/4' },
  { value: '3/8',     decimal: 0.375, label: '⅜',     symbol: '3/8' },
  { value: '1/2',     decimal: 0.5,   label: '½',     symbol: '1/2' },
  { value: '5/8',     decimal: 0.625, label: '⅝',     symbol: '5/8' },
  { value: '3/4',     decimal: 0.75,  label: '¾',     symbol: '3/4' },
  { value: '7/8',     decimal: 0.875, label: '⅞',     symbol: '7/8' },
  { value: 'LLENO',   decimal: 1.0,   label: 'Lleno', symbol: 'Lleno' },
];

// ── Tipos locales ─────────────────────────────────────────────────────────────

interface Unidad {
  id: number;
  codigo: string;
  tipo_unidad: string;
  tipo_combustible: string;
  sede_nombre: string;
  nivel_combustible: string | null;
  combustible_actual: number | null;
  activa: boolean;
}

interface Sede {
  id: number;
  codigo: string;
  nombre: string;
}

interface ReparacionActiva {
  id: number;
  unidad_id: number;
  motivo: string;
  fecha_inicio: string;
  dias_en_taller: number;
}

interface ReparacionHistorial extends ReparacionActiva {
  descripcion: string | null;
  fecha_fin: string | null;
  estado: 'EN_REPARACION' | 'COMPLETADA' | 'CANCELADA';
}

interface RepForm {
  motivo: string;
  descripcion: string;
  fecha_inicio: string;
}

interface AjusteFormData {
  nivel_anterior: string | null;
  nivel_nuevo: string;
  tipo_combustible: string;
  odometro_actual: string;
  observaciones: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNivelBadgeClass(decimal: number | null): string {
  if (decimal === null || decimal === undefined) {
    return 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400';
  }
  if (decimal < 0.25) {
    return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400';
  }
  if (decimal < 0.5) {
    return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400';
  }
  return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400';
}

function getTipoCombustibleBadge(tipo: string): string {
  return tipo === 'DIESEL'
    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
    : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400';
}

function getTipoBadge(tipo: CombustibleRegistro['tipo']): string {
  switch (tipo) {
    case 'INICIAL': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400';
    case 'RECARGA': return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400';
    case 'FINAL':   return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400';
    case 'AJUSTE':  return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400';
    default:        return 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400';
  }
}

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-GT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

// ── FuelSelector (web) ────────────────────────────────────────────────────────

function FuelSelectorWeb({
  value,
  onChange,
}: {
  value: string;
  onChange: (nivel: string, decimal: number) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {NIVELES.map((n) => {
        const isSelected = value === n.value;
        return (
          <button
            key={n.value}
            type="button"
            onClick={() => onChange(n.value, n.decimal)}
            className={`flex flex-col items-center justify-center py-3 rounded-lg border-2 transition-all ${
              isSelected
                ? 'border-orange-500 bg-orange-500 text-white dark:bg-orange-600 dark:border-orange-600'
                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-orange-300 dark:hover:border-orange-500'
            }`}
          >
            <span className="text-xl font-bold leading-none">{n.label}</span>
            {n.value !== 'LLENO' && n.value !== 'RESERVA' && (
              <span className="text-xs mt-0.5 opacity-75">{n.value}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CombustiblePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const isAdminRole = user?.rol === 'ADMIN' || user?.rol === 'SUPER_ADMIN';

  const [sedeFilter, setSedeFilter] = useState<number | ''>('');
  const [historialUnidad, setHistorialUnidad] = useState<Unidad | null>(null);
  const [ajusteUnidad, setAjusteUnidad] = useState<Unidad | null>(null);
  const [ajusteForm, setAjusteForm] = useState<AjusteFormData>({
    nivel_anterior: null,
    nivel_nuevo: '',
    tipo_combustible: 'GASOLINA',
    odometro_actual: '',
    observaciones: '',
  });
  const [ajusteError, setAjusteError] = useState<string | null>(null);

  // Reparaciones modal
  const [reparacionUnidad, setReparacionUnidad] = useState<Unidad | null>(null);
  const [repTab, setRepTab] = useState<'nueva' | 'historial'>('nueva');
  const [repForm, setRepForm] = useState<RepForm>({
    motivo: '',
    descripcion: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
  });
  const [repError, setRepError] = useState<string | null>(null);

  // ── Queries ─────────────────────────────────────────────────────────────────

  const {
    data: unidades = [],
    isLoading: loadingUnidades,
    isError: errorUnidades,
    refetch: refetchUnidades,
  } = useQuery<Unidad[]>({
    queryKey: ['combustible-unidades', sedeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sedeFilter) params.set('sede_id', String(sedeFilter));
      const res = await api.get(`/unidades?${params.toString()}`);
      return res.data?.unidades ?? res.data ?? [];
    },
  });

  const { data: sedes = [] } = useQuery<Sede[]>({
    queryKey: ['sedes-list'],
    queryFn: async () => {
      const res = await api.get('/sedes');
      return res.data?.sedes ?? res.data ?? [];
    },
    enabled: isAdminRole,
  });

  const {
    data: historial = [],
    isLoading: loadingHistorial,
    isError: errorHistorial,
  } = useQuery<CombustibleRegistro[]>({
    queryKey: ['historial-combustible', historialUnidad?.id],
    queryFn: () => transportesService.getHistorialCombustible(historialUnidad!.id),
    enabled: !!historialUnidad,
  });

  const { data: reparacionesActivas = [] } = useQuery<ReparacionActiva[]>({
    queryKey: ['reparaciones-activas-combustible'],
    queryFn: async () => {
      const res = await api.get('/reparaciones/activas');
      return res.data?.data ?? [];
    },
  });

  const {
    data: historialRep = [],
    isLoading: loadingHistorialRep,
  } = useQuery<ReparacionHistorial[]>({
    queryKey: ['reparaciones-unidad', reparacionUnidad?.id],
    queryFn: async () => {
      const res = await api.get(`/reparaciones/unidad/${reparacionUnidad!.id}`);
      return res.data?.data ?? [];
    },
    enabled: !!reparacionUnidad && repTab === 'historial',
  });

  // ── Mutaciones ───────────────────────────────────────────────────────────────

  const ajusteMutation = useMutation({
    mutationFn: async () => {
      if (!ajusteForm.nivel_nuevo) {
        throw new Error('Debes seleccionar el nivel de combustible nuevo.');
      }
      const nivelObj = NIVELES.find(n => n.value === ajusteForm.nivel_nuevo);
      // Update fuel type on the unit if it changed
      if (ajusteUnidad && ajusteForm.tipo_combustible !== (ajusteUnidad.tipo_combustible ?? 'GASOLINA')) {
        await api.put(`/unidades/${ajusteUnidad.id}`, { tipo_combustible: ajusteForm.tipo_combustible });
      }
      return transportesService.registrarAjusteCombustible({
        unidad_id: ajusteUnidad!.id,
        tipo: 'AJUSTE',
        nivel_anterior: ajusteForm.nivel_anterior,
        nivel_nuevo: ajusteForm.nivel_nuevo,
        combustible_anterior: ajusteForm.nivel_anterior != null
          ? (NIVELES.find(n => n.value === ajusteForm.nivel_anterior)?.decimal ?? undefined)
          : undefined,
        combustible_nuevo: nivelObj?.decimal ?? 0,
        odometro_actual: ajusteForm.odometro_actual
          ? parseFloat(ajusteForm.odometro_actual)
          : undefined,
        observaciones: ajusteForm.observaciones || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combustible-unidades'] });
      queryClient.invalidateQueries({ queryKey: ['historial-combustible', ajusteUnidad?.id] });
      cerrarAjusteModal();
    },
    onError: (err: any) => {
      const mensaje =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Error al registrar el ajuste.';
      setAjusteError(mensaje);
    },
  });

  const crearReparacionMutation = useMutation({
    mutationFn: async () => {
      return api.post('/reparaciones', {
        unidad_id: reparacionUnidad!.id,
        motivo: repForm.motivo.trim(),
        descripcion: repForm.descripcion.trim() || undefined,
        fecha_inicio: repForm.fecha_inicio,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reparaciones-activas-combustible'] });
      queryClient.invalidateQueries({ queryKey: ['reparaciones-unidad', reparacionUnidad?.id] });
      queryClient.invalidateQueries({ queryKey: ['reparaciones-activas'] });
      cerrarReparacionModal();
    },
    onError: (err: any) => {
      setRepError(
        err?.response?.data?.message || err?.message || 'Error al registrar la reparación.'
      );
    },
  });

  const completarReparacionMutation = useMutation({
    mutationFn: (id: number) => api.put(`/reparaciones/${id}/completar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reparaciones-activas-combustible'] });
      queryClient.invalidateQueries({ queryKey: ['reparaciones-unidad', reparacionUnidad?.id] });
      queryClient.invalidateQueries({ queryKey: ['reparaciones-activas'] });
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function abrirHistorial(unidad: Unidad) { setHistorialUnidad(unidad); }
  function cerrarHistorial() { setHistorialUnidad(null); }

  function abrirAjuste(unidad: Unidad) {
    setAjusteUnidad(unidad);
    setAjusteForm({
      nivel_anterior: unidad.nivel_combustible ?? null,
      nivel_nuevo: '',
      tipo_combustible: unidad.tipo_combustible ?? 'GASOLINA',
      odometro_actual: '',
      observaciones: '',
    });
    setAjusteError(null);
  }

  function cerrarAjusteModal() {
    setAjusteUnidad(null);
    setAjusteForm({ nivel_anterior: null, nivel_nuevo: '', tipo_combustible: 'GASOLINA', odometro_actual: '', observaciones: '' });
    setAjusteError(null);
  }

  function handleAjusteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAjusteError(null);
    ajusteMutation.mutate();
  }

  function abrirReparacion(unidad: Unidad) {
    setReparacionUnidad(unidad);
    setRepTab('nueva');
    setRepForm({ motivo: '', descripcion: '', fecha_inicio: new Date().toISOString().split('T')[0] });
    setRepError(null);
  }

  function cerrarReparacionModal() {
    setReparacionUnidad(null);
    setRepError(null);
  }

  function handleCrearReparacion(e: React.FormEvent) {
    e.preventDefault();
    setRepError(null);
    if (!repForm.motivo.trim()) {
      setRepError('El motivo es requerido.');
      return;
    }
    crearReparacionMutation.mutate();
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/transportes')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              title="Volver a Transportes"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <Fuel className="w-8 h-8 text-orange-500" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Control de Combustible
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {loadingUnidades ? 'Cargando...' : `${unidades.length} unidad${unidades.length !== 1 ? 'es' : ''}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => refetchUnidades()}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              title="Actualizar"
            >
              <RefreshCw className={`w-5 h-5 ${loadingUnidades ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Contenido ───────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">

        {/* Filtro de sede */}
        {isAdminRole && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Filtrar por sede:
              </label>
              <select
                value={sedeFilter}
                onChange={(e) => setSedeFilter(e.target.value ? parseInt(e.target.value) : '')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              >
                <option value="">Todas las sedes</option>
                {sedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

          {errorUnidades && (
            <div className="p-6 flex flex-col items-center gap-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-10 h-10" />
              <p className="font-medium">Error al cargar las unidades</p>
              <button onClick={() => refetchUnidades()} className="text-sm underline hover:no-underline">
                Reintentar
              </button>
            </div>
          )}

          {!errorUnidades && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide text-xs">
                      <div className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" />Unidad</div>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide text-xs">Tipo vehículo</th>
                    {isAdminRole && (
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide text-xs">Sede</th>
                    )}
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide text-xs">Combustible</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide text-xs">
                      <div className="flex items-center gap-1.5"><Fuel className="w-3.5 h-3.5" />Nivel</div>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide text-xs">Estado</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide text-xs">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">

                  {loadingUnidades && Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {[...Array(isAdminRole ? 7 : 6)].map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                        </td>
                      ))}
                    </tr>
                  ))}

                  {!loadingUnidades && unidades.length === 0 && (
                    <tr>
                      <td colSpan={isAdminRole ? 7 : 6} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                        <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>No se encontraron unidades</p>
                      </td>
                    </tr>
                  )}

                  {!loadingUnidades && unidades.map((unidad) => (
                    <tr key={unidad.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/40 transition ${!unidad.activa ? 'opacity-60' : ''}`}>

                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
                        {unidad.codigo}
                      </td>

                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {unidad.tipo_unidad}
                      </td>

                      {isAdminRole && (
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {unidad.sede_nombre}
                        </td>
                      )}

                      {/* Tipo de combustible */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${getTipoCombustibleBadge(unidad.tipo_combustible ?? 'GASOLINA')}`}>
                          {unidad.tipo_combustible ?? 'GASOLINA'}
                        </span>
                      </td>

                      {/* Nivel del tanque */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${getNivelBadgeClass(unidad.combustible_actual)}`}>
                          {unidad.combustible_actual !== null && unidad.combustible_actual < 0.25 && (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {unidad.nivel_combustible ?? 'Sin datos'}
                        </span>
                      </td>

                      {/* Estado reparación */}
                      <td className="px-4 py-3">
                        {reparacionesActivas.some(r => r.unidad_id === unidad.id) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
                            <Wrench className="w-3 h-3" />En taller
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <button
                            onClick={() => abrirHistorial(unidad)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition"
                          >
                            Ver Historial<ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => abrirAjuste(unidad)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 rounded-lg transition"
                          >
                            <Fuel className="w-3.5 h-3.5" />Ajustar Nivel
                          </button>
                          <button
                            onClick={() => abrirReparacion(unidad)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 border border-orange-200 dark:border-orange-800 rounded-lg transition"
                          >
                            <Wrench className="w-3.5 h-3.5" />Reparación
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── Modal: Ver Historial ─────────────────────────────────────────────── */}
      {historialUnidad && (
        <div
          className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) cerrarHistorial(); }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Fuel className="w-5 h-5 text-orange-500" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Historial de Combustible</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {historialUnidad.codigo} &mdash; {historialUnidad.tipo_unidad}
                    {historialUnidad.nivel_combustible && (
                      <span className="ml-2 font-medium">Nivel actual: {historialUnidad.nivel_combustible}</span>
                    )}
                  </p>
                </div>
              </div>
              <button onClick={cerrarHistorial} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loadingHistorial && (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-700/50 rounded-lg h-16" />
                  ))}
                </div>
              )}

              {errorHistorial && (
                <div className="flex flex-col items-center gap-2 py-8 text-red-500 dark:text-red-400">
                  <AlertTriangle className="w-8 h-8" />
                  <p className="text-sm font-medium">Error al cargar el historial</p>
                </div>
              )}

              {!loadingHistorial && !errorHistorial && historial.length === 0 && (
                <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                  <Fuel className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin registros de combustible</p>
                </div>
              )}

              {!loadingHistorial && !errorHistorial && historial.length > 0 && (
                <div className="space-y-3">
                  {historial.map((registro) => (
                    <div key={registro.id} className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getTipoBadge(registro.tipo)}`}>
                            {registro.tipo}
                          </span>
                          {/* Nivel anterior → nivel nuevo */}
                          <div className="flex items-center gap-1.5 text-sm">
                            <span className="text-gray-500 dark:text-gray-400">
                              {registro.nivel_anterior ?? '?'}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {registro.nivel_nuevo ?? '?'}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                          {formatFecha(registro.created_at as unknown as string)}
                        </span>
                      </div>

                      {registro.odometro_actual !== null && registro.odometro_actual !== undefined && (
                        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                          Odómetro: {registro.odometro_actual.toLocaleString()} km
                          {registro.km_recorridos !== null && registro.km_recorridos !== undefined && registro.km_recorridos > 0 && (
                            <span className="ml-2">(+{registro.km_recorridos} km)</span>
                          )}
                        </p>
                      )}

                      {registro.registrado_por_nombre && (
                        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                          Registrado por: {registro.registrado_por_nombre}
                        </p>
                      )}

                      {registro.observaciones && (
                        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 rounded p-2 border border-gray-100 dark:border-gray-700">
                          {registro.observaciones}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button onClick={cerrarHistorial} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Ajustar Nivel ─────────────────────────────────────────────── */}
      {ajusteUnidad && (
        <div
          className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !ajusteMutation.isPending) cerrarAjusteModal(); }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Fuel className="w-5 h-5 text-orange-500" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ajustar Nivel</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {ajusteUnidad.codigo} &mdash; {ajusteUnidad.tipo_unidad}
                  </p>
                </div>
              </div>
              <button onClick={cerrarAjusteModal} disabled={ajusteMutation.isPending} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition disabled:opacity-50">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Scrollable body */}
            <form onSubmit={handleAjusteSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Tipo de combustible */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de combustible
                </label>
                <div className="flex gap-2">
                  {['GASOLINA', 'DIESEL'].map(tipo => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setAjusteForm(f => ({ ...f, tipo_combustible: tipo }))}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                        ajusteForm.tipo_combustible === tipo
                          ? tipo === 'DIESEL'
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : 'border-orange-500 bg-orange-500 text-white'
                          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nivel anterior */}
              {ajusteUnidad.combustible_actual === null ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nivel actual (primera vez) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full font-medium">
                      Sin registro previo
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Esta unidad no tiene combustible registrado. Selecciona el nivel con el que parte.
                  </p>
                  <FuelSelectorWeb
                    value={ajusteForm.nivel_anterior ?? ''}
                    onChange={(nivel) => setAjusteForm(f => ({ ...f, nivel_anterior: nivel }))}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nivel anterior</label>
                  <span className={`inline-flex px-3 py-1.5 rounded-lg text-sm font-semibold ${getNivelBadgeClass(ajusteUnidad.combustible_actual)}`}>
                    {ajusteForm.nivel_anterior ?? 'Sin datos'}
                  </span>
                </div>
              )}

              {/* Selector de nivel nuevo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {ajusteUnidad.combustible_actual === null ? 'Nivel nuevo (tras abastecimiento)' : 'Nivel nuevo'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <FuelSelectorWeb
                  value={ajusteForm.nivel_nuevo}
                  onChange={(nivel) => setAjusteForm(f => ({ ...f, nivel_nuevo: nivel }))}
                />
                {ajusteForm.nivel_nuevo && (
                  <p className="mt-2 text-xs text-orange-600 dark:text-orange-400 font-medium">
                    Seleccionado: {ajusteForm.nivel_nuevo} ({Math.round((NIVELES.find(n => n.value === ajusteForm.nivel_nuevo)?.decimal ?? 0) * 100)}% del tanque)
                  </p>
                )}
              </div>

              {/* Odómetro */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Odómetro actual <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={ajusteForm.odometro_actual}
                    onChange={(e) => setAjusteForm(f => ({ ...f, odometro_actual: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">km</span>
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observaciones <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Motivo del ajuste, novedades..."
                  value={ajusteForm.observaciones}
                  onChange={(e) => setAjusteForm(f => ({ ...f, observaciones: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                />
              </div>

              {ajusteError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{ajusteError}</p>
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                type="button"
                onClick={cerrarAjusteModal}
                disabled={ajusteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAjusteSubmit}
                disabled={
                  ajusteMutation.isPending ||
                  !ajusteForm.nivel_nuevo ||
                  (ajusteUnidad.combustible_actual === null && !ajusteForm.nivel_anterior)
                }
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ajusteMutation.isPending ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" />Guardando...</>
                ) : (
                  <><Fuel className="w-4 h-4" />Registrar Ajuste</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Reparaciones ──────────────────────────────────────────────── */}
      {reparacionUnidad && (
        <div
          className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) cerrarReparacionModal(); }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Wrench className="w-5 h-5 text-orange-500" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Reparaciones</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {reparacionUnidad.codigo} &mdash; {reparacionUnidad.tipo_unidad}
                  </p>
                </div>
              </div>
              <button onClick={cerrarReparacionModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              {(['nueva', 'historial'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRepTab(tab)}
                  className={`flex-1 py-2.5 text-sm font-medium capitalize transition ${
                    repTab === tab
                      ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab === 'nueva' ? 'Nueva Reparación' : 'Historial'}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">

              {/* Tab: Nueva */}
              {repTab === 'nueva' && (
                <form onSubmit={handleCrearReparacion} className="px-5 py-4 space-y-4">

                  {reparacionesActivas.some(r => r.unidad_id === reparacionUnidad.id) && (
                    <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg">
                      <Wrench className="w-4 h-4 text-orange-500 shrink-0" />
                      <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                        Esta unidad ya tiene una reparación activa.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Motivo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={repForm.motivo}
                      onChange={(e) => setRepForm(f => ({ ...f, motivo: e.target.value }))}
                      placeholder="Ej: Fallo de motor, cambio de llantas..."
                      maxLength={200}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Descripción <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={repForm.descripcion}
                      onChange={(e) => setRepForm(f => ({ ...f, descripcion: e.target.value }))}
                      placeholder="Detalles adicionales sobre la reparación..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Fecha de inicio
                    </label>
                    <input
                      type="date"
                      value={repForm.fecha_inicio}
                      onChange={(e) => setRepForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                    />
                  </div>

                  {repError && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-600 dark:text-red-400">{repError}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={cerrarReparacionModal}
                      className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={crearReparacionMutation.isPending || !repForm.motivo.trim()}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {crearReparacionMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      Registrar Reparación
                    </button>
                  </div>
                </form>
              )}

              {/* Tab: Historial */}
              {repTab === 'historial' && (
                <div className="px-5 py-4">
                  {loadingHistorialRep ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-700/50 rounded-lg h-20" />
                      ))}
                    </div>
                  ) : historialRep.length === 0 ? (
                    <div className="py-10 text-center text-gray-500 dark:text-gray-400 text-sm">
                      <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Sin historial de reparaciones
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {historialRep.map((r) => {
                        const esActiva = r.estado === 'EN_REPARACION';
                        return (
                          <div
                            key={r.id}
                            className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-4 border border-gray-100 dark:border-gray-700"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{r.motivo}</p>
                                {r.descripcion && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.descripcion}</p>
                                )}
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  Desde {formatFecha(r.fecha_inicio + 'T00:00:00')}
                                  {r.fecha_fin && ` → ${formatFecha(r.fecha_fin + 'T00:00:00')}`}
                                  {' · '}
                                  <span className="font-medium">{r.dias_en_taller}d en taller</span>
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  esActiva
                                    ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                                    : r.estado === 'COMPLETADA'
                                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                }`}>
                                  {r.estado === 'EN_REPARACION' ? 'En taller' : r.estado === 'COMPLETADA' ? 'Completada' : 'Cancelada'}
                                </span>
                                {esActiva && (
                                  <button
                                    onClick={() => completarReparacionMutation.mutate(r.id)}
                                    disabled={completarReparacionMutation.isPending}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded text-xs hover:bg-green-100 dark:hover:bg-green-900/40 transition disabled:opacity-50"
                                  >
                                    {completarReparacionMutation.isPending ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <CheckCircle className="w-3 h-3" />
                                    )}
                                    Completar
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
