import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { COPStackParamList } from '../types/navigation';
import { COLORS } from '../constants/colors';
import COPMapaScreen from '../screens/cop/COPMapaScreen';
import { useAuthStore } from '../store/authStore';
import { useNavigation, DrawerActions } from '@react-navigation/native';

// Placeholder screens - to be implemented
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';

const COPHomeScreen = () => {
  const { usuario, logout } = useAuthStore();
  const navigation = useNavigation();

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PROVIAL COP</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* User Info Card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(usuario?.nombre || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{usuario?.nombre || 'Sin nombre'}</Text>
          <Text style={styles.userRole}>{usuario?.rol || 'Sin rol'}</Text>
        </View>
      </View>

      {/* Menu Options */}
      <ScrollView style={styles.menuContainer}>
        <Text style={styles.sectionTitle}>Centro de Operaciones</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => (navigation as any).navigate('MapaUnidades')}
        >
          <Text style={styles.menuItemIcon}>🗺️</Text>
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemTitle}>Mapa de Unidades</Text>
            <Text style={styles.menuItemSubtitle}>Ver ubicación de todas las unidades</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => (navigation as any).navigate('GestionGrupos')}
        >
          <Text style={styles.menuItemIcon}>👥</Text>
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemTitle}>Gestión de Grupos</Text>
            <Text style={styles.menuItemSubtitle}>Administrar grupos de trabajo</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => (navigation as any).navigate('GestionMovimientos')}
        >
          <Text style={styles.menuItemIcon}>📋</Text>
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemTitle}>Movimientos</Text>
            <Text style={styles.menuItemSubtitle}>Ver movimientos de unidades</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Logout Button */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const BitacoraUnidadScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>Bitácora Unidad - En desarrollo</Text>
  </View>
);

const DetalleSituacionCOPScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>Detalle Situación - En desarrollo</Text>
  </View>
);

const GestionGruposScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>Gestión de Grupos - En desarrollo</Text>
  </View>
);

const GestionMovimientosScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>Gestión de Movimientos - En desarrollo</Text>
  </View>
);

const Stack = createStackNavigator<COPStackParamList>();

export default function COPNavigator() {
  return (
    <Stack.Navigator
      id="cop"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen
        name="COPHome"
        component={COPHomeScreen}
        options={{ title: 'COP' }}
      />
      <Stack.Screen
        name="MapaUnidades"
        component={COPMapaScreen}
        options={{ title: 'Mapa', headerShown: true }}
      />
      <Stack.Screen
        name="BitacoraUnidad"
        component={BitacoraUnidadScreen}
        options={{ title: 'Bitácora Unidad', headerShown: true }}
      />
      <Stack.Screen
        name="DetalleSituacionCOP"
        component={DetalleSituacionCOPScreen}
        options={{ title: 'Detalle', headerShown: true }}
      />
      <Stack.Screen
        name="GestionGrupos"
        component={GestionGruposScreen}
        options={{ title: 'Gestión de Grupos', headerShown: true }}
      />
      <Stack.Screen
        name="GestionMovimientos"
        component={GestionMovimientosScreen}
        options={{ title: 'Movimientos', headerShown: true }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e40af',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 24,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  userRole: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItemIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  menuItemArrow: {
    fontSize: 24,
    color: '#9ca3af',
  },
  logoutContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  placeholderText: {
    fontSize: 18,
    color: COLORS.text.secondary,
  },
});
