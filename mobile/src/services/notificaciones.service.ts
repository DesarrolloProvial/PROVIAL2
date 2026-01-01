import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';
import Constants from 'expo-constants';

// ============================================
// CONFIGURACION DE NOTIFICACIONES
// ============================================

// Configurar como se muestran las notificaciones cuando la app esta abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ============================================
// INTERFACES
// ============================================

interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  datos: Record<string, any>;
  leida: boolean;
  created_at: string;
}

// ============================================
// SERVICIO DE NOTIFICACIONES
// ============================================

export const notificacionesService = {
  /**
   * Registrar dispositivo para recibir notificaciones push
   * Debe llamarse al iniciar sesion
   */
  async registrarDispositivo(): Promise<string | null> {
    try {
      // Verificar que es un dispositivo fisico
      if (!Device.isDevice) {
        console.log('Las notificaciones push solo funcionan en dispositivos fisicos');
        return null;
      }

      // Verificar permisos
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permisos de notificaciones no otorgados');
        return null;
      }

      // Obtener token de Expo Push
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      const pushToken = tokenData.data;

      // Configurar canal para Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'PROVIAL',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#1e3a5f',
        });
      }

      // Registrar en backend
      await api.post('/notificaciones/registrar-token', {
        push_token: pushToken,
        plataforma: Platform.OS,
        modelo_dispositivo: Device.modelName,
        version_app: Constants.expoConfig?.version || '1.0.0',
      });

      console.log('Token push registrado:', pushToken);
      return pushToken;
    } catch (error) {
      console.error('Error registrando dispositivo:', error);
      return null;
    }
  },

  /**
   * Desregistrar dispositivo (al cerrar sesion)
   */
  async desregistrarDispositivo(pushToken: string): Promise<void> {
    try {
      await api.post('/notificaciones/desactivar-token', {
        push_token: pushToken,
      });
    } catch (error) {
      console.error('Error desregistrando dispositivo:', error);
    }
  },

  /**
   * Obtener mis notificaciones
   */
  async obtenerNotificaciones(soloNoLeidas: boolean = false, limite: number = 50): Promise<{
    notificaciones: Notificacion[];
    no_leidas: number;
  }> {
    const response = await api.get('/notificaciones', {
      params: {
        solo_no_leidas: soloNoLeidas,
        limite,
      },
    });
    return response.data;
  },

  /**
   * Obtener conteo de no leidas
   */
  async conteoNoLeidas(): Promise<number> {
    const response = await api.get('/notificaciones/conteo');
    return response.data.no_leidas;
  },

  /**
   * Marcar notificacion como leida
   */
  async marcarLeida(notificacionId: number): Promise<void> {
    await api.post(`/notificaciones/${notificacionId}/leer`);
  },

  /**
   * Marcar todas como leidas
   */
  async marcarTodasLeidas(): Promise<void> {
    await api.post('/notificaciones/leer-todas');
  },

  /**
   * Configurar listener para notificaciones recibidas
   */
  configurarListeners(
    onNotificacionRecibida?: (notificacion: Notifications.Notification) => void,
    onNotificacionTocada?: (response: Notifications.NotificationResponse) => void
  ): () => void {
    // Cuando llega una notificacion y la app esta abierta
    const subscriptionRecibida = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notificacion recibida:', notification);
        onNotificacionRecibida?.(notification);
      }
    );

    // Cuando el usuario toca la notificacion
    const subscriptionTocada = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notificacion tocada:', response);
        onNotificacionTocada?.(response);
      }
    );

    // Retornar funcion para limpiar listeners
    return () => {
      subscriptionRecibida.remove();
      subscriptionTocada.remove();
    };
  },

  /**
   * Obtener datos de la notificacion que abrio la app
   */
  async obtenerNotificacionInicial(): Promise<Notifications.NotificationResponse | null> {
    return await Notifications.getLastNotificationResponseAsync();
  },
};

export default notificacionesService;
