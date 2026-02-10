// utils/multimediaFilename.ts
// Utilidades para generar nombres deterministas de archivos multimedia

interface GenerateFilenameParams {
    situacionId: string;
    infografiaNumero: number;
    tipo: 'FOTO' | 'VIDEO';
    orden?: number;
}

/**
 * Genera un nombre de archivo determinista para multimedia
 * Formato: {situacionId}_I{infografiaNumero}_F{orden} o _V
 * 
 * @example
 * generateMultimediaFilename({
 *   situacionId: '20260207-1-002-50-73-53-0',
 *   infografiaNumero: 2,
 *   tipo: 'FOTO',
 *   orden: 1
 * })
 * // => "20260207-1-002-50-73-53-0_I2_F1"
 */
export function generateMultimediaFilename(params: GenerateFilenameParams): string {
    const { situacionId, infografiaNumero, tipo, orden } = params;

    if (tipo === 'FOTO') {
        if (!orden || orden < 1 || orden > 3) {
            throw new Error('Orden de foto debe estar entre 1 y 3');
        }
        return `${situacionId}_I${infografiaNumero}_F${orden}`;
    } else {
        return `${situacionId}_I${infografiaNumero}_V`;
    }
}

/**
 * Extrae información de un nombre de archivo multimedia
 * 
 * @example
 * parseMultimediaFilename('20260207-1-002-50-73-53-0_I2_F1.jpg')
 * // => { situacionId: '20260207-1-002-50-73-53-0', infografiaNumero: 2, tipo: 'FOTO', orden: 1 }
 */
export function parseMultimediaFilename(filename: string): {
    situacionId: string;
    infografiaNumero: number;
    tipo: 'FOTO' | 'VIDEO';
    orden?: number;
} | null {
    // Remover extensión
    const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|mp4|mov)$/i, '');

    // Pattern: {situacionId}_I{num}_F{orden} o _V
    const pattern = /^(.+)_I(\d+)_(F(\d+)|V)$/;
    const match = nameWithoutExt.match(pattern);

    if (!match) {
        return null;
    }

    const [, situacionId, infografiaNum, tipoStr, ordenStr] = match;
    const infografiaNumero = parseInt(infografiaNum, 10);

    if (tipoStr.startsWith('F')) {
        return {
            situacionId,
            infografiaNumero,
            tipo: 'FOTO',
            orden: parseInt(ordenStr, 10),
        };
    } else {
        return {
            situacionId,
            infografiaNumero,
            tipo: 'VIDEO',
        };
    }
}
