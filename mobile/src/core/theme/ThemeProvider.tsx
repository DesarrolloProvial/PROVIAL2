/**
 * ThemeProvider y useTheme Hook
 * 
 * Proveedor de contexto para el sistema de theming.
 * Permite acceder al tema desde cualquier componente.
 * 
 * Uso:
 * const theme = useTheme();
 * <View style={{ backgroundColor: theme.colors.primary }} />
 * 
 * Fecha: 2026-01-22
 * FASE 1 - Sistema de Situaciones
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { APP_THEME, AppTheme } from '../../config/theme';

// Crear contexto
const ThemeContext = createContext<AppTheme | null>(null);

// Props del provider
interface ThemeProviderProps {
    children: ReactNode;
    theme?: AppTheme; // Permite override del tema (para testing o multi-theme futuro)
}

/**
 * ThemeProvider
 * 
 * Wrapper que provee el tema a toda la aplicación.
 * Debe envolver la app en el punto más alto posible.
 */
export function ThemeProvider({ children, theme = APP_THEME }: ThemeProviderProps) {
    return (
        <ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>
    );
}

/**
 * useTheme Hook
 * 
 * Hook para acceder al tema actual desde cualquier componente.
 * 
 * @throws Error si se usa fuera de ThemeProvider
 * @returns AppTheme - Objeto con todos los tokens de diseño
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *     const theme = useTheme();
 *     
 *     return (
 *         <View style={{
 *             backgroundColor: theme.colors.surface,
 *             padding: theme.spacing.md,
 *             borderRadius: theme.borderRadius.md,
 *             ...theme.shadows.md
 *         }}>
 *             <Text style={theme.typography.h2}>
 *                 Título
 *             </Text>
 *         </View>
 *     );
 * }
 * ```
 */
export function useTheme(): AppTheme {
    const theme = useContext(ThemeContext);

    if (!theme) {
        throw new Error(
            'useTheme must be used within ThemeProvider. ' +
            'Wrap your app with <ThemeProvider> in App.tsx or navigation root.'
        );
    }

    return theme;
}

/**
 * Utility: Crear estilos tipados con acceso al tema
 * 
 * Helper para crear StyleSheet con tipos correctos y acceso al tema.
 * 
 * @example
 * ```tsx
 * const styles = createThemedStyles((theme) => ({
 *     container: {
 *         flex: 1,
 *         backgroundColor: theme.colors.background,
 *         padding: theme.spacing.md,
 *     },
 *     title: {
 *         ...theme.typography.h1,
 *         color: theme.colors.text.primary,
 *     },
 * }));
 * ```
 */
export function createThemedStyles<T extends Record<string, any>>(
    stylesFn: (theme: AppTheme) => T
): (theme: AppTheme) => T {
    return stylesFn;
}
