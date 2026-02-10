// utils/infografiaValidation.ts
// Validaciones para el sistema de infografías

import { Infografia, INFOGRAFIA_LIMITS } from '../types/multimedia';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

/**
 * Valida una infografía individual
 */
export function validateInfografia(infografia: Infografia): ValidationResult {
    const errors: string[] = [];

    // Validar título
    if (!infografia.titulo || infografia.titulo.trim() === '') {
        errors.push('El título es obligatorio');
    }

    if (infografia.titulo && infografia.titulo.length > 100) {
        errors.push('El título no puede exceder 100 caracteres');
    }

    // Validar fotos
    if (infografia.fotos.length < INFOGRAFIA_LIMITS.minFotos) {
        errors.push(`Se requiere al menos ${INFOGRAFIA_LIMITS.minFotos} foto`);
    }

    if (infografia.fotos.length > INFOGRAFIA_LIMITS.maxFotos) {
        errors.push(`No se pueden agregar más de ${INFOGRAFIA_LIMITS.maxFotos} fotos`);
    }

    // Validar video
    if (!infografia.video) {
        errors.push('Se requiere 1 video');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Valida todas las infografías de una situación
 */
export function validateTodasInfografias(infografias: Infografia[]): ValidationResult {
    const errors: string[] = [];

    // Debe haber al menos 1 infografía
    if (infografias.length === 0) {
        errors.push('Se requiere al menos una infografía');
        return { isValid: false, errors };
    }

    // Validar cada infografía
    infografias.forEach((inf, idx) => {
        const validation = validateInfografia(inf);
        if (!validation.isValid) {
            validation.errors.forEach(error => {
                errors.push(`Infografía ${idx + 1} "${inf.titulo}": ${error}`);
            });
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Verifica si se puede agregar más fotos a una infografía
 */
export function canAddFoto(infografia: Infografia): boolean {
    return infografia.fotos.length < INFOGRAFIA_LIMITS.maxFotos;
}

/**
 * Verifica si se puede agregar un video a una infografía
 */
export function canAddVideo(infografia: Infografia): boolean {
    return !infografia.video;
}

/**
 * Obtiene el siguiente orden disponible para una foto
 */
export function getNextFotoOrden(infografia: Infografia): number {
    if (infografia.fotos.length === 0) {
        return 1;
    }

    const maxOrden = Math.max(...infografia.fotos.map(f => f.orden));
    return maxOrden + 1;
}

/**
 * Crea una nueva infografía vacía
 */
export function createNewInfografia(
    existingInfografias: Infografia[]
): Infografia {
    const safeInfografias = Array.isArray(existingInfografias) ? existingInfografias : [];

    const maxNumero = safeInfografias.length > 0
        ? Math.max(...safeInfografias.map(i => i.numero))
        : 0;

    return {
        numero: maxNumero + 1,
        titulo: `Infografía ${maxNumero + 1}`,
        fotos: [],
        video: null,
        created_at: new Date().toISOString(),
    };
}
