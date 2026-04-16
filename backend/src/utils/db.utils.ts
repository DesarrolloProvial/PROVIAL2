/**
 * Helpers de base de datos compartidos entre controladores y modelos.
 */

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
