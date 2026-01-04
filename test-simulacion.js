const { Pool } = require('pg');
const http = require('http');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: 'localhost', port: 5432, database: 'provial_db', user: 'postgres', password: 'postgres'
});

// Datos de la simulación
const UNIDAD_ID = 406;      // Unidad 030
const PILOTO_ID = 448;      // Hugo Leonel
const COPILOTO_ID = 531;    // Aury Ayendy
const RUTA_ID = 70;         // CA-1 Occidente

async function apiCall(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : '';
    const req = http.request({
      hostname: 'localhost', port: 3000, path, method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(responseBody)); }
        catch(e) { resolve({ raw: responseBody }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('🚀 SIMULACIÓN DE FLUJO COMPLETO');
  console.log('================================\n');

  // 1. Actualizar contraseña del piloto
  const hash = bcrypt.hashSync('password123', 10);
  await pool.query('UPDATE usuario SET password_hash = $1 WHERE id = $2', [hash, PILOTO_ID]);
  console.log('✅ Contraseña del piloto actualizada (19083 / password123)');

  // 2. Login como piloto
  const loginRes = await apiCall('POST', '/api/auth/login', { username: '19083', password: 'password123' });
  if (!loginRes.accessToken) {
    console.log('❌ Error login:', loginRes.error);
    await pool.end();
    return;
  }
  const TOKEN = loginRes.accessToken;
  console.log('✅ Login exitoso como piloto Hugo Leonel\n');

  // 3. Crear salida directamente en BD
  console.log('🚗 Creando salida de unidad 030...');
  await pool.query('DELETE FROM situacion WHERE unidad_id = $1', [UNIDAD_ID]);
  await pool.query('DELETE FROM salida_unidad WHERE unidad_id = $1', [UNIDAD_ID]);
  const salidaResult = await pool.query(
    `INSERT INTO salida_unidad (unidad_id, ruta_inicial_id, km_inicial, combustible_inicial, estado, fecha_hora_salida, sede_origen_id)
     VALUES ($1, $2, 45000, 75, 'EN_SALIDA', NOW(), 1)
     RETURNING id`,
    [UNIDAD_ID, RUTA_ID]
  );
  const SALIDA_ID = salidaResult.rows[0].id;
  console.log('   ✅ Unidad 030 en ruta');
  console.log('   ✅ Salida ID:', SALIDA_ID);
  console.log('   ✅ Ruta: CA-1 Occidente\n');

  await sleep(2000);

  // 5. Crear situación de patrullaje inicial
  console.log('📍 Registrando patrullaje...');
  const patrullajeRes = await apiCall('POST', '/api/situaciones', {
    tipo_situacion: 'PATRULLAJE',
    unidad_id: UNIDAD_ID,
    ruta_id: RUTA_ID,
    km: 52.5,
    sentido: 'NORTE',
    latitud: 14.6234,
    longitud: -90.5456,
    descripcion: 'Patrullaje normal en CA-1'
  }, TOKEN);
  console.log('   ✅ Situación creada ID:', patrullajeRes.situacion?.id || 'error');

  await sleep(3000);

  // 6. ¡ACCIDENTE! Crear incidente
  console.log('\n🚨 ¡ACCIDENTE REPORTADO!');
  const accidenteRes = await apiCall('POST', '/api/situaciones', {
    tipo_situacion: 'INCIDENTE',
    unidad_id: UNIDAD_ID,
    ruta_id: RUTA_ID,
    km: 58.2,
    sentido: 'NORTE',
    latitud: 14.6407,
    longitud: -90.5133,
    descripcion: 'Colisión múltiple - 3 vehículos involucrados',
    observaciones: 'Requiere grúa y ambulancia'
  }, TOKEN);
  console.log('   ✅ Incidente registrado ID:', accidenteRes.situacion?.id || 'error');
  console.log('   📍 Ubicación: CA-1 Occidente Km 58.2 Norte');
  console.log('   🚗 3 vehículos involucrados');

  console.log('\n================================');
  console.log('✅ SIMULACIÓN COMPLETADA');
  console.log('   Revisa el Dashboard para ver las actualizaciones en tiempo real!');

  await pool.end();
}

main().catch(err => {
  console.error('Error:', err);
  pool.end();
});
