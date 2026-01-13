# Checklist Pre-Ejecución: Migraciones 093B y 093C

## Estado Actual
- **093A**: ✅ Ejecutada (2026-01-12)
- **093B**: 📋 Pendiente
- **093C**: 📋 Pendiente

---

## 093B - Backfill + Constraints

### Verificaciones Previas (TODAS deben pasar)

#### 1. Código usa v_sede_completa en lugar de sede.departamento/municipio texto
```sql
-- Ejecutar: debe retornar 0 filas
SELECT * FROM v_sede_completa WHERE tiene_inconsistencia_depto OR tiene_inconsistencia_muni;
```
**Resultado esperado:** 0 filas (sin inconsistencias)

#### 2. Código usa v_brigada en lugar de tabla brigada directa
```sql
-- Ejecutar: revisar brigadas sin usuario vinculado
SELECT COUNT(*) FROM v_brigada WHERE NOT tiene_usuario_vinculado;
```
**Resultado esperado:** 0 o número aceptable de brigadas legacy

#### 3. No hay inconsistencias brigada↔usuario
```sql
SELECT * FROM v_brigada WHERE tiene_inconsistencia;
```
**Resultado esperado:** 0 filas

#### 4. obstruccion_detalle ya migrado a obstruccion_data
```sql
SELECT COUNT(*) FROM incidente 
WHERE obstruccion_detalle IS NOT NULL AND obstruccion_data IS NULL;
```
**Resultado esperado:** 0 (todos migrados)

#### 5. Sistema de permisos unificado
```sql
SELECT * FROM v_rol_permisos_diagnostico WHERE estado LIKE 'CONFLICTO%';
```
**Resultado esperado:** 0 filas (nadie usa ambos sistemas)

### Checklist Frontend/API
- [ ] API no lee `sede.departamento` (texto) - usa FK + JOIN
- [ ] API no lee `sede.municipio` (texto) - usa FK + JOIN
- [ ] API no lee `incidente.obstruccion_detalle` - usa `obstruccion_data`
- [ ] App móvil usa endpoints actualizados
- [ ] COP usa endpoints actualizados

### Aprobación 093B
- [ ] Todas las queries retornan 0 inconsistencias
- [ ] Checklist frontend/API completado
- [ ] Backup de BD realizado
- [ ] Probado en staging

---

## 093C - Limpieza Final (DROP)

### Verificaciones Previas (TODAS deben pasar)

#### 1. Nadie lee campos texto de sede
```bash
# Buscar en código: no debe haber uso directo
grep -r "sede.departamento" --include="*.ts" --include="*.tsx" --include="*.js"
grep -r "sede.municipio" --include="*.ts" --include="*.tsx" --include="*.js"
```
**Resultado esperado:** 0 matches (o solo en comentarios/documentación)

#### 2. Nadie lee tabla brigada directamente
```bash
grep -r "FROM brigada" --include="*.ts" --include="*.sql"
grep -r "brigada\." --include="*.ts" --include="*.tsx"
```
**Resultado esperado:** 0 matches en código activo

#### 3. obstruccion_detalle no se usa
```bash
grep -r "obstruccion_detalle" --include="*.ts" --include="*.tsx"
```
**Resultado esperado:** 0 matches

#### 4. Sistema estable por al menos 2 semanas
- [ ] Fecha de 093A: 2026-01-12
- [ ] Fecha mínima para 093C: 2026-01-26
- [ ] Sin errores relacionados en logs

### Checklist Final
- [ ] Backup COMPLETO de BD realizado
- [ ] Script de rollback preparado (093C_rollback.sql)
- [ ] Probado en staging
- [ ] Confirmación de stakeholders

### Aprobación 093C
- [ ] Todas las verificaciones pasaron
- [ ] 2+ semanas sin incidentes
- [ ] Backup verificado

---

## Script de Verificación Rápida

Ejecutar antes de cada migración:

```sql
-- verificacion_pre_093.sql
\echo '=== VERIFICACIÓN PRE-093B/C ==='

\echo '1. Inconsistencias sede:'
SELECT COUNT(*) AS inconsistencias_sede 
FROM v_sede_completa 
WHERE tiene_inconsistencia_depto OR tiene_inconsistencia_muni;

\echo '2. Brigadas sin usuario:'
SELECT COUNT(*) AS brigadas_huerfanas 
FROM v_brigada 
WHERE NOT tiene_usuario_vinculado;

\echo '3. Inconsistencias brigada↔usuario:'
SELECT COUNT(*) AS inconsistencias_brigada 
FROM v_brigada 
WHERE tiene_inconsistencia;

\echo '4. obstruccion_detalle sin migrar:'
SELECT COUNT(*) AS sin_migrar 
FROM incidente 
WHERE obstruccion_detalle IS NOT NULL AND obstruccion_data IS NULL;

\echo '5. Conflictos permisos:'
SELECT COUNT(*) AS conflictos_permisos 
FROM v_rol_permisos_diagnostico 
WHERE estado LIKE 'CONFLICTO%';

\echo ''
\echo 'Si todos son 0 → OK para ejecutar 093B'
\echo 'Si todos son 0 + 2 semanas estable → OK para 093C'
```

---

## Notas
- No ejecutar 093C sin haber pasado 093B primero
- Mantener vistas de compatibilidad hasta confirmar que nada las usa
- En caso de duda, NO ejecutar
