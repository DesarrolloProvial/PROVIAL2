-- 100_final_catalog_adjustment.sql

BEGIN;

-- 1. LIMPIEZA DE SITUACIONES (Desactivar las no pedidas)
UPDATE catalogo_tipo_situacion SET activo = false 
WHERE nombre IN (
    'Retirando señalización', 'Regulación en aeropuerto', 'Denuncia de usuario', 
    'Apoyo a báscula', 'Escoltando Autoridades', 'Bloqueo', 'Manifestación', 
    'Orden del Día', 'Intercambio de tripulantes'
);

-- 2. ASEGURAR SITUACIONES ACTIVAS
DO $$
DECLARE
    cat_operativo INT;
BEGIN
    SELECT id INTO cat_operativo FROM catalogo_categoria_situacion WHERE codigo = 'OPERATIVO' LIMIT 1;
    -- Si no existe categoria OPERATIVO, fallback a OTROS (id 1 usualmente) o alguna existente
    IF cat_operativo IS NULL THEN
         SELECT id INTO cat_operativo FROM catalogo_categoria_situacion LIMIT 1;
    END IF;

    -- Activar masivamente por nombre las que ya existen
    UPDATE catalogo_tipo_situacion SET activo = true WHERE nombre IN (
        'Puesto fijo', 'Parada estratégica', 'Señalizando', 'Lavado de unidad', 
        'Regulación de tránsito', 'Patrullaje de Ruta', 'Parada Autorizada', 
        'Baño', 'Cajero', 'Comida', 'Conteo vehicular', 'Toma de velocidad',
        'Escoltando carga ancha', 'Operativo con PNC-DT', 'Operativo interinstitucional',
        'Operativo Provial', 'Consignación', 'Falla Mecánica de unidad', 'Hospital',
        'Compañero enfermo', 'Dejando personal administrativo', 'Comisión', 'Abastecimiento',
        'Regulación colonia', 'Verificación de situación', 'Supervisando unidad'
    );
    
    -- Activar Apoyos
    UPDATE catalogo_tipo_situacion SET activo = true WHERE nombre LIKE 'Apoyo a %';

    -- Insertar NUEVAS si no existen (Lógica segura sin ON CONFLICT)
    IF NOT EXISTS (SELECT 1 FROM catalogo_tipo_situacion WHERE nombre = 'Regulación colonia') THEN
        INSERT INTO catalogo_tipo_situacion (nombre, categoria_id, activo, icono) 
        VALUES ('Regulación colonia', cat_operativo, true, 'traffic-light');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM catalogo_tipo_situacion WHERE nombre = 'Verificación de situación') THEN
        INSERT INTO catalogo_tipo_situacion (nombre, categoria_id, activo, icono) 
        VALUES ('Verificación de situación', cat_operativo, true, 'eye-check');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM catalogo_tipo_situacion WHERE nombre = 'Supervisando unidad') THEN
        INSERT INTO catalogo_tipo_situacion (nombre, categoria_id, activo, icono) 
        VALUES ('Supervisando unidad', cat_operativo, true, 'account-supervisor');
    END IF;

END $$;

-- 3. AJUSTES AUXILIARES
DO $$
BEGIN
    -- Verificar si existe Caída de árbol en tipo_hecho
    IF EXISTS (SELECT 1 FROM tipo_hecho WHERE nombre = 'Caída de árbol') THEN
        UPDATE tipo_hecho SET activo = true, es_accidente = true WHERE nombre = 'Caída de árbol';
    ELSE
        INSERT INTO tipo_hecho (nombre, activo, es_accidente) VALUES ('Caída de árbol', true, true);
    END IF;
END $$;

-- Emergencias: Remover Manifestación y Bloqueo
UPDATE tipo_emergencia_vial SET activo = false WHERE codigo IN ('MANIFESTACION', 'BLOQUEO');

COMMIT;
