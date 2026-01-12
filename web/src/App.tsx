import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OperacionesPage from './pages/OperacionesPage';
import CrearAsignacionPage from './pages/CrearAsignacionPage';
import GeneradorTurnosPage from './pages/GeneradorTurnosPage';
import BrigadasPage from './pages/BrigadasPage';
import UnidadesPage from './pages/UnidadesPage';
import BitacoraPage from './pages/BitacoraPage';
import EventosPage from './pages/EventosPage';
import GaleriaMultimediaPage from './pages/GaleriaMultimediaPage';
import DashboardSedesPage from './pages/DashboardSedesPage';
import ConfiguracionSedesPage from './pages/ConfiguracionSedesPage';
import SituacionesFijasPage from './pages/SituacionesFijasPage';
import AdminPanelPage from './pages/AdminPanelPage';
import MovimientosBrigadasPage from './pages/MovimientosBrigadasPage';
import SituacionesPersistentesPage from './pages/SituacionesPersistentesPage';
import SuperAdminPage from './pages/SuperAdminPage';
import GestionBrigadasPage from './pages/GestionBrigadasPage';
import GestionUnidadesPage from './pages/GestionUnidadesPage';
import ControlAccesoPage from './pages/ControlAccesoPage';
import COPMapaPage from './pages/COPMapaPage';
import COPSituacionesPage from './pages/COPSituacionesPage';
import AdminHubPage from './pages/AdminHubPage';
import DashboardEjecutivoPage from './pages/DashboardEjecutivoPage';

// Crear QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Componente para rutas protegidas
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Componente para rutas de Operaciones (OPERACIONES, ADMIN, SUPER_ADMIN y ENCARGADO_NOMINAS)
function OperacionesRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // ENCARGADO_NOMINAS puede acceder en modo lectura
  if (user?.rol !== 'OPERACIONES' && user?.rol !== 'ADMIN' && user?.rol !== 'SUPER_ADMIN' && user?.rol !== 'ENCARGADO_NOMINAS') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Componente para rutas de COP (COP, BRIGADA con sub_rol_cop OPERADOR, ADMIN, SUPER_ADMIN)
function COPRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Permitir acceso a: COP, ADMIN, SUPER_ADMIN, o BRIGADA con sub_rol_cop
  const hasAccess =
    user?.rol === 'COP' ||
    user?.rol === 'ADMIN' ||
    user?.rol === 'SUPER_ADMIN' ||
    (user?.rol === 'BRIGADA' && (user as any)?.subRolCop?.codigo);

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Componente para rutas de Super Admin (SUPER_ADMIN y ADMIN)
function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.rol !== 'SUPER_ADMIN' && user?.rol !== 'ADMIN') {
    return <Navigate to="/operaciones" replace />;
  }

  return <>{children}</>;
}

// Componente de redirección inteligente según rol
function RoleBasedRedirect() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Super Admin va directamente a su panel
  if (user?.rol === 'SUPER_ADMIN') {
    return <Navigate to="/super-admin" replace />;
  }

  // Usuarios de Operaciones y Encargado de Nóminas van a su módulo
  if (user?.rol === 'OPERACIONES' || user?.rol === 'ENCARGADO_NOMINAS') {
    return <Navigate to="/operaciones" replace />;
  }

  // Admin puede elegir, por defecto va al Dashboard COP
  if (user?.rol === 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  // Mandos van al Dashboard Ejecutivo
  if (user?.rol === 'MANDOS') {
    return <Navigate to="/dashboard-ejecutivo" replace />;
  }

  // Accidentología y Comunicación Social van al dashboard ejecutivo por ahora
  if (user?.rol === 'ACCIDENTOLOGIA' || user?.rol === 'COMUNICACION_SOCIAL') {
    return <Navigate to="/dashboard-ejecutivo" replace />;
  }

  // COP va al dashboard de monitoreo
  if (user?.rol === 'COP') {
    return <Navigate to="/dashboard" replace />;
  }

  // Brigadas no deberían acceder al panel web normalmente
  if (user?.rol === 'BRIGADA') {
    return <Navigate to="/dashboard" replace />;
  }

  // Todos los demás van al Dashboard COP
  return <Navigate to="/dashboard" replace />;
}

function App() {
  const { initializeAuth } = useAuthStore();

  // Inicializar autenticación desde localStorage
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bitacora/:unidadId"
            element={
              <ProtectedRoute>
                <BitacoraPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/eventos"
            element={
              <ProtectedRoute>
                <EventosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/galeria"
            element={
              <ProtectedRoute>
                <GaleriaMultimediaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/movimientos-brigadas"
            element={
              <ProtectedRoute>
                <MovimientosBrigadasPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/situaciones-persistentes"
            element={
              <ProtectedRoute>
                <SituacionesPersistentesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operaciones"
            element={
              <OperacionesRoute>
                <OperacionesPage />
              </OperacionesRoute>
            }
          />
          <Route
            path="/operaciones/crear-asignacion"
            element={
              <OperacionesRoute>
                <CrearAsignacionPage />
              </OperacionesRoute>
            }
          />
          <Route
            path="/operaciones/generador"
            element={
              <OperacionesRoute>
                <GeneradorTurnosPage />
              </OperacionesRoute>
            }
          />
          <Route
            path="/operaciones/brigadas"
            element={
              <OperacionesRoute>
                <BrigadasPage />
              </OperacionesRoute>
            }
          />
          <Route
            path="/operaciones/unidades"
            element={
              <OperacionesRoute>
                <UnidadesPage />
              </OperacionesRoute>
            }
          />
          <Route
            path="/operaciones/dashboard-sedes"
            element={
              <OperacionesRoute>
                <DashboardSedesPage />
              </OperacionesRoute>
            }
          />
          <Route
            path="/operaciones/configuracion-sedes"
            element={
              <OperacionesRoute>
                <ConfiguracionSedesPage />
              </OperacionesRoute>
            }
          />
          <Route
            path="/operaciones/situaciones-fijas"
            element={
              <OperacionesRoute>
                <SituacionesFijasPage />
              </OperacionesRoute>
            }
          />
          <Route
            path="/operaciones/admin"
            element={
              <OperacionesRoute>
                <AdminPanelPage />
              </OperacionesRoute>
            }
          />
          <Route
            path="/super-admin"
            element={
              <SuperAdminRoute>
                <AdminHubPage />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <SuperAdminRoute>
                <SuperAdminPage />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/admin/brigadas"
            element={
              <SuperAdminRoute>
                <GestionBrigadasPage />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/admin/unidades"
            element={
              <SuperAdminRoute>
                <GestionUnidadesPage />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/admin/acceso"
            element={
              <SuperAdminRoute>
                <ControlAccesoPage />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/cop/mapa"
            element={
              <COPRoute>
                <COPMapaPage />
              </COPRoute>
            }
          />
          <Route
            path="/cop/situaciones"
            element={
              <COPRoute>
                <COPSituacionesPage />
              </COPRoute>
            }
          />
          <Route
            path="/dashboard-ejecutivo"
            element={
              <ProtectedRoute>
                <DashboardEjecutivoPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<RoleBasedRedirect />} />
          <Route path="*" element={<RoleBasedRedirect />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
