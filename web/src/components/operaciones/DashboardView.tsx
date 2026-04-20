import { useMutation, useQueryClient } from '@tanstack/react-query';
import { turnosService } from '../../services/common/turnos.service';
import { useNavigate } from 'react-router-dom';
import {
  Users, Truck, Fuel, Calendar,
  CheckCircle, MapPin, Clock, Edit2, Trash2,
  Navigation, EyeOff, Navigation2,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupByFecha(items: any[]): [string, any[]][] {
  const map: Record<string, any[]> = {};
  for (const item of items) {
    const key = item.fecha || 'sin-fecha';
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
}

function formatFechaLabel(fechaStr: string): string {
  if (!fechaStr || fechaStr === 'sin-fecha') return 'Sin fecha';
  const [y, m, d] = fechaStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff < 0) return `Atrasada — ${date.toLocaleDateString('es-GT', { weekday: 'short', day: 'numeric', month: 'short' })}`;
  return date.toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' });
}

function tiempoDesde(isoStr: string | null): string {
  if (!isoStr) return '';
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000);
  if (diff < 60) return `${diff} min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// ─── Card de asignación ───────────────────────────────────────────────────────

interface AsignacionCardProps {
  asignacion: any;
  editable?: boolean;
  onEdit?: (a: any) => void;
  onDelete?: (a: any) => void;
  deletePending?: boolean;
}

function AsignacionCard({ asignacion, editable, onEdit, onDelete, deletePending }: AsignacionCardProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
      {/* Header de la card */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Truck className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-semibold text-gray-900 dark:text-gray-100">{asignacion.unidad_codigo}</span>
          {asignacion.tipo_unidad && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
              {asignacion.tipo_unidad}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {asignacion.hora_salida && (
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              {asignacion.hora_salida}
            </div>
          )}
          {editable && onEdit && onDelete && (
            <>
              <button
                onClick={() => onEdit(asignacion)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                title="Editar"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(asignacion)}
                disabled={deletePending}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                title="Eliminar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Ruta */}
      {asignacion.ruta_nombre && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>{asignacion.ruta_nombre}</span>
          {asignacion.sentido && (
            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">{asignacion.sentido}</span>
          )}
        </div>
      )}

      {/* Tripulación */}
      {asignacion.tripulacion?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase mb-1.5">Tripulación</p>
          <div className="space-y-1">
            {asignacion.tripulacion.map((t: any) => (
              <div key={t.usuario_id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-800 dark:text-gray-200">{t.nombre_completo}</span>
                  <span className="text-gray-400 dark:text-gray-500 text-xs">({t.chapa})</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t.rol_tripulacion}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones/notas */}
      {asignacion.acciones && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">{asignacion.acciones}</p>
        </div>
      )}
    </div>
  );
}

// ─── Sección con agrupación por fecha ────────────────────────────────────────

interface SeccionProps {
  titulo: string;
  subtitulo: string;
  icon: React.ReactNode;
  badgeText: string;
  badgeClass: string;
  headerClass: string;
  borderClass: string;
  asignaciones: any[];
  editable?: boolean;
  onEdit?: (a: any) => void;
  onDelete?: (a: any) => void;
  deletePending?: boolean;
  extraInfo?: (a: any) => React.ReactNode;
}

function SeccionAsignaciones({
  titulo, subtitulo, icon, badgeText, badgeClass, headerClass, borderClass,
  asignaciones, editable, onEdit, onDelete, deletePending, extraInfo,
}: SeccionProps) {
  if (asignaciones.length === 0) return null;

  const grupos = groupByFecha(asignaciones);

  return (
    <div className={`rounded-xl border-2 ${borderClass} overflow-hidden`}>
      {/* Header de sección */}
      <div className={`px-5 py-4 ${headerClass} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="opacity-70">{icon}</div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{titulo}</h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{subtitulo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${badgeClass}`}>
            {badgeText}
          </span>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-white/60 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300">
            {asignaciones.length} {asignaciones.length === 1 ? 'unidad' : 'unidades'}
          </span>
        </div>
      </div>

      {/* Grupos por fecha */}
      <div className="p-4 space-y-4 bg-white/50 dark:bg-gray-900/50">
        {grupos.map(([fecha, items]) => (
          <div key={fecha}>
            {/* Sub-header de fecha */}
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {formatFechaLabel(fecha)}
              </span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs text-gray-400 dark:text-gray-500">{items.length}</span>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {items.map((a: any) => (
                <div key={a.asignacion_id || a.id}>
                  {extraInfo && extraInfo(a)}
                  <AsignacionCard
                    asignacion={a}
                    editable={editable && !a.hora_salida_real}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    deletePending={deletePending}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface DashboardViewProps {
  data: any;
  turnoHoy?: any;
}

export default function DashboardView({ data, turnoHoy }: DashboardViewProps) {
  const resumen = data.resumen;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const deleteMutation = useMutation({
    mutationFn: ({ asignacionId, forzar }: { asignacionId: number; forzar: boolean }) =>
      turnosService.deleteAsignacion(asignacionId, forzar),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['turno-hoy'] });
      alert(data.salida_cerrada
        ? 'Asignación eliminada y salida cerrada correctamente'
        : 'Asignación eliminada correctamente');
    },
    onError: (error: any, variables) => {
      const errorData = error.response?.data;
      if (errorData?.salida_id && !variables.forzar) {
        if (confirm(`${errorData.message}\n\n¿Desea cerrar la salida y eliminar la asignación de todas formas?`)) {
          deleteMutation.mutate({ asignacionId: variables.asignacionId, forzar: true });
        }
      } else {
        alert(errorData?.error || errorData?.message || 'Error al eliminar asignación');
      }
    },
  });

  const handleDelete = (asignacion: any) => {
    if (asignacion.en_ruta) {
      alert('No se puede eliminar una asignacion que está en ruta');
      return;
    }
    const asignacionId = asignacion.asignacion_id || asignacion.id;
    if (!asignacionId) {
      alert('Error: No se pudo obtener el ID de la asignacion');
      return;
    }
    if (confirm(`¿Eliminar asignacion de unidad ${asignacion.unidad_codigo}?`)) {
      deleteMutation.mutate({ asignacionId, forzar: false });
    }
  };

  const handleEdit = (asignacion: any) => {
    if (asignacion.en_ruta) {
      alert('No se puede editar una asignacion que está en ruta');
      return;
    }
    const asignacionConId = { ...asignacion, id: asignacion.asignacion_id || asignacion.id };
    navigate('/operaciones/crear-asignacion', {
      state: { editMode: true, asignacion: asignacionConId, turnoId: turnoHoy?.turno?.id }
    });
  };

  // ── Clasificar asignaciones en 3 grupos ────────────────────────────────────
  const todasAsignaciones: any[] = turnoHoy?.asignaciones || [];

  const sinPublicar         = todasAsignaciones.filter(a => !a.publicado);
  const publicadasPendientes = todasAsignaciones.filter(a => a.publicado && !a.en_ruta && !a.hora_salida_real);
  const enRuta              = todasAsignaciones.filter(a => a.en_ruta || !!a.hora_salida_real);

  const hayAsignaciones = todasAsignaciones.length > 0;

  return (
    <div className="space-y-6">

      {/* ── Métricas ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Brigadas Activas</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{resumen.total_brigadas_activas}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{resumen.brigadas_en_turno_hoy} en turno hoy</p>
            </div>
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Brigadas Disponibles</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{resumen.brigadas_disponibles_hoy}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Para asignar hoy</p>
            </div>
            <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Unidades Activas</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{resumen.total_unidades_activas}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{resumen.unidades_en_turno_hoy} en turno hoy</p>
            </div>
            <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <Truck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Unidades Disponibles</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{resumen.unidades_disponibles_hoy}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Listas para salir</p>
            </div>
            <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Alertas ──────────────────────────────────────────────────────── */}
      {data.unidades_bajo_combustible > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
              <Fuel className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-300 text-sm">
                {data.unidades_bajo_combustible} unidades con bajo combustible
              </h3>
              {data.alertas.unidadesCombustible.map((u: any) => (
                <p key={u.unidad_id} className="text-xs text-red-700 dark:text-red-400 mt-1">
                  <span className="font-medium">{u.unidad_codigo}</span> — {u.nivel_combustible ?? (u.combustible_actual != null ? `${Math.round(Number(u.combustible_actual) * 100)}%` : 'sin datos')}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Secciones de asignaciones ─────────────────────────────────────── */}

      {/* Sección 1: Sin publicar (borradores) */}
      <SeccionAsignaciones
        titulo="Sin Publicar"
        subtitulo="Las brigadas aún no han recibido estas asignaciones"
        icon={<EyeOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
        badgeText="BORRADOR"
        badgeClass="bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200"
        headerClass="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800"
        borderClass="border-amber-200 dark:border-amber-800"
        asignaciones={sinPublicar}
        editable
        onEdit={handleEdit}
        onDelete={handleDelete}
        deletePending={deleteMutation.isPending}
      />

      {/* Sección 2: Publicadas, pendientes de salida */}
      <SeccionAsignaciones
        titulo="Publicadas — Pendientes de Salida"
        subtitulo="Las brigadas ya ven sus asignaciones, esperando hora de salida"
        icon={<Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
        badgeText="PUBLICADA"
        badgeClass="bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200"
        headerClass="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800"
        borderClass="border-blue-200 dark:border-blue-800"
        asignaciones={publicadasPendientes}
        editable
        onEdit={handleEdit}
        onDelete={handleDelete}
        deletePending={deleteMutation.isPending}
      />

      {/* Sección 3: En ruta */}
      <SeccionAsignaciones
        titulo="En Ruta"
        subtitulo="Unidades actualmente en servicio"
        icon={<Navigation className="w-5 h-5 text-green-600 dark:text-green-400" />}
        badgeText="EN RUTA"
        badgeClass="bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200"
        headerClass="bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800"
        borderClass="border-green-200 dark:border-green-800"
        asignaciones={enRuta}
        extraInfo={(a) => a.salida_hora_real ? (
          <p className="text-xs text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
            <Navigation2 className="w-3 h-3" />
            En ruta desde hace {tiempoDesde(a.salida_hora_real)}
          </p>
        ) : null}
      />

      {/* Sin asignaciones */}
      {!hayAsignaciones && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <Calendar className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-600 dark:text-gray-300">Sin asignaciones</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            No hay asignaciones activas para esta sede. Crea una con el botón <strong>+ Asignacion</strong>.
          </p>
        </div>
      )}

      {/* Todo en orden */}
      {data.unidades_bajo_combustible === 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
              Sin alertas — todos los recursos disponibles
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
