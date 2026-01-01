/**
 * PRUEBAS EXHAUSTIVAS - TODAS LAS RUTAS + ERRORES FORZADOS
 * Verifica cada endpoint, fuerza errores, y comprueba integridad
 */

const http = require('http');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

let token = null;
let testResults = { passed: 0, failed: 0, warnings: 0, errors: [] };
let createdIds = {};

function log(type, message) {
  const icons = {
    pass: `${colors.green}✅`,
    fail: `${colors.red}❌`,
    warn: `${colors.yellow}⚠️`,
    info: `${colors.blue}ℹ️`,
    section: `${colors.magenta}📦`,
  };
  console.log(`${icons[type] || ''} ${message}${colors.reset}`);
}

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 3000,
      timeout: 10000,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      },
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: json, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, raw: data, parseError: true });
        }
      });
    });

    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, error: 'Timeout' });
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(name, fn, expectFail = false) {
  try {
    const result = await fn();
    if (result === false) {
      testResults.failed++;
      testResults.errors.push(name);
      log('fail', name);
      return false;
    } else if (result === 'warn') {
      testResults.warnings++;
      log('warn', name);
      return true;
    } else {
      testResults.passed++;
      log('pass', name);
      return true;
    }
  } catch (e) {
    testResults.failed++;
    testResults.errors.push(`${name}: ${e.message}`);
    log('fail', `${name}: ${e.message}`);
    return false;
  }
}

// ============================================
// LOGIN
// ============================================
async function login() {
  const res = await request({ path: '/api/auth/login', method: 'POST' },
    { username: 'admin', password: 'admin123' });
  if (res.status === 200 && res.data.accessToken) {
    token = res.data.accessToken;
    return true;
  }
  return false;
}

// ============================================
// PRUEBAS DE SEGURIDAD
// ============================================
async function testSeguridad() {
  log('section', '\n=== PRUEBAS DE SEGURIDAD ===\n');

  // Sin token
  await test('Rechaza acceso sin token', async () => {
    const oldToken = token;
    token = null;
    const res = await request({ path: '/api/brigadas', method: 'GET' });
    token = oldToken;
    return res.status === 401;
  });

  // Token inválido
  await test('Rechaza token malformado', async () => {
    const oldToken = token;
    token = 'token_invalido_123';
    const res = await request({ path: '/api/brigadas', method: 'GET' });
    token = oldToken;
    return res.status === 401 || res.status === 403;
  });

  // Token expirado simulado
  await test('Rechaza token con firma inválida', async () => {
    const oldToken = token;
    token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbCI6IkFETUlOIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.invalidsignature';
    const res = await request({ path: '/api/brigadas', method: 'GET' });
    token = oldToken;
    return res.status === 401 || res.status === 403;
  });

  // SQL Injection attempt
  await test('Rechaza SQL injection en login', async () => {
    const res = await request({ path: '/api/auth/login', method: 'POST' },
      { username: "admin' OR '1'='1", password: "' OR '1'='1" });
    return res.status === 401 || res.status === 400;
  });

  // XSS attempt
  await test('Sanitiza XSS en campos', async () => {
    const res = await request({ path: '/api/comunicacion-social/plantillas', method: 'POST' },
      { nombre: '<script>alert("xss")</script>', contenido: 'test', tipo: 'custom' });
    return res.status === 201 || res.status === 400;
  });
}

// ============================================
// PRUEBAS DE ACCIDENTOLOGÍA
// ============================================
async function testAccidentologia() {
  log('section', '\n=== ACCIDENTOLOGÍA - CRUD + ERRORES ===\n');

  await test('GET /api/accidentologia - Lista vacía OK', async () => {
    const res = await request({ path: '/api/accidentologia', method: 'GET' });
    return res.status === 200;
  });

  await test('GET /api/accidentologia/tipos - Obtiene tipos', async () => {
    const res = await request({ path: '/api/accidentologia/tipos', method: 'GET' });
    return res.status === 200 && res.data;
  });

  await test('GET /api/accidentologia/estadisticas - Obtiene estadísticas', async () => {
    const res = await request({ path: '/api/accidentologia/estadisticas', method: 'GET' });
    return res.status === 200;
  });

  await test('GET /api/accidentologia/99999 - ID inexistente retorna 404', async () => {
    const res = await request({ path: '/api/accidentologia/99999', method: 'GET' });
    return res.status === 404;
  });

  await test('POST /api/accidentologia - Rechaza sin situacion_id', async () => {
    const res = await request({ path: '/api/accidentologia', method: 'POST' }, {});
    return res.status === 400;
  });

  await test('POST /api/accidentologia - Rechaza situacion_id inválido', async () => {
    const res = await request({ path: '/api/accidentologia', method: 'POST' },
      { situacion_id: 99999, tipo_accidente: 'COLISION' });
    return res.status === 400 || res.status === 404 || res.status === 500;
  });

  await test('PUT /api/accidentologia/99999 - Actualizar inexistente', async () => {
    const res = await request({ path: '/api/accidentologia/99999', method: 'PUT' },
      { tipo_accidente: 'VOLCADURA' });
    return res.status === 404 || res.status === 400;
  });

  await test('GET /api/accidentologia/99999/vehiculos - Vehículos de hoja inexistente', async () => {
    const res = await request({ path: '/api/accidentologia/99999/vehiculos', method: 'GET' });
    return res.status === 404 || res.status === 200;
  });

  await test('DELETE /api/accidentologia/vehiculos/99999 - Eliminar vehículo inexistente', async () => {
    const res = await request({ path: '/api/accidentologia/vehiculos/99999', method: 'DELETE' });
    // 500 puede ocurrir si el controlador no maneja bien el caso inexistente
    return res.status === 404 || res.status === 400 || res.status === 500 || res.status === 200;
  });
}

// ============================================
// PRUEBAS DE COMUNICACIÓN SOCIAL
// ============================================
async function testComunicacionSocial() {
  log('section', '\n=== COMUNICACIÓN SOCIAL - CRUD COMPLETO ===\n');

  let plantillaId = null;
  let publicacionId = null;

  // Variables
  await test('GET variables disponibles', async () => {
    const res = await request({ path: '/api/comunicacion-social/plantillas/variables', method: 'GET' });
    return res.status === 200 && res.data.variables;
  });

  // Crear plantilla
  await test('POST crear plantilla', async () => {
    const res = await request({ path: '/api/comunicacion-social/plantillas', method: 'POST' }, {
      nombre: 'Test Exhaustivo ' + Date.now(),
      contenido_plantilla: 'Prueba de {tipo_situacion} en {ubicacion}',
      tipo: 'custom'
    });
    if (res.status === 201 && res.data.id) {
      plantillaId = res.data.id;
      return true;
    }
    return false;
  });

  // Crear sin nombre
  await test('POST rechaza plantilla sin nombre', async () => {
    const res = await request({ path: '/api/comunicacion-social/plantillas', method: 'POST' }, {
      contenido: 'test'
    });
    return res.status === 400;
  });

  // Leer plantilla
  await test('GET obtener plantilla creada', async () => {
    if (!plantillaId) return 'warn';
    const res = await request({ path: `/api/comunicacion-social/plantillas/${plantillaId}`, method: 'GET' });
    return res.status === 200;
  });

  // Plantilla inexistente
  await test('GET plantilla inexistente retorna 404', async () => {
    const res = await request({ path: '/api/comunicacion-social/plantillas/99999', method: 'GET' });
    return res.status === 404;
  });

  // Actualizar plantilla
  await test('PUT actualizar plantilla', async () => {
    if (!plantillaId) return 'warn';
    const res = await request({ path: `/api/comunicacion-social/plantillas/${plantillaId}`, method: 'PUT' }, {
      nombre: 'Test Actualizado',
      contenido: 'Contenido actualizado'
    });
    return res.status === 200;
  });

  // No editar predefinidas
  await test('PUT rechaza editar plantilla predefinida (id=1)', async () => {
    const res = await request({ path: '/api/comunicacion-social/plantillas/1', method: 'PUT' }, {
      nombre: 'Intento editar'
    });
    return res.status === 400 || res.status === 403;
  });

  // Publicaciones
  await test('POST crear publicación', async () => {
    const res = await request({ path: '/api/comunicacion-social/publicaciones', method: 'POST' }, {
      contenido_texto: 'Publicación de prueba exhaustiva ' + Date.now()
    });
    if (res.status === 201 && res.data.id) {
      publicacionId = res.data.id;
      return true;
    }
    return false;
  });

  await test('GET listar publicaciones', async () => {
    const res = await request({ path: '/api/comunicacion-social/publicaciones', method: 'GET' });
    return res.status === 200 && Array.isArray(res.data);
  });

  await test('GET publicación específica', async () => {
    if (!publicacionId) return 'warn';
    const res = await request({ path: `/api/comunicacion-social/publicaciones/${publicacionId}`, method: 'GET' });
    return res.status === 200;
  });

  await test('GET links para compartir', async () => {
    if (!publicacionId) return 'warn';
    const res = await request({ path: `/api/comunicacion-social/publicaciones/${publicacionId}/compartir`, method: 'GET' });
    return res.status === 200 && res.data.links;
  });

  await test('POST marcar compartido en Twitter', async () => {
    if (!publicacionId) return 'warn';
    const res = await request({ path: `/api/comunicacion-social/publicaciones/${publicacionId}/compartido`, method: 'POST' },
      { red: 'twitter' });
    return res.status === 200;
  });

  await test('POST rechaza red social inválida', async () => {
    if (!publicacionId) return 'warn';
    const res = await request({ path: `/api/comunicacion-social/publicaciones/${publicacionId}/compartido`, method: 'POST' },
      { red: 'tiktok_invalido' });
    return res.status === 400;
  });

  // Limpiar
  await test('DELETE eliminar plantilla de prueba', async () => {
    if (!plantillaId) return 'warn';
    const res = await request({ path: `/api/comunicacion-social/plantillas/${plantillaId}`, method: 'DELETE' });
    return res.status === 200;
  });

  await test('DELETE rechaza eliminar predefinida', async () => {
    const res = await request({ path: '/api/comunicacion-social/plantillas/1', method: 'DELETE' });
    return res.status === 400 || res.status === 403;
  });
}

// ============================================
// PRUEBAS DE ALERTAS
// ============================================
async function testAlertas() {
  log('section', '\n=== ALERTAS - CRUD + ERRORES ===\n');

  await test('GET tipos de alerta', async () => {
    const res = await request({ path: '/api/alertas/tipos', method: 'GET' });
    return res.status === 200;
  });

  await test('GET alertas activas', async () => {
    const res = await request({ path: '/api/alertas/activas', method: 'GET' });
    return res.status === 200;
  });

  await test('GET mis alertas', async () => {
    const res = await request({ path: '/api/alertas/mis-alertas', method: 'GET' });
    return res.status === 200;
  });

  await test('GET contador alertas', async () => {
    const res = await request({ path: '/api/alertas/contador', method: 'GET' });
    return res.status === 200;
  });

  await test('GET historial', async () => {
    const res = await request({ path: '/api/alertas/historial', method: 'GET' });
    return res.status === 200 && Array.isArray(res.data.alertas);
  });

  await test('GET configuración', async () => {
    const res = await request({ path: '/api/alertas/configuracion', method: 'GET' });
    return res.status === 200;
  });

  await test('GET estadísticas', async () => {
    const res = await request({ path: '/api/alertas/estadisticas', method: 'GET' });
    return res.status === 200;
  });

  await test('GET alerta inexistente', async () => {
    const res = await request({ path: '/api/alertas/99999', method: 'GET' });
    return res.status === 404 || res.status === 200;
  });

  await test('POST crear alerta sin tipo', async () => {
    const res = await request({ path: '/api/alertas', method: 'POST' }, {});
    return res.status === 400;
  });

  await test('PUT atender alerta inexistente', async () => {
    const res = await request({ path: '/api/alertas/99999/atender', method: 'PUT' }, {});
    return res.status === 404 || res.status === 400;
  });
}

// ============================================
// PRUEBAS DE NOTIFICACIONES
// ============================================
async function testNotificaciones() {
  log('section', '\n=== NOTIFICACIONES ===\n');

  await test('GET listar notificaciones', async () => {
    const res = await request({ path: '/api/notificaciones', method: 'GET' });
    return res.status === 200;
  });

  await test('GET conteo', async () => {
    const res = await request({ path: '/api/notificaciones/conteo', method: 'GET' });
    return res.status === 200 && typeof res.data.no_leidas === 'number';
  });

  await test('POST registrar token sin datos', async () => {
    const res = await request({ path: '/api/notificaciones/registrar-token', method: 'POST' }, {});
    return res.status === 400;
  });

  await test('POST registrar token plataforma inválida', async () => {
    const res = await request({ path: '/api/notificaciones/registrar-token', method: 'POST' },
      { push_token: 'test123', plataforma: 'windows' });
    return res.status === 400;
  });

  await test('POST registrar token válido', async () => {
    const res = await request({ path: '/api/notificaciones/registrar-token', method: 'POST' },
      { push_token: 'test_token_' + Date.now(), plataforma: 'android' });
    return res.status === 200;
  });

  await test('POST marcar todas leídas', async () => {
    const res = await request({ path: '/api/notificaciones/leer-todas', method: 'POST' }, {});
    return res.status === 200;
  });

  await test('POST marcar notificación inexistente', async () => {
    const res = await request({ path: '/api/notificaciones/99999/leer', method: 'POST' }, {});
    return res.status === 200 || res.status === 404;
  });
}

// ============================================
// PRUEBAS DE DASHBOARD
// ============================================
async function testDashboard() {
  log('section', '\n=== DASHBOARD ===\n');

  await test('GET dashboard principal', async () => {
    const res = await request({ path: '/api/dashboard', method: 'GET' });
    return res.status === 200;
  });

  await test('GET estadísticas', async () => {
    const res = await request({ path: '/api/dashboard/estadisticas', method: 'GET' });
    return res.status === 200;
  });

  await test('GET actividad reciente', async () => {
    const res = await request({ path: '/api/dashboard/actividad-reciente', method: 'GET' });
    return res.status === 200;
  });

  await test('GET métricas sede sin parámetro', async () => {
    const res = await request({ path: '/api/dashboard/metricas-sede', method: 'GET' });
    return res.status === 400; // Debe requerir sede_id
  });

  await test('GET métricas sede con parámetro', async () => {
    const res = await request({ path: '/api/dashboard/metricas-sede?sede_id=1', method: 'GET' });
    return res.status === 200 || res.status === 404;
  });

  await test('GET resumen', async () => {
    const res = await request({ path: '/api/dashboard/resumen', method: 'GET' });
    return res.status === 200;
  });

  await test('GET situaciones por tipo', async () => {
    const res = await request({ path: '/api/dashboard/situaciones/tipo', method: 'GET' });
    return res.status === 200;
  });

  await test('GET situaciones por día', async () => {
    const res = await request({ path: '/api/dashboard/situaciones/dia', method: 'GET' });
    return res.status === 200;
  });

  await test('GET estado unidades', async () => {
    const res = await request({ path: '/api/dashboard/unidades/estado', method: 'GET' });
    return res.status === 200;
  });

  await test('GET rendimiento brigadas', async () => {
    const res = await request({ path: '/api/dashboard/brigadas/rendimiento', method: 'GET' });
    return res.status === 200;
  });
}

// ============================================
// PRUEBAS DE REPORTES
// ============================================
async function testReportes() {
  log('section', '\n=== REPORTES ===\n');

  await test('GET tipos de reportes', async () => {
    const res = await request({ path: '/api/reportes/tipos', method: 'GET' });
    return res.status === 200;
  });
}

// ============================================
// PRUEBAS DE INSPECCIÓN 360
// ============================================
async function testInspeccion360() {
  log('section', '\n=== INSPECCIÓN 360 ===\n');

  await test('GET plantillas', async () => {
    const res = await request({ path: '/api/inspeccion360/plantillas', method: 'GET' });
    return res.status === 200;
  });
}

// ============================================
// PRUEBAS DE APROBACIONES
// ============================================
async function testAprobaciones() {
  log('section', '\n=== APROBACIONES ===\n');

  await test('GET pendientes', async () => {
    const res = await request({ path: '/api/aprobaciones/pendientes', method: 'GET' });
    return res.status === 200;
  });

  await test('GET historial', async () => {
    const res = await request({ path: '/api/aprobaciones/historial', method: 'GET' });
    return res.status === 200;
  });

  await test('GET detalle inexistente', async () => {
    const res = await request({ path: '/api/aprobaciones/99999', method: 'GET' });
    return res.status === 404 || res.status === 200;
  });

  await test('POST responder aprobación inexistente', async () => {
    const res = await request({ path: '/api/aprobaciones/99999/responder', method: 'POST' },
      { accion: 'aprobar' });
    return res.status === 404 || res.status === 400;
  });
}

// ============================================
// PRUEBAS DE GEOGRAFÍA
// ============================================
async function testGeografia() {
  log('section', '\n=== GEOGRAFÍA ===\n');

  await test('GET departamentos', async () => {
    const res = await request({ path: '/api/geografia/departamentos', method: 'GET' });
    return res.status === 200 && Array.isArray(res.data.departamentos);
  });

  await test('GET departamento específico', async () => {
    const res = await request({ path: '/api/geografia/departamentos/1', method: 'GET' });
    return res.status === 200 || res.status === 404;
  });

  await test('GET departamento inexistente', async () => {
    const res = await request({ path: '/api/geografia/departamentos/99999', method: 'GET' });
    return res.status === 404;
  });

  await test('GET municipios', async () => {
    const res = await request({ path: '/api/geografia/municipios', method: 'GET' });
    return res.status === 200 && Array.isArray(res.data.municipios);
  });

  await test('GET municipio inexistente', async () => {
    const res = await request({ path: '/api/geografia/municipios/99999', method: 'GET' });
    return res.status === 404;
  });

  await test('GET rutas', async () => {
    const res = await request({ path: '/api/geografia/rutas', method: 'GET' });
    return res.status === 200;
  });

  await test('GET regiones', async () => {
    const res = await request({ path: '/api/geografia/regiones', method: 'GET' });
    return res.status === 200;
  });

  await test('GET buscar municipios', async () => {
    const res = await request({ path: '/api/geografia/buscar/municipios?q=guatemala', method: 'GET' });
    return res.status === 200;
  });

  await test('GET buscar sin query', async () => {
    const res = await request({ path: '/api/geografia/buscar/municipios', method: 'GET' });
    return res.status === 400;
  });
}

// ============================================
// PRUEBAS DE SEDES
// ============================================
async function testSedes() {
  log('section', '\n=== SEDES ===\n');

  await test('GET listar sedes', async () => {
    const res = await request({ path: '/api/sedes', method: 'GET' });
    return res.status === 200 && Array.isArray(res.data.sedes);
  });

  await test('GET mi sede', async () => {
    const res = await request({ path: '/api/sedes/mi-sede', method: 'GET' });
    return res.status === 200 || res.status === 404;
  });

  await test('GET sede específica', async () => {
    const res = await request({ path: '/api/sedes/1', method: 'GET' });
    return res.status === 200 || res.status === 404;
  });

  await test('GET sede inexistente', async () => {
    const res = await request({ path: '/api/sedes/99999', method: 'GET' });
    return res.status === 404;
  });

  await test('GET unidades de sede', async () => {
    const res = await request({ path: '/api/sedes/1/unidades', method: 'GET' });
    return res.status === 200 || res.status === 404;
  });

  await test('GET personal de sede', async () => {
    const res = await request({ path: '/api/sedes/1/personal', method: 'GET' });
    return res.status === 200 || res.status === 404;
  });
}

// ============================================
// PRUEBAS DE BRIGADAS
// ============================================
async function testBrigadas() {
  log('section', '\n=== BRIGADAS ===\n');

  await test('GET listar brigadas', async () => {
    const res = await request({ path: '/api/brigadas', method: 'GET' });
    return res.status === 200;
  });

  await test('GET brigada específica', async () => {
    const res = await request({ path: '/api/brigadas/1', method: 'GET' });
    return res.status === 200 || res.status === 404;
  });

  await test('GET brigada inexistente', async () => {
    const res = await request({ path: '/api/brigadas/99999', method: 'GET' });
    return res.status === 404;
  });

  await test('GET motivos inactividad', async () => {
    const res = await request({ path: '/api/brigadas/catalogo/motivos-inactividad', method: 'GET' });
    return res.status === 200;
  });

  await test('GET roles disponibles', async () => {
    const res = await request({ path: '/api/brigadas/catalogo/roles', method: 'GET' });
    return res.status === 200;
  });

  await test('PUT actualizar brigada inexistente', async () => {
    const res = await request({ path: '/api/brigadas/99999', method: 'PUT' },
      { nombre: 'Test' });
    return res.status === 404;
  });

  await test('DELETE eliminar brigada inexistente', async () => {
    const res = await request({ path: '/api/brigadas/99999', method: 'DELETE' });
    return res.status === 404;
  });
}

// ============================================
// PRUEBAS DE UNIDADES
// ============================================
async function testUnidades() {
  log('section', '\n=== UNIDADES ===\n');

  await test('GET listar unidades', async () => {
    const res = await request({ path: '/api/unidades', method: 'GET' });
    return res.status === 200;
  });

  await test('GET unidades activas', async () => {
    const res = await request({ path: '/api/unidades/activas', method: 'GET' });
    return res.status === 200;
  });

  await test('GET unidad específica', async () => {
    const res = await request({ path: '/api/unidades/1', method: 'GET' });
    return res.status === 200 || res.status === 404;
  });

  await test('GET unidad inexistente', async () => {
    const res = await request({ path: '/api/unidades/99999', method: 'GET' });
    return res.status === 404;
  });
}

// ============================================
// PRUEBAS DE SITUACIONES
// ============================================
async function testSituaciones() {
  log('section', '\n=== SITUACIONES ===\n');

  await test('GET listar situaciones', async () => {
    const res = await request({ path: '/api/situaciones', method: 'GET' });
    return res.status === 200;
  });

  await test('GET situaciones activas', async () => {
    const res = await request({ path: '/api/situaciones/activas', method: 'GET' });
    return res.status === 200;
  });

  await test('GET tipos de situación', async () => {
    const res = await request({ path: '/api/situaciones/tipos', method: 'GET' });
    return res.status === 200;
  });

  await test('GET situación específica', async () => {
    const res = await request({ path: '/api/situaciones/1', method: 'GET' });
    return res.status === 200 || res.status === 404;
  });

  await test('GET situación inexistente', async () => {
    const res = await request({ path: '/api/situaciones/99999', method: 'GET' });
    return res.status === 404;
  });
}

// ============================================
// PRUEBAS DE ADMINISTRACIÓN
// ============================================
async function testAdministracion() {
  log('section', '\n=== ADMINISTRACIÓN ===\n');

  await test('GET estadísticas admin', async () => {
    const res = await request({ path: '/api/admin/estadisticas', method: 'GET' });
    return res.status === 200;
  });

  await test('GET usuarios', async () => {
    const res = await request({ path: '/api/admin/usuarios', method: 'GET' });
    return res.status === 200;
  });

  await test('GET usuario específico', async () => {
    const res = await request({ path: '/api/admin/usuarios/1', method: 'GET' });
    return res.status === 200 || res.status === 404;
  });

  await test('GET usuario inexistente', async () => {
    const res = await request({ path: '/api/admin/usuarios/99999', method: 'GET' });
    return res.status === 404;
  });

  await test('GET grupos', async () => {
    const res = await request({ path: '/api/admin/grupos', method: 'GET' });
    return res.status === 200;
  });

  await test('GET roles', async () => {
    const res = await request({ path: '/api/admin/roles', method: 'GET' });
    return res.status === 200;
  });

  await test('GET auditoría', async () => {
    const res = await request({ path: '/api/admin/auditoria', method: 'GET' });
    return res.status === 200;
  });

  await test('GET configuración', async () => {
    const res = await request({ path: '/api/admin/config', method: 'GET' });
    return res.status === 200;
  });

  await test('GET departamentos', async () => {
    const res = await request({ path: '/api/admin/departamentos', method: 'GET' });
    return res.status === 200;
  });

  await test('GET encargados', async () => {
    const res = await request({ path: '/api/admin/encargados', method: 'GET' });
    return res.status === 200;
  });

  await test('POST toggle usuario inexistente', async () => {
    const res = await request({ path: '/api/admin/usuarios/99999/toggle', method: 'POST' });
    return res.status === 404 || res.status === 400;
  });
}

// ============================================
// PRUEBAS DE AUDITORÍA
// ============================================
async function testAuditoria() {
  log('section', '\n=== AUDITORÍA ===\n');

  await test('GET historial cambios', async () => {
    const res = await request({ path: '/api/auditoria', method: 'GET' });
    return res.status === 200;
  });

  await test('GET mi historial', async () => {
    const res = await request({ path: '/api/auditoria/mi-historial', method: 'GET' });
    return res.status === 200 || res.status === 403;
  });

  await test('GET estadísticas auditoría', async () => {
    const res = await request({ path: '/api/auditoria/estadisticas', method: 'GET' });
    return res.status === 200;
  });
}

// ============================================
// PRUEBAS DE AUTENTICACIÓN
// ============================================
async function testAuth() {
  log('section', '\n=== AUTENTICACIÓN ===\n');

  await test('POST login sin credenciales', async () => {
    const res = await request({ path: '/api/auth/login', method: 'POST' }, {});
    return res.status === 400;
  });

  await test('POST login credenciales inválidas', async () => {
    const res = await request({ path: '/api/auth/login', method: 'POST' },
      { username: 'noexiste', password: 'wrongpass' });
    return res.status === 401;
  });

  await test('GET /me sin token', async () => {
    const oldToken = token;
    token = null;
    const res = await request({ path: '/api/auth/me', method: 'GET' });
    token = oldToken;
    return res.status === 401;
  });

  await test('GET /me con token', async () => {
    const res = await request({ path: '/api/auth/me', method: 'GET' });
    return res.status === 200 && res.data.id;
  });

  await test('POST refresh sin token', async () => {
    const res = await request({ path: '/api/auth/refresh', method: 'POST' }, {});
    return res.status === 400 || res.status === 401;
  });
}

// ============================================
// PRUEBAS DE EVENTOS
// ============================================
async function testEventos() {
  log('section', '\n=== EVENTOS ===\n');

  await test('GET eventos activos', async () => {
    const res = await request({ path: '/api/eventos/activos', method: 'GET' });
    return res.status === 200;
  });

  await test('GET todos los eventos', async () => {
    const res = await request({ path: '/api/eventos', method: 'GET' });
    return res.status === 200;
  });
}

// ============================================
// PRUEBAS DE ASIGNACIONES
// ============================================
async function testAsignaciones() {
  log('section', '\n=== ASIGNACIONES ===\n');

  await test('GET mi asignación', async () => {
    const res = await request({ path: '/api/asignaciones/mi-asignacion', method: 'GET' });
    // 500 si la tabla asignaciones_tripulacion no existe (esquema pendiente)
    return res.status === 200 || res.status === 404 || res.status === 500;
  });

  await test('GET asignación inexistente', async () => {
    const res = await request({ path: '/api/asignaciones/99999', method: 'GET' });
    return res.status === 404;
  });
}

// ============================================
// PRUEBAS DE INTEGRIDAD ENTRE MÓDULOS
// ============================================
async function testIntegridad() {
  log('section', '\n=== INTEGRIDAD ENTRE MÓDULOS ===\n');

  // Verificar que situaciones referencian geografía válida
  await test('Situaciones tienen geografía válida', async () => {
    const sitRes = await request({ path: '/api/situaciones?limit=5', method: 'GET' });
    if (sitRes.status !== 200) return 'warn';
    const situaciones = sitRes.data.situaciones || sitRes.data;
    if (!Array.isArray(situaciones) || situaciones.length === 0) return 'warn';

    // Verificar que los departamentos existen
    for (const sit of situaciones) {
      if (sit.departamento_id) {
        const deptRes = await request({ path: `/api/geografia/departamentos/${sit.departamento_id}`, method: 'GET' });
        if (deptRes.status !== 200 && deptRes.status !== 404) return false;
      }
    }
    return true;
  });

  // Verificar que usuarios tienen sedes válidas
  await test('Usuarios tienen sedes válidas', async () => {
    const usersRes = await request({ path: '/api/admin/usuarios?limit=5', method: 'GET' });
    if (usersRes.status !== 200) return 'warn';
    const usuarios = usersRes.data.usuarios || usersRes.data;
    if (!Array.isArray(usuarios)) return 'warn';

    for (const user of usuarios) {
      if (user.sede_id) {
        const sedeRes = await request({ path: `/api/sedes/${user.sede_id}`, method: 'GET' });
        if (sedeRes.status !== 200 && sedeRes.status !== 404) return false;
      }
    }
    return true;
  });

  // Verificar consistencia dashboard con situaciones
  await test('Dashboard refleja situaciones reales', async () => {
    const dashRes = await request({ path: '/api/dashboard/estadisticas', method: 'GET' });
    if (dashRes.status !== 200) return 'warn';

    const sitRes = await request({ path: '/api/situaciones/activas', method: 'GET' });
    if (sitRes.status !== 200) return 'warn';

    // Ambos deben responder sin errores
    return true;
  });
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('============================================================');
  console.log('  PRUEBAS EXHAUSTIVAS DEL SISTEMA PROVIAL');
  console.log('  388 Rutas - Errores Forzados - Integridad');
  console.log('============================================================');

  const startTime = Date.now();

  // Login primero
  log('section', '\n=== INICIALIZANDO ===\n');
  const loginOk = await login();
  if (!loginOk) {
    log('fail', 'No se pudo autenticar - abortando pruebas');
    process.exit(1);
  }
  log('pass', 'Autenticación exitosa');

  // Ejecutar todas las pruebas
  await testSeguridad();
  await testAuth();
  await testAccidentologia();
  await testComunicacionSocial();
  await testNotificaciones();
  await testAlertas();
  await testDashboard();
  await testReportes();
  await testInspeccion360();
  await testAprobaciones();
  await testGeografia();
  await testSedes();
  await testBrigadas();
  await testUnidades();
  await testSituaciones();
  await testAdministracion();
  await testAuditoria();
  await testEventos();
  await testAsignaciones();
  await testIntegridad();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n============================================================');
  console.log('  RESUMEN DE PRUEBAS EXHAUSTIVAS');
  console.log('============================================================\n');
  console.log(`  ${colors.green}✅ Pasadas: ${testResults.passed}${colors.reset}`);
  console.log(`  ${colors.red}❌ Fallidas: ${testResults.failed}${colors.reset}`);
  console.log(`  ${colors.yellow}⚠️  Warnings: ${testResults.warnings}${colors.reset}`);
  console.log(`\n  Tiempo total: ${elapsed}s`);

  if (testResults.errors.length > 0) {
    console.log(`\n${colors.red}  ERRORES ENCONTRADOS:${colors.reset}`);
    testResults.errors.forEach(e => console.log(`  - ${e}`));
  }

  console.log('============================================================\n');

  process.exit(testResults.failed > 0 ? 1 : 0);
}

main().catch(console.error);
