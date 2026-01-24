# 🔄 MIGRACIÓN 107: Unificación usuario + brigada

## 📋 Resumen

**Fecha:** 2026-01-22  
**Tipo:** Refactorización de esquema  
**Impacto:** Alto - Afecta estructura core  
**Reversible:** Sí (script de rollback incluido)

---

## 🎯 Objetivo

Unificar las tablas `usuario` y `brigada` en una sola tabla `usuario` optimizada, eliminando duplicación y simplificando el modelo de datos.

**Razón:** Todos los usuarios son brigadas distribuidas en diferentes áreas operativas.

---

## 📊 Cambios en la Estructura

### **ANTES:**
```
usuario (27 columnas)
  ↓ usuario_id (FK)
brigada (15 columnas)
  
Duplicación:
- sede_id
- telefono
- email
- nombre/nombre_completo
```

### **DESPUÉS:**
```
usuario (35 columnas) ✅ Unificada
  
Nuevas columnas desde brigada:
- codigo (VARCHAR, UNIQUE, NOT NULL)
- fecha_nacimiento
- licencia_tipo
- licencia_numero
- licencia_vencimiento
- direccion
- contacto_emergencia
- telefono_emergencia
```

---

## 🔧 Script SQL de Migración

```sql
-- Ver archivo completo en:
-- docs/MIGRACION_107_USUARIO_BRIGADA.sql
```

### **Pasos Principales:**

1. ✅ Agregar columnas de brigada a usuario
2. ✅ Migrar datos con resolución de conflictos
3. ✅ Generar códigos para usuarios sin brigada
4. ✅ Aplicar restricciones (codigo UNIQUE NOT NULL)
5. ✅ Actualizar FKs de otras tablas
6. ✅ Crear índices de performance
7. ✅ Crear vista de compatibilidad temporal
8. ✅ Renombrar brigada a `_brigada_deprecated_backup`

---

## ⚠️ Tablas Afectadas que Necesitan Actualización

### **Backend - Buscar y reemplazar referencias:**

```bash
# Encontrar todas las referencias a brigada_id
grep -r "brigada_id" backend/src/

# Encontrar consultas a tabla brigada
grep -r "FROM brigada" backend/src/
grep -r "JOIN brigada" backend/src/
```

### **Tablas con FK a brigada (por verificar):**

```sql
-- Ejecutar este query para encontrar todas:
SELECT 
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.constraint_name LIKE '%brigada%';
```

**Probables tablas:**
- `asignacion_unidad`
- `salida_unidad`
- `turno`
- Otras por confirmar

---

## 🔄 Script de Rollback

```sql
-- 107_rollback.sql
BEGIN;

-- 1. Recrear tabla brigada desde backup
ALTER TABLE _brigada_deprecated_backup_20260122 
    RENAME TO brigada;

-- 2. Eliminar vista de compatibilidad
DROP VIEW IF EXISTS brigada;

-- 3. Eliminar columnas agregadas a usuario
ALTER TABLE usuario 
    DROP COLUMN IF EXISTS codigo,
    DROP COLUMN IF EXISTS fecha_nacimiento,
    DROP COLUMN IF EXISTS licencia_tipo,
    DROP COLUMN IF EXISTS licencia_numero,
    DROP COLUMN IF EXISTS licencia_vencimiento,
    DROP COLUMN IF EXISTS direccion,
    DROP COLUMN IF EXISTS contacto_emergencia,
    DROP COLUMN IF EXISTS telefono_emergencia;

-- 4. Restaurar FKs (ajustar según tu DB)
-- ...

COMMIT;
```

---

## 📝 Cambios Necesarios en el Código

### **Backend:**

#### **1. Modelos TypeScript**

```typescript
// ANTES:
interface Usuario {
    id: number;
    username: string;
    nombre_completo: string;
    // ...
}

interface Brigada {
    id: number;
    codigo: string;
    usuario_id: number;
    // ...
}

// DESPUÉS: (Unificado)
interface Usuario {
    id: number;
    username: string;
    nombre_completo: string;
    
    // ✅ Campos de brigada ahora aquí:
    codigo: string;
    fecha_nacimiento?: Date;
    licencia_tipo?: string;
    licencia_numero?: string;
    licencia_vencimiento?: Date;
    direccion?: string;
    contacto_emergencia?: string;
    telefono_emergencia?: string;
    
    // ... resto de campos
}
```

#### **2. Controllers/Services**

```typescript
// ANTES:
const brigada = await db.one(`
    SELECT b.*, u.nombre_completo
    FROM brigada b
    JOIN usuario u ON b.usuario_id = u.id
    WHERE b.id = $1
`, [brigadaId]);

// DESPUÉS:
const usuario = await db.one(`
    SELECT *
    FROM usuario
    WHERE id = $1
`, [usuarioId]);
```

#### **3. Endpoints API**

Revisar endpoints que retornan datos de brigada:
- `GET /api/brigadas` → `GET /api/usuarios?rol=brigada`
- `GET /api/brigadas/:id` → `GET /api/usuarios/:id`
- `POST /api/brigadas` → `POST /api/usuarios` (con rol brigada)

---

### **Móvil:**

#### **1. Store/Types**

```typescript
// mobile/src/store/authStore.ts
interface User {
    id: number;
    username: string;
    nombre_completo: string;
    
    // ✅ Agregar campos de brigada:
    codigo: string;
    licencia_numero?: string;
    licencia_vencimiento?: string;
    grupo?: number;
    // ...
}
```

#### **2. API Calls**

```typescript
// ANTES:
const brigada = await api.get(`/brigadas/${id}`);

// DESPUÉS:
const usuario = await api.get(`/usuarios/${id}`);
```

---

## ✅ Checklist de Implementación

### **Fase 1: Preparación**
- [ ] Backup completo de la base de datos
- [ ] Ejecutar query para encontrar todas las FK a brigada
- [ ] Listar todos los archivos backend que usan `brigada`
- [ ] Listar todos los archivos móvil que usan `brigada`

### **Fase 2: Migración DB**
- [ ] Ejecutar migración 107 en ambiente de desarrollo
- [ ] Verificar que no hay usuarios sin código
- [ ] Verificar que datos se migraron correctamente
- [ ] Probar vista de compatibilidad

### **Fase 3: Actualizar Backend**
- [ ] Actualizar modelos TypeScript
- [ ] Actualizar controllers/services
- [ ] Actualizar endpoints API
- [ ] Testing de endpoints modificados

### **Fase 4: Actualizar Móvil**
- [ ] Actualizar types/interfaces
- [ ] Actualizar stores
- [ ] Actualizar componentes que muestran datos de brigada
- [ ] Testing en app

### **Fase 5: Limpieza**
- [ ] Eliminar vista de compatibilidad `brigada`
- [ ] Eliminar tabla backup `_brigada_deprecated_backup_20260122`
- [ ] Actualizar documentación
- [ ] Commit y deploy

---

## ⏱️ Tiempo Estimado

| Fase | Tiempo |
|------|--------|
| Preparación | 1 hora |
| Migración DB | 30 min |
| Backend | 2-3 horas |
| Móvil | 1-2 horas |
| Testing | 2 horas |
| **TOTAL** | **6-8 horas** |

---

## 🚨 Riesgos y Mitigaciones

### **Riesgo 1: Queries rotos en producción**
**Mitigación:** Vista de compatibilidad temporal

### **Riesgo 2: Pérdida de datos**
**Mitigación:** 
- Backup completo antes de migración
- Tabla brigada renombrada, no eliminada
- Script de rollback probado

### **Riesgo 3: FKs huérfanas**
**Mitigación:** Verificación automática en script

---

## 📚 Referencias

- Especificación técnica: `docs/ESPECIFICACION_TECNICA_SITUACIONES.md`
- Script SQL completo: Ver arriba (pendiente de guardar en archivo SQL real)
- Rollback: Script incluido

---

## 🎯 Próximos Pasos

1. **Revisar este documento**
2. **Ejecutar query de FK para encontrar tablas afectadas**
3. **Confirmar que quieres proceder**
4. **Ejecutar migración en desarrollo**
5. **Actualizar código backend/móvil**
6. **Testing completo**
7. **Deploy a producción**

**¿Listo para ejecutar la migración?** 🚀
