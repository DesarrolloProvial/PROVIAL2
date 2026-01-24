/**
 * Servicio de Subida Multimedia a Cloudinary
 * 
 * Se encarga de subir archivos locales a Cloudinary usando Signed Uploads (Seguro).
 * 
 * Flujo:
 * 1. Solicitar firma al backend (autenticado).
 * 2. Usar la firma para subir directamente a Cloudinary desde el móvil.
 */

import * as FileSystem from 'expo-file-system';
import { CLOUDINARY_CONFIG, getCloudinaryUrl } from '../config/cloudinary';
import api from './api';

interface UploadParams {
    uri: string;
    type: 'image' | 'video';
    publicId: string;    // Nombre final del archivo (sin extensión)
    tags: string[];      // Etiquetas para retención y filtros
    folder?: string;     // Carpeta específica (ej: "04" para hechos)
}

interface CloudinaryResponse {
    secure_url: string;
    public_id: string;
    format: string;
    // ... otros campos
}

/**
 * Sube un archivo a Cloudinary usando Signed Upload
 */
export const uploadMediaToCloudinary = async ({
    uri,
    type,
    publicId,
    tags,
    folder
}: UploadParams): Promise<CloudinaryResponse | null> => {
    try {
        console.log(`[Cloudinary] Solicitando firma para ${publicId}...`);

        // 1. Obtener firma del backend (asegurado con token de sesión)
        // El backend espera draftUuid, fileType, resourceType y params opcionales
        const signResponse = await api.post('/cloudinary/sign', {
            draftUuid: 'signed_upload_request', // Dummy, el backend usa folder/publicId si vienen
            fileType: type,
            resourceType: type === 'image' ? 'image' : 'video',
            folder: folder ? `${CLOUDINARY_CONFIG.folder}/${folder}` : CLOUDINARY_CONFIG.folder,
            publicId: publicId,
            tags: tags.join(',')
        });

        const signatureData = signResponse.data;

        if (!signatureData.success) {
            console.error('Error obteniendo firma:', signatureData);
            throw new Error('No se pudo obtener la firma del backend');
        }

        console.log(`[Cloudinary] Firma obtenida. Subiendo...`);

        // 2. Subir directamente a Cloudinary con la firma
        // La respuesta del backend trae "instructions" con url y formData listos
        const uploadUrl = signatureData.instructions.url;
        const formData = signatureData.instructions.formData;

        // Convertir formData a objeto Params para uploadAsync
        const params: Record<string, string> = {
            api_key: formData.api_key,
            timestamp: formData.timestamp.toString(),
            signature: formData.signature,
            folder: formData.folder,
            public_id: formData.public_id,
        };

        // Agregar transformación si existe
        if (formData.transformation) {
            params.transformation = formData.transformation;
        }

        // Agregar tags (Cloudinary requiere que vengan en los params firmados o adicionales)
        if (signatureData.tags) {
            params.tags = signatureData.tags;
        }

        const response = await FileSystem.uploadAsync(uploadUrl, uri, {
            // 1 corresponde a MULTIPART en FileSystemUploadType (usamos literal para evitar error de tipos)
            uploadType: 1 as any,
            fieldName: 'file',
            parameters: params,
        });

        if (response.status !== 200) {
            console.error('[Cloudinary] Error en subida:', response.body);
            throw new Error(`Error Cloudinary: ${response.status}`);
        }

        const data = JSON.parse(response.body);
        console.log('[Cloudinary] Subida exitosa:', data.secure_url);

        return data;

    } catch (error) {
        console.error('[Cloudinary] Excepción al subir:', error);
        return null;
    }
};

/**
 * Genera el nombre estandarizado para Cloudinary
 * Formato: CODIGO_BASE_TIPO_INDEX
 */
export const generateCloudinaryName = (
    codigoBase: string, // YYYYMMDD-SEDE-UNIDAD-TIPO-RUTA-KM-SALIDA
    type: 'image' | 'video',
    index: number
): string => {
    const tipoStr = type === 'image' ? 'FOTO' : 'VIDEO';
    // El index se suma 1 para que sea legible (FOTO_1, FOTO_2...)
    return `${codigoBase}_${tipoStr}_${index + 1}`;
};
