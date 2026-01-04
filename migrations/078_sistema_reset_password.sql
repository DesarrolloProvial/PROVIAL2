-- =====================================================
-- MIGRACIÓN 078: Sistema de Restablecimiento de Contraseña
-- =====================================================
-- Fecha: 2026-01-03
-- Descripción: Permite a admins habilitar reset de password
--              que el usuario completa desde la app móvil
-- =====================================================

-- 1. Agregar campo para indicar que necesita reset de contraseña
ALTER TABLE usuario
ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN DEFAULT FALSE;

-- 2. Agregar campo para almacenar fecha del último reset
ALTER TABLE usuario
ADD COLUMN IF NOT EXISTS password_last_reset TIMESTAMP;

-- 3. Agregar campo para almacenar quién habilitó el reset
ALTER TABLE usuario
ADD COLUMN IF NOT EXISTS password_reset_by INTEGER REFERENCES usuario(id);

-- 4. Agregar campo para fecha en que se habilitó el reset
ALTER TABLE usuario
ADD COLUMN IF NOT EXISTS password_reset_enabled_at TIMESTAMP;

-- 5. Crear índice para búsquedas de usuarios que necesitan reset
CREATE INDEX IF NOT EXISTS idx_usuario_password_reset
ON usuario(password_reset_required)
WHERE password_reset_required = TRUE;

-- 6. Tabla de historial de resets de contraseña (auditoría)
CREATE TABLE IF NOT EXISTS password_reset_log (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuario(id),
    habilitado_por INTEGER REFERENCES usuario(id),
    fecha_habilitacion TIMESTAMP NOT NULL,
    fecha_completado TIMESTAMP,
    ip_completado VARCHAR(45),
    metodo VARCHAR(20) DEFAULT 'APP', -- APP, WEB
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Índices para el log
CREATE INDEX IF NOT EXISTS idx_password_reset_log_usuario ON password_reset_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_log_fecha ON password_reset_log(fecha_habilitacion);

-- 8. Comentarios
COMMENT ON COLUMN usuario.password_reset_required IS 'Indica si el usuario debe cambiar su contraseña en el próximo login';
COMMENT ON COLUMN usuario.password_last_reset IS 'Fecha del último cambio de contraseña';
COMMENT ON COLUMN usuario.password_reset_by IS 'ID del admin que habilitó el reset';
COMMENT ON COLUMN usuario.password_reset_enabled_at IS 'Fecha en que se habilitó el reset';
COMMENT ON TABLE password_reset_log IS 'Historial de restablecimientos de contraseña para auditoría';

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
