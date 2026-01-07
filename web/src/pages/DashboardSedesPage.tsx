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
} from '../services/asignacionesAvanzadas.service';
import { useAuthStore } from '../store/authStore';
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

export default function DashboardSedesPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [sedesExpandidas, setSedesExpandidas] = useState<Set<number>>(new Set());
  const [asignacionExpandida, setAsignacionExpandida] = useState<number | null>(null);
  const [incluirBorradores, setIncluirBorradores] = useState(true);

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
    mutationFn: (turnoId: number) => asignacionesAvanzadasAPI.publicarTurno(turnoId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones-por-sede'] });
      toast.success(data.data.message || 'Nómina publicada exitosamente');
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error || 'Error al publicar nómina';
      toast.error(errorMsg);
    }
  });

  const despublicarMutation = useMutation({
    mutationFn: (turnoId: number) => asignacionesAvanzadasAPI.despublicarTurno(turnoId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones-por-sede'] });
      toast.success(data.data.message || 'Nómina despublicada exitosamente');
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error || 'Error al despublicar nómina';
      toast.error(errorMsg);
    }
  });

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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/operaciones')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Regresar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Asignaciones Pendientes
                </h1>
                <p className="text-sm text-gray-500 mt-1">
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
                  : 'bg-gray-100 text-gray-600'
                  }`}
                title={incluirBorradores ? 'Mostrando borradores' : 'Ocultando borradores'}
              >
                {incluirBorradores ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                Borradores
              </button>

              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={expandirTodas}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Expandir todas
              </button>

              <button
                onClick={contraerTodas}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Contraer todas
              </button>

              <button
                onClick={() => navigate('/operaciones/configuracion-sedes')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                title="Configurar colores de sedes"
              >
                <Settings className="w-5 h-5" />
              </button>

              <button
                onClick={logout}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cerrar Sesion
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Cargando asignaciones...</div>
        ) : !data?.sedes || data.sedes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No hay datos para mostrar</div>
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
                onPublicar={(turnoId) => publicarMutation.mutate(turnoId)}
                onDespublicar={(turnoId) => despublicarMutation.mutate(turnoId)}
                onAgregarAviso={(asignacionId) => setModalAviso({ visible: true, asignacionId })}
                onEliminarAviso={(avisoId) => eliminarAvisoMutation.mutate(avisoId)}
                publicando={publicarMutation.isPending}
                puedeEditar={data.permisos?.puedeEditar ?? false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal Agregar Aviso */}
      {modalAviso.visible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Agregar Aviso</h3>
              <button onClick={() => setModalAviso({ visible: false, asignacionId: null })}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={nuevoAviso.tipo}
                  onChange={(e) => setNuevoAviso({ ...nuevoAviso, tipo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="INFO">Informativo</option>
                  <option value="ADVERTENCIA">Advertencia</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                <textarea
                  value={nuevoAviso.mensaje}
                  onChange={(e) => setNuevoAviso({ ...nuevoAviso, mensaje: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Escribe el aviso..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
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
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
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
  onPublicar: (turnoId: number) => void;
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
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
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
                  onPublicar(sede.turno_id!);
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
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">
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
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-1 rounded">
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
