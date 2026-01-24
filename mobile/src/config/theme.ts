/**
 * Sistema de Theming Centralizado
 * 
 * Este archivo define TODOS los tokens de diseño de la aplicación.
 * Modificar aquí afecta automáticamente a todas las pantallas.
 * 
 * Fecha: 2026-01-22
 * FASE 1 - Sistema de Situaciones
 */

export const APP_THEME = {
    // ============================================
    // COLORES
    // ============================================
    colors: {
        // Principales
        primary: '#2563eb',      // Azul principal
        secondary: '#10b981',    // Verde secundario

        // Feedback
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',

        // Neutrales
        background: '#f9fafb',   // Fondo general
        surface: '#ffffff',      // Tarjetas, modales
        border: '#e5e7eb',       // Bordes

        // Texto
        text: {
            primary: '#111827',
            secondary: '#6b7280',
            disabled: '#9ca3af',
            inverse: '#ffffff',
        },

        // Grises (para uso directo)
        gray: {
            50: '#f9fafb',
            100: '#f3f4f6',
            200: '#e5e7eb',
            300: '#d1d5db',
            400: '#9ca3af',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937',
            900: '#111827',
        },
    },

    // ============================================
    // ESPACIADO
    // ============================================
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 40,
        xxxl: 48,
    },

    // ============================================
    // TIPOGRAFÍA
    // ============================================
    typography: {
        h1: {
            fontSize: 28,
            fontWeight: '700' as const,
            lineHeight: 36,
            letterSpacing: -0.5,
        },
        h2: {
            fontSize: 24,
            fontWeight: '600' as const,
            lineHeight: 32,
            letterSpacing: -0.25,
        },
        h3: {
            fontSize: 20,
            fontWeight: '600' as const,
            lineHeight: 28,
        },
        h4: {
            fontSize: 18,
            fontWeight: '600' as const,
            lineHeight: 24,
        },
        body: {
            fontSize: 16,
            fontWeight: '400' as const,
            lineHeight: 24,
        },
        bodySmall: {
            fontSize: 14,
            fontWeight: '400' as const,
            lineHeight: 20,
        },
        caption: {
            fontSize: 12,
            fontWeight: '400' as const,
            lineHeight: 16,
        },
        button: {
            fontSize: 16,
            fontWeight: '600' as const,
            lineHeight: 20,
        },
    },

    // ============================================
    // BORDER RADIUS
    // ============================================
    borderRadius: {
        none: 0,
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        xxl: 24,
        full: 9999,
    },

    // ============================================
    // SOMBRAS
    // ============================================
    shadows: {
        none: {
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
        },
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 6,
        },
        xl: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 10,
        },
    },

    // ============================================
    // COMPONENTES ESPECÍFICOS
    // ============================================
    components: {
        // Header global
        header: {
            backgroundColor: '#1e40af',
            textColor: '#ffffff',
            height: 60,
            fontSize: 18,
            fontWeight: '600' as const,
            paddingHorizontal: 16,
        },

        // Botones
        button: {
            primary: {
                backgroundColor: '#2563eb',
                textColor: '#ffffff',
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
                fontSize: 16,
                fontWeight: '600' as const,
            },
            secondary: {
                backgroundColor: '#10b981',
                textColor: '#ffffff',
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
                fontSize: 16,
                fontWeight: '600' as const,
            },
            outlined: {
                backgroundColor: 'transparent',
                textColor: '#2563eb',
                borderColor: '#2563eb',
                borderWidth: 1,
                borderRadius: 8,
                paddingVertical: 11,
                paddingHorizontal: 23,
                fontSize: 16,
                fontWeight: '600' as const,
            },
            text: {
                backgroundColor: 'transparent',
                textColor: '#2563eb',
                borderWidth: 0,
                paddingVertical: 8,
                paddingHorizontal: 16,
                fontSize: 16,
                fontWeight: '600' as const,
            },
            danger: {
                backgroundColor: '#ef4444',
                textColor: '#ffffff',
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
                fontSize: 16,
                fontWeight: '600' as const,
            },
        },

        // Inputs
        input: {
            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            fontSize: 16,
            color: '#111827',
            placeholderColor: '#9ca3af',
            focusBorderColor: '#2563eb',
            errorBorderColor: '#ef4444',
            disabledBackgroundColor: '#f3f4f6',
            disabledTextColor: '#9ca3af',
        },

        // Cards
        card: {
            backgroundColor: '#ffffff',
            borderRadius: 12,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#e5e7eb',
        },

        // Tabs
        tabs: {
            backgroundColor: '#ffffff',
            activeColor: '#2563eb',
            inactiveColor: '#6b7280',
            indicatorColor: '#2563eb',
            fontSize: 14,
            fontWeight: '600' as const,
        },

        // Chips/Tags
        chip: {
            backgroundColor: '#e5e7eb',
            textColor: '#374151',
            borderRadius: 16,
            paddingVertical: 6,
            paddingHorizontal: 12,
            fontSize: 14,
        },
    },
} as const;

// ============================================
// TIPOS
// ============================================

export type AppTheme = typeof APP_THEME;
export type ThemeColors = typeof APP_THEME.colors;
export type ThemeSpacing = typeof APP_THEME.spacing;
export type ThemeTypography = typeof APP_THEME.typography;
