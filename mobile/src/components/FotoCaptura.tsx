import React, { useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

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

  const solicitarPermisos = async (): Promise<boolean> => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert(
        'Permisos requeridos',
        'Se necesitan permisos de camara y galeria para esta funcion'
      );
      return false;
    }
    return true;
  };

  const tomarFoto = async () => {
    setModalVisible(false);
    const tienePermisos = await solicitarPermisos();
    if (!tienePermisos) return;

    setLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        onFotoCapturada(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error tomando foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    } finally {
      setLoading(false);
    }
  };

  const seleccionarDeGaleria = async () => {
    setModalVisible(false);
    const tienePermisos = await solicitarPermisos();
    if (!tienePermisos) return;

    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        onFotoCapturada(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error seleccionando foto:', error);
      Alert.alert('Error', 'No se pudo seleccionar la foto');
    } finally {
      setLoading(false);
    }
  };

  const eliminarFoto = () => {
    Alert.alert(
      'Eliminar foto',
      '¿Está seguro de eliminar esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => onFotoCapturada(''),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>
          {titulo}
          {requerido && <Text style={styles.requerido}> *</Text>}
        </Text>
        {descripcion && <Text style={styles.descripcion}>{descripcion}</Text>}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : fotoActual ? (
        <View style={styles.fotoContainer}>
          <TouchableOpacity
            style={styles.fotoPreview}
            onPress={() => setPreviewVisible(true)}
          >
            <Image source={{ uri: fotoActual }} style={styles.fotoImage} />
            <View style={styles.fotoOverlay}>
              <Ionicons name="expand-outline" size={24} color="#ffffff" />
            </View>
          </TouchableOpacity>
          <View style={styles.fotoActions}>
            <TouchableOpacity
              style={styles.btnCambiar}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="camera-outline" size={18} color="#3b82f6" />
              <Text style={styles.btnCambiarText}>Cambiar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnEliminar} onPress={eliminarFoto}>
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
              <Text style={styles.btnEliminarText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.btnCapturar}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="camera-outline" size={32} color="#6b7280" />
          <Text style={styles.btnCapturarText}>Agregar foto</Text>
        </TouchableOpacity>
      )}

      {/* Modal opciones */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Seleccionar foto</Text>

            <TouchableOpacity style={styles.modalOpcion} onPress={tomarFoto}>
              <Ionicons name="camera" size={24} color="#3b82f6" />
              <Text style={styles.modalOpcionText}>Tomar foto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOpcion}
              onPress={seleccionarDeGaleria}
            >
              <Ionicons name="images" size={24} color="#3b82f6" />
              <Text style={styles.modalOpcionText}>Seleccionar de galeria</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalBtnCancelar}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalBtnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal preview */}
      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.previewOverlay}>
          <TouchableOpacity
            style={styles.previewClose}
            onPress={() => setPreviewVisible(false)}
          >
            <Ionicons name="close-circle" size={40} color="#ffffff" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    marginBottom: 12,
  },
  titulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  requerido: {
    color: '#dc2626',
  },
  descripcion: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  btnCapturar: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
  },
  btnCapturarText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  fotoContainer: {
    alignItems: 'center',
  },
  fotoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  fotoImage: {
    width: '100%',
    height: '100%',
  },
  fotoOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fotoActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  btnCambiar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  btnCambiarText: {
    fontSize: 14,
    color: '#3b82f6',
    marginLeft: 4,
  },
  btnEliminar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  btnEliminarText: {
    fontSize: 14,
    color: '#dc2626',
    marginLeft: 4,
  },
  // Modal opciones
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOpcion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 12,
  },
  modalOpcionText: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
  },
  modalBtnCancelar: {
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
  },
  modalBtnCancelarText: {
    fontSize: 16,
    color: '#6b7280',
  },
  // Preview
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  previewImage: {
    width: '100%',
    height: '80%',
  },
});
