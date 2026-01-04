const XLSX = require('xlsx');
const path = require('path');

// Leer el archivo Excel
const filePath = path.join(__dirname, 'ESTADO DE FUERZA G1 Y G2.xlsx');
const workbook = XLSX.readFile(filePath);

function processGrupoSheet(sheetName, grupoNum) {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // El encabezado real está en la fila 2 (índice 1)
  const headers = data[1];
  const sedeIndex = headers.findIndex(h => h && h.toString().includes('SEDE'));
  const nombreIndex = headers.findIndex(h => h && h.toString().includes('NOMBRE'));
  const chapaIndex = headers.findIndex(h => h && h.toString().includes('CHAPA'));

  const brigadas = [];
  const conteoSedes = {};

  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[nombreIndex]) continue;

    const sede = row[sedeIndex] || 'SIN SEDE';
    const nombre = row[nombreIndex];
    const chapa = row[chapaIndex];

    brigadas.push({ nombre, chapa, sede });
    conteoSedes[sede] = (conteoSedes[sede] || 0) + 1;
  }

  console.log(`\n=== GRUPO ${grupoNum} (Excel) ===`);
  console.log(`Total brigadas: ${brigadas.length}`);
  console.log('\nConteo por sede:');
  Object.entries(conteoSedes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([sede, count]) => {
      console.log(`  ${sede}: ${count}`);
    });

  return { brigadas, conteoSedes };
}

// Procesar ambos grupos
const grupo1 = processGrupoSheet('GRUPO NO 1', 1);
const grupo2 = processGrupoSheet('GRUPO NO 2', 2);

// Mapeo de nombres de sede Excel -> BD
const mapeoSedes = {
  'SEDE CENTRAL': 'Central',
  'CENTRAL': 'Central',
  'MAZATENANGO': 'Mazatenango',
  'POPTUN': 'Poptún',
  'SAN CRISTOBAL': 'San Cristóbal',
  'QUETZALTENANGO': 'Quetzaltenango',
  'COATEPEQUE': 'Coatepeque',
  'PALIN': 'Palín Escuintla',
  'PALÍN': 'Palín Escuintla',
  'MORALES': 'Morales',
  'RIO DULCE': 'Río Dulce',
  'RÍO DULCE': 'Río Dulce',
};

// Normalizar sede
function normalizarSede(sede) {
  const sedeUpper = sede.toUpperCase().trim();
  for (const [key, value] of Object.entries(mapeoSedes)) {
    if (sedeUpper.includes(key)) return value;
  }
  return sede;
}

// Comparación final
console.log('\n\n========================================');
console.log('RESUMEN COMPARATIVO');
console.log('========================================');

console.log('\nDatos del Excel vs Base de Datos esperada:');
console.log('(Los datos de BD son los que mostraste antes)');

const bdData = {
  'Central': { g1: 95, g2: 95 },
  'Mazatenango': { g1: 12, g2: 13 },
  'Poptún': { g1: 0, g2: 26 },
  'San Cristóbal': { g1: 15, g2: 17 },
  'Quetzaltenango': { g1: 14, g2: 14 },
  'Coatepeque': { g1: 11, g2: 9 },
  'Palín Escuintla': { g1: 19, g2: 0 },
  'Morales': { g1: 11, g2: 13 },
  'Río Dulce': { g1: 12, g2: 13 },
};

// Agrupar Excel por sede normalizada
const excelG1 = {};
const excelG2 = {};

Object.entries(grupo1.conteoSedes).forEach(([sede, count]) => {
  const sedeNorm = normalizarSede(sede);
  excelG1[sedeNorm] = (excelG1[sedeNorm] || 0) + count;
});

Object.entries(grupo2.conteoSedes).forEach(([sede, count]) => {
  const sedeNorm = normalizarSede(sede);
  excelG2[sedeNorm] = (excelG2[sedeNorm] || 0) + count;
});

console.log('\n| Sede | Excel G1 | BD G1 | Diff | Excel G2 | BD G2 | Diff |');
console.log('|------|----------|-------|------|----------|-------|------|');

const todasSedes = new Set([...Object.keys(excelG1), ...Object.keys(excelG2), ...Object.keys(bdData)]);
let totalExcelG1 = 0, totalBdG1 = 0, totalExcelG2 = 0, totalBdG2 = 0;

todasSedes.forEach(sede => {
  const eg1 = excelG1[sede] || 0;
  const bg1 = bdData[sede]?.g1 || 0;
  const eg2 = excelG2[sede] || 0;
  const bg2 = bdData[sede]?.g2 || 0;

  totalExcelG1 += eg1;
  totalBdG1 += bg1;
  totalExcelG2 += eg2;
  totalBdG2 += bg2;

  const diff1 = eg1 - bg1;
  const diff2 = eg2 - bg2;
  const d1 = diff1 > 0 ? `+${diff1}` : diff1;
  const d2 = diff2 > 0 ? `+${diff2}` : diff2;

  console.log(`| ${sede.padEnd(16)} | ${String(eg1).padStart(8)} | ${String(bg1).padStart(5)} | ${String(d1).padStart(4)} | ${String(eg2).padStart(8)} | ${String(bg2).padStart(5)} | ${String(d2).padStart(4)} |`);
});

console.log('|------|----------|-------|------|----------|-------|------|');
const totalD1 = totalExcelG1 - totalBdG1;
const totalD2 = totalExcelG2 - totalBdG2;
console.log(`| TOTAL            | ${String(totalExcelG1).padStart(8)} | ${String(totalBdG1).padStart(5)} | ${String(totalD1 > 0 ? '+' + totalD1 : totalD1).padStart(4)} | ${String(totalExcelG2).padStart(8)} | ${String(totalBdG2).padStart(5)} | ${String(totalD2 > 0 ? '+' + totalD2 : totalD2).padStart(4)} |`);

// Listar chapas del Excel para ver cuáles faltan
console.log('\n\nChapas en Excel Grupo 1:');
const chapasG1 = grupo1.brigadas.map(b => b.chapa).filter(c => c).sort((a,b) => a-b);
console.log(`Total: ${chapasG1.length}`);

console.log('\nChapas en Excel Grupo 2:');
const chapasG2 = grupo2.brigadas.map(b => b.chapa).filter(c => c).sort((a,b) => a-b);
console.log(`Total: ${chapasG2.length}`);
