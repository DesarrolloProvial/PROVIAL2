# Fix: NOT NULL Constraint Error en Catálogos

## 🐛 Problema Encontrado

```
ERROR [CATALOGOS] Error saveTiposHecho: [Error: Call to function 'NativeStatement.finalizeSync' has been rejected.
→ Caused by: Error code : NOT NULL constraint failed: tipo_hecho.codigo]
```

### Causa Raíz

1. **SQLite Schema**: Tabla `tipo_hecho` tenía columna `codigo TEXT NOT NULL`
2. **Backend Data**: Endpoint `/situaciones/auxiliares` retorna `{id, nombre, icono, color}` (sin `codigo`)
3. **Resultado**: Intentar insertar datos sin `codigo` fallaba por constraint NOT NULL

## ✅ Solución Implementada

### 1. Interfaz TypeScript Actualizada

```typescript
// ANTES
export interface CatalogoTipoHecho {
    id: number;
    codigo: string;  // ❌ Requerido
    nombre: string;
    icono?: string;
    color?: string;
}

// DESPUÉS
export interface CatalogoTipoHecho {
    id: number;
    codigo?: string;  // ✅ Opcional
    nombre: string;
    icono?: string;
    color?: string;
}
```

### 2. Schema SQLite Actualizado

```typescript
// ANTES
CREATE TABLE IF NOT EXISTS tipo_hecho (
    id INTEGER PRIMARY KEY,
    codigo TEXT NOT NULL,  // ❌ NOT NULL
    nombre TEXT NOT NULL,
    icono TEXT,
    color TEXT
)

// DESPUÉS
DROP TABLE IF EXISTS tipo_hecho;  // Migración: Drop y recrear
CREATE TABLE tipo_hecho (
    id INTEGER PRIMARY KEY,
    codigo TEXT,  // ✅ Nullable
    nombre TEXT NOT NULL,
    icono TEXT,
    color TEXT
)
```

### 3. Método saveTiposHecho Actualizado

```typescript
// ANTES
this.db.runSync(
    'INSERT INTO tipo_hecho (id, codigo, nombre, icono, color) VALUES (?, ?, ?, ?, ?)',
    [tipo.id, tipo.codigo, tipo.nombre, tipo.icono || null, tipo.color || null]
    //           ^^^^^^^^^^^ - Undefined si no existe
);

// DESPUÉS
this.db.runSync(
    'INSERT INTO tipo_hecho (id, codigo, nombre, icono, color) VALUES (?, ?, ?, ?, ?)',
    [tipo.id, tipo.codigo || null, tipo.nombre, tipo.icono || null, tipo.color || null]
    //           ^^^^^^^^^^^^^^^^^^ - Usa null si no existe
);
```

### 4. Normalización de IDs en catalogSync.ts

**Problema adicional detectado**: IDs venían como strings (`"13"`) en lugar de números (`13`)

```typescript
// ANTES
await catalogoStorage.saveTiposHecho(tipos_hecho);

// DESPUÉS
const normalized = tipos_hecho.map(t => ({
    ...t,
    id: typeof t.id === 'string' ? parseInt(t.id, 10) : t.id,
}));
await catalogoStorage.saveTiposHecho(normalized);
```

## 📝 Archivos Modificados

### mobile/src/core/storage/catalogoStorage.ts
- ✅ Interfaz `CatalogoTipoHecho`: `codigo` ahora es opcional
- ✅ Schema `tipo_hecho`: DROP TABLE y recrear con `codigo` nullable
- ✅ Método `saveTiposHecho`: usa `tipo.codigo || null`

### mobile/src/services/catalogSync.ts
- ✅ Normalización de IDs: convierte strings a números
- ✅ Aplica normalización a tipos_hecho, tipos_asistencia, tipos_emergencia

## 🧪 Cómo Probar

### 1. Desinstalar App (Importante)

Para forzar recreación de la base de datos SQLite:

```bash
# En el dispositivo/emulador
- Desinstalar la app completamente
- Reinstalar desde Expo
```

O alternativamente, limpiar data de la app:
```bash
# Android
adb shell pm clear com.yourapp.package

# iOS
Settings > Apps > Your App > Clear Data
```

### 2. Abrir App y Login

```
1. Abrir la app
2. Hacer login con credenciales válidas
```

### 3. Verificar Logs Esperados

**Logs exitosos:**
```
[APP] Inicializando SQLite storage...
[APP] ✅ SQLite storage inicializado
[LOGIN] Sincronizando catálogos auxiliares...
[CATALOG_SYNC] Iniciando sincronización de catálogos auxiliares...
[CATALOG_SYNC] SQLite inicializado
[CATALOG_SYNC] Llamando a /situaciones/auxiliares...
[CATALOG_SYNC] Response status: 200
[CATALOG_SYNC] Datos recibidos: {tipos_hecho: 17, tipos_asistencia: 35, tipos_emergencia: 12}
[CATALOG_SYNC] Primer tipo_hecho: {id: 1, nombre: "Caída De Árbol", icono: "tree", color: "#DC2626"}
[CATALOG_SYNC] Primer tipo_asistencia: {id: 18, nombre: "Apoyo A Ciclismo", icono: "bike", color: "#10B981"}
[CATALOGOS] 17 tipos de hecho guardados
[CATALOGOS] 35 tipos de asistencia guardados
[CATALOGOS] 12 tipos de emergencia guardados
[CATALOG_SYNC] ✅ Sincronización completada exitosamente
[LOGIN] ✅ Catálogos sincronizados
```

**NO debe aparecer:**
```
❌ ERROR [CATALOGOS] Error saveTiposHecho: NOT NULL constraint failed
```

### 4. Verificar Dropdowns

1. Navegar a **Crear Situación**
2. Seleccionar **"Hecho de Tránsito"**
3. Verificar que dropdown **"Tipo de Hecho"** muestre **17 opciones**
4. Seleccionar **"Asistencia Vehicular"**
5. Verificar que dropdown **"Tipo de Asistencia"** muestre **35 opciones**
6. Seleccionar **"Emergencia"**
7. Verificar que dropdown **"Tipo de Emergencia"** muestre **12 opciones**

### 5. Probar Crear Situación

```
1. Crear una asistencia vehicular
2. Seleccionar un tipo de asistencia (ej: "Pinchazo")
3. Llenar otros campos requeridos
4. Guardar
5. Verificar en Railway que se guardó correctamente con tipo_asistencia_id
```

## 🔍 Debug Adicional

Si sigue fallando, agregar esto temporalmente:

```typescript
// En SituacionDinamicaScreen.tsx
useEffect(() => {
  const debug = async () => {
    try {
      const tipos_hecho = await catalogoStorage.getTiposHecho();
      const tipos_asistencia = await catalogoStorage.getTiposAsistencia();
      const tipos_emergencia = await catalogoStorage.getTiposEmergencia();

      console.log('[DEBUG] Tipos Hecho en SQLite:', tipos_hecho.length);
      console.log('[DEBUG] Primer tipo hecho:', tipos_hecho[0]);
      console.log('[DEBUG] Tipos Asistencia en SQLite:', tipos_asistencia.length);
      console.log('[DEBUG] Primer tipo asistencia:', tipos_asistencia[0]);
      console.log('[DEBUG] Tipos Emergencia en SQLite:', tipos_emergencia.length);
    } catch (error) {
      console.error('[DEBUG] Error leyendo catálogos:', error);
    }
  };
  debug();
}, []);
```

## 🎯 Resultado Esperado

- ✅ Catálogos se sincronizan sin errores
- ✅ Dropdowns muestran todas las opciones
- ✅ IDs se guardan correctamente como números
- ✅ Campo `codigo` es opcional (null en BD si no existe)

## 📊 Commits Realizados

**Commit 1**: `b564dfb` - Implementación de catalog sync automático
**Commit 2**: `639b771` - Fix NOT NULL constraint en tipo_hecho.codigo

## ⚠️ Nota Importante

**¿Por qué no tiene `codigo`?**

El backend usa una tabla unificada `tipo_situacion_catalogo` que NO tiene columna `codigo`. Solo tiene:
- `id` (PRIMARY KEY)
- `categoria` (HECHO_TRANSITO, ASISTENCIA, EMERGENCIA)
- `nombre`
- `icono`
- `color`
- `activo`
- `created_at`

El campo `codigo` era de las tablas antiguas (`tipo_hecho`, `tipo_asistencia_vial`) que ya fueron eliminadas.
