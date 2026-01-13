-- 101_cleanup_situation_catalog.sql
-- Limpieza final del catálogo de situaciones

BEGIN;

-- 1. ELIMINAR tipos de incidentes del menú "Otra Situación"
--    (Se reportan desde pantallas dedicadas: Hecho de Tránsito, Asistencia, Emergencia)
UPDATE catalogo_tipo_situacion SET activo = false 
WHERE nombre IN (
    'Accidente de Tránsito',
    'Asistencia Vial',
    'Emergencia / Obstáculo'
);

-- 2. ELIMINAR situaciones prohibidas del menú "Otra Situación"
UPDATE catalogo_tipo_situacion SET activo = false 
WHERE nombre IN (
    'Intercambio de tripulantes',
    'Salida de Unidad',
    'Entrada de unidad', 
    'Cambio de Ruta',
    'Cambio de Tripulación',
    'Retirando señalización',
    'Regulación en aeropuerto',
    'Denuncia de usuario',
    'Apoyo a báscula',
    'Escoltando Autoridades',
    'Bloqueo',
    'Manifestación',
    'Orden del Día'
);

-- 3. ASEGURAR que todos los tipos de accidente estén en tipo_hecho
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'Colisión',
        'Choque',
        'Salida de pista',
        'Derrape',
        'Caída de carga',
        'Desprendimiento de carga',
        'Desbalance de carga',
        'Desprendimiento de neumático',
        'Desprendimiento de eje',
        'Vehículo incendiado',
        'Ataque armado',
        'Vuelco',
        'Atropello',
        'Persona Fallecida',
        'Caída de árbol'
    ] LOOP
        IF NOT EXISTS (SELECT 1 FROM tipo_hecho WHERE nombre = t) THEN
            INSERT INTO tipo_hecho (nombre, activo) VALUES (t, true);
        ELSE
            UPDATE tipo_hecho SET activo = true WHERE nombre = t;
        END IF;
    END LOOP;
END$$;

-- 4. ASEGURAR tipos de asistencia
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'Mecánica',
        'Combustible',
        'Seguridad',
        'Neumático',
        'Eléctrica',
        'Grúa',
        'Otros'
    ] LOOP
        IF NOT EXISTS (SELECT 1 FROM tipo_asistencia_vial WHERE nombre = t) THEN
            INSERT INTO tipo_asistencia_vial (nombre, activo) VALUES (t, true);
        ELSE
            UPDATE tipo_asistencia_vial SET activo = true WHERE nombre = t;
        END IF;
    END LOOP;
END$$;

-- 5. ASEGURAR tipos de emergencia (sin Manifestación ni Bloqueo)
-- Ya están en migración 098, solo actualizar activos
UPDATE tipo_emergencia_vial SET activo = true 
WHERE codigo IN (
    'DERRAME', 'ABANDONADO', 'DETENCION', 'ARBOL', 'ROCAS', 
    'DERRUMBE', 'DESLAVE', 'DESLIZAMIENTO', 'HUNDIMIENTO', 
    'SOCAVAMIENTO', 'DESBORDAMIENTO', 'INUNDACION', 'AGUA', 'ERUPCION'
);

-- Asegurar que Manifestación y Bloqueo estén desactivados
UPDATE tipo_emergencia_vial SET activo = false WHERE codigo IN ('MANIFESTACION', 'BLOQUEO');

COMMIT;
