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
  log('\n📝 PRUEBAS DE EDICIONES Y CAMBIOS\n', 'yellow');

  // Login como ADMIN_COP (19109)
  const loginAdmin = await login('19109', 'test123');
  const tokenAdmin = loginAdmin.accessToken;
  log(`Login como ADMIN_COP: ${loginAdmin.user.username}`, 'cyan');

  // Login como OPERADOR (15041)
  const loginOp = await login('15041', 'test123');
  const tokenOp = loginOp.accessToken;
  log(`Login como OPERADOR: ${loginOp.user.username}`, 'cyan');

  // Obtener una situacion para editar
  const situaciones = await apiCall('GET', '/situaciones-persistentes/activas', tokenAdmin);
  const sit = situaciones.data?.[0];

  if (!sit) {
    log('No hay situaciones activas para editar', 'red');
    return;
  }

  console.log(`\nUsando situacion: ${sit.numero} (ID: ${sit.id})`);
  console.log(`  Estado: ${sit.estado}`);
  console.log(`  Importancia: ${sit.importancia}`);

  // =====================================================
  // 1. EDITAR TITULO Y DESCRIPCION (ADMIN_COP)
  // =====================================================
  logTest('1. EDITAR TITULO Y DESCRIPCION (ADMIN_COP)');

  const nuevoTitulo = `Situacion editada ${new Date().toISOString().substring(11, 19)}`;
  const editTitulo = await apiCall('PUT', `/situaciones-persistentes/${sit.id}`, tokenAdmin, {
    titulo: nuevoTitulo,
    descripcion: 'Descripcion actualizada desde pruebas automatizadas'
  });
  logResult(editTitulo.success, `Editar titulo: ${editTitulo.error || 'OK'}`);

  // Verificar cambio
  const verificar1 = await apiCall('GET', `/situaciones-persistentes/${sit.id}`, tokenAdmin);
  logResult(
    verificar1.data?.titulo === nuevoTitulo,
    `Titulo actualizado: "${verificar1.data?.titulo?.substring(0, 40)}..."`
  );

  // =====================================================
  // 2. EDITAR IMPORTANCIA (ADMIN_COP)
  // =====================================================
  logTest('2. CAMBIAR IMPORTANCIA (ADMIN_COP)');

  const nuevaImportancia = sit.importancia === 'CRITICA' ? 'ALTA' : 'CRITICA';
  const editImportancia = await apiCall('PUT', `/situaciones-persistentes/${sit.id}`, tokenAdmin, {
    importancia: nuevaImportancia
  });
  logResult(editImportancia.success, `Cambiar importancia a ${nuevaImportancia}: ${editImportancia.error || 'OK'}`);

  // =====================================================
  // 3. EDITAR OBSTRUCCION (ADMIN_COP)
  // =====================================================
  logTest('3. ACTUALIZAR OBSTRUCCION (ADMIN_COP)');

  const editObstruccion = await apiCall('PUT', `/situaciones-persistentes/${sit.id}/completa`, tokenAdmin, {
    obstruccion: {
      hay_vehiculo_fuera_via: true,
      tipo_obstruccion: 'parcial',
      sentido_principal: {
        hay_obstruccion: true,
        total_carriles: 3,
        carriles: [
          { numero: 1, nombre: 'Carril izquierdo', porcentaje: 100 },
          { numero: 2, nombre: 'Carril central', porcentaje: 50 },
          { numero: 3, nombre: 'Carril derecho', porcentaje: 25 }
        ]
      },
      sentido_contrario: {
        hay_obstruccion: false,
        total_carriles: 2,
        carriles: []
      }
    }
  });
  logResult(editObstruccion.success, `Actualizar obstruccion: ${editObstruccion.error || 'OK'}`);

  // Verificar descripcion generada
  const verificar2 = await apiCall('GET', `/situaciones-persistentes/${sit.id}/obstruccion`, tokenAdmin);
  console.log(`  Descripcion generada: "${verificar2.data?.descripcion_manual || 'N/A'}"`);

  // =====================================================
  // 4. OPERADOR INTENTA EDITAR (DEBE FALLAR)
  // =====================================================
  logTest('4. OPERADOR INTENTA EDITAR (DEBE FALLAR)');

  const editOp = await apiCall('PUT', `/situaciones-persistentes/${sit.id}`, tokenOp, {
    titulo: 'Intento de hackeo por operador'
  });
  logResult(
    editOp.status === 403,
    `Operador bloqueado: ${editOp.error || 'PERMITIDO - ERROR!'}`
  );

  // =====================================================
  // 5. OPERADOR INTENTA EDITAR COMPLETA (DEBE FALLAR)
  // =====================================================
  logTest('5. OPERADOR INTENTA EDITAR COMPLETA (DEBE FALLAR)');

  const editOpCompleta = await apiCall('PUT', `/situaciones-persistentes/${sit.id}/completa`, tokenOp, {
    titulo: 'Otro intento de hackeo'
  });
  logResult(
    editOpCompleta.status === 403,
    `Operador bloqueado en /completa: ${editOpCompleta.error || 'PERMITIDO - ERROR!'}`
  );

  // =====================================================
  // 6. AGREGAR ACTUALIZACION (ADMIN_COP)
  // =====================================================
  logTest('6. AGREGAR ACTUALIZACION (ADMIN_COP)');

  // Obtener una unidad asignada
  const asignaciones = await apiCall('GET', `/situaciones-persistentes/${sit.id}/asignaciones`, tokenAdmin);
  const unidadAsignada = asignaciones.data?.[0]?.unidad_id;

  if (unidadAsignada) {
    const addUpdate = await apiCall('POST', `/situaciones-persistentes/${sit.id}/actualizaciones`, tokenAdmin, {
      unidad_id: unidadAsignada,
      tipo_actualizacion: 'NOVEDAD',
      contenido: 'Cambio de tripulacion: Piloto 1 -> Piloto 2 por fatiga'
    });
    logResult(addUpdate.success, `Agregar actualizacion de cambio de tripulacion: ${addUpdate.error || 'OK'}`);
  } else {
    log('  Sin unidades asignadas para agregar actualizacion', 'yellow');
  }

  // =====================================================
  // 7. VER ACTUALIZACIONES
  // =====================================================
  logTest('7. VER HISTORIAL DE ACTUALIZACIONES');

  const updates = await apiCall('GET', `/situaciones-persistentes/${sit.id}/actualizaciones`, tokenAdmin);
  logResult(updates.success, `Total actualizaciones: ${updates.data?.length || 0}`);
  updates.data?.slice(0, 5).forEach(u => {
    console.log(`    - [${u.tipo_actualizacion}] ${u.contenido?.substring(0, 50)}...`);
  });

  // =====================================================
  // 8. EDITAR ACTUALIZACION EXISTENTE
  // =====================================================
  logTest('8. EDITAR ACTUALIZACION EXISTENTE');

  if (updates.data?.length > 0) {
    const lastUpdate = updates.data[0];
    const editUpdate = await apiCall('PUT', `/situaciones-persistentes/${sit.id}/actualizaciones/${lastUpdate.id}`, tokenAdmin, {
      contenido: lastUpdate.contenido + ' (EDITADO)'
    });
    logResult(editUpdate.success, `Editar actualizacion ${lastUpdate.id}: ${editUpdate.error || 'OK'}`);
  }

  // =====================================================
  // 9. PAUSAR Y REACTIVAR SITUACION
  // =====================================================
  logTest('9. PAUSAR Y REACTIVAR SITUACION');

  const pausar = await apiCall('POST', `/situaciones-persistentes/${sit.id}/pausar`, tokenAdmin, {
    motivo: 'Pausa temporal para pruebas de edicion'
  });
  logResult(pausar.success, `Pausar situacion: ${pausar.error || 'OK'}`);

  // Verificar estado
  const sitPausada = await apiCall('GET', `/situaciones-persistentes/${sit.id}`, tokenAdmin);
  console.log(`  Estado despues de pausar: ${sitPausada.data?.estado}`);

  // Reactivar
  const reactivar = await apiCall('POST', `/situaciones-persistentes/${sit.id}/reactivar`, tokenAdmin, {
    motivo: 'Retomando despues de pruebas'
  });
  logResult(reactivar.success, `Reactivar situacion: ${reactivar.error || 'OK'}`);

  // =====================================================
  // 10. OPERADOR INTENTA PAUSAR (DEBE FALLAR)
  // =====================================================
  logTest('10. OPERADOR INTENTA PAUSAR (DEBE FALLAR)');

  const pausarOp = await apiCall('POST', `/situaciones-persistentes/${sit.id}/pausar`, tokenOp, {
    motivo: 'Intento no autorizado'
  });
  logResult(
    pausarOp.status === 403,
    `Operador bloqueado de pausar: ${pausarOp.error || 'PERMITIDO - ERROR!'}`
  );

  // =====================================================
  // RESUMEN FINAL
  // =====================================================
  console.log('\n' + '='.repeat(60));
  log('ESTADO FINAL DE LA SITUACION', 'yellow');
  console.log('='.repeat(60));

  const sitFinal = await apiCall('GET', `/situaciones-persistentes/${sit.id}`, tokenAdmin);
  if (sitFinal.data) {
    console.log(`  Numero: ${sitFinal.data.numero}`);
    console.log(`  Titulo: ${sitFinal.data.titulo?.substring(0, 50)}...`);
    console.log(`  Estado: ${sitFinal.data.estado}`);
    console.log(`  Importancia: ${sitFinal.data.importancia}`);
    console.log(`  Unidades asignadas: ${sitFinal.data.unidades_asignadas_count || 0}`);
  }

  console.log('\n' + '='.repeat(60));
  log('PRUEBAS DE EDICIONES COMPLETADAS', 'yellow');
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Error:', err.message);
});
