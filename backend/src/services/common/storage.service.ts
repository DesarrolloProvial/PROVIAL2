/**
 * Servicio de Almacenamiento Abstracto
 *
 * Actualmente usa almacenamiento local (filesystem)
 * Diseñado para migrar fácilmente a Cloudflare R2 o AWS S3
 *
 * Para migrar a R2, solo cambiar la implementación de los métodos
 * sin cambiar la interfaz
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

// Configuración desde variables de entorno
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local'; // 'local' | 'r2' | 's3'
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const BASE_URL = process.env.STORAGE_BASE_URL || 'http://localhost:3000/uploads';

// Configuración de compresión (optimizada para balance calidad/tamaño)
const IMAGE_CONFIG = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 75,          // Calidad JPEG (1-100)
  thumbnailSize: 200,   // Tamaño del thumbnail
  thumbnailQuality: 60,
  // Tipos MIME permitidos
  allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  // Tamaño máximo antes de compresión (20MB)
  maxSizeBytes: 20 * 1024 * 1024
};

const VIDEO_CONFIG = {
  maxDurationSeconds: 30,
  maxSizeMB: 10,
  // Tipos MIME permitidos
  allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/3gpp']
};

export interface UploadResult {
  success: boolean;
  url?: string;
  thumbnailUrl?: string;
  filename?: string;
  size?: number;
  width?: number;
  height?: number;
  error?: string;
}

export interface StorageFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

/**
 * Genera un nombre único y seguro para el archivo
 * - Incluye ID de situación para facilitar búsqueda
 * - Timestamp para ordenamiento cronológico
 * - Random hash para evitar colisiones y ataques
 * - Extensión normalizada (.jpg para imágenes, .mp4 para videos)
 */
function generateFilename(situacionId: number, type: 'photo' | 'video'): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString('hex');
  const ext = type === 'photo' ? '.jpg' : '.mp4';
  return `sit${situacionId}_${timestamp}_${random}${ext}`;
}

/**
 * Asegura que el directorio existe con permisos correctos
 */
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o755 });
  }
}

/**
 * Valida que el archivo es una imagen válida
 */
async function validateImage(buffer: Buffer, mimetype: string): Promise<{ valid: boolean; error?: string }> {
  // Validar MIME type
  if (!IMAGE_CONFIG.allowedMimeTypes.includes(mimetype.toLowerCase())) {
    return { valid: false, error: `Tipo de archivo no permitido: ${mimetype}. Permitidos: ${IMAGE_CONFIG.allowedMimeTypes.join(', ')}` };
  }

  // Validar tamaño
  if (buffer.length > IMAGE_CONFIG.maxSizeBytes) {
    return { valid: false, error: `Imagen muy grande (${(buffer.length / 1024 / 1024).toFixed(1)}MB). Máximo: ${IMAGE_CONFIG.maxSizeBytes / 1024 / 1024}MB` };
  }

  // Validar que es una imagen real usando sharp
  try {
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      return { valid: false, error: 'No se pudo procesar la imagen' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'El archivo no es una imagen válida' };
  }
}

/**
 * Valida que el archivo es un video válido
 */
function validateVideo(buffer: Buffer, mimetype: string): { valid: boolean; error?: string } {
  // Validar MIME type
  if (!VIDEO_CONFIG.allowedMimeTypes.includes(mimetype.toLowerCase())) {
    return { valid: false, error: `Tipo de archivo no permitido: ${mimetype}. Permitidos: ${VIDEO_CONFIG.allowedMimeTypes.join(', ')}` };
  }

  // Validar tamaño
  const sizeMB = buffer.length / (1024 * 1024);
  if (sizeMB > VIDEO_CONFIG.maxSizeMB) {
    return { valid: false, error: `Video muy grande (${sizeMB.toFixed(1)}MB). Máximo: ${VIDEO_CONFIG.maxSizeMB}MB` };
  }

  return { valid: true };
}

/**
 * Comprime y redimensiona una imagen
 * - Mantiene aspect ratio
 * - Convierte a JPEG para consistencia
 * - Optimiza para web
 */
async function compressImage(buffer: Buffer): Promise<{ buffer: Buffer; width: number; height: number }> {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  // Auto-rotar según EXIF
  const processed = image.rotate();

  // Redimensionar manteniendo aspect ratio
  const resized = await processed
    .resize(IMAGE_CONFIG.maxWidth, IMAGE_CONFIG.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({
      quality: IMAGE_CONFIG.quality,
      progressive: true,  // JPEG progresivo para carga más rápida
      mozjpeg: true       // Usar mozjpeg para mejor compresión
    })
    .toBuffer({ resolveWithObject: true });

  console.log(`[STORAGE] Imagen comprimida: ${metadata.width}x${metadata.height} -> ${resized.info.width}x${resized.info.height}, ${(resized.data.length / 1024).toFixed(0)}KB`);

  return {
    buffer: resized.data,
    width: resized.info.width,
    height: resized.info.height
  };
}

/**
 * Genera un thumbnail cuadrado de la imagen
 */
async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate() // Auto-rotar según EXIF
    .resize(IMAGE_CONFIG.thumbnailSize, IMAGE_CONFIG.thumbnailSize, {
      fit: 'cover',
      position: 'centre'
    })
    .jpeg({
      quality: IMAGE_CONFIG.thumbnailQuality,
      progressive: true
    })
    .toBuffer();
}

/**
 * Sube una foto con compresión automática
 */
export async function uploadPhoto(
  file: StorageFile,
  situacionId: number
): Promise<UploadResult> {
  try {
    // Validar archivo
    const validation = await validateImage(file.buffer, file.mimetype);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Comprimir imagen
    const { buffer: compressedBuffer, width, height } = await compressImage(file.buffer);

    // Generar thumbnail desde imagen comprimida (más eficiente)
    const thumbnailBuffer = await generateThumbnail(compressedBuffer);

    // Generar nombres de archivo seguros
    const filename = generateFilename(situacionId, 'photo');
    const thumbnailFilename = `thumb_${filename}`;

    if (STORAGE_TYPE === 'local') {
      // Almacenamiento local
      const photosDir = path.join(UPLOADS_DIR, 'fotos');
      const thumbsDir = path.join(UPLOADS_DIR, 'thumbnails');

      ensureDir(photosDir);
      ensureDir(thumbsDir);

      const photoPath = path.join(photosDir, filename);
      const thumbPath = path.join(thumbsDir, thumbnailFilename);

      // Escribir archivos de forma atómica (write to temp, then rename)
      const tempPhotoPath = `${photoPath}.tmp`;
      const tempThumbPath = `${thumbPath}.tmp`;

      fs.writeFileSync(tempPhotoPath, compressedBuffer);
      fs.writeFileSync(tempThumbPath, thumbnailBuffer);

      fs.renameSync(tempPhotoPath, photoPath);
      fs.renameSync(tempThumbPath, thumbPath);

      console.log(`[STORAGE] Foto guardada: ${filename} (${(compressedBuffer.length / 1024).toFixed(0)}KB)`);

      return {
        success: true,
        url: `${BASE_URL}/fotos/${filename}`,
        thumbnailUrl: `${BASE_URL}/thumbnails/${thumbnailFilename}`,
        filename,
        size: compressedBuffer.length,
        width,
        height
      };
    } else if (STORAGE_TYPE === 'r2') {
      // TODO: Implementar Cloudflare R2
      // import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
      // const r2 = new S3Client({
      //   region: 'auto',
      //   endpoint: process.env.R2_ENDPOINT,
      //   credentials: {
      //     accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      //     secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
      //   }
      // });
      // await r2.send(new PutObjectCommand({
      //   Bucket: process.env.R2_BUCKET_NAME,
      //   Key: `fotos/${filename}`,
      //   Body: compressedBuffer,
      //   ContentType: 'image/jpeg'
      // }));
      return { success: false, error: 'Cloudflare R2 no implementado aún. Configurar credenciales en .env' };
    }

    return { success: false, error: 'Tipo de almacenamiento no soportado' };
  } catch (error: any) {
    console.error('[STORAGE] Error al subir foto:', error);
    return { success: false, error: `Error interno: ${error.message}` };
  }
}

/**
 * Sube un video (sin compresión server-side, validación solamente)
 * La compresión de video se hace en el cliente para mejor UX
 */
export async function uploadVideo(
  file: StorageFile,
  situacionId: number
): Promise<UploadResult> {
  try {
    // Validar archivo
    const validation = validateVideo(file.buffer, file.mimetype);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Generar nombre de archivo seguro
    const filename = generateFilename(situacionId, 'video');

    if (STORAGE_TYPE === 'local') {
      const videosDir = path.join(UPLOADS_DIR, 'videos');
      ensureDir(videosDir);

      const videoPath = path.join(videosDir, filename);

      // Escribir de forma atómica
      const tempPath = `${videoPath}.tmp`;
      fs.writeFileSync(tempPath, file.buffer);
      fs.renameSync(tempPath, videoPath);

      console.log(`[STORAGE] Video guardado: ${filename} (${(file.buffer.length / 1024 / 1024).toFixed(1)}MB)`);

      return {
        success: true,
        url: `${BASE_URL}/videos/${filename}`,
        filename,
        size: file.buffer.length
      };
    } else if (STORAGE_TYPE === 'r2') {
      return { success: false, error: 'Cloudflare R2 no implementado aún' };
    }

    return { success: false, error: 'Tipo de almacenamiento no soportado' };
  } catch (error: any) {
    console.error('[STORAGE] Error al subir video:', error);
    return { success: false, error: `Error interno: ${error.message}` };
  }
}

/**
 * Elimina un archivo del storage
 */
export async function deleteFile(url: string): Promise<boolean> {
  try {
    if (STORAGE_TYPE === 'local') {
      // Validar que la URL pertenece a nuestro storage
      if (!url.startsWith(BASE_URL)) {
        console.error('[STORAGE] Intento de eliminar archivo fuera del storage:', url);
        return false;
      }

      // Extraer el path del archivo de la URL
      const relativePath = url.replace(BASE_URL, '');
      const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
      const fullPath = path.join(UPLOADS_DIR, safePath);

      // Validar que el path está dentro de UPLOADS_DIR (prevenir path traversal)
      if (!fullPath.startsWith(UPLOADS_DIR)) {
        console.error('[STORAGE] Path traversal detectado:', fullPath);
        return false;
      }

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('[STORAGE] Archivo eliminado:', fullPath);
        return true;
      }
    } else if (STORAGE_TYPE === 'r2') {
      // TODO: Implementar delete en R2
      // await r2.send(new DeleteObjectCommand({ Bucket, Key }));
    }
    return false;
  } catch (error) {
    console.error('[STORAGE] Error al eliminar archivo:', error);
    return false;
  }
}

/**
 * Obtiene estadísticas del almacenamiento
 */
export function getStorageStats(): {
  type: string;
  photosCount: number;
  videosCount: number;
  thumbnailsCount: number;
  totalSizeMB: number;
  breakdown: {
    photos: number;
    videos: number;
    thumbnails: number;
  };
} {
  if (STORAGE_TYPE === 'local') {
    const photosDir = path.join(UPLOADS_DIR, 'fotos');
    const videosDir = path.join(UPLOADS_DIR, 'videos');
    const thumbsDir = path.join(UPLOADS_DIR, 'thumbnails');

    let photosCount = 0, videosCount = 0, thumbsCount = 0;
    let photosSize = 0, videosSize = 0, thumbsSize = 0;

    if (fs.existsSync(photosDir)) {
      const photos = fs.readdirSync(photosDir).filter(f => !f.endsWith('.tmp'));
      photosCount = photos.length;
      photos.forEach(file => {
        try {
          photosSize += fs.statSync(path.join(photosDir, file)).size;
        } catch { /* ignorar archivos inaccesibles */ }
      });
    }

    if (fs.existsSync(videosDir)) {
      const videos = fs.readdirSync(videosDir).filter(f => !f.endsWith('.tmp'));
      videosCount = videos.length;
      videos.forEach(file => {
        try {
          videosSize += fs.statSync(path.join(videosDir, file)).size;
        } catch { /* ignorar archivos inaccesibles */ }
      });
    }

    if (fs.existsSync(thumbsDir)) {
      const thumbs = fs.readdirSync(thumbsDir).filter(f => !f.endsWith('.tmp'));
      thumbsCount = thumbs.length;
      thumbs.forEach(file => {
        try {
          thumbsSize += fs.statSync(path.join(thumbsDir, file)).size;
        } catch { /* ignorar archivos inaccesibles */ }
      });
    }

    const totalSize = photosSize + videosSize + thumbsSize;

    return {
      type: 'local',
      photosCount,
      videosCount,
      thumbnailsCount: thumbsCount,
      totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
      breakdown: {
        photos: Math.round(photosSize / (1024 * 1024) * 100) / 100,
        videos: Math.round(videosSize / (1024 * 1024) * 100) / 100,
        thumbnails: Math.round(thumbsSize / (1024 * 1024) * 100) / 100
      }
    };
  }

  return {
    type: STORAGE_TYPE,
    photosCount: 0,
    videosCount: 0,
    thumbnailsCount: 0,
    totalSizeMB: 0,
    breakdown: { photos: 0, videos: 0, thumbnails: 0 }
  };
}

/**
 * Limpia archivos temporales huérfanos (más de 1 hora de antigüedad)
 */
export function cleanupTempFiles(): number {
  let cleaned = 0;
  const oneHourAgo = Date.now() - (60 * 60 * 1000);

  const dirs = ['fotos', 'videos', 'thumbnails'];

  dirs.forEach(dir => {
    const dirPath = path.join(UPLOADS_DIR, dir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.tmp'));
      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.mtimeMs < oneHourAgo) {
            fs.unlinkSync(filePath);
            cleaned++;
          }
        } catch { /* ignorar */ }
      });
    }
  });

  if (cleaned > 0) {
    console.log(`[STORAGE] Limpiados ${cleaned} archivos temporales`);
  }

  return cleaned;
}

export default {
  uploadPhoto,
  uploadVideo,
  deleteFile,
  getStorageStats,
  cleanupTempFiles,
  IMAGE_CONFIG,
  VIDEO_CONFIG
};
