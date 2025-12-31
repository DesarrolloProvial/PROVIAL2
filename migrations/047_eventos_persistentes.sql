-- =====================================================
-- MIGRACIÓN 047: Eventos Persistentes
-- =====================================================
-- Sistema para eventos de larga duración (derrumbes, obras, manifestaciones)
-- =====================================================

-- Crear tabla de eventos persistentes
CREATE TABLE IF NOT EXISTS evento_persistente (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) NOT NULL DEFAULT 'OTRO',  -- DERRUMBE, OBRA, MANIFESTACION, ACCIDENTE_GRAVE, OTRO
    importancia VARCHAR(20) NOT NULL DEFAULT 'MEDIA',  -- BAJA, MEDIA, ALTA, CRITICA
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',  -- ACTIVO, RESUELTO, CANCELADO

    -- Ubicación
    ruta_id INTEGER REFERENCES ruta(id),
    km_inicio DECIMAL(10,2),
    km_fin DECIMAL(10,2),
    latitud DECIMAL(10,6),
    longitud DECIMAL(10,6),
    punto_referencia TEXT,

    -- Información adicional
    fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_fin_estimada TIMESTAMP WITH TIME ZONE,
    fecha_resolucion TIMESTAMP WITH TIME ZONE,

    -- Auditoría
    creado_por INTEGER REFERENCES usuario(id),
    resuelto_por INTEGER REFERENCES usuario(id),
    observaciones TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_evento_estado ON evento_persistente(estado);
CREATE INDEX IF NOT EXISTS idx_evento_ruta ON evento_persistente(ruta_id);
CREATE INDEX IF NOT EXISTS idx_evento_importancia ON evento_persistente(importancia);

-- Agregar columna a situacion para vincular con evento
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS evento_persistente_id INTEGER REFERENCES evento_persistente(id);

-- Comentarios
COMMENT ON TABLE evento_persistente IS 'Eventos de larga duración que requieren seguimiento continuo';
COMMENT ON COLUMN evento_persistente.importancia IS 'Nivel de importancia: BAJA, MEDIA, ALTA, CRITICA';
COMMENT ON COLUMN evento_persistente.estado IS 'Estado del evento: ACTIVO, RESUELTO, CANCELADO';

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_evento_persistente_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_evento_persistente_updated ON evento_persistente;
CREATE TRIGGER trigger_evento_persistente_updated
    BEFORE UPDATE ON evento_persistente
    FOR EACH ROW
    EXECUTE FUNCTION update_evento_persistente_timestamp();

-- Mensaje de éxito
DO $$
BEGIN
    RAISE NOTICE 'Migración 047: Tabla evento_persistente creada correctamente';
END $$;
