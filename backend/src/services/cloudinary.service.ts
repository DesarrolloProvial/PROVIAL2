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

// Verificar si Cloudinary esta configurado
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export { cloudinary };
