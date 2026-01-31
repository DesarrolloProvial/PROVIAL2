import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configurar Cloudinary con variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage para multer que sube directamente a Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (_req, file) => {
    // Determinar la carpeta segun el tipo de archivo
    let folder = 'provial/general';
    if (file.fieldname === 'foto_situacion') {
      folder = 'provial/situaciones';
    } else if (file.fieldname === 'foto_inspeccion') {
      folder = 'provial/inspecciones';
    } else if (file.fieldname === 'evidencia') {
      folder = 'provial/evidencias';
    }

    return {
      folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov'],
      transformation: file.mimetype.startsWith('image/')
        ? [{ width: 1920, height: 1080, crop: 'limit', quality: 'auto' }]
        : undefined,
    };
  },
});

// Middleware de multer configurado con Cloudinary
export const uploadToCloudinary = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

// Funcion para subir un archivo directamente (sin multer)
export async function uploadFile(
  filePath: string,
  options?: { folder?: string; resource_type?: 'image' | 'video' | 'raw' | 'auto' }
) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: options?.folder || 'provial/general',
      resource_type: options?.resource_type || 'auto',
    });
    return {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
}

// Funcion para eliminar un archivo
export async function deleteFile(publicId: string) {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return false;
  }
}

// Verificar si Cloudinary esta configurado (para signed uploads)
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

// Verificar si Cloudinary está configurado para unsigned uploads (solo necesita cloud_name)
export function isCloudinaryConfiguredUnsigned(): boolean {
  return !!process.env.CLOUDINARY_CLOUD_NAME;
}

/**
 * Generar signature para signed upload (cliente sube directo a Cloudinary)
 * Esto es más seguro que exponer el API secret en el cliente
 */
export function generateSignedUploadParams(options: {
  draftUuid: string;
  fileType: 'image' | 'video';
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  // Parámetros opcionales para control total del nombre/ubicación
  folder?: string;
  publicId?: string;
  tags?: string;
}) {
  const timestamp = Math.round(Date.now() / 1000);

  // Usar carpeta/nombre custom o defaults basados en draft
  const folder = options.folder || `provial/drafts/${options.draftUuid}`;
  const publicId = options.publicId || `${options.draftUuid}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Parámetros que se van a firmar
  const paramsToSign: any = {
    timestamp,
    folder,
    public_id: publicId,
  };

  if (options.tags) {
    paramsToSign.tags = options.tags;
  }

  // Agregar transformaciones según el tipo de archivo (solo si no es video para evitar delays)
  if (options.fileType === 'image') {
    paramsToSign.transformation = 'c_limit,w_1920,h_1080,q_auto';
  }

  // Generar signature usando el API secret
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    folder,
    publicId,
    tags: options.tags,
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${options.resourceType || 'auto'}/upload`,
  };
}

// Upload preset configurado en Cloudinary (unsigned)
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'provial_upload';

/**
 * Subir foto desde buffer a Cloudinary usando el preset provial_upload
 * Retorna URL pública de la imagen
 */
export async function uploadPhotoBuffer(
  buffer: Buffer,
  situacionId: number,
  orden?: number,
  codigoSituacion?: string
): Promise<{
  success: boolean;
  url?: string;
  thumbnailUrl?: string;
  publicId?: string;
  width?: number;
  height?: number;
  size?: number;
  error?: string;
}> {
  // Solo necesitamos cloud_name para unsigned uploads
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return { success: false, error: 'CLOUDINARY_CLOUD_NAME no está configurado' };
  }

  try {
    // Nombre según convención:
    // Con código: 20260121-1-030-70-86-50-4_F1 (fecha-sede-unidad-tipo-ruta-km-num_Foto#)
    // Sin código: SIT_32_F1_1769436762168 (fallback con ID)
    const publicId = codigoSituacion
      ? `${codigoSituacion}_F${orden || 1}`
      : `SIT_${situacionId}_F${orden || 1}_${Date.now()}`;

    console.log(`[CLOUDINARY] Subiendo foto con preset "${UPLOAD_PRESET}", public_id: ${publicId}`);

    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          upload_preset: UPLOAD_PRESET,
          public_id: publicId,
          resource_type: 'image',
          tags: ['provial_app', `situacion_${situacionId}`]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    // Generar URL de thumbnail
    const thumbnailUrl = cloudinary.url(result.public_id, {
      width: 300,
      height: 200,
      crop: 'fill',
      format: 'jpg',
      quality: 'auto'
    });

    console.log(`[CLOUDINARY] ✅ Foto subida: ${result.secure_url}`);

    return {
      success: true,
      url: result.secure_url,
      thumbnailUrl,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      size: result.bytes
    };
  } catch (error: any) {
    console.error('[CLOUDINARY] ❌ Error subiendo foto:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Subir video desde buffer a Cloudinary usando el preset provial_upload
 * Retorna URL pública del video
 */
export async function uploadVideoBuffer(
  buffer: Buffer,
  situacionId: number,
  codigoSituacion?: string
): Promise<{
  success: boolean;
  url?: string;
  publicId?: string;
  size?: number;
  duration?: number;
  error?: string;
}> {
  // Solo necesitamos cloud_name para unsigned uploads
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return { success: false, error: 'CLOUDINARY_CLOUD_NAME no está configurado' };
  }

  try {
    // Nombre según convención:
    // Con código: 20260121-1-030-70-86-50-4_V1 (fecha-sede-unidad-tipo-ruta-km-num_Video)
    // Sin código: SIT_32_V1_1769436762168 (fallback con ID)
    const publicId = codigoSituacion
      ? `${codigoSituacion}_V1`
      : `SIT_${situacionId}_V1_${Date.now()}`;

    console.log(`[CLOUDINARY] Subiendo video con preset "${UPLOAD_PRESET}", public_id: ${publicId}`);

    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          upload_preset: UPLOAD_PRESET,
          public_id: publicId,
          resource_type: 'video',
          tags: ['provial_app', `situacion_${situacionId}`]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    console.log(`[CLOUDINARY] ✅ Video subido: ${result.secure_url}`);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      size: result.bytes,
      duration: result.duration
    };
  } catch (error: any) {
    console.error('[CLOUDINARY] ❌ Error subiendo video:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Eliminar archivo de Cloudinary por URL
 */
export async function deleteByUrl(url: string): Promise<boolean> {
  try {
    // Extraer public_id de la URL de Cloudinary
    // URL format: https://res.cloudinary.com/cloud_name/image/upload/v123/folder/public_id.ext
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
    if (!match) {
      console.warn('[CLOUDINARY] No se pudo extraer public_id de URL:', url);
      return false;
    }
    const publicId = match[1];
    return await deleteFile(publicId);
  } catch (error) {
    console.error('[CLOUDINARY] Error eliminando por URL:', error);
    return false;
  }
}

export { cloudinary };
