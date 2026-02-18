import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: false,

  toggle: () => {
    set((state) => {
      const newDark = !state.isDark;
      if (newDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return { isDark: newDark };
    });
  },

  initTheme: () => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved === 'dark' || (!saved && prefersDark);
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ isDark: dark });
  },
}));
