const XLSX = require('xlsx');
const path = require('path');

// Leer el archivo Excel
const filePath = path.join(__dirname, 'ESTADO DE FUERZA G1 Y G2.xlsx');
const workbook = XLSX.readFile(filePath);

// Mapeo de departamentos del Excel -> sede_id en BD
const mapeoSedes = {
  'SEDE CENTRAL': 1,
  'CENTRAL': 1,
  'COP': 1,  // Departamento administrativo -> Central
  'ACADEMIA': 1,
  'ASUNTOS INTER': 1,
  'ASUNTOS INTERNOS': 1,
  'ACCIDENTOLOGIA': 1,
  'EDU. VIAL': 1,
  'EDUCACION VIAL': 1,
  'FINANCIERO': 1,
  'FINACIERO': 1,
  'VOCERIA': 1,
  'DIRECCION': 1,
  'INVENTARIO': 1,
  'ALMACEN': 1,
  'MAZATENANGO': 2,
  'POPTUN': 3,
  'SEDE PETEN': 3,
  'POPTUN  PETEN': 3,
  'SAN CRISTOBAL': 4,
  'SAN CRISTOBAL AC': 4,
  'SAN CRISTOBAL AC.': 4,
  'QUETZALTENANGO': 5,
  'COATEPEQUE': 6,
  'SEDE COATEPEQUE': 6,
  'PALIN': 7,
  'SUB-SEDE PALIN': 7,
  'PALIN-ESCUINTLA': 7,
  'MORALES': 8,
  'MORALES IZA': 8,
  'MORALES IZABAL': 8,
  'RIO DULCE': 9,
  'RÍO DULCE': 9,
};

function getSedeId(sedeExcel) {
  if (!sedeExcel) return 1; // Default a Central
  const sedeUpper = sedeExcel.toUpperCase().trim();

  for (const [key, value] of Object.entries(mapeoSedes)) {
    if (sedeUpper.includes(key) || key.includes(sedeUpper)) {
      return value;
    }
  }

  console.warn(`  ⚠️ Sede no mapeada: "${sedeExcel}" -> asignando a Central`);
  return 1;
}

function processGrupoSheet(sheetName, grupoNum) {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // El encabezado real está en la fila 2 (índice 1)
  const headers = data[1];
  const nombreIndex = headers.findIndex(h => h && h.toString().includes('NOMBRE'));
  const chapaIndex = headers.findIndex(h => h && h.toString().includes('CHAPA'));
  const sedeIndex = headers.findIndex(h => h && h.toString().includes('SEDE'));
  const rangoIndex = headers.findIndex(h => h && h.toString().includes('RANGO'));
  const generoIndex = headers.findIndex(h => h && h.toString().includes('GENERO'));

  const brigadas = [];

  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[nombreIndex]) continue;

    const chapa = row[chapaIndex]?.toString().trim();
    if (!chapa) continue;

    brigadas.push({
      chapa,
      nombre: row[nombreIndex]?.toString().trim(),
      sede_excel: row[sedeIndex]?.toString().trim() || 'CENTRAL',
      sede_id: getSedeId(row[sedeIndex]),
      rango: row[rangoIndex]?.toString().trim() || null,
      genero: row[generoIndex]?.toString().trim() || null,
      grupo: grupoNum
    });
  }

  return brigadas;
}

// Procesar ambos grupos
console.log('Procesando Excel...\n');
const grupo1 = processGrupoSheet('GRUPO NO 1', 1);
const grupo2 = processGrupoSheet('GRUPO NO 2', 2);

const todasBrigadas = [...grupo1, ...grupo2];

console.log(`\nTotal brigadas en Excel: ${todasBrigadas.length}`);
console.log(`  - Grupo 1: ${grupo1.length}`);
console.log(`  - Grupo 2: ${grupo2.length}`);

// Generar SQL para comparar e insertar
console.log('\n\n-- =====================================================');
console.log('-- SQL PARA VERIFICAR Y SINCRONIZAR BRIGADAS');
console.log('-- =====================================================\n');

// Primero, mostrar chapas del Excel
const chapasExcel = todasBrigadas.map(b => b.chapa);
console.log('-- Chapas en Excel:');
console.log(`-- Total: ${chapasExcel.length}\n`);

// SQL para encontrar faltantes
console.log('-- 1. Encontrar brigadas del Excel que NO están en BD:');
console.log(`SELECT '${chapasExcel.join("','")}' AS chapas_excel;\n`);

console.log('-- Query para encontrar faltantes:');
console.log(`
WITH chapas_excel AS (
  SELECT unnest(ARRAY[${chapasExcel.map(c => `'${c}'`).join(',')}]) AS chapa
)
SELECT ce.chapa
FROM chapas_excel ce
LEFT JOIN usuario u ON u.chapa = ce.chapa
WHERE u.id IS NULL;
`);

// Generar INSERTs para las brigadas
console.log('\n-- 2. SQL para insertar brigadas faltantes:');
console.log('-- (Ejecutar después de verificar cuáles faltan)\n');

// Agrupar por sede para mejor organización
const porSede = {};
todasBrigadas.forEach(b => {
  const key = b.sede_id;
  if (!porSede[key]) porSede[key] = [];
  porSede[key].push(b);
});

const sedeNombres = {
  1: 'Central',
  2: 'Mazatenango',
  3: 'Poptún',
  4: 'San Cristóbal',
  5: 'Quetzaltenango',
  6: 'Coatepeque',
  7: 'Palín Escuintla',
  8: 'Morales',
  9: 'Río Dulce'
};

Object.entries(porSede).forEach(([sedeId, brigadas]) => {
  console.log(`\n-- Sede: ${sedeNombres[sedeId]} (${brigadas.length} brigadas)`);
});

// Exportar datos para uso posterior
const outputData = {
  grupo1,
  grupo2,
  todasBrigadas,
  resumen: {
    totalExcel: todasBrigadas.length,
    grupo1: grupo1.length,
    grupo2: grupo2.length,
    porSede: Object.fromEntries(
      Object.entries(porSede).map(([k, v]) => [sedeNombres[k], v.length])
    )
  }
};

// Guardar JSON para uso posterior
const fs = require('fs');
fs.writeFileSync(
  path.join(__dirname, 'brigadas_excel.json'),
  JSON.stringify(outputData, null, 2)
);
console.log('\n\n-- Datos guardados en brigadas_excel.json');

// Mostrar resumen por sede
console.log('\n\n========================================');
console.log('RESUMEN POR SEDE (Excel)');
console.log('========================================');
Object.entries(porSede)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([sedeId, brigadas]) => {
    const g1 = brigadas.filter(b => b.grupo === 1).length;
    const g2 = brigadas.filter(b => b.grupo === 2).length;
    console.log(`${sedeNombres[sedeId].padEnd(18)}: ${brigadas.length.toString().padStart(3)} (G1: ${g1}, G2: ${g2})`);
  });
