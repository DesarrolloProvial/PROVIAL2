const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Leer el archivo Excel
const filePath = path.join(__dirname, 'ESTADO DE FUERZA G1 Y G2.xlsx');
const workbook = XLSX.readFile(filePath);

// Mapeo de departamentos del Excel -> sede_id en BD
const mapeoSedes = {
  'SEDE CENTRAL': 1, 'CENTRAL': 1, 'COP': 1, 'ACADEMIA': 1,
  'ASUNTOS INTER': 1, 'ASUNTOS INTERNOS': 1, 'ACCIDENTOLOGIA': 1,
  'EDU. VIAL': 1, 'EDUCACION VIAL': 1, 'FINANCIERO': 1, 'FINACIERO': 1,
  'VOCERIA': 1, 'DIRECCION': 1, 'INVENTARIO': 1, 'ALMACEN': 1,
  'MAZATENANGO': 2,
  'POPTUN': 3, 'SEDE PETEN': 3, 'POPTUN  PETEN': 3,
  'SAN CRISTOBAL': 4, 'SAN CRISTOBAL AC': 4, 'SAN CRISTOBAL AC.': 4,
  'QUETZALTENANGO': 5,
  'COATEPEQUE': 6, 'SEDE COATEPEQUE': 6,
  'PALIN': 7, 'SUB-SEDE PALIN': 7, 'PALIN-ESCUINTLA': 7,
  'MORALES': 8, 'MORALES IZA': 8, 'MORALES IZABAL': 8,
  'RIO DULCE': 9, 'RÍO DULCE': 9,
};

function getSedeId(sedeExcel) {
  if (!sedeExcel) return 1;
  const sedeUpper = sedeExcel.toUpperCase().trim();
  for (const [key, value] of Object.entries(mapeoSedes)) {
    if (sedeUpper.includes(key) || key.includes(sedeUpper)) {
      return value;
    }
  }
  return 1;
}

function processGrupoSheet(sheetName, grupoNum) {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const headers = data[1];
  const nombreIndex = headers.findIndex(h => h && h.toString().includes('NOMBRE'));
  const chapaIndex = headers.findIndex(h => h && h.toString().includes('CHAPA'));
  const sedeIndex = headers.findIndex(h => h && h.toString().includes('SEDE'));
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
      sede_id: getSedeId(row[sedeIndex]),
      genero: row[generoIndex]?.toString().trim() || null,
      grupo: grupoNum
    });
  }
  return brigadas;
}

const grupo1 = processGrupoSheet('GRUPO NO 1', 1);
const grupo2 = processGrupoSheet('GRUPO NO 2', 2);

// Crear mapa de chapa -> datos
const brigadasMap = new Map();
[...grupo1, ...grupo2].forEach(b => {
  brigadasMap.set(b.chapa, b);
});

console.log('-- =====================================================');
console.log('-- SQL PARA ACTUALIZAR GRUPOS Y SEDES DE BRIGADAS');
console.log('-- Basado en Excel "ESTADO DE FUERZA G1 Y G2"');
console.log('-- =====================================================\n');

console.log('BEGIN;\n');

// Generar UPDATEs por chapa
console.log('-- Actualizar grupo y sede para cada brigada\n');

brigadasMap.forEach((b, chapa) => {
  const generoValue = b.genero ? `'${b.genero}'` : 'NULL';
  console.log(`UPDATE usuario SET grupo = ${b.grupo}, sede_id = ${b.sede_id}, genero = ${generoValue} WHERE chapa = '${chapa}';`);
});

console.log('\n-- Verificar cambios');
console.log(`
SELECT
  s.nombre as sede,
  u.grupo,
  COUNT(*) as total
FROM usuario u
JOIN sede s ON u.sede_id = s.id
JOIN rol r ON u.rol_id = r.id
WHERE r.nombre = 'BRIGADA'
GROUP BY s.nombre, u.grupo
ORDER BY s.nombre, u.grupo;
`);

console.log('\nCOMMIT;\n');

// También guardar como archivo SQL
const sqlStatements = [];
sqlStatements.push('BEGIN;');
sqlStatements.push('');
brigadasMap.forEach((b, chapa) => {
  const generoValue = b.genero ? `'${b.genero}'` : 'NULL';
  sqlStatements.push(`UPDATE usuario SET grupo = ${b.grupo}, sede_id = ${b.sede_id}, genero = ${generoValue} WHERE chapa = '${chapa}';`);
});
sqlStatements.push('');
sqlStatements.push('COMMIT;');

fs.writeFileSync(
  path.join(__dirname, 'update_brigadas.sql'),
  sqlStatements.join('\n')
);

console.log('-- SQL guardado en update_brigadas.sql');
console.log(`-- Total brigadas a actualizar: ${brigadasMap.size}`);
