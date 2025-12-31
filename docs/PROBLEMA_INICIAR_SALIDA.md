# Problema: Error al Iniciar Salida - Función PostgreSQL Duplicada

## Estado Actual
**Fecha:** 2025-12-09
**Estado:** EN PROGRESO - Requiere reinicio MANUAL del backend por el usuario

---

## INSTRUCCIONES PARA EL USUARIO

### Paso 1: Cerrar TODAS las terminales y procesos Node.js
1. Abrir Administrador de Tareas (Ctrl+Shift+Esc)
2. Buscar todos los procesos "node.exe" y terminarlos
3. Cerrar todas las terminales de VS Code o CMD

### Paso 2: Abrir nueva terminal y reiniciar backend
```bash
cd C:\Users\chris\OneDrive\Escritorio\proyectoProvialMovilWeb\backend
npm run dev
```

### Paso 3: Verificar que el backend inició correctamente
Deberías ver:
```
✅ Conexión a Redis establecida
✅ Redis listo para recibir comandos
✅ Conexión a PostgreSQL exitosa
🚀 Servidor iniciado en puerto 3000
```

### Paso 4: Probar en la app móvil
1. Login como brigada 19109
2. Ir a "Iniciar Salida"
3. El error debería estar resuelto

---

## Descripción del Problema

Al intentar **Iniciar Salida** desde la app móvil, se recibe un error 500 con el mensaje:

```
function iniciar_salida_unidad(integer, integer, unknown, unknown, unknown) is not unique
```

### Causa Raíz
Existen **dos versiones** de la función `iniciar_salida_unidad` en PostgreSQL con diferentes tipos de parámetros:
- Una con parámetros `INTEGER`
- Una con parámetros `NUMERIC/DECIMAL`

Cuando se pasan valores `null`, PostgreSQL no puede determinar cuál función usar.

---

## Objetivo Final

El usuario quiere poder:
1. **Iniciar una salida** desde la app móvil
2. **Crear situaciones** durante la jornada
3. **Finalizar la jornada**
4. **Ver la bitácora** con el resumen del día (incluso después de finalizar)
5. **El dashboard de operaciones** debe mostrar estado correcto (no "EN RUTA" después de finalizar)

---

## Intentos de Corrección

### Intento 1: Eliminar función duplicada (PARCIAL)
```sql
DROP FUNCTION IF EXISTS iniciar_salida_unidad(integer, integer, numeric, numeric, text);
```
**Resultado:** No funcionó porque quedaba ambigüedad con valores `null`

### Intento 2: Eliminar TODAS las versiones y recrear
```sql
DROP FUNCTION IF EXISTS iniciar_salida_unidad(integer, integer, integer, integer, text);
DROP FUNCTION IF EXISTS iniciar_salida_unidad(integer, integer, numeric, numeric, text);

CREATE OR REPLACE FUNCTION iniciar_salida_unidad(
    p_unidad_id INT,
    p_ruta_inicial_id INT DEFAULT NULL,
    p_km_inicial INT DEFAULT NULL,
    p_combustible_inicial INT DEFAULT NULL,
    p_observaciones TEXT DEFAULT NULL
)
RETURNS INT AS $$ ... $$
```
**Resultado:** Función recreada correctamente (verificado con query directo)

### Intento 3: Agregar type casts en el modelo
Archivo: `backend/src/models/salida.model.ts` línea 320
```typescript
// ANTES:
`SELECT iniciar_salida_unidad($1, $2, $3, $4, $5) AS salida_id`

// DESPUÉS:
`SELECT iniciar_salida_unidad($1::INT, $2::INT, $3::INT, $4::INT, $5::TEXT) AS salida_id`
```
**Resultado:** Código actualizado, pero backend NO está usando el código nuevo

---

## Estado Actual de la Base de Datos

### Función (CORRECTO - Solo 1 versión)
```sql
SELECT p.proname, pg_get_function_arguments(p.oid)
FROM pg_proc p
WHERE p.proname = 'iniciar_salida_unidad';
```
**Resultado:** Solo existe 1 versión con parámetros `integer`

### Prueba directa (FUNCIONA)
```sql
SELECT iniciar_salida_unidad(406::INT, 74::INT, NULL::INT, NULL::INT, NULL::TEXT);
-- Retorna: salida_id = 9 (o siguiente ID disponible)
```

---

## Problema Pendiente

El backend tiene **múltiples instancias** corriendo que NO están usando el código actualizado.

### Query que se está ejecutando (INCORRECTO):
```sql
SELECT iniciar_salida_unidad(406, 74, null, null, null) AS salida_id
```

### Query que debería ejecutarse (CORRECTO):
```sql
SELECT iniciar_salida_unidad(406::INT, 74::INT, null::INT, null::INT, null::TEXT) AS salida_id
```

---

## Solución Requerida

### Paso 1: Detener TODOS los procesos Node.js
```bash
# Windows
taskkill /F /IM node.exe

# O cerrar todas las terminales que tengan backend corriendo
```

### Paso 2: Verificar que no haya procesos Node
```bash
tasklist | findstr node
# Debería estar vacío
```

### Paso 3: Iniciar backend limpio
```bash
cd backend
npm run dev
```

### Paso 4: Probar desde la app móvil
1. Iniciar sesión como brigada (ej: 19109)
2. Ir a "Iniciar Salida"
3. Llenar datos (km, combustible)
4. Presionar "Iniciar Salida"

---

## Archivos Relevantes

| Archivo | Descripción |
|---------|-------------|
| `backend/src/models/salida.model.ts:320` | Llamada a la función (YA CORREGIDO) |
| `backend/src/controllers/salida.controller.ts` | Controller de salidas |
| `mobile/src/screens/brigada/IniciarSalidaScreen.tsx` | Pantalla móvil |
| `migrations/043_fix_iniciar_salida_unidad.sql` | Migración con fix (NUEVO) |

---

## Migración de Corrección

Se creó archivo `migrations/043_fix_iniciar_salida_unidad.sql`:

```sql
-- Eliminar todas las versiones existentes
DROP FUNCTION IF EXISTS iniciar_salida_unidad(integer, integer, integer, integer, text);
DROP FUNCTION IF EXISTS iniciar_salida_unidad(integer, integer, numeric, numeric, text);

-- Crear función única con soporte para asignaciones permanentes y de turno
CREATE OR REPLACE FUNCTION iniciar_salida_unidad(
    p_unidad_id INT,
    p_ruta_inicial_id INT DEFAULT NULL,
    p_km_inicial INT DEFAULT NULL,
    p_combustible_inicial INT DEFAULT NULL,
    p_observaciones TEXT DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
    v_salida_id INT;
    v_tripulacion JSONB;
    v_salida_existente INT;
BEGIN
    -- Verificar que no haya salida activa
    SELECT id INTO v_salida_existente
    FROM salida_unidad
    WHERE unidad_id = p_unidad_id AND estado = 'EN_SALIDA';

    IF v_salida_existente IS NOT NULL THEN
        RAISE EXCEPTION 'La unidad ya tiene una salida activa (ID: %)', v_salida_existente;
    END IF;

    -- Buscar tripulación permanente
    SELECT json_agg(...) INTO v_tripulacion
    FROM brigada_unidad bu
    JOIN usuario u ON bu.brigada_id = u.id
    WHERE bu.unidad_id = p_unidad_id AND bu.activo = TRUE;

    -- Si no hay permanente, buscar en turnos
    IF v_tripulacion IS NULL THEN
        SELECT json_agg(...) INTO v_tripulacion
        FROM tripulacion_turno tt
        JOIN asignacion_unidad au ON tt.asignacion_id = au.id
        JOIN turno t ON au.turno_id = t.id
        WHERE au.unidad_id = p_unidad_id
          AND (t.fecha = CURRENT_DATE
               OR t.fecha = CURRENT_DATE + INTERVAL '1 day'
               OR ...);
    END IF;

    -- Crear salida
    INSERT INTO salida_unidad (...) VALUES (...) RETURNING id INTO v_salida_id;
    RETURN v_salida_id;
END;
$$ LANGUAGE plpgsql;
```

---

## Datos de Prueba

- **Usuario brigada:** 474 (chapa: 19109)
- **Unidad asignada:** 406 (código: 030)
- **Turno:** ID 12, fecha 2025-12-10 (mañana, pero permite trabajo adelantado)
- **Ruta:** CA-9 Sur (ID 74)

---

## Verificación Final

Una vez reiniciado el backend, verificar en los logs que el query sea:
```
SELECT iniciar_salida_unidad($1::INT, $2::INT, $3::INT, $4::INT, $5::TEXT) AS salida_id
```

Y NO:
```
SELECT iniciar_salida_unidad(406, 74, null, null, null) AS salida_id
```
