import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Megaphone, LayoutTemplate, FileText, BarChart2, Globe,
  RefreshCw, Loader2, Plus, Pencil, Trash2, Copy, Check,
  MapPin, Activity, ChevronDown, ChevronUp, LogOut, Share2, X, Image,
} from 'lucide-react';
import api from '../../services/api';
import ThemeToggle from '../../components/ThemeToggle';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

// ─── Colores ───────────────────────────────────────────────
const CHART_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16'];

type Tab = 'estadisticas' | 'snapshot' | 'plantillas' | 'publicaciones';

// ─── Tipos ─────────────────────────────────────────────────
interface Plantilla {
  id: number;
  nombre: string;
  tipo: string;
  contenido_plantilla: string;
  activa: boolean;
  es_predefinida: boolean;
}

interface UnidadEstado {
  unidad_id: number;
  unidad_codigo: string;
  tipo_unidad: string;
  ruta_codigo: string;
  ruta_nombre: string;
  km: string | null;
  sentido: string | null;
  tipo_situacion: string | null;
  actividad_tipo_nombre: string | null;
  subtipo_nombre: string | null;
  subtipo_categoria: string | null;
  ultima_actualizacion: string | null;
  situacion_id: number | null;
  actividad_id: number | null;
  observaciones: any;
  clima: string | null;
  carga_vehicular: string | null;
  obstruccion_data: any;
  heridos_leves: number;
  heridos_graves: number;
  fallecidos: number;
  trasladados: number;
  act_observaciones: any;
  act_clima: string | null;
  act_carga: string | null;
  act_km: string | null;
  act_sentido: string | null;
  fotos: Array<{ url_original: string; url_thumbnail: string; }>;
}

interface EstadisticasData {
  kpis: Array<{ tipo_situacion: string; total: number; heridos: number; heridos_leves: number; heridos_graves: number; fallecidos: number; trasladados: number; ilesos: number; }>;
  por_ruta: Array<{ ruta: string; ruta_nombre: string; tipo_situacion: string; total: number; }>;
  por_subtipo: Array<{ tipo_situacion: string; subtipo: string; total: number; }>;
  por_vehiculo: Array<{ tipo_vehiculo: string; total: number; }>;
}

interface SnapshotData {
  situaciones: any[];
  actividades: any[];
  unidades: any[];
}

// ─── Helpers ───────────────────────────────────────────────
function badge(tipo: string) {
  const map: Record<string, string> = {
    INCIDENTE:  'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    ASISTENCIA: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    EMERGENCIA: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  };
  return map[tipo] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}

function fmt(d: string) {
  return new Date(d).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' });
}

// =========================================================
// COMPONENTE PRINCIPAL
// =========================================================
export default function ComunicacionSocialPage() {
  const [tab, setTab] = useState<Tab>('estadisticas');
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Comunicación Social / Vocería</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{user?.nombre}</span>
          <ThemeToggle />
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
        <div className="flex gap-1">
          {([
            { key: 'estadisticas', label: 'Estadísticas', icon: BarChart2 },
            { key: 'snapshot',     label: 'Estado Actual', icon: Globe },
            { key: 'plantillas',   label: 'Plantillas', icon: LayoutTemplate },
            { key: 'publicaciones',label: 'Boletín', icon: FileText },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {tab === 'estadisticas'  && <TabEstadisticas />}
        {tab === 'snapshot'      && <TabSnapshot />}
        {tab === 'plantillas'    && <TabPlantillas />}
        {tab === 'publicaciones' && <TabPublicaciones />}
      </div>
    </div>
  );
}

// =========================================================
// TAB: ESTADÍSTICAS — 3 paneles separados
// =========================================================
function PanelEstadisticas({
  tipo, color, titulo, kpi, subtipos, rutas, vehiculos,
}: {
  tipo: string;
  color: { border: string; bg: string; text: string; bar: string; };
  titulo: string;
  kpi: EstadisticasData['kpis'][0] | undefined;
  subtipos: EstadisticasData['por_subtipo'];
  rutas: EstadisticasData['por_ruta'];
  vehiculos?: EstadisticasData['por_vehiculo'];
}) {
  const total = kpi?.total || 0;
  const rutasData = rutas
    .filter(r => r.tipo_situacion === tipo)
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);
  const subtData = subtipos
    .filter(s => s.tipo_situacion === tipo)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return (
    <div className={`rounded-xl border-2 ${color.border} bg-white dark:bg-gray-800 overflow-hidden`}>
      {/* Encabezado */}
      <div className={`${color.bg} px-5 py-3 flex items-center justify-between`}>
        <h2 className={`text-base font-bold ${color.text}`}>{titulo}</h2>
        <span className={`text-3xl font-extrabold ${color.text}`}>{total}</span>
      </div>

      <div className="p-5 space-y-5">
        {/* Personas (solo si hay datos) */}
        {kpi && (kpi.heridos > 0 || kpi.fallecidos > 0 || kpi.trasladados > 0 || kpi.ilesos > 0) && (
          <div className="flex flex-wrap gap-4 text-sm">
            {kpi.heridos_leves  > 0 && <span className="text-orange-600 font-medium">Heridos leves: {kpi.heridos_leves}</span>}
            {kpi.heridos_graves > 0 && <span className="text-red-600 font-medium">Heridos graves: {kpi.heridos_graves}</span>}
            {kpi.fallecidos     > 0 && <span className="text-gray-700 dark:text-gray-300 font-semibold">Fallecidos: {kpi.fallecidos}</span>}
            {kpi.trasladados    > 0 && <span className="text-blue-600 font-medium">Trasladados: {kpi.trasladados}</span>}
            {kpi.ilesos         > 0 && <span className="text-green-600 font-medium">Ilesos: {kpi.ilesos}</span>}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Por ruta */}
          {rutasData.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Por ruta</h4>
              <ResponsiveContainer width="100%" height={Math.max(160, rutasData.length * 24)}>
                <BarChart data={rutasData} layout="vertical" margin={{ left: 4, right: 16, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="ruta" type="category" width={52} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill={color.bar} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Por subtipo */}
          {subtData.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Por tipo</h4>
              <ResponsiveContainer width="100%" height={Math.max(160, subtData.length * 24)}>
                <BarChart data={subtData} layout="vertical" margin={{ left: 4, right: 16, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="subtipo" type="category" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill={color.bar} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Vehículos (solo INCIDENTE) */}
        {vehiculos && vehiculos.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Por tipo de vehículo</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={vehiculos} dataKey="total" nameKey="tipo_vehiculo"
                  cx="50%" cy="50%" outerRadius={75}
                  label={(props: any) => `${props.tipo_vehiculo} ${((props.percent ?? 0) * 100).toFixed(0)}%`}>
                  {vehiculos.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {total === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Sin registros en el período seleccionado</p>
        )}
      </div>
    </div>
  );
}

function TabEstadisticas() {
  const hoy = new Date().toISOString().split('T')[0];
  const hace30 = new Date(Date.now() - 30 * 24 * 3600_000).toISOString().split('T')[0];
  const [desde, setDesde] = useState(hace30);
  const [hasta, setHasta] = useState(hoy);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EstadisticasData | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/comunicacion-social/estadisticas', { params: { desde, hasta } });
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [desde, hasta]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Filtro fecha */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
        </div>
        <button onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      )}

      {!loading && data && (
        <div className="space-y-8">
          <PanelEstadisticas
            tipo="INCIDENTE"
            titulo="Accidentes / Incidentes"
            color={{ border: 'border-red-300 dark:border-red-700', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', bar: '#ef4444' }}
            kpi={data.kpis.find(k => k.tipo_situacion === 'INCIDENTE')}
            subtipos={data.por_subtipo}
            rutas={data.por_ruta}
            vehiculos={data.por_vehiculo}
          />
          <PanelEstadisticas
            tipo="EMERGENCIA"
            titulo="Emergencias"
            color={{ border: 'border-amber-300 dark:border-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', bar: '#f59e0b' }}
            kpi={data.kpis.find(k => k.tipo_situacion === 'EMERGENCIA')}
            subtipos={data.por_subtipo}
            rutas={data.por_ruta}
          />
          <PanelEstadisticas
            tipo="ASISTENCIA"
            titulo="Asistencias"
            color={{ border: 'border-blue-300 dark:border-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', bar: '#3b82f6' }}
            kpi={data.kpis.find(k => k.tipo_situacion === 'ASISTENCIA')}
            subtipos={data.por_subtipo}
            rutas={data.por_ruta}
          />
        </div>
      )}
    </div>
  );
}

// =========================================================
// TAB: SNAPSHOT / ESTADO ACTUAL
// =========================================================
function TabSnapshot() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SnapshotData | null>(null);
  const [timestamp, setTimestamp] = useState('');
  const [expandedRuta, setExpandedRuta] = useState<string | null>(null);
  const [copiedRuta, setCopiedRuta] = useState<string | null>(null);

  const fetchSnapshot = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/comunicacion-social/snapshot');
      setData(res.data);
      setTimestamp(res.timestamp);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSnapshot(); }, []);

  // Agrupar por ruta
  const porRuta = (() => {
    if (!data) return {};
    const map: Record<string, { situaciones: any[]; actividades: any[]; unidades: any[] }> = {};
    const add = (arr: any[], key: string) => arr.forEach(item => {
      const r = item.ruta_codigo || 'Sin ruta';
      if (!map[r]) map[r] = { situaciones: [], actividades: [], unidades: [] };
      (map[r] as any)[key].push(item);
    });
    add(data.situaciones, 'situaciones');
    add(data.actividades, 'actividades');
    add(data.unidades, 'unidades');
    return map;
  })();

  // Generar texto verbal para una ruta
  const generarTexto = (ruta: string) => {
    const info = porRuta[ruta];
    if (!info) return '';
    const lines: string[] = [];
    lines.push(`=== ${ruta} ===`);
    if (info.situaciones.length > 0) {
      info.situaciones.forEach(s => {
        const personas: string[] = [];
        if (s.heridos_leves > 0)  personas.push(`${s.heridos_leves} herido(s) leve(s)`);
        if (s.heridos_graves > 0) personas.push(`${s.heridos_graves} herido(s) grave(s)`);
        if (s.fallecidos > 0)     personas.push(`${s.fallecidos} fallecido(s)`);
        const personasTxt = personas.length > 0 ? `, ${personas.join(', ')}` : '';
        lines.push(`• [${s.tipo_situacion}] ${s.subtipo_nombre || ''} km ${s.km || '?'} ${s.sentido || ''}${personasTxt}`);
      });
    }
    if (info.actividades.length > 0) {
      info.actividades.forEach(a => {
        lines.push(`• [ACTIVIDAD] ${a.tipo_nombre || ''} km ${a.km || '?'} ${a.sentido || ''} — ${a.unidad_codigo}`);
      });
    }
    lines.push(`Unidades: ${info.unidades.map((u: any) => u.codigo).join(', ') || 'ninguna'}`);
    return lines.join('\n');
  };

  const copiarRuta = (ruta: string) => {
    navigator.clipboard.writeText(generarTexto(ruta));
    setCopiedRuta(ruta);
    setTimeout(() => setCopiedRuta(null), 2000);
  };

  const copiarTodo = () => {
    const texto = Object.keys(porRuta).map(r => generarTexto(r)).join('\n\n');
    navigator.clipboard.writeText(texto);
  };

  const rutas = Object.keys(porRuta).sort();
  const totalSituaciones = data?.situaciones.length || 0;
  const totalUnidades = data?.unidades.length || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap gap-3 items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {timestamp ? `Última actualización: ${fmt(timestamp)}` : 'Snapshot del estado actual del sistema'}
          </p>
          {data && (
            <p className="text-xs text-gray-400 mt-0.5">
              {totalSituaciones} situación(es) activa(s) · {totalUnidades} unidad(es) en servicio
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={copiarTodo}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm">
            <Copy className="w-4 h-4" /> Copiar todo
          </button>
          <button onClick={fetchSnapshot}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      )}

      {!loading && data && rutas.length === 0 && (
        <div className="text-center py-12 text-gray-400">No hay situaciones ni actividades activas en este momento</div>
      )}

      {!loading && rutas.map(ruta => {
        const info = porRuta[ruta];
        const isOpen = expandedRuta === ruta;
        const hasSituaciones = info.situaciones.length > 0;

        return (
          <div key={ruta} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Cabecera de ruta */}
            <button
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              onClick={() => setExpandedRuta(isOpen ? null : ruta)}
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-purple-500" />
                <span className="font-semibold text-gray-900 dark:text-white">{ruta}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{info.situaciones[0]?.ruta_nombre || ''}</span>
              </div>
              <div className="flex items-center gap-3">
                {hasSituaciones && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                    {info.situaciones.length} situación(es)
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {info.unidades.length} unidad(es)
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 space-y-4">
                {/* Situaciones */}
                {info.situaciones.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Situaciones</h4>
                    <div className="space-y-2">
                      {info.situaciones.map(s => (
                        <div key={s.id} className="rounded-lg border border-gray-100 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/30">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${badge(s.tipo_situacion)}`}>
                              {s.tipo_situacion}
                            </span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{s.subtipo_nombre || '—'}</span>
                            {s.km && <span className="text-xs text-gray-500">km {s.km} {s.sentido || ''}</span>}
                            {s.unidad_codigo && <span className="text-xs text-gray-400">[{s.unidad_codigo}]</span>}
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                            {s.heridos_leves  > 0 && <span className="text-orange-600">Heridos leves: {s.heridos_leves}</span>}
                            {s.heridos_graves > 0 && <span className="text-red-600">Heridos graves: {s.heridos_graves}</span>}
                            {s.fallecidos     > 0 && <span className="text-gray-700 dark:text-gray-300 font-medium">Fallecidos: {s.fallecidos}</span>}
                            {s.trasladados    > 0 && <span className="text-blue-600">Trasladados: {s.trasladados}</span>}
                            {s.clima && <span>Clima: {s.clima}</span>}
                            {s.carga_vehicular && <span>Tráfico: {s.carga_vehicular}</span>}
                          </div>
                          {/* Fotos */}
                          {s.fotos && s.fotos.length > 0 && (
                            <div className="mt-2 flex gap-2 flex-wrap">
                              {s.fotos.slice(0, 4).map((f: any, i: number) => (
                                <a key={i} href={f.url_original} target="_blank" rel="noreferrer"
                                  className="w-16 h-16 rounded overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0">
                                  <img src={f.url_thumbnail || f.url_original} alt="" className="w-full h-full object-cover" />
                                </a>
                              ))}
                              {s.fotos.length > 4 && (
                                <span className="w-16 h-16 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500">
                                  +{s.fotos.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actividades */}
                {info.actividades.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Actividades</h4>
                    <div className="space-y-1">
                      {info.actividades.map(a => (
                        <div key={a.id} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 py-1">
                          <Activity className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium">{a.tipo_nombre || '—'}</span>
                          {a.km && <span className="text-xs text-gray-400">km {a.km} {a.sentido || ''}</span>}
                          <span className="text-xs text-gray-400">[{a.unidad_codigo}]</span>
                          {a.clima && <span className="text-xs text-gray-400">☁ {a.clima}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unidades */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Unidades en servicio</h4>
                  <div className="flex flex-wrap gap-2">
                    {info.unidades.map((u: any) => (
                      <span key={u.codigo} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300">
                        {u.codigo} <span className="text-gray-400">{u.tipo_unidad || ''}</span>
                      </span>
                    ))}
                    {info.unidades.length === 0 && <span className="text-xs text-gray-400">Ninguna</span>}
                  </div>
                </div>

                {/* Texto verbal */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Texto para reporte verbal</h4>
                    <button onClick={() => copiarRuta(ruta)}
                      className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:underline">
                      {copiedRuta === ruta ? <><Check className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
                    </button>
                  </div>
                  <pre className="text-xs bg-gray-900 dark:bg-black text-green-400 rounded-lg p-3 whitespace-pre-wrap font-mono">
                    {generarTexto(ruta)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =========================================================
// TAB: PLANTILLAS
// =========================================================
function TabPlantillas() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState<Plantilla | null>(null);
  const [form, setForm] = useState({ nombre: '', tipo: 'GENERAL', contenido_plantilla: '' });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchPlantillas = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/comunicacion-social/plantillas');
      setPlantillas(data.plantillas || data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPlantillas(); }, []);

  const openNueva = () => {
    setEditando(null);
    setForm({ nombre: '', tipo: 'GENERAL', contenido_plantilla: '' });
    setFormError('');
    setShowForm(true);
  };

  const openEditar = (p: Plantilla) => {
    setEditando(p);
    setForm({ nombre: p.nombre, tipo: p.tipo || 'GENERAL', contenido_plantilla: p.contenido_plantilla });
    setFormError('');
    setShowForm(true);
  };

  const guardar = async () => {
    if (!form.nombre || !form.contenido_plantilla) return;
    setSaving(true);
    setFormError('');
    try {
      if (editando) {
        await api.put(`/comunicacion-social/plantillas/${editando.id}`, form);
      } else {
        await api.post('/comunicacion-social/plantillas', form);
      }
      setShowForm(false);
      fetchPlantillas();
    } catch (e: any) {
      setFormError(e.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    try {
      await api.delete(`/comunicacion-social/plantillas/${id}`);
      fetchPlantillas();
    } catch (e: any) {
      alert(e.response?.data?.error || 'No se pudo eliminar');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Plantillas de mensajes</h2>
        <button onClick={openNueva}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Nueva plantilla
        </button>
      </div>

      {/* Modal/form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h3 className="font-medium text-gray-900 dark:text-white">{editando ? 'Editar plantilla' : 'Nueva plantilla'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nombre</label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Comunicado de accidente"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white">
                <option value="GENERAL">General</option>
                <option value="INCIDENTE">Incidente</option>
                <option value="ASISTENCIA">Asistencia</option>
                <option value="EMERGENCIA">Emergencia</option>
                <option value="OPERATIVO">Operativo</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Contenido <span className="text-gray-400">(use {'{fecha}'}, {'{ubicacion}'}, {'{heridos}'}, etc.)</span>
            </label>
            <textarea value={form.contenido_plantilla}
              onChange={e => setForm(f => ({ ...f, contenido_plantilla: e.target.value }))}
              rows={6} placeholder="Escriba el texto de la plantilla..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white font-mono" />
          </div>
          {formError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{formError}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancelar
            </button>
            <button onClick={guardar} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 animate-spin text-purple-600" /></div>
      ) : plantillas.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No hay plantillas. Crea la primera.</div>
      ) : (
        <div className="grid gap-4">
          {plantillas.map(p => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-gray-900 dark:text-white">{p.nombre}</span>
                  <span className="px-2 py-0.5 rounded text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">{p.tipo}</span>
                  {p.es_predefinida && <span className="px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">Sistema</span>}
                  {!p.activa && <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-500">Inactiva</span>}
                </div>
                {!p.es_predefinida && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => openEditar(p)}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => eliminar(p.id)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <pre className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-900/40 rounded p-3 max-h-40 overflow-y-auto">
                {p.contenido_plantilla}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================
// HELPER: reemplazar variables de plantilla
// =========================================================
function resolverPlantilla(plantilla: string, u: UnidadEstado): string {
  const now = new Date();
  const fecha = now.toLocaleDateString('es-GT');
  const hora  = now.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
  const kmVal    = u.km || u.act_km || '?';
  const sentido  = u.sentido || u.act_sentido || '';
  const tipo     = u.tipo_situacion || u.actividad_tipo_nombre || '';
  const subtipo  = u.subtipo_nombre || '';
  const heridos  = ((u.heridos_leves || 0) + (u.heridos_graves || 0)).toString();
  const fallecidos = (u.fallecidos || 0).toString();
  const ruta     = u.ruta_nombre;

  return plantilla
    .replace(/\{fecha\}/g, fecha)
    .replace(/\{hora\}/g, hora)
    .replace(/\{ubicacion\}/g, `km ${kmVal} ${sentido}`.trim())
    .replace(/\{km\}/g, kmVal)
    .replace(/\{sentido\}/g, sentido)
    .replace(/\{tipo\}/g, tipo)
    .replace(/\{descripcion\}/g, subtipo)
    .replace(/\{tipo_accidente\}/g, subtipo)
    .replace(/\{heridos\}/g, heridos)
    .replace(/\{fallecidos\}/g, fallecidos)
    .replace(/\{municipio\}/g, ruta)
    .replace(/\{departamento\}/g, ruta)
    .replace(/\{unidad\}/g, u.unidad_codigo);
}

// =========================================================
// MODAL: COMPARTIR
// =========================================================
interface ShareModalProps {
  unidad: UnidadEstado;
  plantillas: Plantilla[];
  onClose: () => void;
}

function ShareModal({ unidad, plantillas, onClose }: ShareModalProps) {
  // Seleccionar plantilla inicial por tipo
  const plantillaInicial = plantillas.find(p =>
    p.tipo === unidad.tipo_situacion ||
    p.tipo === unidad.subtipo_categoria ||
    (unidad.actividad_id && p.tipo === 'OPERATIVO')
  ) || plantillas.find(p => p.tipo === 'GENERAL') || plantillas[0] || null;

  const [plantillaId, setPlantillaId] = useState<number | null>(plantillaInicial?.id ?? null);
  const [texto, setTexto] = useState(() => {
    if (!plantillaInicial) return '';
    return resolverPlantilla(plantillaInicial.contenido_plantilla, unidad);
  });
  const [copied, setCopied] = useState(false);

  const cambiarPlantilla = (id: number) => {
    const p = plantillas.find(pl => pl.id === id);
    if (p) {
      setPlantillaId(id);
      setTexto(resolverPlantilla(p.contenido_plantilla, unidad));
    }
  };

  const copiar = () => {
    navigator.clipboard.writeText(texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const enc = encodeURIComponent(texto);

  const canales = [
    { label: 'WhatsApp',  color: 'bg-green-500 hover:bg-green-600',  url: `https://wa.me/?text=${enc}` },
    { label: '𝕏 Twitter', color: 'bg-black hover:bg-gray-800',       url: `https://twitter.com/intent/tweet?text=${enc}` },
    { label: 'Facebook',  color: 'bg-blue-600 hover:bg-blue-700',    url: `https://www.facebook.com/sharer/sharer.php?quote=${enc}&u=https://provial.gt` },
    { label: 'Telegram',  color: 'bg-sky-500 hover:bg-sky-600',      url: `https://t.me/share/url?url=https://provial.gt&text=${enc}` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Compartir — {unidad.unidad_codigo}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{unidad.ruta_codigo} · km {unidad.km || '?'} {unidad.sentido || ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Selector de plantilla */}
          {plantillas.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Plantilla</label>
              <select value={plantillaId ?? ''} onChange={e => cambiarPlantilla(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white">
                <option value="" disabled>— Seleccionar plantilla —</option>
                {plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.tipo})</option>)}
              </select>
            </div>
          )}

          {/* Texto editable */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Mensaje <span className={texto.length > 280 ? 'text-red-500' : 'text-gray-400'}>({texto.length} car.)</span>
            </label>
            <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={6}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white font-mono" />
          </div>

          {/* Fotos */}
          {unidad.fotos.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                <Image className="w-3 h-3" /> Infografías disponibles ({unidad.fotos.length})
              </p>
              <div className="flex gap-2 flex-wrap">
                {unidad.fotos.slice(0, 6).map((f, i) => (
                  <a key={i} href={f.url_original} target="_blank" rel="noreferrer"
                    className="w-14 h-14 rounded border border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0">
                    <img src={f.url_thumbnail || f.url_original} alt="" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Botones de canal */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Compartir en</label>
            <div className="grid grid-cols-2 gap-2">
              {canales.map(c => (
                <a key={c.label} href={c.url} target="_blank" rel="noreferrer"
                  className={`${c.color} text-white text-sm font-medium py-2 px-4 rounded-lg text-center transition-colors`}>
                  {c.label}
                </a>
              ))}
            </div>
            <button onClick={copiar}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              {copied ? <><Check className="w-4 h-4 text-green-500" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar texto</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// TAB: BOLETÍN — unidades por ruta
// =========================================================
function TabPublicaciones() {
  const [loading, setLoading] = useState(false);
  const [porRuta, setPorRuta] = useState<Record<string, UnidadEstado[]>>({});
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [timestamp, setTimestamp] = useState('');
  const [shareTarget, setShareTarget] = useState<UnidadEstado | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/comunicacion-social/estado-unidades');
      setPorRuta(data.data.por_ruta || {});
      setPlantillas(data.data.plantillas || []);
      setTimestamp(data.timestamp);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const rutas = Object.keys(porRuta).sort();

  // Extraer texto de observaciones JSONB
  const obsTexto = (obs: any): string => {
    if (!obs) return '';
    if (typeof obs === 'string') return obs;
    if (Array.isArray(obs)) return obs.map((o: any) => o.mensaje || '').filter(Boolean).join(' · ');
    return '';
  };

  const fmtHora = (ts: string | null) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Boletín operacional</h2>
          {timestamp && <p className="text-xs text-gray-400">Actualizado: {fmt(timestamp)}</p>}
        </div>
        <button onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {loading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>}

      {!loading && rutas.length === 0 && (
        <div className="text-center py-12 text-gray-400">No hay unidades en servicio</div>
      )}

      {!loading && rutas.map(ruta => {
        const unidades = porRuta[ruta];
        return (
          <div key={ruta} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Cabecera de ruta */}
            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-500" />
              <span className="font-semibold text-gray-900 dark:text-white">{ruta}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{unidades[0]?.ruta_nombre}</span>
              <span className="ml-auto text-xs text-gray-400">{unidades.length} unidad(es)</span>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="px-4 py-2 text-left font-medium">Unidad</th>
                    <th className="px-3 py-2 text-left font-medium">Sentido</th>
                    <th className="px-3 py-2 text-left font-medium">Situación / Actividad</th>
                    <th className="px-3 py-2 text-left font-medium">KM</th>
                    <th className="px-3 py-2 text-left font-medium">Hora</th>
                    <th className="px-3 py-2 text-left font-medium">Obstr.</th>
                    <th className="px-3 py-2 text-left font-medium">Observaciones</th>
                    <th className="px-3 py-2 text-left font-medium">Clima</th>
                    <th className="px-3 py-2 text-left font-medium">Afluencia</th>
                    <th className="px-3 py-2 text-left font-medium">Fotos</th>
                    <th className="px-3 py-2 text-left font-medium">Compartir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {unidades.map(u => {
                    const tieneObstruccion = u.obstruccion_data && Object.keys(u.obstruccion_data).length > 0;
                    const obs = obsTexto(u.observaciones || u.act_observaciones);
                    const clima = u.clima || u.act_clima;
                    const carga = u.carga_vehicular || u.act_carga;
                    const kmVal = u.km || u.act_km;
                    const situacionLabel = u.tipo_situacion
                      ? `${u.tipo_situacion}${u.subtipo_nombre ? ` — ${u.subtipo_nombre}` : ''}`
                      : (u.actividad_tipo_nombre || '—');

                    return (
                      <tr key={u.unidad_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                          {u.unidad_codigo}
                          <span className="ml-1 text-xs text-gray-400 font-normal">{u.tipo_unidad}</span>
                        </td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{u.sentido || u.act_sentido || '—'}</td>
                        <td className="px-3 py-3 max-w-[180px]">
                          {u.tipo_situacion ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${badge(u.tipo_situacion)}`}>
                              {situacionLabel}
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400 text-xs">{situacionLabel}</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{kmVal || '—'}</td>
                        <td className="px-3 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtHora(u.ultima_actualizacion)}</td>
                        <td className="px-3 py-3 text-center">
                          {tieneObstruccion
                            ? <span className="text-red-600 font-semibold text-xs">Sí</span>
                            : <span className="text-gray-300 dark:text-gray-600 text-xs">No</span>}
                        </td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-300 text-xs max-w-[160px] truncate" title={obs}>{obs || '—'}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-300 text-xs whitespace-nowrap">{clima || '—'}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-300 text-xs whitespace-nowrap">{carga || '—'}</td>
                        <td className="px-3 py-3">
                          {u.fotos.length > 0 ? (
                            <div className="flex gap-1">
                              {u.fotos.slice(0, 2).map((f, i) => (
                                <a key={i} href={f.url_original} target="_blank" rel="noreferrer"
                                  className="w-8 h-8 rounded overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0">
                                  <img src={f.url_thumbnail || f.url_original} alt="" className="w-full h-full object-cover" />
                                </a>
                              ))}
                              {u.fotos.length > 2 && <span className="text-xs text-gray-400 self-center">+{u.fotos.length - 2}</span>}
                            </div>
                          ) : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          <button onClick={() => setShareTarget(u)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium">
                            <Share2 className="w-3 h-3" /> Compartir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Modal compartir */}
      {shareTarget && (
        <ShareModal
          unidad={shareTarget}
          plantillas={plantillas}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}
