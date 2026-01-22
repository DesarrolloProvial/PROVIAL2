import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import { TestModeProvider } from './src/context/TestModeContext';
import { initDatabase } from './src/services/database';
import { COLORS } from './src/constants/colors';

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
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    async function setupDatabase() {
      try {
        console.log('[APP] Inicializando base de datos offline-first...');
        await initDatabase();
        setIsDbReady(true);
        console.log('[APP] Base de datos lista');
      } catch (error: any) {
        console.error('[APP] Error al inicializar database:', error);
        setDbError(error.message || 'Error al inicializar base de datos');
      }
    }

    setupDatabase();
  }, []);

  // Mostrar pantalla de carga mientras se inicializa la DB
  if (!isDbReady) {
    return (
      <View style={styles.loadingContainer}>
        {dbError ? (
          <>
            <Text style={styles.errorText}>Error al inicializar</Text>
            <Text style={styles.errorDetail}>{dbError}</Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Inicializando...</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <TestModeProvider>
            <StatusBar style="light" />
            <AppNavigator />
          </TestModeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.danger,
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});
