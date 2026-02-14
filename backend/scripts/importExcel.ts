/**
 * Script de importación de datos Excel (Estadísticas Accidentología 2025)
 *
 * Uso:
 *   npx ts-node scripts/importExcel.ts --dry-run          # Solo parsear y reportar
 *   npx ts-node scripts/importExcel.ts --mes ENE           # Importar solo enero
 *   npx ts-node scripts/importExcel.ts                     # Importar todo
 */

import * as XLSX from 'xlsx';
import * as path from 'path';
import { db } from '../src/config/database';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const EXCEL_PATH = path.resolve(__dirname, '../../ESTADISTICAS GENERAL 2025.xlsx');
const MESES = ['ENE', 'FEB', 'MAR', 'ABRIL', 'MAY', 'JUNIO', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const VEHICLE_BLOCK_SIZE = 30;
const MAX_VEHICLES = 15;
const VEHICLE_START_COL = 17;
const FINAL_COLS_START = 459;

// Valores que se tratan como NULL
const NULL_VALUES = new Set([
  'N/D', 'N/A', 'NO', 'SE IGNORA', 'SE DESCONOCE', 'NO HAY DATOS',
  'N/D.', 'NO APLICA', 'SIN DATOS', 'DESCONOCIDO', 'NINGUNO', 'NINGUNA',
]);

function isNull(val: any): boolean {
  if (val === null || val === undefined || val === '') return true;
  if (typeof val === 'string') {
    const upper = val.trim().toUpperCase();
    return NULL_VALUES.has(upper);
  }
  return false;
}

function cleanStr(val: any): string | null {
  if (isNull(val)) return null;
  return String(val).trim();
}

function cleanInt(val: any): number | null {
  if (isNull(val)) return null;
  const s = String(val).replace(/,/g, '').trim();
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

// ============================================================
// PARSEO DE DATOS
// ============================================================

/** Parsear KM: "80+600" → 80.6, "80" → 80, 68 → 68 */
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

/** Parsear sentido: "SUR - NORTE" → "NORTE", "NORTE A SUR" → "SUR" */
function parseSentido(val: any): string | null {
  if (isNull(val)) return null;
  const s = String(val).trim().toUpperCase();
  const words = s.split(/[\s\-]+/).filter(w => w && w !== 'A');
  if (words.length === 0) return null;
  return words[words.length - 1];
}

/** Fecha Excel (serial number) + Hora (fracción del día) → Date */
function parseExcelDateTime(dateSerial: any, timeFraction: any): Date | null {
  if (isNull(dateSerial)) return null;
  const d = typeof dateSerial === 'number' ? dateSerial : parseFloat(String(dateSerial));
  if (isNaN(d)) return null;

  // Excel serial date → JS Date (epoch Excel: 1/1/1900, con bug del leap year 1900)
  const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
  const msPerDay = 86400000;
  const jsDate = new Date(excelEpoch.getTime() + d * msPerDay);

  // Agregar hora
  if (timeFraction && typeof timeFraction === 'number' && timeFraction > 0) {
    const totalSeconds = Math.round(timeFraction * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    jsDate.setHours(hours, minutes, 0, 0);
  }

  return jsDate;
}

/** Parsear modelo: "2,000" → 2000, "2018" → 2018 */
function parseModelo(val: any): number | null {
  if (isNull(val)) return null;
  const s = String(val).replace(/,/g, '').trim();
  const n = parseInt(s, 10);
  if (isNaN(n) || n < 1900 || n > 2030) return null;
  return n;
}

/** Normalizar sexo: MASCULINO → M, FEMENINO → F */
function parseSexo(val: any): string | null {
  if (isNull(val)) return null;
  const s = String(val).trim().toUpperCase();
  if (s.startsWith('M')) return 'M';
  if (s.startsWith('F')) return 'F';
  return null;
}

/** Normalizar estado piloto */
function parseEstadoPiloto(val: any): string | null {
  if (isNull(val)) return null;
  const s = String(val).trim().toUpperCase();
  if (s.includes('ILESO')) return 'ILESO';
  if (s.includes('LESION')) return 'LESIONADO';
  if (s.includes('FALLE')) return 'FALLECIDO';
  if (s.includes('FUGADO') || s.includes('FUGA')) return 'FUGADO';
  return s;
}

/** Parsear ebriedad SI/NO a boolean */
function parseBoolean(val: any): boolean {
  if (isNull(val)) return false;
  const s = String(val).trim().toUpperCase();
  return s === 'SI' || s === 'SÍ' || s === 'S';
}

/** Normalizar nombre de ruta: "CA-9 SUR" → "CA-9" (quitar sufijo direccional) */
function normalizeRutaCodigo(val: any): string | null {
  if (isNull(val)) return null;
  const s = String(val).trim().toUpperCase();
  // Quitar sufijos como " SUR", " NORTE", " ORIENTE", " OCCIDENTE"
  return s.replace(/\s+(SUR|NORTE|ORIENTE|OCCIDENTE)$/i, '').trim();
}

// ============================================================
// CATÁLOGOS (mapas de lookup)
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
}

async function loadCatalogs(): Promise<Catalogs> {
  console.log('Cargando catálogos de la DB...');

  const deptos = await db.manyOrNone('SELECT id, nombre FROM departamento');
  const munis = await db.manyOrNone('SELECT id, nombre, departamento_id FROM municipio');
  const rutas = await db.manyOrNone('SELECT id, codigo FROM ruta');
  const tiposVeh = await db.manyOrNone('SELECT id, nombre FROM tipo_vehiculo');
  const marcas = await db.manyOrNone('SELECT id, nombre FROM marca_vehiculo');
  const tiposSit = await db.manyOrNone("SELECT id, nombre FROM catalogo_tipo_situacion WHERE formulario_tipo = 'SITUACION'");
  const dispositivos = await db.manyOrNone('SELECT id, nombre FROM dispositivo_seguridad');
  const sedes = await db.manyOrNone('SELECT id, codigo_boleta FROM sede WHERE codigo_boleta IS NOT NULL');

  const normalize = (s: string) => s.trim().toUpperCase().replace(/_/g, ' ');

  const cat: Catalogs = {
    departamentos: new Map(deptos.map((d: any) => [normalize(d.nombre), d.id])),
    municipios: new Map(),
    rutas: new Map(rutas.map((r: any) => [normalize(r.codigo), r.id])),
    tiposVehiculo: new Map(tiposVeh.map((t: any) => [normalize(t.nombre), t.id])),
    marcas: new Map(marcas.map((m: any) => [normalize(m.nombre), m.id])),
    tiposSituacion: new Map(tiposSit.map((t: any) => [normalize(t.nombre), t.id])),
    dispositivos: new Map(dispositivos.map((d: any) => [normalize(d.nombre), d.id])),
    sedes: new Map(sedes.map((s: any) => [normalize(s.codigo_boleta), s.id])),
  };

  // Municipios: agrupar por nombre (puede haber duplicados entre departamentos)
  for (const m of munis) {
    const key = normalize(m.nombre);
    if (!cat.municipios.has(key)) cat.municipios.set(key, []);
    cat.municipios.get(key)!.push({ id: m.id, departamento_id: m.departamento_id });
  }

  console.log(`  Departamentos: ${cat.departamentos.size}, Municipios: ${cat.municipios.size} nombres`);
  console.log(`  Rutas: ${cat.rutas.size}, Tipos vehiculo: ${cat.tiposVehiculo.size}, Marcas: ${cat.marcas.size}`);
  console.log(`  Tipos situacion: ${cat.tiposSituacion.size}, Dispositivos: ${cat.dispositivos.size}, Sedes: ${cat.sedes.size}`);

  return cat;
}

// ============================================================
// LOOKUP HELPERS (con auto-create para catálogos faltantes)
// ============================================================

async function lookupOrCreateTipoVehiculo(cat: Catalogs, nombre: string): Promise<number | null> {
  if (isNull(nombre)) return null;
  const key = nombre.trim().toUpperCase();
  if (cat.tiposVehiculo.has(key)) return cat.tiposVehiculo.get(key)!;

  // Auto-crear
  const result = await db.one(
    `INSERT INTO tipo_vehiculo (nombre, categoria) VALUES ($1, $2)
     ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id`,
    [nombre.trim().toUpperCase(), 'LIVIANO']
  );
  cat.tiposVehiculo.set(key, result.id);
  console.log(`  [AUTO-CREATE] tipo_vehiculo: "${nombre}" → id=${result.id}`);
  return result.id;
}

async function lookupOrCreateMarca(cat: Catalogs, nombre: string): Promise<number | null> {
  if (isNull(nombre)) return null;
  const key = nombre.trim().toUpperCase();
  if (cat.marcas.has(key)) return cat.marcas.get(key)!;

  const result = await db.one(
    `INSERT INTO marca_vehiculo (nombre) VALUES ($1)
     ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id`,
    [nombre.trim().toUpperCase()]
  );
  cat.marcas.set(key, result.id);
  console.log(`  [AUTO-CREATE] marca_vehiculo: "${nombre}" → id=${result.id}`);
  return result.id;
}

function lookupDepartamento(cat: Catalogs, nombre: string): number | null {
  if (isNull(nombre)) return null;
  const key = nombre.trim().toUpperCase().replace(/_/g, ' ');
  return cat.departamentos.get(key) ?? null;
}

function lookupMunicipio(cat: Catalogs, nombre: string, deptoId: number | null): number | null {
  if (isNull(nombre)) return null;
  const key = nombre.trim().toUpperCase();
  const candidates = cat.municipios.get(key);
  if (!candidates || candidates.length === 0) return null;
  if (deptoId) {
    const match = candidates.find(c => c.departamento_id === deptoId);
    if (match) return match.id;
  }
  return candidates[0].id;
}

function lookupRuta(cat: Catalogs, codigo: string): number | null {
  if (isNull(codigo)) return null;
  const normalized = normalizeRutaCodigo(codigo);
  if (!normalized) return null;
  // Intento exacto
  if (cat.rutas.has(normalized)) return cat.rutas.get(normalized)!;
  // Intento parcial (buscar la que empiece con el código)
  const rutaEntries = Array.from(cat.rutas.entries());
  for (const [rKey, rId] of rutaEntries) {
    if (rKey.startsWith(normalized) || normalized.startsWith(rKey)) return rId;
  }
  return null;
}

function lookupTipoSituacion(cat: Catalogs, nombre: string): number | null {
  if (isNull(nombre)) return null;
  const key = nombre.trim().toUpperCase();
  if (cat.tiposSituacion.has(key)) return cat.tiposSituacion.get(key)!;
  // Búsqueda parcial
  const tsEntries = Array.from(cat.tiposSituacion.entries());
  for (const [catKey, id] of tsEntries) {
    if (catKey.includes(key) || key.includes(catKey)) return id;
  }
  return null;
}

function lookupDispositivo(cat: Catalogs, nombre: string): number | null {
  if (isNull(nombre)) return null;
  const key = nombre.trim().toUpperCase();
  if (cat.dispositivos.has(key)) return cat.dispositivos.get(key)!;
  const dEntries = Array.from(cat.dispositivos.entries());
  for (const [catKey, id] of dEntries) {
    if (catKey.includes(key) || key.includes(catKey)) return id;
  }
  return null;
}

// ============================================================
// TIPOS DE VEHICULOS QUE SON BUSES
// ============================================================

const BUS_TYPES = new Set([
  'BUS', 'BUS URBANO', 'BUS EXTRAURBANO', 'MICROBUS', 'MINIBUS',
  'BUS ESCOLAR', 'TRANSPORTE PUBLICO', 'TRANSMETRO',
]);

function isBusType(tipoVehiculo: string | null): boolean {
  if (!tipoVehiculo) return false;
  return BUS_TYPES.has(tipoVehiculo.trim().toUpperCase());
}

// ============================================================
// PROCESAMIENTO PRINCIPAL
// ============================================================

interface ImportStats {
  totalRows: number;
  inserted: number;
  skipped: number;
  errors: number;
  vehiclesCreated: number;
  missingDepartamentos: Set<string>;
  missingMunicipios: Set<string>;
  missingRutas: Set<string>;
  missingTiposSituacion: Set<string>;
}

async function processRow(
  row: any[],
  rowIndex: number,
  mesName: string,
  cat: Catalogs,
  stats: ImportStats,
  dryRun: boolean
): Promise<void> {
  const sede = cleanStr(row[0]);
  const boleta = cleanStr(row[1]);
  if (!sede || !boleta) return; // Fila vacía

  const codigoBoleta = `${sede}-${boleta}`;

  // Check duplicado
  if (!dryRun) {
    const exists = await db.oneOrNone(
      'SELECT id FROM situacion WHERE codigo_boleta = $1', [codigoBoleta]
    );
    if (exists) {
      stats.skipped++;
      return;
    }
  }

  // --- Parsear campos de situacion ---
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
  if (deptoName && !deptoId) stats.missingDepartamentos.add(deptoName);

  const muniId = lookupMunicipio(cat, muniName || '', deptoId);
  if (muniName && !muniId) stats.missingMunicipios.add(muniName);

  const rutaId = lookupRuta(cat, rutaCodigo || '');
  if (rutaCodigo && !rutaId) stats.missingRutas.add(rutaCodigo);

  const tipoSituacionId = lookupTipoSituacion(cat, tipoAccidente || '');
  if (tipoAccidente && !tipoSituacionId) stats.missingTiposSituacion.add(tipoAccidente);

  // Campos finales (cols 459+)
  const causaProbable = cleanStr(row[FINAL_COLS_START]);
  const tipoPavimento = cleanStr(row[FINAL_COLS_START + 1]);
  const viaEstado = cleanStr(row[FINAL_COLS_START + 2]);
  const viaTopografia = cleanStr(row[FINAL_COLS_START + 3]);
  const viaGeometria = cleanStr(row[FINAL_COLS_START + 4]);
  const viaCondicion = cleanStr(row[FINAL_COLS_START + 5]);
  const clima = cleanStr(row[FINAL_COLS_START + 6]);

  // Observaciones + metadata de unidad/brigada
  let observaciones = cleanStr(row[FINAL_COLS_START + 13]) || ''; // col 472
  const chapa = cleanStr(row[FINAL_COLS_START + 7]);
  const brigada = cleanStr(row[FINAL_COLS_START + 8]);
  const unidadCod = cleanStr(row[FINAL_COLS_START + 9]);
  const authChapa = cleanStr(row[FINAL_COLS_START + 10]);
  const authNombre = cleanStr(row[FINAL_COLS_START + 11]);
  const authUnidad = cleanStr(row[FINAL_COLS_START + 12]);

  const metadata: string[] = [];
  if (chapa) metadata.push(`Chapa: ${chapa}`);
  if (brigada) metadata.push(`Brigada: ${brigada}`);
  if (unidadCod) metadata.push(`Unidad: ${unidadCod}`);
  if (metadata.length > 0) {
    observaciones += (observaciones ? '\n' : '') + `[${metadata.join('] [')}]`;
  }

  if (dryRun) {
    stats.inserted++;
    // Contar vehículos en dry run
    for (let v = 0; v < MAX_VEHICLES; v++) {
      const base = VEHICLE_START_COL + v * VEHICLE_BLOCK_SIZE;
      if (!isNull(row[base])) stats.vehiclesCreated++;
    }
    return;
  }

  // --- INSERT situacion ---
  const situacion = await db.one(
    `INSERT INTO situacion (
      tipo_situacion, estado, codigo_boleta, origen_datos,
      grupo, departamento_id, municipio_id, area,
      ruta_id, sentido, km, created_at,
      tipo_situacion_id, causa_probable,
      tipo_pavimento, via_estado, via_topografia, via_geometria, via_condicion,
      clima, observaciones, creado_por
    ) VALUES (
      'INCIDENTE', 'CERRADA', $1, 'EXCEL_2025',
      $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11,
      $12, $13, $14, $15, $16,
      $17, $18, 1
    ) RETURNING id`,
    [
      codigoBoleta, grupo, deptoId, muniId, area,
      rutaId, sentido, km, createdAt,
      tipoSituacionId, causaProbable,
      tipoPavimento, viaEstado, viaTopografia, viaGeometria, viaCondicion,
      clima, observaciones || null,
    ]
  );

  const situacionId = situacion.id;

  // --- Procesar vehículos ---
  for (let v = 0; v < MAX_VEHICLES; v++) {
    const base = VEHICLE_START_COL + v * VEHICLE_BLOCK_SIZE;
    const tipoVehNombre = cleanStr(row[base]);
    if (!tipoVehNombre) continue; // No hay más vehículos

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
      // 1. Resolve tipo_vehiculo_id y marca_id
      const tipoVehiculoId = await lookupOrCreateTipoVehiculo(cat, tipoVehNombre);
      const marcaId = marcaNombre ? await lookupOrCreateMarca(cat, marcaNombre) : null;

      // 2. Upsert vehiculo
      const vehiculo = await db.one(
        `INSERT INTO vehiculo (placa, tipo_vehiculo_id, marca_id, color, empresa)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (placa) DO UPDATE SET
           tipo_vehiculo_id = COALESCE(EXCLUDED.tipo_vehiculo_id, vehiculo.tipo_vehiculo_id),
           marca_id = COALESCE(EXCLUDED.marca_id, vehiculo.marca_id),
           color = COALESCE(EXCLUDED.color, vehiculo.color),
           empresa = COALESCE(EXCLUDED.empresa, vehiculo.empresa),
           total_incidentes = vehiculo.total_incidentes + 1,
           ultimo_incidente = NOW(),
           updated_at = NOW()
         RETURNING id`,
        [placa, tipoVehiculoId, marcaId, color, empresa]
      );

      // 3. Upsert piloto (si tiene licencia o nombre)
      let pilotoId: number | null = null;
      if (licNumero && nombrePiloto) {
        const licNum = BigInt(String(licNumero).replace(/\D/g, '') || '0');
        if (licNum > 0) {
          const piloto = await db.one(
            `INSERT INTO piloto (licencia_numero, nombre, licencia_tipo, sexo, etnia)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (licencia_numero) DO UPDATE SET
               nombre = COALESCE(EXCLUDED.nombre, piloto.nombre),
               licencia_tipo = COALESCE(EXCLUDED.licencia_tipo, piloto.licencia_tipo),
               sexo = COALESCE(EXCLUDED.sexo, piloto.sexo),
               etnia = COALESCE(EXCLUDED.etnia, piloto.etnia),
               total_incidentes = piloto.total_incidentes + 1,
               ultimo_incidente = NOW(),
               updated_at = NOW()
             RETURNING id`,
            [licNum.toString(), nombrePiloto, licTipo, sexo, etnia]
          );
          pilotoId = piloto.id;
        }
      }

      // 4. datos_piloto JSONB
      const datosPiloto = {
        estado_persona: estadoPiloto,
        ebriedad,
      };

      // 5. custodia
      const custodiaEstado = consignado?.toUpperCase() === 'SI' ? 'CONSIGNADO' : null;
      const custodiaDatos = consignadoPor ? { consignado_por: consignadoPor } : null;

      // 6. INSERT situacion_vehiculo
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
          estadoPiloto, pasIlesos,
          pasLesionados, pasFallecidos,
          JSON.stringify(datosPiloto), custodiaEstado,
          custodiaDatos ? JSON.stringify(custodiaDatos) : null,
          edad, pasTrasladados,
        ]
      );

      // 7. Tarjeta de circulación
      if (nitTarjeta || modelo || domicilio) {
        const nitNum = nitTarjeta ? String(nitTarjeta).replace(/\D/g, '') : null;
        await db.none(
          `INSERT INTO tarjeta_circulacion (vehiculo_id, nit, modelo, direccion_propietario)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [vehiculo.id, nitNum ? BigInt(nitNum).toString() : null, modelo, domicilio]
        );
      }

      // 8. Bus (solo si es tipo bus y tiene datos)
      if (isBusType(tipoVehNombre) && (licTransportes || tarOperaciones || seguro || poliza)) {
        await db.none(
          `INSERT INTO bus (vehiculo_id, licencia_transportes, tarjeta_operaciones, seguro, poliza)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [vehiculo.id, licTransportes, tarOperaciones, seguro, poliza]
        );
      }

      // 9. Dispositivo de seguridad
      if (dispSegNombre) {
        const dispId = lookupDispositivo(cat, dispSegNombre);
        if (dispId) {
          await db.none(
            `INSERT INTO situacion_vehiculo_dispositivo (situacion_vehiculo_id, dispositivo_seguridad_id, estado)
             VALUES ($1, $2, 'FUNCIONANDO')
             ON CONFLICT DO NOTHING`,
            [sv.id, dispId]
          );
        }
      }

      stats.vehiclesCreated++;
    } catch (vErr: any) {
      console.error(`  [VEHICULO ERROR] ${mesName} fila ${rowIndex + 1} veh ${v + 1}: ${vErr.message}`);
    }
  }

  // --- Autoridad ---
  if (authChapa || authNombre || authUnidad) {
    try {
      await db.none(
        `INSERT INTO autoridad (situacion_id, tipo, datos) VALUES ($1, $2, $3)`,
        [
          situacionId,
          'PNC',
          JSON.stringify({ chapa: authChapa, nombre: authNombre, unidad: authUnidad }),
        ]
      );
    } catch (aErr: any) {
      console.error(`  [AUTORIDAD ERROR] ${mesName} fila ${rowIndex + 1}: ${aErr.message}`);
    }
  }

  stats.inserted++;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const mesFilter = args.includes('--mes') ? args[args.indexOf('--mes') + 1]?.toUpperCase() : null;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  IMPORTACIÓN EXCEL → ProVial DB`);
  console.log(`  Modo: ${dryRun ? 'DRY-RUN (sin escritura)' : 'EJECUCIÓN REAL'}`);
  if (mesFilter) console.log(`  Filtro: solo mes ${mesFilter}`);
  console.log(`${'='.repeat(60)}\n`);

  const cat = await loadCatalogs();

  console.log(`\nLeyendo Excel: ${EXCEL_PATH}`);
  const wb = XLSX.readFile(EXCEL_PATH);

  const mesesAProcesar = mesFilter ? [mesFilter] : MESES;

  const stats: ImportStats = {
    totalRows: 0,
    inserted: 0,
    skipped: 0,
    errors: 0,
    vehiclesCreated: 0,
    missingDepartamentos: new Set(),
    missingMunicipios: new Set(),
    missingRutas: new Set(),
    missingTiposSituacion: new Set(),
  };

  for (const mes of mesesAProcesar) {
    const ws = wb.Sheets[mes];
    if (!ws) {
      console.log(`\n[SKIP] Hoja "${mes}" no encontrada`);
      continue;
    }

    console.log(`\n--- Procesando: ${mes} ---`);
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', range: `A1:PS5000` });

    for (let i = 1; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row[0] || row[0] === '') continue; // Fila vacía

      stats.totalRows++;
      try {
        await processRow(row, i, mes, cat, stats, dryRun);
      } catch (err: any) {
        stats.errors++;
        console.error(`  [ERROR] ${mes} fila ${i + 1}: ${err.message}`);
      }
    }
  }

  // Reporte final
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  RESUMEN`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  Total filas procesadas:  ${stats.totalRows}`);
  console.log(`  Insertadas:              ${stats.inserted}`);
  console.log(`  Saltadas (duplicados):   ${stats.skipped}`);
  console.log(`  Errores:                 ${stats.errors}`);
  console.log(`  Vehículos creados:       ${stats.vehiclesCreated}`);

  if (stats.missingDepartamentos.size > 0) {
    console.log(`\n  Departamentos no encontrados: ${Array.from(stats.missingDepartamentos).join(', ')}`);
  }
  if (stats.missingMunicipios.size > 0) {
    console.log(`  Municipios no encontrados: ${Array.from(stats.missingMunicipios).join(', ')}`);
  }
  if (stats.missingRutas.size > 0) {
    console.log(`  Rutas no encontradas: ${Array.from(stats.missingRutas).join(', ')}`);
  }
  if (stats.missingTiposSituacion.size > 0) {
    console.log(`  Tipos de situación no encontrados: ${Array.from(stats.missingTiposSituacion).join(', ')}`);
  }

  console.log(`\n${'='.repeat(60)}\n`);

  process.exit(0);
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
