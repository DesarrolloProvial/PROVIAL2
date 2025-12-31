-- =====================================================
-- MIGRACIÓN 048: Sistema Multi-Rol y Motivos de Inactividad
-- =====================================================
-- 1. Tabla usuario_rol para permitir múltiples roles por usuario
-- 2. Tabla motivo_inactividad para registrar motivos de desactivación
-- =====================================================

-- 1. Tabla para asignar múltiples roles a un usuario
CREATE TABLE IF NOT EXISTS usuario_rol (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    rol_id INTEGER NOT NULL REFERENCES rol(id) ON DELETE CASCADE,
    sede_id INTEGER REFERENCES sede(id),  -- Rol específico para una sede (ej: OPERACIONES de Mazatenango)
    es_rol_principal BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    asignado_por INTEGER REFERENCES usuario(id),
    fecha_asignacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_revocacion TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Un usuario no puede tener el mismo rol dos veces para la misma sede
    UNIQUE(usuario_id, rol_id, sede_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_usuario_rol_usuario ON usuario_rol(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_rol_rol ON usuario_rol(rol_id);
CREATE INDEX IF NOT EXISTS idx_usuario_rol_sede ON usuario_rol(sede_id);
CREATE INDEX IF NOT EXISTS idx_usuario_rol_activo ON usuario_rol(activo) WHERE activo = true;

-- 2. Catálogo de motivos de inactividad
CREATE TABLE IF NOT EXISTS catalogo_motivo_inactividad (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    requiere_fecha_fin BOOLEAN DEFAULT false,  -- Si es temporal (vacaciones, permiso médico)
    activo BOOLEAN DEFAULT true,
    orden INTEGER DEFAULT 0
);

-- Insertar motivos comunes
INSERT INTO catalogo_motivo_inactividad (codigo, nombre, descripcion, requiere_fecha_fin, orden) VALUES
('VACACIONES', 'Vacaciones', 'Periodo de vacaciones', true, 1),
('PERMISO_MEDICO', 'Permiso Médico', 'Incapacidad por enfermedad o accidente', true, 2),
('LICENCIA_MATERNIDAD', 'Licencia de Maternidad', 'Licencia por maternidad/paternidad', true, 3),
('SUSPENSION', 'Suspensión', 'Suspensión disciplinaria', true, 4),
('CAPACITACION', 'Capacitación', 'Asistiendo a curso o capacitación', true, 5),
('COMISION', 'Comisión de Servicio', 'Comisionado a otra dependencia', true, 6),
('RENUNCIA', 'Renuncia', 'Renuncia voluntaria', false, 7),
('DESPIDO', 'Despido', 'Terminación de contrato', false, 8),
('JUBILACION', 'Jubilación', 'Retiro por jubilación', false, 9),
('FALLECIMIENTO', 'Fallecimiento', 'Fallecimiento del empleado', false, 10),
('OTRO', 'Otro', 'Otro motivo no especificado', false, 99)
ON CONFLICT (codigo) DO NOTHING;

-- 3. Tabla de historial de inactividad
CREATE TABLE IF NOT EXISTS usuario_inactividad (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    motivo_id INTEGER NOT NULL REFERENCES catalogo_motivo_inactividad(id),
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin_estimada DATE,  -- Fecha estimada de regreso (para motivos temporales)
    fecha_fin_real DATE,  -- Fecha real de regreso
    observaciones TEXT,
    registrado_por INTEGER REFERENCES usuario(id),
    reactivado_por INTEGER REFERENCES usuario(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_usuario_inactividad_usuario ON usuario_inactividad(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_inactividad_activo ON usuario_inactividad(fecha_fin_real) WHERE fecha_fin_real IS NULL;

-- 4. Migrar roles existentes a la nueva tabla (para usuarios que ya tienen rol)
INSERT INTO usuario_rol (usuario_id, rol_id, sede_id, es_rol_principal, activo)
SELECT u.id, u.rol_id, u.sede_id, true, true
FROM usuario u
WHERE NOT EXISTS (
    SELECT 1 FROM usuario_rol ur WHERE ur.usuario_id = u.id AND ur.rol_id = u.rol_id
)
ON CONFLICT DO NOTHING;

-- 5. Vista para obtener todos los roles de un usuario
CREATE OR REPLACE VIEW v_usuario_roles AS
SELECT
    u.id as usuario_id,
    u.username,
    u.nombre_completo,
    u.sede_id as sede_principal_id,
    sp.nombre as sede_principal_nombre,
    ur.rol_id,
    r.nombre as rol_nombre,
    ur.sede_id as rol_sede_id,
    sr.nombre as rol_sede_nombre,
    ur.es_rol_principal,
    ur.activo as rol_activo,
    ur.fecha_asignacion
FROM usuario u
JOIN usuario_rol ur ON u.id = ur.usuario_id
JOIN rol r ON ur.rol_id = r.id
LEFT JOIN sede sp ON u.sede_id = sp.id
LEFT JOIN sede sr ON ur.sede_id = sr.id
WHERE ur.activo = true;

-- 6. Función para verificar si usuario tiene un rol específico
CREATE OR REPLACE FUNCTION usuario_tiene_rol(p_usuario_id INTEGER, p_rol_nombre VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM usuario_rol ur
        JOIN rol r ON ur.rol_id = r.id
        WHERE ur.usuario_id = p_usuario_id
          AND r.nombre = p_rol_nombre
          AND ur.activo = true
    );
END;
$$ LANGUAGE plpgsql;

-- 7. Función para obtener motivo de inactividad actual
CREATE OR REPLACE FUNCTION get_motivo_inactividad_actual(p_usuario_id INTEGER)
RETURNS TABLE (
    motivo_codigo VARCHAR,
    motivo_nombre VARCHAR,
    fecha_inicio DATE,
    fecha_fin_estimada DATE,
    observaciones TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.codigo,
        c.nombre,
        ui.fecha_inicio,
        ui.fecha_fin_estimada,
        ui.observaciones
    FROM usuario_inactividad ui
    JOIN catalogo_motivo_inactividad c ON ui.motivo_id = c.id
    WHERE ui.usuario_id = p_usuario_id
      AND ui.fecha_fin_real IS NULL
    ORDER BY ui.fecha_inicio DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON TABLE usuario_rol IS 'Asignación de múltiples roles a usuarios, con soporte para roles por sede';
COMMENT ON TABLE usuario_inactividad IS 'Historial de periodos de inactividad de usuarios con motivos';
COMMENT ON TABLE catalogo_motivo_inactividad IS 'Catálogo de motivos de inactividad/desactivación';

-- Mensaje de éxito
DO $$
BEGIN
    RAISE NOTICE 'Migración 048: Sistema multi-rol y motivos de inactividad creado correctamente';
END $$;
