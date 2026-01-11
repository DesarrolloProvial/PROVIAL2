import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { BrigadaStackParamList } from '../types/navigation';
import { COLORS } from '../constants/colors';
import BrigadaHomeScreen from '../screens/brigada/BrigadaHomeScreen';
import NuevaSituacionScreen from '../screens/brigada/NuevaSituacionScreen';
import BitacoraScreen from '../screens/brigada/BitacoraScreen';
import IncidenteScreen from '../screens/brigada/IncidenteScreen';
import AsistenciaScreen from '../screens/brigada/AsistenciaScreen';
import EmergenciaScreen from '../screens/brigada/EmergenciaScreen';
import SalidaSedeScreen from '../screens/brigada/SalidaSedeScreen';
import IniciarSalidaScreen from '../screens/brigada/IniciarSalidaScreen';
import IngresoSedeScreen from '../screens/brigada/IngresoSedeScreen';
import SalidaDeSedeScreen from '../screens/brigada/SalidaDeSedeScreen';
import FinalizarDiaScreen from '../screens/brigada/FinalizarDiaScreen';
import RegistroCombustibleScreen from '../screens/brigada/RegistroCombustibleScreen';
import RelevoScreen from '../screens/brigada/RelevoScreen';
import ConfiguracionPruebasScreen from '../screens/brigada/ConfiguracionPruebasScreen';
import Inspeccion360Screen from '../screens/brigada/Inspeccion360Screen';
import AprobarInspeccion360Screen from '../screens/brigada/AprobarInspeccion360Screen';
import SolicitarSalidaAsignacionScreen from '../screens/brigada/SolicitarSalidaAsignacionScreen';
import AutorizarSalidaScreen from '../screens/brigada/AutorizarSalidaScreen';

// Placeholder screens - to be implemented
import { View, Text, StyleSheet } from 'react-native';

const DetalleSituacionScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>Detalle Situación - En desarrollo</Text>
  </View>
);

const Stack = createStackNavigator<BrigadaStackParamList>();

export default function BrigadaNavigator() {
  return (
    <Stack.Navigator
      id="brigada"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen
        name="BrigadaHome"
        component={BrigadaHomeScreen}
        options={{ title: 'Inicio' }}
      />
      <Stack.Screen
        name="NuevaSituacion"
        component={NuevaSituacionScreen}
        options={{ title: 'Nueva Situación', headerShown: true }}
      />
      <Stack.Screen
        name="DetalleSituacion"
        component={DetalleSituacionScreen}
        options={{ title: 'Detalle', headerShown: true }}
      />
      <Stack.Screen
        name="Bitacora"
        component={BitacoraScreen}
        options={{ title: 'Bitácora', headerShown: true }}
      />
      <Stack.Screen
        name="Incidente"
        component={IncidenteScreen}
        options={{ title: 'Hecho de Tránsito', headerShown: true }}
      />
      <Stack.Screen
        name="Asistencia"
        component={AsistenciaScreen}
        options={{ title: 'Asistencia Vial', headerShown: true }}
      />
      <Stack.Screen
        name="Emergencia"
        component={EmergenciaScreen}
        options={{ title: 'Emergencia Vial', headerShown: true }}
      />
      <Stack.Screen
        name="SalidaSede"
        component={SalidaSedeScreen}
        options={{ title: 'Salida de Sede', headerShown: true }}
      />
      <Stack.Screen
        name="IniciarSalida"
        component={IniciarSalidaScreen}
        options={{ title: 'Iniciar Salida', headerShown: false }}
      />
      <Stack.Screen
        name="IngresoSede"
        component={IngresoSedeScreen}
        options={{ title: 'Ingreso a Sede', headerShown: true }}
      />
      <Stack.Screen
        name="SalidaDeSede"
        component={SalidaDeSedeScreen}
        options={{ title: 'Salir de Sede', headerShown: true }}
      />
      <Stack.Screen
        name="FinalizarDia"
        component={FinalizarDiaScreen}
        options={{ title: 'Finalizar Jornada', headerShown: true }}
      />
      <Stack.Screen
        name="RegistroCombustible"
        component={RegistroCombustibleScreen}
        options={{ title: 'Registro de Combustible', headerShown: true }}
      />
      <Stack.Screen
        name="Relevo"
        component={RelevoScreen}
        options={{ title: 'Registrar Relevo', headerShown: true }}
      />
      <Stack.Screen
        name="ConfiguracionPruebas"
        component={ConfiguracionPruebasScreen}
        options={{ title: 'Modo de Pruebas', headerShown: true }}
      />
      <Stack.Screen
        name="Inspeccion360"
        component={Inspeccion360Screen}
        options={{ title: 'Inspeccion 360', headerShown: false }}
      />
      <Stack.Screen
        name="AprobarInspeccion360"
        component={AprobarInspeccion360Screen}
        options={{ title: 'Aprobar Inspeccion', headerShown: false }}
      />
      <Stack.Screen
        name="SolicitarSalidaAsignacion"
        component={SolicitarSalidaAsignacionScreen}
        options={{ title: 'Solicitar Salida', headerShown: true }}
      />
      <Stack.Screen
        name="AutorizarSalida"
        component={AutorizarSalidaScreen}
        options={{ title: 'Autorizar Salida', headerShown: true }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
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
