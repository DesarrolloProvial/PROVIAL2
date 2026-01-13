-- 095_catalogo_situaciones.sql (CORREGIDO)
-- Crea un catálogo unificado de situaciones y tipos de actividades
-- Reemplaza/Complementa los tipos hardcodeados

BEGIN;

-- 1. Crear tabla de categorías
CREATE TABLE IF NOT EXISTS catalogo_categoria_situacion (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    icono VARCHAR(50),
    orden INTEGER DEFAULT 0
);

-- 2. Crear tabla de tipos de situaciones
CREATE TABLE IF NOT EXISTS catalogo_tipo_situacion (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER REFERENCES catalogo_categoria_situacion(id),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50),
    requiere_formulario BOOLEAN DEFAULT FALSE,
    formulario_tipo VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    orden INTEGER DEFAULT 0
);

-- 3. Insertar Categorías (Usando ON CONFLICT para evitar errores si ya existen)
INSERT INTO catalogo_categoria_situacion (codigo, nombre, icono, orden) VALUES
('ACCIDENTE', 'Accidentes de Tránsito', 'car-crash', 1),
('ASISTENCIA', 'Asistencia Vial', 'car-wrench', 2),
('EMERGENCIA', 'Emergencias y Obstáculos', 'alert', 3),
('OPERATIVO', 'Actividades Operativas', 'police-badge', 4),
('APOYO', 'Apoyo Interinstitucional', 'hand-shake', 5),
('ADMINISTRATIVO', 'Novedades y Gestión', 'clipboard-list', 6)
ON CONFLICT (codigo) DO NOTHING;

-- 4. Insertar Tipos de Situaciones (Sintaxis simplificada compatible)

-- ACCIDENTES
INSERT INTO catalogo_tipo_situacion (categoria_id, nombre, formulario_tipo, icono) 
SELECT c.id, t.nombre, 'INCIDENTE', t.icono 
FROM catalogo_categoria_situacion c,
(VALUES
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
) AS t(nombre, icono)
WHERE c.codigo = 'ACCIDENTE';

-- ASISTENCIA
INSERT INTO catalogo_tipo_situacion (categoria_id, nombre, formulario_tipo, icono)
SELECT c.id, 'Asistencia vial', 'ASISTENCIA', 'tow-truck' 
FROM catalogo_categoria_situacion c 
WHERE c.codigo = 'ASISTENCIA';

-- EMERGENCIAS / OBSTACULOS
INSERT INTO catalogo_tipo_situacion (categoria_id, nombre, formulario_tipo, icono)
SELECT c.id, t.nombre, 'OBSTACULO', t.icono
FROM catalogo_categoria_situacion c,
(VALUES
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
) AS t(nombre, icono)
WHERE c.codigo = 'EMERGENCIA';

-- OPERATIVO
INSERT INTO catalogo_tipo_situacion (categoria_id, nombre, formulario_tipo, icono)
SELECT c.id, t.nombre, 'ACTIVIDAD', t.icono
FROM catalogo_categoria_situacion c,
(VALUES
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
) AS t(nombre, icono)
WHERE c.codigo = 'OPERATIVO';

-- APOYO
INSERT INTO catalogo_tipo_situacion (categoria_id, nombre, formulario_tipo, icono)
SELECT c.id, t.nombre, 'ACTIVIDAD', t.icono
FROM catalogo_categoria_situacion c,
(VALUES
    ('Apoyo a Ministerio Público', 'gavel'),
    ('Apoyo a otra unidad', 'car-multiple'),
    ('Apoyo a trabajos en carretera', 'road-worker'),
    ('Apoyo a ciclismo', 'bike'),
    ('Apoyo a DIGEF', 'run'),
    ('Apoyo a triatlón', 'swim'),
    ('Apoyo atletismo', 'run-fast'),
    ('Apoyo a antorcha', 'fire'),
    ('Apoyo a institución', 'bank')
) AS t(nombre, icono)
WHERE c.codigo = 'APOYO';

-- ADMINISTRATIVO / NOVEDAD
INSERT INTO catalogo_tipo_situacion (categoria_id, nombre, formulario_tipo, icono)
SELECT c.id, t.nombre, 'NOVEDAD', t.icono
FROM catalogo_categoria_situacion c,
(VALUES
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
) AS t(nombre, icono)
WHERE c.codigo = 'ADMINISTRATIVO';

-- 5. Agregar columna a tabla situacion (si no existe)
ALTER TABLE situacion 
ADD COLUMN IF NOT EXISTS tipo_situacion_id INTEGER REFERENCES catalogo_tipo_situacion(id);

COMMIT;
