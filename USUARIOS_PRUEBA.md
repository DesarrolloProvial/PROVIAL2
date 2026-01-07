# Usuarios de Prueba por Departamento/Rol

**Contraseña para todos:** `provial123`

---

## 🔐 Administración

### SUPER_ADMIN
- **Usuario:** `19109` o `admin`
- **Acceso:** Panel completo de Super Admin
- **Funcionalidades:**
  - Gestión de usuarios y roles
  - Configuración de sedes
  - Grupos de permisos
  - Acceso total al sistema

### ADMIN
- **Usuario:** `operaciones`
- **Acceso:** Panel de administración general
- **Funcionalidades:**
  - Gestión de brigadas
  - Gestión de unidades
  - Reportes y estadísticas

---

## 🗺️ COP (Centro de Operaciones)

### COP General
- **Usuario:** `cop.admin`
- **Acceso:** Mapa COP y gestión de situaciones
- **Funcionalidades:**
  - Ver mapa en tiempo real
  - Gestión de situaciones persistentes
  - Monitoreo de brigadas
  - Eventos y comunicaciones

### Sub-roles COP
Los usuarios COP pueden tener diferentes permisos según su sub-rol:
- **Crear situaciones persistentes**
- **Cerrar situaciones persistentes**
- **Promover situaciones**
- **Asignar unidades**
- **Solo lectura**

---

## 🚛 Operaciones

### ENCARGADO_NOMINAS
- **Usuario:** Buscar en base de datos con rol `ENCARGADO_NOMINAS`
- **Acceso:** Dashboard de Operaciones
- **Funcionalidades:**
  - Crear asignaciones de turnos
  - Gestión de brigadas
  - Gestión de unidades
  - Publicar/despublicar nóminas
  - Ver estadísticas de combustible y odómetro

### OPERACIONES (General)
- **Usuario:** `operaciones`
- **Acceso:** Vista de operaciones
- **Funcionalidades:**
  - Consulta de asignaciones
  - Reportes operacionales

---

## 👷 Brigadas (Móvil)

### BRIGADA
- **Usuario:** `00001` (ejemplo)
- **Acceso:** App móvil
- **Funcionalidades:**
  - Ver asignación del día
  - Reportar situaciones/incidentes
  - Registrar salidas
  - Tomar fotos y videos
  - Firmas digitales
  - Reportar combustible y odómetro

**Roles dentro de brigada:**
- **PILOTO**: Conductor principal
- **COPILOTO**: Conductor secundario
- **ACOMPAÑANTE**: Miembro de apoyo
- **GARITA**: Encargado de puesto fijo
- **ENCARGADO_RUTA**: Supervisor de ruta

---

## 📊 Ejecutivo

### EJECUTIVO
- **Usuario:** Buscar en base de datos con rol `EJECUTIVO`
- **Acceso:** Dashboard ejecutivo
- **Funcionalidades:**
  - Reportes de alto nivel
  - Estadísticas generales
  - Indicadores de desempeño

---

## 🎯 Páginas del Sistema Web

### Por Rol:

**SUPER_ADMIN:**
- `/super-admin` - Panel Super Admin
- `/cop/mapa` - Mapa COP
- `/operaciones` - Dashboard Operaciones
- Acceso a TODAS las páginas

**ADMIN:**
- `/admin-hub` - Hub de administración
- `/brigadas` - Gestión de brigadas
- `/unidades` - Gestión de unidades
- `/control-acceso` - Control de acceso

**COP:**
- `/cop/mapa` - Mapa en tiempo real
- `/cop/situaciones` - Gestión de situaciones
- `/eventos` - Eventos y comunicaciones
- `/galeria` - Galería multimedia

**ENCARGADO_NOMINAS:**
- `/operaciones` - Dashboard principal
- `/crear-asignacion` - Crear asignaciones
- `/dashboard-sedes` - Dashboard por sedes
- `/gestion-brigadas` - Gestión de brigadas
- `/gestion-unidades` - Gestión de unidades

**BRIGADA:**
- Solo app móvil
- No tiene acceso web

**EJECUTIVO:**
- `/dashboard-ejecutivo` - Dashboard ejecutivo
- Reportes y estadísticas

---

## 🔍 Consultar Usuarios en Base de Datos

```sql
-- Ver todos los roles disponibles
SELECT DISTINCT rol FROM usuario ORDER BY rol;

-- Ver usuarios por rol (excepto brigadas)
SELECT chapa, nombre_completo, rol, sede_id 
FROM usuario 
WHERE rol != 'BRIGADA' 
ORDER BY rol, chapa;

-- Ver brigadas
SELECT chapa, nombre_completo, rol, sede_id 
FROM usuario 
WHERE rol = 'BRIGADA' 
LIMIT 10;

-- Ver usuarios con acceso a todas las sedes
SELECT chapa, nombre_completo, rol, puede_ver_todas_sedes 
FROM usuario 
WHERE puede_ver_todas_sedes = true;
```

---

## 📱 Flujo de Login

1. **Web:** Usuario ingresa con `chapa` y contraseña
2. **Sistema verifica:** Rol y permisos
3. **Redirección automática:**
   - `SUPER_ADMIN` → `/super-admin`
   - `ADMIN` → `/admin-hub`
   - `COP` → `/cop/mapa`
   - `ENCARGADO_NOMINAS` → `/operaciones`
   - `EJECUTIVO` → `/dashboard-ejecutivo`
   - `BRIGADA` → Solo móvil (rechazado en web)

---

## 🧪 Testing Recomendado

1. **Login con cada rol** para verificar redirección
2. **Probar permisos** de cada página
3. **Verificar restricciones** por sede
4. **Probar app móvil** con usuario brigada
5. **Verificar COP** puede ver situaciones en tiempo real
6. **Verificar Operaciones** puede crear y publicar nóminas
