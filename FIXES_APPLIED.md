# Fixes Applied - Data Persistence Issue

## Root Cause Identified

The data was not being saved because of **field name mismatches** between:
1. Form configurations (using field names like `tipo_asistencia`)
2. Database schema (expecting field names like `tipo_asistencia_id`)
3. CatalogResolver returning STRING values instead of INTEGER IDs

## Changes Made

### 1. Form Configurations Fixed (mobile/src/config/formularios/)

**asistenciaForm.ts**
- Changed `tipo_asistencia` → `tipo_asistencia_id` (line 36)

**emergenciaForm.ts**
- Changed `tipo_emergencia` → `tipo_emergencia_id` (line 36)

**hechoTransitoForm.ts**
- Changed `tipo_hecho` → `tipo_hecho_id` (line 37)

### 2. SituacionDinamicaScreen Fixed (mobile/src/screens/situaciones/)

**handleSubmit - Edit Mode (lines 372-383)**
```typescript
tipo_hecho_id: formData.tipo_hecho_id || formData.tipoIncidente,
tipo_asistencia_id: formData.tipo_asistencia_id || formData.tipoAsistencia,
tipo_emergencia_id: formData.tipo_emergencia_id || formData.tipoEmergencia,
```

**actualizarDraft - Create Mode (lines 439-452)**
```typescript
tipo_hecho_id: formData.tipo_hecho_id || formData.tipoIncidente,
tipo_asistencia_id: formData.tipo_asistencia_id || formData.tipoAsistencia,
tipo_emergencia_id: formData.tipo_emergencia_id || formData.tipoEmergencia,
```

**transformarDatosParaFormulario (lines 96-120)**
- Added proper handling for `_id` suffixed fields when loading data for editing

**cargarDraftEnFormulario (lines 290-311)**
- Updated to use `_id` suffixed field names

### 3. Catalog Storage Enhanced (mobile/src/core/storage/catalogoStorage.ts)

Added support for tipos_hecho, tipos_asistencia, tipos_emergencia:

**New Interfaces:**
- `CatalogoTipoHecho`
- `CatalogoTipoAsistencia`
- `CatalogoTipoEmergencia`

**New SQLite Tables:**
- `tipo_hecho` (id, codigo, nombre, icono, color)
- `tipo_asistencia` (id, nombre)
- `tipo_emergencia` (id, nombre)

**New Methods:**
- `getTiposHecho()` / `saveTiposHecho()`
- `getTiposAsistencia()` / `saveTiposAsistencia()`
- `getTiposEmergencia()` / `saveTiposEmergencia()`

### 4. Catalog Resolver Fixed (mobile/src/core/FormBuilder/catalogResolver.ts)

Changed from returning STRING values to INTEGER IDs:

**Before:**
```typescript
case '@catalogos.tipos_asistencia':
    return this.resolveConstantes(TIPOS_ASISTENCIA); // Returns strings
```

**After:**
```typescript
case '@catalogos.tipos_asistencia':
    return await this.resolveTiposAsistencia(); // Returns {value: id, label: nombre}
```

Added private resolvers:
- `resolveTiposHecho()` - returns IDs from SQLite
- `resolveTiposAsistencia()` - returns IDs from SQLite
- `resolveTiposEmergencia()` - returns IDs from SQLite

### 5. Catalog Sync Service Created (mobile/src/services/catalogSync.ts)

New service to sync auxiliary catalogs from backend:

**Functions:**
- `syncCatalogosAuxiliares()` - fetches from `/catalogos/auxiliares` and saves to SQLite
- `areCatalogsSynced()` - checks if catalogs are populated

## What This Fixes

1. ✅ Form configs now use correct field names matching database schema
2. ✅ CatalogResolver returns INTEGER IDs instead of STRING values
3. ✅ SituacionDinamicaScreen sends correct field names to backend
4. ✅ SQLite storage properly handles tipo_hecho, tipo_asistencia, tipo_emergencia
5. ✅ Data transformations handle `_id` suffixed fields correctly

## What Still Needs to be Done

### 1. Call Catalog Sync on App Initialization

You need to call `syncCatalogosAuxiliares()` when the app starts or when user logs in.

**Suggested location:** `App.tsx` or in `useAuthStore` after successful login

```typescript
import { syncCatalogosAuxiliares } from './services/catalogSync';

// In App.tsx useEffect or after login:
useEffect(() => {
    const initCatalogs = async () => {
        const synced = await syncCatalogosAuxiliares();
        if (!synced) {
            console.warn('Failed to sync catalogs, will retry on next launch');
        }
    };
    initCatalogs();
}, []);
```

### 2. Test the Complete Flow

1. Ensure backend is running with `/catalogos/auxiliares` endpoint working
2. Launch mobile app to trigger catalog sync
3. Navigate to "Asistencia Vehicular" (uses SituacionDinamicaScreen)
4. Fill out the form with:
   - tipo_asistencia_id (select from dropdown)
   - clima, carga_vehicular
   - departamento_id, municipio_id
   - km, sentido, coordinates
5. Submit and verify all fields are saved to database

### 3. Handle Initial Data Migration

If you have existing drafts or data using old field names (`tipo_asistencia` instead of `tipo_asistencia_id`), you may need a migration script.

## Architecture Clarification

**Two Screen Flows:**

1. **NuevaSituacionScreen** - Simple flow using DynamicFormFields (might be deprecated)
2. **SituacionDinamicaScreen** - Full flow using FormBuilder (THIS IS THE ONE TO USE)

The navigation routes for Asistencia, Incidente, and Emergencia all use **SituacionDinamicaScreen** with FormBuilder.

## Testing Checklist

- [ ] Backend `/catalogos/auxiliares` endpoint returns data
- [ ] Mobile app calls `syncCatalogosAuxiliares()` on startup
- [ ] SQLite tables are populated with catalog data
- [ ] Form dropdowns show options with correct IDs
- [ ] Submitting form sends `tipo_asistencia_id` (number) not `tipo_asistencia` (string)
- [ ] Backend receives correct field names and saves to database
- [ ] All fields (clima, carga_vehicular, departamento_id, etc.) save correctly
- [ ] Photos/videos upload to Cloudinary and references save to database

## Backend Reminder

Make sure the backend endpoint exists and returns correct format:

```
GET /catalogos/auxiliares
Response:
{
  "tipos_hecho": [{id: 1, codigo: "HT01", nombre: "Choque", ...}],
  "subtipos_hecho": [{id: 1, tipo_hecho_id: 1, codigo: "ST01", nombre: "..."}],
  "tipos_asistencia": [{id: 1, nombre: "Pinchazo"}],
  "tipos_emergencia": [{id: 1, nombre: "Derrumbe"}]
}
```
