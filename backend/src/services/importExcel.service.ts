/**
 * Servicio de importación de datos Excel (Estadísticas Accidentología)
 * Usado por: POST /api/admin/import-excel y scripts/importExcel.ts
 */

import * as XLSX from 'xlsx';
import { db } from '../config/database';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const MESES = ['ENE', 'FEB', 'MAR', 'ABRIL', 'MAY', 'JUNIO', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const VEHICLE_BLOCK_SIZE = 30;
const MAX_VEHICLES = 15;
const VEHICLE_START_COL = 17;

const NULL_VALUES = new Set([
  'N/D', 'N/A', 'NO', 'SE IGNORA', 'SE DESCONOCE', 'NO HAY DATOS',
  'N/D.', 'NO APLICA', 'SIN DATOS', 'DESCONOCIDO', 'NINGUNO', 'NINGUNA',
]);

// ============================================================
// HELPERS
// ============================================================

function isNull(val: any): boolean {
  if (val === null || val === undefined || val === '') return true;
  if (typeof val === 'string') return NULL_VALUES.has(val.trim().toUpperCase());
  return false;
}

function cleanStr(val: any): string | null {
  if (isNull(val)) return null;
  return String(val).trim();
}

function cleanInt(val: any): number | null {
  if (isNull(val)) return null;
  const n = parseInt(String(val).replace(/,/g, '').trim(), 10);
  return isNaN(n) ? null : n;
}

function parseKm(val: any): number | null {
  if (isNull(val)) return null;
  const s = String(val).trim();
  if (s.includes('+')) {
    const [km, metros] = s.split('+');
    const kmNum = parseFloat(km);
    const metrosNum = parseFloat(metros);
    if (isNaN(kmNum)) return null;
    return isNaN(metrosNum) ? kmNum : kmNum + metrosNum / 1000;
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseSentido(val: any): string | null {
  if (isNull(val)) return null;
  const words = String(val).trim().toUpperCase().split(/[\s\-]+/).filter((w: string) => w && w !== 'A');
  return words.length > 0 ? words[words.length - 1] : null;
}

function parseExcelDateTime(dateSerial: any, timeFraction: any): Date | null {
  if (isNull(dateSerial)) return null;
  const d = typeof dateSerial === 'number' ? dateSerial : parseFloat(String(dateSerial));
  if (isNaN(d)) return null;
  const excelEpoch = new Date(1899, 11, 30);
  const jsDate = new Date(excelEpoch.getTime() + d * 86400000);
  if (timeFraction && typeof timeFraction === 'number' && timeFraction > 0) {
    const totalSeconds = Math.round(timeFraction * 86400);
    jsDate.setHours(Math.floor(totalSeconds / 3600), Math.floor((totalSeconds % 3600) / 60), 0, 0);
  }
  return jsDate;
}

function parseModelo(val: any): number | null {
  if (isNull(val)) return null;
  const n = parseInt(String(val).replace(/,/g, '').trim(), 10);
  return (isNaN(n) || n < 1900 || n > 2030) ? null : n;
}

function parseSexo(val: any): string | null {
  if (isNull(val)) return null;
  const s = String(val).trim().toUpperCase();
  if (s.startsWith('M')) return 'M';
  if (s.startsWith('F')) return 'F';
  return null;
}

function parseEstadoPiloto(val: any): string | null {
  if (isNull(val)) return null;
  const s = String(val).trim().toUpperCase();
  if (s.includes('ILESO')) return 'ILESO';
  if (s.includes('LESION')) return 'LESIONADO';
  if (s.includes('FALLE')) return 'FALLECIDO';
  if (s.includes('FUGADO') || s.includes('FUGA')) return 'FUGADO';
  return s;
}

function parseBoolean(val: any): boolean {
  if (isNull(val)) return false;
  const s = String(val).trim().toUpperCase();
  return s === 'SI' || s === 'SÍ' || s === 'S';
}

function normalizeRutaCodigo(val: any): string | null {
  if (isNull(val)) return null;
  return stripAccents(String(val).trim().toUpperCase().replace(/\s+(SUR|NORTE|ORIENTE|OCCIDENTE)$/i, '').trim());
}

// ============================================================
// DETECCIÓN DINÁMICA DE COLUMNAS FINALES
// ============================================================

interface FinalColumnMap {
  causaProbable: number;
  tipoPavimento: number;
  viaEstado: number;
  viaTopografia: number;
  viaGeometria: number;
  viaCondicion: number;
  clima: number;
  chapa: number;
  brigada: number;
  unidad: number;
  authChapa: number;
  authNombre: number;
  authUnidad: number;
  observaciones: number;
}

/**
 * Detecta columnas finales usando CLIMA como ancla unica.
 *
 * Headers reales del Excel (ENE como ejemplo):
 *   [459] POSIBLES CAUSAS DEL ACCIDENTE  = clima - 6
 *   [460] MATERIAL DE LA VIA             = clima - 5
 *   [461] ESTADO DE LA VIA               = clima - 4
 *   [462] TOPOGRAFIA                     = clima - 3
 *   [463] CARACT. GEOMETRICAS            = clima - 2
 *   [464] CONDICION DE LA VIA            = clima - 1
 *   [465] CLIMA                          = ANCLA
 *   [466] CHAPA (provial)                = clima + 1
 *   [467] BRIGADA A CARGO                = clima + 2
 *   [468] UNIDAD (provial)               = clima + 3
 *   [469] CHAPA (autoridad)              = clima + 4
 *   [470] NOMBRE DEL AGENTE              = clima + 5
 *   [471] UNIDAD (autoridad)             = clima + 6
 *   [472] OBSERVACION                    = clima + 7
 *
 * CLIMA es unico (no aparece en bloques de vehiculos) y siempre presente.
 * Las posiciones relativas son fijas aunque el indice absoluto cambie por hoja.
 */
function detectFinalColumns(headerRow: any[]): FinalColumnMap | null {
  const normH = (v: any): string => {
    if (v === null || v === undefined || v === '') return '';
    return stripAccents(String(v).trim().toUpperCase());
  };

  // Buscar CLIMA desde columna 100+ (vehiculos terminan como maximo en ~467)
  let climaCol = -1;
  for (let i = headerRow.length - 1; i >= 100; i--) {
    if (normH(headerRow[i]) === 'CLIMA') { climaCol = i; break; }
  }

  if (climaCol < 0) return null;

  return {
    causaProbable: climaCol - 6,
    tipoPavimento: climaCol - 5,
    viaEstado:     climaCol - 4,
    viaTopografia: climaCol - 3,
    viaGeometria:  climaCol - 2,
    viaCondicion:  climaCol - 1,
    clima:         climaCol,
    chapa:         climaCol + 1,
    brigada:       climaCol + 2,
    unidad:        climaCol + 3,
    authChapa:     climaCol + 4,
    authNombre:    climaCol + 5,
    authUnidad:    climaCol + 6,
    observaciones: climaCol + 7,
  };
}

// ============================================================
// CATÁLOGOS
// ============================================================

interface Catalogs {
  departamentos: Map<string, number>;
  municipios: Map<string, { id: number; departamento_id: number }[]>;
  rutas: Map<string, number>;
  tiposVehiculo: Map<string, number>;
  marcas: Map<string, number>;
  tiposSituacion: Map<string, number>;
  dispositivos: Map<string, number>;
  sedes: Map<string, number>;
  unidades: Map<string, number>;
}

async function loadCatalogs(): Promise<Catalogs> {
  const [deptos, munis, rutas, tiposVeh, marcas, tiposSit, dispositivos, sedes, unidades] = await Promise.all([
    db.manyOrNone('SELECT id, nombre FROM departamento'),
    db.manyOrNone('SELECT id, nombre, departamento_id FROM municipio'),
    db.manyOrNone('SELECT id, codigo FROM ruta'),
    db.manyOrNone('SELECT id, nombre FROM tipo_vehiculo'),
    db.manyOrNone('SELECT id, nombre FROM marca_vehiculo'),
    db.manyOrNone("SELECT id, nombre FROM catalogo_tipo_situacion"),
    db.manyOrNone('SELECT id, nombre FROM dispositivo_seguridad'),
    db.manyOrNone('SELECT id, codigo_boleta FROM sede WHERE codigo_boleta IS NOT NULL'),
    db.manyOrNone('SELECT id, codigo FROM unidad'),
  ]);

  const norm = (s: string) => stripAccents(s.trim().toUpperCase().replace(/_/g, ' '));

  const cat: Catalogs = {
    departamentos: new Map(deptos.map((d: any) => [norm(d.nombre), d.id])),
    municipios: new Map(),
    rutas: new Map(rutas.map((r: any) => [norm(r.codigo), r.id])),
    tiposVehiculo: new Map(tiposVeh.map((t: any) => [norm(t.nombre), t.id])),
    marcas: new Map(marcas.map((m: any) => [norm(m.nombre), m.id])),
    tiposSituacion: new Map(tiposSit.map((t: any) => [norm(t.nombre), t.id])),
    dispositivos: new Map(dispositivos.map((d: any) => [norm(d.nombre), d.id])),
    sedes: new Map(sedes.map((s: any) => [norm(s.codigo_boleta), s.id])),
    // Unidades: guardar tanto el codigo original como uppercase para matching flexible
    unidades: new Map(),
  };

  for (const u of unidades) {
    const cod = String(u.codigo).trim();
    cat.unidades.set(cod, u.id);
    cat.unidades.set(cod.toUpperCase(), u.id);
  }

  for (const m of munis) {
    const key = norm(m.nombre);
    if (!cat.municipios.has(key)) cat.municipios.set(key, []);
    cat.municipios.get(key)!.push({ id: m.id, departamento_id: m.departamento_id });
  }

  return cat;
}

// ============================================================
// LOOKUPS
// ============================================================

async function lookupOrCreateTipoVehiculo(cat: Catalogs, nombre: string): Promise<number | null> {
  if (isNull(nombre)) return null;
  const key = stripAccents(nombre.trim().toUpperCase());
  if (cat.tiposVehiculo.has(key)) return cat.tiposVehiculo.get(key)!;
  const result = await db.one(
    `INSERT INTO tipo_vehiculo (nombre, categoria) VALUES ($1, $2)
     ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id`,
    [key, 'LIVIANO']
  );
  cat.tiposVehiculo.set(key, result.id);
  return result.id;
}

async function lookupOrCreateMarca(cat: Catalogs, nombre: string): Promise<number | null> {
  if (isNull(nombre)) return null;
  const key = stripAccents(nombre.trim().toUpperCase());
  if (cat.marcas.has(key)) return cat.marcas.get(key)!;
  const result = await db.one(
    `INSERT INTO marca_vehiculo (nombre) VALUES ($1)
     ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id`,
    [key]
  );
  cat.marcas.set(key, result.id);
  return result.id;
}

function stripAccents(s: string): string {
  let result = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 192 && c <= 197) result += 'A';       // À Á Â Ã Ä Å
    else if (c >= 224 && c <= 229) result += 'a';   // à á â ã ä å
    else if (c >= 200 && c <= 203) result += 'E';   // È É Ê Ë
    else if (c >= 232 && c <= 235) result += 'e';   // è é ê ë
    else if (c >= 204 && c <= 207) result += 'I';   // Ì Í Î Ï
    else if (c >= 236 && c <= 239) result += 'i';   // ì í î ï
    else if (c >= 210 && c <= 214) result += 'O';   // Ò Ó Ô Õ Ö
    else if (c >= 242 && c <= 246) result += 'o';   // ò ó ô õ ö
    else if (c >= 217 && c <= 220) result += 'U';   // Ù Ú Û Ü
    else if (c >= 249 && c <= 252) result += 'u';   // ù ú û ü
    else if (c === 209) result += 'N';               // Ñ
    else if (c === 241) result += 'n';               // ñ
    else if (
      (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || // A-Z a-z
      (c >= 48 && c <= 57) ||                           // 0-9
      c === 32 || c === 45 || c === 47 || c === 46      // espacio - / .
    ) {
      result += s[i];
    }
    // cualquier otro caracter se ignora
  }
  return result;
}

// Solo letras A-Z para comparación fuzzy (ignora espacios, tildes corruptas, etc.)
function lettersOnly(s: string): string {
  return stripAccents(s.toUpperCase()).replace(/[^A-Z]/g, '');
}

// Similitud: cuenta letras diferentes entre dos strings (simple diff por posición)
function isSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  // Si uno contiene al otro
  if (a.includes(b) || b.includes(a)) return true;
  // Comparar sin vocales (consonantes como esqueleto)
  const consonants = (s: string) => s.replace(/[AEIOU]/g, '');
  const ca = consonants(a), cb = consonants(b);
  if (ca === cb && ca.length >= 3) return true;
  // Diferencia máxima de 2 caracteres en longitud y mayoría de posiciones iguales
  if (Math.abs(a.length - b.length) <= 3 && a.length >= 4) {
    const minLen = Math.min(a.length, b.length);
    let matches = 0;
    for (let i = 0; i < minLen; i++) {
      if (a[i] === b[i]) matches++;
    }
    if (matches >= minLen - 2) return true;
  }
  return false;
}

function lookupDepartamento(cat: Catalogs, nombre: string): number | null {
  if (isNull(nombre)) return null;
  const key = stripAccents(nombre.trim().toUpperCase().replace(/_/g, ' '));
  // Intento exacto
  if (cat.departamentos.has(key)) return cat.departamentos.get(key)!;
  // Fuzzy: solo letras
  const inputLetters = lettersOnly(nombre);
  const entries = Array.from(cat.departamentos.entries());
  for (const [catKey, id] of entries) {
    if (lettersOnly(catKey) === inputLetters) return id;
  }
  // Fuzzy: similitud (encoding corrupto en BD puede perder 1-2 letras)
  for (const [catKey, id] of entries) {
    if (isSimilar(lettersOnly(catKey), inputLetters)) return id;
  }
  return null;
}

function pickMuni(candidates: { id: number; departamento_id: number }[], deptoId: number | null): number {
  if (deptoId) {
    const match = candidates.find(c => c.departamento_id === deptoId);
    if (match) return match.id;
  }
  return candidates[0].id;
}

function lookupMunicipio(cat: Catalogs, nombre: string, deptoId: number | null): number | null {
  if (isNull(nombre)) return null;
  const key = stripAccents(nombre.trim().toUpperCase());
  // Intento exacto
  const candidates = cat.municipios.get(key);
  if (candidates && candidates.length > 0) return pickMuni(candidates, deptoId);
  // Fuzzy: solo letras
  const inputLetters = lettersOnly(nombre);
  const allEntries = Array.from(cat.municipios.entries());
  for (const [catKey, munis] of allEntries) {
    if (lettersOnly(catKey) === inputLetters) return pickMuni(munis, deptoId);
  }
  // Fuzzy: similitud (encoding corrupto en BD puede perder 1-2 letras)
  for (const [catKey, munis] of allEntries) {
    if (isSimilar(lettersOnly(catKey), inputLetters)) return pickMuni(munis, deptoId);
  }
  return null;
}

function lookupRuta(cat: Catalogs, codigo: string): number | null {
  if (isNull(codigo)) return null;
  const normalized = normalizeRutaCodigo(codigo);
  if (!normalized) return null;
  if (cat.rutas.has(normalized)) return cat.rutas.get(normalized)!;
  const entries = Array.from(cat.rutas.entries());
  for (const [rKey, rId] of entries) {
    if (rKey.startsWith(normalized) || normalized.startsWith(rKey)) return rId;
  }
  return null;
}

function lookupTipoSituacion(cat: Catalogs, nombre: string): number | null {
  if (isNull(nombre)) return null;
  const key = stripAccents(nombre.trim().toUpperCase());
  if (cat.tiposSituacion.has(key)) return cat.tiposSituacion.get(key)!;
  const entries = Array.from(cat.tiposSituacion.entries());
  // Contiene
  for (const [catKey, id] of entries) {
    if (catKey.includes(key) || key.includes(catKey)) return id;
  }
  // Fuzzy por consonantes/similitud
  const inputLetters = lettersOnly(nombre);
  for (const [catKey, id] of entries) {
    if (isSimilar(lettersOnly(catKey), inputLetters)) return id;
  }
  return null;
}

function lookupDispositivo(cat: Catalogs, nombre: string): number | null {
  if (isNull(nombre)) return null;
  const key = stripAccents(nombre.trim().toUpperCase());
  if (cat.dispositivos.has(key)) return cat.dispositivos.get(key)!;
  const entries = Array.from(cat.dispositivos.entries());
  for (const [catKey, id] of entries) {
    if (catKey.includes(key) || key.includes(catKey)) return id;
  }
  return null;
}

/** Parsear codigo de unidad, soporta: "1136", "PEATONAL", "M-004 Y M-002" */
function parseUnidadCode(raw: string | null): { primary: string | null; apoyo: string | null } {
  if (!raw || isNull(raw)) return { primary: null, apoyo: null };
  const s = String(raw).trim();

  // Multiples unidades separadas por " Y "
  if (s.toUpperCase().includes(' Y ')) {
    const parts = s.split(/\s+Y\s+/i).map(p => p.trim()).filter(Boolean);
    return { primary: parts[0] || null, apoyo: parts.slice(1).join(', ') || null };
  }

  // Patron M-NNN-M-NNN (dos codigos pegados con guion)
  const multiM = s.match(/^(M-\d+)-(M-\d+.*)$/i);
  if (multiM) {
    return { primary: multiM[1], apoyo: multiM[2] };
  }

  return { primary: s, apoyo: null };
}

function lookupUnidad(cat: Catalogs, codigo: string | null): { id: number | null; fallback: boolean } {
  if (!codigo || isNull(codigo)) return { id: null, fallback: false };
  const trimmed = String(codigo).trim();

  // 1. Intentar match exacto con uppercase (soporta "Peatonal" → "PEATONAL")
  const upper = trimmed.toUpperCase();
  if (cat.unidades.has(upper)) return { id: cat.unidades.get(upper)!, fallback: false };

  // 2. Intentar match exacto tal cual
  if (cat.unidades.has(trimmed)) return { id: cat.unidades.get(trimmed)!, fallback: false };

  // 3. Extraer solo digitos y padear
  const cod = trimmed.replace(/\D/g, '');
  if (!cod || cod === '0') {
    // No tiene digitos o es "0" → fallback a DESCONOCIDA
    const fb = cat.unidades.get('DESCONOCIDA') ?? null;
    return { id: fb, fallback: fb !== null };
  }
  const padded = cod.length <= 2 ? cod.padStart(3, '0') : cod;
  if (cat.unidades.has(padded)) return { id: cat.unidades.get(padded)!, fallback: false };

  // 4. Sin padeo
  if (cat.unidades.has(cod)) return { id: cat.unidades.get(cod)!, fallback: false };

  // 5. Codigo parece invalido (5+ digitos = probablemente chapa o placa) → DESCONOCIDA
  const fb = cat.unidades.get('DESCONOCIDA') ?? null;
  return { id: fb, fallback: fb !== null };
}

/** Normaliza el valor de clima del Excel a los valores permitidos por el CHECK constraint */
function normalizeClima(val: any): string | null {
  if (isNull(val)) return null;
  const s = stripAccents(String(val).trim().toUpperCase());
  if (s.includes('DESPEJADO') || s.includes('SOLEADO') || s.includes('SOL')) return 'DESPEJADO';
  if (s.includes('NUBLADO') || s.includes('NUBE') || s.includes('PARCIAL')) return 'NUBLADO';
  if (s.includes('LLUVI') || s.includes('LLOVI') || s.includes('TORMENT')) return 'LLUVIA';
  if (s.includes('NEBLIN') || s.includes('NIEBLA') || s.includes('BRUMA')) return 'NEBLINA';
  // Si no matchea ninguno, null para no violar el constraint
  return null;
}

const BUS_TYPES = new Set([
  'BUS', 'BUS URBANO', 'BUS EXTRAURBANO', 'MICROBUS', 'MINIBUS',
  'BUS ESCOLAR', 'TRANSPORTE PUBLICO', 'TRANSMETRO',
]);

// ============================================================
// INTERFACES
// ============================================================

export interface ImportResult {
  totalRows: number;
  inserted: number;
  skipped: number;
  skippedRows: string[];
  errors: number;
  vehiclesCreated: number;
  errorDetails: string[];
  missingDepartamentos: string[];
  missingMunicipios: string[];
  missingRutas: string[];
  missingTiposSituacion: string[];
  missingUnidades: string[];
  debug: {
    catalogKeys: {
      departamentos: string[];
      municipios: string[];
      rutas: string[];
      tiposSituacion: string[];
    };
    detectedColumns?: Record<string, Record<string, number>>;
  };
  catalogStats: {
    departamentos: number;
    municipios: number;
    rutas: number;
    tiposVehiculo: number;
    marcas: number;
    tiposSituacion: number;
  };
}

export interface ImportOptions {
  dryRun?: boolean;
  mesFilter?: string | null;
  origenDatos?: string;
}

// ============================================================
// PROCESAMIENTO
// ============================================================

async function processRow(
  row: any[], rowIndex: number, mesName: string,
  cat: Catalogs, result: ImportResult, dryRun: boolean, origenDatos: string,
  fc: FinalColumnMap
): Promise<void> {
  const sede = cleanStr(row[0]);
  const boleta = cleanStr(row[1]);
  if (!sede || !boleta) {
    // Verificar si la fila tiene datos en otras columnas (no es fila vacía)
    const hasOtherData = row.slice(2, 10).some((c: any) => c !== '' && c !== null && c !== undefined);
    if (hasOtherData) {
      result.skippedRows.push(
        `${mesName} fila ${rowIndex + 1}: sede="${row[0] ?? ''}" boleta="${row[1] ?? ''}" depto="${row[3] ?? ''}" muni="${row[4] ?? ''}" ruta="${row[7] ?? ''}"`
      );
    }
    return;
  }

  const codigoBoleta = `${sede}-${boleta}`;

  if (!dryRun) {
    const exists = await db.oneOrNone('SELECT id FROM situacion WHERE codigo_boleta = $1', [codigoBoleta]);
    if (exists) { result.skipped++; return; }
  }

  const grupo = cleanInt(row[2]);
  const deptoName = cleanStr(row[3]);
  const muniName = cleanStr(row[4]);
  const area = cleanStr(row[5])?.toUpperCase() || null;
  const rutaCodigo = cleanStr(row[7]);
  const sentido = parseSentido(row[8]);
  const km = parseKm(row[9]);
  const createdAt = parseExcelDateTime(row[10], row[13]);
  const tipoAccidente = cleanStr(row[16]);

  const deptoId = lookupDepartamento(cat, deptoName || '');
  const muniId = lookupMunicipio(cat, muniName || '', deptoId);
  const rutaId = lookupRuta(cat, rutaCodigo || '');
  const tipoSituacionId = lookupTipoSituacion(cat, tipoAccidente || '');

  // Track missing lookups con ubicación y valor normalizado para debug
  const _r = result as any;
  const looksReal = (v: string | null) => v !== null && v.length >= 2 && /[A-Za-z]/.test(v);
  const loc = `${mesName} fila ${rowIndex + 1}`;
  if (looksReal(deptoName) && !deptoId) {
    const normKey = stripAccents(deptoName!.trim().toUpperCase().replace(/_/g, ' '));
    const debugKey = `${deptoName} [norm=${normKey}]`;
    (_r._missingDeptos as Map<string, string[]>).set(debugKey, [...((_r._missingDeptos as Map<string, string[]>).get(debugKey) || []), loc]);
  }
  if (looksReal(muniName) && !muniId) (_r._missingMunis as Map<string, string[]>).set(muniName!, [...((_r._missingMunis as Map<string, string[]>).get(muniName!) || []), loc]);
  if (looksReal(rutaCodigo) && !rutaId) (_r._missingRutas as Map<string, string[]>).set(rutaCodigo!, [...((_r._missingRutas as Map<string, string[]>).get(rutaCodigo!) || []), loc]);
  if (looksReal(tipoAccidente) && !tipoSituacionId) (_r._missingSit as Map<string, string[]>).set(tipoAccidente!, [...((_r._missingSit as Map<string, string[]>).get(tipoAccidente!) || []), loc]);

  // Campos finales - usando indices dinamicos detectados del header
  const causaProbable = cleanStr(row[fc.causaProbable]);
  const tipoPavimento = cleanStr(row[fc.tipoPavimento]);
  const viaEstado = cleanStr(row[fc.viaEstado]);
  const viaTopografia = cleanStr(row[fc.viaTopografia]);
  const viaGeometria = cleanStr(row[fc.viaGeometria]);
  const viaCondicion = cleanStr(row[fc.viaCondicion]);
  const clima = normalizeClima(row[fc.clima]);

  let observaciones = cleanStr(row[fc.observaciones]) || '';
  const chapa = cleanStr(row[fc.chapa]);
  const brigada = cleanStr(row[fc.brigada]);
  const rawUnidad = cleanStr(row[fc.unidad]);
  const authChapa = cleanStr(row[fc.authChapa]);
  const authNombre = cleanStr(row[fc.authNombre]);
  const authUnidad = cleanStr(row[fc.authUnidad]);

  // Parsear unidad (puede ser multiple: "M-004 Y M-002")
  const { primary: unidadCod, apoyo: unidadApoyo } = parseUnidadCode(rawUnidad);

  // Lookup unidad por código (fallback a DESCONOCIDA si no se encuentra)
  const unidadResult = lookupUnidad(cat, unidadCod);
  const unidadId = unidadResult.id;
  if (unidadCod && !unidadId) {
    (_r._missingUnidades as Map<string, string[]>).set(unidadCod, [...((_r._missingUnidades as Map<string, string[]>).get(unidadCod) || []), loc]);
  }

  // unidad_id es NOT NULL en la BD - si no hay unidad resuelta, necesitamos DESCONOCIDA
  const finalUnidadId = unidadId ?? (cat.unidades.get('DESCONOCIDA') ?? null);
  if (!finalUnidadId) {
    result.errors++;
    result.errorDetails.push(`${loc}: unidad_id NULL (unidad="${rawUnidad}"). Crea la unidad DESCONOCIDA en la BD.`);
    return;
  }

  const meta: string[] = [];
  if (chapa) meta.push(`Chapa: ${chapa}`);
  if (brigada) meta.push(`Brigada: ${brigada}`);
  if (unidadCod) meta.push(`Unidad: ${unidadCod}`);
  if (unidadApoyo) meta.push(`Apoyo: ${unidadApoyo}`);
  if (meta.length > 0) observaciones += (observaciones ? '\n' : '') + `[${meta.join('] [')}]`;

  if (dryRun) {
    result.inserted++;
    for (let v = 0; v < MAX_VEHICLES; v++) {
      if (!isNull(row[VEHICLE_START_COL + v * VEHICLE_BLOCK_SIZE])) result.vehiclesCreated++;
    }
    return;
  }

  // Generar codigo_situacion determinista para importacion Excel
  const codigoSituacion = `EXL-${codigoBoleta}`;

  // INSERT situacion
  const situacion = await db.one(
    `INSERT INTO situacion (
      codigo_situacion,
      tipo_situacion, estado, codigo_boleta, origen_datos,
      grupo, departamento_id, municipio_id, area,
      ruta_id, sentido, km, created_at,
      tipo_situacion_id, causa_probable,
      tipo_pavimento, via_estado, via_topografia, via_geometria, via_condicion,
      clima, observaciones, creado_por, unidad_id
    ) VALUES (
      $1,
      'INCIDENTE', 'CERRADA', $2, $3,
      $4, $5, $6, $7, $8, $9, $10, $11,
      $12, $13, $14, $15, $16, $17, $18, $19, $20, 1, $21
    ) RETURNING id`,
    [
      codigoSituacion,
      codigoBoleta, origenDatos,
      grupo, deptoId, muniId, area, rutaId, sentido, km, createdAt,
      tipoSituacionId, causaProbable,
      tipoPavimento, viaEstado, viaTopografia, viaGeometria, viaCondicion,
      clima, observaciones || null, finalUnidadId,
    ]
  );

  const situacionId = situacion.id;

  // Procesar vehículos
  for (let v = 0; v < MAX_VEHICLES; v++) {
    const base = VEHICLE_START_COL + v * VEHICLE_BLOCK_SIZE;
    const tipoVehNombre = cleanStr(row[base]);
    if (!tipoVehNombre) continue;

    const placa = cleanStr(row[base + 1]) || `SIN-PLACA-${codigoBoleta}-V${v + 1}`;
    const color = cleanStr(row[base + 2]);
    const modelo = parseModelo(row[base + 3]);
    const marcaNombre = cleanStr(row[base + 4]);
    const empresa = cleanStr(row[base + 5]);
    const nitTarjeta = cleanStr(row[base + 6]);
    const licTransportes = cleanStr(row[base + 7]);
    const tarOperaciones = cleanStr(row[base + 8]);
    const seguro = cleanStr(row[base + 9]);
    const poliza = cleanStr(row[base + 10]);
    const nombrePiloto = cleanStr(row[base + 11]);
    const edad = cleanInt(row[base + 12]);
    const sexo = parseSexo(row[base + 14]);
    const etnia = cleanStr(row[base + 15]);
    const estadoPiloto = parseEstadoPiloto(row[base + 16]);
    const domicilio = cleanStr(row[base + 17]);
    const licTipo = cleanStr(row[base + 19]);
    const licNumero = cleanStr(row[base + 20]);
    const ebriedad = parseBoolean(row[base + 21]);
    const pasIlesos = cleanInt(row[base + 22]) ?? 0;
    const pasLesionados = cleanInt(row[base + 23]) ?? 0;
    const pasTrasladados = cleanInt(row[base + 24]) ?? 0;
    const pasFallecidos = cleanInt(row[base + 25]) ?? 0;
    const dispSegNombre = cleanStr(row[base + 27]);
    const consignado = cleanStr(row[base + 28]);
    const consignadoPor = cleanStr(row[base + 29]);

    try {
      const tipoVehiculoId = await lookupOrCreateTipoVehiculo(cat, tipoVehNombre);
      const marcaId = marcaNombre ? await lookupOrCreateMarca(cat, marcaNombre) : null;

      const vehiculo = await db.one(
        `INSERT INTO vehiculo (placa, tipo_vehiculo_id, marca_id, color, empresa)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (placa) DO UPDATE SET
           tipo_vehiculo_id = COALESCE(EXCLUDED.tipo_vehiculo_id, vehiculo.tipo_vehiculo_id),
           marca_id = COALESCE(EXCLUDED.marca_id, vehiculo.marca_id),
           color = COALESCE(EXCLUDED.color, vehiculo.color),
           empresa = COALESCE(EXCLUDED.empresa, vehiculo.empresa),
           total_incidentes = vehiculo.total_incidentes + 1,
           ultimo_incidente = NOW(), updated_at = NOW()
         RETURNING id`,
        [placa, tipoVehiculoId, marcaId, color, empresa]
      );

      let pilotoId: number | null = null;
      if (licNumero && nombrePiloto) {
        const licNum = String(licNumero).replace(/\D/g, '');
        if (licNum && licNum !== '0') {
          const piloto = await db.one(
            `INSERT INTO piloto (licencia_numero, nombre, licencia_tipo, sexo, etnia)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (licencia_numero) DO UPDATE SET
               nombre = COALESCE(EXCLUDED.nombre, piloto.nombre),
               licencia_tipo = COALESCE(EXCLUDED.licencia_tipo, piloto.licencia_tipo),
               sexo = COALESCE(EXCLUDED.sexo, piloto.sexo),
               etnia = COALESCE(EXCLUDED.etnia, piloto.etnia),
               total_incidentes = piloto.total_incidentes + 1,
               ultimo_incidente = NOW(), updated_at = NOW()
             RETURNING id`,
            [licNum, nombrePiloto, licTipo, sexo, etnia]
          );
          pilotoId = piloto.id;
        }
      }

      const custodiaEstado = consignado?.toUpperCase() === 'SI' ? 'CONSIGNADO' : null;
      const custodiaDatos = consignadoPor ? { consignado_por: consignadoPor } : null;

      const sv = await db.one(
        `INSERT INTO situacion_vehiculo (
          situacion_id, vehiculo_id, piloto_id,
          estado_piloto, personas_asistidas,
          heridos_en_vehiculo, fallecidos_en_vehiculo,
          datos_piloto, custodia_estado, custodia_datos,
          edad_conductor, trasladados_en_vehiculo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          situacionId, vehiculo.id, pilotoId,
          estadoPiloto, pasIlesos, pasLesionados, pasFallecidos,
          JSON.stringify({ estado_persona: estadoPiloto, ebriedad }),
          custodiaEstado, custodiaDatos ? JSON.stringify(custodiaDatos) : null,
          edad, pasTrasladados,
        ]
      );

      if (nitTarjeta || modelo || domicilio) {
        const nitNum = nitTarjeta ? String(nitTarjeta).replace(/\D/g, '') : null;
        await db.none(
          `INSERT INTO tarjeta_circulacion (vehiculo_id, nit, modelo, direccion_propietario)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [vehiculo.id, nitNum || null, modelo, domicilio]
        );
      }

      if (BUS_TYPES.has(tipoVehNombre.trim().toUpperCase()) && (licTransportes || tarOperaciones || seguro || poliza)) {
        await db.none(
          `INSERT INTO bus (vehiculo_id, licencia_transportes, tarjeta_operaciones, seguro, poliza)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
          [vehiculo.id, licTransportes, tarOperaciones, seguro, poliza]
        );
      }

      if (dispSegNombre) {
        const dispId = lookupDispositivo(cat, dispSegNombre);
        if (dispId) {
          await db.none(
            `INSERT INTO situacion_vehiculo_dispositivo (situacion_vehiculo_id, dispositivo_seguridad_id, estado)
             VALUES ($1, $2, 'FUNCIONANDO') ON CONFLICT DO NOTHING`,
            [sv.id, dispId]
          );
        }
      }

      result.vehiclesCreated++;
    } catch (vErr: any) {
      result.errorDetails.push(`${mesName} fila ${rowIndex + 1} veh ${v + 1}: ${vErr.message}`);
    }
  }

  // Autoridad
  if (authChapa || authNombre || authUnidad) {
    try {
      await db.none(
        `INSERT INTO autoridad (situacion_id, tipo, datos) VALUES ($1, $2, $3)`,
        [situacionId, 'PNC', JSON.stringify({ chapa: authChapa, nombre: authNombre, unidad: authUnidad })]
      );
    } catch (aErr: any) {
      result.errorDetails.push(`${mesName} fila ${rowIndex + 1} autoridad: ${aErr.message}`);
    }
  }

  result.inserted++;
}

// ============================================================
// FUNCIÓN PRINCIPAL EXPORTADA
// ============================================================

export async function importExcelData(
  excelBuffer: Buffer,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const { dryRun = false, mesFilter = null, origenDatos = 'EXCEL_2025' } = options;

  const cat = await loadCatalogs();

  const wb = XLSX.read(excelBuffer, { type: 'buffer' });

  const mesesAProcesar = mesFilter ? [mesFilter.toUpperCase()] : MESES;

  const result: ImportResult = {
    totalRows: 0, inserted: 0, skipped: 0, skippedRows: [], errors: 0, vehiclesCreated: 0,
    errorDetails: [],
    missingDepartamentos: [], missingMunicipios: [], missingRutas: [], missingTiposSituacion: [], missingUnidades: [],
    debug: {
      catalogKeys: {
        departamentos: Array.from(cat.departamentos.keys()),
        municipios: Array.from(cat.municipios.keys()).slice(0, 50),
        rutas: Array.from(cat.rutas.keys()),
        tiposSituacion: Array.from(cat.tiposSituacion.keys()),
      },
      detectedColumns: {},
    },
    catalogStats: {
      departamentos: cat.departamentos.size, municipios: cat.municipios.size,
      rutas: cat.rutas.size, tiposVehiculo: cat.tiposVehiculo.size,
      marcas: cat.marcas.size, tiposSituacion: cat.tiposSituacion.size,
    },
  };

  // Internal maps for dedup con ubicaciones
  const _maps = {
    _missingDeptos: new Map<string, string[]>(),
    _missingMunis: new Map<string, string[]>(),
    _missingRutas: new Map<string, string[]>(),
    _missingSit: new Map<string, string[]>(),
    _missingUnidades: new Map<string, string[]>(),
  };
  Object.assign(result, _maps);

  for (const mes of mesesAProcesar) {
    const ws = wb.Sheets[mes];
    if (!ws) continue;

    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', range: 'A1:RZ5000' }) as any[][];
    if (data.length === 0) continue;

    // Detectar columnas finales desde el header de esta hoja
    const headerRow = data[0];

    const fc = detectFinalColumns(headerRow);
    if (!fc) {
      result.errorDetails.push(`${mes}: No se detectaron headers de columnas finales, saltando hoja`);
      continue;
    }

    // Guardar info de debug sobre columnas detectadas
    if (result.debug.detectedColumns) {
      result.debug.detectedColumns[mes] = {
        causaProbable: fc.causaProbable,
        tipoPavimento: fc.tipoPavimento,
        clima: fc.clima,
        chapa: fc.chapa,
        brigada: fc.brigada,
        unidad: fc.unidad,
        observaciones: fc.observaciones,
      };
    }

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0] || row[0] === '') continue;

      result.totalRows++;
      try {
        await processRow(row, i, mes, cat, result, dryRun, origenDatos, fc);
      } catch (err: any) {
        result.errors++;
        result.errorDetails.push(`${mes} fila ${i + 1}: ${err.message}`);
      }
    }
  }

  // Convert maps to arrays con ubicación: "VALOR (ENE fila 5, MAR fila 12)"
  const mapToArr = (m: Map<string, string[]>) =>
    Array.from(m.entries()).map(([val, locs]) => `${val} (${locs.slice(0, 5).join(', ')}${locs.length > 5 ? ` +${locs.length - 5} mas` : ''})`);
  result.missingDepartamentos = mapToArr((result as any)._missingDeptos || new Map());
  result.missingMunicipios = mapToArr((result as any)._missingMunis || new Map());
  result.missingRutas = mapToArr((result as any)._missingRutas || new Map());
  result.missingTiposSituacion = mapToArr((result as any)._missingSit || new Map());
  result.missingUnidades = mapToArr((result as any)._missingUnidades || new Map());

  return result;
}
