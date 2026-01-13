-- 098_refactor_catalog.sql
-- Refactoriza el catálogo de situaciones para agrupar accidentes y emergencias en selects secundarios
-- Limpia el menú principal y asegura la existencia de catálogos secundarios

BEGIN;

-- 1. Crear tabla tipo_asistencia_vial si no existe
CREATE TABLE IF NOT EXISTS public.tipo_asistencia_vial (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Limpiar Catálogo Principal (Desactivar items específicos del menú Nivel 1)
UPDATE catalogo_tipo_situacion SET activo = false 
WHERE nombre IN (
    'Colisión', 'Choque', 'Salida de pista', 'Derrape', 'Caída de carga', 'Desprendimiento de carga',
    'Desbalance de carga', 'Desprendimiento de neumático', 'Desprendimiento de eje', 'Vehículo incendiado',
    'Ataque armado', 'Vuelco', 'Atropello', 'Persona Fallecida',
    'Asistencia vial', 
    'Derrame de combustible', 'Vehículo abandonado', 'Detención de vehículo', 'Caída de árbol',
    'Desprendimiento de rocas', 'Derrumbe', 'Deslave', 'Deslizamiento de tierra', 'Hundimiento',
    'Socavamiento', 'Desbordamiento de rio', 'Inundación', 'Acumulación de agua', 'Erupción volcánica'
);

-- 3. Asegurar Botones Macro en Catálogo Principal (Nivel 1)
-- Insertar Categorías si faltan
INSERT INTO catalogo_categoria_situacion (nombre, codigo, icono, activo) VALUES 
('ACCIDENTE', 'ACCIDENTE', 'car-crash', true),
('ASISTENCIA', 'ASISTENCIA', 'wrench', true),
('EMERGENCIA', 'EMERGENCIA', 'alert', true)
ON CONFLICT (codigo) DO UPDATE SET activo = true;

-- Insertar Tipos Genéricos (Botones que abren los forms)
-- Accidente
INSERT INTO catalogo_tipo_situacion (nombre, categoria_id, formulario_tipo, activo, icono)
SELECT 'Accidente de Tránsito', id, 'INCIDENTE', true, 'car-crash'
FROM catalogo_categoria_situacion WHERE codigo = 'ACCIDENTE'
ON CONFLICT (nombre) DO UPDATE SET activo = true, formulario_tipo = 'INCIDENTE';

-- Asistencia
INSERT INTO catalogo_tipo_situacion (nombre, categoria_id, formulario_tipo, activo, icono)
SELECT 'Asistencia Vial', id, 'ASISTENCIA', true, 'wrench'
FROM catalogo_categoria_situacion WHERE codigo = 'ASISTENCIA'
ON CONFLICT (nombre) DO UPDATE SET activo = true, formulario_tipo = 'ASISTENCIA';

-- Emergencia
INSERT INTO catalogo_tipo_situacion (nombre, categoria_id, formulario_tipo, activo, icono)
SELECT 'Emergencia / Obstáculo', id, 'OBSTACULO', true, 'alert-triangle'
FROM catalogo_categoria_situacion WHERE codigo = 'EMERGENCIA'
ON CONFLICT (nombre) DO UPDATE SET activo = true, formulario_tipo = 'OBSTACULO';


-- 4. Poblar Catálogos Secundarios (Selects dentro del form)

-- A. Tipo Hecho (Accidentes)
-- Usamos bloque DO para evitar duplicados si no hay constraint
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'Colisión', 'Choque', 'Salida de pista', 'Derrape', 'Caída de carga', 
        'Desprendimiento de carga', 'Desbalance de carga', 'Desprendimiento de neumático', 
        'Desprendimiento de eje', 'Vehículo incendiado', 'Ataque armado', 'Vuelco', 
        'Atropello', 'Persona Fallecida'
    ] LOOP
        INSERT INTO tipo_hecho (nombre, activo)
        SELECT t, true
        WHERE NOT EXISTS (SELECT 1 FROM tipo_hecho WHERE nombre = t);
    END LOOP;
END$$;

-- B. Tipo Asistencia
INSERT INTO tipo_asistencia_vial (nombre, activo) VALUES 
('Mecánica', true),
('Combustible', true), 
('Seguridad', true), 
('Neumático', true),
('Eléctrica', true),
('Grúa', true),
('Otros', true)
ON CONFLICT (nombre) DO UPDATE SET activo = true;

-- C. Tipo Emergencia / Obstáculo
INSERT INTO tipo_emergencia_vial (codigo, nombre, activo, icono) VALUES
('DERRAME', 'Derrame de combustible', true, 'water'), 
('ABANDONADO', 'Vehículo abandonado', true, 'car-off'),
('DETENCION', 'Detención de vehículo', true, 'alert-octagon'),
('ARBOL', 'Caída de árbol', true, 'tree'),
('ROCAS', 'Desprendimiento de rocas', true, 'alert'),
('DERRUMBE', 'Derrumbe', true, 'alert-triangle'),
('DESLAVE', 'Deslave', true, 'waves'),
('DESLIZAMIENTO', 'Deslizamiento de tierra', true, 'terrain'),
('HUNDIMIENTO', 'Hundimiento', true, 'arrow-down-circle'),
('SOCAVAMIENTO', 'Socavamiento', true, 'alert-circle'),
('DESBORDAMIENTO', 'Desbordamiento de rio', true, 'water'),
('INUNDACION', 'Inundación', true, 'water-percent'),
('AGUA', 'Acumulación de agua', true, 'water-plus'),
('ERUPCION', 'Erupción volcánica', true, 'volcano')
ON CONFLICT (codigo) DO UPDATE SET activo=true;

COMMIT;
