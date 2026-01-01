/**
 * Script de Pruebas Exhaustivas del Sistema PROVIAL
 * Verifica todos los endpoints, CRUD, seguridad e integridad
 */

const http = require('http');

// Colores para consola
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
let testResults = { passed: 0, failed: 0, warnings: 0 };
let createdIds = {}; // Para guardar IDs creados y poder eliminarlos

// ============================================
// UTILIDADES
// ============================================

function log(type, message) {
  const icons = {
    pass: `${colors.green}✅`,
    fail: `${colors.red}❌`,
    warn: `${colors.yellow}⚠️`,
    info: `${colors.blue}ℹ️`,
    test: `${colors.cyan}🧪`,
    section: `${colors.magenta}📦`,
  };
  console.log(`${icons[type] || ''} ${message}${colors.reset}`);
}

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 3000,
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

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(name, fn) {
  try {
    const result = await fn();
    if (result === false) {
      testResults.failed++;
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
    log('fail', `${name}: ${e.message}`);
    return false;
  }
}

// ============================================
// PRUEBAS DE AUTENTICACIÓN
// ============================================

async function testAuth() {
  log('section', '\n=== PRUEBAS DE AUTENTICACIÓN ===\n');

  // Login sin credenciales
  await test('Login rechaza sin credenciales', async () => {
    const res = await request({ path: '/api/auth/login', method: 'POST' }, {});
    return res.status === 400;
  });

  // Login con credenciales incorrectas
  await test('Login rechaza credenciales inválidas', async () => {
    const res = await request({ path: '/api/auth/login', method: 'POST' },
      { username: 'noexiste', password: 'wrongpass' });
    return res.status === 401;
  });

  // Login exitoso
  await test('Login exitoso con credenciales válidas', async () => {
    const res = await request({ path: '/api/auth/login', method: 'POST' },
      { username: 'admin', password: 'admin123' });
    if (res.status === 200 && res.data.accessToken) {
      token = res.data.accessToken;
      return true;
    }
    return false;
  });

  // Acceso sin token
  await test('Endpoints protegidos rechazan sin token', async () => {
    const oldToken = token;
    token = null;
    const res = await request({ path: '/api/accidentologia/tipos', method: 'GET' });
    token = oldToken;
    return res.status === 401;
  });

  // Acceso con token inválido
  await test('Endpoints rechazan token inválido', async () => {
    const oldToken = token;
    token = 'invalid-token';
    const res = await request({ path: '/api/accidentologia/tipos', method: 'GET' });
    token = oldToken;
    return res.status === 401;
  });

  // Acceso con token válido
  await test('Endpoints aceptan token válido', async () => {
    const res = await request({ path: '/api/accidentologia/tipos', method: 'GET' });
    return res.status === 200;
  });
}

// ============================================
// PRUEBAS DE ACCIDENTOLOGÍA
// ============================================

async function testAccidentologia() {
  log('section', '\n=== PRUEBAS DE ACCIDENTOLOGÍA ===\n');

  // GET tipos de accidente
  await test('GET /api/accidentologia/tipos - Obtener tipos', async () => {
    const res = await request({ path: '/api/accidentologia/tipos', method: 'GET' });
    return res.status === 200 &&
           res.data.tipos_accidente &&
           res.data.tipos_vehiculo &&
           res.data.estados_persona &&
           res.data.tipos_lesion;
  });

  // GET estadísticas
  await test('GET /api/accidentologia/estadisticas - Obtener estadísticas', async () => {
    const res = await request({ path: '/api/accidentologia/estadisticas', method: 'GET' });
    return res.status === 200 && res.data.total_accidentes !== undefined;
  });

  // GET lista vacía
  await test('GET /api/accidentologia - Listar hojas', async () => {
    const res = await request({ path: '/api/accidentologia', method: 'GET' });
    return res.status === 200 && Array.isArray(res.data);
  });

  // POST crear sin datos requeridos
  await test('POST /api/accidentologia - Rechaza sin datos requeridos', async () => {
    const res = await request({ path: '/api/accidentologia', method: 'POST' }, {});
    return res.status === 400;
  });

  // Necesitamos una situación para crear una hoja
  // Primero verificamos si hay situaciones
  let situacionId = null;
  await test('Verificar situaciones existentes', async () => {
    const res = await request({ path: '/api/situaciones?limit=1', method: 'GET' });
    if (res.status === 200 && res.data.situaciones && res.data.situaciones.length > 0) {
      situacionId = res.data.situaciones[0].id;
      return true;
    }
    return 'warn'; // Warning si no hay situaciones
  });

  if (situacionId) {
    // POST crear hoja
    await test('POST /api/accidentologia - Crear hoja', async () => {
      const res = await request({ path: '/api/accidentologia', method: 'POST' }, {
        situacion_id: situacionId,
        tipo_accidente: 'COLISION_FRONTAL',
        descripcion_accidente: 'Prueba de accidente',
        condiciones_climaticas: 'Despejado',
        condiciones_via: 'Seca',
        iluminacion: 'Día',
        causa_principal: 'Exceso de velocidad'
      });
      if (res.status === 201 && res.data.id) {
        createdIds.hojaAccidentologia = res.data.id;
        return true;
      }
      // Puede fallar si ya existe una hoja para esta situación
      if (res.data.error && res.data.error.includes('Ya existe')) {
        createdIds.hojaAccidentologia = res.data.hoja_id;
        return 'warn';
      }
      return false;
    });

    if (createdIds.hojaAccidentologia) {
      // GET hoja por ID
      await test('GET /api/accidentologia/:id - Obtener hoja por ID', async () => {
        const res = await request({ path: `/api/accidentologia/${createdIds.hojaAccidentologia}`, method: 'GET' });
        return res.status === 200 && res.data.id === createdIds.hojaAccidentologia;
      });

      // PUT actualizar hoja
      await test('PUT /api/accidentologia/:id - Actualizar hoja', async () => {
        const res = await request({ path: `/api/accidentologia/${createdIds.hojaAccidentologia}`, method: 'PUT' }, {
          visibilidad: 'Buena',
          tipo_zona: 'Urbana'
        });
        return res.status === 200;
      });

      // POST agregar vehículo
      await test('POST /api/accidentologia/:id/vehiculos - Agregar vehículo', async () => {
        const res = await request({ path: `/api/accidentologia/${createdIds.hojaAccidentologia}/vehiculos`, method: 'POST' }, {
          numero_vehiculo: 1,
          tipo_vehiculo: 'AUTOMOVIL',
          placa: 'P123ABC',
          marca: 'Toyota',
          linea: 'Corolla',
          color: 'Rojo',
          conductor_nombre: 'Juan Pérez',
          conductor_estado: 'ILESO'
        });
        if (res.status === 201 && res.data.id) {
          createdIds.vehiculo = res.data.id;
          return true;
        }
        return false;
      });

      // GET vehículos
      await test('GET /api/accidentologia/:id/vehiculos - Listar vehículos', async () => {
        const res = await request({ path: `/api/accidentologia/${createdIds.hojaAccidentologia}/vehiculos`, method: 'GET' });
        return res.status === 200 && Array.isArray(res.data);
      });

      if (createdIds.vehiculo) {
        // PUT actualizar vehículo
        await test('PUT /api/accidentologia/vehiculos/:id - Actualizar vehículo', async () => {
          const res = await request({ path: `/api/accidentologia/vehiculos/${createdIds.vehiculo}`, method: 'PUT' }, {
            modelo_anio: 2020,
            danos_descripcion: 'Daño frontal severo'
          });
          return res.status === 200;
        });
      }

      // POST agregar persona
      await test('POST /api/accidentologia/:id/personas - Agregar persona', async () => {
        const res = await request({ path: `/api/accidentologia/${createdIds.hojaAccidentologia}/personas`, method: 'POST' }, {
          tipo_persona: 'CONDUCTOR',
          nombre_completo: 'María García',
          estado: 'HERIDO_LEVE',
          tipo_lesion: 'CONTUSIONES',
          vehiculo_accidente_id: createdIds.vehiculo
        });
        if (res.status === 201 && res.data.id) {
          createdIds.persona = res.data.id;
          return true;
        }
        return false;
      });

      // GET personas
      await test('GET /api/accidentologia/:id/personas - Listar personas', async () => {
        const res = await request({ path: `/api/accidentologia/${createdIds.hojaAccidentologia}/personas`, method: 'GET' });
        return res.status === 200 && Array.isArray(res.data);
      });

      if (createdIds.persona) {
        // PUT actualizar persona
        await test('PUT /api/accidentologia/personas/:id - Actualizar persona', async () => {
          const res = await request({ path: `/api/accidentologia/personas/${createdIds.persona}`, method: 'PUT' }, {
            requirio_atencion: true,
            hospital_trasladado: 'Hospital Roosevelt'
          });
          return res.status === 200;
        });
      }

      // PUT cambiar estado
      await test('PUT /api/accidentologia/:id/estado - Cambiar estado', async () => {
        const res = await request({ path: `/api/accidentologia/${createdIds.hojaAccidentologia}/estado`, method: 'PUT' }, {
          estado: 'COMPLETO'
        });
        return res.status === 200;
      });

      // GET por situación
      await test('GET /api/accidentologia/situacion/:id - Obtener por situación', async () => {
        const res = await request({ path: `/api/accidentologia/situacion/${situacionId}`, method: 'GET' });
        return res.status === 200;
      });
    }
  } else {
    log('warn', 'No hay situaciones para probar accidentología completa');
  }
}

// ============================================
// PRUEBAS DE COMUNICACIÓN SOCIAL
// ============================================

async function testComunicacionSocial() {
  log('section', '\n=== PRUEBAS DE COMUNICACIÓN SOCIAL ===\n');

  // GET variables
  await test('GET /api/comunicacion-social/plantillas/variables - Obtener variables', async () => {
    const res = await request({ path: '/api/comunicacion-social/plantillas/variables', method: 'GET' });
    return res.status === 200 && res.data.variables && res.data.variables.length > 0;
  });

  // GET plantillas
  await test('GET /api/comunicacion-social/plantillas - Listar plantillas', async () => {
    const res = await request({ path: '/api/comunicacion-social/plantillas', method: 'GET' });
    return res.status === 200 && Array.isArray(res.data) && res.data.length >= 5; // 5 predefinidas
  });

  // POST crear plantilla sin datos
  await test('POST /api/comunicacion-social/plantillas - Rechaza sin datos', async () => {
    const res = await request({ path: '/api/comunicacion-social/plantillas', method: 'POST' }, {});
    return res.status === 400;
  });

  // POST crear plantilla
  await test('POST /api/comunicacion-social/plantillas - Crear plantilla', async () => {
    const res = await request({ path: '/api/comunicacion-social/plantillas', method: 'POST' }, {
      nombre: 'Plantilla de Prueba',
      descripcion: 'Plantilla creada por pruebas automáticas',
      tipo_situacion: 'INCIDENTE',
      contenido_plantilla: '📢 PRUEBA: {descripcion} en {ubicacion}. Fecha: {fecha}',
      hashtags: ['PROVIAL', 'Prueba']
    });
    if (res.status === 201 && res.data.id) {
      createdIds.plantilla = res.data.id;
      return true;
    }
    return false;
  });

  if (createdIds.plantilla) {
    // GET plantilla por ID
    await test('GET /api/comunicacion-social/plantillas/:id - Obtener plantilla', async () => {
      const res = await request({ path: `/api/comunicacion-social/plantillas/${createdIds.plantilla}`, method: 'GET' });
      return res.status === 200 && res.data.nombre === 'Plantilla de Prueba';
    });

    // PUT actualizar plantilla
    await test('PUT /api/comunicacion-social/plantillas/:id - Actualizar plantilla', async () => {
      const res = await request({ path: `/api/comunicacion-social/plantillas/${createdIds.plantilla}`, method: 'PUT' }, {
        descripcion: 'Descripción actualizada por pruebas'
      });
      return res.status === 200;
    });
  }

  // Intentar editar plantilla predefinida
  await test('PUT /api/comunicacion-social/plantillas/:id - Rechaza editar predefinida', async () => {
    const res = await request({ path: '/api/comunicacion-social/plantillas/1', method: 'PUT' }, {
      nombre: 'Intento de cambio'
    });
    return res.status === 400;
  });

  // GET publicaciones
  await test('GET /api/comunicacion-social/publicaciones - Listar publicaciones', async () => {
    const res = await request({ path: '/api/comunicacion-social/publicaciones', method: 'GET' });
    return res.status === 200 && Array.isArray(res.data);
  });

  // POST crear publicación
  await test('POST /api/comunicacion-social/publicaciones - Crear publicación', async () => {
    const res = await request({ path: '/api/comunicacion-social/publicaciones', method: 'POST' }, {
      contenido_texto: 'Publicación de prueba automática',
      hashtags: ['PROVIAL', 'Test'],
      fotos_urls: []
    });
    if (res.status === 201 && res.data.id) {
      createdIds.publicacion = res.data.id;
      return true;
    }
    return false;
  });

  if (createdIds.publicacion) {
    // GET publicación por ID
    await test('GET /api/comunicacion-social/publicaciones/:id - Obtener publicación', async () => {
      const res = await request({ path: `/api/comunicacion-social/publicaciones/${createdIds.publicacion}`, method: 'GET' });
      return res.status === 200;
    });

    // PUT actualizar publicación
    await test('PUT /api/comunicacion-social/publicaciones/:id - Actualizar publicación', async () => {
      const res = await request({ path: `/api/comunicacion-social/publicaciones/${createdIds.publicacion}`, method: 'PUT' }, {
        contenido_editado: 'Contenido editado por pruebas'
      });
      return res.status === 200;
    });

    // GET links para compartir
    await test('GET /api/comunicacion-social/publicaciones/:id/compartir - Obtener links', async () => {
      const res = await request({ path: `/api/comunicacion-social/publicaciones/${createdIds.publicacion}/compartir`, method: 'GET' });
      return res.status === 200 && res.data.links && res.data.movil;
    });

    // POST marcar compartido
    await test('POST /api/comunicacion-social/publicaciones/:id/compartido - Marcar compartido', async () => {
      const res = await request({ path: `/api/comunicacion-social/publicaciones/${createdIds.publicacion}/compartido`, method: 'POST' }, {
        red: 'facebook'
      });
      return res.status === 200;
    });

    // POST marcar compartido - red inválida
    await test('POST /api/comunicacion-social/publicaciones/:id/compartido - Rechaza red inválida', async () => {
      const res = await request({ path: `/api/comunicacion-social/publicaciones/${createdIds.publicacion}/compartido`, method: 'POST' }, {
        red: 'tiktok'
      });
      return res.status === 400;
    });
  }
}

// ============================================
// PRUEBAS DE NOTIFICACIONES
// ============================================

async function testNotificaciones() {
  log('section', '\n=== PRUEBAS DE NOTIFICACIONES ===\n');

  // GET notificaciones
  await test('GET /api/notificaciones - Listar notificaciones', async () => {
    const res = await request({ path: '/api/notificaciones', method: 'GET' });
    return res.status === 200 && res.data.notificaciones !== undefined;
  });

  // GET conteo
  await test('GET /api/notificaciones/conteo - Obtener conteo', async () => {
    const res = await request({ path: '/api/notificaciones/conteo', method: 'GET' });
    return res.status === 200 && res.data.no_leidas !== undefined;
  });

  // POST registrar token sin datos
  await test('POST /api/notificaciones/registrar-token - Rechaza sin datos', async () => {
    const res = await request({ path: '/api/notificaciones/registrar-token', method: 'POST' }, {});
    return res.status === 400;
  });

  // POST registrar token
  await test('POST /api/notificaciones/registrar-token - Registrar token', async () => {
    const res = await request({ path: '/api/notificaciones/registrar-token', method: 'POST' }, {
      push_token: 'ExponentPushToken[test-token-12345]',
      plataforma: 'android',
      modelo_dispositivo: 'Test Device',
      version_app: '1.0.0'
    });
    return res.status === 200;
  });

  // POST leer todas
  await test('POST /api/notificaciones/leer-todas - Marcar todas leídas', async () => {
    const res = await request({ path: '/api/notificaciones/leer-todas', method: 'POST' }, {});
    return res.status === 200;
  });
}

// ============================================
// PRUEBAS DE ALERTAS
// ============================================

async function testAlertas() {
  log('section', '\n=== PRUEBAS DE ALERTAS ===\n');

  // GET tipos de alerta
  await test('GET /api/alertas/tipos - Obtener tipos de alerta', async () => {
    const res = await request({ path: '/api/alertas/tipos', method: 'GET' });
    return res.status === 200 && Array.isArray(res.data);
  });

  // GET configuración de alertas
  await test('GET /api/alertas/configuracion - Obtener configuración', async () => {
    const res = await request({ path: '/api/alertas/configuracion', method: 'GET' });
    return res.status === 200;
  });

  // GET alertas activas
  await test('GET /api/alertas/activas - Obtener alertas activas', async () => {
    const res = await request({ path: '/api/alertas/activas', method: 'GET' });
    return res.status === 200 && Array.isArray(res.data);
  });

  // GET historial
  await test('GET /api/alertas/historial - Obtener historial', async () => {
    const res = await request({ path: '/api/alertas/historial', method: 'GET' });
    return res.status === 200 && Array.isArray(res.data.alertas);
  });
}

// ============================================
// PRUEBAS DE DASHBOARD
// ============================================

async function testDashboard() {
  log('section', '\n=== PRUEBAS DE DASHBOARD ===\n');

  // GET estadísticas generales
  await test('GET /api/dashboard/estadisticas - Estadísticas generales', async () => {
    const res = await request({ path: '/api/dashboard/estadisticas', method: 'GET' });
    return res.status === 200;
  });

  // GET actividad reciente
  await test('GET /api/dashboard/actividad-reciente - Actividad reciente', async () => {
    const res = await request({ path: '/api/dashboard/actividad-reciente', method: 'GET' });
    return res.status === 200;
  });

  // GET métricas por sede (requiere sede_id)
  await test('GET /api/dashboard/metricas-sede - Métricas por sede', async () => {
    const res = await request({ path: '/api/dashboard/metricas-sede?sede_id=1', method: 'GET' });
    return res.status === 200 || res.status === 404; // 404 si sede no existe
  });
}

// ============================================
// PRUEBAS DE REPORTES
// ============================================

async function testReportes() {
  log('section', '\n=== PRUEBAS DE REPORTES ===\n');

  // GET tipos de reportes
  await test('GET /api/reportes/tipos - Tipos de reportes', async () => {
    const res = await request({ path: '/api/reportes/tipos', method: 'GET' });
    return res.status === 200;
  });
}

// ============================================
// PRUEBAS DE INSPECCIÓN 360
// ============================================

async function testInspeccion360() {
  log('section', '\n=== PRUEBAS DE INSPECCIÓN 360 ===\n');

  // GET plantillas
  await test('GET /api/inspeccion360/plantillas - Listar plantillas', async () => {
    const res = await request({ path: '/api/inspeccion360/plantillas', method: 'GET' });
    return res.status === 200;
  });
}

// ============================================
// PRUEBAS DE APROBACIONES
// ============================================

async function testAprobaciones() {
  log('section', '\n=== PRUEBAS DE APROBACIONES ===\n');

  // GET aprobaciones pendientes
  await test('GET /api/aprobaciones/pendientes - Pendientes', async () => {
    const res = await request({ path: '/api/aprobaciones/pendientes', method: 'GET' });
    return res.status === 200;
  });

  // GET historial
  await test('GET /api/aprobaciones/historial - Historial', async () => {
    const res = await request({ path: '/api/aprobaciones/historial', method: 'GET' });
    return res.status === 200;
  });
}

// ============================================
// PRUEBAS DE GEOGRAFÍA
// ============================================

async function testGeografia() {
  log('section', '\n=== PRUEBAS DE GEOGRAFÍA ===\n');

  // GET departamentos
  await test('GET /api/geografia/departamentos - Listar departamentos', async () => {
    const res = await request({ path: '/api/geografia/departamentos', method: 'GET' });
    return res.status === 200 && Array.isArray(res.data.departamentos) && res.data.departamentos.length > 0;
  });

  // GET municipios
  await test('GET /api/geografia/municipios - Listar municipios', async () => {
    const res = await request({ path: '/api/geografia/municipios', method: 'GET' });
    return res.status === 200 && Array.isArray(res.data.municipios);
  });
}

// ============================================
// PRUEBAS DE SEDES
// ============================================

async function testSedes() {
  log('section', '\n=== PRUEBAS DE SEDES ===\n');

  // GET sedes
  await test('GET /api/sedes - Listar sedes', async () => {
    const res = await request({ path: '/api/sedes', method: 'GET' });
    return res.status === 200 && Array.isArray(res.data.sedes);
  });
}

// ============================================
// PRUEBAS DE BRIGADAS Y UNIDADES
// ============================================

async function testBrigadasUnidades() {
  log('section', '\n=== PRUEBAS DE BRIGADAS Y UNIDADES ===\n');

  // GET brigadas
  await test('GET /api/brigadas - Listar brigadas', async () => {
    const res = await request({ path: '/api/brigadas', method: 'GET' });
    return res.status === 200;
  });

  // GET unidades
  await test('GET /api/unidades - Listar unidades', async () => {
    const res = await request({ path: '/api/unidades', method: 'GET' });
    return res.status === 200;
  });

  // GET unidades activas
  await test('GET /api/unidades/activas - Unidades activas', async () => {
    const res = await request({ path: '/api/unidades/activas', method: 'GET' });
    return res.status === 200;
  });
}

// ============================================
// PRUEBAS DE SITUACIONES
// ============================================

async function testSituaciones() {
  log('section', '\n=== PRUEBAS DE SITUACIONES ===\n');

  // GET situaciones
  await test('GET /api/situaciones - Listar situaciones', async () => {
    const res = await request({ path: '/api/situaciones', method: 'GET' });
    return res.status === 200 && res.data.situaciones !== undefined;
  });

  // GET situaciones activas
  await test('GET /api/situaciones/activas - Situaciones activas', async () => {
    const res = await request({ path: '/api/situaciones/activas', method: 'GET' });
    return res.status === 200;
  });

  // GET tipos de situación
  await test('GET /api/situaciones/tipos - Tipos de situación', async () => {
    const res = await request({ path: '/api/situaciones/tipos', method: 'GET' });
    return res.status === 200;
  });
}

// ============================================
// PRUEBAS DE ADMINISTRACIÓN
// ============================================

async function testAdministracion() {
  log('section', '\n=== PRUEBAS DE ADMINISTRACIÓN ===\n');

  // GET estadísticas admin
  await test('GET /api/admin/estadisticas - Estadísticas admin', async () => {
    const res = await request({ path: '/api/admin/estadisticas', method: 'GET' });
    return res.status === 200;
  });

  // GET usuarios
  await test('GET /api/admin/usuarios - Listar usuarios', async () => {
    const res = await request({ path: '/api/admin/usuarios', method: 'GET' });
    return res.status === 200;
  });

  // GET grupos
  await test('GET /api/admin/grupos - Listar grupos', async () => {
    const res = await request({ path: '/api/admin/grupos', method: 'GET' });
    return res.status === 200;
  });

  // GET log auditoría
  await test('GET /api/admin/auditoria - Log de auditoría', async () => {
    const res = await request({ path: '/api/admin/auditoria', method: 'GET' });
    return res.status === 200;
  });
}

// ============================================
// LIMPIEZA DE DATOS DE PRUEBA
// ============================================

async function cleanup() {
  log('section', '\n=== LIMPIEZA DE DATOS DE PRUEBA ===\n');

  // Eliminar persona
  if (createdIds.persona) {
    await test('DELETE persona de prueba', async () => {
      const res = await request({ path: `/api/accidentologia/personas/${createdIds.persona}`, method: 'DELETE' });
      return res.status === 200;
    });
  }

  // Eliminar vehículo
  if (createdIds.vehiculo) {
    await test('DELETE vehículo de prueba', async () => {
      const res = await request({ path: `/api/accidentologia/vehiculos/${createdIds.vehiculo}`, method: 'DELETE' });
      return res.status === 200;
    });
  }

  // Eliminar plantilla personalizada
  if (createdIds.plantilla) {
    await test('DELETE plantilla de prueba', async () => {
      const res = await request({ path: `/api/comunicacion-social/plantillas/${createdIds.plantilla}`, method: 'DELETE' });
      return res.status === 200;
    });
  }

  // Intentar eliminar plantilla predefinida (debe fallar)
  await test('DELETE plantilla predefinida - Debe rechazar', async () => {
    const res = await request({ path: '/api/comunicacion-social/plantillas/1', method: 'DELETE' });
    return res.status === 400;
  });
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  PRUEBAS EXHAUSTIVAS DEL SISTEMA PROVIAL');
  console.log('='.repeat(60) + '\n');

  const startTime = Date.now();

  try {
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
    await testBrigadasUnidades();
    await testSituaciones();
    await testAdministracion();
    await cleanup();
  } catch (e) {
    log('fail', `Error crítico: ${e.message}`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('  RESUMEN DE PRUEBAS');
  console.log('='.repeat(60));
  console.log(`\n  ${colors.green}✅ Pasadas: ${testResults.passed}${colors.reset}`);
  console.log(`  ${colors.red}❌ Fallidas: ${testResults.failed}${colors.reset}`);
  console.log(`  ${colors.yellow}⚠️  Warnings: ${testResults.warnings}${colors.reset}`);
  console.log(`\n  Tiempo total: ${duration}s`);
  console.log('='.repeat(60) + '\n');

  process.exit(testResults.failed > 0 ? 1 : 0);
}

main();
