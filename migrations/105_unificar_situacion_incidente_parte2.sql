-- =====================================================
-- MIGRACIÓN 105: Unificar situacion + incidente (Parte 2)
-- Eliminar tablas obsoletas
-- =====================================================
-- Fecha: 2026-01-24
-- IDEMPOTENTE: Puede ejecutarse múltiples veces
-- =====================================================

BEGIN;

-- =====================================================
-- 0. ELIMINAR VISTAS QUE DEPENDEN DE COLUMNAS A ELIMINAR
-- =====================================================

-- Vistas de situacion
DROP VIEW IF EXISTS v_situaciones_completas CASCADE;
DROP VIEW IF EXISTS v_situacion_multimedia_resumen CASCADE;
DROP VIEW IF EXISTS v_situaciones_con_combustible CASCADE;
DROP VIEW IF EXISTS v_ultima_situacion_unidad CASCADE;

-- Vistas de actividad_unidad (dependen de incidente_id)
DROP VIEW IF EXISTS v_actividades_completas CASCADE;
DROP VIEW IF EXISTS v_estado_actual_unidades CASCADE;

-- Vista de incidentes (depende de tabla incidente que se elimina)
DROP VIEW IF EXISTS v_incidentes_completos CASCADE;

-- Vista de accidentología (depende de incidente_id en hoja_accidentologia)
DROP VIEW IF EXISTS v_accidentologia_completa CASCADE;

-- =====================================================
-- 1. ELIMINAR FK DE SITUACION A INCIDENTE
-- =====================================================

ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_incidente_id_fkey;
ALTER TABLE situacion DROP COLUMN IF EXISTS incidente_id;

-- =====================================================
-- 2. ELIMINAR FK DE SITUACION A EVENTO_PERSISTENTE
-- =====================================================

ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_evento_persistente_id_fkey;
ALTER TABLE situacion DROP COLUMN IF EXISTS evento_persistente_id;

-- =====================================================
-- 3. ELIMINAR FK DE OTRAS TABLAS A INCIDENTE
-- =====================================================

ALTER TABLE actividad_unidad DROP CONSTRAINT IF EXISTS actividad_unidad_incidente_id_fkey;
ALTER TABLE actividad_unidad DROP COLUMN IF EXISTS incidente_id;

-- Primero agregar situacion_id a hoja_accidentologia (reemplaza incidente_id)
ALTER TABLE hoja_accidentologia ADD COLUMN IF NOT EXISTS situacion_id INTEGER;
ALTER TABLE hoja_accidentologia DROP CONSTRAINT IF EXISTS hoja_accidentologia_situacion_id_fkey;
ALTER TABLE hoja_accidentologia ADD CONSTRAINT hoja_accidentologia_situacion_id_fkey
    FOREIGN KEY (situacion_id) REFERENCES situacion(id) ON DELETE SET NULL;

-- Ahora eliminar la FK vieja a incidente
ALTER TABLE hoja_accidentologia DROP CONSTRAINT IF EXISTS hoja_accidentologia_incidente_id_fkey;
ALTER TABLE hoja_accidentologia DROP COLUMN IF EXISTS incidente_id;

ALTER TABLE sancion DROP CONSTRAINT IF EXISTS sancion_incidente_id_fkey;
ALTER TABLE sancion DROP COLUMN IF EXISTS incidente_id;

-- =====================================================
-- 4. ELIMINAR TABLAS DEPENDIENTES DE INCIDENTE
-- =====================================================

DROP TABLE IF EXISTS ajustador_involucrado CASCADE;
DROP TABLE IF EXISTS grua_involucrada CASCADE;
DROP TABLE IF EXISTS incidente_causa CASCADE;
DROP TABLE IF EXISTS incidente_grua CASCADE;
DROP TABLE IF EXISTS incidente_no_atendido CASCADE;
DROP TABLE IF EXISTS incidente_vehiculo CASCADE;
DROP TABLE IF EXISTS obstruccion_incidente CASCADE;
DROP TABLE IF EXISTS persona_involucrada CASCADE;
DROP TABLE IF EXISTS recurso_incidente CASCADE;
DROP TABLE IF EXISTS vehiculo_incidente CASCADE;

-- =====================================================
-- 5. ELIMINAR TABLAS DRAFT OBSOLETAS
-- =====================================================

DROP TABLE IF EXISTS asistencia_draft CASCADE;
DROP TABLE IF EXISTS emergencia_draft CASCADE;
DROP TABLE IF EXISTS incidente_draft CASCADE;

-- =====================================================
-- 6. ELIMINAR TABLA INCIDENTE
-- =====================================================

DROP TABLE IF EXISTS incidente CASCADE;

-- =====================================================
-- 7. ELIMINAR TABLA EVENTO_PERSISTENTE
-- =====================================================

DROP TABLE IF EXISTS evento_persistente CASCADE;

-- =====================================================
-- 8. ELIMINAR SECUENCIAS HUÉRFANAS
-- =====================================================

DROP SEQUENCE IF EXISTS incidente_id_seq CASCADE;
DROP SEQUENCE IF EXISTS evento_persistente_id_seq CASCADE;

-- =====================================================
-- 9. ELIMINAR FUNCIONES/TRIGGERS RELACIONADOS
-- =====================================================

DROP FUNCTION IF EXISTS generar_numero_reporte() CASCADE;
DROP FUNCTION IF EXISTS tr_fn_generar_boleta_incidente() CASCADE;
DROP FUNCTION IF EXISTS log_incidente_cambios() CASCADE;
DROP FUNCTION IF EXISTS update_evento_persistente_timestamp() CASCADE;

-- =====================================================
-- 10. RECREAR VISTAS ACTUALIZADAS
-- =====================================================

-- Vista principal de situaciones completas (SIN incidente_id, uuid, numero_situacion)
CREATE OR REPLACE VIEW v_situaciones_completas AS
SELECT
    s.id,
    s.codigo_situacion,
    s.tipo_situacion,
    s.estado,
    s.salida_unidad_id,
    s.ruta_id,
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    s.km,
    s.sentido,
    s.latitud,
    s.longitud,
    s.ubicacion_manual,
    s.combustible,
    s.combustible_fraccion,
    s.kilometraje_unidad,
    s.descripcion,
    s.observaciones,
    s.tripulacion_confirmada,
    s.clima,
    s.carga_vehicular,
    s.departamento_id,
    dep.nombre AS departamento_nombre,
    s.municipio_id,
    mun.nombre AS municipio_nombre,
    s.unidad_id,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    u.sede_id,
    se.nombre AS sede_nombre,
    s.turno_id,
    t.fecha AS turno_fecha,
    s.asignacion_id,
    -- Nuevos campos de incidente integrados
    s.origen,
    s.tipo_hecho_id,
    s.subtipo_hecho_id,
    s.fecha_hora_aviso,
    s.fecha_hora_llegada,
    s.fecha_hora_finalizacion,
    s.hay_heridos,
    s.cantidad_heridos,
    s.hay_fallecidos,
    s.cantidad_fallecidos,
    s.numero_boleta,
    -- FK a situacion_persistente (reemplaza evento_persistente)
    s.situacion_persistente_id,
    sp.titulo AS situacion_persistente_titulo,
    sp.tipo AS situacion_persistente_tipo,
    -- Auditoría
    s.creado_por,
    uc.nombre_completo AS creado_por_nombre,
    s.actualizado_por,
    ua.nombre_completo AS actualizado_por_nombre,
    s.created_at,
    s.updated_at,
    s.modificado_despues_cierre,
    s.motivo_modificacion_cierre,
    s.obstruccion_data,
    -- Detalles agregados
    (
        SELECT json_agg(
            json_build_object(
                'id', d.id,
                'tipo_detalle', d.tipo_detalle,
                'datos', d.datos,
                'created_at', d.created_at
            ) ORDER BY d.created_at
        )
        FROM detalle_situacion d
        WHERE d.situacion_id = s.id
    ) AS detalles
FROM situacion s
LEFT JOIN ruta r ON s.ruta_id = r.id
LEFT JOIN unidad u ON s.unidad_id = u.id
LEFT JOIN sede se ON u.sede_id = se.id
LEFT JOIN turno t ON s.turno_id = t.id
LEFT JOIN usuario uc ON s.creado_por = uc.id
LEFT JOIN usuario ua ON s.actualizado_por = ua.id
LEFT JOIN departamento dep ON s.departamento_id = dep.id
LEFT JOIN municipio mun ON s.municipio_id = mun.id
LEFT JOIN situacion_persistente sp ON s.situacion_persistente_id = sp.id
ORDER BY s.created_at DESC;

-- Vista de última situación por unidad
CREATE OR REPLACE VIEW v_ultima_situacion_unidad AS
SELECT DISTINCT ON (s.unidad_id)
    s.id,
    s.codigo_situacion,
    s.tipo_situacion,
    s.estado,
    s.unidad_id,
    u.codigo AS unidad_codigo,
    s.ruta_id,
    r.codigo AS ruta_codigo,
    s.km,
    s.sentido,
    s.latitud,
    s.longitud,
    s.created_at,
    s.updated_at
FROM situacion s
LEFT JOIN unidad u ON s.unidad_id = u.id
LEFT JOIN ruta r ON s.ruta_id = r.id
ORDER BY s.unidad_id, s.created_at DESC;

-- Vista de situaciones con combustible
CREATE OR REPLACE VIEW v_situaciones_con_combustible AS
SELECT
    s.id,
    s.codigo_situacion,
    s.tipo_situacion,
    s.unidad_id,
    u.codigo AS unidad_codigo,
    s.combustible,
    s.combustible_fraccion,
    s.kilometraje_unidad,
    s.created_at
FROM situacion s
LEFT JOIN unidad u ON s.unidad_id = u.id
WHERE s.combustible IS NOT NULL OR s.combustible_fraccion IS NOT NULL
ORDER BY s.created_at DESC;

-- Vista de multimedia por situación
CREATE OR REPLACE VIEW v_situacion_multimedia_resumen AS
SELECT
    s.id AS situacion_id,
    s.codigo_situacion,
    s.tipo_situacion,
    COUNT(sm.id) AS total_multimedia,
    COUNT(CASE WHEN sm.tipo = 'foto' THEN 1 END) AS total_fotos,
    COUNT(CASE WHEN sm.tipo = 'video' THEN 1 END) AS total_videos
FROM situacion s
LEFT JOIN situacion_multimedia sm ON s.id = sm.situacion_id
GROUP BY s.id, s.codigo_situacion, s.tipo_situacion;

-- Vista de actividades completas (SIN incidente_id)
CREATE OR REPLACE VIEW v_actividades_completas AS
SELECT
    a.id,
    a.unidad_id,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    s.nombre AS sede_nombre,
    ta.nombre AS tipo_actividad,
    ta.color AS tipo_actividad_color,
    a.hora_inicio,
    a.hora_fin,
    EXTRACT(EPOCH FROM (COALESCE(a.hora_fin, NOW()) - a.hora_inicio))/60 AS duracion_min,
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    a.km,
    a.sentido,
    usr.nombre_completo AS registrado_por_nombre,
    a.observaciones,
    a.created_at
FROM actividad_unidad a
JOIN unidad u ON a.unidad_id = u.id
JOIN sede s ON u.sede_id = s.id
JOIN tipo_actividad ta ON a.tipo_actividad_id = ta.id
LEFT JOIN ruta r ON a.ruta_id = r.id
JOIN usuario usr ON a.registrado_por = usr.id;

-- Vista de estado actual de unidades (SIN incidente_id)
CREATE OR REPLACE VIEW v_estado_actual_unidades AS
SELECT DISTINCT ON (u.id)
    u.id AS unidad_id,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    s.nombre AS sede_nombre,
    u.activa,
    ta.nombre AS actividad_actual,
    ta.color AS actividad_color,
    a.hora_inicio AS desde,
    r.codigo AS ruta_codigo,
    a.km,
    a.sentido,
    a.observaciones
FROM unidad u
JOIN sede s ON u.sede_id = s.id
LEFT JOIN LATERAL (
    SELECT *
    FROM actividad_unidad au
    WHERE au.unidad_id = u.id
      AND au.hora_fin IS NULL
    ORDER BY au.hora_inicio DESC
    LIMIT 1
) a ON TRUE
LEFT JOIN tipo_actividad ta ON a.tipo_actividad_id = ta.id
LEFT JOIN ruta r ON a.ruta_id = r.id
ORDER BY u.id;

-- Vista de accidentología completa (usando situacion en lugar de incidente)
CREATE OR REPLACE VIEW v_accidentologia_completa AS
SELECT
    s.id AS situacion_id,
    s.codigo_situacion,
    s.numero_boleta,
    s.numero_boleta_secuencia,
    s.fecha_hora_aviso,
    s.estado AS situacion_estado,
    -- Ubicación
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    s.km,
    s.sentido,
    s.latitud,
    s.longitud,
    d.nombre AS departamento,
    m.nombre AS municipio,
    s.area,
    -- Tipo hecho
    th.codigo AS tipo_hecho_codigo,
    th.nombre AS tipo_hecho,
    -- Víctimas
    s.cantidad_heridos,
    s.cantidad_fallecidos,
    -- Hoja accidentología
    h.id AS hoja_id,
    h.tipo_accidente,
    h.descripcion_accidente,
    h.condiciones_climaticas,
    h.iluminacion,
    h.visibilidad,
    h.causa_principal,
    h.causas_contribuyentes,
    h.numero_carriles,
    -- Autoridades
    h.pnc_presente,
    h.pnc_agente,
    h.bomberos_presente,
    h.bomberos_unidad,
    h.mp_presente,
    h.mp_fiscal,
    h.agente_apoyo_nombre,
    h.agente_apoyo_institucion,
    -- Estado
    h.estado AS hoja_estado,
    h.numero_caso_pnc,
    h.numero_caso_mp,
    h.created_at,
    h.updated_at
FROM hoja_accidentologia h
JOIN situacion s ON h.situacion_id = s.id
LEFT JOIN ruta r ON s.ruta_id = r.id
LEFT JOIN departamento d ON s.departamento_id = d.id
LEFT JOIN municipio m ON s.municipio_id = m.id
LEFT JOIN tipo_hecho th ON s.tipo_hecho_id = th.id;

COMMIT;

SELECT 'Migración 105 completada exitosamente' as status;
