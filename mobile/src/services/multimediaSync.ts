import api from './api';
import { MultimediaRef } from './draftStorage';
import { uploadMultimedia, getSignedUploadParams, uploadToCloudinary } from './cloudinaryUpload';

/**
 * Sync multimedia for a situation
 * 1. Uploads files to Cloudinary
 * 2. Saves references to backend with infografia metadata
 */
export async function uploadSituacionMultimedia(situacionId: number, mediaRefs: MultimediaRef[]) {
    if (!mediaRefs || mediaRefs.length === 0) return { uploaded: 0, failed: 0 };


    // 1. Upload to Cloudinary using offline-first strategy (signed uploads)
    const { uploaded, failed } = await uploadMultimedia(situacionId.toString(), mediaRefs, (current, total) => {
    });

    if (uploaded.length === 0) {
        if (failed.length > 0) {
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
    await api.post(`/multimedia/situacion/${situacionId}/batch`, { archivos });

    return { uploaded: uploaded.length, failed: failed.length };
}

export async function uploadActividadMultimedia(actividadId: number, mediaRefs: MultimediaRef[]) {
    if (!mediaRefs || mediaRefs.length === 0) return { uploaded: 0, failed: 0 };

    // Max 3 infografías por actividad: tomar solo las primeras 3 por número
    const infografiaNumbers = [...new Set(mediaRefs.map(r => r.infografia_numero ?? 1))].sort((a, b) => a - b);
    const allowedInfografias = new Set(infografiaNumbers.slice(0, 3));
    const filteredRefs = mediaRefs.filter(r => allowedInfografias.has(r.infografia_numero ?? 1));

    const uploaded: Array<{ localUri: string; cloudinaryUrl: string; publicId: string }> = [];
    const failed: Array<{ localUri: string; error: string }> = [];

    for (let i = 0; i < filteredRefs.length; i++) {
        const media = filteredRefs[i];
        try {
            const fileType = media.tipo === 'VIDEO' ? 'video' : 'image';
            const infografiaNum = media.infografia_numero ?? 1;
            const index = media.orden ?? (i + 1);
            const publicId = `actividad_${actividadId}_I${infografiaNum}_${media.tipo}_${index}`;

            const signedParams = await getSignedUploadParams(
                `actividad_${actividadId}`,
                fileType,
                publicId,
                `provial/actividades/${actividadId}`,
                'actividad,provial_app'
            );

            const result = await uploadToCloudinary(media.uri, signedParams, fileType);

            if (result.success && result.secureUrl) {
                uploaded.push({ localUri: media.uri, cloudinaryUrl: result.secureUrl, publicId: result.publicId! });
            } else {
                failed.push({ localUri: media.uri, error: result.error || 'Error desconocido' });
            }
        } catch (error: any) {
            failed.push({ localUri: media.uri, error: error.message || 'Error al procesar' });
        }
    }

    if (uploaded.length === 0) {
        if (failed.length > 0) throw new Error('No se pudieron subir los archivos multimedia');
        return { uploaded: 0, failed: 0 };
    }

    const archivos = uploaded.map(item => {
        const original = filteredRefs.find(r => r.uri === item.localUri);
        return {
            url: item.cloudinaryUrl,
            public_id: item.publicId,
            tipo: original?.tipo,
            orden: original?.orden,
            infografia_numero: original?.infografia_numero,
            infografia_titulo: original?.infografia_titulo,
        };
    });

    await api.post(`/multimedia/actividad/${actividadId}/batch`, { archivos });
    return { uploaded: uploaded.length, failed: failed.length };
}
