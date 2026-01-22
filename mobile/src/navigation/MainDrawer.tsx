import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MainDrawerParamList } from '../types/navigation';
import { useAuthStore } from '../store/authStore';
import BrigadaNavigator from './BrigadaNavigator';
import { COLORS } from '../constants/colors';

const Drawer = createDrawerNavigator<MainDrawerParamList>();

/**
 * MainDrawer - Navegación principal de la app
 * SOLO para rol BRIGADA
 *
 * Otros roles (COP, OPERACIONES, ADMIN, ENCARGADO_SEDE) no tienen acceso a la app móvil.
 */
export default function MainDrawer() {
  const { usuario } = useAuthStore();

  if (!usuario) {
    return null;
  }

  // Solo BRIGADA puede acceder a la app móvil
  if (usuario.rol !== 'BRIGADA') {
    return null;
  }

  return (
    <Drawer.Navigator
      id="main"
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: '#fff',
        drawerActiveTintColor: COLORS.primary,
        drawerInactiveTintColor: COLORS.text.secondary,
      }}
    >
      <Drawer.Screen
        name="BrigadaStack"
        component={BrigadaNavigator}
        options={{
          title: 'PROVIAL Móvil',
          drawerLabel: 'Inicio',
        }}
      />
    </Drawer.Navigator>
  );
}
