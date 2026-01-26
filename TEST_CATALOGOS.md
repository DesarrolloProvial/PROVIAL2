# Test: Verificar Catálogos

## 1. Verificar que el backend retorna datos

### Opción A: Desde Postman/Insomnia/Thunder Client

```
GET http://localhost:3000/api/situaciones/auxiliares
Headers:
  Authorization: Bearer TU_TOKEN_AQUI
```

### Opción B: Desde curl (necesitas token primero)

```bash
# 1. Login para obtener token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tu_email","password":"tu_password"}'

# 2. Usar el token en la siguiente petición
curl http://localhost:3000/api/situaciones/auxiliares \
  -H "Authorization: Bearer TOKEN_DEL_PASO_1"
```

### Respuesta Esperada

```json
{
  "tipos_hecho": [
    {"id": 1, "nombre": "Caída De Árbol", "icono": "tree", "color": "#DC2626"},
    {"id": 2, "nombre": "Caída De Carga", "icono": "package-down", "color": "#DC2626"},
    ...17 tipos total
  ],
  "subtipos_hecho": [],
  "tipos_asistencia": [
    {"id": 18, "nombre": "Apoyo A Ciclismo", "icono": "bike", "color": "#10B981"},
    {"id": 19, "nombre": "Apoyo A Digef", "icono": "shield-account", "color": "#3B82F6"},
    ...35 tipos total
  ],
  "tipos_emergencia": [
    {"id": 53, "nombre": "Acumulación De Agua", "icono": "water", "color": "#3B82F6"},
    {"id": 54, "nombre": "Apoyo Antorcha", "icono": "run-fast", "color": "#F97316"},
    ...12 tipos total
  ]
}
```

---

## 2. Si el backend NO retorna datos

Ejecuta esto en Railway (PostgreSQL):

```sql
-- Verificar que hay datos en la tabla
SELECT categoria, COUNT(*) as total
FROM tipo_situacion_catalogo
WHERE activo = true
GROUP BY categoria
ORDER BY categoria;

-- Debería retornar:
-- ASISTENCIA     | 35
-- EMERGENCIA     | 12
-- HECHO_TRANSITO | 17
```

Si retorna 0 filas, **los datos no se cargaron**. Vuelve a ejecutar los scripts SQL que te di anteriormente.

---

## 3. Si el backend SÍ retorna datos pero mobile no los muestra

El problema está en que **mobile no está llamando la sincronización**.

### Solución: Agregar llamada en App.tsx o AuthStore

Necesitamos llamar `syncCatalogosAuxiliares()` cuando:
- El usuario inicia sesión
- La app se abre
- El usuario navega a crear situación

Revisa estos archivos:
- `mobile/src/App.tsx`
- `mobile/src/store/authStore.ts`
- `mobile/src/screens/brigada/BrigadaHomeScreen.tsx`

---

## 4. Debug en Mobile

### Ver logs de catalogSync

Agrega esto temporalmente en `mobile/src/services/catalogSync.ts`:

```typescript
console.log('[CATALOG_SYNC] Iniciando sincronización...');
console.log('[CATALOG_SYNC] URL:', '/situaciones/auxiliares');
```

### Ver si hay errores de autenticación

Revisa si el token está válido:
```typescript
import api from './api';

// En algún lugar de debug
api.get('/situaciones/auxiliares')
  .then(res => console.log('✅ Catálogos:', res.data))
  .catch(err => console.error('❌ Error:', err.response?.data || err.message));
```

---

## 5. Ver datos en SQLite (mobile)

Si la sincronización funcionó pero los dropdowns no muestran datos:

```typescript
// En algún useEffect de debug
import { catalogoStorage } from '../core/storage/catalogoStorage';

useEffect(() => {
  const checkCatalogs = async () => {
    await catalogoStorage.init();
    const tipos_hecho = await catalogoStorage.getTiposHecho();
    const tipos_asistencia = await catalogoStorage.getTiposAsistencia();

    console.log('[DEBUG] Tipos Hecho en SQLite:', tipos_hecho.length);
    console.log('[DEBUG] Tipos Asistencia en SQLite:', tipos_asistencia.length);
    console.log('[DEBUG] Primer tipo hecho:', tipos_hecho[0]);
  };

  checkCatalogs();
}, []);
```
