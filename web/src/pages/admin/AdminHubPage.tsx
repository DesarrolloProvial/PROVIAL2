import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  Users, Truck, Shield, Map, Table, Settings,
  LogOut, ChevronRight, FileSpreadsheet, BarChart3, Smartphone,
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

interface MenuOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  bgColor: string;
}

export default function AdminHubPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const menuOptions: MenuOption[] = [
    {
      id: 'brigadas',
      title: 'Gestion de Brigadas',
      description: 'Administrar usuarios, roles, grupos, sedes y accesos',
      icon: <Users className="w-8 h-8" />,
      path: '/admin/brigadas',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:border-blue-800',
    },
    {
      id: 'unidades',
      title: 'Gestion de Unidades',
      description: 'Crear, editar y asignar unidades y tripulacion',
      icon: <Truck className="w-8 h-8" />,
      path: '/admin/unidades',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 hover:bg-green-100 border-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40 dark:border-green-800',
    },
    {
      id: 'acceso',
      title: 'Control de Acceso',
      description: 'Gestionar acceso a la app por usuario y grupo',
      icon: <Shield className="w-8 h-8" />,
      path: '/admin/acceso',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 dark:border-purple-800',
    },
    {
      id: 'dispositivos',
      title: 'Dispositivos Móviles',
      description: 'Aprobar, bloquear y auditar teléfonos institucionales',
      icon: <Smartphone className="w-8 h-8" />,
      path: '/admin/dispositivos',
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 dark:bg-cyan-900/20 dark:hover:bg-cyan-900/40 dark:border-cyan-800',
    },
    {
      id: 'cop-mapa',
      title: 'COP - Mapa',
      description: 'Vista de mapa en tiempo real con todas las unidades',
      icon: <Map className="w-8 h-8" />,
      path: '/cop/mapa',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 hover:bg-red-100 border-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:border-red-800',
    },
    {
      id: 'cop-situaciones',
      title: 'COP - Situaciones',
      description: 'Tabla de situaciones activas y filtros avanzados',
      icon: <Table className="w-8 h-8" />,
      path: '/cop/situaciones',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 dark:border-orange-800',
    },
    {
      id: 'import-excel',
      title: 'Importar Excel',
      description: 'Importar datos historicos de accidentologia desde archivos Excel',
      icon: <FileSpreadsheet className="w-8 h-8" />,
      path: '/super-admin/import-excel',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:border-emerald-800',
    },
    {
      id: 'estadisticas',
      title: 'Estadisticas y Accidentologia',
      description: 'Graficos, indicadores y analisis de datos de accidentologia',
      icon: <BarChart3 className="w-8 h-8" />,
      path: '/estadisticas',
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 dark:bg-cyan-900/20 dark:hover:bg-cyan-900/40 dark:border-cyan-800',
    },
    {
      id: 'config',
      title: 'Configuracion Sistema',
      description: 'Usuarios, grupos, encargados, auditoria y mas',
      icon: <Settings className="w-8 h-8" />,
      path: '/admin',
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 hover:bg-gray-100 border-gray-200 dark:bg-gray-700/50 dark:hover:bg-gray-700 dark:border-gray-600',
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Panel de Administracion</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Bienvenido, {user?.nombre || 'Administrador'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-gray-800 dark:text-gray-200 font-medium">{user?.rol}</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{user?.sede_nombre || 'Todas las sedes'}</p>
              </div>
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                title="Cerrar sesion"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Menu Grid */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => navigate(option.path)}
              className={`p-6 rounded-xl border-2 ${option.bgColor} transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg text-left group`}
            >
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm ${option.color}`}>
                  {option.icon}
                </div>
                <ChevronRight className={`w-5 h-5 ${option.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </div>
              <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">
                {option.title}
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
                {option.description}
              </p>
            </button>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickStat label="Rol" value={user?.rol || '-'} />
          <QuickStat label="Sede" value={user?.sede_nombre || 'Global'} />
          <QuickStat label="Usuario" value={user?.username || '-'} />
          <QuickStat label="Acceso" value="Completo" highlight />
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur border-t border-gray-200 dark:border-gray-700 py-3">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 dark:text-gray-400 text-sm">
          Sistema de Gestion PROVIAL - Panel de Administracion
        </div>
      </footer>
    </div>
  );
}

function QuickStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
      <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">{label}</p>
      <p className={`mt-1 font-bold ${highlight ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </p>
    </div>
  );
}
