# Sistema Offline-First para Reporte de Situaciones

## Documento de Diseño Técnico
**Versión:** 1.0  
**Fecha:** 21 de enero de 2026  
**Autor:** Equipo PROVIAL

---

## 📋 Índice

1. [Problemática](#problemática)
2. [Solución Propuesta](#solución-propuesta)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Identificador Determinista](#identificador-determinista)
5. [Flujo de Trabajo](#flujo-de-trabajo)
6. [Manejo de Conflictos](#manejo-de-conflictos)
7. [Estados y Validaciones](#estados-y-validaciones)
8. [Rol del COP](#rol-del-cop)
9. [Implementación Técnica](#implementación-técnica)

---

## Problemática

### Contexto Operativo

Las brigadas de PROVIAL operan en carreteras de Guatemala donde:
- ❌ **Conexión inestable:** Muchas zonas sin cobertura o con señal débil
- 📸 **Multimedia obligatoria:** La mayoría de situaciones requieren fotos/videos para Comunicación Social
- 👥 **Múltiples reportantes por unidad:** Cada tripulante puede reportar situaciones de su unidad desde su propio teléfono. Los roles de tripulación son: Comandante, Piloto, Copiloto, Acompañante
- ⏱️ **Tiempo crítico:** Los reportes deben ser rápidos, especialmente en emergencias
- 🤝 **Unidades en apoyo:** Si dos unidades están en el mismo incidente, UNA reporta la situación principal, la OTRA reporta que está en apoyo

### Problemas Identificados

1. **Pérdida de datos por falta de conexión**
   - Brigada llena formulario completo
   - Presiona "Guardar"
   - Error de red → Datos perdidos
   - **Impacto:** Frustración del usuario, re-trabajo, datos no registrados

2. **Duplicación de situaciones por múltiples tripulantes**
   - Unidad 030 tiene 3 tripulantes: Comandante, Piloto, Asistente
   - Todos tienen la app y pueden reportar situaciones de la Unidad 030
   - Si Comandante reporta PATRULLAJE a las 14:30 (situación #4)
   - Y Piloto reporta ASISTENCIA a las 14:31 (también situación #4?)
   - **Conflicto:** Ambos intentan usar el mismo número de situación del día
   - **Impacto:** Uno de los reportes puede sobreescribir al otro, o crear inconsistencias en los números secuenciales

3. **Desincronización de multimedia**
   - Situación se guarda sin fotos/videos
   - No hay forma de asociarlos después
   - **Impacto:** Reportes incompletos, Comunicación Social sin material

4. **Caos de múltiples drafts**
   - Sistema permitía guardar múltiples situaciones pendientes
   - Brigada pierde el control de qué está pendiente
   - **Impacto:** Confusión, envíos accidentales, datos mezclados

---

## Solución Propuesta

### Principios de Diseño

1. ✅ **UN solo draft a la vez** - Simplicidad sobre flexibilidad
2. ✅ **UX transparente** - El brigada siempre sabe el estado de su reporte
3. ✅ **ID determinista** - Permite detectar duplicados antes de guardar
4. ✅ **COP como árbitro** - Conflictos complejos se resuelven con brigadas que tienen rol COP (pueden ser encargados de departamento u operadores COP)
5. ✅ **Offline-first** - Guardar local primero, sincronizar después

### ¿Por qué UN solo draft?

**Decisión:** Permitir solo UNA situación pendiente de envío a la vez.

**Justificación:**
- ✅ **Simple:** Fácil de entender para el brigada
- ✅ **Seguro:** No se mezclan datos de diferentes situaciones
- ✅ **Transparente:** Estado claro en todo momento
- ✅ **Previene errores:** No se puede reportar accidente si hay patrullaje pendiente

**Caso de uso:**
```
Brigada reporta PATRULLAJE → Sin conexión → Queda pendiente
  ↓
Brigada intenta reportar ASISTENCIA
  ↓
❌ BLOQUEADO: "Tienes PATRULLAJE sin enviar"
  ↓
Opciones: [Enviar Ahora] [Eliminar] [Cancelar]
```

**¿Por qué no múltiples drafts?**
- ❌ Complejidad innecesaria
- ❌ Riesgo de enviar datos incorrectos
- ❌ Fotos/videos podrían asociarse a situación equivocada
- ❌ Difícil de debuggear cuando hay errores

---

## Arquitectura del Sistema

### Componentes

```
┌─────────────────────────────────────────────────┐
│              MÓVIL (React Native)               │
├─────────────────────────────────────────────────┤
│ AsyncStorage                                    │
│   └─ 'situacion_pendiente': Draft único        │
│                                                 │
│ Expo FileSystem                                 │
│   └─ Fotos/Videos en cache local               │
│                                                 │
│ Hooks                                           │
│   └─ useDraftSave: Auto-relleno de formularios │
└─────────────────┬───────────────────────────────┘
                  │ HTTP/REST
                  ▼
┌─────────────────────────────────────────────────┐
│            BACKEND (Express + PostgreSQL)       │
├─────────────────────────────────────────────────┤
│ Endpoints                                       │
│   └─ GET /api/unidades/:id/reservar-numero     │
│   └─ POST /api/situaciones                     │
│   └─ POST /api/situaciones/validar-id          │
│                                                 │
│ Tablas                                          │
│   └─ situacion: Situaciones finales            │
│   └─ situacion_conflicto: Conflictos para COP  │
│   └─ situacion_multimedia: Fotos/videos        │
└─────────────────────────────────────────────────┘
```

### Flujo de Datos

```
1. Reservar número
   Móvil → GET /reservar-numero → Backend
   Backend → Calcula siguiente número → Móvil
   
2. Llenar formulario
   Móvil → Guarda en AsyncStorage (auto-save)
   
3. Capturar multimedia
   Móvil → Guarda en FileSystem local
   
4. Enviar
   Móvil → POST /situaciones → Backend
   Backend → Valida ID → (Éxito | Conflicto)
```

---

## Identificador Determinista

### Formato del ID

```
YYYYMMDD-{SEDE}-{UNIDAD}-{TIPO}-{RUTA}-{KM}-{NUM_SALIDA}

Donde:
  YYYYMMDD = Fecha (8 dígitos)
  SEDE     = Sede ID (sin padding, tal cual: 1, 10, 100)
  UNIDAD   = Código de unidad (sin padding, ejemplos: 030, 1131, M007)
  TIPO     = Tipo situación ID (sin padding, tal cual: 1, 70, 100)
  RUTA     = Ruta ID (sin padding, tal cual: 86, 5, 120)
  KM       = Kilómetro (parte entera, sin padding: 50, 125, 5)
  NUM_SALIDA = Número de situación en esta SALIDA (no por día, sino por jornada completa)

NOTA IMPORTANTE: Los códigos se usan tal cual existen en la base de datos, sin padding.
Ejemplos reales de unidades: 030, 1131, M007 (motorizada)
```

### Ejemplo Real

```typescript
// Datos:
Fecha: 21 de enero de 2026
Sede: 1 (Central)
Unidad: 030 (Patrulla 030)
Tipo: 70 (Asistencia Vehicular)
Ruta: 86 (CA-9 Norte)
Km: 50
Situación de la salida: 4 (cuarta situación de esta jornada/salida)

// ID generado (sin padding):
20260121-1-030-70-86-50-4

// Legible:
2026-01-21 | Sede 1 | Unidad 030 | Asistencia | CA-9 Norte Km 50 | Situación #4 de esta salida
```

### Ventajas

1. ✅ **Único:** Combinación de fecha + sede + unidad + número del día garantiza unicidad
2. ✅ **Determinista:** Mismo input siempre genera mismo ID
3. ✅ **Legible:** Humanos pueden entender el ID
4. ✅ **Ordenable:** Orden cronológico natural
5. ✅ **Búsqueda:** Fácil filtrar por fecha, unidad, ruta, etc.
6. ✅ **Detección duplicados:** Si dos reportes tienen mismo ID, es el mismo incidente

### Generación del ID

```typescript
function generateSituacionId(params: {
  fecha: Date,
  sede_id: number,
  unidad_codigo: string,        // Código tal cual: "030", "1131", "M007"
  tipo_situacion_id: number,
  ruta_id: number,
  km: number,
  num_situacion_salida: number  // Número de esta SALIDA, no del día
}): string {
  const fecha = format(params.fecha, 'yyyyMMdd');
  const sede = String(params.sede_id);              // Sin padding
  const unidad = params.unidad_codigo;              // Tal cual: 030, 1131, M007
  const tipo = String(params.tipo_situacion_id);    // Sin padding
  const ruta = String(params.ruta_id);              // Sin padding
  const km = String(Math.floor(params.km));         // Sin padding
  const num = String(params.num_situacion_salida);  // Sin padding
  
  return `${fecha}-${sede}-${unidad}-${tipo}-${ruta}-${km}-${num}`;
}

// Ejemplo de uso:
const id = generateSituacionId({
  fecha: new Date('2026-01-21'),
  sede_id: 1,
  unidad_codigo: "030",
  tipo_situacion_id: 70,
  ruta_id: 86,
  km: 50,
  num_situacion_salida: 4
});
// Resultado: "20260121-1-030-70-86-50-4"
```

### ¿Por qué número de situación de SALIDA y no timestamp?

**Decisión:** Usar número secuencial por SALIDA/JORNADA (1, 2, 3...) en lugar de timestamp (143055).

**IMPORTANTE:** El contador es por SALIDA, no por día. Una salida puede durar varios días (comisiones, accidentes que amanecen). El número se resetea cuando la unidad FINALIZA su jornada y regresa a sede.

**Justificación:**

| Criterio | Timestamp | Número de salida | Ganador |
|----------|-----------|------------------|---------|
| Detecta duplicados | ❌ Dos reportes con 1 min diferencia parecen situaciones diferentes | ✅ Si hay #4 y #5, claramente son diferentes | **Número** |
| Orden de fila | ❌ No refleja orden de creación | ✅ Secuencial, fácil ver si alguien se "coló" | **Número** |
| Legibilidad | ⚠️ Menos intuitivo | ✅ "4ta situación de esta salida" | **Número** |
| Detección conflictos | ❌ Difícil verificar | ✅ Si dos tienen mismo número, hay error | **Número** |
| Jornadas multi-día | ❌ Cambia cada día | ✅ Se mantiene durante toda la salida | **Número** |

**Caso problemático con timestamp:**
```
Unidad 030 reporta asistencia CA-9 Km 50 a las 14:30:55
  → ID: 20260121-001-030-70-086-050-143055

Unidad 030 reporta asistencia CA-9 Km 50 a las 14:31:56 (misma asistencia, reintento)
  → ID: 20260121-001-030-70-086-050-143156

❌ IDs diferentes → Sistema los ve como 2 situaciones diferentes
❌ Se duplica el reporte
```

**Solución con número del día:**
```
Unidad 030 reporta asistencia CA-9 Km 50 (es su 4ta situación del día)
  → ID: 20260121-001-030-70-086-050-004

Unidad 030 reintenta (sigue siendo su 4ta situación del día)
  → ID: 20260121-001-030-70-086-050-004

✅ Mismo ID → Sistema detecta duplicado
✅ Pregunta qué hacer (update/delete/wait)
```

---

## Flujo de Trabajo

### 1. Abrir Formulario de Situación

```
Usuario toca "Nueva Situación" → Tipo: PATRULLAJE
  │
  ▼
¿Hay situación pendiente en AsyncStorage?
  ├─ SÍ: ❌ BLOQUEO
  │   │
  │   ▼
  │  Mostrar alerta:
  │  "⚠️ Tienes ASISTENCIA sin enviar desde hace 15 min
  │   No puedes crear otra situación hasta resolver esta."
  │   
  │   [📤 Enviar Ahora]  [🗑️ Eliminar]  [Cancelar]
  │
  └─ NO: ✅ Continuar
      │
      ▼
     Llamar al backend: GET /api/unidades/030/reservar-numero
      │
      ▼
     Backend responde:
     {
       num_situacion_hoy: 4,
       fecha: "2026-01-21",
       sede_id: 1,
       valido_hasta: "2026-01-21T23:59:59Z"
     }
      │
      ▼
     Generar ID local:
     20260121-001-030-01-086-050-004
      │
      ▼
     Abrir formulario
```

### 2. Llenar Formulario (Auto-save)

```
Usuario llena campos del formulario
  │
  ▼
Cada cambio se auto-guarda en AsyncStorage
{
  id: "20260121-001-030-01-086-050-004",
  tipo: "PATRULLAJE",
  ruta_id: 86,
  km: 50,
  sentido: "Norte",
  ...otros campos,
  num_situacion_hoy: 4,
  estado: "DRAFT"
}
  │
  ▼
Si cierra la app y vuelve a abrir PATRULLAJE
  → Formulario se rellena automáticamente
```

### 3. Capturar Multimedia (si aplica)

```
Usuario captura 3 fotos + 1 video
  │
  ▼
Se guardan en FileSystem local con nombres:
  - 20260121-001-030-01-086-050-004_foto_1.jpg
  - 20260121-001-030-01-086-050-004_foto_2.jpg
  - 20260121-001-030-01-086-050-004_foto_3.jpg
  - 20260121-001-030-01-086-050-004_video.mp4
  │
  ▼
Referencia en AsyncStorage:
{
  ...datos del draft,
  multimedia: [
    { tipo: 'FOTO', uri: 'file://...foto_1.jpg', orden: 1 },
    { tipo: 'FOTO', uri: 'file://...foto_2.jpg', orden: 2 },
    { tipo: 'FOTO', uri: 'file://...foto_3.jpg', orden: 3 },
    { tipo: 'VIDEO', uri: 'file://...video.mp4' }
  ]
}
```

### 4. Guardar Situación

```
Usuario presiona "Guardar"
  │
  ▼
Validar formulario
  ├─ ❌ Incompleto → Mostrar errores
  └─ ✅ Completo
      │
      ▼
     Mostrar indicador: "💾 Guardando..."
      │
      ▼
     ¿Hay conexión a internet?
      ├─ NO: Saltar a paso 5 (Error de conexión)
      └─ SÍ: Intentar enviar
          │
          ▼
         POST /api/situaciones
         {
           id: "20260121-001-030-01-086-050-004",
           tipo_situacion_id: 1,
           sede_id: 1,
           unidad_id: 30,
           ruta_id: 86,
           km: 50,
           ...resto de datos
         }
          │
      ┌───┴───┐
      │       │
  200 OK   409 Conflict
      │       │
      ▼       ▼
   Paso 6   Paso 7
   (Éxito)  (Conflicto)
```

### 5. Error de Conexión

```
❌ Sin conexión o timeout
  │
  ▼
Mostrar mensaje:
"❌ No se pudo guardar por falta de conexión.
 Tus datos están guardados localmente.
 
 ¿Qué deseas hacer?"
 
 [🔄 Reintentar Ahora]  [⏰ Enviar Después]
  │                      │
  ▼                      ▼
Volver al paso 4    Mantener en AsyncStorage
                    (se reintentará al volver
                     a abrir la app)
```

### 6. Éxito

```
✅ Backend responde 200 OK
{
  id: "20260121-001-030-01-086-050-004",
  numero_situacion: "SIT-2026-0234",
  situacion_id: 234
}
  │
  ▼
1. Subir multimedia (si hay)
   - POST /api/situaciones/234/multimedia
   - Cada foto y video por separado
  │
  ▼
2. Limpiar AsyncStorage
   - Eliminar 'situacion_pendiente'
  │
  ▼
3. Fotos/videos locales se mantienen
   (no se eliminan, son del teléfono)
  │
  ▼
4. Mostrar mensaje:
   "✅ Situación guardada exitosamente
    Número: SIT-2026-0234"
  │
  ▼
5. Regresar a pantalla principal
```

### 7. Conflicto (409)

```
⚠️ Backend responde 409 Conflict
{
  error: "DUPLICATE_SITUACION",
  codigo_situacion: "20260121-001-030-01-086-050-004",
  situacion_existente: {
    id: 234,
    numero: "SIT-2026-0234",
    ...datos del servidor
  },
  diferencias: [
    { campo: "km", local: 50, servidor: 52 },
    { campo: "sentido", local: "Norte", servidor: "Sur" },
    { campo: "observaciones", local: "...", servidor: "..." }
  ],
  total_diferencias: 3
}
  │
  ▼
Mostrar UI de resolución:
"⚠️ Esta situación ya fue reportada
 
 Diferencias encontradas (3):
   • km: 50 (tuyo) vs 52 (servidor)
   • sentido: Norte (tuyo) vs Sur (servidor)
   • observaciones: Diferentes
 
 ¿Qué deseas hacer?"
 
 [📝 Actualizar Servidor]  [🗑️ Eliminar Local]  [⏸️ Esperar]
  │                         │                    │
  ▼                         ▼                    ▼
Paso 7.1               Paso 7.2              Paso 7.3
(Update)               (Delete)              (Wait)
```

#### 7.1 Actualizar Servidor

```
Usuario elige "Actualizar Servidor"
  │
  ▼
Confirmar:
"¿Seguro que quieres sobreescribir los datos del servidor
 con tus datos locales?"
 
 [Sí, Actualizar]  [Cancelar]
  │
  ▼
PUT /api/situaciones/234
{
  ...datos locales,
  razon_actualizacion: "Datos locales son más recientes"
}
  │
  ▼
✅ Actualizado
  │
  ▼
Limpiar AsyncStorage → Volver a inicio
```

#### 7.2 Eliminar Local

```
Usuario elige "Eliminar Local"
  │
  ▼
Confirmar:
"¿Seguro que quieres eliminar tu reporte?
 Los datos del servidor son correctos."
 
 [Sí, Eliminar]  [Cancelar]
  │
  ▼
1. Eliminar AsyncStorage
2. Eliminar fotos/videos locales
  │
  ▼
✅ Eliminado
  │
  ▼
Mensaje: "Datos locales eliminados"
  │
  ▼
Volver a inicio
```

#### 7.3 Esperar (Consultar COP)

```
Usuario elige "Esperar"
  │
  ▼
POST /api/situaciones/conflictos
{
  codigo_situacion: "20260121-001-030-01-086-050-004",
  datos_locales: {...},
  datos_servidor: {...},
  diferencias: [...]
}
  │
  ▼
Backend guarda en tabla: situacion_conflicto
  │
  ▼
Mostrar mensaje:
"⏸️ Conflicto registrado
 
 El COP revisará esta situación y te contactará.
 
 Mientras tanto, tus datos locales se mantienen guardados."
  │
  ▼
Mantener en AsyncStorage
  │
  ▼
Volver a inicio (BLOQUEADO hasta que COP resuelva)
```

---

## Manejo de Conflictos

### Tipos de Conflictos

#### 1. Duplicado Exacto

```
Situación A y B tienen:
  - Mismo ID
  - Mismos datos
  
→ Es un reintento del mismo reporte
→ Backend responde: 200 OK (idempotencia)
→ No mostrar error al usuario
```

#### 2. Mismo ID, Datos Diferentes

```
Situación A y B tienen:
  - Mismo ID
  - Datos diferentes (ej: km 50 vs km 52)
  
→ Mostrar UI de resolución (Paso 7)
→ Opciones: Update | Delete | Wait
```

#### 3. Múltiples Tripulantes Reportando Simultáneamente

**Escenario común:**
```
Unidad 030 tiene 3 tripulantes:
  - Comandante (usuario 17000)
  - Piloto (usuario 17001)  
  - Asistente (usuario 17002)

Todos tienen la app instalada en sus teléfonos.
Todos pueden reportar situaciones de la Unidad 030.

14:30 - Comandante abre formulario PATRULLAJE
        → Backend responde: num_situacion_hoy = 4
        → Genera ID: 20260121-001-030-01-086-050-004
        → Comienza a llenar formulario

14:31 - Piloto abre formulario ASISTENCIA (sin saber que Comandante está llenando PATRULLAJE)
        → Backend responde: num_situacion_hoy = 4 (todavía no se guardó el PATRULLAJE)
        → Genera ID: 20260121-001-030-70-086-050-004
        → Comienza a llenar formulario

14:35 - Piloto termina primero y presiona "Guardar"
        → POST /api/situaciones con ID ...004
        → ✅ Guardado exitosamente (es el primero)
        → num_situacion_hoy = 4 ahora está OCUPADO

14:37 - Comandante termina y presiona "Guardar"  
        → POST /api/situaciones con ID ...004
        → ⚠️ 409 Conflict: Número 4 ya usado por ASISTENCIA
```

**Resolución del conflicto:**
```
Opción A - Backend reasigna número automáticamente:
  → Backend detecta que num = 4 ya existe
  → Asigna siguiente disponible: num = 5
  → Genera nuevo ID: 20260121-001-030-01-086-050-005
  → Guarda PATRULLAJE con número 5
  → Responde: 200 OK con nuevo ID
  → ✅ Ambos reportes guardados, orden preservado

Opción B - Mostrar conflicto al usuario:
  → Backend responde 409
  → Móvil muestra: "Otro tripulante ya usó el número 4"
  → Opciones:
      [Usar Número 5] - Acepta el siguiente número
      [Ver Qué se Guardó] - Muestra la ASISTENCIA que se guardó primero
      [Esperar] - Consultar con el equipo
```

**Caso más complejo - Mismo tipo de situación:**
```
14:30 - Comandante reporta ASISTENCIA CA-9 Km 50
        → ID: 20260121-001-030-70-086-050-004

14:31 - Piloto reporta ASISTENCIA CA-9 Km 50 (¡misma asistencia!)
        → ID: 20260121-001-030-70-086-050-004  (¡mismo ID!)
        → ⚠️ 409 Conflict: Ya existe

Aquí sí son datos duplicados:
  → Mostrar UI de resolución
  → Comparar diferencias
  → Comandante y Piloto deciden cuál datos usar
  → O llaman al COP para fusionar información
```

#### 4. Número de Situación Usado por Otro Tripulante

```
Local intenta usar num_situacion_hoy = 4
Pero servidor ya tiene situacion con num = 4 (de otro tripulante)

→ Otro tripulante se "coló" en la fila
→ Backend asigna siguiente número disponible (5)
→ Genera nuevo ID: ...004 → ...005
→ Guarda exitosamente
→ Responde: 200 OK con nuevo ID
```

**Nota importante:** 
- Dos UNIDADES diferentes (ej: 030 y 045) pueden tener situación #4 el mismo día sin conflicto
- El conflicto solo ocurre cuando MISMA UNIDAD intenta usar mismo número dos veces

### Tabla de Conflictos (COP)

```sql
CREATE TABLE situacion_conflicto (
  id SERIAL PRIMARY KEY,
  codigo_situacion TEXT NOT NULL,
  situacion_existente_id INTEGER REFERENCES situacion(id),
  datos_locales JSONB NOT NULL,
  datos_servidor JSONB NOT NULL,
  diferencias TEXT[],
  usuario_reporta INTEGER REFERENCES usuario(id),
  estado TEXT DEFAULT 'PENDIENTE', -- PENDIENTE, RESUELTO_UPDATE, RESUELTO_DELETE, DESCARTADO
  resuelto_por INTEGER REFERENCES usuario(id),
  decision_cop TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_conflicto_estado ON situacion_conflicto(estado);
CREATE INDEX idx_conflicto_usuario ON situacion_conflicto(usuario_reporta);
```

---

## Estados y Validaciones

### Estados del Draft (Móvil)

```typescript
type DraftStatus = 
  | 'DRAFT'       // Llenando formulario
  | 'PENDIENTE'   // Completo, esperando conexión
  | 'ENVIANDO'    // En proceso de envío
  | 'CONFLICTO'   // 409, esperando decisión del usuario
  | 'WAIT_COP';   // Esperando resolución del COP
```

### Estados de la Situación (Backend)

```typescript
type SituacionEstado =
  | 'ACTIVA'      // Situación en curso
  | 'CERRADA'     // Situación resuelta
  | 'CANCELADA';  // Situación cancelada/descartada
```

### Validaciones Obligatorias

#### Antes de Enviar

```typescript
// Todos los tipos de situación
✅ tipo_situacion_id
✅ unidad_id
✅ ruta_id
✅ km
✅ sentido
✅ latitud, longitud

// Solo HECHO_TRANSITO, ASISTENCIA, EMERGENCIA
✅ 3 fotos + 1 video

// Validación de fecha
✅ fecha === hoy (no permitir backdating)
```

#### Validaciones Backend

```typescript
✅ ID único (no existe en tabla situacion)
✅ Número de situación del día válido
✅ Unidad existe y está activa
✅ Ruta existe
✅ KM dentro del rango de la ruta
✅ Usuario tiene permisos para crear situaciones
```

---

## Rol del COP

### Panel de Conflictos

```
┌─────────────────────────────────────────────────────┐
│ 🚨 Conflictos Pendientes (2)                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ID: 20260121-001-030-70-086-050-004                 │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Unidad 030 | ASISTENCIA | CA-9 N Km 50        │ │
│ │ Reportado por: 17000 (Lisardo García)          │ │
│ │ Ya existe: SIT-2026-0234                        │ │
│ │                                                 │ │
│ │ Diferencias (3):                                │ │
│ │   • km: 50 (local) vs 52 (servidor)            │ │
│ │   • sentido: Norte vs Sur                       │ │
│ │   • observaciones: Diferentes                   │ │
│ │                                                 │ │
│ │ [Ver Detalles] [Usar Local] [Usar Servidor]    │ │
│ │ [Fusionar Manualmente]                          │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ID: 20260121-001-045-01-090-125-002                 │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Unidad 045 | PATRULLAJE | CA-1 S Km 125       │ │
│ │ Reportado por: 17005 (Mario López)             │ │
│ │ Situación fuera de orden (#2 pero ya hay #3)   │ │
│ │                                                 │ │
│ │ [Asignar Nuevo Número] [Revisar]               │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Acciones del COP

1. **Usar Datos Locales**
   - Sobreescribe situación en servidor con datos del brigada
   - Notifica al brigada que se resolvió

2. **Usar Datos Servidor**
   - Descarta los datos locales del brigada
   - Notifica al brigada que elimine su draft

3. **Fusionar Manualmente**
   - COP edita situación existente tomando datos de ambos
   - Notifica al brigada

4. **Asignar Nuevo Número**
   - Cuando hubo desorden, asigna nuevo número secuencial
   - Guarda como nueva situación

---

## Implementación Técnica

### Endpoints Backend

```typescript
// 1. Reservar número de situación
GET /api/unidades/:id/reservar-numero
Response: {
  num_situacion_hoy: 4,
  fecha: "2026-01-21",
  sede_id: 1,
  valido_hasta: "2026-01-21T23:59:59Z"
}

// 2. Crear situación
POST /api/situaciones
Body: {
  id: "20260121-001-030-70-086-050-004",
  tipo_situacion_id: 70,
  sede_id: 1,
  unidad_id: 30,
  ruta_id: 86,
  km: 50,
  ...
}
Response:
  - 200 OK: Guardado exitoso
  - 409 Conflict: Duplicado detectado
  - 400 Bad Request: Datos inválidos

// 3. Validar ID antes de llenar formulario (opcional)
POST /api/situaciones/validar-id
Body: { id: "20260121-001-030-70-086-050-004" }
Response: { valido: true/false, razon: "..." }

// 4. Registrar conflicto
POST /api/situaciones/conflictos
Body: {
  codigo_situacion: "...",
  datos_locales: {...},
  datos_servidor: {...},
  diferencias: [...]
}

// 5. Subir multimedia
POST /api/situaciones/:id/multimedia
Body: FormData con foto o video
```

### Estructura AsyncStorage (Móvil)

```typescript
// Key: 'situacion_pendiente'
{
  id: "20260121-001-030-70-086-050-004",
  tipo_situacion_id: 70,
  tipo_situacion_nombre: "ASISTENCIA_VEHICULAR",
  sede_id: 1,
  unidad_id: 30,
  ruta_id: 86,
  km: 50,
  sentido: "Norte",
  latitud: 14.6349,
  longitud: -90.5069,
  observaciones: "...",
  num_situacion_hoy: 4,
  estado: "DRAFT", // DRAFT | PENDIENTE | ENVIANDO | CONFLICTO | WAIT_COP
  multimedia: [
    { tipo: 'FOTO', uri: 'file://...', orden: 1 },
    { tipo: 'FOTO', uri: 'file://...', orden: 2 },
    { tipo: 'FOTO', uri: 'file://...', orden: 3 },
    { tipo: 'VIDEO', uri: 'file://...' }
  ],
  created_at: "2026-01-21T14:30:00Z",
  updated_at: "2026-01-21T14:35:00Z"
}
```

### Componente Principal (Móvil)

```typescript
// screens/situaciones/NuevaSituacionScreen.tsx

async function onSubmit(data) {
  try {
    // 1. Validar
    if (!validarFormulario(data)) return;
    
    // 2. Mostrar loading
    setGuardando(true);
    
    // 3. Generar ID si no existe
    const id = data.id || await generarId(data);
    
    // 4. Intentar enviar
    const response = await api.post('/situaciones', { id, ...data });
    
    if (response.status === 200) {
      // Éxito
      await subirMultimedia(id, data.multimedia);
      await AsyncStorage.removeItem('situacion_pendiente');
      mostrarExito("Situación guardada: " + response.data.numero_situacion);
      navigation.goBack();
      
    } else if (response.status === 409) {
      // Conflicto
      const conflicto = response.data;
      mostrarDialogoConflicto(conflicto);
    }
    
  } catch (error) {
    if (error.message === 'Network request failed') {
      // Sin conexión - guardar pendiente
      await AsyncStorage.setItem('situacion_pendiente', JSON.stringify({
        ...data,
        estado: 'PENDIENTE'
      }));
      mostrarErrorConexion();
    } else {
      mostrarError(error.message);
    }
  } finally {
    setGuardando(false);
  }
}
```

---

## Resumen

### Decisiones Clave

1. ✅ **UN solo draft** - Simplicidad y seguridad
2. ✅ **ID determinista** - Con sede + número del día
3. ✅ **Número secuencial diario** - No timestamp
4. ✅ **Bloqueo total** - No se puede crear otra situación con una pendiente
5. ✅ **COP como árbitro** - Resuelve conflictos complejos
6. ✅ **UX transparente** - Estados claros en todo momento

### Beneficios

- ✅ Funciona sin internet
- ✅ No se pierden datos
- ✅ Detecta duplicados automáticamente
- ✅ Simple de usar para brigadas
- ✅ Fácil de debuggear cuando hay problemas
- ✅ COP tiene control total

### Próximos Pasos

1. Implementar endpoints backend
2. Migrar pantallas de situaciones al nuevo sistema
3. Probar exhaustivamente con casos de conflicto
4. Capacitar a brigadas y COP
5. Monitorear en producción

---

**Fin del documento**
