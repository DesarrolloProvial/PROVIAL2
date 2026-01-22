# Secciones Adicionales para OFFLINE_FIRST_SITUACIONES.md

## 🔄 Trabajo Colaborativo en Situaciones

### Caso de Uso: Equipo trabajando en paralelo

**Escenario:** Unidad 030 llega a un accidente con 4 tripulantes.

```
14:30 - Llegan a accidente en CA-9 Km 50

Comandante:
  → Reporta HECHO_TRANSITO con datos mínimos
  → Solo: ubicación, km, sentido, tipo_hecho
  → Situación guardada: SIT-2026-0234
  → Estado: ACTIVA (incompleta, se puede editar)

Cop iloto:
  → Ingresa a SIT-2026-0234
  → Agrega datos de vehículos involucrados
  → Guarda cambios

Acompañante 1:
  → Ingresa a SIT-2026-0234  
  → Agrega datos de autoridades presentes
  → Guarda cambios

Acompañante 2:
  → Captura 3 fotos + 1 video
  → Asocia multimedia a SIT-2026-0234
  → Guarda cambios

Resultado: Situación completa creada en 5 minutos en lugar de 20
```

### Datos Mínimos para Crear Situación

**HECHO_TRANSITO, ASISTENCIA_VEHICULAR, EMERGENCIA pueden crearse con mínimos:**

```typescript
// Datos obligatorios mínimos:
{
  tipo_situacion: "HECHO_TRANSITO",
  unidad_id: 030,
  ruta_id: 86,
  km: 50,
  sentido: "Norte",
  latitud: 14.6349,
  longitud: -90.5069,
  tipo_hecho: "COLISION"  // Solo para HECHO_TRANSITO
}

// Todo lo demás es OPCIONAL y se puede agregar después:
- Descripción detallada
- Vehículos involucrados
- Personas lesionadas/fallecidas
- Autoridades
- Multimedia (excepto que sea obligatoria dependiendo del tipo)
- Observaciones
```

### Detección de Conflictos en Edición Colaborativa

```
Comandante edita observaciones:
  → "Vehículo obstruye carril izquierdo"
  → Intenta guardar

Backend verifica:
  → ¿Observaciones han cambiado desde que las leyó?
  → SÍ: Copiloto ya puso "Piloto con lesiones leves"
  
Respuesta 409:
  → "Otro tripulante actualizó este campo"
  → Mostrar ambas versiones
  → [Usar Mía] [Usar del Servidor]
```

**Regla:** Si dos tripulantes editan DIFERENTES campos, no hay conflicto.
**Conflicto:** Solo cuando editan el MISMO campo al mismo tiempo.

### 🔒 Dos Etapas de Guardado: GUARDAR vs CERRAR

**Importante:** Las situaciones tienen un ciclo de vida de dos etapas.

#### Etapa 1: GUARDAR (Datos Mínimos)

Esta etapa permite trabajo colaborativo:

```typescript
// ASISTENCIA_VEHICULAR - Datos mínimos para GUARDAR
{
  tipo_situacion: "ASISTENCIA_VEHICULAR",
  unidad_id: 030,
  ruta_id: 86,
  km: 50,
  sentido: "Norte",
  latitud: 14.6349,
  longitud: -90.5069
}

// ✅ Se puede GUARDAR
// ❌ NO se puede CERRAR (falta vehículo)
```

**Al GUARDAR:**
- Estado: `ACTIVA` (pero incompleta)
- Visible en bitácora con indicador "⚠️ Incompleta"
- Otros tripulantes pueden editar
- Se puede editar múltiples veces
- **NO se ejecutan validaciones de completitud**

#### Etapa 2: CERRAR (Datos Completos)

Esta etapa finaliza la situación:

```typescript
// ASISTENCIA_VEHICULAR - Datos para CERRAR
{
  ...datos_minimos,
  vehiculos: [{
    tipo: "AUTOMOVIL",
    placa: "P123ABC",
    marca: "Toyota",
    // ...datos completos del vehículo
  }],
  multimedia: {
    fotos: 3,  // ✅ 3 fotos subidas
    videos: 1  // ✅ 1 video subido
  }
}

// ✅ Ahora SÍ se puede CERRAR
```

**Al CERRAR:**
- **SE EJECUTAN TODAS LAS VALIDACIONES**
- Verifica datos obligatorios según tipo de situación
- Verifica multimedia completa (si es obligatoria)
- Estado cambia: `ACTIVA` → `CERRADA`
- Ya NO se puede editar (excepto COP/admin)
- Aparece en bitácora como completa

#### Validaciones por Tipo de Situación

**HECHO_TRANSITO - Para CERRAR requiere:**
```typescript
✅ Datos mínimos (ubicación, km, sentido, tipo_hecho)
✅ Al menos 1 vehículo involucrado
✅ Datos de personas (lesionadas/fallecidas si aplica)
✅ 3 fotos + 1 video
✅ Descripción del hecho
```

**ASISTENCIA_VEHICULAR - Para CERRAR requiere:**
```typescript
✅ Datos mínimos (ubicación, km, sentido)
✅ Al menos 1 vehículo asistido
✅ 3 fotos + 1 video
✅ Servicio proporcionado (descripción)
```

**EMERGENCIA - Para CERRAR requiere:**
```typescript
✅ Datos mínimos (ubicación, km, sentido, tipo_emergencia)
✅ Descripción de la emergencia
✅ Autoridades notificadas
✅ 3 fotos + 1 video
```

**PATRULLAJE, COMIDA, DESCANSO - Para CERRAR requiere:**
```typescript
✅ Solo datos mínimos
✅ NO requiere multimedia (opcional)
✅ Se cierran inmediatamente al guardar
```

#### Flujo Completo

```
1. Comandante GUARDA HECHO_TRANSITO con datos mínimos
   → Estado: ACTIVA (incompleta)
   → Visible en bitácora con "⚠️ Incompleta"

2. Copiloto agrega datos de vehículos
   → Situación sigue ACTIVA (todavía falta multimedia)

3. Acompañante captura 3 fotos + 1 video
   → Situación ahora tiene todo lo necesario
   → Pero sigue ACTIVA

4. Cualquier tripulante presiona "CERRAR SITUACIÓN"
   → Sistema valida:
     ✅ Tiene vehículos
     ✅ Tiene multimedia completa
     ✅ Tiene datos obligatorios
   → Estado: CERRADA
   → Ya no se puede editar
   → Desaparece "⚠️ Incompleta" de bitácora

5. Si alguien intenta CERRAR sin completar:
   → ❌ Error: "No se puede cerrar"
   → Muestra qué falta:
     "Falta: 2 fotos, descripción del hecho"
```

#### Botones en la UI

```
Situación ACTIVA (incompleta):
  [Editar] [Cerrar Situación]
  
Al presionar "Cerrar Situación":
  → Ejecuta validaciones
  → Si falta algo: Muestra error específico
  → Si está completo: Cambia a CERRADA

Situación CERRADA:
  [Ver Detalles]
  (Solo COP puede editar situaciones cerradas)
```

#### Validaciones que NO SE ELIMINAN

Las validaciones actuales **se mantienen** pero se mueven a la etapa de CERRAR:

```typescript
// ❌ ANTES: Validar al guardar (impedía trabajo colaborativo)
async function guardarAsistencia(data) {
  if (!data.vehiculos || data.vehiculos.length === 0) {
    throw new Error("Debe agregar al menos un vehículo");
  }
  // ... guardar
}

// ✅ AHORA: Validar al cerrar (permite colaboración)
async function guardarAsistencia(data) {
  // Sin validaciones - permite guardar incompleto
  await situacion.create(data, { estado: 'ACTIVA' });
}

async function cerrarAsistencia(situacionId) {
  const situacion = await situacion.findById(situacionId);
  
  // AQUÍ van todas las validaciones
  if (!situacion.vehiculos || situacion.vehiculos.length === 0) {
    throw new Error("No se puede cerrar: Debe agregar al menos un vehículo");
  }
  
  if (!situacion.multimedia || situacion.multimedia.fotos < 3) {
    throw new Error("No se puede cerrar: Faltan fotos (3 requeridas)");
  }
  
  // Todo válido - cerrar
  await situacion.update({ estado: 'CERRADA' });
}
```

#### Beneficios

1. ✅ **Trabajo colaborativo**: Se puede guardar con mínimos y otros completan
2. ✅ **Rapidez**: No bloquea al equipo esperando todos los datos
3. ✅ **Calidad**: Las validaciones se mantienen en el CERRAR
4. ✅ **Flexibilidad**: Se puede editar hasta que esté todo correcto
5. ✅ **Trazabilidad**: Se ve en bitácora qué está incompleto

---

## 📋 Tabla de Conflictos (Pendiente de Crear)

### Propósito

Cuando un conflicto no se puede resolver automáticamente o el brigada elige "Esperar", se guarda en una tabla especial para que el COP lo revise.

### Estructura de la Tabla

```sql
CREATE TABLE situacion_conflicto (
  id SERIAL PRIMARY KEY,
  codigo_situacion TEXT NOT NULL,
  situacion_existente_id INTEGER REFERENCES situacion(id), -- NULL si no existe
  datos_locales JSONB NOT NULL,
  datos_servidor JSONB,  -- NULL si situación no existe
  diferencias JSONB NOT NULL,  -- Array de {campo, valor_local, valor_servidor}
  usuario_reporta INTEGER REFERENCES usuario(id) NOT NULL,
  tipo_conflicto TEXT NOT NULL,  -- 'DUPLICADO', 'NUMERO_USADO', 'EDICION_SIMULTANEA'
  estado TEXT DEFAULT 'PENDIENTE',  -- PENDIENTE, RESUELTO, DESCARTADO
  resuelto_por INTEGER REFERENCES usuario(id),
  decision_cop TEXT,  -- 'USAR_LOCAL', 'USAR_SERVIDOR', 'FUSIONADO', 'DESCARTADO'
  notas_resolucion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  
  CONSTRAINT check_estado CHECK (estado IN ('PENDIENTE', 'RESUELTO', 'DESCARTADO')),
  CONSTRAINT check_tipo CHECK (tipo_conflicto IN ('DUPLICADO', 'NUMERO_USADO', 'EDICION_SIMULTANEA'))
);

CREATE INDEX idx_conflicto_estado ON situacion_conflicto(estado);
CREATE INDEX idx_conflicto_usuario ON situacion_conflicto(usuario_reporta);
CREATE INDEX idx_conflicto_codigo ON situacion_conflicto(codigo_situacion);
CREATE INDEX idx_conflicto_created ON situacion_conflicto(created_at);
```

### Tipos de Conflictos

1. **DUPLICADO**: Mismo ID, datos diferentes (ej: dos tripulantes reportaron misma asistencia)
2. **NUMERO_USADO**: Otro tripulante usó el número de situación antes
3. **EDICION_SIMULTANEA**: Dos tripulantes editaron mismo campo al mismo tiempo

### Endpoint para Registrar

```typescript
POST /api/situaciones/conflictos

Body: {
  codigo_situacion: "20260121-1-030-70-86-50-4",
  datos_locales: {
    km: 50,
    sentido: "Norte",
    observaciones: "Mi versión"
  },
  datos_servidor: {
    km: 52,
    sentido: "Sur", 
    observaciones: "Versión del servidor"
  },
  diferencias: [
    { campo: "km", local: 50, servidor: 52 },
    { campo: "sentido", local: "Norte", servidor: "Sur" },
    { campo: "observaciones", local: "Mi versión", servidor: "Versión del servidor" }
  ],
  tipo_conflicto: "DUPLICADO"
}

Response 201: {
  conflicto_id: 123,
  message: "Conflicto registrado. El COP revisará esta situación."
}
```

### Resolución desde Panel COP

El COP puede:

1. **Usar Local**: Sobreescribe servidor con datos del brigada
2. **Usar Servidor**: Descarta datos locales del brigada
3. **Descartar**: Era error del brigada, no hacer nada

**IMPORTANTE:** NO hay opción de fusionar automáticamente. Si el COP necesita datos de ambos, debe:
  - Elegir "Usar Local" o "Usar Servidor"
  - Luego editar manualmente la situación en bitácora para agregar lo que falta
  - Fusionar automáticamente daría muchos errores

Cuando el COP resuelve:
```
1. Actualiza estado a 'RESUELTO'
2. Guarda decisión y notas
3. Notifica al brigada (push notification)
4. Brigada puede eliminar su draft local
```

---

## ⚠️ Eliminación de Opción A: No Reasignación Automática

### Decisión

**NO implementar** reasignación automática de número cuando hay conflicto.

### Justificación

```
Opción A (Rechazada): Reasignación automática
  → Brigada reporta PATRULLAJE (#4)
  → Otro ya usó #4
  → Backend asigna automáticamente #5
  → Se guarda sin que el brigada lo sepa

❌ Problemas:
  1. Brigada no sabe que hubo cambio de número
  2. Puede causar desorden en la secuencia
  3. Oculta problema de comunicación del equipo
  4. Difícil debuggear cuando hay errores
```

### Solución Correcta

```
Todo conflicto de número DEBE ir a tabla situacion_conflicto:

Brigada intenta usar #4 → Ya existe
  ↓
Backend responde 409 CONFLICT
  ↓
Móvil muestra: "Otro tripulante ya usó el número 4"
  ↓
BLOQUEO - No puede continuar
  ↓
Opciones:
  1. [Consultar con COP] → Va a tabla conflictos
  2. [Cancelar] → Volver y verificar con compañeros
```

**Por qué es mejor:**
- ✅ Fuerza comunicación entre tripulantes
- ✅ COP puede ver qué está pasando
- ✅ Brigadas aprenden a usar correctamente la app
- ✅ No se ocultan problemas
- ✅ Trazabilidad completa

### Rol Educativo

El sistema debe educar a los brigadas a:
1. Verificar que su reporte se guardó antes de crear otro
2. Comunicarse con su equipo antes de reportar
3. Revisar mensajes de la app
4. Consultar con COP cuando hay dudas

**No crear "soluciones mágicas" que oculten malos hábitos.**

---

## 📝 Notas de Implementación

### Prioridades

1. ✅ **Crítico**: ID determinista sin padding
2. ✅ **Crítico**: UN solo draft a la vez
3. ✅ **Crítico**: Bloqueo cuando hay draft pendiente
4. ⚠️ **Importante**: Tabla situacion_conflicto
5. ⚠️ **Importante**: Endpoint de conflictos
6. ⚠️ **Importante**: Panel COP para resolver
7. 🔄 **Deseable**: Trabajo colaborativo en situaciones
8. 🔄 **Deseable**: Notificaciones push

### Orden de Implementación Sugerido

1. Backend:
   - Endpoint GET /api/unidades/:codigo/reservar-numero-salida
   - Modificar POST /api/situaciones para validar ID
   - Crear tabla situacion_conflicto
   - Endpoint POST /api/situaciones/conflictos

2. Móvil:
   - Función generateSituacionId() sin padding
   - Bloqueo de draft único
   - UI de resolución de conflictos
   - Integración con AsyncStorage

3. COP:
   - Panel de conflictos pendientes
   - Acciones de resolución
   - Notificaciones a brigadas

---

**Fin de secciones adicionales**
