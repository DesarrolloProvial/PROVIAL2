import api from './api';
import { MultimediaRef } from './draftStorage';
import { uploadMultimedia } from './cloudinaryUpload';

/**
 * Sync multimedia for a situation
 * 1. Uploads files to Cloudinary
 * 2. Saves references to backend with infografia metadata
 */
export async function uploadSituacionMultimedia(situacionId: number, mediaRefs: MultimediaRef[]) {
    if (!mediaRefs || mediaRefs.length === 0) return { uploaded: 0, failed: 0 };

    console.log(`[SYNC] Iniciando carga de ${mediaRefs.length} archivos para situación ${situacionId}`);

    // 1. Upload to Cloudinary using offline-first strategy (signed uploads)
    const { uploaded, failed } = await uploadMultimedia(situacionId.toString(), mediaRefs, (current, total) => {
        console.log(`[SYNC] Progreso Cloudinary: ${current}/${total}`);
    });

    if (uploaded.length === 0) {
        if (failed.length > 0) {
            console.error('[SYNC] Falló la carga de todos los archivos a Cloudinary');
            throw new Error('No se pudieron subir los archivos multimedia');
        }
        return { uploaded: 0, failed: 0 };
    }

    // 2. Prepare payload for backend batch sync
    // Merge uploaded results with original metadata (infografia info)
    const archivos = uploaded.map(item => {
        const original = mediaRefs.find(r => r.uri === item.localUri);
        return {
            url: item.cloudinaryUrl,
            public_id: item.publicId,
            tipo: original?.tipo,
            orden: original?.orden,
            infografia_numero: original?.infografia_numero,
            infografia_titulo: original?.infografia_titulo
        };
    });

    // 3. Send to backend to save references
    console.log(`[SYNC] Guardando ${archivos.length} referencias en backend...`);
    await api.post(`/multimedia/situacion/${situacionId}/batch`, { archivos });

    console.log(`[SYNC] Completado. Subidos: ${uploaded.length}, Fallidos: ${failed.length}`);
    return { uploaded: uploaded.length, failed: failed.length };
}
