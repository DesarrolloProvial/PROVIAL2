import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Search, Truck, ChevronDown, ChevronRight,
  Clock, MapPin, AlertTriangle, Activity, Users, Loader2,
  LogIn, LogOut, RefreshCw, Camera, Video,
} from 'lucide-react';
import api from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
}
function duracion(desde: string | null | undefined, hasta: string | null | undefined): string | null {
  if (!desde || !hasta) return null;
  const mins = Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 60000);
  if (mins < 0) return null;
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
function fmtCombustible(val: number | null | undefined): string {
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
function str(v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}
function boolStr(v: boolean | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return v ? 'Sí' : 'No';
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

// ── Log helpers ───────────────────────────────────────────────────────────────

/** Línea de campo: etiqueta en gris + valor. Grid de 2 columnas para que nunca se rompa el layout. */
function L({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '9rem 1fr', columnGap: '0.25rem' }}>
      <span className="text-gray-400 dark:text-gray-500 truncate">{label}:</span>
      <span className="text-gray-800 dark:text-gray-200" style={{ overflowWrap: 'anywhere' }}>{value ?? '—'}</span>
    </div>
  );
}

/** Línea de cambio: valor anterior ~~tachado~~ → nuevo + badge CAMBIO */
function Cambio({ label, ant, nuevo }: { label: string; ant: string; nuevo: string }) {
  return (
    <div className="flex min-w-0">
      <span className="text-gray-400 dark:text-gray-500 flex-shrink-0 w-36">{label}:</span>
      <span className="flex items-center gap-1.5 flex-wrap">
        <span className="line-through text-red-400 dark:text-red-500">{ant}</span>
        <span className="text-gray-400">→</span>
        <span className="text-emerald-600 dark:text-emerald-400">{nuevo}</span>
        <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">¡CAMBIO!</span>
      </span>
    </div>
  );
}

/** Separador de sección */
function Sep() {
  return <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-1.5" />;
}

// ── Renderizado de cada tipo de evento en el timeline ─────────────────────────

function parseJsonSafe(v: any): Record<string, any> {
  if (!v) return {};
  if (typeof v === 'object') return v as Record<string, any>;
  try { return JSON.parse(v); } catch { return {}; }
}

function LogSituacion({ item }: { item: TimelineItem }) {
  const d = item.datos;
  const hora = fmtTime(item.ts);
  const cierre = fmtTime(d.hora_cierre);
  const dur = duracion(item.ts, d.hora_cierre);
  const vehiculos: any[] = d.vehiculos ?? [];
  const fotos: any[] = (d.fotos ?? []).filter((f: any) => f.tipo === 'FOTO');
  const videos: any[] = (d.fotos ?? []).filter((f: any) => f.tipo === 'VIDEO');
  const cerrada = d.estado === 'CERRADA';
  const obstruccion = parseJsonSafe(d.obstruccion_data);
  const obstruccionEntries = Object.entries(obstruccion).filter(([, v]) => v !== null && v !== '' && v !== false);

  return (
    <div className="mb-5">
      {/* Encabezado del evento */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">
          {d.tipo_nombre ?? d.tipo_macro ?? 'Situación'}
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          {hora}
          {cerrada ? ` → cierre ${cierre}${dur ? ` (${dur})` : ''}` : ' → ACTIVA'}
        </span>
        {!cerrada && (
          <span className="text-xs font-semibold text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">ABIERTA</span>
        )}
      </div>
      <div className="border-t border-gray-300 dark:border-gray-600 mb-2" />

      {/* Registro */}
      <L label="registrado por" value={str(d.creado_por_nombre)} />
      <L label="cerrado por" value={str(d.cerrado_por_nombre)} />
      <L label="código" value={str(d.codigo)} />
      <L label="boleta" value={str(d.codigo_boleta ?? d.numero_boleta)} />
      <L label="tipo" value={str(d.tipo_nombre ?? d.tipo_macro)} />

      <Sep />

      {/* Ubicación */}
      <L label="km" value={d.km != null ? String(d.km) : undefined} />
      <L label="sentido" value={str(d.sentido)} />
      <L label="área" value={str(d.area)} />
      <L label="referencia" value={str(d.referencia)} />
      <L label="municipio" value={str(d.municipio)} />
      <L label="departamento" value={str(d.departamento)} />
      <L label="latitud / longitud"
        value={d.latitud != null ? `${d.latitud}, ${d.longitud}` : undefined} />

      <Sep />

      {/* Tiempos */}
      <L label="hora aviso" value={fmtTime(d.hora_aviso)} />
      <L label="hora llegada" value={fmtTime(d.hora_llegada)} />
      <L label="hora cierre" value={fmtTime(d.hora_cierre)} />
      {dur && <L label="duración total" value={dur} />}

      <Sep />

      {/* Personas */}
      <L label="heridos leves" value={String(d.heridos_leves ?? 0)} />
      <L label="heridos graves" value={String(d.heridos_graves ?? 0)} />
      <L label="fallecidos" value={String(d.fallecidos ?? 0)} />
      <L label="ilesos" value={String(d.ilesos ?? 0)} />
      <L label="trasladados" value={String(d.trasladados ?? 0)} />
      <L label="fugados" value={String(d.fugados ?? 0)} />

      <Sep />

      {/* Daños */}
      <L label="daños materiales" value={boolStr(d.danios_materiales)} />
      <L label="daños infraestr." value={boolStr(d.danios_infraestructura)} />
      <L label="desc. daños" value={str(d.danios_descripcion)} />

      <Sep />

      {/* Condiciones de la vía */}
      <L label="clima" value={str(d.clima)} />
      <L label="carga vehicular" value={str(d.carga_vehicular)} />
      <L label="iluminación" value={str(d.iluminacion)} />
      <L label="visibilidad" value={str(d.visibilidad)} />
      <L label="estado vía" value={str(d.via_estado)} />
      <L label="tipo pavimento" value={str(d.tipo_pavimento)} />
      <L label="señalización" value={str(d.senalizacion)} />

      <Sep />

      {/* Causa */}
      <L label="causa probable" value={str(d.causa_probable)} />
      <L label="causa específica" value={str(d.causa_especificar)} />

      <Sep />

      {/* Reporte externo */}
      <L label="reportado por" value={str(d.reportado_por_nombre)} />
      <L label="teléfono reporte" value={str(d.reportado_por_telefono)} />
      <L label="acuerdo involuc." value={
        d.acuerdo_involucrados
          ? `Sí${d.acuerdo_detalle ? ` — ${d.acuerdo_detalle}` : ''}`
          : 'No'
      } />

      <Sep />

      {/* Observaciones */}
      <div className="text-sm">
        <span className="font-medium text-gray-500 uppercase tracking-widest text-[10px] mr-2">observaciones</span>
        <div className="mt-2 space-y-2">
          {Array.isArray(d.observaciones) && d.observaciones.length > 0 ? (
            d.observaciones.map((obs: any, idx: number) => (
              <div key={idx} className="bg-gray-50 dark:bg-gray-800 p-2 border-l-2 border-blue-500 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{obs.usuario}</span>
                  <span className="text-xs text-gray-500 font-mono">{obs.hora} {obs.hora?.includes('¡') && <span title="Offline" className="text-red-500">⚠️</span>}</span>
                </div>
                <p className="text-xs text-gray-800 dark:text-gray-200">{obs.mensaje}</p>
              </div>
            ))
          ) : (
            <span className="text-gray-400 italic">ninguna</span>
          )}
        </div>
      </div>
      {obstruccionEntries.length > 0 && (
        <>
          <L label="obstrucción" value="" />
          {obstruccionEntries.map(([k, v]) => (
            <L key={k} label={`  ${k.replace(/_/g, ' ')}`} value={String(v)} />
          ))}
        </>
      )}

      <Sep />

      {/* Vehículos involucrados */}
      {vehiculos.length === 0 ? (
        <L label="vehículos involuc." value="ninguno" />
      ) : (
        <div>
          <L label="vehículos involuc." value={`${vehiculos.length}`} />
          {vehiculos.map((v, i) => (
            <div key={i} className="ml-4 mt-1 border-l-2 border-gray-200 dark:border-gray-700 pl-3 space-y-0">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-gray-700 dark:text-gray-300">Vehículo {i + 1}: {v.placa}</span>
                {v.marca && <span className="text-gray-500">{v.marca}</span>}
                {v.color && <span className="text-gray-400">{v.color}</span>}
              </div>
              <L label="  conductor" value={v.piloto ? `${v.piloto}${v.licencia ? ` (lic. ${v.licencia})` : ''}` : undefined} />
              <L label="  estado piloto" value={str(v.estado_piloto)} />
              <L label="  heridos" value={String(v.heridos ?? 0)} />
              <L label="  fallecidos" value={String(v.fallecidos ?? 0)} />
              <L label="  daños vehículo" value={str(v.danos)} />
              <L label="  sanción" value={boolStr(v.sancion)} />
            </div>
          ))}
        </div>
      )}

      <Sep />

      {/* Multimedia */}
      {fotos.length + videos.length === 0 ? (
        <L label="fotos / videos" value="ninguno" />
      ) : (
        <div>
          <L label="fotos / videos" value={`${fotos.length} foto(s), ${videos.length} video(s)`} />
          <div className="ml-4 mt-1.5 flex flex-wrap gap-2">
            {fotos.map((f) => (
              <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer"
                className="relative w-20 h-20 rounded overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 group border border-gray-300 dark:border-gray-600">
                <img
                  src={f.thumbnail ?? f.url}
                  alt={f.titulo ?? 'foto'}
                  className="w-full h-full object-cover group-hover:opacity-90"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {f.titulo && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-1 truncate">
                    {f.titulo}
                  </div>
                )}
                <Camera className="absolute top-1 right-1 w-3 h-3 text-white/70" />
              </a>
            ))}
            {videos.map((v) => (
              <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer"
                className="w-20 h-20 rounded bg-gray-800 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center border border-gray-600 group">
                <Video className="w-8 h-8 text-white/70 group-hover:text-white" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LogActividad({ item }: { item: TimelineItem }) {
  const d = item.datos;
  const hora = fmtTime(item.ts);
  const cierre = fmtTime(d.closed_at);
  const dur = duracion(item.ts, d.closed_at);
  const datosJSONB = d.datos && typeof d.datos === 'object' ? Object.entries(d.datos as Record<string, any>).filter(([, v]) => v !== null && v !== '' && v !== 0) : [];

  return (
    <div className="mb-5">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
          {d.tipo_nombre ?? 'Actividad'}
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          {hora}
          {d.closed_at ? ` → cierre ${cierre}${dur ? ` (${dur})` : ''}` : ' → ACTIVA'}
        </span>
        {d.codigo && (
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{d.codigo}</span>
        )}
      </div>
      <div className="border-t border-gray-300 dark:border-gray-600 mb-2" />

      <L label="registrado por" value={str(d.creado_por_nombre)} />
      <L label="estado" value={str(d.estado)} />
      <L label="km" value={d.km != null ? String(d.km) : undefined} />
      <L label="sentido" value={str(d.sentido)} />
      <L label="observaciones" value={str(d.observaciones)} />

      {datosJSONB.length > 0 && (
        <>
          <Sep />
          {datosJSONB.map(([k, v]) => (
            <L key={k} label={k.replace(/_/g, ' ')} value={String(v)} />
          ))}
        </>
      )}
    </div>
  );
}

function LogEvento({ item }: { item: TimelineItem }) {
  const d = item.datos;
  const hora = fmtTime(item.ts);

  // Construir diff si hay datos_ant / datos_new
  const diffLines: { label: string; ant: string; nuevo: string }[] = [];
  if (d.datos_ant && d.datos_new) {
    const allKeys = new Set([...Object.keys(d.datos_ant), ...Object.keys(d.datos_new)]);
    allKeys.forEach(k => {
      const ant = d.datos_ant[k];
      const nuevo = d.datos_new[k];
      if (String(ant) !== String(nuevo)) {
        diffLines.push({ label: k.replace(/_/g, ' '), ant: str(ant), nuevo: str(nuevo) });
      }
    });
  }

  return (
    <div className="mb-5">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">
          {(d.tipo_evento ?? 'Evento').replace(/_/g, ' ')}
        </span>
        <span className="text-gray-500 dark:text-gray-400">{hora}</span>
      </div>
      <div className="border-t border-gray-300 dark:border-gray-600 mb-2" />

      <L label="realizado por" value={str(d.realizado_por)} />
      <L label="descripción" value={str(d.descripcion)} />

      {diffLines.length > 0 && (
        <>
          <Sep />
          {diffLines.map(line => (
            <Cambio key={line.label} label={line.label} ant={line.ant} nuevo={line.nuevo} />
          ))}
        </>
      )}

      {/* Si no hay diff estructurado pero hay datos, mostrarlo */}
      {diffLines.length === 0 && d.datos_new && (
        <L label="datos nuevos" value={JSON.stringify(d.datos_new)} />
      )}
    </div>
  );
}

// ── Card de salida con bitácora tipo log ──────────────────────────────────────

function SalidaCard({ salida }: { salida: SalidaDia }) {
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
      {/* Header compacto */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Truck className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-900 dark:text-gray-100">{salida.unidad_codigo}</span>
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
                  {salida.fecha_hora_regreso ? ` → ${fmtTime(salida.fecha_hora_regreso)}` : ' → en ruta'}
                  {dur && ` (${dur})`}
                </span>
                {salida.ruta_codigo && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{salida.ruta_codigo}
                  </span>
                )}
                {salida.sede_nombre && <span>{salida.sede_nombre}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex-shrink-0 mt-1"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {expanded ? 'Cerrar' : 'Bitácora'}
          </button>
        </div>

        {/* Stats rápidos */}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
          {salida.total_situaciones > 0 && (
            <span className="flex items-center gap-1 text-red-500">
              <AlertTriangle className="w-3 h-3" /> {salida.total_situaciones} sit.
            </span>
          )}
          {salida.total_actividades > 0 && (
            <span className="flex items-center gap-1 text-blue-500">
              <Activity className="w-3 h-3" /> {salida.total_actividades} act.
            </span>
          )}
          {tripulacion.length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {tripulacion.map((t, i) => (
                <span key={i}>
                  {(t.rol_tripulacion ?? t.rol ?? '').replace(/_/g, ' ')}: {t.nombre_completo ?? t.nombre ?? t.chapa}
                  {i < tripulacion.length - 1 && ' · '}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>

      {/* Bitácora en texto */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60">
          {isFetching && (
            <div className="flex items-center gap-2 text-gray-500 p-5 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando bitácora...
            </div>
          )}
          {isError && (
            <p className="text-red-500 text-sm p-5">Error al cargar la bitácora.</p>
          )}
          {timelineData && (
            <div className="px-5 py-4 font-mono text-xs leading-5 text-gray-700 dark:text-gray-300 overflow-hidden">

              {/* ── INICIO DE SALIDA ── */}
              <div className="mb-5">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                    Inicio de Salida
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">{fmtTime(salida.fecha_hora_salida)}</span>
                  <LogIn className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                </div>
                <div className="border-t border-gray-300 dark:border-gray-600 mb-2" />
                <L label="tripulación" value={
                  tripulacion.length > 0
                    ? tripulacion.map(t => `${t.nombre_completo ?? t.nombre ?? t.chapa} (${(t.rol_tripulacion ?? t.rol ?? '').replace(/_/g, ' ')}${t.chapa ? ' · chapa ' + t.chapa : ''})`).join(' / ')
                    : undefined
                } />
                <L label="odómetro ini." value={salida.km_inicial !== null ? `${Number(salida.km_inicial).toLocaleString()} km` : undefined} />
                <L label="combustible ini." value={fmtCombustible(salida.combustible_inicial)} />
                <L label="ruta" value={salida.ruta_codigo ? `${salida.ruta_codigo}${salida.ruta_nombre ? ' — ' + salida.ruta_nombre : ''}` : undefined} />
                <L label="sede" value={salida.sede_nombre} />
                <L label="observaciones" value={str(salida.observaciones_salida)} />
              </div>

              {/* ── EVENTOS DEL DÍA ── */}
              {timelineData.timeline.length === 0 && (
                <p className="text-gray-400 dark:text-gray-500 mb-4">Sin situaciones, actividades ni eventos registrados.</p>
              )}
              {timelineData.timeline.map(item => {
                if (item.tipo === 'SITUACION') return <LogSituacion key={`sit-${item.ref_id}`} item={item} />;
                if (item.tipo === 'ACTIVIDAD') return <LogActividad key={`act-${item.ref_id}`} item={item} />;
                if (item.tipo === 'EVENTO')    return <LogEvento    key={`ev-${item.ref_id}`}  item={item} />;
                return null;
              })}

              {/* ── FIN DE SALIDA ── */}
              <div className="mb-2">
                <div className="flex items-baseline gap-2 mb-1">
                  {salida.fecha_hora_regreso ? (
                    <>
                      <span className="font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        Fin de Salida
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">{fmtTime(salida.fecha_hora_regreso)}</span>
                      <LogOut className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    </>
                  ) : (
                    <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide animate-pulse">
                      En Ruta · aún no ha regresado
                    </span>
                  )}
                </div>
                {salida.fecha_hora_regreso && (
                  <>
                    <div className="border-t border-gray-300 dark:border-gray-600 mb-2" />
                    <L label="finalizado por" value={str(salida.finalizado_por_nombre)} />
                    <L label="odómetro fin." value={salida.km_final !== null ? `${Number(salida.km_final).toLocaleString()} km` : undefined} />
                    <L label="km recorridos" value={salida.km_recorridos !== null ? `${Number(salida.km_recorridos).toLocaleString()} km` : undefined} />
                    <L label="combustible fin." value={fmtCombustible(salida.combustible_final)} />
                    <L label="observaciones" value={str(salida.observaciones_regreso)} />
                  </>
                )}
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
              <p className="text-xs text-gray-500 dark:text-gray-400">Registro completo de operaciones por fecha</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-4xl w-full mx-auto px-4 py-5 flex flex-col gap-5">
        {/* Buscador */}
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
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="Actualizar"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {isError && (
          <div className="text-red-500 dark:text-red-400 text-sm text-center py-4">
            Error al cargar la bitácora. Verifica la fecha e intenta de nuevo.
          </div>
        )}

        {!isError && (
          <>
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

            {!isFetching && salidas.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
                <Truck className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No hay salidas registradas para esta fecha.</p>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {salidas.map(salida => (
                <SalidaCard key={salida.salida_id} salida={salida} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
