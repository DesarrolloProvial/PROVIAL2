-- =====================================================
-- MIGRACION 073: Sistema de Administracion Completo
-- =====================================================
-- - Nuevo rol SUPER_ADMIN para programadores
-- - Sistema de grupos mejorado (0=Normal, 1=G1, 2=G2)
-- - Tabla de departamentos dinamica
-- - Sistema de encargados por sede/grupo con historial
-- - Permisos adicionales para sub-roles COP
-- =====================================================

BEGIN;

-- =====================================================
-- 1. NUEVO ROL SUPER_ADMIN
-- =====================================================

-- Verificar si el rol ya existe antes de insertar
INSERT INTO rol (nombre, descripcion, permisos)
SELECT 'SUPER_ADMIN', 'Acceso total al sistema - Solo programadores', '{"all": true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM rol WHERE nombre = 'SUPER_ADMIN');

-- =====================================================
-- 2. TABLA DE CONFIGURACION DEL SISTEMA
-- =====================================================

CREATE TABLE IF NOT EXISTS configuracion_sistema (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    tipo VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    descripcion TEXT,
    categoria VARCHAR(50) DEFAULT 'general',
    modificado_por INTEGER REFERENCES usuario(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuraciones iniciales
INSERT INTO configuracion_sistema (clave, valor, tipo, descripcion, categoria) VALUES
('mantenimiento_activo', 'false', 'boolean', 'Modo mantenimiento del sistema', 'sistema'),
('mensaje_mantenimiento', 'El sistema esta en mantenimiento. Intente mas tarde.', 'string', 'Mensaje mostrado durante mantenimiento', 'sistema'),
('version_app_minima', '1.0.0', 'string', 'Version minima requerida de la app movil', 'app'),
('horas_token_expiracion', '12', 'number', 'Horas de expiracion del token JWT', 'seguridad'),
('intentos_login_max', '5', 'number', 'Intentos maximos de login antes de bloquear', 'seguridad'),
('minutos_bloqueo_login', '30', 'number', 'Minutos de bloqueo despues de intentos fallidos', 'seguridad')
ON CONFLICT (clave) DO NOTHING;

-- =====================================================
-- 3. SISTEMA DE GRUPOS MEJORADO
-- =====================================================

-- Modificar constraint de grupo para permitir 0 (Normal/L-V)
-- 0 = Normal (Lunes a Viernes)
-- 1 = Grupo 1 (8x8)
-- 2 = Grupo 2 (8x8)
-- NULL = Sin asignar

ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_grupo_check;
ALTER TABLE usuario ADD CONSTRAINT usuario_grupo_check CHECK (grupo IS NULL OR grupo IN (0, 1, 2));

-- =====================================================
-- 4. TABLA DE DEPARTAMENTOS DEL SISTEMA
-- =====================================================

CREATE TABLE IF NOT EXISTS departamento_sistema (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(30) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    usa_sistema_grupos BOOLEAN DEFAULT TRUE,
    orden INT DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar departamentos existentes basados en los roles
INSERT INTO departamento_sistema (codigo, nombre, descripcion, usa_sistema_grupos, orden) VALUES
('COP', 'Centro de Operaciones', 'Operadores del Centro de Operaciones', TRUE, 1),
('BRIGADA', 'Brigadas de Campo', 'Personal de campo en unidades moviles', TRUE, 2),
('OPERACIONES', 'Departamento de Operaciones', 'Gestion de operaciones y asignaciones', TRUE, 3),
('ACCIDENTOLOGIA', 'Departamento de Accidentologia', 'Analisis de accidentes e investigacion', TRUE, 4),
('MANDOS', 'Mandos Superiores', 'Jefes y supervisores', FALSE, 5),
('ENCARGADO_NOMINAS', 'Encargados de Nominas', 'Gestion de nominas por sede', FALSE, 6),
('ADMIN', 'Administradores', 'Administradores del sistema', FALSE, 7),
('SUPER_ADMIN', 'Super Administradores', 'Programadores y acceso total', FALSE, 8)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    usa_sistema_grupos = EXCLUDED.usa_sistema_grupos;

-- =====================================================
-- 5. ESTADO DE GRUPOS POR DEPARTAMENTO Y SEDE
-- =====================================================

CREATE TABLE IF NOT EXISTS estado_grupo_departamento (
    id SERIAL PRIMARY KEY,
    departamento_id INTEGER NOT NULL REFERENCES departamento_sistema(id) ON DELETE CASCADE,
    sede_id INTEGER REFERENCES sede(id) ON DELETE CASCADE,  -- NULL = aplica a todas las sedes
    grupo SMALLINT NOT NULL CHECK (grupo IN (0, 1, 2)),
    activo BOOLEAN DEFAULT TRUE,
    modificado_por INTEGER REFERENCES usuario(id),
    fecha_modificacion TIMESTAMPTZ DEFAULT NOW(),
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(departamento_id, sede_id, grupo)
);

-- Indices para busqueda rapida
CREATE INDEX IF NOT EXISTS idx_estado_grupo_depto ON estado_grupo_departamento(departamento_id);
CREATE INDEX IF NOT EXISTS idx_estado_grupo_sede ON estado_grupo_departamento(sede_id);
CREATE INDEX IF NOT EXISTS idx_estado_grupo_activo ON estado_grupo_departamento(activo) WHERE activo = TRUE;

-- Inicializar todos los grupos como activos por defecto
INSERT INTO estado_grupo_departamento (departamento_id, sede_id, grupo, activo, observaciones)
SELECT
    ds.id,
    s.id,
    g.grupo,
    TRUE,
    'Estado inicial'
FROM departamento_sistema ds
CROSS JOIN sede s
CROSS JOIN (SELECT 0 AS grupo UNION SELECT 1 UNION SELECT 2) g
WHERE ds.usa_sistema_grupos = TRUE AND ds.activo = TRUE AND s.activa = TRUE
ON CONFLICT (departamento_id, sede_id, grupo) DO NOTHING;

-- =====================================================
-- 6. SISTEMA DE ENCARGADOS POR SEDE/GRUPO
-- =====================================================

-- Campo en usuario para identificar encargado actual
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS es_encargado_grupo BOOLEAN DEFAULT FALSE;

-- Tabla de historial de encargados
CREATE TABLE IF NOT EXISTS historial_encargado_sede_grupo (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    sede_id INTEGER NOT NULL REFERENCES sede(id) ON DELETE CASCADE,
    grupo SMALLINT NOT NULL CHECK (grupo IN (0, 1, 2)),
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin DATE,  -- NULL = actualmente encargado
    asignado_por INTEGER REFERENCES usuario(id),
    removido_por INTEGER REFERENCES usuario(id),
    motivo_asignacion TEXT,
    motivo_remocion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices para busqueda rapida
CREATE INDEX IF NOT EXISTS idx_historial_encargado_activo
    ON historial_encargado_sede_grupo(sede_id, grupo)
    WHERE fecha_fin IS NULL;
CREATE INDEX IF NOT EXISTS idx_historial_encargado_usuario
    ON historial_encargado_sede_grupo(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historial_encargado_fechas
    ON historial_encargado_sede_grupo(fecha_inicio, fecha_fin);

-- =====================================================
-- 7. VISTAS PARA CONSULTAS
-- =====================================================

-- Vista de estado actual de grupos por departamento y sede
CREATE OR REPLACE VIEW v_estado_grupos_actual AS
SELECT
    ds.id AS departamento_id,
    ds.codigo AS departamento_codigo,
    ds.nombre AS departamento_nombre,
    s.id AS sede_id,
    s.codigo AS sede_codigo,
    s.nombre AS sede_nombre,
    egd.grupo,
    CASE egd.grupo
        WHEN 0 THEN 'Normal (L-V)'
        WHEN 1 THEN 'Grupo 1'
        WHEN 2 THEN 'Grupo 2'
    END AS grupo_nombre,
    COALESCE(egd.activo, TRUE) AS activo,
    egd.fecha_modificacion,
    egd.observaciones,
    u.nombre_completo AS modificado_por_nombre
FROM departamento_sistema ds
CROSS JOIN sede s
CROSS JOIN (SELECT 0 AS grupo UNION SELECT 1 UNION SELECT 2) g
LEFT JOIN estado_grupo_departamento egd
    ON egd.departamento_id = ds.id
    AND egd.sede_id = s.id
    AND egd.grupo = g.grupo
LEFT JOIN usuario u ON u.id = egd.modificado_por
WHERE ds.usa_sistema_grupos = TRUE
    AND ds.activo = TRUE
    AND s.activa = TRUE;

-- Vista de encargados actuales
CREATE OR REPLACE VIEW v_encargados_actuales AS
SELECT
    h.id AS asignacion_id,
    h.usuario_id,
    u.nombre_completo,
    u.chapa,
    u.telefono,
    u.email,
    h.sede_id,
    s.codigo AS sede_codigo,
    s.nombre AS sede_nombre,
    h.grupo,
    CASE h.grupo
        WHEN 0 THEN 'Normal (L-V)'
        WHEN 1 THEN 'Grupo 1'
        WHEN 2 THEN 'Grupo 2'
    END AS grupo_nombre,
    h.fecha_inicio,
    h.motivo_asignacion,
    ua.nombre_completo AS asignado_por_nombre,
    h.created_at
FROM historial_encargado_sede_grupo h
JOIN usuario u ON u.id = h.usuario_id
JOIN sede s ON s.id = h.sede_id
LEFT JOIN usuario ua ON ua.id = h.asignado_por
WHERE h.fecha_fin IS NULL;

-- Vista de usuarios con su departamento y grupo
CREATE OR REPLACE VIEW v_usuarios_admin AS
SELECT
    u.id,
    u.uuid,
    u.username,
    u.nombre_completo,
    u.chapa,
    u.email,
    u.telefono,
    u.activo,
    u.acceso_app_activo,
    u.grupo,
    CASE u.grupo
        WHEN 0 THEN 'Normal (L-V)'
        WHEN 1 THEN 'Grupo 1'
        WHEN 2 THEN 'Grupo 2'
        ELSE 'Sin asignar'
    END AS grupo_nombre,
    u.exento_grupos,
    u.es_encargado_grupo,
    r.nombre AS rol_codigo,
    r.nombre AS rol_nombre,
    s.id AS sede_id,
    s.codigo AS sede_codigo,
    s.nombre AS sede_nombre,
    src.codigo AS sub_rol_cop_codigo,
    src.nombre AS sub_rol_cop_nombre,
    u.ultimo_acceso,
    u.created_at
FROM usuario u
JOIN rol r ON r.id = u.rol_id
LEFT JOIN sede s ON s.id = u.sede_id
LEFT JOIN sub_rol_cop src ON src.id = u.sub_rol_cop_id
ORDER BY u.nombre_completo;

-- =====================================================
-- 8. FUNCIONES PARA GESTION DE ENCARGADOS
-- =====================================================

-- Funcion para asignar encargado
CREATE OR REPLACE FUNCTION fn_asignar_encargado(
    p_usuario_id INTEGER,
    p_sede_id INTEGER,
    p_grupo SMALLINT,
    p_asignado_por INTEGER,
    p_motivo TEXT DEFAULT 'Asignacion de encargado'
) RETURNS INTEGER AS $$
DECLARE
    v_encargado_anterior_id INTEGER;
    v_nuevo_id INTEGER;
BEGIN
    -- Verificar que el usuario existe y esta activo
    IF NOT EXISTS (SELECT 1 FROM usuario WHERE id = p_usuario_id AND activo = TRUE) THEN
        RAISE EXCEPTION 'El usuario no existe o no esta activo';
    END IF;

    -- Verificar que la sede existe y esta activa
    IF NOT EXISTS (SELECT 1 FROM sede WHERE id = p_sede_id AND activa = TRUE) THEN
        RAISE EXCEPTION 'La sede no existe o no esta activa';
    END IF;

    -- Cerrar encargado anterior si existe
    UPDATE historial_encargado_sede_grupo
    SET fecha_fin = CURRENT_DATE,
        removido_por = p_asignado_por,
        motivo_remocion = 'Reemplazado por nuevo encargado'
    WHERE sede_id = p_sede_id
      AND grupo = p_grupo
      AND fecha_fin IS NULL
    RETURNING usuario_id INTO v_encargado_anterior_id;

    -- Quitar flag de encargado al anterior (si no tiene otras asignaciones)
    IF v_encargado_anterior_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM historial_encargado_sede_grupo
            WHERE usuario_id = v_encargado_anterior_id
              AND fecha_fin IS NULL
              AND id != (SELECT id FROM historial_encargado_sede_grupo
                         WHERE usuario_id = v_encargado_anterior_id
                           AND sede_id = p_sede_id
                           AND grupo = p_grupo
                         ORDER BY id DESC LIMIT 1)
        ) THEN
            UPDATE usuario SET es_encargado_grupo = FALSE WHERE id = v_encargado_anterior_id;
        END IF;
    END IF;

    -- Crear nuevo registro
    INSERT INTO historial_encargado_sede_grupo (
        usuario_id, sede_id, grupo, asignado_por, motivo_asignacion
    )
    VALUES (p_usuario_id, p_sede_id, p_grupo, p_asignado_por, p_motivo)
    RETURNING id INTO v_nuevo_id;

    -- Marcar usuario como encargado
    UPDATE usuario SET es_encargado_grupo = TRUE WHERE id = p_usuario_id;

    RETURN v_nuevo_id;
END;
$$ LANGUAGE plpgsql;

-- Funcion para remover encargado
CREATE OR REPLACE FUNCTION fn_remover_encargado(
    p_sede_id INTEGER,
    p_grupo SMALLINT,
    p_removido_por INTEGER,
    p_motivo TEXT DEFAULT 'Removido manualmente'
) RETURNS BOOLEAN AS $$
DECLARE
    v_usuario_id INTEGER;
BEGIN
    -- Cerrar asignacion actual
    UPDATE historial_encargado_sede_grupo
    SET fecha_fin = CURRENT_DATE,
        removido_por = p_removido_por,
        motivo_remocion = p_motivo
    WHERE sede_id = p_sede_id
      AND grupo = p_grupo
      AND fecha_fin IS NULL
    RETURNING usuario_id INTO v_usuario_id;

    IF v_usuario_id IS NOT NULL THEN
        -- Verificar si tiene otras asignaciones activas
        IF NOT EXISTS (
            SELECT 1 FROM historial_encargado_sede_grupo
            WHERE usuario_id = v_usuario_id AND fecha_fin IS NULL
        ) THEN
            UPDATE usuario SET es_encargado_grupo = FALSE WHERE id = v_usuario_id;
        END IF;
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Funcion para verificar si un grupo esta activo para un usuario
CREATE OR REPLACE FUNCTION fn_verificar_acceso_grupo(
    p_usuario_id INTEGER
) RETURNS TABLE (
    tiene_acceso BOOLEAN,
    motivo TEXT
) AS $$
DECLARE
    v_usuario RECORD;
    v_depto_codigo TEXT;
    v_estado_grupo BOOLEAN;
BEGIN
    -- Obtener datos del usuario
    SELECT u.*, r.nombre AS rol_codigo
    INTO v_usuario
    FROM usuario u
    JOIN rol r ON r.id = u.rol_id
    WHERE u.id = p_usuario_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Usuario no encontrado'::TEXT;
        RETURN;
    END IF;

    -- Verificar si esta activo
    IF NOT v_usuario.activo THEN
        RETURN QUERY SELECT FALSE, 'Usuario desactivado'::TEXT;
        RETURN;
    END IF;

    -- Verificar acceso a app
    IF NOT COALESCE(v_usuario.acceso_app_activo, TRUE) THEN
        RETURN QUERY SELECT FALSE, 'Acceso a app desactivado'::TEXT;
        RETURN;
    END IF;

    -- Si esta exento de grupos, tiene acceso
    IF COALESCE(v_usuario.exento_grupos, FALSE) THEN
        RETURN QUERY SELECT TRUE, 'Exento de sistema de grupos'::TEXT;
        RETURN;
    END IF;

    -- Si no tiene grupo asignado, no tiene acceso
    IF v_usuario.grupo IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Sin grupo asignado'::TEXT;
        RETURN;
    END IF;

    -- Determinar departamento basado en rol
    v_depto_codigo := v_usuario.rol_codigo;

    -- Verificar estado del grupo para este departamento y sede
    SELECT egd.activo INTO v_estado_grupo
    FROM estado_grupo_departamento egd
    JOIN departamento_sistema ds ON ds.id = egd.departamento_id
    WHERE ds.codigo = v_depto_codigo
      AND egd.sede_id = v_usuario.sede_id
      AND egd.grupo = v_usuario.grupo;

    -- Si no hay registro, asumimos activo por defecto
    IF NOT FOUND THEN
        v_estado_grupo := TRUE;
    END IF;

    IF v_estado_grupo THEN
        RETURN QUERY SELECT TRUE, 'Acceso permitido'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'Grupo desactivado para tu departamento/sede'::TEXT;
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. PERMISOS ADICIONALES PARA SUB-ROLES COP
-- =====================================================

ALTER TABLE sub_rol_cop ADD COLUMN IF NOT EXISTS puede_gestionar_usuarios BOOLEAN DEFAULT FALSE;
ALTER TABLE sub_rol_cop ADD COLUMN IF NOT EXISTS puede_gestionar_grupos BOOLEAN DEFAULT FALSE;
ALTER TABLE sub_rol_cop ADD COLUMN IF NOT EXISTS puede_ver_todos_departamentos BOOLEAN DEFAULT FALSE;

-- Actualizar permisos existentes
UPDATE sub_rol_cop SET
    puede_gestionar_usuarios = TRUE,
    puede_gestionar_grupos = TRUE,
    puede_ver_todos_departamentos = TRUE
WHERE codigo = 'ADMIN_COP';

UPDATE sub_rol_cop SET
    puede_gestionar_usuarios = TRUE,
    puede_gestionar_grupos = TRUE,
    puede_ver_todos_departamentos = FALSE
WHERE codigo IN ('ENCARGADO_ISLA', 'SUB_ENCARGADO_ISLA');

UPDATE sub_rol_cop SET
    puede_gestionar_usuarios = FALSE,
    puede_gestionar_grupos = FALSE,
    puede_ver_todos_departamentos = FALSE
WHERE codigo = 'OPERADOR';

-- =====================================================
-- 10. LOG DE CAMBIOS DE ADMINISTRACION
-- =====================================================

CREATE TABLE IF NOT EXISTS log_administracion (
    id SERIAL PRIMARY KEY,
    accion VARCHAR(50) NOT NULL,  -- TOGGLE_GRUPO, ASIGNAR_ENCARGADO, CAMBIAR_ROL, etc.
    tabla_afectada VARCHAR(50),
    registro_id INTEGER,
    usuario_afectado_id INTEGER REFERENCES usuario(id),
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    realizado_por INTEGER NOT NULL REFERENCES usuario(id),
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_log_admin_accion ON log_administracion(accion);
CREATE INDEX IF NOT EXISTS idx_log_admin_fecha ON log_administracion(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_admin_usuario ON log_administracion(usuario_afectado_id);

-- =====================================================
-- 11. ASIGNAR ENCARGADOS INICIALES (OPCIONAL)
-- =====================================================

-- Asignar un brigadista por sede/grupo como encargado inicial
-- Solo si no hay encargados asignados aun
DO $$
DECLARE
    v_sede RECORD;
    v_brigada RECORD;
    v_admin_id INTEGER;
BEGIN
    -- Obtener ID de un admin para el campo asignado_por
    SELECT id INTO v_admin_id FROM usuario WHERE rol_id = (SELECT id FROM rol WHERE nombre = 'ADMIN') LIMIT 1;
    IF v_admin_id IS NULL THEN
        v_admin_id := 1; -- Fallback
    END IF;

    FOR v_sede IN SELECT id FROM sede WHERE activa = TRUE LOOP
        -- Solo asignar si no hay encargado para ese grupo

        -- Grupo 1
        IF NOT EXISTS (SELECT 1 FROM historial_encargado_sede_grupo WHERE sede_id = v_sede.id AND grupo = 1 AND fecha_fin IS NULL) THEN
            SELECT id INTO v_brigada FROM usuario
            WHERE sede_id = v_sede.id
              AND rol_id = (SELECT id FROM rol WHERE nombre = 'BRIGADA')
              AND grupo = 1
              AND activo = TRUE
            ORDER BY nombre_completo
            LIMIT 1;

            IF v_brigada.id IS NOT NULL THEN
                PERFORM fn_asignar_encargado(v_brigada.id, v_sede.id, 1::SMALLINT, v_admin_id, 'Asignacion inicial automatica');
            END IF;
        END IF;

        -- Grupo 2
        IF NOT EXISTS (SELECT 1 FROM historial_encargado_sede_grupo WHERE sede_id = v_sede.id AND grupo = 2 AND fecha_fin IS NULL) THEN
            SELECT id INTO v_brigada FROM usuario
            WHERE sede_id = v_sede.id
              AND rol_id = (SELECT id FROM rol WHERE nombre = 'BRIGADA')
              AND grupo = 2
              AND activo = TRUE
            ORDER BY nombre_completo
            LIMIT 1;

            IF v_brigada.id IS NOT NULL THEN
                PERFORM fn_asignar_encargado(v_brigada.id, v_sede.id, 2::SMALLINT, v_admin_id, 'Asignacion inicial automatica');
            END IF;
        END IF;
    END LOOP;
END $$;

COMMIT;

-- =====================================================
-- FIN DE MIGRACION 073
-- =====================================================
