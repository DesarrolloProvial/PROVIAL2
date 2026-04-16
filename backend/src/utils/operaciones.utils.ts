/**
 * Helper de contexto operativo.
 *
 * `resolveContextoActivo` resuelve el trío {unidad_id, salida_id, ruta_id}
 * a partir de pistas parciales del request y el userId del solicitante.
 * Es solo lectura: no escribe nada. Cada controller decide qué hacer con
 * el contexto resultante (cerrar estado anterior, crear nuevo registro, etc.)
 */

import { db } from '../config/database';

export interface ContextoActivo {
  unidad_id: number | null;
  salida_id: number | null;
  ruta_id:   number | null;
}

export interface ContextoHints {
  unidad_id?:        number | null;
  salida_unidad_id?: number | null;
  ruta_id?:          number | null;
}

/**
 * Resuelve el contexto activo de una unidad.
 *
 * Estrategia:
 *  1. Si se recibe `unidad_id` → busca su salida EN_SALIDA para completar salida_id/ruta_id.
 *  2. Si NO se recibe `unidad_id` → busca via tripulacion_turno del usuario para obtener
 *     unidad_id, salida_id y ruta_id en un solo JOIN.
 *
 * Los hints del caller tienen precedencia: si `salida_unidad_id` o `ruta_id` ya vienen
 * en el body no se sobreescriben con los valores del turno/salida.
 *
 * Manejo de errores:
 *  - Fallo de BD → se loguea y relanza para que el controller retorne 500.
 *  - Sin contexto encontrado (no turno, no salida) → devuelve unidad_id: null.
 *    El controller es responsable de interpretar ese null y responder 412.
 */
export async function resolveContextoActivo(
  userId: number,
  hints: ContextoHints = {},
): Promise<ContextoActivo> {
  let unidad_id = hints.unidad_id        ?? null;
  let salida_id = hints.salida_unidad_id ?? null;
  let ruta_id   = hints.ruta_id          ?? null;

  try {
    if (unidad_id) {
      // Completar salida y ruta desde la salida activa de la unidad conocida
      if (!salida_id || !ruta_id) {
        const salida = await db.oneOrNone<{ id: number; ruta_id: number | null }>(
          `SELECT id, ruta_inicial_id AS ruta_id
           FROM salida_unidad
           WHERE unidad_id = $1 AND estado = 'EN_SALIDA'
           LIMIT 1`,
          [unidad_id],
        );
        if (salida) {
          if (!salida_id) salida_id = salida.id;
          if (!ruta_id)   ruta_id   = salida.ruta_id;
        }
      }
    } else {
      // Resolver todo via tripulacion_turno del usuario
      const turno = await db.oneOrNone<{
        unidad_id: number;
        salida_id: number;
        ruta_id: number | null;
      }>(
        `SELECT au.unidad_id,
                su.id              AS salida_id,
                su.ruta_inicial_id AS ruta_id
         FROM   tripulacion_turno  tt
         JOIN   asignacion_unidad  au ON tt.asignacion_id = au.id
         JOIN   salida_unidad      su ON au.unidad_id = su.unidad_id AND su.estado = 'EN_SALIDA'
         WHERE  tt.usuario_id = $1
         LIMIT  1`,
        [userId],
      );
      if (turno) {
        unidad_id = turno.unidad_id;
        if (!salida_id) salida_id = turno.salida_id;
        if (!ruta_id)   ruta_id   = turno.ruta_id;
      }
    }
  } catch (err: any) {
    console.error('[resolveContextoActivo] Error consultando contexto operativo:', {
      userId,
      hints,
      error: err.message,
    });
    throw new Error(`Error al resolver el contexto operativo: ${err.message}`);
  }

  return { unidad_id, salida_id, ruta_id };
}
