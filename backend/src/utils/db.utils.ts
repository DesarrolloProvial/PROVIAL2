/**
 * Helpers de base de datos compartidos entre controladores y modelos.
 */

import { db } from '../config/database';

/**
 * Convierte cualquier valor a un entero positivo | null.
 * Descarta: '', null, undefined, NaN, 0 y negativos.
 * Usado para normalizar IDs (PKs) provenientes de params/body HTTP.
 */
export function normalizeId(val: unknown): number | null {
  if (val === '' || val === null || val === undefined) return null;
  const num = parseInt(String(val), 10);
  return Number.isFinite(num) && num > 0 ? num : null;
}

/**
 * Convierte cualquier valor a number | null, aceptando decimales.
 * Descarta: '', null, undefined, NaN e Infinity.
 */
export function normalizeFloat(val: unknown): number | null {
  if (val === '' || val === null || val === undefined) return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

// Bounding box aproximado del territorio continental de Guatemala
const GT_LAT_MIN =  13.7;
const GT_LAT_MAX =  18.5;
const GT_LON_MIN = -92.3;
const GT_LON_MAX = -88.2;

/**
 * Devuelve un mensaje de advertencia si las coordenadas están fuera de Guatemala.
 * No bloquea la operación — el caller decide si incluirlo en la respuesta.
 */
export function checkCoordenadasGuatemala(lat: number, lon: number): string | null {
  const dentro =
    lat >= GT_LAT_MIN && lat <= GT_LAT_MAX &&
    lon >= GT_LON_MIN && lon <= GT_LON_MAX;
  if (!dentro) {
    return `Ojo: la coordenada (${lat}, ${lon}) probablemente no es de Guatemala ` +
           `(rango esperado lat ${GT_LAT_MIN}–${GT_LAT_MAX}, lon ${GT_LON_MIN}–${GT_LON_MAX}). ¿Estás seguro?`;
  }
  return null;
}

// Mapa de fracciones del indicador de combustible a decimal (0–1).
// Se llama "indicador" porque es un estado del manómetro del vehículo,
// no una medida volumétrica.
const INDICADOR_MAP: Record<string, number> = {
  'LLENO': 1.00,
  '3/4':   0.75,
  '1/2':   0.50,
  '1/4':   0.25,
  'VACIO': 0.00,
};

/**
 * Convierte una fracción de indicador ('LLENO', '3/4', '1/2', '1/4', 'VACIO')
 * o un valor numérico (0–1) al decimal correspondiente.
 * Retorna null si el valor es nulo/vacío o no reconocido.
 */
export function parseIndicador(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'string' && INDICADOR_MAP[val] !== undefined) {
    return INDICADOR_MAP[val];
  }
  return normalizeFloat(val);
}

/**
 * Construye la entrada JSON para el timeline de observaciones.
 * Comparte la lógica de firma de usuario y normalización horaria
 * entre situacion y actividad.
 *
 * @returns JSON string listo para || $1::jsonb en PostgreSQL
 */
export async function buildObservacionEntry(
  userId: number,
  observacion: string,
  hora_local?: string,
): Promise<string> {
  const user = await db.oneOrNone(
    'SELECT chapa, nombre_completo, rol FROM usuario WHERE id = $1',
    [userId],
  );
  const firmaUsuario = user
    ? (user.chapa
        ? `${user.chapa} - ${user.nombre_completo}`
        : `${user.rol} ${user.nombre_completo}`)
    : 'Usuario';

  const parts = new Intl.DateTimeFormat('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'America/Guatemala',
  }).formatToParts(new Date());
  const horaServidor = `${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}`;
  const horaFinal = (hora_local && hora_local !== horaServidor)
    ? `¡${hora_local} / Servidor: ${horaServidor}!`
    : horaServidor;

  return JSON.stringify([{ hora: horaFinal, usuario: firmaUsuario, mensaje: observacion }]);
}
