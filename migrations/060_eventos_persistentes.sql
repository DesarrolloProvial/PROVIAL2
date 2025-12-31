-- Migración 060: Eventos Persistentes (Situaciones de Larga Duración)

-- 1. Tabla: evento_persistente
CREATE TABLE IF NOT EXISTS evento_persistente (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('DERRUMBE', 'OBRA', 'MANIFESTACION', 'ACCIDENTE_GRAVE', 'EVENTO_NATURAL', 'OTRO')),
    
    -- Ubicación
    ruta_id INT REFERENCES ruta(id) ON DELETE SET NULL,
    km DECIMAL(8,2),
    latitud DECIMAL(10,8),
    longitud DECIMAL(11,8),
    
    -- Estado
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'FINALIZADO', 'CANCELADO')),
    importancia VARCHAR(20) NOT NULL DEFAULT 'MEDIA' CHECK (importancia IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
    
    -- Auditoría
    creado_por INT REFERENCES usuario(id) ON DELETE RESTRICT,
    actualizado_por INT REFERENCES usuario(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evento_estado ON evento_persistente(estado);
CREATE INDEX idx_evento_ruta ON evento_persistente(ruta_id);

-- Trigger para updated_at
CREATE TRIGGER update_evento_persistente_updated_at
    BEFORE UPDATE ON evento_persistente
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Modificar tabla: situacion
-- Vincular situaciones individuales (de una unidad) a un evento persistente
ALTER TABLE situacion
ADD COLUMN IF NOT EXISTS evento_persistente_id INT REFERENCES evento_persistente(id) ON DELETE SET NULL;

CREATE INDEX idx_situacion_evento ON situacion(evento_persistente_id);

COMMENT ON TABLE evento_persistente IS 'Eventos de larga duración (derrumbes, obras) que agrupan situaciones de múltiples unidades/turnos';
COMMENT ON COLUMN situacion.evento_persistente_id IS 'Vincula esta situación específica de una unidad a un evento mayor';
