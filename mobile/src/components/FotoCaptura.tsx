/**
 * FotoCaptura - Componente para captura de fotos
 *
 * - Cámara: usa expo-camera para mayor control
 * - Galería: usa expo-image-picker para selector nativo del sistema
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

interface FotoCapturaProps {
  onFotoCapturada: (uri: string) => void;
  fotoActual?: string;
  titulo?: string;
  descripcion?: string;
  requerido?: boolean;
}

export default function FotoCaptura({
  onFotoCapturada,
  fotoActual,
  titulo = 'Foto',
  descripcion,
  requerido = false,
}: FotoCapturaProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const tomarFoto = async () => {
    try {
      console.log('[FotoCaptura] Abriendo cámara...');
      setModalVisible(false);

      // Pequeña pausa para que el modal se cierre
      await new Promise(resolve => setTimeout(resolve, 300));

      // Solicitar permisos de cámara
      if (!cameraPermission?.granted) {
        const result = await requestCameraPermission();
        if (!result.granted) {
          Alert.alert('Permisos requeridos', 'Se necesita permiso de cámara para tomar fotos.');
          return;
        }
      }

      setCameraVisible(true);
    } catch (error: any) {
      console.error('[FotoCaptura] Error abriendo cámara:', error);
      Alert.alert('Error', 'No se pudo abrir la cámara.');
    }
  };

  const capturarFoto = async () => {
    try {
      if (!cameraRef.current) {
        console.error('[FotoCaptura] CameraRef no disponible');
        return;
      }

      console.log('[FotoCaptura] Capturando foto...');
      setLoading(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
      });

      console.log('[FotoCaptura] Foto capturada:', photo.uri);

      setCameraVisible(false);
      onFotoCapturada(photo.uri);
    } catch (error) {
      console.error('[FotoCaptura] Error capturando foto:', error);
      Alert.alert('Error', 'No se pudo capturar la foto');
    } finally {
      setLoading(false);
    }
  };

  const seleccionarDeGaleria = async () => {
    try {
      console.log('[FotoCaptura] Solicitando permisos de galería...');
      setModalVisible(false);

      // Solicitar permisos explícitamente
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[FotoCaptura] Estado de permisos:', status);

      if (status !== 'granted') {
        Alert.alert(
          'Permisos requeridos',
          'Se necesita acceso a la galería para seleccionar fotos.'
        );
        return;
      }

      // Pequeña pausa para que el modal se cierre
      await new Promise(resolve => setTimeout(resolve, 300));

      console.log('[FotoCaptura] Abriendo selector de galería nativo...');

      // Usar el selector nativo del sistema
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        exif: false,
      });

      console.log('[FotoCaptura] Resultado picker:', JSON.stringify(result, null, 2));

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('[FotoCaptura] Asset seleccionado:', {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          type: asset.type,
          fileName: asset.fileName,
        });
        onFotoCapturada(asset.uri);
      } else {
        console.log('[FotoCaptura] Selección cancelada o sin assets');
      }
    } catch (error: any) {
      console.error('[FotoCaptura] Error con galería:', error);
      console.error('[FotoCaptura] Error stack:', error.stack);
      Alert.alert('Error', `No se pudo acceder a la galería: ${error.message}`);
    }
  };

  const eliminarFoto = () => {
    Alert.alert(
      'Eliminar foto',
      '¿Está seguro que desea eliminar esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', onPress: () => onFotoCapturada(''), style: 'destructive' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {descripcion && (
        <Text style={styles.descripcion}>{descripcion}</Text>
      )}

      {fotoActual ? (
        <View style={styles.fotoContainer}>
          <TouchableOpacity onPress={() => setPreviewVisible(true)}>
            <Image source={{ uri: fotoActual }} style={styles.fotoPreview} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.eliminarButton} onPress={eliminarFoto}>
            <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
            <Text style={styles.eliminarText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.capturaButton, requerido && styles.capturaButtonRequired]}
          onPress={() => setModalVisible(true)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
              <Text style={styles.capturaText}>
                {titulo}
                {requerido && <Text style={styles.required}> *</Text>}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Modal de opciones */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar foto</Text>

            <TouchableOpacity style={styles.modalButton} onPress={tomarFoto}>
              <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
              <Text style={styles.modalButtonText}>Tomar foto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalButton} onPress={seleccionarDeGaleria}>
              <Ionicons name="images-outline" size={24} color={COLORS.primary} />
              <Text style={styles.modalButtonText}>Desde galería</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de preview */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={previewVisible}
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.previewOverlay}>
          <TouchableOpacity
            style={styles.closePreview}
            onPress={() => setPreviewVisible(false)}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {fotoActual && (
            <Image
              source={{ uri: fotoActual }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Modal de cámara personalizada */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={cameraVisible}
        onRequestClose={() => setCameraVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {cameraPermission?.granted ? (
            <>
              <CameraView
                ref={cameraRef}
                style={{ flex: 1 }}
                facing="back"
              />

              {/* Controles de cámara */}
              <View style={styles.cameraControls}>
                <TouchableOpacity
                  style={styles.cameraCancelButton}
                  onPress={() => setCameraVisible(false)}
                >
                  <Ionicons name="close" size={32} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cameraShutterButton}
                  onPress={capturarFoto}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="large" />
                  ) : (
                    <View style={styles.shutterInner} />
                  )}
                </TouchableOpacity>

                <View style={{ width: 60 }} />
              </View>
            </>
          ) : (
            <View style={styles.cameraPermissionView}>
              <Ionicons name="camera-outline" size={64} color="#fff" />
              <Text style={styles.cameraPermissionText}>
                Se requiere permiso de cámara
              </Text>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={() => setCameraVisible(false)}
              >
                <Text style={styles.permissionButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  descripcion: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  capturaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 8,
    borderStyle: 'dashed',
    backgroundColor: COLORS.primary + '10',
  },
  capturaButtonRequired: {
    borderColor: COLORS.danger,
  },
  capturaText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.primary,
  },
  required: {
    color: COLORS.danger,
  },
  fotoContainer: {
    gap: 8,
  },
  fotoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
  },
  eliminarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  eliminarText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 8,
    backgroundColor: COLORS.gray[50],
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  modalButtonCancel: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.secondary,
    textAlign: 'center',
    width: '100%',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePreview: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  // Estilos de cámara personalizada
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cameraCancelButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraShutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  cameraPermissionView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  cameraPermissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
