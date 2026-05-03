/**
 * Contexto Global para Modo de Pruebas
 *
 * Permite activar/desactivar funciones de prueba y almacena
 * configuraciones específicas para testing y demos
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

interface TestModeContextType {
  // Estado
  testModeEnabled: boolean;
  enableTestMode: () => Promise<void>;
  disableTestMode: () => Promise<void>;
  toggleTestMode: () => Promise<void>;

  // Herramientas de reseteo
  resetSalida: () => Promise<void>;
  resetIngresos: () => Promise<void>;
  resetSituaciones: () => Promise<void>;
  resetAll: () => Promise<void>;
}

const TestModeContext = createContext<TestModeContextType | undefined>(undefined);

const TEST_MODE_KEY = '@provial_test_mode';

export function TestModeProvider({ children }: { children: ReactNode }) {
  const [testModeEnabled, setTestModeEnabled] = useState(false);

  // Cargar estado al iniciar
  useEffect(() => {
    loadTestModeState();
  }, []);

  const loadTestModeState = async () => {
    try {
      const mode = await AsyncStorage.getItem(TEST_MODE_KEY);
      if (mode === 'true') {
        setTestModeEnabled(true);
      }
    } catch (error) {
    }
  };

  const enableTestMode = async () => {
    try {
      await AsyncStorage.setItem(TEST_MODE_KEY, 'true');
      setTestModeEnabled(true);
    } catch (error) {
    }
  };

  const disableTestMode = async () => {
    try {
      await AsyncStorage.setItem(TEST_MODE_KEY, 'false');
      setTestModeEnabled(false);
    } catch (error) {
    }
  };

  const toggleTestMode = async () => {
    if (testModeEnabled) {
      await disableTestMode();
    } else {
      await enableTestMode();
    }
  };

  // Funciones de reseteo (eliminan datos REALES del backend)
  const resetSalida = async () => {
    try {

      // Finalizar salida en el backend
      const response = await api.post('/test-mode/reset-salida');

      // Limpiar estado local
      await AsyncStorage.multiRemove([
        '@provial_salida_activa',
        '@provial_estado_brigada'
      ]);

    } catch (error: any) {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  };

  const resetIngresos = async () => {
    try {

      // Eliminar del backend
      await api.post('/test-mode/reset-ingresos');

      // Limpiar estado local
      await AsyncStorage.removeItem('@provial_ingreso_activo');

    } catch (error) {
      throw error;
    }
  };

  const resetSituaciones = async () => {
    try {

      // Eliminar del backend
      await api.post('/test-mode/reset-situaciones');

      // Limpiar estado local
      await AsyncStorage.removeItem('@provial_situaciones');

    } catch (error) {
      throw error;
    }
  };

  const resetAll = async () => {
    try {

      // Eliminar todo del backend en una sola llamada
      await api.post('/test-mode/reset-all');

      // Limpiar todo el estado local
      await AsyncStorage.multiRemove([
        '@provial_salida_activa',
        '@provial_estado_brigada',
        '@provial_ingreso_activo',
        '@provial_situaciones'
      ]);

    } catch (error) {
      throw error;
    }
  };

  const value: TestModeContextType = {
    testModeEnabled,
    enableTestMode,
    disableTestMode,
    toggleTestMode,
    resetSalida,
    resetIngresos,
    resetSituaciones,
    resetAll,
  };

  return (
    <TestModeContext.Provider value={value}>
      {children}
    </TestModeContext.Provider>
  );
}

export function useTestMode() {
  const context = useContext(TestModeContext);
  if (context === undefined) {
    throw new Error('useTestMode must be used within a TestModeProvider');
  }
  return context;
}
