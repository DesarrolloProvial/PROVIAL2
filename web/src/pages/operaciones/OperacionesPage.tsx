import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { operacionesService } from '../../services/operaciones/operaciones.service';
import { turnosService } from '../../services/common/turnos.service';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, LogOut, Lock } from 'lucide-react';
import CambiarPasswordModal from '../../components/common/CambiarPasswordModal';
import DashboardView from '../../components/operaciones/DashboardView';
import BrigadasView from '../../components/operaciones/BrigadasView';
import ThemeToggle from '../../components/common/ThemeToggle';

export default function OperacionesPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [vistaActual, setVistaActual] = useState<'dashboard' | 'brigadas'>('dashboard');
  const [showCambiarPassword, setShowCambiarPassword] = useState(false);

  // Solo ENCARGADO_NOMINAS Central o ADMIN puede ver el panel de admin
  const esAdminCentral = (user?.rol === 'ENCARGADO_NOMINAS' && user?.puede_ver_todas_sedes) || user?.rol === 'ADMIN';

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

  const {
    data: brigadas = [],
    isLoading: loadingBrigadas,
    refetch: refetchBrigadas,
  } = useQuery({
    queryKey: ['estadisticas-brigadas'],
    queryFn: () => operacionesService.getEstadisticasBrigadas(),
    enabled: vistaActual === 'brigadas',
  });

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

  const isLoading = loadingDashboard || loadingBrigadas || loadingTurnoHoy;

  const handleRefresh = () => {
    if (vistaActual === 'dashboard') {
      refetchDashboard();
      refetchTurnoHoy();
    }
    if (vistaActual === 'brigadas') refetchBrigadas();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 dark:bg-gray-800 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">Operaciones</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.nombre || user?.username} — {user?.sede_nombre || 'Todas las sedes'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
                title="Actualizar"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <ThemeToggle />
              <button
                onClick={() => setShowCambiarPassword(true)}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/30"
                title="Cambiar contraseña"
              >
                <Lock className="w-5 h-5" />
              </button>
              <button
                onClick={() => { logout(); }}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/30"
                title="Cerrar sesion"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navegación */}
          <div className="flex gap-1 pb-2 overflow-x-auto">
            <button
              onClick={() => setVistaActual('dashboard')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${vistaActual === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setVistaActual('brigadas')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${vistaActual === 'brigadas'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
            >
              Brigadas
            </button>
            <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
            <button
              onClick={() => navigate('/operaciones/crear-asignacion')}
              className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap bg-green-600 text-white hover:bg-green-700"
            >
              + Asignacion
            </button>
            <button
              onClick={() => navigate('/operaciones/brigadas')}
              className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Gest. Brigadas
            </button>
            {esAdminCentral && (
              <button
                onClick={() => navigate('/operaciones/dashboard-sedes')}
                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Sedes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {errorDashboard && vistaActual === 'dashboard' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 dark:text-red-400" />
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-300">Error al cargar datos</h3>
                <p className="text-sm text-red-600 mt-1 dark:text-red-400">No se pudieron obtener los datos del dashboard.</p>
                <button onClick={() => refetchDashboard()} className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition">
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
      </div>

      <CambiarPasswordModal
        isOpen={showCambiarPassword}
        onClose={() => setShowCambiarPassword(false)}
      />
    </div>
  );
}
