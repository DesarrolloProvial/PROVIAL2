-- 095_catalogo_situaciones.sql
-- Crea un catálogo unificado de situaciones y tipos de actividades
-- Reemplaza/Complementa los tipos hardcodeados

BEGIN;

-- 1. Crear tabla de categorías (para agrupar visualmente)
CREATE TABLE catalogo_categoria_situacion (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL, -- ACCIDENTE, ASISTENCIA, etc.
    nombre VARCHAR(100) NOT NULL,
    icono VARCHAR(50),
    orden INTEGER DEFAULT 0
);

-- 2. Crear tabla de tipos de situaciones
CREATE TABLE catalogo_tipo_situacion (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER REFERENCES catalogo_categoria_situacion(id),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50),
    requiere_formulario BOOLEAN DEFAULT FALSE, -- Si true, abre form complejo. Si false, es solo timer/simple.
    formulario_tipo VARCHAR(50), -- 'INCIDENTE', 'ASISTENCIA', 'OBSTACULO', 'NOVEDAD'
    activo BOOLEAN DEFAULT TRUE,
    orden INTEGER DEFAULT 0
);

-- 3. Insertar Categorías
INSERT INTO catalogo_categoria_situacion (codigo, nombre, icono, orden) VALUES
('ACCIDENTE', 'Accidentes de Tránsito', 'car-crash', 1),
('ASISTENCIA', 'Asistencia Vial', 'car-wrench', 2),
('EMERGENCIA', 'Emergencias y Obstáculos', 'alert', 3),
('OPERATIVO', 'Actividades Operativas', 'police-badge', 4),
('APOYO', 'Apoyo Interinstitucional', 'hand-shake', 5),
('ADMINISTRATIVO', 'Novedades y Gestión', 'clipboard-list', 6);

-- 4. Insertar Tipos de Situaciones
-- ACCIDENTES
INSERT INTO catalogo_tipo_situacion (categoria_id, nombre, formulario_tipo, icono) 
SELECT id, nombre, 'INCIDENTE', icono FROM catalogo_categoria_situacion WHERE codigo = 'ACCIDENTE' CROSS JOIN (VALUES
    ('Colisión', 'car-crash'),
    ('Choque', 'car-impact'),
    ('Salida de pista', 'road-variant'),
    ('Derrape', 'tire'),
    ('Caída de carga', 'package-down'),
    ('Desprendimiento de carga', 'truck-cargo-container'),
    ('Desbalance de carga', 'weight'),
    ('Desprendimiento de neumático', 'car-tire-alert'),
    ('Desprendimiento de eje', 'axis-arrow'),
    ('Vehículo incendiado', 'fire-truck'),
    ('Ataque armado', 'pistol'),
    ('Vuelco', 'car-side'),
    ('Atropello', 'account-injury'),
    ('Persona Fallecida', 'coffin')
) AS t(nombre, icono);

-- ASISTENCIA
INSERT INTO catalogo_tipo_situacion (categoria_id, nombre, formulario_tipo, icono)
SELECT id, 'Asistencia vial', 'ASISTENCIA', 'tow-truck' FROM catalogo_categoria_situacion WHERE codigo = 'ASISTENCIA';

-- EMERGENCIAS / OBSTACULOS
INSERT INTO catalogo_tipo_situacion (categoria_id, nombre, formulario_tipo, icono)
SELECT id, nombre, 'OBSTACULO', icono FROM catalogo_categoria_situacion WHERE codigo = 'EMERGENCIA' CROSS JOIN (VALUES
    ('Derrame de combustible', 'oil'),
    ('Vehículo abandonado', 'car-off'),
    ('Detención de vehículo', 'car-brake-alert'),
    ('Caída de árbol', 'tree'),
    ('Desprendimiento de rocas', 'image-filter-hdr'),
    ('Derrumbe', 'landslide'),
    ('Deslave', 'waves'),
    ('Deslizamiento de tierra', 'slope-downhill'),
    ('Hundimiento', 'arrow-down-bold-box'),
    ('Socavamiento', 'table-row-remove'),
    ('Desbordamiento de rio', 'water'),
    ('Inundación', 'home-flood'),
    ('Acumulación de agua', 'water-alert'),
    ('Erupción volcánica', 'volcano')
) AS t(nombre, icono);

-- OPERATIVO
INSERT INTO catalogo_tipo_situacion (categoria_id, nombre, formulario_tipo, icono)
SELECT id, nombre, 'ACTIVIDAD', icono FROM catalogo_categoria_situacion WHERE codigo = 'OPERATIVO' CROSS JOIN (VALUES
    ('Puesto fijo', 'police-station'),
    ('Parada estratégica', 'map-marker-radius'),
    ('Señalizando', 'traffic-cone'),
    ('Conteo vehicular', 'counter'),
    ('Toma de velocidad', 'speedometer'),
    ('Retirando señalización', 'traffic-cone-off'),
    ('Lavado de unidad', 'car-wash'),
    ('Regulación de tránsito', 'traffic-light'),
    ('Regulación colonia', 'home-city'),
    ('Regulación en aeropuerto', 'airplane'),
    ('Supervisando unidad', 'eye-check'),
    ('Verificación de situación', 'clipboard-check'),
    ('Apoyo a bascula', 'scale'),
    ('Escoltando carga ancha', 'truck-wide'),
    ('Escoltando Autoridades', 'shield-account'),
    ('Operativo Provial', 'police-badge'),
    ('Operativo con PNC-DT', 'police-badge-outline'),
    ('Operativo interinstitucional', 'account-group'),
    ('Bloqueo', 'road-barrier'),
    ('Manifestación', 'bullhorn'),
    ('Patrullaje de Ruta', 'car-police'),
    ('Orden del Día', 'file-document'),
    ('Consignación', 'file-sign'),
    ('Parada Autorizada', 'stop-circle'),
    ('Intercambio de tripulantes', 'account-switch')
) AS t(nombre, icono);

-- APOYO
INSERT INTO catalogo_tipo_situacion (categoria_id, nombre, formulario_tipo, icono)
SELECT id, nombre, 'ACTIVIDAD', icono FROM catalogo_categoria_situacion WHERE codigo = 'APOYO' CROSS JOIN (VALUES
    ('Apoyo a Ministerio Público', 'gavel'),
    ('Apoyo a otra unidad', 'car-multiple'),
    ('Apoyo a trabajos en carretera', 'road-worker'),
    ('Apoyo a ciclismo', 'bike'),
    ('Apoyo a DIGEF', 'run'),
    ('Apoyo a triatlón', 'swim'),
    ('Apoyo atletismo', 'run-fast'),
    ('Apoyo a antorcha', 'fire'),
    ('Apoyo a institución', 'bank')
) AS t(nombre, icono);

-- ADMINISTRATIVO / NOVEDAD
INSERT INTO catalogo_tipo_situacion (categoria_id, nombre, formulario_tipo, icono)
SELECT id, nombre, 'NOVEDAD', icono FROM catalogo_categoria_situacion WHERE codigo = 'ADMINISTRATIVO' CROSS JOIN (VALUES
    ('Baño', 'toilet'),
    ('Cajero', 'atm'),
    ('Comida', 'food'),
    ('Falla Mecánica de unidad', 'wrench-clock'),
    ('Hospital', 'hospital'),
    ('Compañero enfermo', 'doctor'),
    ('Dejando personal administrativo', 'account-arrow-right'),
    ('Comisión', 'briefcase'),
    ('Denuncia de usuario', 'comment-alert'),
    ('Salida de Unidad', 'logout'),
    ('Entrada de Unidad', 'login'),
    ('Abastecimiento', 'gas-station'),
    ('Cambio de Ruta', 'map-marker-path'),
    ('Cambio de Tripulación', 'account-sync')
) AS t(nombre, icono);

-- 5. Agregar columna a tabla situacion
ALTER TABLE situacion 
ADD COLUMN IF NOT EXISTS tipo_situacion_id INTEGER REFERENCES catalogo_tipo_situacion(id);

COMMIT;
