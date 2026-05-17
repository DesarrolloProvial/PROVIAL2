/**
 * Servicio de Multimedia
 * Maneja captura, compresión y subida de fotos y videos
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Device from 'expo-device';
import { API_URL } from '../constants/config';
import { useAuthStore } from '../store/authStore';
import api, { getDeviceIds } from './api';

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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
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
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
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


    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    // Retornar original si falla la compresión
    return { uri, width: 0, height: 0 };
  }
}

/**
 * Subir foto a cualquier entidad (situacion o actividad)
 */
export async function uploadEntityPhoto(
  entityType: 'situacion' | 'actividad',
  entityId: number,
  photo: MediaFile,
  location?: { latitude: number; longitude: number },
  metadata?: { infografia_numero?: number; infografia_titulo?: string; orden?: number },
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    const token = useAuthStore.getState().token;
    if (!token) return { success: false, error: 'No autenticado' };

    const { uuid, imei } = await getDeviceIds();
    const model = Device.modelName || 'Unknown Device';

    const formData = new FormData();
    formData.append('foto', { uri: photo.uri, type: photo.mimeType, name: photo.fileName } as any);

    if (location) {
      formData.append('latitud', location.latitude.toString());
      formData.append('longitud', location.longitude.toString());
    }
    if (metadata?.infografia_numero != null) formData.append('infografia_numero', String(metadata.infografia_numero));
    if (metadata?.infografia_titulo) formData.append('infografia_titulo', metadata.infografia_titulo);
    if (metadata?.orden != null) formData.append('orden', String(metadata.orden));

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({ loaded: event.loaded, total: event.total, percentage: Math.round((event.loaded / event.total) * 100) });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          resolve({ success: true, id: response.multimedia?.id, url: response.multimedia?.url, thumbnailUrl: response.multimedia?.thumbnailUrl, completitud: response.completitud });
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            resolve({ success: false, error: err.error || `HTTP ${xhr.status}` });
          } catch {
            resolve({ success: false, error: `HTTP ${xhr.status}` });
          }
        }
      });

      xhr.addEventListener('error', () => resolve({ success: false, error: 'Error de conexión' }));

      xhr.open('POST', `${API_URL}/multimedia/${entityType}/${entityId}/foto`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('X-App-Platform', 'mobile');
      xhr.setRequestHeader('X-Device-UUID', uuid);
      xhr.setRequestHeader('X-Device-IMEI', imei);
      xhr.setRequestHeader('X-Device-Model', model);
      xhr.send(formData);
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** @deprecated Usar uploadEntityPhoto('situacion', ...) */
export async function uploadPhoto(
  situacionId: number,
  photo: MediaFile,
  location?: { latitude: number; longitude: number },
  metadata?: { infografia_numero?: number; infografia_titulo?: string },
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return uploadEntityPhoto('situacion', situacionId, photo, location, metadata, onProgress);
}

/**
 * Subir video a cualquier entidad (situacion o actividad)
 */
export async function uploadEntityVideo(
  entityType: 'situacion' | 'actividad',
  entityId: number,
  video: MediaFile,
  location?: { latitude: number; longitude: number },
  metadata?: { infografia_numero?: number; infografia_titulo?: string; duracion_segundos?: number },
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    const token = useAuthStore.getState().token;
    if (!token) return { success: false, error: 'No autenticado' };

    if (video.size && video.size > 10 * 1024 * 1024) {
      return { success: false, error: 'El video es muy grande. Máximo 10MB.' };
    }

    const { uuid, imei } = await getDeviceIds();
    const model = Device.modelName || 'Unknown Device';

    const formData = new FormData();
    formData.append('video', { uri: video.uri, type: video.mimeType, name: video.fileName } as any);

    if (location) {
      formData.append('latitud', location.latitude.toString());
      formData.append('longitud', location.longitude.toString());
    }
    if (metadata?.infografia_numero != null) formData.append('infografia_numero', String(metadata.infografia_numero));
    if (metadata?.infografia_titulo) formData.append('infografia_titulo', metadata.infografia_titulo);
    const duracion = metadata?.duracion_segundos ?? (video.duration ? Math.round(video.duration) : null);
    if (duracion) formData.append('duracion_segundos', String(duracion));

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({ loaded: event.loaded, total: event.total, percentage: Math.round((event.loaded / event.total) * 100) });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          resolve({ success: true, id: response.multimedia?.id, url: response.multimedia?.url, completitud: response.completitud });
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            resolve({ success: false, error: err.error || `HTTP ${xhr.status}` });
          } catch {
            resolve({ success: false, error: `HTTP ${xhr.status}` });
          }
        }
      });

      xhr.addEventListener('error', () => resolve({ success: false, error: 'Error de conexión' }));

      xhr.open('POST', `${API_URL}/multimedia/${entityType}/${entityId}/video`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('X-App-Platform', 'mobile');
      xhr.setRequestHeader('X-Device-UUID', uuid);
      xhr.setRequestHeader('X-Device-IMEI', imei);
      xhr.setRequestHeader('X-Device-Model', model);
      xhr.send(formData);
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** @deprecated Usar uploadEntityVideo('situacion', ...) */
export async function uploadVideo(
  situacionId: number,
  video: MediaFile,
  location?: { latitude: number; longitude: number },
  metadata?: { infografia_numero?: number; infografia_titulo?: string },
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return uploadEntityVideo('situacion', situacionId, video, location, metadata, onProgress);
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
    const response = await api.get(`/multimedia/situacion/${situacionId}`);
    if (response.status >= 400) return null;
    return response.data;
  } catch (error) {
    return null;
  }
}

export default {
  requestPermissions,
  takePhoto,
  pickPhoto,
  recordVideo,
  pickVideo,
  uploadEntityPhoto,
  uploadEntityVideo,
  uploadPhoto,
  uploadVideo,
  getMultimediaSituacion,
  IMAGE_CONFIG,
  VIDEO_CONFIG,
};
