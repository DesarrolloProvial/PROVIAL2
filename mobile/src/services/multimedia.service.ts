/**
 * Servicio de Multimedia
 * Maneja captura, compresión y subida de fotos y videos
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { API_URL } from '../constants/config';
import { useAuthStore } from '../store/authStore';

// Configuración de compresión
const IMAGE_CONFIG = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.7, // 0-1, donde 1 es máxima calidad
};

const VIDEO_CONFIG = {
  maxDurationSeconds: 30,
  quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
};

export interface MediaFile {
  uri: string;
  type: 'image' | 'video';
  fileName: string;
  mimeType: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  id?: number;
  url?: string;
  thumbnailUrl?: string;
  error?: string;
  completitud?: {
    fotos_subidas: number;
    fotos_requeridas: number;
    video_subido: boolean;
    video_requerido: boolean;
    multimedia_completa: boolean;
  };
}

/**
 * Solicitar permisos de cámara y galería
 */
export async function requestPermissions(): Promise<boolean> {
  const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
  const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  return cameraStatus === 'granted' && mediaStatus === 'granted';
}

/**
 * Tomar foto con la cámara
 */
export async function takePhoto(): Promise<MediaFile | null> {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      throw new Error('Se requieren permisos de cámara');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1, // Capturar en máxima calidad, comprimir después
      exif: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];

    // Comprimir imagen
    const compressed = await compressImage(asset.uri);

    return {
      uri: compressed.uri,
      type: 'image',
      fileName: `foto_${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      width: compressed.width,
      height: compressed.height,
    };
  } catch (error) {
    console.error('Error al tomar foto:', error);
    throw error;
  }
}

/**
 * Seleccionar foto de la galería
 */
export async function pickPhoto(): Promise<MediaFile | null> {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      throw new Error('Se requieren permisos de galería');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      exif: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];

    // Comprimir imagen
    const compressed = await compressImage(asset.uri);

    return {
      uri: compressed.uri,
      type: 'image',
      fileName: `foto_${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      width: compressed.width,
      height: compressed.height,
    };
  } catch (error) {
    console.error('Error al seleccionar foto:', error);
    throw error;
  }
}

/**
 * Grabar video con la cámara
 */
export async function recordVideo(): Promise<MediaFile | null> {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      throw new Error('Se requieren permisos de cámara');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      videoMaxDuration: VIDEO_CONFIG.maxDurationSeconds,
      videoQuality: VIDEO_CONFIG.quality,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];

    // Obtener info del archivo
    const fileInfo = await FileSystem.getInfoAsync(asset.uri);

    return {
      uri: asset.uri,
      type: 'video',
      fileName: `video_${Date.now()}.mp4`,
      mimeType: 'video/mp4',
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
      size: (fileInfo as any).size,
    };
  } catch (error) {
    console.error('Error al grabar video:', error);
    throw error;
  }
}

/**
 * Seleccionar video de la galería
 */
export async function pickVideo(): Promise<MediaFile | null> {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      throw new Error('Se requieren permisos de galería');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      videoMaxDuration: VIDEO_CONFIG.maxDurationSeconds,
      videoQuality: VIDEO_CONFIG.quality,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const fileInfo = await FileSystem.getInfoAsync(asset.uri);

    return {
      uri: asset.uri,
      type: 'video',
      fileName: `video_${Date.now()}.mp4`,
      mimeType: 'video/mp4',
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
      size: (fileInfo as any).size,
    };
  } catch (error) {
    console.error('Error al seleccionar video:', error);
    throw error;
  }
}

/**
 * Comprimir imagen usando expo-image-manipulator
 */
async function compressImage(uri: string): Promise<{
  uri: string;
  width: number;
  height: number;
}> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: IMAGE_CONFIG.maxWidth,
            height: IMAGE_CONFIG.maxHeight,
          },
        },
      ],
      {
        compress: IMAGE_CONFIG.quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log(`[MULTIMEDIA] Imagen comprimida: ${result.width}x${result.height}`);

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error('Error al comprimir imagen:', error);
    // Retornar original si falla la compresión
    return { uri, width: 0, height: 0 };
  }
}

/**
 * Subir foto a una situación
 */
export async function uploadPhoto(
  situacionId: number,
  photo: MediaFile,
  location?: { latitude: number; longitude: number },
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    const token = useAuthStore.getState().token;
    if (!token) {
      return { success: false, error: 'No autenticado' };
    }

    // Crear FormData
    const formData = new FormData();
    formData.append('foto', {
      uri: photo.uri,
      type: photo.mimeType,
      name: photo.fileName,
    } as any);

    if (location) {
      formData.append('latitud', location.latitude.toString());
      formData.append('longitud', location.longitude.toString());
    }

    // Subir con XMLHttpRequest para soporte de progreso
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          resolve({
            success: true,
            id: response.multimedia?.id,
            url: response.multimedia?.url,
            thumbnailUrl: response.multimedia?.thumbnailUrl,
            completitud: response.completitud,
          });
        } else {
          const error = JSON.parse(xhr.responseText);
          resolve({
            success: false,
            error: error.error || 'Error al subir foto',
          });
        }
      });

      xhr.addEventListener('error', () => {
        resolve({ success: false, error: 'Error de conexión' });
      });

      xhr.open('POST', `${API_URL}/multimedia/situacion/${situacionId}/foto`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  } catch (error: any) {
    console.error('Error al subir foto:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Subir video a una situación
 */
export async function uploadVideo(
  situacionId: number,
  video: MediaFile,
  location?: { latitude: number; longitude: number },
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    const token = useAuthStore.getState().token;
    if (!token) {
      return { success: false, error: 'No autenticado' };
    }

    // Verificar tamaño (máximo 10MB)
    if (video.size && video.size > 10 * 1024 * 1024) {
      return {
        success: false,
        error: 'El video es muy grande. Máximo 10MB.',
      };
    }

    // Crear FormData
    const formData = new FormData();
    formData.append('video', {
      uri: video.uri,
      type: video.mimeType,
      name: video.fileName,
    } as any);

    if (location) {
      formData.append('latitud', location.latitude.toString());
      formData.append('longitud', location.longitude.toString());
    }

    if (video.duration) {
      formData.append('duracion_segundos', Math.round(video.duration).toString());
    }

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          resolve({
            success: true,
            id: response.multimedia?.id,
            url: response.multimedia?.url,
            completitud: response.completitud,
          });
        } else {
          const error = JSON.parse(xhr.responseText);
          resolve({
            success: false,
            error: error.error || 'Error al subir video',
          });
        }
      });

      xhr.addEventListener('error', () => {
        resolve({ success: false, error: 'Error de conexión' });
      });

      xhr.open('POST', `${API_URL}/multimedia/situacion/${situacionId}/video`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  } catch (error: any) {
    console.error('Error al subir video:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener multimedia de una situación
 */
export async function getMultimediaSituacion(situacionId: number): Promise<{
  fotos: any[];
  videos: any[];
  completitud: any;
} | null> {
  try {
    const token = useAuthStore.getState().token;
    if (!token) return null;

    const response = await fetch(
      `${API_URL}/multimedia/situacion/${situacionId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.error('Error al obtener multimedia:', error);
    return null;
  }
}

export default {
  requestPermissions,
  takePhoto,
  pickPhoto,
  recordVideo,
  pickVideo,
  uploadPhoto,
  uploadVideo,
  getMultimediaSituacion,
  IMAGE_CONFIG,
  VIDEO_CONFIG,
};
