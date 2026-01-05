-- Migration: Add estado_nomina to asignacion_turno
-- Purpose: Enable draft/released workflow for assignments

-- Add estado_nomina column
ALTER TABLE asignacion_turno 
ADD COLUMN IF NOT EXISTS estado_nomina VARCHAR(20) DEFAULT 'LIBERADA' CHECK (estado_nomina IN ('BORRADOR', 'LIBERADA'));

-- Update existing assignments to LIBERADA
UPDATE asignacion_turno SET estado_nomina = 'LIBERADA' WHERE estado_nomina IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_asignacion_turno_estado_nomina ON asignacion_turno(estado_nomina);

-- Add comment
COMMENT ON COLUMN asignacion_turno.estado_nomina IS 'Estado de la nómina: BORRADOR (no visible en app móvil) o LIBERADA (visible y notificada)';
