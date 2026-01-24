/**
 * Configuración de Cloudinary
 * 
 * Se utiliza para subir evidencias multimedia de manera offline-first.
 */

export const CLOUDINARY_CONFIG = {
    cloudName: 'dacy331gn',      // Actualizado
    uploadPreset: 'provial_upload',   // Configurado
    folder: 'provial_evidencias',     // Configurado en el preset
};

/**
 * Genera la URL de subida basada en el tipo de recurso
 */
export const getCloudinaryUrl = (resourceType: 'image' | 'video' = 'image') => {
    return `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${resourceType}/upload`;
};
