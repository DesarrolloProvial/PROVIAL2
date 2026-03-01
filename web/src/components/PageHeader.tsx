import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import ThemeToggle from './ThemeToggle';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  showLogout?: boolean;
  showThemeToggle?: boolean;
  children?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  backTo,
  showLogout = true,
  showThemeToggle = true,
  children,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Left side */}
          <div className="flex items-center gap-4">
            {backTo && (
              <button
                onClick={() => navigate(backTo)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Regresar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {children}

            {showThemeToggle && <ThemeToggle />}

            {showLogout && (
              <>
                <span className="hidden sm:block text-sm text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600 pr-3">
                  {user?.nombre || user?.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Cerrar sesion"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Salir</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
