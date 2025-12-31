-- =====================================================
-- MIGRACIÓN 046: Rol Encargado de Nóminas
-- =====================================================
-- El encargado de nóminas de sede Central (chapa 16036) puede:
-- - VER todas las asignaciones de todas las sedes (como admin)
-- - NO puede crear ni editar asignaciones
-- - NO puede editar brigadas ni unidades de otras sedes
--
-- Los encargados de nóminas de sedes regionales:
-- - Solo ven asignaciones de su sede
-- - Solo editan brigadas/unidades de su sede
-- =====================================================

-- 1. Crear nuevo rol ENCARGADO_NOMINAS
INSERT INTO rol (nombre, descripcion)
VALUES ('ENCARGADO_NOMINAS', 'Encargado de nóminas - Vista de asignaciones, gestión limitada')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Agregar columna para indicar si puede ver todas las sedes
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS puede_ver_todas_sedes BOOLEAN DEFAULT false;

-- Comentario
COMMENT ON COLUMN usuario.puede_ver_todas_sedes IS 'Si true, el usuario puede ver asignaciones de todas las sedes (solo lectura)';

-- 3. Cambiar al brigada 16036 al rol ENCARGADO_NOMINAS y darle permiso de ver todas las sedes
UPDATE usuario
SET rol_id = (SELECT id FROM rol WHERE nombre = 'ENCARGADO_NOMINAS'),
    puede_ver_todas_sedes = true
WHERE chapa = '16036';

-- 4. Desactivar usuarios de OPERACIONES de prueba (mantener datos pero inactivos)
UPDATE usuario
SET activo = false
WHERE id IN (566, 14);  -- operador y operaciones

-- 5. Mostrar resultado
DO $$
DECLARE
    v_usuario RECORD;
BEGIN
    SELECT u.id, u.username, u.nombre_completo, r.nombre as rol, u.puede_ver_todas_sedes
    INTO v_usuario
    FROM usuario u
    JOIN rol r ON u.rol_id = r.id
    WHERE u.chapa = '16036';

    RAISE NOTICE 'Usuario actualizado: % (%) - Rol: %, Ver todas sedes: %',
        v_usuario.nombre_completo, v_usuario.username, v_usuario.rol, v_usuario.puede_ver_todas_sedes;
END $$;
