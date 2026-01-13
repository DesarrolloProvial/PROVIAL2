-- 100_final_catalog_adjustment.sql

BEGIN;

-- 1. LIMPIEZA DE SITUACIONES (Desactivar las no pedidas)
UPDATE catalogo_tipo_situacion SET activo = false 
WHERE nombre IN (
    'Retirando señalización', 'Regulación en aeropuerto', 'Denuncia de usuario', 
    'Apoyo a báscula', 'Escoltando Autoridades', 'Bloqueo', 'Manifestación', 
    'Orden del Día', 'Intercambio de tripulantes'
);

-- 2. ASEGURAR SITUACIONES ACTIVAS (Las pedidas)
-- Insertamos o actualizamos para asegurar existencia
DO $$
DECLARE
    cat_operativo INT;
    cat_apoyo INT;
    cat_servicios INT;
BEGIN
    SELECT id INTO cat_operativo FROM catalogo_categoria_situacion WHERE codigo = 'OPERATIVO' LIMIT 1;
    SELECT id INTO cat_apoyo FROM catalogo_categoria_situacion WHERE codigo = 'APOYO' LIMIT 1;
    SELECT id INTO cat_servicios FROM catalogo_categoria_situacion WHERE codigo = 'SERVICIOS' LIMIT 1;

    -- Situaciones Grupo 1 y Varias
    PERFORM 1; -- Dummy
    
    -- Insertar/Actualizar una por una o en bloque si ya existen
    UPDATE catalogo_tipo_situacion SET activo = true WHERE nombre IN (
        'Puesto fijo', 'Parada estratégica', 'Señalizando', 'Lavado de unidad', 
        'Regulación de tránsito', 'Patrullaje de Ruta', 'Parada Autorizada', 
        'Baño', 'Cajero', 'Comida', 'Conteo vehicular', 'Toma de velocidad',
        'Escoltando carga ancha', 'Operativo con PNC-DT', 'Operativo interinstitucional',
        'Operativo Provial', 'Consignación', 'Falla Mecánica de unidad', 'Hospital',
        'Compañero enfermo', 'Dejando personal administrativo', 'Comisión', 'Abastecimiento'
    );
    
    -- Apoyos
    UPDATE catalogo_tipo_situacion SET activo = true WHERE nombre LIKE 'Apoyo a %';

    -- Nuevas que podrian faltar
    INSERT INTO catalogo_tipo_situacion (nombre, categoria_id, activo, icono) VALUES 
    ('Regulación colonia', cat_operativo, true, 'traffic-light'),
    ('Verificación de situación', cat_operativo, true, 'eye-check'),
    ('Supervisando unidad', cat_operativo, true, 'account-supervisor')
    ON CONFLICT (nombre) DO UPDATE SET activo = true;

END $$;

-- 3. AJUSTE DE CATALOGOS AUXILIARES (Selects)

-- Accidentes: Agregar Caída de árbol si no existe
INSERT INTO tipo_hecho (nombre, activo) VALUES ('Caída de árbol', true)
ON CONFLICT (nombre) DO UPDATE SET activo = true;

-- Emergencias: Remover Manifestación y Bloqueo
UPDATE tipo_emergencia_vial SET activo = false WHERE codigo IN ('MANIFESTACION', 'BLOQUEO');

COMMIT;
