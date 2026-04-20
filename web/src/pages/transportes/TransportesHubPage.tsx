import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  Truck, Fuel, ClipboardCheck, CheckSquare, BarChart2,
  LogOut, Building2, User, ChevronRight, ListTodo,
} from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';

interface MenuOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  bgColor: string;
}

export default function TransportesHubPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const menuOptions: MenuOption[] = [
    {
      id: 'unidades',
      title: 'Flota de Unidades',
      description: 'Gestión y control de todas las unidades por sede',
      icon: <Truck className="w-8 h-8" />,
      path: '/transportes/unidades',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:border-blue-800',
    },
    {
      id: 'combustible',
      title: 'Control de Combustible',
      description: 'Supervisión y registro de combustible por unidad',
      icon: <Fuel className="w-8 h-8" />,
      path: '/transportes/combustible',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 hover:bg-amber-100 border-amber-200 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 dark:border-amber-800',
    },
    {
      id: 'inspecciones360',
      title: 'Inspecciones 360°',
      description: 'Revisión, aprobación y edición de formularios 360°',
      icon: <ClipboardCheck className="w-8 h-8" />,
      path: '/transportes/inspecciones360',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 dark:border-purple-800',
    },
    {
      id: 'disponibilidad',
      title: 'Disponibilidad',
      description: 'Autorizar unidades para Operaciones con instrucciones',
      icon: <CheckSquare className="w-8 h-8" />,
      path: '/transportes/disponibilidad',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 hover:bg-green-100 border-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40 dark:border-green-800',
    },
    {
      id: 'asignaciones',
      title: 'Asignación de Unidades',
      description: 'Asignar vehículos a turnos pendientes creados por Operaciones',
      icon: <ListTodo className="w-8 h-8" />,
      path: '/transportes/asignaciones',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 dark:border-orange-800',
    },
    {
      id: 'analytics',
      title: 'Analytics de Flota',
      description: 'Gráficas de salidas, combustible y unidades en taller',
      icon: <BarChart2 className="w-8 h-8" />,
      path: '/transportes/analytics',
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 hover:bg-teal-100 border-teal-200 dark:bg-teal-900/20 dark:hover:bg-teal-900/40 dark:border-teal-800',
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
            {/* Left: logo + title */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Departamento de Transportes
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user?.nombre || 'Usuario'}
                </p>
              </div>
            </div>

            {/* Right: sede badge, theme toggle, logout */}
            <div className="flex items-center gap-3">
              {user?.sede_nombre && (
                <span className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
                  <Building2 className="w-4 h-4" />
                  {user.sede_nombre}
                </span>
              )}
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Cerrar sesion"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:block">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Role badge + greeting */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full mb-3">
            <User className="w-3.5 h-3.5" />
            TRANSPORTES
          </span>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Panel de Control</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gestión de flota, combustible e inspecciones 360°
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">
                {option.title}
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
                {option.description}
              </p>
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickStat label="Rol" value={user?.rol || '-'} />
          <QuickStat label="Sede" value={user?.sede_nombre || 'Global'} />
          <QuickStat label="Usuario" value={user?.username || '-'} />
          <QuickStat label="Módulos" value="5" highlight />
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur border-t border-gray-200 dark:border-gray-700 py-3">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 dark:text-gray-400 text-sm">
          Sistema de Gestión PROVIAL - Departamento de Transportes
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
