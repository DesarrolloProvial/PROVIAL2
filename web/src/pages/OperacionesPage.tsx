import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { operacionesService } from '../services/operaciones.service';
import { turnosService } from '../services/turnos.service';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, LogOut, Lock } from 'lucide-react';
import CambiarPasswordModal from '../components/CambiarPasswordModal';
import DashboardView from '../components/operaciones/DashboardView';
import BrigadasView from '../components/operaciones/BrigadasView';
import UnidadesView from '../components/operaciones/UnidadesView';

export default function OperacionesPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [vistaActual, setVistaActual] = useState<'dashboard' | 'brigadas' | 'unidades'>('dashboard');
  const [showCambiarPassword, setShowCambiarPassword] = useState(false);

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
                onClick={() => setShowCambiarPassword(true)}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Cambiar contraseña"
              >
                <Lock className="w-5 h-5" />
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

      <CambiarPasswordModal
        isOpen={showCambiarPassword}
        onClose={() => setShowCambiarPassword(false)}
      />
    </div>
  );
}

