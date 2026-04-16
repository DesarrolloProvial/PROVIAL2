/**
 * Helpers de base de datos compartidos entre controladores y modelos.
 */

import { db } from '../config/database';

/**
 * Convierte cualquier valor a number | null.
 * Descarta: '', null, undefined y NaN.
 * Usado para normalizar IDs numéricos provenientes del body HTTP.
 */
export function normalizeId(val: unknown): number | null {
  if (val === '' || val === null || val === undefined) return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
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
