/**
 * Servicio de Upload Directo a Cloudinary
 * Arquitectura Offline-First
 *
 * El cliente sube directamente a Cloudinary usando signed URLs,
 * evitando pasar por el backend de PROVIAL para subir archivos.
 */

import { API_URL } from '../constants/config';
import { useAuthStore } from '../store/authStore';
import * as FileSystem from 'expo-file-system';

/**
 * Resultado de obtener signed upload params
 */
interface SignedUploadParams {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  uploadUrl: string;
}

/**
 * Resultado de upload a Cloudinary
 */
interface CloudinaryUploadResult {
  success: boolean;
  publicId?: string;
  url?: string;
  secureUrl?: string;
  width?: number;
  height?: number;
  format?: string;
  resourceType?: string;
  bytes?: number;
  error?: string;
}

/**
 * Resultado de registro de evidencia en backend
 */
interface RegisterEvidenciaResult {
  success: boolean;
  id?: number;
  cloudinaryPublicId?: string;
  error?: string;
}

/**
 * Configuración de retry
 */
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
};

/**
 * Calcular delay para retry con exponential backoff
 */
function getRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

/**
 * Sleep async
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Paso 1: Obtener signed upload parameters del backend
 */
export async function getSignedUploadParams(
  draftUuid: string,
  fileType: 'image' | 'video'
): Promise<SignedUploadParams> {
  const token = useAuthStore.getState().token;

  if (!token) {
    throw new Error('No autenticado');
  }

  const response = await fetch(`${API_URL}/cloudinary/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      draftUuid,
      fileType,
      resourceType: fileType === 'image' ? 'image' : 'video'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al obtener signed URL');
  }

  const data = await response.json();

  return {
    signature: data.signature,
    timestamp: data.timestamp,
    apiKey: data.apiKey,
    cloudName: data.cloudName,
    folder: data.folder,
    publicId: data.publicId,
    uploadUrl: data.uploadUrl
  };
}

/**
 * Paso 2: Subir archivo directamente a Cloudinary
 */
export async function uploadToCloudinary(
  fileUri: string,
  signedParams: SignedUploadParams,
  onProgress?: (progress: number) => void
): Promise<CloudinaryUploadResult> {
  try {
    console.log('[CLOUDINARY] Iniciando upload directo...');

    // Leer archivo como base64 (Cloudinary acepta base64)
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      throw new Error('Archivo no encontrado');
    }

    // Crear FormData
    const formData = new FormData();

    // Obtener tipo MIME del archivo
    const extension = fileUri.split('.').pop()?.toLowerCase();
    let mimeType = 'application/octet-stream';
    if (extension === 'jpg' || extension === 'jpeg') {
      mimeType = 'image/jpeg';
    } else if (extension === 'png') {
      mimeType = 'image/png';
    } else if (extension === 'mp4') {
      mimeType = 'video/mp4';
    } else if (extension === 'mov') {
      mimeType = 'video/quicktime';
    }

    // Agregar archivo
    formData.append('file', {
      uri: fileUri,
      type: mimeType,
      name: fileUri.split('/').pop() || 'upload'
    } as any);

    // Agregar parámetros firmados
    formData.append('api_key', signedParams.apiKey);
    formData.append('timestamp', signedParams.timestamp.toString());
    formData.append('signature', signedParams.signature);
    formData.append('folder', signedParams.folder);
    formData.append('public_id', signedParams.publicId);

    // Upload con XMLHttpRequest para soporte de progreso
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Progress handler
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      });

      // Success handler
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            console.log('[CLOUDINARY] Upload exitoso:', response.public_id);

            resolve({
              success: true,
              publicId: response.public_id,
              url: response.url,
              secureUrl: response.secure_url,
              width: response.width,
              height: response.height,
              format: response.format,
              resourceType: response.resource_type,
              bytes: response.bytes
            });
          } catch (error: any) {
            reject(new Error('Error al parsear respuesta de Cloudinary'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error?.message || 'Error al subir a Cloudinary'));
          } catch {
            reject(new Error(`Error HTTP ${xhr.status}`));
          }
        }
      });

      // Error handler
      xhr.addEventListener('error', () => {
        reject(new Error('Error de red al subir a Cloudinary'));
      });

      // Timeout handler
      xhr.addEventListener('timeout', () => {
        reject(new Error('Timeout al subir a Cloudinary'));
      });

      // Configurar y enviar
      xhr.open('POST', signedParams.uploadUrl);
      xhr.timeout = 60000; // 60 segundos
      xhr.send(formData);
    });
  } catch (error: any) {
    console.error('[CLOUDINARY] Error en upload:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido al subir'
    };
  }
}

/**
 * Paso 3: Registrar evidencia en backend de PROVIAL
 */
export async function registerEvidencia(
  draftUuid: string,
  cloudinaryPublicId: string,
  url: string,
  tipo: 'FOTO' | 'VIDEO',
  width?: number,
  height?: number,
  duration?: number
): Promise<RegisterEvidenciaResult> {
  const token = useAuthStore.getState().token;

  if (!token) {
    throw new Error('No autenticado');
  }

  try {
    const response = await fetch(`${API_URL}/drafts/${draftUuid}/evidencias`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Idempotency-Key': `${draftUuid}-${cloudinaryPublicId}` // Evitar duplicados
      },
      body: JSON.stringify({
        cloudinaryPublicId,
        url,
        type: tipo,
        width,
        height,
        duration
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al registrar evidencia');
    }

    const data = await response.json();

    console.log('[BACKEND] Evidencia registrada:', data.id);

    return {
      success: true,
      id: data.id,
      cloudinaryPublicId: data.cloudinaryPublicId
    };
  } catch (error: any) {
    console.error('[BACKEND] Error al registrar evidencia:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido al registrar'
    };
  }
}

/**
 * Flujo completo: Upload con retry automático
 */
export async function uploadFileWithRetry(
  fileUri: string,
  draftUuid: string,
  fileType: 'image' | 'video',
  tipo: 'FOTO' | 'VIDEO',
  width?: number,
  height?: number,
  duration?: number,
  onProgress?: (progress: number) => void
): Promise<{
  success: boolean;
  cloudinaryPublicId?: string;
  cloudinaryUrl?: string;
  evidenciaId?: number;
  error?: string;
}> {
  let lastError: string = '';

  for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      console.log(`[UPLOAD] Intento ${attempt + 1}/${RETRY_CONFIG.maxAttempts}`);

      // Paso 1: Obtener signed params
      const signedParams = await getSignedUploadParams(draftUuid, fileType);

      // Paso 2: Upload a Cloudinary
      const uploadResult = await uploadToCloudinary(fileUri, signedParams, onProgress);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload falló');
      }

      // Paso 3: Registrar en backend
      const registerResult = await registerEvidencia(
        draftUuid,
        uploadResult.publicId!,
        uploadResult.secureUrl || uploadResult.url!,
        tipo,
        width || uploadResult.width,
        height || uploadResult.height,
        duration
      );

      if (!registerResult.success) {
        // Upload a Cloudinary fue exitoso pero registro falló
        // Esto es OK - el backend puede registrarlo después con idempotencia
        console.warn('[UPLOAD] Upload exitoso pero registro falló:', registerResult.error);
      }

      return {
        success: true,
        cloudinaryPublicId: uploadResult.publicId,
        cloudinaryUrl: uploadResult.secureUrl || uploadResult.url,
        evidenciaId: registerResult.id,
        error: undefined
      };

    } catch (error: any) {
      lastError = error.message;
      console.error(`[UPLOAD] Intento ${attempt + 1} falló:`, lastError);

      // Si no es el último intento, esperar antes de reintentar
      if (attempt < RETRY_CONFIG.maxAttempts - 1) {
        const delay = getRetryDelay(attempt);
        console.log(`[UPLOAD] Reintentando en ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // Todos los intentos fallaron
  return {
    success: false,
    error: lastError || 'Todos los intentos de upload fallaron'
  };
}

/**
 * Verificar si Cloudinary está configurado en backend
 */
export async function checkCloudinaryStatus(): Promise<{
  configured: boolean;
  cloudName?: string;
  message?: string;
}> {
  console.log('[CLOUDINARY-CHECK] 🔍 Iniciando verificación de Cloudinary...');
  try {
    const token = useAuthStore.getState().token;
    console.log('[CLOUDINARY-CHECK] Token existe:', !!token);
    if (!token) {
      console.warn('[CLOUDINARY-CHECK] ⚠️ No autenticado');
      return { configured: false, message: 'No autenticado' };
    }

    const url = `${API_URL}/cloudinary/status`;
    console.log('[CLOUDINARY-CHECK] 📡 Llamando a:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('[CLOUDINARY-CHECK] 📥 Response status:', response.status);

    if (!response.ok) {
      console.error('[CLOUDINARY-CHECK] ❌ Response no OK:', response.status);
      return { configured: false, message: 'Error al verificar status' };
    }

    const data = await response.json();
    console.log('[CLOUDINARY-CHECK] ✅ Data recibida:', data);

    return {
      configured: data.configured,
      cloudName: data.cloudName,
      message: data.message
    };
  } catch (error: any) {
    console.error('[CLOUDINARY-CHECK] ❌ Error en verificación:', error);
    return {
      configured: false,
      message: error.message || 'Error de conexión'
    };
  }
}

export default {
  getSignedUploadParams,
  uploadToCloudinary,
  registerEvidencia,
  uploadFileWithRetry,
  checkCloudinaryStatus
};
