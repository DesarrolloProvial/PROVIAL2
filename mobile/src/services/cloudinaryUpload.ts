/**
 * Servicio de Upload a Cloudinary
 * Estrategia Offline-First:
 * 1. Captura local con expo-image-picker
 * 2. Al sincronizar, obtiene signed URL del backend
 * 3. Sube directamente a Cloudinary
 */

import api from './api';
import * as FileSystem from 'expo-file-system';
import { MultimediaRef } from './draftStorage';

export interface CloudinaryUploadResult {
  success: boolean;
  publicId?: string;
  secureUrl?: string;
  error?: string;
}

export interface SignedUploadParams {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  uploadUrl: string;
}

/**
 * Obtener firma del backend para upload seguro
 */
export async function getSignedUploadParams(
  draftUuid: string,
  fileType: 'image' | 'video',
  customPublicId?: string,
  customFolder?: string,
  tags?: string
): Promise<SignedUploadParams> {
  const response = await api.post('/cloudinary/sign', {
    draftUuid,
    fileType,
    resourceType: fileType === 'video' ? 'video' : 'image',
    folder: customFolder,
    publicId: customPublicId,
    tags
  });

  return response.data;
}

/**
 * Subir un archivo a Cloudinary usando signed upload
 */
export async function uploadToCloudinary(
  localUri: string,
  signedParams: SignedUploadParams,
  fileType: 'image' | 'video'
): Promise<CloudinaryUploadResult> {
  try {
    console.log(`[CLOUDINARY] Iniciando upload: ${signedParams.publicId}`);

    // Leer archivo como base64
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) {
      throw new Error('Archivo no encontrado');
    }

    // Preparar FormData
    const formData = new FormData();

    // Determinar el mime type
    const mimeType = fileType === 'video' ? 'video/mp4' : 'image/jpeg';
    const extension = fileType === 'video' ? 'mp4' : 'jpg';

    // Agregar archivo
    formData.append('file', {
      uri: localUri,
      type: mimeType,
      name: `${signedParams.publicId}.${extension}`,
    } as any);

    // Agregar parámetros de firma
    formData.append('api_key', signedParams.apiKey);
    formData.append('timestamp', signedParams.timestamp.toString());
    formData.append('signature', signedParams.signature);
    formData.append('folder', signedParams.folder);
    formData.append('public_id', signedParams.publicId);

    // Upload directo a Cloudinary
    const response = await fetch(signedParams.uploadUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CLOUDINARY] Error response:', errorText);
      throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();
    console.log(`[CLOUDINARY] Upload exitoso: ${result.secure_url}`);

    return {
      success: true,
      publicId: result.public_id,
      secureUrl: result.secure_url,
    };
  } catch (error: any) {
    console.error('[CLOUDINARY] Error en upload:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido',
    };
  }
}

/**
 * Subir múltiples archivos multimedia a Cloudinary
 * Usado cuando hay conexión para sincronizar
 */
export async function uploadMultimedia(
  situacionId: string,
  multimedia: MultimediaRef[],
  onProgress?: (uploaded: number, total: number) => void
): Promise<{
  uploaded: Array<{ localUri: string; cloudinaryUrl: string; publicId: string }>;
  failed: Array<{ localUri: string; error: string }>;
}> {
  const uploaded: Array<{ localUri: string; cloudinaryUrl: string; publicId: string }> = [];
  const failed: Array<{ localUri: string; error: string }> = [];

  for (let i = 0; i < multimedia.length; i++) {
    const media = multimedia[i];

    try {
      // Determinar tipo y generar public_id siguiendo el naming convention
      const fileType = media.tipo === 'VIDEO' ? 'video' : 'image';
      const index = media.orden || (i + 1);
      const publicId = `${situacionId}_${media.tipo}_${index}`;

      // Obtener firma del backend
      const signedParams = await getSignedUploadParams(
        situacionId,
        fileType as 'image' | 'video',
        publicId,
        `provial_evidencias/${situacionId.split('-')[3] || '00'}`, // Carpeta por tipo
        `tipo_${situacionId.split('-')[3]},provial_app`
      );

      // Subir
      const result = await uploadToCloudinary(media.uri, signedParams, fileType as 'image' | 'video');

      if (result.success && result.secureUrl) {
        uploaded.push({
          localUri: media.uri,
          cloudinaryUrl: result.secureUrl,
          publicId: result.publicId!,
        });
      } else {
        failed.push({
          localUri: media.uri,
          error: result.error || 'Error desconocido',
        });
      }
    } catch (error: any) {
      failed.push({
        localUri: media.uri,
        error: error.message || 'Error al procesar',
      });
    }

    // Notificar progreso
    if (onProgress) {
      onProgress(i + 1, multimedia.length);
    }
  }

  return { uploaded, failed };
}

/**
 * Verificar si Cloudinary está configurado en el backend
 */
export async function isCloudinaryReady(): Promise<boolean> {
  try {
    const response = await api.get('/cloudinary/status');
    return response.data.configured === true;
  } catch {
    return false;
  }
}

export default {
  getSignedUploadParams,
  uploadToCloudinary,
  uploadMultimedia,
  isCloudinaryReady,
};
