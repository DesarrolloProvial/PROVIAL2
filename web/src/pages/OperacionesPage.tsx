import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { operacionesService } from '../services/operaciones.service';
import { turnosService } from '../services/turnos.service';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Truck,
  AlertTriangle,
  Fuel,
  Calendar,
  RefreshCw,
  CheckCircle,
  MapPin,
  Clock,
  Edit2,
  Trash2,
  LogOut,
  FileText,
  Eye,
} from 'lucide-react';
import Inspeccion360Historial from '../components/Inspeccion360Historial';

export default function OperacionesPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [vistaActual, setVistaActual] = useState<'dashboard' | 'brigadas' | 'unidades'>('dashboard');

  // Solo ENCARGADO_NOMINAS Central o ADMIN puede ver el panel de admin
  const esAdminCentral = (user?.rol === 'ENCARGADO_NOMINAS' && user?.puede_ver_todas_sedes) || user?.rol === 'ADMIN';

  // Obtener datos del dashboard
  const {
    data: dashboardData,
    isLoading: loadingDashboard,
    isError: errorDashboard,
    refetch: refetchDashboard
  } = useQuery({
    queryKey: ['operaciones-dashboard'],
    queryFn: () => operacionesService.getDashboard(),
    refetchInterval: 60000,
    retry: 2,
  });

  // Obtener estadísticas de brigadas
  const {
    data: brigadas = [],
    isLoading: loadingBrigadas,
    refetch: refetchBrigadas,
  } = useQuery({
    queryKey: ['estadisticas-brigadas'],
    queryFn: () => operacionesService.getEstadisticasBrigadas(),
    enabled: vistaActual === 'brigadas',
  });

  // Obtener estadísticas de unidades
  const {
    data: unidades = [],
    isLoading: loadingUnidades,
    refetch: refetchUnidades,
  } = useQuery({
    queryKey: ['estadisticas-unidades'],
    queryFn: () => operacionesService.getEstadisticasUnidades(),
    enabled: vistaActual === 'unidades',
  });

  // Obtener turno de hoy con asignaciones
  const {
    data: turnoHoy,
    isLoading: loadingTurnoHoy,
    refetch: refetchTurnoHoy,
  } = useQuery({
    queryKey: ['turno-hoy'],
    queryFn: () => turnosService.getTurnoHoy(),
    enabled: vistaActual === 'dashboard',
    retry: false,
  });

  const isLoading = loadingDashboard || loadingBrigadas || loadingUnidades || loadingTurnoHoy;

  const handleRefresh = () => {
    if (vistaActual === 'dashboard') {
      refetchDashboard();
      refetchTurnoHoy();
    }
    if (vistaActual === 'brigadas') refetchBrigadas();
    if (vistaActual === 'unidades') refetchUnidades();
  };

  const handleCrearAsignacion = () => {
    navigate('/operaciones/crear-asignacion');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header limpio */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            {/* Título + Usuario */}
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                  Operaciones
                </h1>
                <p className="text-xs text-gray-500">
                  {user?.nombre || user?.username} - {user?.sede_nombre || 'Todas las sedes'}
                </p>
              </div>
            </div>

            {/* Acciones - Solo 2 botones */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Actualizar"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => { logout(); }}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Cerrar sesion"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navegacion horizontal con scroll */}
          <div className="flex gap-1 pb-2 overflow-x-auto">
            <button
              onClick={() => setVistaActual('dashboard')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${vistaActual === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setVistaActual('brigadas')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${vistaActual === 'brigadas'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Brigadas
            </button>
            <button
              onClick={() => setVistaActual('unidades')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${vistaActual === 'unidades'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Unidades
            </button>
            <div className="w-px bg-gray-300 mx-1" />
            <button
              onClick={handleCrearAsignacion}
              className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap bg-green-600 text-white hover:bg-green-700"
            >
              + Asignacion
            </button>

            <button
              onClick={() => navigate('/operaciones/brigadas')}
              className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap text-gray-600 hover:bg-gray-100"
            >
              Gest. Brigadas
            </button>
            <button
              onClick={() => navigate('/operaciones/unidades')}
              className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap text-gray-600 hover:bg-gray-100"
            >
              Gest. Unidades
            </button>
            {/* Sedes - Solo visible para usuarios con puede_ver_todas_sedes o ADMIN */}
            {esAdminCentral && (
              <button
                onClick={() => navigate('/operaciones/dashboard-sedes')}
                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap text-gray-600 hover:bg-gray-100"
              >
                Sedes
              </button>
            )}

          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Banner */}
        {errorDashboard && vistaActual === 'dashboard' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800">Error al cargar datos</h3>
                <p className="text-sm text-red-600 mt-1">
                  No se pudieron obtener los datos del dashboard. Verifica tu conexión.
                </p>
                <button
                  onClick={() => refetchDashboard()}
                  className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        )}

        {vistaActual === 'dashboard' && dashboardData && (
          <DashboardView data={dashboardData} turnoHoy={turnoHoy} />
        )}
        {vistaActual === 'brigadas' && (
          <BrigadasView brigadas={brigadas} isLoading={loadingBrigadas} />
        )}
        {vistaActual === 'unidades' && (
          <UnidadesView unidades={unidades} isLoading={loadingUnidades} />
        )}
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD VIEW
// ============================================

function DashboardView({ data, turnoHoy }: { data: any; turnoHoy?: any }) {
  const resumen = data.resumen;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Mutation para eliminar asignación
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
      // Si hay salida activa, ofrecer forzar eliminación
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
    // La vista usa asignacion_id, no id
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
    // La vista usa asignacion_id, no id - normalizar
    const asignacionConId = {
      ...asignacion,
      id: asignacion.asignacion_id || asignacion.id
    };
    navigate('/operaciones/crear-asignacion', {
      state: { editMode: true, asignacion: asignacionConId, turnoId: turnoHoy?.turno?.id }
    });
  };

  return (
    <div className="space-y-6">
      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Brigadas Activas */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Brigadas Activas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {resumen.total_brigadas_activas}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {resumen.brigadas_en_turno_hoy} en turno hoy
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Brigadas Disponibles */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Brigadas Disponibles</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {resumen.brigadas_disponibles_hoy}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Para asignar hoy
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Unidades Activas */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unidades Activas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {resumen.total_unidades_activas}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {resumen.unidades_en_turno_hoy} en turno hoy
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Truck className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Unidades Disponibles */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unidades Disponibles</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {resumen.unidades_disponibles_hoy}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Listas para salir
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brigadas que necesitan descanso */}
        {data.brigadas_necesitan_descanso > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900">
                  Brigadas Necesitan Descanso
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {data.brigadas_necesitan_descanso} brigadas salieron recientemente
                </p>
                {data.alertas.brigadasDescanso.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {data.alertas.brigadasDescanso.map((b: any) => (
                      <li key={b.usuario_id} className="text-sm">
                        <span className="font-medium">{b.nombre_completo}</span>
                        <span className="text-gray-600"> ({b.chapa})</span>
                        <span className="text-yellow-600"> - Último turno hace {b.dias_desde_ultimo_turno} días</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Unidades con bajo combustible */}
        {data.unidades_bajo_combustible > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Fuel className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">
                  Unidades con Bajo Combustible
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  {data.unidades_bajo_combustible} unidades tienen menos de 20L
                </p>
                {data.alertas.unidadesCombustible.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {data.alertas.unidadesCombustible.map((u: any) => (
                      <li key={u.unidad_id} className="text-sm">
                        <span className="font-medium">{u.unidad_codigo}</span>
                        <span className="text-red-600"> - {u.combustible_actual != null ? Number(u.combustible_actual).toFixed(1) : '0.0'}L</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Asignaciones del Día */}
      {turnoHoy && turnoHoy.asignaciones && turnoHoy.asignaciones.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Asignaciones Activas
                </h2>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {turnoHoy.asignaciones.length} {turnoHoy.asignaciones.length === 1 ? 'unidad' : 'unidades'}
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {turnoHoy.asignaciones.map((asignacion: any) => (
                <div key={asignacion.asignacion_id || asignacion.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-900">{asignacion.unidad_codigo}</span>
                      {asignacion.en_ruta && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                          EN RUTA
                        </span>
                      )}
                      {asignacion.salida_estado === 'FINALIZADA' && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                          FINALIZADO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {asignacion.hora_salida && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          {asignacion.hora_salida}
                        </div>
                      )}
                      {/* Botones de editar/eliminar solo si NO ha salido */}
                      {!asignacion.hora_salida_real && (
                        <>
                          <button
                            onClick={() => handleEdit(asignacion)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Editar asignación"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(asignacion)}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Eliminar asignación"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {/* Indicador de que ya salió */}
                      {asignacion.hora_salida_real && (
                        <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                          En ruta
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ruta */}
                  {asignacion.ruta_nombre && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>{asignacion.ruta_nombre}</span>
                      {asignacion.sentido && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                          {asignacion.sentido}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Tripulación */}
                  {asignacion.tripulacion && asignacion.tripulacion.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-2">TRIPULACIÓN:</p>
                      <div className="space-y-1">
                        {asignacion.tripulacion.map((t: any) => (
                          <div key={t.usuario_id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Users className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-900">{t.nombre_completo}</span>
                              <span className="text-gray-500">({t.chapa})</span>
                            </div>
                            <span className="text-xs text-gray-500 font-medium">{t.rol_tripulacion}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  {asignacion.acciones && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600">{asignacion.acciones}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sin asignaciones */}
      {(!turnoHoy || !turnoHoy.asignaciones || turnoHoy.asignaciones.length === 0) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-gray-400" />
            <div>
              <h3 className="font-semibold text-gray-700">Sin Asignaciones</h3>
              <p className="text-sm text-gray-500 mt-1">
                No hay asignaciones para el día de hoy. Crea una asignación para comenzar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estado Actual */}
      {data.brigadas_necesitan_descanso === 0 && data.unidades_bajo_combustible === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">Todo en Orden</h3>
              <p className="text-sm text-green-700 mt-1">
                No hay alertas actualmente. Todos los recursos están disponibles.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// BRIGADAS VIEW
// ============================================

function BrigadasView({ brigadas, isLoading }: { brigadas: any[]; isLoading: boolean }) {
  const [searchTerm, setSearchTerm] = useState('');

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Cargando brigadas...</div>;
  }

  const filteredBrigadas = brigadas.filter(b =>
    b.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.chapa.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <input
          type="text"
          placeholder="Buscar brigada..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brigada
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Turnos (30d)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Último Turno
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol Frecuente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBrigadas.map((brigada) => (
                <tr key={brigada.usuario_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {brigada.nombre_completo}
                    </div>
                    <div className="text-sm text-gray-500">
                      {brigada.chapa} • {brigada.sede_nombre}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {brigada.telefono || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{brigada.turnos_ultimo_mes}</div>
                    <div className="text-xs text-gray-500">
                      {brigada.turnos_ultimo_trimestre} en 90d
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {brigada.ultimo_turno_fecha ? (
                      <>
                        <div className="text-gray-900">
                          {new Date(brigada.ultimo_turno_fecha).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          Hace {brigada.dias_desde_ultimo_turno} días
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-400">Sin turnos</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {brigada.rol_tripulacion_frecuente || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {brigada.activo ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Activo
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Inactivo
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================
// UNIDADES VIEW
// ============================================

function UnidadesView({ unidades, isLoading }: { unidades: any[]; isLoading: boolean }) {
  const [modalInspeccion, setModalInspeccion] = useState<{ id: number; codigo: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canViewBitacora = user?.rol === 'ADMIN' || user?.rol === 'SUPER_ADMIN';

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Cargando unidades...</div>;
  }

  const filteredUnidades = unidades.filter(u =>
    u.unidad_codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.marca && u.marca.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <input
            type="text"
            placeholder="Buscar unidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Combustible
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Odómetro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Turnos (30d)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último Uso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUnidades.map((unidad) => (
                  <tr key={unidad.unidad_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {unidad.unidad_codigo}
                      </div>
                      <div className="text-sm text-gray-500">
                        {unidad.marca} {unidad.modelo}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {unidad.tipo_unidad}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {unidad.combustible_actual != null ? Number(unidad.combustible_actual).toFixed(1) : '0.0'}L
                      </div>
                      {unidad.capacidad_combustible && (
                        <div className="text-xs text-gray-500">
                          de {unidad.capacidad_combustible}L
                        </div>
                      )}
                      {unidad.combustible_actual < 20 && (
                        <span className="text-xs text-red-600">⚠️ Bajo</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {unidad.odometro_actual != null ? unidad.odometro_actual.toLocaleString() : '0'} km
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{unidad.turnos_ultimo_mes}</div>
                      <div className="text-xs text-gray-500">
                        {unidad.km_ultimo_mes ? `${unidad.km_ultimo_mes.toFixed(0)} km` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {unidad.ultimo_turno_fecha ? (
                        <>
                          <div className="text-gray-900">
                            {new Date(unidad.ultimo_turno_fecha).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            Hace {unidad.dias_desde_ultimo_uso} días
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400">Sin uso</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {unidad.activa ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Activa
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Inactiva
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setModalInspeccion({ id: unidad.unidad_id, codigo: unidad.unidad_codigo })}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                          title="Ver Inspecciones 360"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {canViewBitacora && (
                          <button
                            onClick={() => navigate(`/bitacora/${unidad.unidad_id}`)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Ver Bitacora"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Inspecciones 360 */}
        {modalInspeccion && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Inspecciones 360 - {modalInspeccion.codigo}
                  </h2>
                </div>
                <button
                  onClick={() => setModalInspeccion(null)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <span className="text-xl">&times;</span>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                <Inspeccion360Historial unidadId={modalInspeccion.id} dias={30} limite={20} autoOpen />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
