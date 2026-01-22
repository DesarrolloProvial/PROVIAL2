# Implementacion Sistema Offline-First para Situaciones

## Resumen de la Implementacion

**Fecha:** 21 de enero de 2026
**Basado en:** OFFLINE_FIRST_SITUACIONES.md, AUDITORIA_SITUACIONES.md, OFFLINE_FIRST_SECCIONES_ADICIONALES.md

---

## Arquitectura Implementada

### Principios Clave

1. **UN solo draft a la vez** - Simplicidad sobre flexibilidad
2. **ID determinista** - `YYYYMMDD-SEDE-UNIDAD-TIPO-RUTA-KM-NUM_SALIDA`
3. **AsyncStorage simple** - Una sola key `situacion_pendiente`
4. **Conflictos al COP** - Sin resolucion automatica

---

## Archivos Creados/Modificados

### Mobile (React Native)

#### Nuevos Archivos

| Archivo | Descripcion |
|---------|-------------|
| `src/services/draftStorage.ts` | Servicio de almacenamiento con AsyncStorage |
| `src/utils/situacionId.ts` | Generador de ID determinista |
| `src/hooks/useDraftSituacion.ts` | Hook para manejo de drafts |

#### Archivos Eliminados (Sistema Anterior Complejo)

- `src/services/database.ts` - SQLite innecesario
- `src/hooks/useSyncQueue.ts` - Cola compleja eliminada
- `src/services/cloudinaryUpload.ts` - Se integrara diferente

### Backend (Express + PostgreSQL)

#### Nuevos Archivos

| Archivo | Descripcion |
|---------|-------------|
| `migrations/106_create_situacion_conflicto.sql` | Tabla de conflictos para COP |
| `src/controllers/conflictos.controller.ts` | Controlador de conflictos |

#### Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/controllers/unidades.controller.ts` | Agregado `reservarNumeroSalida()` |
| `src/routes/unidades.routes.ts` | Agregada ruta `/reservar-numero-salida` |
| `src/controllers/situacion.controller.ts` | Agregada deteccion de duplicados con `codigo_situacion` |
| `src/models/situacion.model.ts` | Agregado campo `codigo_situacion` y metodo `findByCodigoSituacion()` |
| `src/routes/situaciones.routes.ts` | Agregadas rutas de conflictos |

---

## Estructura de Datos

### Draft en AsyncStorage (Mobile)

```typescript
// Key: 'situacion_pendiente'
interface DraftSituacion {
  id: string;                    // ID determinista: YYYYMMDD-SEDE-UNIDAD-TIPO-RUTA-KM-NUM
  num_situacion_salida: number;  // Numero secuencial de esta salida
  fecha: string;
  sede_id: number;
  unidad_id: number;
  unidad_codigo: string;
  salida_id: number;
  tipo_situacion: TipoSituacion;
  tipo_situacion_id: number;
  ruta_id: number;
  km: number;
  sentido: string;
  latitud: number;
  longitud: number;
  descripcion?: string;
  observaciones?: string;
  multimedia: MultimediaRef[];
  estado: 'DRAFT' | 'PENDIENTE' | 'ENVIANDO' | 'CONFLICTO' | 'WAIT_COP';
  created_at: string;
  updated_at: string;
  conflicto?: {
    datos_servidor: any;
    diferencias: Array<{campo: string; local: any; servidor: any}>;
    conflicto_id?: number;
  };
}
```

### ID Determinista

```
Formato: YYYYMMDD-SEDE-UNIDAD-TIPO-RUTA-KM-NUM_SALIDA

Ejemplo: 20260121-1-030-70-86-50-4

Donde:
  YYYYMMDD = Fecha (8 digitos)
  SEDE     = ID de sede (sin padding)
  UNIDAD   = Codigo de unidad (tal cual: 030, 1131, M007)
  TIPO     = ID tipo situacion (sin padding)
  RUTA     = ID de ruta (sin padding)
  KM       = Kilometro (parte entera)
  NUM      = Numero de situacion en esta SALIDA
```

---

## Endpoints Implementados

### Reservar Numero de Situacion

```
GET /api/unidades/:codigo/reservar-numero-salida

Response:
{
  num_situacion_salida: 4,
  fecha: "2026-01-21",
  sede_id: 1,
  unidad_id: 30,
  unidad_codigo: "030",
  salida_id: 123,
  valido_hasta: "2026-01-21T23:59:59Z"
}
```

### Crear Situacion (con deteccion de conflictos)

```
POST /api/situaciones

Body:
{
  id: "20260121-1-030-70-86-50-4",  // ID determinista
  tipo_situacion: "ASISTENCIA_VEHICULAR",
  // ... otros campos
}

Respuestas:
- 200 OK: Creada exitosamente (o idempotente si ya existe con mismos datos)
- 409 Conflict: Ya existe con datos diferentes
```

### Conflictos

```
GET  /api/situaciones/conflictos              - Listar conflictos (COP)
GET  /api/situaciones/conflictos/mis-conflictos - Mis conflictos (brigada)
POST /api/situaciones/conflictos              - Registrar conflicto
GET  /api/situaciones/conflictos/:id          - Obtener conflicto
PATCH /api/situaciones/conflictos/:id/resolver - Resolver conflicto (COP)
```

---

## Flujo de Uso

### 1. Abrir Formulario de Nueva Situacion

```
Usuario toca "Nueva Situacion"
  |
  v
¿Hay draft pendiente en AsyncStorage?
  |-- SI: BLOQUEO
  |     "Tienes ASISTENCIA sin enviar desde hace 15 min"
  |     [Enviar Ahora] [Eliminar] [Cancelar]
  |
  |-- NO: Continuar
        |
        v
      GET /api/unidades/030/reservar-numero-salida
        |
        v
      Generar ID: 20260121-1-030-70-86-50-4
        |
        v
      Guardar draft en AsyncStorage
        |
        v
      Abrir formulario
```

### 2. Guardar Situacion

```
Usuario presiona "Guardar"
  |
  v
POST /api/situaciones con id = "20260121-1-030-70-86-50-4"
  |
  |-- 200 OK: Exito!
  |     Limpiar AsyncStorage
  |     Mostrar mensaje de exito
  |
  |-- 409 Conflict: Mostrar diferencias
  |     [Actualizar Servidor] [Eliminar Local] [Esperar COP]
  |
  |-- Error de red:
        Mantener en AsyncStorage
        "Sin conexion. Draft guardado localmente."
```

### 3. Resolver Conflicto

```
Usuario elige "Esperar COP"
  |
  v
POST /api/situaciones/conflictos
  |
  v
COP recibe notificacion
  |
  v
COP revisa diferencias
  |
  v
COP elige: [Usar Local] o [Usar Servidor] o [Descartar]
  |
  v
Brigada recibe notificacion de resolucion
```

---

## Migracion de Base de Datos

Ejecutar en produccion:

```sql
-- Ejecutar migration 106
\i backend/migrations/106_create_situacion_conflicto.sql
```

Esta migracion:
1. Crea tabla `situacion_conflicto`
2. Agrega columna `codigo_situacion` a tabla `situacion`
3. Crea indice unico en `codigo_situacion`

---

## Uso del Hook en Componentes

```typescript
import { useDraftSituacion } from '../hooks/useDraftSituacion';

function NuevaSituacionScreen() {
  const {
    draft,
    loading,
    saving,
    sending,
    hasPendiente,
    isOnline,
    canCreateNew,
    crearDraft,
    actualizarDraft,
    enviarDraft,
    eliminarDraft,
    // Conflictos
    resolverConflictoUsarLocal,
    resolverConflictoUsarServidor,
    resolverConflictoEsperar
  } = useDraftSituacion();

  // Verificar antes de crear
  const handleNueva = async () => {
    const check = await canCreateNew();
    if (!check.allowed) {
      Alert.alert('Draft Pendiente', check.reason);
      return;
    }

    const draft = await crearDraft({
      tipo_situacion: 'ASISTENCIA_VEHICULAR',
      tipo_situacion_id: 70,
      unidad_codigo: '030',
      ruta_id: 86,
      km: 50,
      sentido: 'Norte',
      latitud: 14.6349,
      longitud: -90.5069
    });
  };

  // Guardar cambios (auto-save con debounce)
  const handleChange = (field, value) => {
    actualizarDraft({ [field]: value });
  };

  // Enviar
  const handleSubmit = async () => {
    const result = await enviarDraft();

    if (result.success) {
      Alert.alert('Exito', `Situacion guardada: ${result.numero_situacion}`);
      navigation.goBack();
    } else if (result.conflicto) {
      // Mostrar UI de conflicto
      mostrarDialogoConflicto(result.conflicto);
    } else {
      Alert.alert('Error', result.error);
    }
  };
}
```

---

## Proximos Pasos

1. [x] Crear servicio draftStorage.ts
2. [x] Crear generador de ID situacionId.ts
3. [x] Crear hook useDraftSituacion.ts
4. [x] Crear endpoint reservar-numero-salida
5. [x] Crear tabla situacion_conflicto
6. [x] Modificar POST /api/situaciones para detectar duplicados
7. [ ] Integrar hook en pantallas de situaciones (IncidenteScreen, AsistenciaScreen, etc.)
8. [ ] Implementar UI de bloqueo cuando hay draft pendiente
9. [ ] Implementar UI de resolucion de conflictos
10. [ ] Panel de conflictos para COP en web
11. [ ] Pruebas de integracion

---

## Notas Importantes

### Sin Reasignacion Automatica de Numeros

Si un brigada intenta usar un numero que ya fue usado, **NO se reasigna automaticamente**. Esto fuerza comunicacion entre tripulantes y evita ocultar problemas.

### Sin Cola de Sincronizacion Compleja

El sistema anterior tenia SQLite con 3 tablas y una cola de sincronizacion con timers. Esto fue eliminado por:
- Complejidad innecesaria
- Dificil de debuggear
- No detectaba duplicados reales

### Auditoria

Todos los cambios a situaciones se registran en `auditoria_log` (tabla existente). Ver AUDITORIA_SITUACIONES.md para detalles.

---

**Fin del documento**
