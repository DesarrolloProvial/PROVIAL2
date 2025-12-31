-- ============================================
-- MIGRACIÓN 044: Sistema de Multimedia para Situaciones
-- Fecha: 2025-12-13
-- Descripción: Tabla para almacenar referencias a fotos y videos
--              de situaciones (accidentes, asistencias, emergencias)
-- ============================================

-- Tabla principal de multimedia
CREATE TABLE IF NOT EXISTS situacion_multimedia (
    id SERIAL PRIMARY KEY,
    situacion_id INTEGER NOT NULL REFERENCES situacion(id) ON DELETE CASCADE,

    -- Tipo de archivo
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('FOTO', 'VIDEO')),

    -- Orden de la foto (1, 2, 3) o null para video
    orden INTEGER CHECK (orden >= 1 AND orden <= 3),

    -- URLs del archivo
    url_original VARCHAR(500) NOT NULL,      -- Archivo comprimido pero completo
    url_thumbnail VARCHAR(500),               -- Thumbnail pequeño para previews

    -- Metadata del archivo
    nombre_archivo VARCHAR(255) NOT NULL,     -- Nombre original del archivo
    mime_type VARCHAR(50) NOT NULL,           -- image/jpeg, video/mp4, etc
    tamanio_bytes INTEGER NOT NULL,           -- Tamaño en bytes

    -- Dimensiones (para imágenes/video)
    ancho INTEGER,
    alto INTEGER,
    duracion_segundos INTEGER,                -- Solo para videos

    -- Ubicación donde se tomó (puede diferir de la situación)
    latitud DECIMAL(10, 8),
    longitud DECIMAL(11, 8),

    -- Auditoría
    subido_por INTEGER NOT NULL REFERENCES usuario(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Restricción: máximo 3 fotos por situación
    CONSTRAINT uq_situacion_foto_orden UNIQUE (situacion_id, tipo, orden)
);

-- Índices para consultas frecuentes
CREATE INDEX idx_multimedia_situacion ON situacion_multimedia(situacion_id);
CREATE INDEX idx_multimedia_tipo ON situacion_multimedia(tipo);
CREATE INDEX idx_multimedia_created ON situacion_multimedia(created_at DESC);

-- Vista para obtener resumen de multimedia por situación
CREATE OR REPLACE VIEW v_situacion_multimedia_resumen AS
SELECT
    s.id as situacion_id,
    s.numero_situacion,
    s.tipo_situacion,
    COUNT(sm.id) FILTER (WHERE sm.tipo = 'FOTO') as total_fotos,
    COUNT(sm.id) FILTER (WHERE sm.tipo = 'VIDEO') as total_videos,
    BOOL_OR(sm.tipo = 'VIDEO') as tiene_video,
    -- URLs de thumbnails para preview rápido
    ARRAY_AGG(sm.url_thumbnail ORDER BY sm.orden) FILTER (WHERE sm.tipo = 'FOTO' AND sm.url_thumbnail IS NOT NULL) as thumbnails,
    -- Primera foto como preview principal
    (SELECT url_thumbnail FROM situacion_multimedia WHERE situacion_id = s.id AND tipo = 'FOTO' ORDER BY orden LIMIT 1) as preview_url
FROM situacion s
LEFT JOIN situacion_multimedia sm ON s.id = sm.situacion_id
GROUP BY s.id, s.numero_situacion, s.tipo_situacion;

-- Función para verificar completitud de multimedia
CREATE OR REPLACE FUNCTION verificar_multimedia_completa(p_situacion_id INTEGER)
RETURNS TABLE (
    fotos_subidas INTEGER,
    fotos_requeridas INTEGER,
    video_subido BOOLEAN,
    video_requerido BOOLEAN,
    multimedia_completa BOOLEAN
) AS $$
DECLARE
    v_tipo_situacion VARCHAR(50);
    v_fotos INTEGER;
    v_tiene_video BOOLEAN;
BEGIN
    -- Obtener tipo de situación
    SELECT tipo_situacion INTO v_tipo_situacion
    FROM situacion WHERE id = p_situacion_id;

    -- Contar fotos y videos
    SELECT
        COUNT(*) FILTER (WHERE tipo = 'FOTO'),
        BOOL_OR(tipo = 'VIDEO')
    INTO v_fotos, v_tiene_video
    FROM situacion_multimedia
    WHERE situacion_id = p_situacion_id;

    v_tiene_video := COALESCE(v_tiene_video, false);

    -- Determinar requerimientos según tipo
    -- INCIDENTE, ASISTENCIA_VEHICULAR, EMERGENCIA requieren 3 fotos + 1 video
    IF v_tipo_situacion IN ('INCIDENTE', 'ASISTENCIA_VEHICULAR', 'EMERGENCIA') THEN
        RETURN QUERY SELECT
            v_fotos,
            3,
            v_tiene_video,
            true,
            (v_fotos >= 3 AND v_tiene_video);
    ELSE
        -- Otros tipos no requieren multimedia obligatoria
        RETURN QUERY SELECT
            v_fotos,
            0,
            v_tiene_video,
            false,
            true;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON TABLE situacion_multimedia IS 'Almacena referencias a fotos y videos de situaciones';
COMMENT ON COLUMN situacion_multimedia.url_original IS 'URL del archivo comprimido pero en calidad completa';
COMMENT ON COLUMN situacion_multimedia.url_thumbnail IS 'URL del thumbnail (200x200) para previews rápidos';
COMMENT ON COLUMN situacion_multimedia.orden IS 'Orden de la foto (1-3), NULL para videos';
