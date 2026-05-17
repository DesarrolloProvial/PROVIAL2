import { MultimediaRef } from './draftStorage';
import { uploadEntityPhoto, uploadEntityVideo } from './multimedia.service';

// URI especial usada por MultimediaWrapper para persistir infografías vacías.
// Nunca representa un archivo real — debe filtrarse antes de cualquier upload.
export const PLACEHOLDER_URI = 'infografia://placeholder';

export interface UploadInfografiasParams {
  entityType: 'situacion' | 'actividad';
  entityId: number;
  mediaRefs: MultimediaRef[];
  maxInfografias?: number;
}

export interface UploadInfografiasResult {
  uploaded: number;
  failed: number;
  errors: Array<{ uri: string; infografia_numero?: number; tipo: string; error: string }>;
}

/**
 * Sube las infografías de una entidad (situacion o actividad) al backend.
 * El backend decide si guarda en Cloudinary, almacenamiento local u otro storage.
 *
 * Reglas:
 * - Ignora refs ya subidas (uri http) o con estado SUBIDO
 * - Respeta el límite de infografías (maxInfografias)
 * - Preserva infografia_numero, infografia_titulo y orden
 * - Registra errores por archivo con contexto diagnóstico
 */
export async function uploadInfografias({
  entityType,
  entityId,
  mediaRefs,
  maxInfografias = 10,
}: UploadInfografiasParams): Promise<UploadInfografiasResult> {
  if (!mediaRefs || mediaRefs.length === 0) return { uploaded: 0, failed: 0, errors: [] };

  // Solo refs pendientes: uri local real (no placeholder, no http, no ya subida)
  const pendingRefs = mediaRefs.filter(
    r =>
      !!r.uri &&
      !r.uri.startsWith('http') &&
      !r.uri.startsWith('infografia://') &&
      r.estado !== 'SUBIDO'
  );

  if (pendingRefs.length === 0) return { uploaded: 0, failed: 0, errors: [] };

  // Respetar límite de infografías tomando las primeras N por número
  const infNums = [...new Set(pendingRefs.map(r => r.infografia_numero ?? 1))].sort((a, b) => a - b);
  const allowed = new Set(infNums.slice(0, maxInfografias));
  const filteredRefs = pendingRefs.filter(r => allowed.has(r.infografia_numero ?? 1));

  let uploaded = 0;
  const errors: UploadInfografiasResult['errors'] = [];

  for (const ref of filteredRefs) {
    const mediaFile = {
      uri: ref.uri,
      type: ref.tipo === 'VIDEO' ? 'video' as const : 'image' as const,
      fileName: ref.tipo === 'VIDEO' ? `video_${Date.now()}.mp4` : `foto_${Date.now()}.jpg`,
      mimeType: ref.tipo === 'VIDEO' ? 'video/mp4' : 'image/jpeg',
    };

    const location =
      ref.latitud != null && ref.longitud != null
        ? { latitude: ref.latitud, longitude: ref.longitud }
        : undefined;

    try {
      let result;
      if (ref.tipo === 'VIDEO') {
        result = await uploadEntityVideo(entityType, entityId, mediaFile, location, {
          infografia_numero: ref.infografia_numero,
          infografia_titulo: ref.infografia_titulo,
          duracion_segundos: ref.duracion_segundos,
        });
      } else {
        result = await uploadEntityPhoto(entityType, entityId, mediaFile, location, {
          infografia_numero: ref.infografia_numero,
          infografia_titulo: ref.infografia_titulo,
          orden: ref.orden,
        });
      }

      if (result.success) {
        uploaded++;
      } else {
        console.warn('[MULTIMEDIA] Fallo al subir archivo', {
          entityType, entityId,
          uri: ref.uri, tipo: ref.tipo,
          infografia_numero: ref.infografia_numero, orden: ref.orden,
          error: result.error,
        });
        errors.push({
          uri: ref.uri,
          infografia_numero: ref.infografia_numero,
          tipo: ref.tipo,
          error: result.error || 'Error desconocido',
        });
      }
    } catch (err: any) {
      console.warn('[MULTIMEDIA] Error inesperado al subir', {
        entityType, entityId,
        uri: ref.uri, tipo: ref.tipo,
        infografia_numero: ref.infografia_numero,
        error: err.message,
      });
      errors.push({
        uri: ref.uri,
        infografia_numero: ref.infografia_numero,
        tipo: ref.tipo,
        error: err.message || 'Error inesperado',
      });
    }
  }

  return { uploaded, failed: errors.length, errors };
}

/**
 * @deprecated Usar uploadInfografias({ entityType: 'situacion', entityId, mediaRefs, maxInfografias: 10 })
 */
export async function uploadSituacionMultimedia(situacionId: number, mediaRefs: MultimediaRef[]) {
  const result = await uploadInfografias({ entityType: 'situacion', entityId: situacionId, mediaRefs, maxInfografias: 10 });
  if (result.uploaded === 0 && result.failed > 0) throw new Error('No se pudieron subir los archivos multimedia');
  return { uploaded: result.uploaded, failed: result.failed };
}

/**
 * @deprecated Usar uploadInfografias({ entityType: 'actividad', entityId, mediaRefs, maxInfografias: 3 })
 */
export async function uploadActividadMultimedia(actividadId: number, mediaRefs: MultimediaRef[]) {
  const result = await uploadInfografias({ entityType: 'actividad', entityId: actividadId, mediaRefs, maxInfografias: 3 });
  if (result.uploaded === 0 && result.failed > 0) throw new Error('No se pudieron subir los archivos multimedia');
  return { uploaded: result.uploaded, failed: result.failed };
}
