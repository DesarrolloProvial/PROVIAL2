import { create } from 'zustand';
import type { Usuario, SubRolCop } from '../types';

// Tipos de permisos COP disponibles
export type CopPermission =
  | 'puede_crear_persistentes'
  | 'puede_cerrar_persistentes'
  | 'puede_promover_situaciones'
  | 'puede_asignar_unidades';

interface AuthState {
  user: Usuario | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (user: Usuario, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  initializeAuth: () => void;
  // Helpers para permisos
  hasPermission: (permission: CopPermission) => boolean;
  isCopReadOnly: () => boolean;
  getSubRolCop: () => SubRolCop | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  login: (user, accessToken, refreshToken) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    set({
      user,
      accessToken,
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },

  initializeAuth: () => {
    const userStr = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');

    if (userStr && accessToken) {
      try {
        const user = JSON.parse(userStr);
        set({
          user,
          accessToken,
          isAuthenticated: true,
        });
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        localStorage.clear();
      }
    }
  },

  // Verificar si el usuario tiene un permiso específico del COP
  hasPermission: (permission: CopPermission) => {
    const user = get().user;
    if (!user) return false;

    // ADMIN siempre tiene todos los permisos
    if (user.rol === 'ADMIN') return true;

    // Si no es COP, no tiene permisos COP
    if (user.rol !== 'COP') return false;

    // Verificar sub-rol
    const subRolCop = user.subRolCop;
    if (!subRolCop) return false;

    return subRolCop[permission] === true;
  },

  // Verificar si es un usuario COP de solo lectura
  isCopReadOnly: () => {
    const user = get().user;
    if (!user) return false;
    if (user.rol !== 'COP') return false;
    return user.subRolCop?.solo_lectura === true;
  },

  // Obtener el sub-rol COP del usuario
  getSubRolCop: () => {
    const user = get().user;
    if (!user || user.rol !== 'COP') return null;
    return user.subRolCop || null;
  },
}));
