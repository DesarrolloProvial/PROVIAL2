-- Migración 093B: Backfill + Constraints NOT VALID
-- Fecha: PENDIENTE (ejecutar cuando código esté actualizado)
-- Prerequisito: 093A ejecutada + código usando vistas de compatibilidad
--
-- RIESGO: 🟡 MEDIO - Agrega constraints, puede fallar si hay datos inválidos

-- ========================================
-- NO EJECUTAR HASTA QUE:
-- 1. Frontend/API usen v_sede_completa en lugar de sede.departamento/municipio texto
-- 2. Frontend/API usen v_brigada en lugar de tabla brigada directa
-- 3. Frontend/API usen obstruccion_data en lugar de obstruccion_detalle
-- ========================================

-- ========================================
-- BLOQUE 1: SEDE - Agregar constraints soft
-- ========================================

-- 1.1 Poblar FKs donde falten (usando campos texto)
/*
UPDATE sede s SET 
    departamento_id = d.id
FROM departamento d 
WHERE s.departamento_id IS NULL 
  AND s.departamento IS NOT NULL 
  AND LOWER(TRIM(s.departamento)) = LOWER(TRIM(d.nombre));

UPDATE sede s SET 
    municipio_id = m.id
FROM municipio m 
WHERE s.municipio_id IS NULL 
  AND s.municipio IS NOT NULL 
  AND LOWER(TRIM(s.municipio)) = LOWER(TRIM(m.nombre));
*/

-- 1.2 Constraint NOT VALID (no valida datos existentes, solo nuevos)
/*
ALTER TABLE sede 
ADD CONSTRAINT sede_departamento_id_not_null 
CHECK (departamento_id IS NOT NULL) NOT VALID;

-- Después de verificar que no hay NULLs:
-- ALTER TABLE sede VALIDATE CONSTRAINT sede_departamento_id_not_null;
*/

-- ========================================
-- BLOQUE 2: BRIGADA → USUARIO - Vincular huérfanos
-- ========================================

-- 2.1 Vincular brigadas con usuarios por chapa
/*
UPDATE brigada b SET 
    usuario_id = u.id
FROM usuario u 
WHERE b.usuario_id IS NULL 
  AND b.codigo IS NOT NULL 
  AND u.chapa = b.codigo;
*/

-- 2.2 Vincular brigadas con usuarios por nombre
/*
UPDATE brigada b SET 
    usuario_id = u.id
FROM usuario u 
WHERE b.usuario_id IS NULL 
  AND b.nombre IS NOT NULL 
  AND LOWER(TRIM(b.nombre)) = LOWER(TRIM(u.nombre_completo));
*/

-- 2.3 Reporte de brigadas huérfanas (sin usuario)
/*
SELECT b.id, b.nombre, b.codigo, b.sede_id
FROM brigada b
WHERE b.usuario_id IS NULL
ORDER BY b.id;
*/

-- ========================================
-- BLOQUE 3: INCIDENTE - Limpiar obstrucción duplicada
-- ========================================

-- 3.1 Ya se hizo backfill en 093A, verificar:
/*
SELECT COUNT(*) AS con_ambos
FROM incidente 
WHERE obstruccion_data IS NOT NULL AND obstruccion_detalle IS NOT NULL;
*/

-- 3.2 Si todos los datos están en obstruccion_data, marcar detalle como NULL
/*
UPDATE incidente SET 
    obstruccion_detalle = NULL
WHERE obstruccion_data IS NOT NULL AND obstruccion_detalle IS NOT NULL;
*/

-- ========================================
-- BLOQUE 4: PERMISOS - Migrar JSONB a tabla
-- ========================================

-- 4.1 Primero revisar diagnóstico:
-- SELECT * FROM v_rol_permisos_diagnostico WHERE estado LIKE 'LEGACY%';

-- 4.2 Migrar permisos de JSONB a tabla (CUIDADO: depende de tu estructura JSONB)
/*
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
CROSS JOIN LATERAL jsonb_array_elements_text(r.permisos) AS perm_codigo
JOIN permiso p ON p.codigo = perm_codigo
WHERE r.permisos IS NOT NULL 
  AND r.permisos != '[]'::JSONB
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
*/

-- ========================================
-- FIN MIGRACIÓN 093B
-- ========================================
