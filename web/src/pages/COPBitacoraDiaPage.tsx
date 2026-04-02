import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Search, Truck, ChevronDown, ChevronRight,
  Clock, MapPin, AlertTriangle, Activity, Users, Loader2,
  Edit3, LogIn, LogOut, Camera, Video, RefreshCw, ChevronUp,
  UserCheck, Car,
} from 'lucide-react';
import api from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null | undefined) {
  if (!iso) return '—';
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
function labelSentido(s: string | null): string {
  if (!s) return '';
  const map: Record<string, string> = {
    NORTE: 'Norte', SUR: 'Sur', ORIENTE: 'Oriente', OCCIDENTE: 'Occidente',
    AMBOS: 'Ambos sentidos', ENTRADA: 'Entrada', SALIDA: 'Salida',
  };
  return map[s] ?? s;
}
function labelClima(s: string | null): string {
  if (!s) return '';
  const map: Record<string, string> = {
    SOLEADO: 'Soleado', NUBLADO: 'Nublado', LLUVIA: 'Lluvia', NIEBLA: 'Niebla',
    GARUA: 'Garúa', TORMENTA: 'Tormenta',
  };
  return map[s] ?? s;
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

interface MediaItem {
  id: number;
  tipo: 'FOTO' | 'VIDEO';
  url: string;
  thumbnail: string | null;
  titulo: string | null;
  subido_por: string | null;
}

interface VehiculoInvolucrado {
  placa: string;
  marca: string | null;
  color: string | null;
  piloto: string | null;
  licencia: string | null;
  estado_piloto: string | null;
  heridos: number | null;
  fallecidos: number | null;
  danos: string | null;
  sancion: boolean | null;
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
  OBSTACULO:            'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
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

// ── Sección de detalle ────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '' || value === '—') return null;
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-gray-400 dark:text-gray-500 flex-shrink-0 w-28">{label}</span>
      <span className="text-gray-700 dark:text-gray-300 font-medium">{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-3 mb-1.5 border-t border-gray-100 dark:border-gray-700/50 pt-2">
      {children}
    </p>
  );
}

// ── Componente: ítem del timeline ─────────────────────────────────────────────

function TimelineItemView({ item }: { item: TimelineItem }) {
  const [expanded, setExpanded] = useState(false);
  const hora = fmtTime(item.ts);

  if (item.tipo === 'SITUACION') {
    const d = item.datos;
    const fotos: MediaItem[] = (d.fotos ?? []).filter((f: MediaItem) => f.tipo === 'FOTO');
    const videos: MediaItem[] = (d.fotos ?? []).filter((f: MediaItem) => f.tipo === 'VIDEO');
    const vehiculos: VehiculoInvolucrado[] = d.vehiculos ?? [];
    const cerrada = d.estado === 'CERRADA';
    const hayVictimas = (d.heridos ?? 0) > 0 || (d.fallecidos ?? 0) > 0 || (d.heridos_leves ?? 0) > 0 || (d.heridos_graves ?? 0) > 0;
    const hayDanios = d.danios_materiales || d.danios_infraestructura;

    return (
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className="w-3 h-3 rounded-full bg-red-500 mt-1 flex-shrink-0" />
          <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
        </div>
        <div className="pb-4 flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{hora}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${macroBadge(d.tipo_macro)}`}>
              {d.tipo_nombre ?? d.tipo_macro}
            </span>
            {cerrada ? (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Cerrada</span>
            ) : (
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">Activa</span>
            )}
            {(hayVictimas) && (
              <span className="flex items-center gap-0.5 text-xs text-red-600 dark:text-red-400 font-semibold">
                <AlertTriangle className="w-3 h-3" />
                {(d.heridos_leves ?? 0) + (d.heridos_graves ?? 0) + (d.heridos ?? 0)} her.
                {(d.fallecidos ?? 0) > 0 && ` · ${d.fallecidos} fall.`}
              </span>
            )}
          </div>

          {/* Resumen compacto siempre visible */}
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
            {(d.km || d.sentido) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {d.km ? `km ${d.km}` : ''}
                {d.sentido ? ` · ${labelSentido(d.sentido)}` : ''}
                {d.departamento ? ` · ${d.departamento}${d.municipio ? ', ' + d.municipio : ''}` : ''}
                {d.area ? ` · ${d.area}` : ''}
              </span>
            )}
            {d.observaciones && (
              <p className={`text-gray-600 dark:text-gray-300 ${!expanded ? 'line-clamp-2' : ''}`}>
                {d.observaciones}
              </p>
            )}
            <div className="flex items-center gap-3 flex-wrap mt-0.5">
              {fotos.length > 0 && (
                <span className="flex items-center gap-1">
                  <Camera className="w-3 h-3" /> {fotos.length} foto{fotos.length !== 1 ? 's' : ''}
                </span>
              )}
              {videos.length > 0 && (
                <span className="flex items-center gap-1">
                  <Video className="w-3 h-3" /> {videos.length} video{videos.length !== 1 ? 's' : ''}
                </span>
              )}
              {vehiculos.length > 0 && (
                <span className="flex items-center gap-1">
                  <Car className="w-3 h-3" /> {vehiculos.length} veh.
                </span>
              )}
              {d.codigo && (
                <span className="font-mono text-gray-400 dark:text-gray-500">{d.codigo}</span>
              )}
            </div>
          </div>

          {/* Botón expandir */}
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1.5"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Menos detalle' : 'Ver detalle completo'}
          </button>

          {/* Panel expandido */}
          {expanded && (
            <div className="mt-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3 border border-gray-200 dark:border-gray-700 space-y-0.5">

              {/* Tiempos */}
              <SectionTitle>Tiempos</SectionTitle>
              <DetailRow label="Aviso recibido" value={fmtTime(d.hora_aviso)} />
              <DetailRow label="Llegada brigada" value={fmtTime(d.hora_llegada)} />
              <DetailRow label="Cierre" value={fmtTime(d.hora_cierre)} />
              {d.hora_aviso && d.hora_cierre && (
                <DetailRow label="Duración total" value={duracion(d.hora_aviso, d.hora_cierre)} />
              )}

              {/* Registro */}
              <SectionTitle>Registro</SectionTitle>
              <DetailRow label="Código" value={d.codigo} />
              <DetailRow label="Boleta" value={d.codigo_boleta ?? d.numero_boleta} />
              <DetailRow label="Registrado por" value={d.creado_por_nombre} />
              <DetailRow label="Cerrado por" value={d.cerrado_por_nombre} />
              {d.reportado_por_nombre && (
                <>
                  <DetailRow label="Reportado por" value={d.reportado_por_nombre} />
                  <DetailRow label="Teléfono" value={d.reportado_por_telefono} />
                </>
              )}

              {/* Ubicación */}
              {(d.referencia || d.departamento || d.municipio) && (
                <>
                  <SectionTitle>Ubicación</SectionTitle>
                  <DetailRow label="Referencia" value={d.referencia} />
                  <DetailRow label="Municipio" value={d.municipio} />
                  <DetailRow label="Departamento" value={d.departamento} />
                  {d.latitud && d.longitud && (
                    <DetailRow label="Coordenadas" value={`${d.latitud}, ${d.longitud}`} />
                  )}
                </>
              )}

              {/* Condiciones */}
              {(d.clima || d.carga_vehicular || d.iluminacion || d.visibilidad || d.via_estado || d.tipo_pavimento) && (
                <>
                  <SectionTitle>Condiciones</SectionTitle>
                  <DetailRow label="Clima" value={labelClima(d.clima)} />
                  <DetailRow label="Carga vehicular" value={d.carga_vehicular} />
                  <DetailRow label="Iluminación" value={d.iluminacion} />
                  <DetailRow label="Visibilidad" value={d.visibilidad} />
                  <DetailRow label="Estado vía" value={d.via_estado} />
                  <DetailRow label="Tipo pavimento" value={d.tipo_pavimento} />
                  <DetailRow label="Señalización" value={d.senalizacion} />
                </>
              )}

              {/* Causa */}
              {(d.causa_probable || d.causa_especificar) && (
                <>
                  <SectionTitle>Causa</SectionTitle>
                  <DetailRow label="Causa probable" value={d.causa_probable} />
                  <DetailRow label="Especificación" value={d.causa_especificar} />
                </>
              )}

              {/* Víctimas */}
              {(hayVictimas || (d.ilesos ?? 0) > 0 || (d.trasladados ?? 0) > 0) && (
                <>
                  <SectionTitle>Personas involucradas</SectionTitle>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {[
                      { label: 'Heridos leves', val: d.heridos_leves, color: 'text-yellow-700 dark:text-yellow-400' },
                      { label: 'Heridos graves', val: d.heridos_graves, color: 'text-orange-700 dark:text-orange-400' },
                      { label: 'Fallecidos', val: d.fallecidos, color: 'text-red-700 dark:text-red-400' },
                      { label: 'Trasladados', val: d.trasladados, color: 'text-blue-700 dark:text-blue-400' },
                      { label: 'Ilesos', val: d.ilesos, color: 'text-green-700 dark:text-green-400' },
                      { label: 'Fugados', val: d.fugados, color: 'text-gray-600 dark:text-gray-400' },
                    ].filter(r => (r.val ?? 0) > 0).map(r => (
                      <div key={r.label} className="bg-white dark:bg-gray-700/50 rounded p-1.5 text-center">
                        <p className={`text-sm font-bold ${r.color}`}>{r.val}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{r.label}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Daños */}
              {(hayDanios || d.danios_descripcion) && (
                <>
                  <SectionTitle>Daños</SectionTitle>
                  {d.danios_materiales && (
                    <p className="text-xs text-orange-700 dark:text-orange-400">Daños materiales reportados</p>
                  )}
                  {d.danios_infraestructura && (
                    <p className="text-xs text-orange-700 dark:text-orange-400">Daños a infraestructura reportados</p>
                  )}
                  <DetailRow label="Descripción" value={d.danios_descripcion} />
                </>
              )}

              {/* Acuerdo */}
              {d.acuerdo_involucrados && (
                <>
                  <SectionTitle>Acuerdo entre involucrados</SectionTitle>
                  <p className="text-xs text-green-700 dark:text-green-400">Llegaron a acuerdo</p>
                  <DetailRow label="Detalle" value={d.acuerdo_detalle} />
                </>
              )}

              {/* Vehículos */}
              {vehiculos.length > 0 && (
                <>
                  <SectionTitle>Vehículos involucrados ({vehiculos.length})</SectionTitle>
                  <div className="space-y-2">
                    {vehiculos.map((v, i) => (
                      <div key={i} className="bg-white dark:bg-gray-700/50 rounded p-2 border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-2 mb-1">
                          <Car className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200 font-mono">{v.placa}</span>
                          {v.marca && <span className="text-xs text-gray-500 dark:text-gray-400">{v.marca}</span>}
                          {v.color && <span className="text-xs text-gray-400 dark:text-gray-500">{v.color}</span>}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                          {v.piloto && <p>Conductor: <span className="font-medium text-gray-700 dark:text-gray-300">{v.piloto}</span>{v.licencia ? ` · Lic. ${v.licencia}` : ''}</p>}
                          {v.estado_piloto && <p>Estado: <span className="font-medium">{v.estado_piloto}</span></p>}
                          {(v.heridos ?? 0) > 0 && <p className="text-orange-600 dark:text-orange-400">{v.heridos} herido(s) en este vehículo</p>}
                          {(v.fallecidos ?? 0) > 0 && <p className="text-red-600 dark:text-red-400">{v.fallecidos} fallecido(s) en este vehículo</p>}
                          {v.danos && <p>Daños: {v.danos}</p>}
                          {v.sancion && <p className="text-yellow-600 dark:text-yellow-400">Sanción impuesta</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Fotos y videos */}
              {(fotos.length > 0 || videos.length > 0) && (
                <>
                  <SectionTitle>Evidencia fotográfica / video ({fotos.length + videos.length})</SectionTitle>
                  <div className="grid grid-cols-3 gap-1.5">
                    {fotos.map((f) => (
                      <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer"
                        className="relative aspect-square rounded overflow-hidden bg-gray-200 dark:bg-gray-700 group">
                        <img
                          src={f.thumbnail ?? f.url}
                          alt={f.titulo ?? 'foto'}
                          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        {f.titulo && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-1 py-0.5 truncate">
                            {f.titulo}
                          </div>
                        )}
                      </a>
                    ))}
                    {videos.map((v) => (
                      <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer"
                        className="relative aspect-square rounded overflow-hidden bg-gray-800 dark:bg-gray-700 flex items-center justify-center group">
                        <Video className="w-8 h-8 text-white/70 group-hover:text-white transition-colors" />
                        {v.titulo && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-1 py-0.5 truncate">
                            {v.titulo}
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (item.tipo === 'ACTIVIDAD') {
    const d = item.datos;
    const dur = d.closed_at ? duracion(item.ts, d.closed_at) : null;
    return (
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
          <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
        </div>
        <div className="pb-4 flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{hora}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {d.tipo_nombre ?? 'Actividad'}
            </span>
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            {d.closed_at ? (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Cerrada {fmtTime(d.closed_at)}{dur ? ` (${dur})` : ''}
              </span>
            ) : (
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">Activa</span>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
            {(d.km || d.sentido) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {d.km ? `km ${d.km}` : ''}
                {d.sentido ? ` · ${labelSentido(d.sentido)}` : ''}
              </span>
            )}
            {d.observaciones && <p className="text-gray-600 dark:text-gray-300">{d.observaciones}</p>}
            <span className="flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              {d.creado_por_nombre ?? 'Desconocido'}
            </span>
            {d.codigo && <span className="font-mono text-gray-400">{d.codigo}</span>}
          </div>
          {/* Datos JSONB de la actividad (conteos, velocidades, etc.) */}
          {d.datos && Object.keys(d.datos).length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {Object.entries(d.datos as Record<string, any>).map(([k, v]) =>
                v !== null && v !== '' && v !== 0 ? (
                  <span key={k} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                    {k.replace(/_/g, ' ')}: {String(v)}
                  </span>
                ) : null
              )}
            </div>
          )}
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
              {d.tipo_evento?.replace(/_/g, ' ')}
            </span>
            <Edit3 className="w-3.5 h-3.5 text-yellow-500" />
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{d.descripcion}</p>
          {d.realizado_por && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> {d.realizado_por}
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ── Componente: card de salida expandible ─────────────────────────────────────

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
      {/* Header de la card */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
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
                    {salida.ruta_codigo}{salida.ruta_nombre ? ` — ${salida.ruta_nombre}` : ''}
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
        <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
          {salida.km_inicial !== null && (
            <span className="text-gray-600 dark:text-gray-400">
              Odóm. ini: <span className="font-semibold text-gray-800 dark:text-gray-200">{Number(salida.km_inicial).toLocaleString()}</span>
              {salida.km_final !== null && (
                <> → <span className="font-semibold text-gray-800 dark:text-gray-200">{Number(salida.km_final).toLocaleString()}</span></>
              )}
              {salida.km_recorridos !== null && (
                <span className="text-gray-400"> (+{Number(salida.km_recorridos).toLocaleString()} km)</span>
              )}
            </span>
          )}
          {salida.combustible_inicial !== null && (
            <span className="text-gray-600 dark:text-gray-400">
              Comb: <span className="font-semibold text-gray-800 dark:text-gray-200">{fmtCombustible(salida.combustible_inicial)}</span>
              {salida.combustible_final !== null && (
                <> → <span className="font-semibold text-gray-800 dark:text-gray-200">{fmtCombustible(salida.combustible_final)}</span></>
              )}
            </span>
          )}
          {salida.total_situaciones > 0 && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-3 h-3" />
              {salida.total_situaciones} situación{salida.total_situaciones !== 1 ? 'es' : ''}
            </span>
          )}
          {salida.total_actividades > 0 && (
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <Activity className="w-3 h-3" />
              {salida.total_actividades} actividad{salida.total_actividades !== 1 ? 'es' : ''}
            </span>
          )}
        </div>

        {/* Tripulación */}
        {tripulacion.length > 0 && (
          <div className="flex items-start gap-2 mt-3">
            <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="flex flex-wrap gap-1.5">
              {tripulacion.map((t, i) => (
                <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                  {(t.rol_tripulacion ?? t.rol ?? '').replace(/_/g, ' ')}: {t.nombre_completo ?? t.nombre ?? t.chapa ?? `#${t.brigada_id ?? t.usuario_id}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Observaciones de salida/regreso */}
        {(salida.observaciones_salida || salida.observaciones_regreso) && (
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
            {salida.observaciones_salida && <p><span className="font-medium">Obs. salida:</span> {salida.observaciones_salida}</p>}
            {salida.observaciones_regreso && <p><span className="font-medium">Obs. regreso:</span> {salida.observaciones_regreso}</p>}
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
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">INICIO DE SALIDA</span>
                    <LogIn className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 space-y-0.5">
                    {salida.km_inicial !== null && <span>Odómetro: {Number(salida.km_inicial).toLocaleString()} km</span>}
                    {salida.combustible_inicial !== null && <span> · Combustible: {fmtCombustible(salida.combustible_inicial)}</span>}
                    {salida.ruta_codigo && <p>Ruta: {salida.ruta_codigo}{salida.ruta_nombre ? ` — ${salida.ruta_nombre}` : ''}</p>}
                    {salida.observaciones_salida && <p className="text-gray-600 dark:text-gray-300">{salida.observaciones_salida}</p>}
                  </div>
                </div>
              </div>

              {/* Eventos del timeline */}
              {timelineData.timeline.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 ml-6 pb-2">Sin situaciones, actividades ni eventos registrados.</p>
              ) : (
                timelineData.timeline.map((item) => (
                  <TimelineItemView key={`${item.tipo}-${item.ref_id}`} item={item} />
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
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">FIN DE SALIDA</span>
                        <LogOut className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 space-y-0.5">
                        {salida.km_final !== null && (
                          <p>
                            Odómetro final: {Number(salida.km_final).toLocaleString()} km
                            {salida.km_recorridos !== null && ` (+${Number(salida.km_recorridos).toLocaleString()} km recorridos)`}
                          </p>
                        )}
                        {salida.combustible_final !== null && <p>Combustible final: {fmtCombustible(salida.combustible_final)}</p>}
                        {salida.finalizado_por_nombre && (
                          <p className="flex items-center gap-1">
                            <UserCheck className="w-3 h-3" /> Finalizado por: {salida.finalizado_por_nombre}
                          </p>
                        )}
                        {salida.observaciones_regreso && <p className="text-gray-600 dark:text-gray-300">{salida.observaciones_regreso}</p>}
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
              <p className="text-xs text-gray-500 dark:text-gray-400">Registro completo de operaciones por fecha</p>
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
                <SalidaCard key={salida.salida_id} salida={salida} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
