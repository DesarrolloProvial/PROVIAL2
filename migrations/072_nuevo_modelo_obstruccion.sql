-- =====================================================
-- MIGRACION 072: NUEVO MODELO DE OBSTRUCCION
-- =====================================================
-- Fecha: 2025-12-30
-- Descripcion:
--   Rediseño completo del modelo de obstrucción para soportar:
--   1. Vehículo fuera de vía (combinable con obstrucción)
--   2. Obstrucción total (del sentido o de ambos sentidos)
--   3. Obstrucción parcial por carril con porcentajes
--   4. Carriles nombrados automáticamente según cantidad
--   5. Datos por sentido (principal y contrario)
-- =====================================================

BEGIN;

-- =====================================================
-- 1. NUEVA TABLA PARA MODELO DE OBSTRUCCION UNIFICADO
-- =====================================================
-- Esta tabla reemplaza el modelo anterior y se usa para:
-- - Situaciones persistentes
-- - Situaciones normales (emergencias)
-- - Incidentes

-- Primero, eliminamos la tabla anterior si existe y la recreamos
-- (guardando datos existentes temporalmente)

-- Backup de datos existentes
CREATE TEMP TABLE IF NOT EXISTS backup_obstruccion_persistente AS
SELECT * FROM obstruccion_situacion_persistente;

-- Eliminar tabla vieja
DROP TABLE IF EXISTS obstruccion_situacion_persistente CASCADE;

-- Nueva tabla con modelo completo
CREATE TABLE obstruccion_situacion_persistente (
    id SERIAL PRIMARY KEY,
    situacion_persistente_id INTEGER NOT NULL REFERENCES situacion_persistente(id) ON DELETE CASCADE,

    -- Vehículo fuera de vía (puede combinarse con obstrucción parcial)
    hay_vehiculo_fuera_via BOOLEAN NOT NULL DEFAULT FALSE,

    -- Tipo de obstrucción principal
    -- 'ninguna' = No obstruye (puede haber vehículo fuera de vía)
    -- 'total_sentido' = Obstrucción total del sentido de la situación
    -- 'total_ambos' = Obstrucción total de ambos sentidos
    -- 'parcial' = Obstrucción parcial por carril
    tipo_obstruccion VARCHAR(20) NOT NULL DEFAULT 'ninguna'
        CHECK (tipo_obstruccion IN ('ninguna', 'total_sentido', 'total_ambos', 'parcial')),

    -- Datos del sentido principal (el sentido de la situación)
    -- cantidad_carriles: 1-5
    -- carriles: array con { nombre, porcentaje }
    sentido_principal JSONB DEFAULT '{"cantidad_carriles": 2, "carriles": []}'::jsonb,

    -- Datos del sentido contrario (opcional)
    -- Si es null o vacío, se asume 0% de obstrucción
    sentido_contrario JSONB DEFAULT NULL,

    -- Descripción generada automáticamente
    descripcion_generada TEXT,

    -- Descripción manual (editable por el usuario)
    descripcion_manual TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(situacion_persistente_id)
);

CREATE INDEX IF NOT EXISTS idx_obstruccion_sit_pers_new ON obstruccion_situacion_persistente(situacion_persistente_id);

-- Migrar datos existentes si los hay
INSERT INTO obstruccion_situacion_persistente (
    situacion_persistente_id,
    hay_vehiculo_fuera_via,
    tipo_obstruccion,
    descripcion_manual,
    created_at,
    updated_at
)
SELECT
    situacion_persistente_id,
    CASE WHEN tipo_obstruccion = 'fuera' THEN TRUE ELSE FALSE END,
    CASE
        WHEN tipo_obstruccion = 'fuera' THEN 'ninguna'
        WHEN tipo_obstruccion = 'total' THEN 'total_sentido'
        WHEN tipo_obstruccion = 'parcial' THEN 'parcial'
        ELSE 'ninguna'
    END,
    COALESCE(descripcion_manual, descripcion_generada),
    created_at,
    updated_at
FROM backup_obstruccion_persistente
WHERE situacion_persistente_id IS NOT NULL;

DROP TABLE IF EXISTS backup_obstruccion_persistente;

COMMENT ON TABLE obstruccion_situacion_persistente IS 'Datos de obstrucción de vía para situaciones persistentes - modelo v2';
COMMENT ON COLUMN obstruccion_situacion_persistente.hay_vehiculo_fuera_via IS 'Indica si hay vehículo fuera de la vía (puede ser TRUE junto con obstrucción parcial)';
COMMENT ON COLUMN obstruccion_situacion_persistente.tipo_obstruccion IS 'ninguna=solo fuera de vía, total_sentido=todo el sentido, total_ambos=ambos sentidos, parcial=por carril';
COMMENT ON COLUMN obstruccion_situacion_persistente.sentido_principal IS 'JSON con cantidad_carriles y array de carriles [{nombre, porcentaje}]';
COMMENT ON COLUMN obstruccion_situacion_persistente.sentido_contrario IS 'JSON con carriles del sentido contrario (null = 0% obstrucción)';

-- =====================================================
-- 2. CATALOGO DE NOMBRES DE CARRILES
-- =====================================================
-- Función helper para generar nombres de carriles según cantidad

CREATE OR REPLACE FUNCTION fn_nombres_carriles(p_cantidad INTEGER, p_sentido TEXT DEFAULT NULL)
RETURNS TEXT[] AS $$
BEGIN
    CASE p_cantidad
        WHEN 1 THEN
            RETURN ARRAY['Carril hacia ' || COALESCE(p_sentido, 'el sentido')];
        WHEN 2 THEN
            RETURN ARRAY['Carril izquierdo', 'Carril derecho'];
        WHEN 3 THEN
            RETURN ARRAY['Carril izquierdo', 'Carril central', 'Carril derecho'];
        WHEN 4 THEN
            RETURN ARRAY['Carril izquierdo', 'Carril central izquierdo', 'Carril central derecho', 'Carril derecho'];
        WHEN 5 THEN
            RETURN ARRAY['Carril izquierdo', 'Carril central izquierdo', 'Carril central', 'Carril central derecho', 'Carril derecho'];
        ELSE
            RETURN ARRAY[]::TEXT[];
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION fn_nombres_carriles IS 'Devuelve array de nombres de carriles según la cantidad (1-5)';

-- =====================================================
-- 3. FUNCION PARA GENERAR DESCRIPCION DE OBSTRUCCION
-- =====================================================

CREATE OR REPLACE FUNCTION fn_generar_descripcion_obstruccion(
    p_hay_vehiculo_fuera BOOLEAN,
    p_tipo_obstruccion VARCHAR(20),
    p_sentido_principal JSONB,
    p_sentido_contrario JSONB,
    p_sentido_situacion TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    v_desc TEXT := '';
    v_carril RECORD;
    v_carriles_afectados TEXT := '';
BEGIN
    -- Vehículo fuera de vía
    IF p_hay_vehiculo_fuera THEN
        v_desc := 'Vehiculo fuera de la via';
        IF p_tipo_obstruccion != 'ninguna' THEN
            v_desc := v_desc || '. Ademas, ';
        END IF;
    END IF;

    -- Tipo de obstrucción
    CASE p_tipo_obstruccion
        WHEN 'ninguna' THEN
            IF NOT p_hay_vehiculo_fuera THEN
                v_desc := 'Sin obstruccion de via';
            END IF;

        WHEN 'total_sentido' THEN
            v_desc := v_desc || 'Obstruccion total del sentido ' || COALESCE(p_sentido_situacion, 'principal');

        WHEN 'total_ambos' THEN
            v_desc := v_desc || 'Obstruccion total de ambos sentidos (via cerrada)';

        WHEN 'parcial' THEN
            -- Construir descripción de carriles afectados
            IF p_sentido_principal IS NOT NULL AND p_sentido_principal->'carriles' IS NOT NULL THEN
                FOR v_carril IN
                    SELECT
                        (value->>'nombre')::TEXT as nombre,
                        (value->>'porcentaje')::INT as porcentaje
                    FROM jsonb_array_elements(p_sentido_principal->'carriles')
                    WHERE (value->>'porcentaje')::INT > 0
                LOOP
                    IF v_carriles_afectados != '' THEN
                        v_carriles_afectados := v_carriles_afectados || ', ';
                    END IF;
                    v_carriles_afectados := v_carriles_afectados || v_carril.nombre || ' (' || v_carril.porcentaje || '%)';
                END LOOP;
            END IF;

            IF v_carriles_afectados != '' THEN
                v_desc := v_desc || 'Obstruccion parcial: ' || v_carriles_afectados;
            ELSE
                v_desc := v_desc || 'Obstruccion parcial sin carriles especificados';
            END IF;
    END CASE;

    RETURN v_desc;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION fn_generar_descripcion_obstruccion IS 'Genera descripción automática de obstrucción basada en los datos';

-- =====================================================
-- 4. TRIGGER PARA ACTUALIZAR DESCRIPCION AUTOMATICA
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_actualizar_descripcion_obstruccion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.descripcion_generada := fn_generar_descripcion_obstruccion(
        NEW.hay_vehiculo_fuera_via,
        NEW.tipo_obstruccion,
        NEW.sentido_principal,
        NEW.sentido_contrario,
        NULL -- El sentido se puede obtener de la situación si es necesario
    );
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_desc_obstruccion ON obstruccion_situacion_persistente;
CREATE TRIGGER trigger_desc_obstruccion
    BEFORE INSERT OR UPDATE ON obstruccion_situacion_persistente
    FOR EACH ROW EXECUTE FUNCTION trigger_actualizar_descripcion_obstruccion();

-- =====================================================
-- 5. ACTUALIZAR VISTA DE SITUACIONES PERSISTENTES
-- =====================================================

DROP VIEW IF EXISTS v_situaciones_persistentes_completas CASCADE;

CREATE OR REPLACE VIEW v_situaciones_persistentes_completas AS
SELECT
    sp.*,
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    tev.nombre AS tipo_emergencia_nombre,
    tev.codigo AS tipo_emergencia_codigo,
    tev.color AS tipo_emergencia_color,
    uc.nombre_completo AS creado_por_nombre,
    ucerr.nombre_completo AS cerrado_por_nombre,
    uprom.nombre_completo AS promovido_por_nombre,
    so.uuid AS situacion_origen_uuid,
    so.numero_situacion AS situacion_origen_numero,

    -- Contar unidades asignadas actualmente
    (SELECT COUNT(*) FROM asignacion_situacion_persistente asp
     WHERE asp.situacion_persistente_id = sp.id
     AND asp.fecha_hora_desasignacion IS NULL) AS unidades_asignadas_count,

    -- Lista de unidades asignadas
    (SELECT json_agg(json_build_object(
        'unidad_id', u.id,
        'unidad_codigo', u.codigo,
        'tipo_unidad', u.tipo_unidad,
        'fecha_asignacion', asp.fecha_hora_asignacion
    ))
    FROM asignacion_situacion_persistente asp
    JOIN unidad u ON asp.unidad_id = u.id
    WHERE asp.situacion_persistente_id = sp.id
    AND asp.fecha_hora_desasignacion IS NULL) AS unidades_asignadas,

    -- Datos de obstrucción (nuevo formato)
    (SELECT json_build_object(
        'id', osp.id,
        'hay_vehiculo_fuera_via', osp.hay_vehiculo_fuera_via,
        'tipo_obstruccion', osp.tipo_obstruccion,
        'sentido_principal', osp.sentido_principal,
        'sentido_contrario', osp.sentido_contrario,
        'descripcion', COALESCE(osp.descripcion_manual, osp.descripcion_generada)
    )
    FROM obstruccion_situacion_persistente osp
    WHERE osp.situacion_persistente_id = sp.id
    LIMIT 1) AS obstruccion,

    -- Lista de autoridades presentes
    (SELECT json_agg(json_build_object(
        'id', asp.id,
        'tipo', asp.tipo_autoridad,
        'hora_llegada', asp.hora_llegada,
        'nip_chapa', asp.nip_chapa,
        'numero_unidad', asp.numero_unidad,
        'nombre_comandante', asp.nombre_comandante,
        'cantidad_elementos', asp.cantidad_elementos,
        'cantidad_unidades', asp.cantidad_unidades
    ))
    FROM autoridad_situacion_persistente asp
    WHERE asp.situacion_persistente_id = sp.id) AS autoridades,

    -- Lista de unidades de socorro
    (SELECT json_agg(json_build_object(
        'id', ssp.id,
        'tipo', ssp.tipo_socorro,
        'hora_llegada', ssp.hora_llegada,
        'nip_chapa', ssp.nip_chapa,
        'numero_unidad', ssp.numero_unidad,
        'nombre_comandante', ssp.nombre_comandante,
        'cantidad_elementos', ssp.cantidad_elementos,
        'cantidad_unidades', ssp.cantidad_unidades
    ))
    FROM socorro_situacion_persistente ssp
    WHERE ssp.situacion_persistente_id = sp.id) AS socorro,

    -- Cantidad de multimedia
    (SELECT COUNT(*) FROM multimedia_situacion_persistente msp
     WHERE msp.situacion_persistente_id = sp.id AND msp.tipo = 'foto') AS cantidad_fotos,
    (SELECT COUNT(*) FROM multimedia_situacion_persistente msp
     WHERE msp.situacion_persistente_id = sp.id AND msp.tipo = 'video') AS cantidad_videos,

    -- Lista de multimedia
    (SELECT json_agg(json_build_object(
        'id', msp.id,
        'tipo', msp.tipo,
        'url', msp.url,
        'url_thumbnail', msp.url_thumbnail,
        'nombre_archivo', msp.nombre_archivo,
        'orden', msp.orden
    ) ORDER BY msp.tipo, msp.orden)
    FROM multimedia_situacion_persistente msp
    WHERE msp.situacion_persistente_id = sp.id) AS multimedia

FROM situacion_persistente sp
LEFT JOIN ruta r ON sp.ruta_id = r.id
LEFT JOIN tipo_emergencia_vial tev ON sp.tipo_emergencia_id = tev.id
LEFT JOIN usuario uc ON sp.creado_por = uc.id
LEFT JOIN usuario ucerr ON sp.cerrado_por = ucerr.id
LEFT JOIN usuario uprom ON sp.promovido_por = uprom.id
LEFT JOIN situacion so ON sp.situacion_origen_id = so.id;

COMMENT ON VIEW v_situaciones_persistentes_completas IS 'Vista completa de situaciones persistentes con obstrucción v2';

-- =====================================================
-- 6. TABLA OBSTRUCCION PARA SITUACIONES NORMALES
-- =====================================================
-- Misma estructura para las situaciones normales (emergencias viales)

-- Agregar columna JSON a situacion si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'situacion' AND column_name = 'obstruccion_data'
    ) THEN
        ALTER TABLE situacion ADD COLUMN obstruccion_data JSONB DEFAULT NULL;
        COMMENT ON COLUMN situacion.obstruccion_data IS 'Datos de obstrucción en formato JSON v2';
    END IF;
END $$;

-- =====================================================
-- 7. TABLA OBSTRUCCION PARA INCIDENTES
-- =====================================================
-- Agregar columna JSON a incidente si no existe

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'incidente' AND column_name = 'obstruccion_data'
    ) THEN
        ALTER TABLE incidente ADD COLUMN obstruccion_data JSONB DEFAULT NULL;
        COMMENT ON COLUMN incidente.obstruccion_data IS 'Datos de obstrucción en formato JSON v2';
    END IF;
END $$;

COMMIT;
