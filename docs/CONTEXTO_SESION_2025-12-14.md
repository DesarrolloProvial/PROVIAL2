# Contexto de Sesion - 14 Diciembre 2025

## Resumen de lo trabajado

### 1. Sistema de Roles ENCARGADO_NOMINAS

Se implemento un sistema jerarquico de permisos para el rol ENCARGADO_NOMINAS:

**ENCARGADO_NOMINAS Central** (usuario con `puede_ver_todas_sedes = true`):
- Acceso total a brigadas de TODAS las sedes
- Puede editar, activar, desactivar, transferir cualquier brigada
- **UNICO que puede asignar roles** a otros usuarios
- Roles asignables: COP, OPERACIONES, ACCIDENTOLOGIA, ENCARGADO_NOMINAS, BRIGADA

**ENCARGADO_NOMINAS Regional** (usuario con `puede_ver_todas_sedes = false`):
- Solo ve brigadas de su sede
- Solo puede editar brigadas de su sede
- NO puede asignar roles a nadie

### 2. Archivos Modificados - Backend

**backend/src/routes/brigadas.routes.ts**
- Se agrego ENCARGADO_NOMINAS a todas las rutas de CRUD de brigadas
- Rutas de gestion de roles solo para ADMIN y ENCARGADO_NOMINAS

**backend/src/controllers/brigadas.controller.ts**
- Se agrego validacion de sede en todas las funciones:
  - `actualizarBrigada`: Verifica que ENCARGADO_NOMINAS regional solo edite su sede
  - `desactivarBrigada`: Igual validacion
  - `activarBrigada`: Igual validacion
  - `transferirBrigada`: Igual validacion
  - `eliminarBrigada`: Igual validacion
- Nuevas funciones:
  - `getRolesDisponibles`: Devuelve COP, OPERACIONES, ACCIDENTOLOGIA, ENCARGADO_NOMINAS
  - `asignarRolBrigada`: Asigna rol con validacion de puede_ver_todas_sedes
  - `revocarRolBrigada`: Revoca rol con misma validacion
  - `getRolesBrigada`: Obtiene roles asignados a un usuario

### 3. Archivos Modificados - Frontend Web

**web/src/pages/OperacionesPage.tsx**
- Header rediseñado con menu desplegable
- Eliminado import de `Settings` (no usado)
- Eliminada funcion `handleGeneradorAutomatico` (no usada)
- Menu agrupa: Generador Automatico, Brigadas, Unidades, Situaciones Fijas, Dashboard Sedes, Cerrar Sesion

**web/src/pages/BrigadasPage.tsx**
- Variable `puedeAsignarRoles` para controlar visibilidad del boton
- Estado `modalAsignarRol` para el modal de asignacion
- Estados `rolSeleccionado`, `sedeRol`, `esRolPrincipal` para el formulario
- Query `rolesDisponibles` que obtiene los roles del backend
- Mutation `asignarRolMutation` para asignar roles
- Modal de asignacion de roles con:
  - Selector de rol
  - Selector de sede (opcional)
  - Checkbox de rol principal
  - Boton de asignar

**web/src/types/index.ts**
- Agregado `puede_ver_todas_sedes?: boolean` a interface Usuario

### 4. Migracion de Base de Datos

**migrations/048_multi_role_system.sql** (ya aplicada)
- Tabla `usuario_rol`: Permite multiples roles por usuario
- Tabla `catalogo_motivo_inactividad`: Motivos de desactivacion
- Tabla `usuario_inactividad`: Historial de inactividad

### 5. Fixes aplicados

- **Usuario 16036**: Cambiado de BRIGADA a ENCARGADO_NOMINAS
- **Tildes en sedes**: Corregidos nombres (Poptun, San Cristobal, Palin Escuintla, Rio Dulce)
- **TypeScript errors**: Eliminados imports no usados en OperacionesPage

---

## Estado de Compilacion

```
Backend: Compila sin errores (npx tsc --noEmit OK)
Frontend: Compila sin errores (npx tsc --noEmit OK)
```

---

## Usuarios de Prueba

| Usuario | ID | Rol | Sede | puede_ver_todas_sedes |
|---------|-----|-----|------|----------------------|
| Jerzon Anibal Corado | 16036 | ENCARGADO_NOMINAS | Central | true |

---

## Tablas de BD relevantes

```sql
-- Roles del sistema
SELECT * FROM rol;
-- id | nombre
-- 1  | BRIGADA
-- 2  | COP
-- 3  | OPERACIONES
-- 4  | ACCIDENTOLOGIA
-- 5  | ENCARGADO_NOMINAS
-- 6  | ADMIN

-- Asignacion de roles
SELECT * FROM usuario_rol WHERE usuario_id = 16036;

-- Motivos de inactividad
SELECT * FROM catalogo_motivo_inactividad;
-- VACACIONES, REBAJO_MEDICO, SUSPENSION, PERMISO, OTRO
```

---

## Flujo de Asignacion de Roles

1. ENCARGADO_NOMINAS Central inicia sesion
2. Va a Operaciones > Menu > Brigadas
3. Busca el usuario al que quiere asignar rol
4. Click en icono de escudo (Shield)
5. Se abre modal con:
   - Info del usuario
   - Selector de rol
   - Selector de sede (opcional)
   - Checkbox "Es rol principal"
6. Click en "Asignar Rol"
7. Backend valida permisos y crea registro en `usuario_rol`
8. Si es rol principal, actualiza `usuario.rol_id`

---

## Proximos pasos sugeridos

1. **Probar asignacion de roles** con usuario 16036
2. **Crear usuarios ENCARGADO_NOMINAS** para otras sedes (regionales)
3. **Implementar vista de roles** asignados en el modal (mostrar roles actuales)
4. **WebSocket** para tiempo real en COP

---

## Comandos utiles

```bash
# Iniciar proyecto
cd C:\Users\chris\OneDrive\Escritorio\proyectoProvialMovilWeb

# Backend
cd backend && npm run dev

# Web
cd web && npm run dev

# Mobile
cd mobile && npx expo start

# Docker (BD y Redis)
docker ps  # Ver contenedores activos

# Verificar TypeScript
cd backend && npx tsc --noEmit
cd web && npx tsc --noEmit
```

---

## Notas importantes

- El campo `puede_ver_todas_sedes` esta en la tabla `usuario` y se envia en el JWT
- Los ENCARGADO_NOMINAS regionales NO deben poder ver el boton de asignar roles
- Al asignar un rol como "principal", se actualiza el `rol_id` en tabla `usuario`
- La tabla `usuario_rol` permite multiples roles por usuario (sistema preparado para futuro)
