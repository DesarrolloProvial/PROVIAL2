/**
 * Dashboard de Asignaciones por Sede
 * Vista para admin/operaciones central con todas las sedes
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  asignacionesAvanzadasAPI,
  SedeConAsignaciones,
  AsignacionConDetalle
} from '../../services/operaciones/asignacionesAvanzadas.service';
import { useAuthStore } from '../../store/authStore';
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Truck,
  Users,
  MapPin,
  Clock,
  Phone,
  CreditCard,
  AlertTriangle,
  Info,
  AlertCircle,
  Send,
  Eye,
  EyeOff,
  Settings,
  Plus,
  X,
  Edit2,
  ArrowLeft
} from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';

export default function DashboardSedesPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [sedesExpandidas, setSedesExpandidas] = useState<Set<number>>(new Set());
  const [asignacionExpandida, setAsignacionExpandida] = useState<number | null>(null);
  const [incluirBorradores, setIncluirBorradores] = useState(true);

  // Modal de selección para publicar
  const [modalPublicar, setModalPublicar] = useState<{
    visible: boolean;
    sede: SedeConAsignaciones | null;
    seleccionadas: Set<number>;
  }>({ visible: false, sede: null, seleccionadas: new Set() });

  // Banner de confirmación tras publicar
  const [banner, setBanner] = useState<{ codigos: string[]; sedeName: string } | null>(null);

  // Modal para avisos
  const [modalAviso, setModalAviso] = useState<{
    visible: boolean;
    asignacionId: number | null;
  }>({ visible: false, asignacionId: null });
  const [nuevoAviso, setNuevoAviso] = useState({ tipo: 'INFO', mensaje: '', color: '#f59e0b' });

  // Obtener datos - mostrar todas las asignaciones pendientes (hoy y futuras)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['asignaciones-por-sede', incluirBorradores],
    queryFn: () => asignacionesAvanzadasAPI.getAsignacionesPorSede(undefined, undefined, incluirBorradores, true),
    refetchInterval: 60000
  });

  // Mutations
  const publicarMutation = useMutation({
    mutationFn: ({ turnoId, asignacionIds }: { turnoId: number; asignacionIds: number[] }) =>
      asignacionesAvanzadasAPI.publicarTurno(turnoId, asignacionIds),
    onSuccess: (resp, _variables) => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones-por-sede'] });
      const codigos: string[] = resp.data?.codigos ?? [];
      const sedeName = modalPublicar.sede?.sede_nombre ?? '';
      if (codigos.length > 0) {
        setBanner({ codigos, sedeName });
        setTimeout(() => setBanner(null), 6000);
      }
      setModalPublicar({ visible: false, sede: null, seleccionadas: new Set() });
    },
    onError: (error: any) => {
      console.error('Error al publicar nómina:', error.response?.data?.error || error.message);
      alert(error.response?.data?.error || 'Error al publicar nómina');
    }
  });

  const despublicarMutation = useMutation({
    mutationFn: (turnoId: number) => asignacionesAvanzadasAPI.despublicarTurno(turnoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones-por-sede'] });
    },
    onError: (error: any) => {
      console.error('Error al despublicar nómina:', error.response?.data?.error || error.message);
      alert(error.response?.data?.error || 'Error al despublicar nómina');
    }
  });

  function abrirModalPublicar(sede: SedeConAsignaciones) {
    const borradoresIds = new Set<number>(
      sede.asignaciones
        .filter(a => a.estado_nomina === 'BORRADOR' || !a.estado_nomina)
        .map(a => a.asignacion_id)
    );
    setModalPublicar({ visible: true, sede, seleccionadas: borradoresIds });
  }

  function toggleSeleccion(asignacionId: number) {
    setModalPublicar(prev => {
      const next = new Set(prev.seleccionadas);
      if (next.has(asignacionId)) next.delete(asignacionId);
      else next.add(asignacionId);
      return { ...prev, seleccionadas: next };
    });
  }

  const crearAvisoMutation = useMutation({
    mutationFn: ({ asignacionId, data }: { asignacionId: number; data: any }) =>
      asignacionesAvanzadasAPI.crearAviso(asignacionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones-por-sede'] });
      setModalAviso({ visible: false, asignacionId: null });
      setNuevoAviso({ tipo: 'INFO', mensaje: '', color: '#f59e0b' });
    }
  });

  const eliminarAvisoMutation = useMutation({
    mutationFn: (avisoId: number) => asignacionesAvanzadasAPI.eliminarAviso(avisoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones-por-sede'] });
    }
  });

  const toggleSede = (sedeId: number) => {
    const nuevas = new Set(sedesExpandidas);
    if (nuevas.has(sedeId)) {
      nuevas.delete(sedeId);
    } else {
      nuevas.add(sedeId);
    }
    setSedesExpandidas(nuevas);
  };

  const expandirTodas = () => {
    if (data?.sedes) {
      setSedesExpandidas(new Set(data.sedes.map(s => s.sede_id)));
    }
  };

  const contraerTodas = () => {
    setSedesExpandidas(new Set());
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/operaciones')}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                title="Regresar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Asignaciones Pendientes
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Hoy y pr&oacute;ximos d&iacute;as - {user?.sede_nombre || 'Administrador'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Toggle borradores */}
              <button
                onClick={() => setIncluirBorradores(!incluirBorradores)}
                className={`px-3 py-2 rounded-lg flex items-center gap-2 ${incluirBorradores
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                title={incluirBorradores ? 'Mostrando borradores' : 'Ocultando borradores'}
              >
                {incluirBorradores ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                Borradores
              </button>

              <ThemeToggle />

              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={expandirTodas}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Expandir todas
              </button>

              <button
                onClick={contraerTodas}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Contraer todas
              </button>

              <button
                onClick={() => navigate('/operaciones/configuracion-sedes')}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg"
                title="Configurar colores de sedes"
              >
                <Settings className="w-5 h-5" />
              </button>

              <button
                onClick={logout}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg"
              >
                Cerrar Sesion
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Banner de confirmación de publicación */}
      {banner && (
        <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between gap-4 shadow">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 shrink-0" />
            <span className="font-medium">
              Publicadas en {banner.sedeName}:&nbsp;
              <span className="font-bold">{banner.codigos.join(', ')}</span>
            </span>
          </div>
          <button onClick={() => setBanner(null)} className="p-1 hover:bg-green-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Cargando asignaciones...</div>
        ) : !data?.sedes || data.sedes.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">No hay datos para mostrar</div>
        ) : (
          <div className="space-y-4">
            {data.sedes.map((sede) => (
              <SedeCard
                key={sede.sede_id}
                sede={sede}
                expandida={sedesExpandidas.has(sede.sede_id)}
                onToggle={() => toggleSede(sede.sede_id)}
                asignacionExpandida={asignacionExpandida}
                onExpandAsignacion={setAsignacionExpandida}
                onPublicar={() => abrirModalPublicar(sede)}
                onDespublicar={(turnoId) => despublicarMutation.mutate(turnoId)}
                onAgregarAviso={(asignacionId) => setModalAviso({ visible: true, asignacionId })}
                onEliminarAviso={(avisoId) => eliminarAvisoMutation.mutate(avisoId)}
                publicando={publicarMutation.isPending && (publicarMutation.variables as any)?.turnoId === sede.turno_id}
                puedeEditar={data.permisos?.puedeEditar ?? false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal: Seleccionar unidades a publicar */}
      {modalPublicar.visible && modalPublicar.sede && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Send className="w-5 h-5 text-green-600" />
                  Publicar Asignaciones
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {modalPublicar.sede.sede_nombre} — selecciona las unidades a publicar
                </p>
              </div>
              <button
                onClick={() => setModalPublicar({ visible: false, sede: null, seleccionadas: new Set() })}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {modalPublicar.sede.asignaciones
                .filter(a => a.estado_nomina === 'BORRADOR' || !a.estado_nomina)
                .length === 0 ? (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
                  No hay asignaciones en borrador para publicar
                </p>
              ) : (
                modalPublicar.sede.asignaciones
                  .filter(a => a.estado_nomina === 'BORRADOR' || !a.estado_nomina)
                  .map(asig => (
                    <label
                      key={asig.asignacion_id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                    >
                      <input
                        type="checkbox"
                        checked={modalPublicar.seleccionadas.has(asig.asignacion_id)}
                        onChange={() => toggleSeleccion(asig.asignacion_id)}
                        className="w-4 h-4 accent-green-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {asig.unidad_codigo}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({asig.tipo_unidad})
                          </span>
                        </div>
                        {asig.ruta_nombre && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 inline mr-0.5" />
                            {asig.ruta_nombre}
                            {asig.sentido ? ` (${asig.sentido})` : ''}
                          </p>
                        )}
                      </div>
                    </label>
                  ))
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {modalPublicar.seleccionadas.size} seleccionada(s)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setModalPublicar({ visible: false, sede: null, seleccionadas: new Set() })}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!modalPublicar.sede?.turno_id || modalPublicar.seleccionadas.size === 0) return;
                    publicarMutation.mutate({
                      turnoId: modalPublicar.sede.turno_id,
                      asignacionIds: [...modalPublicar.seleccionadas],
                    });
                  }}
                  disabled={publicarMutation.isPending || modalPublicar.seleccionadas.size === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {publicarMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Publicar ({modalPublicar.seleccionadas.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar Aviso */}
      {modalAviso.visible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Agregar Aviso</h3>
              <button onClick={() => setModalAviso({ visible: false, asignacionId: null })}>
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                <select
                  value={nuevoAviso.tipo}
                  onChange={(e) => setNuevoAviso({ ...nuevoAviso, tipo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="INFO">Informativo</option>
                  <option value="ADVERTENCIA">Advertencia</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensaje</label>
                <textarea
                  value={nuevoAviso.mensaje}
                  onChange={(e) => setNuevoAviso({ ...nuevoAviso, mensaje: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  placeholder="Escribe el aviso..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                <input
                  type="color"
                  value={nuevoAviso.color}
                  onChange={(e) => setNuevoAviso({ ...nuevoAviso, color: e.target.value })}
                  className="w-full h-10 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalAviso({ visible: false, asignacionId: null })}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (modalAviso.asignacionId && nuevoAviso.mensaje) {
                    crearAvisoMutation.mutate({
                      asignacionId: modalAviso.asignacionId,
                      data: nuevoAviso
                    });
                  }
                }}
                disabled={!nuevoAviso.mensaje || crearAvisoMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// COMPONENTE SEDE CARD
// =====================================================

interface SedeCardProps {
  sede: SedeConAsignaciones;
  expandida: boolean;
  onToggle: () => void;
  asignacionExpandida: number | null;
  onExpandAsignacion: (id: number | null) => void;
  onPublicar: () => void;
  onDespublicar: (turnoId: number) => void;
  onAgregarAviso: (asignacionId: number) => void;
  onEliminarAviso: (avisoId: number) => void;
  publicando: boolean;
  puedeEditar: boolean; // Si el usuario puede editar (no es solo lectura)
}

function SedeCard({
  sede,
  expandida,
  onToggle,
  asignacionExpandida,
  onExpandAsignacion,
  onPublicar,
  onDespublicar,
  onAgregarAviso,
  onEliminarAviso,
  publicando,
  puedeEditar
}: SedeCardProps) {
  const fontSizeClass = sede.tamano_fuente === 'small' ? 'text-sm' : sede.tamano_fuente === 'large' ? 'text-lg' : 'text-base';

  return (
    <div
      className="rounded-lg shadow-sm overflow-hidden"
      style={{
        backgroundColor: sede.color_fondo,
        color: sede.color_texto,
        fontFamily: sede.fuente
      }}
    >
      {/* Header de Sede */}
      <div
        className="px-4 py-3 cursor-pointer flex items-center justify-between"
        style={{ backgroundColor: sede.color_fondo_header }}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {expandida ? (
            <ChevronDown className="w-5 h-5" style={{ color: sede.color_acento }} />
          ) : (
            <ChevronRight className="w-5 h-5" style={{ color: sede.color_acento }} />
          )}
          <h2 className={`font-bold ${fontSizeClass}`} style={{ color: sede.color_texto }}>
            {sede.sede_nombre}
          </h2>
          <span className="text-sm opacity-70">({sede.sede_codigo})</span>

          {/* Badge de cantidad */}
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: sede.color_acento }}
          >
            {sede.asignaciones.length} asignaciones
          </span>

          {/* Badge borrador/publicado */}
          {sede.turno_id && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sede.publicado
              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
              }`}>
              {sede.publicado ? 'Publicado' : 'Borrador'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Info del creador */}
          {sede.creado_por_nombre && (
            <span className="text-xs opacity-70">
              Creado por: {sede.creado_por_nombre}
            </span>
          )}

          {/* Botón publicar/despublicar - Solo si puede editar */}
          {sede.turno_id && puedeEditar && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (sede.publicado) {
                  onDespublicar(sede.turno_id!);
                } else {
                  onPublicar();
                }
              }}
              disabled={publicando}
              className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1 ${sede.publicado
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              title={sede.publicado ? 'Volver a borrador' : 'Publicar asignaciones'}
            >
              <Send className="w-3 h-3" />
              {sede.publicado ? 'Despublicar' : 'Publicar'}
            </button>
          )}
        </div>
      </div>

      {/* Contenido expandido */}
      {expandida && (
        <div className="p-4">
          {sede.asignaciones.length === 0 ? (
            <div className="text-center py-6 opacity-60">
              No hay asignaciones para esta sede
            </div>
          ) : (
            <div className="space-y-2">
              {sede.asignaciones.map((asignacion) => (
                <AsignacionRow
                  key={asignacion.asignacion_id}
                  asignacion={asignacion}
                  sede={sede}
                  expandida={asignacionExpandida === asignacion.asignacion_id}
                  onToggle={() => onExpandAsignacion(
                    asignacionExpandida === asignacion.asignacion_id ? null : asignacion.asignacion_id
                  )}
                  onAgregarAviso={() => onAgregarAviso(asignacion.asignacion_id)}
                  onEliminarAviso={onEliminarAviso}
                  puedeEditar={puedeEditar}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================
// COMPONENTE ASIGNACION ROW
// =====================================================

interface AsignacionRowProps {
  asignacion: AsignacionConDetalle;
  sede: SedeConAsignaciones;
  expandida: boolean;
  onToggle: () => void;
  onAgregarAviso: () => void;
  onEliminarAviso: (avisoId: number) => void;
  puedeEditar: boolean; // Si el usuario puede editar (no es solo lectura)
}

function AsignacionRow({
  asignacion,
  sede,
  expandida,
  onToggle,
  onAgregarAviso,
  onEliminarAviso,
  puedeEditar
}: AsignacionRowProps) {
  return (
    <div
      className="rounded-lg border"
      style={{ borderColor: sede.color_acento + '40' }}
    >
      {/* Fila principal (clickeable) */}
      <div
        className="px-4 py-3 cursor-pointer hover:bg-black/5 flex items-center justify-between"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          {expandida ? (
            <ChevronDown className="w-4 h-4 opacity-50" />
          ) : (
            <ChevronRight className="w-4 h-4 opacity-50" />
          )}

          {/* Unidad */}
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4" style={{ color: sede.color_acento }} />
            <span className="font-semibold">{asignacion.unidad_codigo}</span>
            <span className="text-xs opacity-60">({asignacion.tipo_unidad})</span>
          </div>

          {/* Estado */}
          {asignacion.en_ruta && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 text-xs rounded font-medium">
              EN RUTA
            </span>
          )}
          {asignacion.salida_estado === 'FINALIZADA' && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-medium">
              FINALIZADO
            </span>
          )}

          {/* Ruta */}
          {asignacion.ruta_nombre && (
            <div className="flex items-center gap-1 text-sm opacity-70">
              <MapPin className="w-3 h-3" />
              <span>{asignacion.ruta_nombre}</span>
              {asignacion.sentido && (
                <span className="text-xs">({asignacion.sentido})</span>
              )}
            </div>
          )}

          {/* Hora salida */}
          {asignacion.hora_salida && (
            <div className="flex items-center gap-1 text-sm opacity-70">
              <Clock className="w-3 h-3" />
              <span>{asignacion.hora_salida}</span>
            </div>
          )}

          {/* Situación fija */}
          {asignacion.situacion_fija_titulo && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
              {asignacion.situacion_fija_titulo}
            </span>
          )}
        </div>

        {/* Avisos (badges) */}
        <div className="flex items-center gap-2">
          {asignacion.avisos.map((aviso) => (
            <span
              key={aviso.id}
              className="px-2 py-0.5 rounded text-xs font-medium text-white flex items-center gap-1"
              style={{ backgroundColor: aviso.color }}
              title={aviso.mensaje}
            >
              {aviso.tipo === 'URGENTE' && <AlertCircle className="w-3 h-3" />}
              {aviso.tipo === 'ADVERTENCIA' && <AlertTriangle className="w-3 h-3" />}
              {aviso.tipo === 'INFO' && <Info className="w-3 h-3" />}
              {aviso.tipo}
            </span>
          ))}

          {/* Cantidad de tripulación */}
          <span className="flex items-center gap-1 text-sm opacity-70">
            <Users className="w-3 h-3" />
            {asignacion.tripulacion.length}
          </span>
        </div>
      </div>

      {/* Contenido expandido */}
      {expandida && (
        <div className="px-4 py-3 border-t" style={{ borderColor: sede.color_acento + '20' }}>
          {/* Tripulación */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold uppercase opacity-50 mb-2">Tripulacion</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {asignacion.tripulacion.map((t) => (
                <div
                  key={t.usuario_id}
                  className="p-2 rounded bg-white/50 flex items-start justify-between"
                >
                  <div className="flex-1">
                    {/* Orden: Rol, Nombre, Chapa, Teléfono */}
                    <div className="text-xs font-semibold uppercase mb-1" style={{ color: sede.color_acento }}>
                      {t.rol_tripulacion || 'N/A'}
                    </div>
                    <div className="font-medium">{t.nombre_completo || 'N/A'}</div>
                    <div className="text-sm opacity-70 flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        {t.chapa || 'N/A'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {t.telefono || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Alertas de rotación */}
                  {(t.veces_en_ruta && t.veces_en_ruta >= 3) && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 px-1 rounded">
                      {t.veces_en_ruta}x ruta
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Acciones */}
          {(asignacion.acciones || asignacion.acciones_formato) && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold uppercase opacity-50 mb-2">Acciones a Realizar</h4>
              {asignacion.acciones_formato ? (
                <div
                  className="p-2 rounded bg-white/50 text-sm"
                  dangerouslySetInnerHTML={{ __html: asignacion.acciones_formato }}
                />
              ) : (
                <div className="p-2 rounded bg-white/50 text-sm">
                  {asignacion.acciones}
                </div>
              )}
            </div>
          )}

          {/* Avisos detallados */}
          {asignacion.avisos.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold uppercase opacity-50 mb-2">Avisos</h4>
              <div className="space-y-2">
                {asignacion.avisos.map((aviso) => (
                  <div
                    key={aviso.id}
                    className="p-2 rounded flex items-start justify-between"
                    style={{ backgroundColor: aviso.color + '20' }}
                  >
                    <div className="flex items-start gap-2">
                      <span style={{ color: aviso.color }}>
                        {aviso.tipo === 'URGENTE' && <AlertCircle className="w-4 h-4" />}
                        {aviso.tipo === 'ADVERTENCIA' && <AlertTriangle className="w-4 h-4" />}
                        {aviso.tipo === 'INFO' && <Info className="w-4 h-4" />}
                      </span>
                      <div>
                        <div className="text-sm">{aviso.mensaje}</div>
                        <div className="text-xs opacity-60">
                          Por: {aviso.creador_nombre}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEliminarAviso(aviso.id);
                      }}
                      className="p-1 hover:bg-black/10 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botones de acción - Solo si puede editar */}
          {puedeEditar && (
            <div className="flex gap-2 pt-2 border-t" style={{ borderColor: sede.color_acento + '20' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAgregarAviso();
                }}
                className="px-3 py-1 text-xs rounded flex items-center gap-1 hover:bg-black/10"
              >
                <Plus className="w-3 h-3" />
                Agregar Aviso
              </button>
              {/* Solo mostrar editar si no tiene salida activa */}
              {!asignacion.en_ruta && asignacion.salida_estado !== 'EN_SALIDA' && (
                <button
                  className="px-3 py-1 text-xs rounded flex items-center gap-1 hover:bg-black/10"
                >
                  <Edit2 className="w-3 h-3" />
                  Editar Acciones
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
