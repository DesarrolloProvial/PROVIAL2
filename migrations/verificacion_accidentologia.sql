-- Verificación Post-Migración Accidentología
-- Ejecutar después de 091 + hotfix + 092
-- Cada query debe retornar "OK" o valores válidos

\echo '=== VERIFICACIÓN ACCIDENTOLOGÍA ==='
\echo ''

-- 1. Columnas en tipo_hecho
\echo '1. tipo_hecho tiene columna codigo:'
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tipo_hecho' AND column_name = 'codigo'
) THEN 'OK ✓' ELSE 'FALTA ✗' END AS resultado;

-- 2. Columnas en tipo_vehiculo
\echo '2. tipo_vehiculo tiene columna codigo:'
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tipo_vehiculo' AND column_name = 'codigo'
) THEN 'OK ✓' ELSE 'FALTA ✗' END AS resultado;

-- 3. Tabla incidente_causa existe
\echo '3. Tabla incidente_causa existe:'
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'incidente_causa'
) THEN 'OK ✓' ELSE 'FALTA ✗' END AS resultado;

-- 4. Tabla boleta_secuencia existe
\echo '4. Tabla boleta_secuencia existe:'
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'boleta_secuencia'
) THEN 'OK ✓' ELSE 'FALTA ✗' END AS resultado;

-- 5. Columnas boleta en incidente
\echo '5. incidente tiene numero_boleta y secuencia:'
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incidente' AND column_name = 'numero_boleta'
) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incidente' AND column_name = 'numero_boleta_secuencia'
) THEN 'OK ✓' ELSE 'FALTA ✗' END AS resultado;

-- 6. Vista v_accidentologia_completa existe
\echo '6. Vista v_accidentologia_completa existe:'
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_name = 'v_accidentologia_completa'
) THEN 'OK ✓' ELSE 'FALTA ✗' END AS resultado;

-- 7. Trigger de boleta existe
\echo '7. Trigger tr_generar_boleta_incidente existe:'
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'tr_generar_boleta_incidente'
) THEN 'OK ✓' ELSE 'FALTA ✗' END AS resultado;

-- 8. Función fn_generar_numero_boleta existe
\echo '8. Función fn_generar_numero_boleta existe:'
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'fn_generar_numero_boleta'
) THEN 'OK ✓' ELSE 'FALTA ✗' END AS resultado;

-- 9. UNIQUE en numero_boleta
\echo '9. Constraint UNIQUE en incidente.numero_boleta:'
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'incidente_numero_boleta_unique'
) THEN 'OK ✓' ELSE 'FALTA ✗' END AS resultado;

-- 10. UNIQUE en codigo_boleta de sede
\echo '10. Constraint UNIQUE en sede.codigo_boleta:'
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sede_codigo_boleta_unique'
) THEN 'OK ✓' ELSE 'FALTA ✗' END AS resultado;

-- 11. Catálogos poblados
\echo '11. Catálogos de accidentología poblados:'
SELECT 
    (SELECT COUNT(*) FROM causa_hecho_transito) AS causas,
    (SELECT COUNT(*) FROM estado_via) AS estados_via,
    (SELECT COUNT(*) FROM topografia_via) AS topografias,
    (SELECT COUNT(*) FROM geometria_via) AS geometrias,
    (SELECT COUNT(*) FROM dispositivo_seguridad) AS dispositivos;

-- 12. Sedes con codigo_boleta
\echo '12. Sedes con codigo_boleta asignado:'
SELECT id, nombre, codigo_boleta FROM sede WHERE codigo_boleta IS NOT NULL ORDER BY id;

-- 13. Tipos de hecho nuevos
\echo '13. Nuevos tipos de hecho (con codigo):'
SELECT codigo, nombre FROM tipo_hecho 
WHERE codigo IN ('CAIDA', 'DERRAPE', 'SALIDA_PISTA', 'ATAQUE_ARMADO', 'DESPRENDIMIENTO');

-- 14. Tipos de vehículo nuevos
\echo '14. Nuevos tipos de vehículo (con codigo):'
SELECT codigo, nombre FROM tipo_vehiculo 
WHERE codigo IN ('MOTOBICICLETA', 'MOTOTAXI', 'CISTERNA', 'TRACTOR', 'CAMIONETA_AGRICOLA', 'GRUA', 'SIN_DATOS');

-- 15. Test de generación de boleta (solo si hay unidades)
\echo '15. Test generación boleta (simulación):'
DO $$
DECLARE
    v_sede_id INT;
    v_resultado RECORD;
BEGIN
    SELECT id INTO v_sede_id FROM sede WHERE codigo_boleta IS NOT NULL LIMIT 1;
    IF v_sede_id IS NOT NULL THEN
        SELECT * INTO v_resultado FROM fn_generar_numero_boleta(v_sede_id, NOW());
        RAISE NOTICE 'Boleta generada: % (secuencia: %)', v_resultado.numero, v_resultado.secuencia;
    ELSE
        RAISE NOTICE 'No hay sedes con codigo_boleta para probar';
    END IF;
END $$;

\echo ''
\echo '=== FIN VERIFICACIÓN ==='
