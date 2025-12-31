const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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
  try {
    const res = await axios.post(`${API_URL}/auth/login`, { username, password });
    return res.data;
  } catch (err) {
    return { error: err.response?.data?.error || err.message };
  }
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
  log('\n🚀 PRUEBAS DE SITUACIONES PERSISTENTES\n', 'yellow');

  // =====================================================
  // 1. LOGIN CON DIFERENTES ROLES
  // =====================================================
  logTest('1. LOGIN CON DIFERENTES ROLES COP');

  const loginAdmin = await login('19109', 'test123');
  logResult(!loginAdmin.error, `ADMIN_COP (19109): ${loginAdmin.error || 'OK - ' + loginAdmin.user?.subRolCop?.codigo}`);
  const tokenAdmin = loginAdmin.accessToken;

  const loginEncargado = await login('16100', 'test123');
  logResult(!loginEncargado.error, `ENCARGADO_ISLA (16100): ${loginEncargado.error || 'OK - ' + loginEncargado.user?.subRolCop?.codigo}`);
  const tokenEncargado = loginEncargado.accessToken;

  const loginOperador = await login('15041', 'test123');
  logResult(!loginOperador.error, `OPERADOR (15041): ${loginOperador.error || 'OK - ' + loginOperador.user?.subRolCop?.codigo}`);
  const tokenOperador = loginOperador.accessToken;

  if (!tokenAdmin || !tokenEncargado || !tokenOperador) {
    log('\n❌ No se pudieron obtener todos los tokens. Abortando.', 'red');
    return;
  }

  // =====================================================
  // 2. PRUEBA PERMISOS - OPERADOR NO PUEDE CREAR
  // =====================================================
  logTest('2. OPERADOR INTENTA CREAR (DEBE FALLAR)');

  const crearComoOperador = await apiCall('POST', '/situaciones-persistentes/completa', tokenOperador, {
    titulo: 'Prueba Operador',
    tipo_emergencia_id: 1,
    ruta_id: 70,
    km_inicio: 50,
    sentido: 'Norte'
  });
  logResult(crearComoOperador.status === 403, `Status 403: ${crearComoOperador.error || 'Inesperadamente exitoso'}`);

  // =====================================================
  // 3. ADMIN_COP CREA SITUACION CON OBSTRUCCION SIMPLE
  // =====================================================
  logTest('3. ADMIN_COP CREA SITUACION - OBSTRUCCION PARCIAL SIMPLE');

  const crear1 = await apiCall('POST', '/situaciones-persistentes/completa', tokenAdmin, {
    titulo: 'Derrumbe km 45 CA-9 Norte',
    tipo_emergencia_id: 1, // DERRUMBE
    importancia: 'ALTA',
    ruta_id: 70,
    km_inicio: 45,
    km_fin: 46,
    sentido: 'Norte',
    descripcion: 'Derrumbe por lluvias, material en via',
    obstruccion: {
      hay_vehiculo_fuera_via: false,
      tipo_obstruccion: 'parcial',
      sentido_principal: {
        cantidad_carriles: 2,
        carriles: [
          { nombre: 'Carril izquierdo', porcentaje: 80 },
          { nombre: 'Carril derecho', porcentaje: 30 }
        ]
      },
      sentido_contrario: null,
      descripcion_manual: ''
    }
  });
  logResult(crear1.success, `Creada: ${crear1.data?.situacion?.numero || crear1.error}`);
  const sitId1 = crear1.data?.situacion?.id;
  console.log('  Obstruccion guardada:', JSON.stringify(crear1.data?.situacion?.obstruccion, null, 2));

  // =====================================================
  // 4. CREAR SITUACION - VEHICULO FUERA DE VIA + PARCIAL
  // =====================================================
  logTest('4. ENCARGADO_ISLA CREA - VEHICULO FUERA + OBSTRUCCION PARCIAL');

  const crear2 = await apiCall('POST', '/situaciones-persistentes/completa', tokenEncargado, {
    titulo: 'Accidente multiple km 120',
    tipo_emergencia_id: 3, // ACCIDENTE_VEHICULAR
    importancia: 'CRITICA',
    ruta_id: 70,
    km_inicio: 120,
    sentido: 'Sur',
    obstruccion: {
      hay_vehiculo_fuera_via: true,
      tipo_obstruccion: 'parcial',
      sentido_principal: {
        cantidad_carriles: 3,
        carriles: [
          { nombre: 'Carril izquierdo', porcentaje: 100 },
          { nombre: 'Carril central', porcentaje: 50 },
          { nombre: 'Carril derecho', porcentaje: 0 }
        ]
      },
      sentido_contrario: {
        cantidad_carriles: 3,
        carriles: [
          { nombre: 'Carril izquierdo', porcentaje: 0 },
          { nombre: 'Carril central', porcentaje: 25 },
          { nombre: 'Carril derecho', porcentaje: 0 }
        ]
      }
    },
    autoridades: [
      { tipo_autoridad: 'PNC', hora_llegada: '14:30', cantidad_elementos: 4 },
      { tipo_autoridad: 'PMT', hora_llegada: '14:45', cantidad_unidades: 2 }
    ],
    socorro: [
      { tipo_socorro: 'BOMBEROS', hora_llegada: '14:35', cantidad_unidades: 2 }
    ]
  });
  logResult(crear2.success, `Creada: ${crear2.data?.situacion?.numero || crear2.error}`);
  const sitId2 = crear2.data?.situacion?.id;
  console.log('  Obstruccion guardada:', JSON.stringify(crear2.data?.situacion?.obstruccion, null, 2));

  // =====================================================
  // 5. CREAR SITUACION - OBSTRUCCION TOTAL AMBOS SENTIDOS
  // =====================================================
  logTest('5. CREAR SITUACION - OBSTRUCCION TOTAL AMBOS SENTIDOS');

  const crear3 = await apiCall('POST', '/situaciones-persistentes/completa', tokenAdmin, {
    titulo: 'Puente colapsado km 200',
    tipo_emergencia_id: 8, // COLAPSO_ESTRUCTURA
    importancia: 'CRITICA',
    ruta_id: 70,
    km_inicio: 200,
    km_fin: 201,
    sentido: 'Ambos',
    obstruccion: {
      hay_vehiculo_fuera_via: false,
      tipo_obstruccion: 'total_ambos',
      sentido_principal: null,
      sentido_contrario: null,
      descripcion_manual: 'Via completamente cerrada por colapso de puente'
    }
  });
  logResult(crear3.success, `Creada: ${crear3.data?.situacion?.numero || crear3.error}`);
  const sitId3 = crear3.data?.situacion?.id;
  console.log('  Descripcion generada:', crear3.data?.situacion?.obstruccion?.descripcion);

  // =====================================================
  // 6. CREAR SITUACION - OBSTRUCCION TOTAL UN SENTIDO
  // =====================================================
  logTest('6. CREAR SITUACION - OBSTRUCCION TOTAL UN SENTIDO');

  const crear4 = await apiCall('POST', '/situaciones-persistentes/completa', tokenAdmin, {
    titulo: 'Deslizamiento km 85',
    tipo_emergencia_id: 5, // DESLIZAMIENTO
    importancia: 'ALTA',
    ruta_id: 70,
    km_inicio: 85,
    sentido: 'Norte',
    obstruccion: {
      hay_vehiculo_fuera_via: false,
      tipo_obstruccion: 'total_sentido',
      sentido_principal: null,
      sentido_contrario: null
    }
  });
  logResult(crear4.success, `Creada: ${crear4.data?.situacion?.numero || crear4.error}`);
  console.log('  Descripcion generada:', crear4.data?.situacion?.obstruccion?.descripcion);

  // =====================================================
  // 7. CREAR SITUACION - SOLO VEHICULO FUERA DE VIA
  // =====================================================
  logTest('7. CREAR SITUACION - SOLO VEHICULO FUERA DE VIA (SIN OBSTRUCCION)');

  const crear5 = await apiCall('POST', '/situaciones-persistentes/completa', tokenEncargado, {
    titulo: 'Vehiculo volcado km 55',
    tipo_emergencia_id: 3,
    ruta_id: 70,
    km_inicio: 55,
    sentido: 'Sur',
    obstruccion: {
      hay_vehiculo_fuera_via: true,
      tipo_obstruccion: 'ninguna',
      sentido_principal: null,
      sentido_contrario: null
    }
  });
  logResult(crear5.success, `Creada: ${crear5.data?.situacion?.numero || crear5.error}`);
  console.log('  Descripcion generada:', crear5.data?.situacion?.obstruccion?.descripcion);

  // =====================================================
  // 8. OBTENER LISTA DE SITUACIONES ACTIVAS
  // =====================================================
  logTest('8. LISTAR SITUACIONES ACTIVAS');

  const listar = await apiCall('GET', '/situaciones-persistentes/activas', tokenAdmin);
  logResult(listar.success, `Total situaciones activas: ${listar.data?.length || 0}`);
  if (listar.data) {
    listar.data.forEach(s => {
      console.log(`  - ${s.numero}: ${s.titulo} [${s.importancia}]`);
    });
  }

  // =====================================================
  // 9. ASIGNAR UNIDADES A SITUACION
  // =====================================================
  logTest('9. ASIGNAR UNIDADES A SITUACION');

  if (sitId1) {
    // Obtener unidades disponibles
    const unidades = await apiCall('GET', '/unidades', tokenAdmin);
    const unidadesDisponibles = unidades.data?.slice(0, 3) || [];
    console.log(`  Unidades disponibles para asignar: ${unidadesDisponibles.length}`);

    for (const unidad of unidadesDisponibles) {
      const asignar = await apiCall('POST', `/situaciones-persistentes/${sitId1}/asignar-unidad`, tokenAdmin, {
        unidad_id: unidad.id,
        observaciones_asignacion: `Asignacion de prueba unidad ${unidad.codigo}`
      });
      logResult(asignar.success, `Asignar ${unidad.codigo}: ${asignar.error || 'OK'}`);
    }

    // Verificar asignaciones
    const asignaciones = await apiCall('GET', `/situaciones-persistentes/${sitId1}/asignaciones`, tokenAdmin);
    logResult(asignaciones.success, `Asignaciones activas: ${asignaciones.data?.length || 0}`);
  }

  // =====================================================
  // 10. INTENTAR ASIGNAR MISMA UNIDAD DOS VECES (ERROR)
  // =====================================================
  logTest('10. ERROR: ASIGNAR MISMA UNIDAD DOS VECES');

  if (sitId1) {
    const unidades = await apiCall('GET', '/unidades', tokenAdmin);
    const primeraUnidad = unidades.data?.[0];
    if (primeraUnidad) {
      const duplicar = await apiCall('POST', `/situaciones-persistentes/${sitId1}/asignar-unidad`, tokenAdmin, {
        unidad_id: primeraUnidad.id
      });
      logResult(!duplicar.success && duplicar.status === 500, `Error esperado: ${duplicar.error}`);
    }
  }

  // =====================================================
  // 11. DESASIGNAR UNIDAD
  // =====================================================
  logTest('11. DESASIGNAR UNIDAD');

  if (sitId1) {
    const asignaciones = await apiCall('GET', `/situaciones-persistentes/${sitId1}/asignaciones`, tokenAdmin);
    const primeraAsignacion = asignaciones.data?.[0];
    if (primeraAsignacion) {
      const desasignar = await apiCall('DELETE', `/situaciones-persistentes/${sitId1}/desasignar-unidad/${primeraAsignacion.unidad_id}`, tokenAdmin, {
        observaciones_desasignacion: 'Fin de turno de prueba'
      });
      logResult(desasignar.success, `Desasignar unidad ${primeraAsignacion.unidad_codigo}: ${desasignar.error || 'OK'}`);
    }
  }

  // =====================================================
  // 12. OPERADOR INTENTA ASIGNAR UNIDAD (DEBE FALLAR)
  // =====================================================
  logTest('12. OPERADOR INTENTA ASIGNAR UNIDAD (DEBE FALLAR)');

  if (sitId2) {
    const unidades = await apiCall('GET', '/unidades', tokenOperador);
    const unidad = unidades.data?.[0];
    if (unidad) {
      const asignarComoOperador = await apiCall('POST', `/situaciones-persistentes/${sitId2}/asignar-unidad`, tokenOperador, {
        unidad_id: unidad.id
      });
      logResult(asignarComoOperador.status === 403, `Status 403: ${asignarComoOperador.error || 'Inesperadamente exitoso'}`);
    }
  }

  // =====================================================
  // 13. ACTUALIZAR OBSTRUCCION
  // =====================================================
  logTest('13. ACTUALIZAR OBSTRUCCION DE SITUACION EXISTENTE');

  if (sitId1) {
    const actualizar = await apiCall('PUT', `/situaciones-persistentes/${sitId1}/completa`, tokenAdmin, {
      obstruccion: {
        hay_vehiculo_fuera_via: true, // Ahora tambien hay vehiculo fuera
        tipo_obstruccion: 'parcial',
        sentido_principal: {
          cantidad_carriles: 2,
          carriles: [
            { nombre: 'Carril izquierdo', porcentaje: 100 }, // Aumento a 100%
            { nombre: 'Carril derecho', porcentaje: 50 }     // Aumento a 50%
          ]
        }
      }
    });
    logResult(actualizar.success, `Actualizacion: ${actualizar.error || 'OK'}`);

    // Verificar cambios
    const verificar = await apiCall('GET', `/situaciones-persistentes/${sitId1}`, tokenAdmin);
    console.log('  Nueva obstruccion:', JSON.stringify(verificar.data?.obstruccion, null, 2));
  }

  // =====================================================
  // 14. CREAR CON DATOS INVALIDOS (FORZAR ERRORES)
  // =====================================================
  logTest('14. FORZAR ERRORES - DATOS INVALIDOS');

  // Sin titulo
  const sinTitulo = await apiCall('POST', '/situaciones-persistentes/completa', tokenAdmin, {
    tipo_emergencia_id: 1
  });
  logResult(sinTitulo.status === 400, `Sin titulo: ${sinTitulo.error}`);

  // Sin tipo_emergencia_id
  const sinTipo = await apiCall('POST', '/situaciones-persistentes/completa', tokenAdmin, {
    titulo: 'Prueba sin tipo'
  });
  logResult(sinTipo.status === 400, `Sin tipo_emergencia_id: ${sinTipo.error}`);

  // tipo_emergencia_id invalido
  const tipoInvalido = await apiCall('POST', '/situaciones-persistentes/completa', tokenAdmin, {
    titulo: 'Prueba tipo invalido',
    tipo_emergencia_id: 99999
  });
  logResult(!tipoInvalido.success, `Tipo invalido (99999): ${tipoInvalido.error || 'Error en BD'}`);

  // =====================================================
  // 15. OBSTRUCCION CON PORCENTAJES EXTREMOS
  // =====================================================
  logTest('15. OBSTRUCCION CON 5 CARRILES Y PORCENTAJES VARIADOS');

  const crear6 = await apiCall('POST', '/situaciones-persistentes/completa', tokenAdmin, {
    titulo: 'Autopista km 300 - 5 carriles',
    tipo_emergencia_id: 3,
    ruta_id: 70,
    km_inicio: 300,
    sentido: 'Este',
    obstruccion: {
      hay_vehiculo_fuera_via: false,
      tipo_obstruccion: 'parcial',
      sentido_principal: {
        cantidad_carriles: 5,
        carriles: [
          { nombre: 'Carril izquierdo', porcentaje: 100 },
          { nombre: 'Carril central izquierdo', porcentaje: 75 },
          { nombre: 'Carril central', porcentaje: 50 },
          { nombre: 'Carril central derecho', porcentaje: 25 },
          { nombre: 'Carril derecho', porcentaje: 0 }
        ]
      }
    }
  });
  logResult(crear6.success, `Creada: ${crear6.data?.situacion?.numero || crear6.error}`);
  console.log('  Descripcion generada:', crear6.data?.situacion?.obstruccion?.descripcion);

  // =====================================================
  // 16. VERIFICAR DESCRIPCION GENERADA AUTOMATICAMENTE
  // =====================================================
  logTest('16. VERIFICAR DESCRIPCIONES GENERADAS');

  const todas = await apiCall('GET', '/situaciones-persistentes?limit=10', tokenAdmin);
  if (todas.data) {
    console.log('\nDescripciones de obstruccion generadas:');
    for (const s of todas.data) {
      if (s.obstruccion) {
        console.log(`\n  ${s.numero} - ${s.titulo}:`);
        console.log(`    Tipo: ${s.obstruccion.tipo_obstruccion}`);
        console.log(`    Fuera de via: ${s.obstruccion.hay_vehiculo_fuera_via ? 'SI' : 'NO'}`);
        console.log(`    Descripcion: ${s.obstruccion.descripcion || '(sin descripcion)'}`);
      }
    }
  }

  // =====================================================
  // 17. FINALIZAR SITUACION
  // =====================================================
  logTest('17. FINALIZAR SITUACION');

  if (sitId3) {
    const finalizar = await apiCall('POST', `/situaciones-persistentes/${sitId3}/finalizar`, tokenAdmin, {});
    logResult(finalizar.success, `Finalizar situacion ${sitId3}: ${finalizar.error || 'OK'}`);

    // Verificar que ya no esta activa
    const verificar = await apiCall('GET', `/situaciones-persistentes/${sitId3}`, tokenAdmin);
    logResult(verificar.data?.estado === 'FINALIZADA', `Estado: ${verificar.data?.estado}`);
  }

  // =====================================================
  // 18. OPERADOR INTENTA FINALIZAR (DEBE FALLAR)
  // =====================================================
  logTest('18. OPERADOR INTENTA FINALIZAR (DEBE FALLAR)');

  if (sitId2) {
    const finalizarComoOperador = await apiCall('POST', `/situaciones-persistentes/${sitId2}/finalizar`, tokenOperador, {});
    logResult(finalizarComoOperador.status === 403, `Status 403: ${finalizarComoOperador.error || 'Inesperadamente exitoso'}`);
  }

  // =====================================================
  // 19. PAUSAR Y REACTIVAR SITUACION
  // =====================================================
  logTest('19. PAUSAR Y REACTIVAR SITUACION');

  if (sitId1) {
    const pausar = await apiCall('POST', `/situaciones-persistentes/${sitId1}/pausar`, tokenAdmin, {});
    logResult(pausar.success, `Pausar: ${pausar.error || 'OK'}`);

    let verificar = await apiCall('GET', `/situaciones-persistentes/${sitId1}`, tokenAdmin);
    console.log(`  Estado despues de pausar: ${verificar.data?.estado}`);

    const reactivar = await apiCall('POST', `/situaciones-persistentes/${sitId1}/reactivar`, tokenAdmin, {});
    logResult(reactivar.success, `Reactivar: ${reactivar.error || 'OK'}`);

    verificar = await apiCall('GET', `/situaciones-persistentes/${sitId1}`, tokenAdmin);
    console.log(`  Estado despues de reactivar: ${verificar.data?.estado}`);
  }

  // =====================================================
  // RESUMEN FINAL
  // =====================================================
  console.log('\n' + '='.repeat(60));
  log('PRUEBAS COMPLETADAS', 'yellow');
  console.log('='.repeat(60));

  const resumenActivas = await apiCall('GET', '/situaciones-persistentes/activas', tokenAdmin);
  console.log(`\nSituaciones ACTIVAS: ${resumenActivas.data?.length || 0}`);

  const resumenTodas = await apiCall('GET', '/situaciones-persistentes', tokenAdmin);
  console.log(`Situaciones TOTALES: ${resumenTodas.data?.length || 0}`);
}

main().catch(err => {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
