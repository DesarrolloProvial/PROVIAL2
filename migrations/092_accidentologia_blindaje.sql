-- Migración 092: Blindaje Accidentología (Concurrencia + Integridad)
-- Fecha: 2026-01-12
-- Prerequisito: 091_integracion_accidentologia.sql
--
-- CAMBIOS:
-- 1. Tabla de secuencias atómica por (sede, año)
-- 2. Función mejorada usando año del incidente
-- 3. UNIQUE en codigo_boleta
-- 4. ON DELETE CASCADE en hoja_accidentologia.incidente_id
-- 5. Solo 1 causa principal por incidente
-- 6. CHECKs condicionales para consignaciones
-- 7. Índices para reportes

-- ========================================
-- 1. TABLA DE SECUENCIAS POR SEDE/AÑO (Concurrencia atómica)
-- ========================================

CREATE TABLE IF NOT EXISTS boleta_secuencia (
    sede_id INT NOT NULL REFERENCES sede(id) ON DELETE RESTRICT,
    anio INT NOT NULL,
    ultimo INT NOT NULL DEFAULT 0,
    PRIMARY KEY (sede_id, anio)
);

COMMENT ON TABLE boleta_secuencia IS 'Secuencias atómicas para generación de boletas. Previene colisiones en concurrencia.';

-- Migrar secuencias existentes (si ya hay incidentes con boleta)
INSERT INTO boleta_secuencia (sede_id, anio, ultimo)
SELECT 
    u.sede_id,
    EXTRACT(YEAR FROM i.fecha_hora_aviso)::INT,
    MAX(i.numero_boleta_secuencia)
FROM incidente i
JOIN unidad u ON i.unidad_id = u.id
WHERE i.numero_boleta IS NOT NULL 
  AND i.numero_boleta_secuencia IS NOT NULL
  AND u.sede_id IS NOT NULL
GROUP BY u.sede_id, EXTRACT(YEAR FROM i.fecha_hora_aviso)::INT
ON CONFLICT (sede_id, anio) DO UPDATE 
SET ultimo = GREATEST(boleta_secuencia.ultimo, EXCLUDED.ultimo);

-- ========================================
-- 2. FUNCIÓN MEJORADA (Atómica + Usa año del incidente)
-- ========================================

CREATE OR REPLACE FUNCTION fn_generar_numero_boleta(p_sede_id INT, p_fecha TIMESTAMPTZ)
RETURNS TABLE(numero TEXT, secuencia INT) AS $$
DECLARE
    v_codigo_sede VARCHAR(10);
    v_anio INT;
    v_secuencia INT;
BEGIN
    -- Obtener código de sede
    SELECT codigo_boleta INTO v_codigo_sede FROM sede WHERE id = p_sede_id;
    
    IF v_codigo_sede IS NULL THEN
        RAISE EXCEPTION 'Sede % no tiene codigo_boleta definido', p_sede_id;
    END IF;
    
    -- Usar año de la fecha del incidente (no CURRENT_DATE)
    v_anio := EXTRACT(YEAR FROM COALESCE(p_fecha, CURRENT_TIMESTAMP))::INT;
    
    -- UPSERT atómico
    INSERT INTO boleta_secuencia (sede_id, anio, ultimo)
    VALUES (p_sede_id, v_anio, 1)
    ON CONFLICT (sede_id, anio)
    DO UPDATE SET ultimo = boleta_secuencia.ultimo + 1
    RETURNING ultimo INTO v_secuencia;
    
    -- Formatear
    numero := v_codigo_sede || '-' || v_anio || '-' || LPAD(v_secuencia::TEXT, 4, '0');
    secuencia := v_secuencia;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_generar_numero_boleta(INT, TIMESTAMPTZ) IS 'Genera número de boleta atómico. Usa año de la fecha proporcionada.';

-- ========================================
-- 3. TRIGGER MEJORADO (Usa fecha_hora_aviso)
-- ========================================

CREATE OR REPLACE FUNCTION tr_fn_generar_boleta_incidente()
RETURNS TRIGGER AS $$
DECLARE
    v_sede_id INT;
    v_resultado RECORD;
BEGIN
    -- Solo generar si numero_boleta es NULL y hay unidad asignada
    IF NEW.numero_boleta IS NULL AND NEW.unidad_id IS NOT NULL THEN
        -- Obtener sede de la unidad
        SELECT sede_id INTO v_sede_id FROM unidad WHERE id = NEW.unidad_id;
        
        IF v_sede_id IS NOT NULL THEN
            -- Usar fecha del incidente para determinar el año
            SELECT * INTO v_resultado 
            FROM fn_generar_numero_boleta(v_sede_id, NEW.fecha_hora_aviso);
            
            NEW.numero_boleta := v_resultado.numero;
            NEW.numero_boleta_secuencia := v_resultado.secuencia;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION tr_fn_generar_boleta_incidente() IS 'Auto-genera boleta usando año de fecha_hora_aviso. Atomico via boleta_secuencia.';

-- ========================================
-- 4. UNIQUE EN codigo_boleta (Prevenir duplicados)
-- ========================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sede_codigo_boleta_unique'
    ) THEN
        ALTER TABLE sede ADD CONSTRAINT sede_codigo_boleta_unique UNIQUE (codigo_boleta);
    END IF;
END $$;

-- Nota: NOT NULL se agrega después de verificar que todas las sedes tienen código
-- ALTER TABLE sede ALTER COLUMN codigo_boleta SET NOT NULL;

-- ========================================
-- 5. ON DELETE CASCADE EN hoja_accidentologia.incidente_id
-- ========================================

-- Verificar si la columna existe primero
DO $$
BEGIN
    -- Si la columna incidente_id existe, recrear FK con CASCADE
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hoja_accidentologia' 
        AND column_name = 'incidente_id'
    ) THEN
        -- Eliminar FK existente si la hay (ignorar error si no existe)
        BEGIN
            ALTER TABLE hoja_accidentologia 
            DROP CONSTRAINT IF EXISTS hoja_accidentologia_incidente_id_fkey;
        EXCEPTION WHEN undefined_object THEN
            NULL; -- Ignorar si no existe
        END;
        
        -- Agregar FK con CASCADE
        ALTER TABLE hoja_accidentologia 
        ADD CONSTRAINT hoja_accidentologia_incidente_id_fkey 
        FOREIGN KEY (incidente_id) REFERENCES incidente(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'FK hoja_accidentologia_incidente_id_fkey recreada con CASCADE';
    ELSE
        RAISE NOTICE 'Columna incidente_id no existe en hoja_accidentologia, saltando...';
    END IF;
END $$;


-- ========================================
-- 6. SOLO 1 CAUSA PRINCIPAL POR INCIDENTE
-- ========================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_incidente_causa_principal
ON incidente_causa (incidente_id)
WHERE es_causa_principal IS TRUE;

COMMENT ON INDEX uq_incidente_causa_principal IS 'Garantiza máximo 1 causa principal por incidente';

-- ========================================
-- 7. CHECKs CONDICIONALES (Consignaciones coherentes)
-- ========================================

-- Si doc_consignado_licencia O doc_consignado_tarjeta → doc_consignado_por requerido
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'vehiculo_acc_doc_consig_coherente'
    ) THEN
        ALTER TABLE vehiculo_accidente ADD CONSTRAINT vehiculo_acc_doc_consig_coherente 
            CHECK (
                (doc_consignado_licencia = FALSE AND doc_consignado_tarjeta = FALSE)
                OR doc_consignado_por IS NOT NULL
            );
    END IF;
END $$;

-- Si vehiculo_consignado → vehiculo_consignado_por requerido
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'vehiculo_acc_vehiculo_consig_coherente'
    ) THEN
        ALTER TABLE vehiculo_accidente ADD CONSTRAINT vehiculo_acc_vehiculo_consig_coherente 
            CHECK (
                vehiculo_consignado = FALSE 
                OR vehiculo_consignado_por IS NOT NULL
            );
    END IF;
END $$;

-- Si conductor_consignado → conductor_consignado_por requerido
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'vehiculo_acc_conductor_consig_coherente'
    ) THEN
        ALTER TABLE vehiculo_accidente ADD CONSTRAINT vehiculo_acc_conductor_consig_coherente 
            CHECK (
                conductor_consignado = FALSE 
                OR conductor_consignado_por IS NOT NULL
            );
    END IF;
END $$;

-- ========================================
-- 8. ÍNDICES PARA REPORTES
-- ========================================

-- Filtrar por fecha (dashboards, reportes por periodo)
CREATE INDEX IF NOT EXISTS idx_incidente_fecha_hora_aviso ON incidente(fecha_hora_aviso);

-- Filtrar por ruta+km (puntos calientes, reportes geográficos)
CREATE INDEX IF NOT EXISTS idx_incidente_ruta_km ON incidente(ruta_id, km);

-- Filtrar por tipo de accidente
CREATE INDEX IF NOT EXISTS idx_hoja_acc_tipo_accidente ON hoja_accidentologia(tipo_accidente);

-- Filtrar por sede (reportes por sede)
CREATE INDEX IF NOT EXISTS idx_incidente_sede ON incidente(unidad_id);

-- Causas por incidente
CREATE INDEX IF NOT EXISTS idx_incidente_causa_principal ON incidente_causa(incidente_id) WHERE es_causa_principal IS TRUE;

-- ========================================
-- FIN MIGRACIÓN 092
-- ========================================
