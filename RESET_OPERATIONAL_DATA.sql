-- =====================================================
-- SCRIPT DE REINICIO DE DATOS OPERACIONALES
-- =====================================================
-- Propósito: Limpiar datos de prueba manteniendo configuración base
-- 
-- ✅ MANTIENE:
--    - Usuarios y brigadas
--    - Unidades y su información
--    - Rutas
--    - Sedes
--    - Departamentos
--    - Configuraciones del sistema
--
-- ❌ ELIMINA:
--    - Turnos y asignaciones
--    - Salidas de unidad
--    - Situaciones y eventos
--    - Movimientos de unidad
--    - Registros de combustible
--    - Avisos
--    - Tripulaciones
-- =====================================================

BEGIN;

-- Mostrar conteo ANTES del reset
SELECT '=== CONTEO ANTES DEL RESET ===' as info;

SELECT 
  'Turnos' as tabla,
  COUNT(*) as registros
FROM turno
UNION ALL
SELECT 'Asignaciones', COUNT(*) FROM asignacion_unidad
UNION ALL
SELECT 'Tripulaciones', COUNT(*) FROM tripulacion_turno
UNION ALL
SELECT 'Salidas', COUNT(*) FROM salida_unidad
UNION ALL
SELECT 'Situaciones', COUNT(*) FROM situacion
UNION ALL
SELECT 'Eventos Persistentes', COUNT(*) FROM evento_persistente
UNION ALL
SELECT 'Movimientos', COUNT(*) FROM movimiento_unidad
UNION ALL
SELECT 'Registros Combustible', COUNT(*) FROM registro_combustible
UNION ALL
SELECT 'Avisos', COUNT(*) FROM aviso
ORDER BY tabla;

-- =====================================================
-- ELIMINAR DATOS OPERACIONALES
-- =====================================================

-- 1. Eliminar avisos (dependen de asignaciones)
DELETE FROM aviso;

-- 2. Eliminar registros de combustible
DELETE FROM registro_combustible;

-- 3. Eliminar movimientos de unidad
DELETE FROM movimiento_unidad;

-- 4. Eliminar eventos persistentes
DELETE FROM evento_persistente;

-- 5. Eliminar situaciones (dependen de salidas)
DELETE FROM situacion;

-- 6. Eliminar salidas de unidad
DELETE FROM salida_unidad;

-- 7. Eliminar tripulaciones (dependen de asignaciones)
DELETE FROM tripulacion_turno;

-- 8. Eliminar asignaciones de unidad
DELETE FROM asignacion_unidad;

-- 9. Eliminar turnos
DELETE FROM turno;

-- =====================================================
-- RESETEAR SECUENCIAS (OPCIONAL)
-- =====================================================
-- Descomentar si quieres que los IDs empiecen desde 1

-- ALTER SEQUENCE turno_id_seq RESTART WITH 1;
-- ALTER SEQUENCE asignacion_unidad_id_seq RESTART WITH 1;
-- ALTER SEQUENCE tripulacion_turno_id_seq RESTART WITH 1;
-- ALTER SEQUENCE salida_unidad_id_seq RESTART WITH 1;
-- ALTER SEQUENCE situacion_id_seq RESTART WITH 1;
-- ALTER SEQUENCE evento_persistente_id_seq RESTART WITH 1;
-- ALTER SEQUENCE movimiento_unidad_id_seq RESTART WITH 1;
-- ALTER SEQUENCE registro_combustible_id_seq RESTART WITH 1;
-- ALTER SEQUENCE aviso_id_seq RESTART WITH 1;

-- =====================================================
-- LIMPIAR CAMPOS DE ESTADO EN UNIDADES
-- =====================================================
-- Resetear campos operacionales de unidades

UPDATE unidad SET
  ultima_ubicacion = NULL,
  ultima_actualizacion_gps = NULL,
  odometro_actual = odometro_inicial,
  combustible_actual = NULL,
  en_servicio = false
WHERE en_servicio = true OR ultima_ubicacion IS NOT NULL;

-- =====================================================
-- VERIFICACIÓN POST-RESET
-- =====================================================

SELECT '=== CONTEO DESPUÉS DEL RESET ===' as info;

SELECT 
  'Turnos' as tabla,
  COUNT(*) as registros
FROM turno
UNION ALL
SELECT 'Asignaciones', COUNT(*) FROM asignacion_unidad
UNION ALL
SELECT 'Tripulaciones', COUNT(*) FROM tripulacion_turno
UNION ALL
SELECT 'Salidas', COUNT(*) FROM salida_unidad
UNION ALL
SELECT 'Situaciones', COUNT(*) FROM situacion
UNION ALL
SELECT 'Eventos Persistentes', COUNT(*) FROM evento_persistente
UNION ALL
SELECT 'Movimientos', COUNT(*) FROM movimiento_unidad
UNION ALL
SELECT 'Registros Combustible', COUNT(*) FROM registro_combustible
UNION ALL
SELECT 'Avisos', COUNT(*) FROM aviso
ORDER BY tabla;

-- Verificar que datos maestros se mantienen
SELECT '=== DATOS MAESTROS PRESERVADOS ===' as info;

SELECT 
  'Usuarios' as tabla,
  COUNT(*) as registros
FROM usuario
UNION ALL
SELECT 'Unidades', COUNT(*) FROM unidad
UNION ALL
SELECT 'Rutas', COUNT(*) FROM ruta
UNION ALL
SELECT 'Sedes', COUNT(*) FROM sede
UNION ALL
SELECT 'Departamentos', COUNT(*) FROM departamento
ORDER BY tabla;

COMMIT;

-- =====================================================
-- MENSAJE FINAL
-- =====================================================
SELECT '✅ Reset completado exitosamente' as resultado;
SELECT 'Datos operacionales eliminados, datos maestros preservados' as detalle;
