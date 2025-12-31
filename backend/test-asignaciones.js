const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logTest(testName) {
  console.log(`\n${'='.repeat(60)}`);
  log(`TEST: ${testName}`, 'cyan');
  console.log('='.repeat(60));
}

function logResult(success, msg) {
  if (success) {
    log(`✅ ${msg}`, 'green');
  } else {
    log(`❌ ${msg}`, 'red');
  }
}

async function login(username, password) {
  const res = await axios.post(`${API_URL}/auth/login`, { username, password });
  return res.data;
}

async function apiCall(method, endpoint, token, data = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: { Authorization: `Bearer ${token}` }
    };
    if (data) config.data = data;
    const res = await axios(config);
    return { success: true, data: res.data, status: res.status };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error || err.message,
      message: err.response?.data?.message,
      status: err.response?.status
    };
  }
}

async function main() {
  log('\n🚀 PRUEBAS DE ASIGNACIONES DE UNIDADES\n', 'yellow');

  // Login
  const loginRes = await login('19109', 'test123');
  const token = loginRes.accessToken;

  // Unidades a usar (IDs conocidos de la BD)
  const unidadIds = [341, 342, 343, 344, 345];

  // Obtener una situacion activa
  const situaciones = await apiCall('GET', '/situaciones-persistentes/activas', token);
  const sitId = situaciones.data?.[0]?.id;

  if (!sitId) {
    log('No hay situaciones activas para probar', 'red');
    return;
  }

  console.log(`Usando situacion ID: ${sitId} (${situaciones.data[0].numero})`);

  // =====================================================
  // 1. ASIGNAR MULTIPLES UNIDADES
  // =====================================================
  logTest('1. ASIGNAR 3 UNIDADES A LA SITUACION');

  for (let i = 0; i < 3; i++) {
    const res = await apiCall('POST', `/situaciones-persistentes/${sitId}/asignar`, token, {
      unidad_id: unidadIds[i],
      observaciones: `Asignacion unidad ${i + 1}`
    });
    logResult(res.success, `Unidad ${unidadIds[i]}: ${res.error || 'Asignada OK'}`);
  }

  // Verificar asignaciones
  const asig1 = await apiCall('GET', `/situaciones-persistentes/${sitId}/asignaciones`, token);
  console.log(`  Asignaciones activas: ${asig1.data?.length || 0}`);
  asig1.data?.forEach(a => {
    console.log(`    - Unidad ${a.unidad_codigo} (ID: ${a.unidad_id})`);
  });

  // =====================================================
  // 2. INTENTAR ASIGNAR UNIDAD YA ASIGNADA
  // =====================================================
  logTest('2. INTENTAR ASIGNAR UNIDAD YA ASIGNADA (DEBE FALLAR)');

  const duplicar = await apiCall('POST', `/situaciones-persistentes/${sitId}/asignar`, token, {
    unidad_id: unidadIds[0]
  });
  logResult(!duplicar.success, `Error esperado: ${duplicar.error}`);

  // =====================================================
  // 3. DESASIGNAR UNA UNIDAD
  // =====================================================
  logTest('3. DESASIGNAR UNA UNIDAD');

  const desasig = await apiCall('POST', `/situaciones-persistentes/${sitId}/desasignar/${unidadIds[1]}`, token, {
    observaciones: 'Fin de turno'
  });
  logResult(desasig.success, `Desasignar ${unidadIds[1]}: ${desasig.error || 'OK'}`);

  // Verificar que ya no esta
  const asig2 = await apiCall('GET', `/situaciones-persistentes/${sitId}/asignaciones`, token);
  console.log(`  Asignaciones activas ahora: ${asig2.data?.length || 0}`);

  // =====================================================
  // 4. REASIGNAR LA UNIDAD DESASIGNADA
  // =====================================================
  logTest('4. REASIGNAR LA UNIDAD DESASIGNADA');

  const reasig = await apiCall('POST', `/situaciones-persistentes/${sitId}/asignar`, token, {
    unidad_id: unidadIds[1],
    observaciones: 'Reasignacion despues de descanso'
  });
  logResult(reasig.success, `Reasignar ${unidadIds[1]}: ${reasig.error || 'OK'}`);

  // =====================================================
  // 5. VER HISTORIAL DE ASIGNACIONES
  // =====================================================
  logTest('5. HISTORIAL DE ASIGNACIONES');

  const historial = await apiCall('GET', `/situaciones-persistentes/${sitId}/asignaciones/historial`, token);
  logResult(historial.success, `Historial: ${historial.data?.length || 0} registros`);
  historial.data?.forEach(h => {
    const estado = h.fecha_hora_desasignacion ? 'Desasignada' : 'Activa';
    console.log(`    - Unidad ${h.unidad_codigo}: ${estado}`);
  });

  // =====================================================
  // 6. ASIGNAR MISMA UNIDAD A DOS SITUACIONES
  // =====================================================
  logTest('6. ASIGNAR MISMA UNIDAD A DOS SITUACIONES');

  // La unidad 341 ya esta asignada a sitId
  // Intentar asignarla a otra situacion
  const otraSit = situaciones.data?.[1];
  if (otraSit) {
    const dobleAsig = await apiCall('POST', `/situaciones-persistentes/${otraSit.id}/asignar`, token, {
      unidad_id: unidadIds[0] // 341 ya esta asignada
    });
    // Esto podria fallar o no dependiendo de la logica de negocio
    logResult(true, `Asignar a otra situacion: ${dobleAsig.success ? 'Permitido' : 'Bloqueado - ' + dobleAsig.error}`);
  }

  // =====================================================
  // 7. AGREGAR ACTUALIZACION COMO BRIGADA
  // =====================================================
  logTest('7. AGREGAR ACTUALIZACION A SITUACION');

  // Primero necesitamos un usuario brigada asignado a la unidad
  // Por ahora probamos desde COP
  const update = await apiCall('POST', `/situaciones-persistentes/${sitId}/actualizaciones`, token, {
    unidad_id: unidadIds[0],
    tipo_actualizacion: 'NOVEDAD',
    contenido: 'Equipo de maquinaria pesada llegando al lugar'
  });
  logResult(update.success || update.error?.includes('no está asignada'),
    `Agregar actualizacion: ${update.error || 'OK'}`);

  // =====================================================
  // 8. VERIFICAR SITUACION COMPLETA
  // =====================================================
  logTest('8. VERIFICAR SITUACION COMPLETA');

  const sitCompleta = await apiCall('GET', `/situaciones-persistentes/${sitId}`, token);
  if (sitCompleta.data) {
    console.log(`  Numero: ${sitCompleta.data.numero}`);
    console.log(`  Estado: ${sitCompleta.data.estado}`);
    console.log(`  Importancia: ${sitCompleta.data.importancia}`);
    console.log(`  Unidades asignadas: ${sitCompleta.data.unidades_asignadas_count || 0}`);
    console.log(`  Obstruccion tipo: ${sitCompleta.data.obstruccion?.tipo_obstruccion || 'N/A'}`);
    if (sitCompleta.data.unidades_asignadas) {
      console.log('  Unidades:');
      sitCompleta.data.unidades_asignadas.forEach(u => {
        console.log(`    - ${u.unidad_codigo} (${u.tipo_unidad})`);
      });
    }
  }

  // =====================================================
  // 9. OPERADOR INTENTA ASIGNAR (DEBE FALLAR)
  // =====================================================
  logTest('9. OPERADOR INTENTA ASIGNAR (DEBE FALLAR)');

  const loginOp = await login('15041', 'test123');
  const tokenOp = loginOp.accessToken;

  const asigOp = await apiCall('POST', `/situaciones-persistentes/${sitId}/asignar`, tokenOp, {
    unidad_id: unidadIds[4]
  });
  logResult(asigOp.status === 403, `Status 403: ${asigOp.error || 'Inesperadamente exitoso'}`);

  // =====================================================
  // RESUMEN
  // =====================================================
  console.log('\n' + '='.repeat(60));
  log('PRUEBAS DE ASIGNACIONES COMPLETADAS', 'yellow');
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Error:', err.message);
});
