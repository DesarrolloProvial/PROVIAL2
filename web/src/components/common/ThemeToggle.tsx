import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

interface Props {
  className?: string;
}

export default function ThemeToggle({ className = '' }: Props) {
  const { isDark, toggle } = useThemeStore();

  return (
    <button
      onClick={toggle}
      className={`p-2 rounded-lg transition ${
        isDark
          ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      } ${className}`}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
