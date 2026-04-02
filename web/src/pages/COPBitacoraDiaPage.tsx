import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Search, Truck, ChevronDown, ChevronRight,
  Clock, MapPin, AlertTriangle, Activity, Users, Loader2,
  Edit3, LogIn, LogOut, Camera, Video, RefreshCw,
} from 'lucide-react';
import api from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
}
function duracion(desde: string, hasta: string | null) {
  if (!hasta) return null;
  const mins = Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
function fmtCombustible(val: number | null): string {
  if (val === null || val === undefined) return '—';
  if (val >= 1) return 'Lleno';
  if (val >= 0.75) return '3/4';
  if (val >= 0.5) return '1/2';
  if (val >= 0.25) return '1/4';
  if (val > 0) return 'Menos de 1/4';
  return 'Vacío';
}
function hoy() {
  return new Date().toISOString().split('T')[0];
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface TripulanteSalida {
  brigada_id?: number;
  usuario_id?: number;
  chapa?: string;
  nombre?: string;
  nombre_completo?: string;
  rol?: string;
  rol_tripulacion?: string;
}

interface SituacionResumen {
  tipo: string;
  tipo_nombre: string | null;
}

interface SalidaDia {
  salida_id: number;
  unidad_id: number;
  unidad_codigo: string;
  tipo_unidad: string;
  sede_id: number;
  sede_nombre: string;
  ruta_codigo: string | null;
  ruta_nombre: string | null;
  fecha_hora_salida: string;
  fecha_hora_regreso: string | null;
  estado: string;
  km_inicial: number | null;
  km_final: number | null;
  km_recorridos: number | null;
  combustible_inicial: number | null;
  combustible_final: number | null;
  tripulacion: TripulanteSalida[] | null;
  observaciones_salida: string | null;
  observaciones_regreso: string | null;
  finalizado_por_nombre: string | null;
  total_situaciones: number;
  total_actividades: number;
  total_eventos: number;
  situaciones_resumen: SituacionResumen[] | null;
}

interface TimelineItem {
  tipo: 'SITUACION' | 'ACTIVIDAD' | 'EVENTO';
  ref_id: number;
  ts: string;
  datos: any;
}

interface TimelineData {
  salida: any;
  timeline: TimelineItem[];
}

// ── Colores por tipo ──────────────────────────────────────────────────────────

const TIPO_MACRO_BADGE: Record<string, string> = {
  INCIDENTE:            'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  ASISTENCIA_VEHICULAR: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  EMERGENCIA:           'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  OBSTACULO:            'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};
function macroBadge(tipo: string) {
  return TIPO_MACRO_BADGE[tipo] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
}

const TIPO_EVENTO_BADGE: Record<string, string> = {
  EDICION_KM:          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  EDICION_COMBUSTIBLE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  EDICION_SITUACION:   'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  CIERRE_SITUACION:    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  CAMBIO_RUTA:         'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  INICIO_COP:          'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  OBSERVACION:         'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

// ── Componente: ítem del timeline ─────────────────────────────────────────────

function TimelineItemView({ item, navigate }: { item: TimelineItem; navigate: (p: string) => void }) {
  const hora = fmtTime(item.ts);

  if (item.tipo === 'SITUACION') {
    const d = item.datos;
    const fotos = (d.fotos ?? []).filter((f: any) => f.tipo === 'FOTO');
    const videos = (d.fotos ?? []).filter((f: any) => f.tipo === 'VIDEO');
    return (
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className="w-3 h-3 rounded-full bg-red-500 mt-1 flex-shrink-0" />
          <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
        </div>
        <div className="pb-4 flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{hora}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${macroBadge(d.tipo_macro)}`}>
              {d.tipo_nombre ?? d.tipo_macro}
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Situación registrada</p>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 space-y-0.5">
            {d.km && <span>km {d.km}{d.sentido ? ` · ${d.sentido}` : ''}</span>}
            {d.observaciones && <p className="truncate max-w-sm">{d.observaciones}</p>}
            {d.creado_por_nombre && <span>Por: {d.creado_por_nombre}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1">
            {fotos.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Camera className="w-3 h-3" /> {fotos.length} foto{fotos.length !== 1 ? 's' : ''}
              </span>
            )}
            {videos.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Video className="w-3 h-3" /> {videos.length} video{videos.length !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={() => navigate(`/situaciones/${d.id}`)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ver registro #{d.id}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (item.tipo === 'ACTIVIDAD') {
    const d = item.datos;
    return (
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
          <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
        </div>
        <div className="pb-4 flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{hora}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {d.tipo_nombre ?? 'Actividad'}
            </span>
            <Activity className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Actividad operativa</p>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 space-y-0.5">
            {d.km && <span>km {d.km}{d.sentido ? ` · ${d.sentido}` : ''}</span>}
            {d.observaciones && <p className="truncate max-w-sm">{d.observaciones}</p>}
            {d.closed_at && <span>Cerrada: {fmtTime(d.closed_at)}</span>}
            {d.creado_por_nombre && <span>Por: {d.creado_por_nombre}</span>}
          </div>
          <button
            onClick={() => navigate(`/actividades/${d.id}`)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
          >
            Ver registro #{d.id}
          </button>
        </div>
      </div>
    );
  }

  if (item.tipo === 'EVENTO') {
    const d = item.datos;
    const badge = TIPO_EVENTO_BADGE[d.tipo_evento] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    return (
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className="w-3 h-3 rounded-full bg-yellow-400 mt-1 flex-shrink-0" />
          <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
        </div>
        <div className="pb-4 flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{hora}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>
              {d.tipo_evento?.replace('_', ' ')}
            </span>
            <Edit3 className="w-3.5 h-3.5 text-yellow-500" />
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{d.descripcion}</p>
          {d.realizado_por && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Por: {d.realizado_por}</p>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ── Componente: card de salida expandible ─────────────────────────────────────

function SalidaCard({ salida, navigate }: { salida: SalidaDia; navigate: (p: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  const { data: timelineData, isFetching, isError } = useQuery<TimelineData>({
    queryKey: ['bitacora-timeline', salida.salida_id],
    queryFn: async () => {
      const res = await api.get(`/salidas/bitacora-timeline/${salida.salida_id}`);
      return res.data;
    },
    enabled: expanded,
    staleTime: 5 * 60 * 1000,
  });

  const tripulacion: TripulanteSalida[] = salida.tripulacion ?? [];
  const dur = duracion(salida.fecha_hora_salida, salida.fecha_hora_regreso);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      {/* Header de la card */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">{salida.unidad_codigo}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{salida.tipo_unidad}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  salida.estado === 'EN_SALIDA'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : salida.estado === 'FINALIZADA'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                }`}>
                  {salida.estado === 'EN_SALIDA' ? 'En ruta' : salida.estado === 'FINALIZADA' ? 'Finalizada' : 'Cancelada'}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {fmtTime(salida.fecha_hora_salida)}
                  {salida.fecha_hora_regreso ? ` → ${fmtTime(salida.fecha_hora_regreso)}` : ' → En ruta'}
                  {dur && <span className="text-gray-400">({dur})</span>}
                </span>
                {salida.ruta_codigo && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {salida.ruta_codigo}
                  </span>
                )}
                {salida.sede_nombre && (
                  <span>{salida.sede_nombre}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex-shrink-0 mt-1"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span>{expanded ? 'Ocultar' : 'Timeline'}</span>
          </button>
        </div>

        {/* Métricas rápidas */}
        <div className="flex items-center gap-4 mt-3 text-xs">
          {salida.km_recorridos !== null && (
            <span className="text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-800 dark:text-gray-200">{Number(salida.km_recorridos).toLocaleString()}</span> km
            </span>
          )}
          {salida.combustible_inicial !== null && (
            <span className="text-gray-600 dark:text-gray-400">
              Comb inicial: <span className="font-semibold text-gray-800 dark:text-gray-200">{fmtCombustible(salida.combustible_inicial)}</span>
              {salida.combustible_final !== null && (
                <> → <span className="font-semibold text-gray-800 dark:text-gray-200">{fmtCombustible(salida.combustible_final)}</span></>
              )}
            </span>
          )}
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-3 h-3" />
            {salida.total_situaciones} sit.
          </span>
          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <Activity className="w-3 h-3" />
            {salida.total_actividades} act.
          </span>
        </div>

        {/* Tripulación */}
        {tripulacion.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <div className="flex flex-wrap gap-1.5">
              {tripulacion.map((t, i) => (
                <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                  {(t.rol_tripulacion ?? t.rol ?? '').replace('_', ' ')}: {t.nombre_completo ?? t.nombre ?? t.chapa ?? `#${t.brigada_id ?? t.usuario_id}`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Timeline expandible */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-5 py-4">
          {isFetching && (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando timeline...
            </div>
          )}
          {isError && (
            <p className="text-red-500 text-sm">Error al cargar el timeline</p>
          )}
          {timelineData && (
            <div>
              {/* Evento: INICIO */}
              <div className="flex gap-3 mb-0">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                  <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
                </div>
                <div className="pb-4 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{fmtTime(salida.fecha_hora_salida)}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">INICIO</span>
                    <LogIn className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mt-0.5">Salida iniciada</p>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 space-y-0.5">
                    {salida.km_inicial !== null && <span>Odómetro: {Number(salida.km_inicial).toLocaleString()} km</span>}
                    {salida.combustible_inicial !== null && <span> · Combustible: {fmtCombustible(salida.combustible_inicial)}</span>}
                    {salida.ruta_codigo && <span> · Ruta: {salida.ruta_codigo} — {salida.ruta_nombre}</span>}
                    {salida.observaciones_salida && <p>{salida.observaciones_salida}</p>}
                  </div>
                </div>
              </div>

              {/* Eventos del timeline */}
              {timelineData.timeline.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 ml-6 pb-2">Sin situaciones, actividades ni eventos registrados.</p>
              ) : (
                timelineData.timeline.map((item) => (
                  <TimelineItemView key={`${item.tipo}-${item.ref_id}`} item={item} navigate={navigate} />
                ))
              )}

              {/* Evento: FIN */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${salida.fecha_hora_regreso ? 'bg-gray-600 dark:bg-gray-400' : 'bg-blue-400 animate-pulse'}`} />
                </div>
                <div className="flex-1">
                  {salida.fecha_hora_regreso ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{fmtTime(salida.fecha_hora_regreso)}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">FIN</span>
                        <LogOut className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mt-0.5">Regreso a sede</p>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 space-y-0.5">
                        {salida.km_final !== null && (
                          <span>
                            Odómetro final: {Number(salida.km_final).toLocaleString()} km
                            {salida.km_recorridos !== null && ` (+${Number(salida.km_recorridos).toLocaleString()} km recorridos)`}
                          </span>
                        )}
                        {salida.combustible_final !== null && <span> · Combustible final: {fmtCombustible(salida.combustible_final)}</span>}
                        {salida.finalizado_por_nombre && <span> · Finalizado por: {salida.finalizado_por_nombre}</span>}
                        {salida.observaciones_regreso && <p>{salida.observaciones_regreso}</p>}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        EN RUTA
                      </span>
                      <span className="text-xs text-gray-400">Aún no ha regresado</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function COPBitacoraDiaPage() {
  const navigate = useNavigate();
  const [fecha, setFecha] = useState(hoy());
  const [fechaBusqueda, setFechaBusqueda] = useState(hoy());

  const { data, isFetching, isError, refetch } = useQuery<{ salidas: SalidaDia[]; total: number; fecha: string }>({
    queryKey: ['bitacora-dia', fechaBusqueda],
    queryFn: async () => {
      const res = await api.get(`/salidas/bitacora-dia?fecha=${fechaBusqueda}`);
      return res.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const salidas = data?.salidas ?? [];

  function buscar() {
    setFechaBusqueda(fecha);
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/cop/mapa')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Bitácora Diaria</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Timeline completo de salidas por fecha</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-4xl w-full mx-auto px-4 py-5 flex flex-col gap-5">
        {/* Buscador por fecha */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscar()}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={buscar}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Actualizar"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Resultados */}
        {isError && (
          <div className="text-red-500 dark:text-red-400 text-sm text-center py-4">
            Error al cargar la bitácora. Verifica la fecha e intenta de nuevo.
          </div>
        )}

        {!isError && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isFetching ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando...
                  </span>
                ) : (
                  <>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{salidas.length}</span>
                    {' '}salida{salidas.length !== 1 ? 's' : ''} el{' '}
                    {new Date(fechaBusqueda + 'T12:00:00').toLocaleDateString('es-GT', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </>
                )}
              </p>
            </div>

            {!isFetching && salidas.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
                <Truck className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No hay salidas registradas para esta fecha.</p>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {salidas.map(salida => (
                <SalidaCard key={salida.salida_id} salida={salida} navigate={navigate} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
