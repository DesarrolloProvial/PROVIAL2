# Catalog Sync Implementation

## ✅ Problema Resuelto

Los dropdowns de tipo_asistencia, tipo_hecho, y tipo_emergencia no cargaban datos en la app móvil.

## 🔧 Solución Implementada

### 1. Inicialización de SQLite Storage (App.tsx)
- SQLite storage se inicializa al arrancar la app
- **NO** sincroniza catálogos en este punto (requiere autenticación)

### 2. Sincronización Automática de Catálogos (authStore.ts)
- **Después del login**: Sincroniza catálogos inmediatamente después de login exitoso
- **Al abrir la app**: Sincroniza catálogos al cargar autenticación almacenada

### 3. Manejo de Errores
- Si falla la sincronización, NO falla el login/auth
- Solo muestra warning en consola
- Permite que el usuario continúe usando la app

## 📝 Archivos Modificados

### mobile/App.tsx
```typescript
useEffect(() => {
  const initStorage = async () => {
    try {
      console.log('[APP] Inicializando SQLite storage...');
      await catalogoStorage.init();
      console.log('[APP] ✅ SQLite storage inicializado');
      // NOTA: La sincronización con backend se hará después del login
    } catch (error) {
      console.error('[APP] ❌ Error inicializando storage:', error);
    }
  };
  initStorage();
}, []);
```

### mobile/src/store/authStore.ts
**Import agregado:**
```typescript
import { syncCatalogosAuxiliares } from '../services/catalogSync';
```

**En login() - después de refreshEstadoBrigada():**
```typescript
// Sincronizar catálogos auxiliares desde backend
try {
  console.log('[LOGIN] Sincronizando catálogos auxiliares...');
  await syncCatalogosAuxiliares();
  console.log('[LOGIN] ✅ Catálogos sincronizados');
} catch (error) {
  console.warn('[LOGIN] ⚠️ No se pudieron sincronizar catálogos:', error);
  // No fallar el login si falla la sincronización
}
```

**En loadStoredAuth() - después de refreshEstadoBrigada():**
```typescript
// Sincronizar catálogos auxiliares desde backend
try {
  console.log('[LOAD_AUTH] Sincronizando catálogos auxiliares...');
  await syncCatalogosAuxiliares();
  console.log('[LOAD_AUTH] ✅ Catálogos sincronizados');
} catch (error) {
  console.warn('[LOAD_AUTH] ⚠️ No se pudieron sincronizar catálogos:', error);
  // No fallar el load si falla la sincronización
}
```

### mobile/src/services/catalogSync.ts
- Logging mejorado para debugging
- Muestra cantidad de registros recibidos
- Muestra primer elemento de cada catálogo

## 🧪 Cómo Probar

### 1. Verificar Backend
Primero asegúrate que el backend retorna datos:
```bash
curl http://localhost:3000/api/situaciones/auxiliares \
  -H "Authorization: Bearer TU_TOKEN"
```

Debe retornar:
```json
{
  "tipos_hecho": [17 elementos],
  "tipos_asistencia": [35 elementos],
  "tipos_emergencia": [12 elementos],
  "subtipos_hecho": []
}
```

### 2. Verificar Sincronización en Mobile

**Logs esperados al hacer login:**
```
🔐 [LOGIN] Iniciando login...
✅ [LOGIN] Login exitoso
[LOGIN] Sincronizando catálogos auxiliares...
[CATALOG_SYNC] Iniciando sincronización de catálogos auxiliares...
[CATALOG_SYNC] SQLite inicializado
[CATALOG_SYNC] Llamando a /situaciones/auxiliares...
[CATALOG_SYNC] Response status: 200
[CATALOG_SYNC] Datos recibidos: {tipos_hecho: 17, tipos_asistencia: 35, tipos_emergencia: 12}
[CATALOG_SYNC] Primer tipo_hecho: {id: 1, nombre: "Caída De Árbol", ...}
[CATALOG_SYNC] ✅ Sincronización completada exitosamente
[LOGIN] ✅ Catálogos sincronizados
```

### 3. Verificar Dropdowns

1. Navega a Crear Situación
2. Selecciona "Hecho de Tránsito"
3. El dropdown "Tipo de Hecho" debe mostrar 17 opciones
4. Selecciona "Asistencia Vehicular"
5. El dropdown "Tipo de Asistencia" debe mostrar 35 opciones

### 4. Verificar SQLite Local

Agregar esto temporalmente en SituacionDinamicaScreen.tsx:
```typescript
useEffect(() => {
  const debug = async () => {
    const tipos_hecho = await catalogoStorage.getTiposHecho();
    const tipos_asistencia = await catalogoStorage.getTiposAsistencia();
    console.log('[DEBUG] Tipos Hecho en SQLite:', tipos_hecho.length);
    console.log('[DEBUG] Tipos Asistencia en SQLite:', tipos_asistencia.length);
  };
  debug();
}, []);
```

## 🎯 Flujo Completo

1. **Usuario abre la app por primera vez**
   - App.tsx inicializa SQLite storage (vacío)
   - Usuario no está autenticado → muestra login

2. **Usuario hace login**
   - authStore.login() autentica al usuario
   - Si es BRIGADA, refreshEstadoBrigada()
   - **Sincroniza catálogos** desde /situaciones/auxiliares
   - Guarda en SQLite local (tipo_hecho, tipo_asistencia, tipo_emergencia)

3. **Usuario cierra y vuelve a abrir la app**
   - App.tsx inicializa SQLite storage
   - authStore.loadStoredAuth() carga token guardado
   - Si es BRIGADA, refreshEstadoBrigada()
   - **Re-sincroniza catálogos** (actualiza datos)

4. **Usuario crea situación**
   - SituacionDinamicaScreen carga dropdowns
   - catalogResolver.resolveTiposAsistencia() lee de SQLite
   - Dropdowns muestran datos correctamente

## ⚠️ Notas Importantes

1. **Primera vez:** Si es la primera vez que se abre la app después de esta actualización, los catálogos estarán vacíos hasta que el usuario haga login.

2. **Offline:** Si el usuario está offline al abrir la app, usará los catálogos cacheados en SQLite de la última sincronización exitosa.

3. **Token expirado:** Si el token está expirado, la sincronización fallará pero no afectará el funcionamiento de la app (usará catálogos cacheados).

## 📊 Próximos Pasos

Después de probar:
1. ✅ Verificar que los dropdowns cargan correctamente
2. ✅ Crear una asistencia y verificar que `tipo_asistencia_id` se guarda
3. ✅ Crear un hecho de tránsito y verificar que `tipo_hecho_id` se guarda
4. ✅ Verificar en Railway que los IDs se guardaron correctamente
5. ✅ Verificar que multimedia se sube correctamente (Cloudinary)
