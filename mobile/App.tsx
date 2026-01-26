import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import { TestModeProvider } from './src/context/TestModeContext';
import { ThemeProvider } from './src/core/theme';
import { syncCatalogosAuxiliares } from './src/services/catalogSync';
import { catalogoStorage } from './src/core/storage/catalogoStorage';

// Crear instancia de QueryClient para React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutos
    },
  },
});

export default function App() {
  // Inicializar SQLite storage al arrancar la app
  useEffect(() => {
    const initStorage = async () => {
      try {
        await catalogoStorage.init();
      } catch (error) {
        console.error('[APP] Error inicializando storage:', error);
      }
    };

    initStorage();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <TestModeProvider>
              <StatusBar style="light" />
              <AppNavigator />
            </TestModeProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
