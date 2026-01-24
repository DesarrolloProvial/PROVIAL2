/**
 * Generador de ID Determinista para Situaciones
 *
 * Formato: YYYYMMDD-SEDE-UNIDAD-TIPO-RUTA-KM-NUM_SALIDA
 *
 * Ejemplo: 20260121-1-030-70-86-50-4
 *
 * Ventajas:
 * - Unico: Combinacion garantiza unicidad
 * - Determinista: Mismo input = mismo ID
 * - Legible: Humanos pueden entender el ID
 * - Ordenable: Orden cronologico natural
 * - Deteccion duplicados: Mismo ID = misma situacion
 *
 * IMPORTANTE: Sin padding en ningun campo (tal cual como en la BD)
 */

/**
 * Formatea una fecha a YYYYMMDD usando JavaScript nativo
 */
function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Formatea una fecha a YYYY-MM-DD usando JavaScript nativo
 */
function formatDateToYYYYMMDDDashed(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface SituacionIdParams {
  fecha: Date;
  sede_id: number;
  unidad_codigo: string;       // Codigo tal cual: "030", "1131", "M007"
  tipo_situacion_id: number;
  ruta_id: number;
  km: number;
  num_situacion_salida: number; // Numero de esta SALIDA, no del dia
}

/**
 * Genera ID determinista para una situacion
 *
 * @example
 * generateSituacionId({
 *   fecha: new Date('2026-01-21'),
 *   sede_id: 1,
 *   unidad_codigo: "030",
 *   tipo_situacion_id: 70,
 *   ruta_id: 86,
 *   km: 50,
 *   num_situacion_salida: 4
 * });
 * // Resultado: "20260121-1-030-70-86-50-4"
 */
export function generateSituacionId(params: SituacionIdParams): string {
  const fecha = formatDateToYYYYMMDD(params.fecha);
  const sede = String(params.sede_id);              // Sin padding
  const unidad = params.unidad_codigo;              // Tal cual: 030, 1131, M007
  const tipo = String(params.tipo_situacion_id);    // Sin padding
  const ruta = String(params.ruta_id);              // Sin padding
  const km = String(Math.floor(params.km));         // Sin padding, parte entera
  const num = String(params.num_situacion_salida);  // Sin padding

  return `${fecha}-${sede}-${unidad}-${tipo}-${ruta}-${km}-${num}`;
}

/**
 * Parsea un ID de situacion en sus componentes
 * Util para mostrar informacion legible o debuggear
 *
 * @example
 * parseSituacionId("20260121-1-030-70-86-50-4")
 * // Resultado: { fecha: "2026-01-21", sede_id: 1, ... }
 */
export function parseSituacionId(id: string): SituacionIdParams | null {
  try {
    const parts = id.split('-');
    if (parts.length !== 7) return null;

    const [fechaStr, sedeStr, unidadCodigo, tipoStr, rutaStr, kmStr, numStr] = parts;

    // Parsear fecha YYYYMMDD
    const year = parseInt(fechaStr.substring(0, 4));
    const month = parseInt(fechaStr.substring(4, 6)) - 1; // 0-indexed
    const day = parseInt(fechaStr.substring(6, 8));

    return {
      fecha: new Date(year, month, day),
      sede_id: parseInt(sedeStr),
      unidad_codigo: unidadCodigo,
      tipo_situacion_id: parseInt(tipoStr),
      ruta_id: parseInt(rutaStr),
      km: parseInt(kmStr),
      num_situacion_salida: parseInt(numStr)
    };
  } catch (error) {
    console.error('[SITUACION_ID] Error parseando ID:', error);
    return null;
  }
}

/**
 * Formatea ID para mostrar de forma legible
 *
 * @example
 * formatSituacionIdLegible("20260121-1-030-70-86-50-4")
 * // "2026-01-21 | Sede 1 | Unidad 030 | Tipo 70 | Ruta 86 Km 50 | #4"
 */
export function formatSituacionIdLegible(id: string): string {
  const parsed = parseSituacionId(id);
  if (!parsed) return id;

  const fechaLegible = formatDateToYYYYMMDDDashed(parsed.fecha);

  return `${fechaLegible} | Sede ${parsed.sede_id} | Unidad ${parsed.unidad_codigo} | Tipo ${parsed.tipo_situacion_id} | Ruta ${parsed.ruta_id} Km ${parsed.km} | #${parsed.num_situacion_salida}`;
}

/**
 * Valida si un ID tiene el formato correcto
 */
export function isValidSituacionId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;

  const parts = id.split('-');
  if (parts.length !== 7) return false;

  const [fecha, sede, unidad, tipo, ruta, km, num] = parts;

  // Validar fecha (8 digitos)
  if (!/^\d{8}$/.test(fecha)) return false;

  // Validar sede (numerico)
  if (!/^\d+$/.test(sede)) return false;

  // Validar unidad (alfanumerico, puede empezar con M para motorizadas)
  if (!/^[A-Z]?\d+$/.test(unidad)) return false;

  // Validar tipo (numerico)
  if (!/^\d+$/.test(tipo)) return false;

  // Validar ruta (numerico)
  if (!/^\d+$/.test(ruta)) return false;

  // Validar km (numerico)
  if (!/^\d+$/.test(km)) return false;

  // Validar num (numerico)
  if (!/^\d+$/.test(num)) return false;

  return true;
}

/**
 * Compara dos IDs y determina si son la misma situacion
 * (util para detectar duplicados)
 */
export function isSameSituacion(id1: string, id2: string): boolean {
  return id1 === id2;
}

/**
 * Extrae solo la parte de fecha del ID
 */
export function getFechaFromId(id: string): Date | null {
  const parsed = parseSituacionId(id);
  return parsed?.fecha || null;
}

/**
 * Genera nombre de archivo para multimedia basado en ID
 *
 * @example
 * generateMultimediaFilename("20260121-1-030-70-86-50-4", "FOTO", 1)
 * // "20260121-1-030-70-86-50-4_foto_1.jpg"
 */
export function generateMultimediaFilename(
  situacionId: string,
  tipo: 'FOTO' | 'VIDEO',
  orden?: number
): string {
  if (tipo === 'FOTO') {
    return `${situacionId}_foto_${orden || 1}.jpg`;
  } else {
    return `${situacionId}_video.mp4`;
  }
}

export default {
  generateSituacionId,
  parseSituacionId,
  formatSituacionIdLegible,
  isValidSituacionId,
  isSameSituacion,
  getFechaFromId,
  generateMultimediaFilename
};
