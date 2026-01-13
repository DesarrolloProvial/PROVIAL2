# Diccionario de Datos PROVIAL - Núcleo Operativo

**Generado:** 2026-01-12  
**Versión BD:** PostgreSQL 17.7  
**Total:** 103 tablas, 39 vistas, 7 materializadas

---

## Índice

1. [Resumen del Esquema](#resumen-del-esquema)
2. [Tablas Núcleo](#tablas-nucleo)
3. [Redundancias Detectadas](#redundancias-detectadas)
4. [Catálogos](#catalogos)
5. [Recomendaciones de Limpieza](#recomendaciones-de-limpieza)
6. [Módulo: Hechos de tránsito (Incidentes) + Accidentología](#modulo-hechos-de-transito-incidentes-accidentologia)
7. [Nomenclatura de Sedes (para Boletas)](#nomenclatura-de-sedes-para-boletas)
8. [Módulo: Accidentología 🚗💥](#modulo-accidentologia)
9. [Vistas (39 total)](#vistas-39-total)
10. [Vistas Materializadas (7 total)](#vistas-materializadas-7-total)
11. [Funciones (77 total)](#funciones-77-total)
12. [Triggers (49 total)](#triggers-49-total)
13. [ENUMs (10 total)](#enums-10-total)
14. [Próximos Pasos](#proximos-pasos)

---

## 1. Resumen del Esquema
### Organización por Módulos

| Módulo | Tablas Principales | Propósito |
|--------|-------------------|-----------|
| **Operación** | `turno`, `asignacion_unidad`, `unidad`, `salida_unidad`, `actividad_unidad` | Planificación y ejecución diaria |
| **Hechos Viales** | `incidente`, `situacion`, `detalle_situacion` | Registro de incidentes/hechos |
| **Vehículos** | `vehiculo`, `piloto`, `incidente_vehiculo`, `tarjeta_circulacion` | Datos de vehículos involucrados |
| **Accidentología** | `hoja_accidentologia`, `vehiculo_accidente`, `persona_accidente` | Peritaje formal |
| **Persistentes** | `situacion_persistente`, `asignacion_situacion_persistente` | Eventos prolongados |
| **Alertas** | `alerta`, `notificacion`, `configuracion_alerta` | Sistema de alertas |
| **Seguridad** | `usuario`, `rol`, `permiso`, `usuario_rol` | RBAC y autenticación |
| **Catálogos** | `departamento`, `municipio`, `ruta`, `sede`, `tipo_*` | Datos maestros |
| **Auditoría** | `auditoria_log`, `bitacora_historica` | Trazabilidad |

---


## 2. Tablas Núcleo
### 2.1 `sede`

**Propósito:** Sedes operativas de PROVIAL (9 sedes).

| Columna | Tipo | Nullable | Descripción | Observación |
|---------|------|----------|-------------|-------------|
| `id` | SERIAL | NO | PK | |
| `nombre` | VARCHAR(100) | NO | Nombre de sede | Ej: "Sede Central" |
| `codigo` | VARCHAR(10) | NO | Código corto | Ej: "SC" |
| `direccion` | TEXT | SI | Dirección física | |
| `telefono` | VARCHAR(20) | SI | Teléfono de contacto | |
| `departamento_id` | INT | SI | FK → departamento | ✅ Correcto |
| `municipio_id` | INT | SI | FK → municipio | ✅ Correcto |
| `departamento` | VARCHAR | SI | Nombre depto (texto) | ⚠️ REDUNDANTE |
| `municipio` | VARCHAR | SI | Nombre muni (texto) | ⚠️ REDUNDANTE |
| `activa` | BOOLEAN | NO | Si está operativa | DEFAULT true |
| `es_sede_central` | BOOLEAN | NO | Flag sede principal | Solo 1 debería ser TRUE |
| `latitud/longitud` | DECIMAL | SI | Coordenadas GPS | |

**Relaciones:**
- `sede` → `departamento` (FK)
- `sede` → `municipio` (FK)
- `sede` ← `unidad` (1:N)
- `sede` ← `usuario` (1:N)
- `sede` ← `turno` (1:N)

**⚠️ Redundancia:** Campos `departamento` y `municipio` (texto) duplican la info de los FK. Usar solo FK + JOIN.

---

### 2.2 `unidad`

**Propósito:** Vehículos/unidades operativas de PROVIAL.

| Columna | Tipo | Nullable | Descripción | Observación |
|---------|------|----------|-------------|-------------|
| `id` | SERIAL | NO | PK | |
| `codigo` | VARCHAR(20) | NO | Código unidad | Ej: "U-101" |
| `placa` | VARCHAR(15) | SI | Placa del vehículo | |
| `tipo_unidad` | VARCHAR(30) | NO | PICK_UP, CAMION, etc. | CHECK constraint |
| `marca` | VARCHAR(50) | SI | Marca vehículo | |
| `modelo` | VARCHAR(50) | SI | Modelo vehículo | |
| `anio` | INT | SI | Año fabricación | |
| `color` | VARCHAR(30) | SI | Color unidad | |
| `sede_id` | INT | NO | FK → sede | Sede a la que pertenece |
| `combustible_actual` | DECIMAL(5,2) | SI | Nivel combustible actual | |
| `odometro_actual` | DECIMAL(10,2) | SI | Km actuales | |
| `estado` | VARCHAR(20) | NO | ACTIVA, MANTENIMIENTO, etc. | |
| `custom_fields` | JSONB | SI | Campos personalizados | Flexible |
| `activa` | BOOLEAN | NO | Si está en operación | DEFAULT true |

**Relaciones:**
- `unidad` → `sede` (FK)
- `unidad` ← `asignacion_unidad` (1:N)
- `unidad` ← `salida_unidad` (1:N)
- `unidad` ← `situacion` (1:N)
- `unidad` ← `brigada_unidad` (1:N)

---

### 2.3 `turno`

**Propósito:** Turnos de trabajo por día/sede.

| Columna | Tipo | Nullable | Descripción | Observación |
|---------|------|----------|-------------|-------------|
| `id` | SERIAL | NO | PK | |
| `fecha` | DATE | NO | Fecha del turno | |
| `fecha_fin` | DATE | SI | Fecha fin (multi-día) | |
| `estado` | VARCHAR(20) | NO | PLANIFICADO, ACTIVO, CERRADO | |
| `sede_id` | INT | NO | FK → sede | |
| `publicado` | BOOLEAN | NO | Si está visible para brigadas | DEFAULT false |
| `fecha_publicacion` | TIMESTAMPTZ | SI | Cuándo se publicó | |
| `creado_por` | INT | NO | FK → usuario | |
| `aprobado_por` | INT | SI | FK → usuario | |
| `observaciones` | TEXT | SI | Notas del turno | |

**Relaciones:**
- `turno` → `sede` (FK)
- `turno` → `usuario` (creado_por, aprobado_por)
- `turno` ← `asignacion_unidad` (1:N) ← **RELACIÓN CORE**

**Flujo:** `turno` → `asignacion_unidad` → operación real

---

### 2.4 `asignacion_unidad` ⭐ TABLA REY

**Propósito:** Asigna unidad + ruta + tripulación para un turno. Es el núcleo operativo.

| Columna | Tipo | Nullable | Descripción | Observación |
|---------|------|----------|-------------|-------------|
| `id` | SERIAL | NO | PK | |
| `turno_id` | INT | NO | FK → turno | |
| `unidad_id` | INT | NO | FK → unidad | |
| `ruta_id` | INT | SI | FK → ruta | Ruta asignada |
| `ruta_activa_id` | INT | SI | FK → ruta | Ruta actual (puede cambiar) |
| `situacion_fija_id` | INT | SI | FK → situacion_fija | Si es asig. fija |
| `km_inicio` | DECIMAL(6,2) | SI | Km ruta inicio | |
| `km_final` | DECIMAL(6,2) | SI | Km ruta fin | |
| `sentido` | VARCHAR(30) | SI | NORTE, SUR, etc. | |
| `hora_salida` | TIME | SI | Hora programada salida | |
| `hora_entrada_estimada` | TIME | SI | Hora estimada regreso | |
| `hora_salida_real` | TIMESTAMPTZ | SI | Hora real de salida | |
| `hora_entrada_real` | TIMESTAMPTZ | SI | Hora real de entrada | |
| `km_recorridos` | DECIMAL(10,2) | SI | Km totales recorridos | |
| `acciones` | TEXT[] | SI | Acciones programadas | Array de strings |
| `acciones_formato` | TEXT | SI | Formato legible | |
| `es_reaccion` | BOOLEAN | NO | Si es unidad de reacción | DEFAULT false |
| `dia_cerrado` | BOOLEAN | NO | Si el día cerró | DEFAULT false |

**Relaciones:**
- `asignacion_unidad` → `turno` (FK)
- `asignacion_unidad` → `unidad` (FK)
- `asignacion_unidad` → `ruta` (FK x2: asignada y activa)
- `asignacion_unidad` ← `tripulacion_turno` (1:N)
- `asignacion_unidad` ← `situacion` (1:N)
- `asignacion_unidad` ← `incidente` (1:N)
- `asignacion_unidad` ← `reporte_horario` (1:N)

---

### 2.5 `salida_unidad`

**Propósito:** Registro de salida de unidad (puede durar horas o días).

| Columna | Tipo | Nullable | Descripción | Observación |
|---------|------|----------|-------------|-------------|
| `id` | SERIAL | NO | PK | |
| `unidad_id` | INT | NO | FK → unidad | |
| `fecha_hora_salida` | TIMESTAMPTZ | NO | Momento de salida | |
| `fecha_hora_regreso` | TIMESTAMPTZ | SI | Momento de regreso | NULL = en curso |
| `estado` | VARCHAR(30) | NO | EN_SALIDA, FINALIZADA, CANCELADA | |
| `ruta_inicial_id` | INT | SI | FK → ruta | Ruta inicial |
| `km_inicial` | DECIMAL(10,2) | SI | Odómetro al salir | |
| `km_final` | INT | SI | Odómetro al regresar | |
| `combustible_inicial/final` | DECIMAL(5,2) | SI | Nivel combustible | |
| `tripulacion` | JSONB | SI | Snapshot de quiénes salieron | |
| `sede_origen_id` | INT | SI | FK → sede | Sede de salida |
| `inspeccion_360_id` | INT | SI | FK → inspeccion_360 | Inspección aprobada |

**Relaciones:**
- `salida_unidad` → `unidad` (FK)
- `salida_unidad` → `ruta` (FK)
- `salida_unidad` → `sede` (FK)
- `salida_unidad` ← `situacion` (1:N)
- `salida_unidad` ← `ingreso_sede` (1:N)

---

### 2.6 `ruta`

**Propósito:** Rutas/tramos carreteros que PROVIAL patrulla.

| Columna | Tipo | Nullable | Descripción | Observación |
|---------|------|----------|-------------|-------------|
| `id` | SERIAL | NO | PK | |
| `codigo` | VARCHAR(20) | NO | Código ruta | Ej: "CA-1", "RN-14" |
| `nombre` | VARCHAR(150) | NO | Nombre completo | |
| `descripcion` | TEXT | SI | Descripción | |
| `km_inicio` | DECIMAL(6,2) | SI | Km inicial | |
| `km_fin` | DECIMAL(6,2) | SI | Km final | |
| `longitud_total` | DECIMAL(10,2) | SI | Longitud en km | |
| `tipo_ruta` | VARCHAR(30) | SI | CARRETERA, AUTOPISTA, etc. | |
| `activa` | BOOLEAN | NO | Si está en operación | DEFAULT true |

---

### 2.7 `incidente` ⭐ TABLA CORE HECHOS

**Propósito:** Tabla principal de incidentes/hechos de tránsito.

| Columna | Tipo | Nullable | Descripción | Observación |
|---------|------|----------|-------------|-------------|
| `id` | BIGSERIAL | NO | PK | |
| `uuid` | UUID | NO | Identificador único | |
| `numero_reporte` | VARCHAR(50) | SI | Número legible | INC-2026-0001 |
| `origen` | VARCHAR(30) | NO | BRIGADA, USUARIO_PUBLICO, CENTRO_CONTROL | |
| `estado` | VARCHAR(30) | NO | REPORTADO, EN_ATENCION, REGULACION, CERRADO, NO_ATENDIDO | |
| `tipo_hecho_id` | INT | NO | FK → tipo_hecho | |
| `subtipo_hecho_id` | INT | SI | FK → subtipo_hecho | |
| `ruta_id` | INT | NO | FK → ruta | |
| `km` | DECIMAL(6,2) | NO | Kilómetro del hecho | |
| `sentido` | VARCHAR(30) | SI | Dirección | |
| `latitud/longitud` | DECIMAL | SI | Coordenadas GPS | |
| `departamento_id` | INT | SI | FK → departamento | ✅ Donde ocurrió |
| `municipio_id` | INT | SI | FK → municipio | ✅ Donde ocurrió |
| `unidad_id` | INT | SI | FK → unidad | Unidad que atendió |
| `asignacion_id` | INT | SI | FK → asignacion_unidad | |
| `brigada_id` | INT | SI | FK → brigada | ⚠️ Debería ser usuario_id |
| `fecha_hora_aviso` | TIMESTAMPTZ | NO | Hora del aviso | |
| `fecha_hora_asignacion` | TIMESTAMPTZ | SI | Hora de asignación | |
| `fecha_hora_llegada` | TIMESTAMPTZ | SI | Hora de llegada | |
| `fecha_hora_estabilizacion` | TIMESTAMPTZ | SI | Hora de control | |
| `fecha_hora_finalizacion` | TIMESTAMPTZ | SI | Hora de cierre | |
| `hay_heridos/fallecidos` | BOOLEAN | NO | Flags de víctimas | |
| `cantidad_heridos/fallecidos` | INT | NO | Conteos | |
| `requiere_bomberos/pnc/ambulancia` | BOOLEAN | NO | Recursos solicitados | |
| `condiciones_climaticas` | VARCHAR(50) | SI | Clima | |
| `tipo_pavimento` | VARCHAR(50) | SI | Tipo superficie | |
| `iluminacion` | VARCHAR(50) | SI | Condición luz | |
| `causa_probable` | TEXT | SI | Causa (texto libre) | |
| `obstruccion_detalle` | JSONB | SI | Detalle obstrucción v1 | ⚠️ Duplicado |
| `obstruccion_data` | JSONB | SI | Detalle obstrucción v2 | ⚠️ Duplicado |
| `creado_por` | INT | NO | FK → usuario | |

**Relaciones:**
- `incidente` → `tipo_hecho`, `subtipo_hecho`
- `incidente` → `ruta`, `departamento`, `municipio`
- `incidente` → `unidad`, `asignacion_unidad`
- `incidente` ← `incidente_vehiculo` (1:N)
- `incidente` ← `detalle_situacion` (1:N via situacion)
- `incidente` ← `hoja_accidentologia` (1:1 via situacion)

**⚠️ Redundancia:** `obstruccion_detalle` vs `obstruccion_data` - Usar solo uno.

---

### 2.8 `situacion`

**Propósito:** Situación operativa (salida, seguimiento de unidad).

| Columna | Tipo | Nullable | Descripción | Observación |
|---------|------|----------|-------------|-------------|
| `id` | BIGSERIAL | NO | PK | |
| `uuid` | UUID | NO | Identificador único | |
| `numero_situacion` | VARCHAR(50) | SI | Número legible | |
| `tipo_situacion` | VARCHAR(50) | NO | Tipo de situación | |
| `estado` | VARCHAR(20) | NO | ACTIVA, CERRADA | |
| `salida_unidad_id` | INT | SI | FK → salida_unidad | |
| `asignacion_id` | INT | SI | FK → asignacion_unidad | |
| `unidad_id` | INT | NO | FK → unidad | |
| `turno_id` | INT | SI | FK → turno | |
| `ruta_id` | INT | SI | FK → ruta | |
| `km` | DECIMAL(6,2) | SI | Kilómetro | |
| `latitud/longitud` | DECIMAL | SI | Coordenadas GPS | |
| `combustible` | DECIMAL(5,2) | SI | Nivel combustible | |
| `kilometraje_unidad` | DECIMAL(8,1) | SI | Odómetro reportado | |
| `descripcion` | TEXT | SI | Descripción | |
| `creado_por` | INT | NO | FK → usuario | |

**Relaciones:**
- `situacion` → `salida_unidad`, `unidad`, `turno`, `ruta`
- `situacion` ← `detalle_situacion` (1:N)
- `situacion` ← `hoja_accidentologia` (1:1)
- `situacion` ← `evento_situacion` (1:N)

---

### 2.9 `usuario`

**Propósito:** Usuarios del sistema (brigadas, COP, admin, etc.).

| Columna | Tipo | Nullable | Descripción | Observación |
|---------|------|----------|-------------|-------------|
| `id` | SERIAL | NO | PK | |
| `uuid` | UUID | NO | Identificador único | |
| `username` | VARCHAR(50) | NO | Nombre de usuario | UNIQUE |
| `password_hash` | VARCHAR(255) | NO | Hash bcrypt | |
| `nombre_completo` | VARCHAR(150) | NO | Nombre para mostrar | |
| `email` | VARCHAR(100) | SI | Correo electrónico | |
| `telefono` | VARCHAR(20) | SI | Teléfono | |
| `rol_id` | INT | NO | FK → rol | Rol principal |
| `sede_id` | INT | SI | FK → sede | NULL = acceso global |
| `chapa` | VARCHAR(20) | SI | Número de identificación | Para brigadas |
| `grupo` | SMALLINT | SI | Grupo 1 o 2 (turnos 8x8) | CHECK (0,1,2) |
| `rol_brigada` | VARCHAR(20) | SI | PILOTO, COPILOTO, ACOMPAÑANTE | |
| `sub_rol_cop_id` | INT | SI | FK → sub_rol_cop | Para COP |
| `genero` | VARCHAR(20) | SI | M/F | |
| `activo` | BOOLEAN | NO | Si puede acceder | DEFAULT true |
| `acceso_app_activo` | BOOLEAN | NO | Si puede usar app móvil | |
| `custom_fields` | JSONB | SI | Campos personalizados | |

**Relaciones:**
- `usuario` → `rol` (FK principal)
- `usuario` → `sede` (FK opcional)
- `usuario` ← `usuario_rol` (1:N para múltiples roles)
- `usuario` ← `tripulacion_turno` (1:N)
- `usuario` ← `brigada_unidad` (1:N)

---

### 2.10 `brigada` ⚠️ TABLA PROBLEMÁTICA

**Propósito:** Datos de brigadistas (¿duplica usuario?).

| Columna | Tipo | Nullable | Descripción | Observación |
|---------|------|----------|-------------|-------------|
| `id` | SERIAL | NO | PK | |
| `usuario_id` | INT | SI | FK → usuario | Link al usuario |
| `nombre` | VARCHAR(150) | SI | Nombre completo | ⚠️ Duplica usuario |
| `codigo` | VARCHAR(20) | SI | Chapa/código | ⚠️ Duplica usuario.chapa |
| `telefono` | VARCHAR(20) | SI | Teléfono | ⚠️ Duplica usuario |
| `email` | VARCHAR(100) | SI | Email | ⚠️ Duplica usuario |
| `sede_id` | INT | SI | FK → sede | ⚠️ Duplica usuario |
| `activo` | BOOLEAN | NO | Si está activo | ⚠️ Duplica usuario |

**⚠️ PROBLEMA:** Esta tabla duplica casi todos los campos de `usuario`. Algunas relaciones usan `brigada_id` y otras `usuario_id`, causando inconsistencia.

**Recomendación:** 
- Deprecar `brigada` 
- Usar sólo `usuario` con `rol_id` = ROL_BRIGADA
- Migrar FKs de `brigada_id` a `usuario_id`

---


## 3. Redundancias Detectadas
### 3.1 `brigada` vs `usuario`
**Problema:** Dos tablas para la misma persona.  
**Impacto:** Algunas FKs van a brigada, otras a usuario.  
**Solución:** Unificar en `usuario`, deprecar `brigada`.

### 3.2 `sede.departamento/municipio` (texto) vs `sede.departamento_id/municipio_id` (FK)
**Problema:** Doble fuente de verdad.  
**Solución:** Eliminar campos texto, usar solo FK + JOIN.

### 3.3 `incidente.obstruccion_detalle` vs `incidente.obstruccion_data`
**Problema:** Dos campos JSONB para lo mismo.  
**Solución:** Migrar a uno solo, deprecar el otro.

### 3.4 `vehiculo` + `piloto` + `incidente_vehiculo` vs `vehiculo_incidente` (todo-en-uno)
**Problema:** Modelo normalizado coexiste con denormalizado.  
**Solución:** Canonizar el normalizado, crear VIEW para compatibilidad.

### 3.5 `rol.permisos` (JSONB) vs `rol_permiso` (tabla relacional)
**Problema:** Dos sistemas de permisos.  
**Solución:** Usar solo tabla relacional, eliminar JSONB.

### 3.6 `bitacora_historica_2024/2025/2026` (tablas separadas)
**Problema:** Particionado manual difícil de mantener.  
**Solución:** Migrar a `PARTITION BY RANGE` nativo.

---


## 4. Catálogos
### Geográficos
| Tabla | Registros | Descripción |
|-------|-----------|-------------|
| `departamento` | 22 | Departamentos de Guatemala |
| `municipio` | 340 | Municipios (FK → departamento) |

### Tipos de Hechos
| Tabla | Descripción |
|-------|-------------|
| `tipo_hecho` | Colisión, Atropello, Vuelco, etc. |
| `subtipo_hecho` | Subtipos por tipo_hecho |

### Vehículos
| Tabla | Descripción |
|-------|-------------|
| `tipo_vehiculo` | Sedan, Pick-up, Bus, Motocicleta, etc. |
| `marca_vehiculo` | Toyota, Chevrolet, Honda, etc. |

### Otros
| Tabla | Descripción |
|-------|-------------|
| `aseguradora` | Aseguradoras registradas |
| `grua` | Grúas disponibles |
| `articulo_sancion` | Artículos de ley para sanciones |
| `motivo_no_atendido` | Razones de no atención |
| `motivo_inactividad` | Razones de baja temporal |

---


## 5. Recomendaciones de Limpieza
### Prioridad ALTA (Hacer primero)
1. **Unificar brigada → usuario**
2. **Eliminar campos texto redundantes en sede**
3. **Unificar obstruccion_detalle/obstruccion_data**

### Prioridad MEDIA
4. **Canonizar modelo de vehículos (normalizado)**
5. **Unificar sistema de permisos (solo tabla relacional)**
6. **Agregar `codigo_boleta` a sede para numeración Accidentología**

### Prioridad BAJA (Mejoras futuras)
7. **Migrar bitácora a particionado nativo**
8. **Crear schemas PostgreSQL por módulo (operaciones, catalogos, seguridad)**
9. **Normalizar hoja_accidentologia para enlazar directo a incidente_id**


## Módulo: Hechos de tránsito (Incidentes) + Accidentología
Este módulo se divide en dos capas:

- **Operativa (tiempo real)**: lo que se usa para despachar, dar seguimiento y cerrar el evento.
- **Peritaje/Accidentología (boleta/PDF)**: lo que debe quedar *igual* a la boleta física y además servir para estadísticas.

### Estructura actual de `incidente` (operativo)

- `numero_reporte` (INC-AAAA-0001)
- `origen` (BRIGADA, USUARIO_PUBLICO, CENTRO_CONTROL)
- `estado` (REPORTADO → EN_ATENCION → REGULACION → CERRADO / NO_ATENDIDO)
- `tipo_hecho_id` (FK a `tipo_hecho`)
- Ubicación: `ruta_id`, `km`, `sentido`, `latitud`, `longitud`
- Cronología: `fecha_hora_aviso`, `fecha_hora_asignacion`, `fecha_hora_llegada`, `fecha_hora_estabilizacion`, `fecha_hora_finalizacion` (según existan)
- Víctimas: `hay_heridos`, `hay_fallecidos` (y/o contadores si aplica)
- Campos de apoyo (si existen en tu schema): clima/iluminación/condición de vía, etc.

Tablas relacionadas típicas:
- `vehiculo_incidente` (vehículos y piloto)
- `obstruccion_incidente` (carriles bloqueados / JSONB)
- `recurso_incidente` (grúas, ambulancias, PNC, bomberos…)
- `incidente_no_atendido` (razón/cierre alterno)

### Accidentología (boleta formal)

Tablas clave:
- `hoja_accidentologia` (encabezado boleta + vía/clima/apoyo/croquis/observaciones, 1:1 con `incidente`)
- `vehiculo_accidente` (vehículos de la boleta; **1..N** por incidente)
- `incidente_causa` (tabla puente; múltiples causas + 1 principal)
- `boleta_secuencia` + `fn_generar_numero_boleta` + trigger `tr_generar_boleta_incidente` (numeración atómica por sede/año)
- Vista de salida: `v_accidentologia_completa` (para reportes/PDF)

Nomenclatura de sedes para boleta: **ver sección “Nomenclatura de Sedes (para Boletas)”.**

📄 Mapeo oficial de campos (boleta → DB): ver `MAPEO_BOLETA_ACCIDENTOLOGIA.md`.

### Pendiente (no existe aún / roadmap)

- **Reincidencia**: historial por placa/piloto (involucrado varias veces)
- **Estadísticas avanzadas**: vistas materializadas para dashboards (por ruta, hora, tipo, causas, etc.)
- **Puntos negros**: análisis geoespacial (zonas calientes por km/lat-lon)


## Nomenclatura de Sedes (para Boletas)

| sede_id | codigo_boleta |
|---:|:---|
| 1 | SC |
| 2 | SRSB |
| 3 | SRPP |
| 4 | SRSCA |
| 5 | SRQ |
| 6 | SRCOA |
| 7 | SRTPE |
| 8 | SRMI |
| 9 | SRDPBI |

> Fuente: mapeo operativo actual (código ↔ `sede_id`). El **nombre** de sede se obtiene desde la tabla `sede`.

---

## Módulo: Accidentología 🚗💥
Este módulo maneja el peritaje formal de hechos de tránsito según la Boleta UAV-205-13.

### A. Estructura Jerárquica

```
┌─────────────────────────────────────────────────────────────┐
│                      INCIDENTE (Core)                        │
│  - numero_boleta (auto-generado, UNIQUE)                    │
│  - numero_boleta_secuencia                                   │
│  - ubicación, víctimas, unidad                              │
└───────────────────────┬─────────────────────────────────────┘
                        │ 1:1
                        ▼
┌─────────────────────────────────────────────────────────────┐
│               HOJA_ACCIDENTOLOGIA (Extensión)               │
│  ⭐ FUENTE DE VERDAD para campos de vía:                    │
│  - estado_via_id, topografia_id, geometria_via_id           │
│  - condiciones_climaticas, iluminacion, visibilidad         │
│  - agente_apoyo_*, autoridades (PNC, MP, Bomberos)          │
└───────────────────────┬─────────────────────────────────────┘
                        │ 1:N
                        ▼
┌─────────────────────────────────────────────────────────────┐
│               VEHICULO_ACCIDENTE (N vehículos)              │
│  - piloto, licencias, ebriedad, pasajeros                   │
│  - dispositivos_seguridad, consignaciones, acuerdos         │
└───────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               PERSONA_ACCIDENTE (N personas)                │
│  - estado, tipo_lesion, edad, sexo                          │
└───────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               INCIDENTE_CAUSA (N:M puente)                  │
│  - incidente_id → causa_id                                  │
│  - es_causa_principal (BOOLEAN)                             │
└───────────────────────┘
```

---

### B. Tablas del Módulo

#### B.1 `incidente` (campos de accidentología)

| Campo | Tipo | Fuente | Descripción |
|-------|------|--------|-------------|
| `numero_boleta` | VARCHAR(20) | **091** | SEDE-AÑO-SEQ. UNIQUE. Auto-generado por trigger. |
| `numero_boleta_secuencia` | INT | **091** | Secuencia para ordenamiento |
| `area` | VARCHAR(10) | **091** | URBANA / RURAL |
| `causa_especificar` | TEXT | **091** | Detalle cuando causa es "OTRO" |
| `croquis_url` | TEXT | **091** | URL del croquis del accidente |
| `fotos_urls` | TEXT[] | **091** | Array de URLs de fotos |
| ~~`estado_via_id`~~ | ~~INT~~ | ~~DEPRECATED~~ | ⚠️ Usar `hoja_accidentologia.estado_via_id` |
| ~~`causas_ids`~~ | ~~INT[]~~ | ~~DEPRECATED~~ | ⚠️ Usar tabla `incidente_causa` |

#### B.2 `hoja_accidentologia` (extensión 1:1)

| Campo | Tipo | Fuente | Descripción |
|-------|------|--------|-------------|
| `incidente_id` | BIGINT | **091** | FK única a incidente (1:1) |
| `situacion_id` | INT | Existente | FK legacy (migrar a incidente_id) |
| `tipo_accidente` | ENUM | Existente | COLISION_FRONTAL, VOLCADURA, etc. |
| `descripcion_accidente` | TEXT | Existente | Narrativa del hecho |
| `estado_via_id` | INT | **091** | ⭐ FK → estado_via (FUENTE DE VERDAD) |
| `topografia_id` | INT | **091** | ⭐ FK → topografia_via |
| `geometria_via_id` | INT | **091** | ⭐ FK → geometria_via |
| `numero_carriles` | INT | **091** | Cantidad de carriles en el punto |
| `agente_apoyo_nombre` | VARCHAR | **091** | Nombre del agente externo |
| `agente_apoyo_institucion` | VARCHAR | **091** | CHECK: PMT, PNC, MP, BV, BM, EJERCITO, DGT, IGSS, CRUZ_ROJA |
| `pnc_presente/agente` | BOOL/VARCHAR | Existente | Si PNC estuvo presente |
| `bomberos_presente/unidad` | BOOL/VARCHAR | Existente | Si bomberos estuvieron |
| `mp_presente/fiscal` | BOOL/VARCHAR | Existente | Si MP estuvo presente |
| `numero_caso_pnc/mp` | VARCHAR | Existente | Números de caso externos |

#### B.3 `vehiculo_accidente` (N por incidente)

| Campo | Tipo | Fuente | Descripción |
|-------|------|--------|-------------|
| `estado_ebriedad` | BOOLEAN | **091** | Si piloto estaba en estado de ebriedad |
| `tiene_licencia` | VARCHAR(10) | **091** | CHECK: SI, NO, NO_PORTA |
| `licencia_extranjera` | BOOLEAN | **091** | Si licencia es extranjera |
| `piloto_domicilio` | TEXT | **091** | Dirección del piloto |
| `pasajeros_ilesos` | INT | **091** | Cantidad de pasajeros sin lesiones |
| `traslados` | JSONB | **091** | `{mp: 0, pnc: 0, bm: 0, bv: 0, igss: 0, funeraria: 0, cruz_roja: 0}` |
| `dispositivos_seguridad` | VARCHAR[] | **091** | Array: CINTURON, CASCO, BOLSA_AIRE, etc. |
| `doc_consignado_licencia/tarjeta` | BOOLEAN | **091** | Si se consignaron documentos |
| `doc_consignado_por` | VARCHAR | **091** | CHECK: DGT, PMT, PNC |
| `vehiculo_consignado` | BOOLEAN | **091** | Si vehículo fue consignado |
| `vehiculo_consignado_por` | VARCHAR | **091** | CHECK: PMT, PNC |
| `conductor_consignado` | BOOLEAN | **091** | Si conductor fue consignado |
| `conductor_consignado_por` | VARCHAR | **091** | CHECK: EJERCITO, PMT, PNC |
| `acuerdo` | BOOLEAN | **091** | Si hubo acuerdo entre partes |
| `acuerdo_tipo` | VARCHAR | **091** | CHECK: ASEGURADORA, INICIATIVA_PROPIA |
| `empresa` | VARCHAR | **091** | Empresa del vehículo |
| `licencia_transporte` | VARCHAR | **091** | Licencia de transporte |
| `tarjeta_operaciones` | VARCHAR | **091** | Tarjeta de operaciones |
| `placa_remolque` | VARCHAR | **091** | Placa del remolque |

#### B.4 `incidente_causa` (tabla puente N:M)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `incidente_id` | BIGINT | FK → incidente (CASCADE) |
| `causa_id` | INT | FK → causa_hecho_transito (RESTRICT) |
| `es_causa_principal` | BOOLEAN | Si es la causa principal |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

---

### C. Catálogos de Accidentología

| Tabla | Registros | Descripción |
|-------|-----------|-------------|
| `causa_hecho_transito` | 23 | Causas según boleta UAV-205-13 |
| `estado_via` | 4 | Óptimo, Bueno, Regular, Malo |
| `topografia_via` | 3 | Subida, Bajada, Plana |
| `geometria_via` | 7 | Recta, Curva, Intersección, Peraltes |
| `dispositivo_seguridad` | 6 | Cinturón, Casco, Bolsa aire, etc. |

---

### D. Reglas Automáticas

| Componente | Tipo | Propósito |
|------------|------|-----------|
| `boleta_secuencia` | Tabla | Secuencias atómicas por (sede_id, anio). Previene colisiones. |
| `fn_generar_numero_boleta(sede_id, fecha)` | Función | Genera boleta usando UPSERT atómico. Usa año de la fecha. |
| `tr_generar_boleta_incidente` | Trigger | BEFORE INSERT: auto-genera boleta usando `fecha_hora_aviso` |
| `uq_incidente_causa_principal` | Índice | Garantiza máx. 1 causa principal por incidente |
| `sede_codigo_boleta_unique` | Constraint | UNIQUE en codigo_boleta (prevenir conflictos) |

**CHECKs de coherencia en `vehiculo_accidente`:**
- Si `doc_consignado_licencia=true` OR `doc_consignado_tarjeta=true` → `doc_consignado_por` requerido
- Si `vehiculo_consignado=true` → `vehiculo_consignado_por` requerido
- Si `conductor_consignado=true` → `conductor_consignado_por` requerido


---

### E. Vista Consolidada

**`v_accidentologia_completa`** - Para reportes y generación de boleta PDF.

Incluye: incidente + hoja_accidentologia + catálogos de vía + unidad + elaborador.

---

### F. Nomenclatura de Sedes para Boletas

> **Nota:** Para evitar duplicación, la tabla oficial de códigos/IDs está en la sección **“Nomenclatura de Sedes (para Boletas)”**.

### G. Campos Deprecados (Transición)

| Campo | Ubicación | Reemplazo |
|-------|-----------|-----------|
| `incidente.causa_probable` | TEXT | → `incidente_causa` (tabla puente) |
| `incidente.causas_ids` | INT[] | → `incidente_causa` (integridad FK) |
| `incidente.estado_via_id` | INT | → `hoja_accidentologia.estado_via_id` |
| `incidente.topografia_id` | INT | → `hoja_accidentologia.topografia_id` |
| `incidente.geometria_via_id` | INT | → `hoja_accidentologia.geometria_via_id` |



## 6. Vistas (39 total)
Las vistas proporcionan consultas pre-armadas para el frontend y reportes.

### 6.1 Vistas Operativas (Turnos, Asignaciones, Unidades)

| Vista | Propósito | Tablas Base |
|-------|-----------|-------------|
| `v_asignaciones_completas` | Asignaciones con detalles de turno, unidad, ruta, tripulación | turno, asignacion_unidad, unidad, ruta, tripulacion_turno |
| `v_asignaciones_pendientes` | Asignaciones planificadas/activas sin importar la fecha | turno, asignacion_unidad, unidad, ruta |
| `v_asignaciones_por_sede` | Asignaciones agrupadas por sede con config visual | turno, sede, asignacion_unidad, unidad, ruta, salida_unidad |
| `v_turnos_completos` | Turnos con datos de sede, estadísticas | turno, sede, usuario |
| `v_unidades_en_salida` | Unidades actualmente en operación (EN_SALIDA) | salida_unidad, unidad, sede, ruta |
| `v_actividades_completas` | Actividades con tipo, ruta, incidente, usuario | actividad_unidad, unidad, sede, tipo_actividad, ruta, incidente |
| `v_bitacora_unidad` | Bitácora actual por unidad | unidad, actividad actual, ruta, incidente |
| `v_bitacora_historica_detalle` | Bitácora histórica con tripulación y resumen | bitacora_historica, unidad, sede, ruta, usuario |

### 6.2 Vistas de Situaciones e Incidentes

| Vista | Propósito | Tablas Base |
|-------|-----------|-------------|
| `v_situaciones_completas` | Situaciones con unidad, ruta, tripulación | situacion, salida_unidad, unidad, ruta, usuario |
| `v_incidentes_completos` | Incidentes con tipo, subtipo, ruta, unidad, usuario | incidente, tipo_hecho, subtipo_hecho, ruta, unidad, usuario |
| `v_ultima_situacion_unidad` | Última situación por unidad (para mapa COP) | situacion, salida_unidad, unidad |

### 6.3 Vistas de Brigadas y Usuarios

| Vista | Propósito | Tablas Base |
|-------|-----------|-------------|
| `v_brigadas_activas_ahora` | Brigadas que están trabajando hoy | usuario, calendario_grupo, brigada_unidad |
| `v_ubicacion_actual_brigada` | Ubicación actual de cada brigada | ubicacion_brigada, usuario, unidad |
| `v_usuarios_admin` | Usuarios con roles administrativos | usuario, rol |
| `v_usuario_roles` | Usuarios con todos sus roles | usuario, usuario_rol, rol |
| `v_historial_cambios_usuario` | Cambios realizados a usuarios | registro_cambio, usuario |
| `v_historial_movimientos` | Movimientos de brigadas entre unidades | movimiento_brigada, usuario, unidad, turno |

### 6.4 Vistas de Grupos/Turnos

| Vista | Propósito | Tablas Base |
|-------|-----------|-------------|
| `v_estado_grupos_hoy` | Estado actual de cada grupo (TRABAJO/DESCANSO) | calendario_grupo |
| `v_estado_grupos_actual` | Estado de grupos por departamento/sede | departamento_sistema, sede, estado_grupo_departamento |
| `v_estado_grupos_detallado` | Grupos con brigadas asignadas | calendario_grupo, usuario, brigada_unidad, unidad |

### 6.5 Vistas de Inspecciones

| Vista | Propósito | Tablas Base |
|-------|-----------|-------------|
| `v_inspecciones_360_pendientes` | Inspecciones esperando aprobación | inspeccion_360, unidad, usuario |
| `v_historial_inspecciones_360` | Historial completo de inspecciones | inspeccion_360, unidad, usuario, plantilla_inspeccion_360 |

### 6.6 Vistas de Alertas y Notificaciones

| Vista | Propósito | Tablas Base |
|-------|-----------|-------------|
| `v_alertas_activas` | Alertas activas con contexto | alerta, sede, unidad, brigada, usuario |

### 6.7 Vistas de Estadísticas

| Vista | Propósito | Tablas Base |
|-------|-----------|-------------|
| `v_estadisticas_unidades` | Estadísticas por unidad | Varias |

### 6.8 Otras Vistas

| Vista | Propósito |
|-------|-----------|
| `v_situaciones_persistentes_activas` | Situaciones persistentes activas |
| `v_eventos_persistentes_activos` | Eventos de larga duración activos |
| `v_salidas_completas` | Salidas con tripulación detallada |
| `v_tripulacion_actual` | Tripulación actual por unidad |
| ... | (continuar según se necesite) |

---


## 7. Vistas Materializadas (7 total)
Las vistas materializadas almacenan resultados pre-calculados para analítica rápida.
**Requieren `REFRESH MATERIALIZED VIEW` para actualizar.**

### 7.1 `mv_estadisticas_diarias`

**Propósito:** Estadísticas agregadas por día para dashboards.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `fecha` | DATE | Fecha de las estadísticas |
| `total_incidentes` | INT | Incidentes reportados |
| `total_situaciones` | INT | Situaciones creadas |
| `total_heridos` | INT | Heridos totales |
| `total_fallecidos` | INT | Fallecidos totales |
| `incidentes_por_tipo` | JSONB | Breakdown por tipo |
| `incidentes_por_ruta` | JSONB | Breakdown por ruta |

**Actualización sugerida:** Diaria (cron a medianoche).

---

### 7.2 `mv_puntos_calientes`

**Propósito:** Identificar zonas con alta incidencia de accidentes.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ruta_id` | INT | FK → ruta |
| `km_inicio` | DECIMAL | Km inicio del segmento |
| `km_fin` | DECIMAL | Km fin del segmento |
| `total_incidentes` | INT | Incidentes en el segmento |
| `total_heridos` | INT | Heridos acumulados |
| `total_fallecidos` | INT | Fallecidos acumulados |
| `score_peligrosidad` | DECIMAL | Score calculado |

**Uso:** Mapa de calor, planificación de patrullaje.

---

### 7.3 `mv_vehiculos_reincidentes`

**Propósito:** Vehículos involucrados en múltiples incidentes.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `placa` | VARCHAR | Placa del vehículo |
| `total_incidentes` | INT | Cantidad de incidentes |
| `ultima_fecha` | TIMESTAMPTZ | Fecha del último incidente |
| `rutas_frecuentes` | TEXT[] | Rutas donde aparece |

**Uso:** Detección de patrones, posibles sanciones.

---

### 7.4 `mv_pilotos_problematicos`

**Propósito:** Pilotos involucrados en múltiples incidentes.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `licencia_numero` | BIGINT | Número de licencia |
| `nombre` | VARCHAR | Nombre del piloto |
| `total_incidentes` | INT | Cantidad de incidentes |
| `incidentes_como_responsable` | INT | Cuando fue responsable |
| `ultima_fecha` | TIMESTAMPTZ | Fecha del último incidente |

**Uso:** Programa de educación vial, alertas.

---

### 7.5 `mv_tendencias_temporales`

**Propósito:** Análisis de incidentes por hora/día de la semana.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `dia_semana` | INT | 0-6 (Domingo-Sábado) |
| `hora` | INT | 0-23 |
| `total_incidentes` | INT | Incidentes en ese slot |
| `promedio_heridos` | DECIMAL | Promedio de heridos |

**Uso:** Planificación de turnos, asignación de recursos.

---

### 7.6 `mv_no_atendidos_por_motivo`

**Propósito:** Análisis de incidentes no atendidos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `motivo_id` | INT | FK → motivo_no_atendido |
| `motivo_nombre` | VARCHAR | Nombre del motivo |
| `total` | INT | Cantidad de no atendidos |
| `porcentaje` | DECIMAL | % del total |

**Uso:** Mejora de procesos, justificación de recursos.

---

### 7.7 `mv_vehiculo_historial`

**Propósito:** Historial completo de cada vehículo.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `placa` | VARCHAR | Placa del vehículo |
| `tipo_vehiculo` | VARCHAR | Tipo |
| `marca` | VARCHAR | Marca |
| `incidentes` | JSONB | Array de incidentes relacionados |
| `aseguradoras` | TEXT[] | Aseguradoras usadas |
| `pilotos` | JSONB | Pilotos asociados |

**Uso:** Consulta rápida de historial por placa.

---


## 8. Funciones (77 total)
Las funciones proporcionan lógica de negocio encapsulada en la base de datos.

### 8.1 Funciones de Turnos y Operación Diaria

| Función | Retorno | Propósito | Uso |
|---------|---------|-----------|-----|
| `activar_turno_del_dia()` | void | Activa turnos PLANIFICADO → ACTIVO para el día actual | Cron diario 00:01 |
| `cerrar_turno()` | void | Cierra turnos de días anteriores | Cron diario 23:59 |
| `cerrar_dia_operativo()` | TABLE | Cierra asignaciones, movimientos; migra situaciones activas al nuevo día | Cron a medianoche |
| `cerrar_situaciones_antiguas(horas)` | INT | Cierra situaciones activas de más de X horas | Limpieza automática |

### 8.2 Funciones de Asignaciones y Rutas

| Función | Retorno | Propósito |
|---------|---------|-----------|
| `actualizar_ruta_activa(asignacion_id, nueva_ruta_id)` | void | Actualiza la ruta activa de una asignación |
| `contar_veces_en_ruta(usuario_id, ruta_id, dias)` | INT | Cuenta veces que un usuario estuvo en una ruta |
| `contar_veces_en_situacion(usuario_id, situacion_fija_id, dias)` | INT | Cuenta veces en una situación fija |
| `calcular_km_recorridos()` | TRIGGER | Calcula km recorridos basado en reportes horarios |

### 8.3 Funciones de Salidas y Jornada

| Función | Retorno | Propósito |
|---------|---------|-----------|
| `finalizar_salida_unidad(salida_id, km_final, combustible_final, obs)` | BOOLEAN | Finaliza una salida activa |
| `finalizar_jornada_completa(salida_id, km_final, combustible_final, obs, user_id)` | TABLE | **FUNCIÓN CRÍTICA**: Finaliza jornada completa (bitácora, limpieza situaciones temporales, libera unidad) |
| `crear_snapshot_bitacora(salida_id, usuario_id)` | BIGINT | Crea snapshot en bitacora_historica antes de limpiar datos |

### 8.4 Funciones de Inspecciones 360

| Función | Retorno | Propósito |
|---------|---------|-----------|
| `aprobar_inspeccion_360(inspeccion_id, aprobador_id, firma, obs)` | TABLE | Aprueba inspección (solo comandante) |
| `archivar_inspecciones_360_antiguas()` | INT | Archiva inspecciones >90 días |

### 8.5 Funciones de Alertas

| Función | Retorno | Propósito |
|---------|---------|-----------|
| `crear_alerta(tipo, titulo, mensaje, severidad, datos, ...)` | alerta | Crea nueva alerta respetando configuración |
| `atender_alerta(alerta_id, usuario_id, nota)` | TABLE | Marca alerta como atendida |

### 8.6 Funciones de Aprobaciones de Tripulación

| Función | Retorno | Propósito |
|---------|---------|-----------|
| `crear_aprobacion_tripulacion(salida_id, tipo, iniciado_por, insp_id, tiempo)` | INT | Crea solicitud de aprobación para tripulación |

### 8.7 Funciones de Situaciones Persistentes

| Función | Retorno | Propósito |
|---------|---------|-----------|
| `fn_promover_a_persistente(situacion_id, titulo, tipo_emergencia_id, importancia, desc, user_id)` | INT | Promueve situación normal a persistente |
| `fn_generar_numero_situacion_persistente()` | TRIGGER | Genera número automático SP-YYYY-XXXX |

### 8.8 Funciones de Encargados de Grupo

| Función | Retorno | Propósito |
|---------|---------|-----------|
| `fn_asignar_encargado(usuario_id, sede_id, grupo, asignado_por, motivo)` | INT | Asigna encargado de grupo |
| `fn_remover_encargado(sede_id, grupo, removido_por, motivo)` | BOOLEAN | Remueve encargado de grupo |
| `fn_verificar_acceso_grupo(usuario_id)` | TABLE | Verifica si usuario tiene acceso según su grupo |

### 8.9 Funciones de Ubicación/Brigadas

| Función | Retorno | Propósito |
|---------|---------|-----------|
| `fn_inicializar_ubicacion_brigada()` | TRIGGER | Inicializa ubicación cuando se agrega tripulante |

### 8.10 Funciones de Obstrucción

| Función | Retorno | Propósito |
|---------|---------|-----------|
| `fn_generar_descripcion_obstruccion(vehiculo_fuera, tipo, sentido_principal, sentido_contrario, sentido)` | TEXT | Genera descripción automática de obstrucción |
| `fn_nombres_carriles(cantidad, sentido)` | TEXT[] | Devuelve array de nombres de carriles |

### 8.11 Funciones Utilitarias

| Función | Retorno | Propósito |
|---------|---------|-----------|
| `set_updated_at()` | TRIGGER | Actualiza `updated_at` automáticamente |
| `update_*_updated_at()` | TRIGGER | Versiones específicas por tabla |
| `generar_numero_boleta(sede_id, anio)` | TEXT | **NUEVA** Genera número de boleta SEDE-AÑO-SEQ |

### 8.12 Funciones de Estadísticas/Verificación

| Función | Retorno | Propósito |
|---------|---------|-----------|
| `verificar_unidades_inactivas()` | void | Verifica unidades sin actividad |
| `verificar_inspecciones_pendientes()` | void | Verifica inspecciones sin aprobar |
| `verificar_multimedia_completa()` | void | Verifica si situaciones tienen multimedia requerida |
| `validar_remocion_asignacion()` | TRIGGER | Valida antes de remover asignación |

---


## 9. Triggers (49 total)
Los triggers ejecutan lógica automáticamente en respuesta a eventos en tablas.

### 9.1 Triggers de Updated_at (Automáticos)

Todas las tablas principales tienen un trigger para actualizar `updated_at`:

```
update_alerta_updated_at → set_updated_at() ON alerta
update_asignacion_updated_at → set_updated_at() ON asignacion_unidad
update_incidente_updated_at → set_updated_at() ON incidente
update_salida_updated_at → set_updated_at() ON salida_unidad
update_sede_updated_at → set_updated_at() ON sede
update_situacion_updated_at → set_updated_at() ON situacion
update_turno_updated_at → set_updated_at() ON turno
update_unidad_updated_at → set_updated_at() ON unidad
update_usuario_updated_at → set_updated_at() ON usuario
update_vehiculo_updated_at → set_updated_at() ON vehiculo
... (aprox. 30 triggers similares)
```

### 9.2 Triggers de Lógica de Negocio

| Trigger | Tabla | Evento | Función | Propósito |
|---------|-------|--------|---------|-----------|
| `tr_cerrar_actividad_anterior` | actividad_unidad | BEFORE INSERT | `cerrar_actividad_anterior()` | Cierra actividad previa al crear nueva |
| `tr_calcular_km_recorridos` | reporte_horario | AFTER INSERT | `calcular_km_recorridos()` | Calcula km al agregar reporte |
| `tr_generar_numero_situacion` | situacion_persistente | BEFORE INSERT | `fn_generar_numero_situacion_persistente()` | Genera número SP-YYYY-XXXX |
| `tr_inicializar_ubicacion` | tripulacion_turno | AFTER INSERT | `fn_inicializar_ubicacion_brigada()` | Crea ubicación para tripulante |
| `tr_aprobacion_tripulacion_updated` | aprobacion_tripulacion | AFTER UPDATE | (función interna) | Maneja cambios en aprobaciones |

### 9.3 Triggers de Validación

| Trigger | Tabla | Propósito |
|---------|-------|-----------|
| `tr_validar_remocion_asignacion` | asignacion_unidad | Valida antes de eliminar asignación |

---


## 10. ENUMs (10 total)
Los ENUMs definen valores permitidos para campos específicos.

| ENUM | Valores | Uso |
|------|---------|-----|
| `tipo_accidente` | COLISION_FRONTAL, COLISION_LATERAL, COLISION_TRASERA, VOLCADURA, ATROPELLO, CAIDA_DE_MOTO, SALIDA_DE_CARRIL, CHOQUE_OBJETO_FIJO, MULTIPLE, OTRO | hoja_accidentologia |
| `estado_alerta` | ACTIVA, ATENDIDA, RESUELTA, IGNORADA, EXPIRADA | alerta |
| `severidad_alerta` | BAJA, MEDIA, ALTA, CRITICA | alerta |
| `tipo_alerta` | EMERGENCIA, UNIDAD_SIN_ACTIVIDAD, INSPECCION_PENDIENTE, BRIGADA_FUERA_ZONA, COMBUSTIBLE_BAJO, MANTENIMIENTO_REQUERIDO, APROBACION_REQUERIDA, SISTEMA, PERSONALIZADA | alerta |
| `estado_persona_accidente` | ILESO, HERIDO_LEVE, HERIDO_MODERADO, HERIDO_GRAVE, FALLECIDO | persona_accidente |
| `tipo_lesion` | NINGUNA, CONTUSIONES, LACERACIONES, FRACTURAS, TRAUMA_CRANEAL, TRAUMA_TORACICO, TRAUMA_ABDOMINAL, QUEMADURAS, AMPUTACION, MULTIPLE, OTRO | persona_accidente |
| `tipo_vehiculo_accidente` | AUTOMOVIL, PICKUP, CAMION, BUS, MOTOCICLETA, BICICLETA, PEATON, TRAILER, MAQUINARIA, OTRO | vehiculo_accidente |
| `estado_situacion_persistente` | ACTIVA, EN_PAUSA, FINALIZADA | situacion_persistente |
| `estado_ubicacion_brigada` | CON_UNIDAD, EN_PUNTO_FIJO, PRESTADO | ubicacion_brigada |
| `tipo_movimiento_brigada` | PRESTAMO, RETORNO_PRESTAMO, DIVISION, REUNION, CAMBIO_UNIDAD, ASIGNACION_SITUACION, DESASIGNACION_SITUACION | movimiento_brigada |

---


## 11. Próximos Pasos
### Documentación Completada:
1. ~~Tablas núcleo~~ ✅
2. ~~Vistas y Materializadas~~ ✅
3. ~~Funciones y Triggers~~ ✅
4. ~~ENUMs~~ ✅
5. ERD (Diagrama Entidad-Relación) (pendiente - requiere herramienta visual)
6. Flujos de datos principales (pendiente)

### Migraciones (estado real en prod)

1. `091_integracion_accidentologia.sql` — **EJECUTADA** ✅ (estructura Accidentología + boleta base)
2. `091_hotfix_catalogos.sql` — **EJECUTADA** ✅ (catálogos con `codigo` + corrección de vista)
3. `092_accidentologia_blindaje.sql` — **EJECUTADA** ✅ (boleta_secuencia + CHECKs/índices)
4. `093A_deprecacion_sin_romper.sql` — **EJECUTADA** ✅ (vistas/compatibilidad + deprecations sin romper)
5. `093B_backfill_constraints.sql` — **PENDIENTE** (llenar datos legacy + activar constraints fuertes)
6. `093C_limpieza_final.sql` — **PENDIENTE** (drop/cleanup final cuando el legacy esté fuera)
7. `094_boleta_campos_faltantes.sql` — **OPCIONAL** (solo si el Excel pide campos que aún no existen)

### Tareas de Cron Sugeridas:
```bash
# Activar turnos del día
0 0 * * * psql -c "SELECT activar_turno_del_dia();"

# Cerrar turnos anteriores
59 23 * * * psql -c "SELECT cerrar_turno();"

# Cerrar día operativo
1 0 * * * psql -c "SELECT cerrar_dia_operativo();"

# Cerrar situaciones antiguas (>24 horas)
0 6 * * * psql -c "SELECT cerrar_situaciones_antiguas(24);"

# Archivar inspecciones antiguas (mensual)
0 3 1 * * psql -c "SELECT archivar_inspecciones_360_antiguas();"

# Refrescar vistas materializadas
0 4 * * * psql -c "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_estadisticas_diarias;"
0 4 * * * psql -c "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_puntos_calientes;"
```

---

*Documento vivo - Actualizar conforme se hagan cambios al schema.*



