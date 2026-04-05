import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Fuel, Truck, RefreshCw, X, ChevronRight, AlertTriangle, ArrowLeft,
  Wrench, CheckCircle, Loader2, History, Search,
} from 'lucide-react';
import { transportesService, HistorialItem, Abastecimiento } from '../../services/transportes.service';
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
  en_reparacion: boolean;
  reparacion_id: number | null;
  reparacion_motivo: string | null;
}

interface Sede {
  id: number;
  codigo: string;
  nombre: string;
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
  const hoy = new Date().toISOString().split('T')[0];
  const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [histDesde, setHistDesde] = useState(hace30);
  const [histHasta, setHistHasta] = useState(hoy);
  const [histTipos, setHistTipos] = useState<string[]>(['combustible', 'salidas', 'reparaciones']);
  // applied filters (updated on Buscar click)
  const [histParams, setHistParams] = useState({ desde: hace30, hasta: hoy, tipos: ['combustible', 'salidas', 'reparaciones'] });
  const [ajusteUnidad, setAjusteUnidad] = useState<Unidad | null>(null);
  const [ajusteForm, setAjusteForm] = useState<AjusteFormData>({
    nivel_anterior: null,
    nivel_nuevo: '',
    tipo_combustible: 'GASOLINA',
    odometro_actual: '',
    observaciones: '',
  });
  const [ajusteError, setAjusteError] = useState<string | null>(null);

  // Abastecimiento modal
  const [abastecimientoUnidad, setAbastecimientoUnidad] = useState<Unidad | null>(null);
  const [abastTab, setAbastTab] = useState<'nuevo' | 'historial'>('nuevo');
  const [abastForm, setAbastForm] = useState({
    nivel_anterior: '' as string,
    nivel_nuevo: '' as string,
    combustible_anterior: 0,
    combustible_nuevo: 0,
    odometro_actual: '',
    litros_cargados: '',
    observaciones: '',
  });
  const [abastError, setAbastError] = useState<string | null>(null);

  // Reparaciones modal
  const [reparacionUnidad, setReparacionUnidad] = useState<Unidad | null>(null);
  const [repForm, setRepForm] = useState<RepForm>({
    motivo: '',
    descripcion: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
  });
  const [repError, setRepError] = useState<string | null>(null);
  const [repSuccess, setRepSuccess] = useState(false);

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
  } = useQuery<HistorialItem[]>({
    queryKey: ['historial-unificado', historialUnidad?.id, histParams],
    queryFn: () => transportesService.getHistorialUnificado(historialUnidad!.id, histParams),
    enabled: !!historialUnidad,
  });


  const {
    data: historialAbast = [],
    isLoading: loadingHistorialAbast,
  } = useQuery<Abastecimiento[]>({
    queryKey: ['abastecimientos-unidad', abastecimientoUnidad?.id],
    queryFn: () => transportesService.getAbastecimientos(abastecimientoUnidad!.id),
    enabled: !!abastecimientoUnidad && abastTab === 'historial',
  });

  // ── Mutaciones ───────────────────────────────────────────────────────────────

  const ajusteMutation = useMutation({
    mutationFn: async () => {
      if (!ajusteForm.nivel_nuevo) {
        throw new Error('Debes seleccionar el nivel de combustible nuevo.');
      }
      const nivelObj = NIVELES.find(n => n.value === ajusteForm.nivel_nuevo);
      // Guardar tipo de combustible solo si la unidad aún no lo tiene definido (primera vez)
      if (ajusteUnidad && !ajusteUnidad.tipo_combustible) {
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
      queryClient.invalidateQueries({ queryKey: ['combustible-unidades'] });
      queryClient.invalidateQueries({ queryKey: ['reparaciones-activas-combustible'] });
      queryClient.invalidateQueries({ queryKey: ['reparaciones-activas'] });
      setRepSuccess(true);
      setTimeout(() => cerrarReparacionModal(), 1800);
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
      queryClient.invalidateQueries({ queryKey: ['combustible-unidades'] });
      queryClient.invalidateQueries({ queryKey: ['reparaciones-activas-combustible'] });
      queryClient.invalidateQueries({ queryKey: ['reparaciones-activas'] });
      cerrarReparacionModal();
    },
  });

  const abastecimientoMutation = useMutation({
    mutationFn: () => {
      const litros = parseFloat(abastForm.litros_cargados);
      if (!abastForm.nivel_nuevo || isNaN(litros) || litros <= 0) {
        throw new Error('Selecciona el nivel final y especifica los litros cargados.');
      }
      return transportesService.registrarAbastecimiento({
        unidad_id: abastecimientoUnidad!.id,
        nivel_anterior: abastForm.nivel_anterior || null,
        nivel_nuevo: abastForm.nivel_nuevo,
        combustible_anterior: abastForm.combustible_anterior,
        combustible_nuevo: abastForm.combustible_nuevo,
        odometro_actual: abastForm.odometro_actual ? parseFloat(abastForm.odometro_actual) : undefined,
        litros_cargados: litros,
        observaciones: abastForm.observaciones || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combustible-unidades'] });
      queryClient.invalidateQueries({ queryKey: ['abastecimientos-unidad', abastecimientoUnidad?.id] });
      cerrarAbastModal();
    },
    onError: (err: any) => {
      setAbastError(err?.response?.data?.message || err?.message || 'Error al registrar abastecimiento.');
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function abrirHistorial(unidad: Unidad) {
    setHistDesde(hace30);
    setHistHasta(hoy);
    setHistTipos(['combustible', 'salidas', 'reparaciones']);
    setHistParams({ desde: hace30, hasta: hoy, tipos: ['combustible', 'salidas', 'reparaciones'] });
    setHistorialUnidad(unidad);
  }
  function cerrarHistorial() { setHistorialUnidad(null); }

  function toggleHistTipo(tipo: string) {
    setHistTipos(prev => prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]);
  }

  function buscarHistorial() {
    if (histTipos.length === 0) return;
    setHistParams({ desde: histDesde, hasta: histHasta, tipos: histTipos });
  }

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

  function abrirAbastecimiento(unidad: Unidad) {
    setAbastecimientoUnidad(unidad);
    setAbastTab('nuevo');
    setAbastForm({
      nivel_anterior: unidad.nivel_combustible ?? '',
      nivel_nuevo: '',
      combustible_anterior: Number(unidad.combustible_actual ?? 0),
      combustible_nuevo: 0,
      odometro_actual: '',
      litros_cargados: '',
      observaciones: '',
    });
    setAbastError(null);
  }

  function cerrarAbastModal() {
    setAbastecimientoUnidad(null);
    setAbastError(null);
  }

  function handleAbastecimientoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAbastError(null);
    abastecimientoMutation.mutate();
  }

  function abrirReparacion(unidad: Unidad) {
    setReparacionUnidad(unidad);
    setRepForm({ motivo: '', descripcion: '', fecha_inicio: new Date().toISOString().split('T')[0] });
    setRepError(null);
    setRepSuccess(false);
  }

  function cerrarReparacionModal() {
    setReparacionUnidad(null);
    setRepError(null);
    setRepSuccess(false);
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

                  {!loadingUnidades && unidades.map((unidad) => {
                    const rowClass = unidad.en_reparacion
                      ? 'bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20 transition'
                      : !unidad.activa
                      ? 'opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/40 transition';
                    return (
                    <tr key={unidad.id} className={rowClass}>

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

                      {/* Estado */}
                      <td className="px-4 py-3">
                        {unidad.en_reparacion ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
                            <Wrench className="w-3 h-3" />En taller
                          </span>
                        ) : !unidad.activa ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            Inactiva
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                            Disponible
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {/* Ver historial — siempre visible */}
                          <button
                            onClick={() => abrirHistorial(unidad)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition"
                          >
                            Ver Historial<ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          {/* Botones solo para unidades activas */}
                          {unidad.activa && (
                            <>
                              {!unidad.en_reparacion && (
                                <>
                                  <button
                                    onClick={() => abrirAbastecimiento(unidad)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-lg transition"
                                  >
                                    <Fuel className="w-3.5 h-3.5" />Abastecer
                                  </button>
                                  <button
                                    onClick={() => abrirAjuste(unidad)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 rounded-lg transition"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />Ajustar
                                  </button>
                                  <button
                                    onClick={() => abrirReparacion(unidad)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 border border-orange-200 dark:border-orange-800 rounded-lg transition"
                                  >
                                    <Wrench className="w-3.5 h-3.5" />Reparación
                                  </button>
                                </>
                              )}
                              {unidad.en_reparacion && (
                                <button
                                  onClick={() => completarReparacionMutation.mutate(unidad.reparacion_id!)}
                                  disabled={completarReparacionMutation.isPending}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 border border-green-300 dark:border-green-700 rounded-lg transition disabled:opacity-50"
                                >
                                  {completarReparacionMutation.isPending
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <CheckCircle className="w-3.5 h-3.5" />}
                                  Finalizar reparación
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-blue-500" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Historial de Unidad</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {historialUnidad.codigo} — {historialUnidad.tipo_unidad} · {historialUnidad.sede_nombre}
                  </p>
                </div>
              </div>
              <button onClick={cerrarHistorial} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Filtros */}
            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 space-y-3">
              {/* Rango de fechas */}
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Desde</label>
                  <input
                    type="date"
                    value={histDesde}
                    onChange={(e) => setHistDesde(e.target.value)}
                    max={histHasta}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={histHasta}
                    onChange={(e) => setHistHasta(e.target.value)}
                    min={histDesde}
                    max={hoy}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <button
                  onClick={buscarHistorial}
                  disabled={histTipos.length === 0}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  <Search className="w-4 h-4" />
                  Buscar
                </button>
              </div>
              {/* Tipos */}
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'combustible', label: 'Combustible', color: 'orange' },
                  { key: 'salidas',     label: 'Salidas',     color: 'blue' },
                  { key: 'reparaciones',label: 'Reparaciones',color: 'red' },
                ].map(({ key, label, color }) => {
                  const active = histTipos.includes(key);
                  const cls = {
                    orange: active ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600',
                    blue:   active ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'   : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600',
                    red:    active ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'       : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600',
                  }[color];
                  return (
                    <button key={key} onClick={() => toggleHistTipo(key)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition ${cls}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto p-5">
              {loadingHistorial && (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
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
                  <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin registros en el rango seleccionado</p>
                </div>
              )}

              {!loadingHistorial && !errorHistorial && historial.length > 0 && (
                <div className="space-y-2">
                  {historial.map((item) => (
                    <HistorialItemCard key={`${item.categoria}-${item.id}`} item={item} />
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {historial.length} registro{historial.length !== 1 ? 's' : ''} encontrado{historial.length !== 1 ? 's' : ''}
              </span>
              <button onClick={cerrarHistorial} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
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
                {ajusteUnidad.tipo_combustible ? (
                  /* Ya definido — solo lectura */
                  <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border-2 ${
                    ajusteUnidad.tipo_combustible === 'DIESEL'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                  }`}>
                    {ajusteUnidad.tipo_combustible}
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(definido, no editable)</span>
                  </div>
                ) : (
                  /* Primera vez — seleccionable */
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
                )}
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
      {reparacionUnidad && (() => {
        const repActiva = reparacionUnidad.en_reparacion
          ? { id: reparacionUnidad.reparacion_id!, motivo: reparacionUnidad.reparacion_motivo ?? '', dias_en_taller: 0, fecha_inicio: '' }
          : null;
        return (
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
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Reparación</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {reparacionUnidad.codigo} &mdash; {reparacionUnidad.tipo_unidad}
                    </p>
                  </div>
                </div>
                <button onClick={cerrarReparacionModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                {/* Éxito */}
                {repSuccess && (
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-700 dark:text-green-300">Reparación registrada</p>
                      <p className="text-xs text-green-600 dark:text-green-400">La unidad aparecerá como "En taller" en la tabla.</p>
                    </div>
                  </div>
                )}

                {/* Reparación activa existente */}
                {repActiva && !repSuccess && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-orange-500 shrink-0" />
                      <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">En taller actualmente</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">{repActiva.motivo}</p>
                    </div>
                    <button
                      onClick={() => completarReparacionMutation.mutate(repActiva.id)}
                      disabled={completarReparacionMutation.isPending}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
                    >
                      {completarReparacionMutation.isPending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <CheckCircle className="w-4 h-4" />}
                      Marcar reparación como completada
                    </button>
                  </div>
                )}

                {/* Formulario nueva reparación — solo si no hay activa */}
                {!repActiva && !repSuccess && (
                  <form onSubmit={handleCrearReparacion} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Motivo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={repForm.motivo}
                        onChange={(e) => setRepForm(f => ({ ...f, motivo: e.target.value }))}
                        placeholder="Ej: Fallo de motor, cambio de frenos, suspensión..."
                        maxLength={200}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Descripción <span className="text-gray-400 font-normal">(opcional)</span>
                      </label>
                      <textarea
                        rows={3}
                        value={repForm.descripcion}
                        onChange={(e) => setRepForm(f => ({ ...f, descripcion: e.target.value }))}
                        placeholder="Detalles de la reparación, taller asignado, partes a reemplazar..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Fecha de ingreso al taller
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

                    <div className="flex justify-end gap-2 pt-1">
                      <button type="button" onClick={cerrarReparacionModal} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={crearReparacionMutation.isPending || !repForm.motivo.trim()}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {crearReparacionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                        Enviar a taller
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal: Abastecimiento ─────────────────────────────────────────────── */}
      {abastecimientoUnidad && (
        <div
          className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) cerrarAbastModal(); }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Fuel className="w-5 h-5 text-green-500" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Abastecimiento</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {abastecimientoUnidad.codigo} — {abastecimientoUnidad.tipo_unidad} · {abastecimientoUnidad.tipo_combustible}
                  </p>
                </div>
              </div>
              <button onClick={cerrarAbastModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              {(['nuevo', 'historial'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setAbastTab(tab)}
                  className={`flex-1 py-2.5 text-sm font-medium transition ${
                    abastTab === tab
                      ? 'border-b-2 border-green-500 text-green-600 dark:text-green-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {tab === 'nuevo' ? 'Nuevo abastecimiento' : 'Historial'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Tab: Nuevo */}
              {abastTab === 'nuevo' && (
                <form onSubmit={handleAbastecimientoSubmit} className="px-5 py-4 space-y-4">
                  {/* Odómetro */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Odómetro actual (km)
                    </label>
                    <input
                      type="number"
                      value={abastForm.odometro_actual}
                      onChange={e => setAbastForm(prev => ({ ...prev, odometro_actual: e.target.value }))}
                      placeholder="Ej: 125400"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Nivel inicial */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nivel antes del abastecimiento
                    </label>
                    <FuelSelectorWeb
                      value={abastForm.nivel_anterior}
                      onChange={(nivel, decimal) => setAbastForm(prev => ({ ...prev, nivel_anterior: nivel, combustible_anterior: decimal }))}
                    />
                  </div>

                  {/* Nivel final */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nivel después del abastecimiento <span className="text-red-500">*</span>
                    </label>
                    <FuelSelectorWeb
                      value={abastForm.nivel_nuevo}
                      onChange={(nivel, decimal) => setAbastForm(prev => ({ ...prev, nivel_nuevo: nivel, combustible_nuevo: decimal }))}
                    />
                  </div>

                  {/* Litros */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Litros cargados <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={abastForm.litros_cargados}
                      onChange={e => setAbastForm(prev => ({ ...prev, litros_cargados: e.target.value }))}
                      placeholder="Ej: 45.5"
                      required
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Observaciones
                    </label>
                    <textarea
                      value={abastForm.observaciones}
                      onChange={e => setAbastForm(prev => ({ ...prev, observaciones: e.target.value }))}
                      rows={2}
                      placeholder="Gasolinera, número de factura, etc."
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    />
                  </div>

                  {abastError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      {abastError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={cerrarAbastModal} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={abastecimientoMutation.isPending || !abastForm.nivel_nuevo || !abastForm.litros_cargados}
                      className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 transition"
                    >
                      {abastecimientoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fuel className="w-4 h-4" />}
                      Guardar abastecimiento
                    </button>
                  </div>
                </form>
              )}

              {/* Tab: Historial */}
              {abastTab === 'historial' && (
                <div className="px-5 py-4">
                  {loadingHistorialAbast ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-700/50 rounded-lg h-20" />
                      ))}
                    </div>
                  ) : historialAbast.length === 0 ? (
                    <div className="py-10 text-center text-gray-500 dark:text-gray-400 text-sm">
                      <Fuel className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Sin registros de abastecimiento
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {historialAbast.map(a => (
                        <div key={a.id} className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-green-700 dark:text-green-400 text-sm">
                                  {Number(a.litros_cargados).toFixed(1)} L
                                </span>
                                {a.nivel_anterior && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {a.nivel_anterior} → {a.nivel_nuevo}
                                  </span>
                                )}
                              </div>
                              {a.odometro_actual && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  Odómetro: {Number(a.odometro_actual).toLocaleString('es-GT')} km
                                </p>
                              )}
                              {a.observaciones && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 italic">{a.observaciones}</p>
                              )}
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {formatFecha(a.created_at)}
                                {a.registrado_por_nombre && ` · ${a.registrado_por_nombre}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
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

// ── Historial item card ────────────────────────────────────────────────────────

function formatFechaCorta(iso: string) {
  return new Date(iso).toLocaleString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function HistorialItemCard({ item }: { item: HistorialItem }) {
  const { categoria, fecha, datos } = item;

  if (categoria === 'COMBUSTIBLE') {
    const tipoBadge: Record<string, string> = {
      INICIAL: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
      FINAL:   'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
      RECARGA: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
      AJUSTE:  'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
    };
    return (
      <div className="flex gap-3 items-start bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-lg p-3">
        <div className="mt-0.5 p-1.5 rounded-md bg-orange-100 dark:bg-orange-900/40 flex-shrink-0">
          <Fuel className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tipoBadge[datos.tipo ?? ''] ?? ''}`}>
                {datos.tipo}
              </span>
              {datos.nivel_anterior && datos.nivel_nuevo && (
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {datos.nivel_anterior} <ChevronRight className="inline w-3 h-3 text-gray-400" /> <strong>{datos.nivel_nuevo}</strong>
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{formatFechaCorta(fecha)}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
            {datos.odometro_actual != null && <span>Odómetro: {datos.odometro_actual.toLocaleString()} km</span>}
            {datos.km_recorridos != null && datos.km_recorridos > 0 && <span>+{datos.km_recorridos} km</span>}
            {datos.usuario && <span>Por: {datos.usuario}</span>}
          </div>
          {datos.observaciones && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 rounded px-2 py-1 border border-orange-100 dark:border-orange-900/30">
              {datos.observaciones}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (categoria === 'SALIDA') {
    const estadoColor: Record<string, string> = {
      EN_SALIDA:  'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
      FINALIZADA: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
      CANCELADA:  'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
    };
    return (
      <div className="flex gap-3 items-start bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-3">
        <div className="mt-0.5 p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/40 flex-shrink-0">
          <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Salida</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${estadoColor[datos.estado ?? ''] ?? ''}`}>
                {datos.estado}
              </span>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{formatFechaCorta(fecha)}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
            {datos.km_inicial != null && <span>km salida: {datos.km_inicial.toLocaleString()}</span>}
            {datos.km_final != null && <span>km regreso: {datos.km_final.toLocaleString()}</span>}
            {datos.km_recorridos != null && datos.km_recorridos > 0 && <span>{datos.km_recorridos.toLocaleString()} km recorridos</span>}
            {datos.fecha_regreso && <span>Regreso: {formatFechaCorta(datos.fecha_regreso)}</span>}
          </div>
          {(datos.observaciones_salida || datos.observaciones_regreso) && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 rounded px-2 py-1 border border-blue-100 dark:border-blue-900/30">
              {datos.observaciones_salida || datos.observaciones_regreso}
            </p>
          )}
        </div>
      </div>
    );
  }

  // REPARACION
  const repColor: Record<string, string> = {
    EN_REPARACION: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    COMPLETADA:    'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    CANCELADA:     'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  };
  return (
    <div className="flex gap-3 items-start bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg p-3">
      <div className="mt-0.5 p-1.5 rounded-md bg-red-100 dark:bg-red-900/40 flex-shrink-0">
        <Wrench className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{datos.motivo}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${repColor[datos.estado ?? ''] ?? ''}`}>
              {datos.estado === 'EN_REPARACION' ? 'En taller' : datos.estado}
            </span>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{formatFechaCorta(fecha)}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
          {datos.dias_en_taller != null && <span>{datos.dias_en_taller} día{datos.dias_en_taller !== 1 ? 's' : ''} en taller</span>}
          {datos.fecha_fin && <span>Salida: {datos.fecha_fin}</span>}
          {datos.usuario && <span>Registrado por: {datos.usuario}</span>}
        </div>
        {datos.descripcion && (
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 rounded px-2 py-1 border border-red-100 dark:border-red-900/30">
            {datos.descripcion}
          </p>
        )}
      </div>
    </div>
  );
}
