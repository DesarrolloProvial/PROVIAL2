-- ============================================
-- MÓDULO DE ACCIDENTOLOGÍA Y COMUNICACIÓN SOCIAL
-- Migración 077
-- ============================================

-- ============================================
-- TIPOS PARA ACCIDENTOLOGÍA
-- ============================================

CREATE TYPE tipo_accidente AS ENUM (
  'COLISION_FRONTAL',
  'COLISION_LATERAL',
  'COLISION_TRASERA',
  'VOLCADURA',
  'ATROPELLO',
  'CAIDA_DE_MOTO',
  'SALIDA_DE_CARRIL',
  'CHOQUE_OBJETO_FIJO',
  'MULTIPLE',
  'OTRO'
);

CREATE TYPE tipo_vehiculo_accidente AS ENUM (
  'AUTOMOVIL',
  'PICKUP',
  'CAMION',
  'BUS',
  'MOTOCICLETA',
  'BICICLETA',
  'PEATON',
  'TRAILER',
  'MAQUINARIA',
  'OTRO'
);

CREATE TYPE estado_persona_accidente AS ENUM (
  'ILESO',
  'HERIDO_LEVE',
  'HERIDO_MODERADO',
  'HERIDO_GRAVE',
  'FALLECIDO'
);

CREATE TYPE tipo_lesion AS ENUM (
  'NINGUNA',
  'CONTUSIONES',
  'LACERACIONES',
  'FRACTURAS',
  'TRAUMA_CRANEAL',
  'TRAUMA_TORACICO',
  'TRAUMA_ABDOMINAL',
  'QUEMADURAS',
  'AMPUTACION',
  'MULTIPLE',
  'OTRO'
);

-- ============================================
-- TABLA: HOJA DE ACCIDENTOLOGÍA
-- ============================================
CREATE TABLE IF NOT EXISTS hoja_accidentologia (
  id SERIAL PRIMARY KEY,
  situacion_id INTEGER NOT NULL REFERENCES situacion(id) ON DELETE CASCADE,

  -- Datos generales del accidente
  tipo_accidente tipo_accidente NOT NULL,
  descripcion_accidente TEXT,
  condiciones_climaticas VARCHAR(50), -- Despejado, Lluvia, Neblina, etc.
  condiciones_via VARCHAR(50), -- Seca, Mojada, Con Aceite, etc.
  iluminacion VARCHAR(30), -- Día, Noche, Penumbra
  visibilidad VARCHAR(30), -- Buena, Regular, Mala

  -- Ubicación específica
  kilometro DECIMAL(10,2),
  referencia_ubicacion TEXT,
  sentido_via VARCHAR(50),
  tipo_zona VARCHAR(30), -- Urbana, Rural, Semiurbana

  -- Causas probables
  causa_principal TEXT,
  causas_contribuyentes TEXT[],

  -- Autoridades presentes
  pnc_presente BOOLEAN DEFAULT FALSE,
  pnc_agente VARCHAR(100),
  bomberos_presente BOOLEAN DEFAULT FALSE,
  bomberos_unidad VARCHAR(50),
  mp_presente BOOLEAN DEFAULT FALSE,
  mp_fiscal VARCHAR(100),
  otras_autoridades TEXT,

  -- Seguimiento
  requiere_peritaje BOOLEAN DEFAULT FALSE,
  numero_caso_pnc VARCHAR(50),
  numero_caso_mp VARCHAR(50),

  -- Datos del informe
  elaborado_por INTEGER REFERENCES usuario(id),
  revisado_por INTEGER REFERENCES usuario(id),
  fecha_elaboracion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estado VARCHAR(20) DEFAULT 'BORRADOR', -- BORRADOR, COMPLETO, REVISADO, ENVIADO

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accidentologia_situacion ON hoja_accidentologia(situacion_id);
CREATE INDEX idx_accidentologia_tipo ON hoja_accidentologia(tipo_accidente);
CREATE INDEX idx_accidentologia_fecha ON hoja_accidentologia(fecha_elaboracion);

-- ============================================
-- TABLA: VEHÍCULOS INVOLUCRADOS
-- ============================================
CREATE TABLE IF NOT EXISTS vehiculo_accidente (
  id SERIAL PRIMARY KEY,
  hoja_accidentologia_id INTEGER NOT NULL REFERENCES hoja_accidentologia(id) ON DELETE CASCADE,

  -- Identificación
  numero_vehiculo INTEGER NOT NULL, -- 1, 2, 3... para identificar en croquis
  tipo_vehiculo tipo_vehiculo_accidente NOT NULL,

  -- Datos del vehículo
  placa VARCHAR(20),
  marca VARCHAR(50),
  linea VARCHAR(50),
  modelo_anio INTEGER,
  color VARCHAR(30),
  numero_chasis VARCHAR(50),
  numero_motor VARCHAR(50),

  -- Estado
  danos_descripcion TEXT,
  danos_estimados DECIMAL(12,2),
  posicion_final TEXT, -- Descripción de dónde quedó

  -- Propietario
  propietario_nombre VARCHAR(150),
  propietario_dpi VARCHAR(20),
  propietario_telefono VARCHAR(20),
  propietario_direccion TEXT,

  -- Conductor
  conductor_nombre VARCHAR(150),
  conductor_dpi VARCHAR(20),
  conductor_licencia_tipo VARCHAR(10),
  conductor_licencia_numero VARCHAR(30),
  conductor_telefono VARCHAR(20),
  conductor_direccion TEXT,
  conductor_estado estado_persona_accidente,

  -- Seguro
  tiene_seguro BOOLEAN DEFAULT FALSE,
  aseguradora VARCHAR(100),
  numero_poliza VARCHAR(50),

  -- Fotos (URLs de las fotos subidas)
  fotos TEXT[],

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vehiculo_accidente_hoja ON vehiculo_accidente(hoja_accidentologia_id);

-- ============================================
-- TABLA: PERSONAS AFECTADAS
-- ============================================
CREATE TABLE IF NOT EXISTS persona_accidente (
  id SERIAL PRIMARY KEY,
  hoja_accidentologia_id INTEGER NOT NULL REFERENCES hoja_accidentologia(id) ON DELETE CASCADE,
  vehiculo_accidente_id INTEGER REFERENCES vehiculo_accidente(id),

  -- Identificación
  tipo_persona VARCHAR(20) NOT NULL, -- CONDUCTOR, PASAJERO, PEATON, CICLISTA
  nombre_completo VARCHAR(150),
  dpi VARCHAR(20),
  edad INTEGER,
  genero VARCHAR(10),
  telefono VARCHAR(20),
  direccion TEXT,

  -- Estado y lesiones
  estado estado_persona_accidente NOT NULL,
  tipo_lesion tipo_lesion,
  descripcion_lesiones TEXT,

  -- Atención médica
  requirio_atencion BOOLEAN DEFAULT FALSE,
  hospital_trasladado VARCHAR(100),
  ambulancia_unidad VARCHAR(50),
  hora_traslado TIME,

  -- En caso de fallecimiento
  hora_fallecimiento TIME,
  lugar_fallecimiento VARCHAR(100), -- En el lugar, en traslado, en hospital

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_persona_accidente_hoja ON persona_accidente(hoja_accidentologia_id);
CREATE INDEX idx_persona_accidente_estado ON persona_accidente(estado);

-- ============================================
-- MÓDULO DE COMUNICACIÓN SOCIAL
-- ============================================

-- Tabla de plantillas/machotes de mensajes
CREATE TABLE IF NOT EXISTS plantilla_comunicacion (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,

  -- Tipo de situación a la que aplica
  tipo_situacion VARCHAR(50), -- INCIDENTE, EMERGENCIA, ASISTENCIA, NULL = todos
  tipo_accidente tipo_accidente, -- NULL = todos los accidentes

  -- Contenido del mensaje
  contenido_plantilla TEXT NOT NULL, -- Con variables: {ubicacion}, {fecha}, {heridos}, etc.

  -- Configuración
  activa BOOLEAN DEFAULT TRUE,
  es_predefinida BOOLEAN DEFAULT FALSE, -- Las predefinidas no se pueden eliminar

  -- Hashtags sugeridos
  hashtags TEXT[],

  -- Creación
  creado_por INTEGER REFERENCES usuario(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de publicaciones realizadas
CREATE TABLE IF NOT EXISTS publicacion_social (
  id SERIAL PRIMARY KEY,
  situacion_id INTEGER REFERENCES situacion(id),
  hoja_accidentologia_id INTEGER REFERENCES hoja_accidentologia(id),
  plantilla_id INTEGER REFERENCES plantilla_comunicacion(id),

  -- Contenido publicado
  contenido_texto TEXT NOT NULL,
  contenido_editado TEXT, -- Si se editó antes de publicar
  hashtags TEXT[],

  -- Fotos seleccionadas (URLs)
  fotos_urls TEXT[],

  -- Redes donde se publicó
  publicado_facebook BOOLEAN DEFAULT FALSE,
  publicado_twitter BOOLEAN DEFAULT FALSE, -- X
  publicado_instagram BOOLEAN DEFAULT FALSE,
  publicado_whatsapp BOOLEAN DEFAULT FALSE,
  publicado_threads BOOLEAN DEFAULT FALSE,

  -- Tracking
  fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  publicado_por INTEGER REFERENCES usuario(id),

  -- Estado
  estado VARCHAR(20) DEFAULT 'BORRADOR', -- BORRADOR, PUBLICADO, PROGRAMADO
  fecha_programada TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_publicacion_situacion ON publicacion_social(situacion_id);
CREATE INDEX idx_publicacion_fecha ON publicacion_social(fecha_publicacion);

-- ============================================
-- FUNCIÓN: GENERAR MENSAJE DESDE PLANTILLA
-- ============================================
CREATE OR REPLACE FUNCTION generar_mensaje_plantilla(
  p_plantilla_id INTEGER,
  p_situacion_id INTEGER
) RETURNS TEXT AS $$
DECLARE
  v_plantilla TEXT;
  v_mensaje TEXT;
  v_situacion RECORD;
  v_accidente RECORD;
  v_heridos INTEGER;
  v_fallecidos INTEGER;
  v_vehiculos INTEGER;
BEGIN
  -- Obtener plantilla
  SELECT contenido_plantilla INTO v_plantilla
  FROM plantilla_comunicacion
  WHERE id = p_plantilla_id;

  IF v_plantilla IS NULL THEN
    RETURN NULL;
  END IF;

  -- Obtener datos de la situación
  SELECT
    s.*,
    m.nombre AS municipio_nombre,
    d.nombre AS departamento_nombre
  INTO v_situacion
  FROM situacion s
  LEFT JOIN municipio m ON s.municipio_id = m.id
  LEFT JOIN departamento d ON m.departamento_id = d.id
  WHERE s.id = p_situacion_id;

  -- Obtener datos de accidentología si existe
  SELECT * INTO v_accidente
  FROM hoja_accidentologia
  WHERE situacion_id = p_situacion_id;

  -- Contar personas afectadas
  IF v_accidente IS NOT NULL THEN
    SELECT
      COUNT(*) FILTER (WHERE estado IN ('HERIDO_LEVE', 'HERIDO_MODERADO', 'HERIDO_GRAVE')),
      COUNT(*) FILTER (WHERE estado = 'FALLECIDO'),
      COUNT(DISTINCT vehiculo_accidente_id)
    INTO v_heridos, v_fallecidos, v_vehiculos
    FROM persona_accidente
    WHERE hoja_accidentologia_id = v_accidente.id;
  ELSE
    v_heridos := 0;
    v_fallecidos := 0;
    v_vehiculos := 0;
  END IF;

  -- Reemplazar variables
  v_mensaje := v_plantilla;
  v_mensaje := REPLACE(v_mensaje, '{fecha}', TO_CHAR(v_situacion.created_at, 'DD/MM/YYYY'));
  v_mensaje := REPLACE(v_mensaje, '{hora}', TO_CHAR(v_situacion.created_at, 'HH24:MI'));
  v_mensaje := REPLACE(v_mensaje, '{ubicacion}', COALESCE(CONCAT(v_situacion.km, ' km ', v_situacion.sentido), 'ubicación no especificada'));
  v_mensaje := REPLACE(v_mensaje, '{municipio}', COALESCE(v_situacion.municipio_nombre, ''));
  v_mensaje := REPLACE(v_mensaje, '{departamento}', COALESCE(v_situacion.departamento_nombre, ''));
  v_mensaje := REPLACE(v_mensaje, '{tipo}', v_situacion.tipo_situacion::TEXT);
  v_mensaje := REPLACE(v_mensaje, '{descripcion}', COALESCE(v_situacion.descripcion, ''));
  v_mensaje := REPLACE(v_mensaje, '{heridos}', v_heridos::TEXT);
  v_mensaje := REPLACE(v_mensaje, '{fallecidos}', v_fallecidos::TEXT);
  v_mensaje := REPLACE(v_mensaje, '{vehiculos}', v_vehiculos::TEXT);

  IF v_accidente IS NOT NULL THEN
    v_mensaje := REPLACE(v_mensaje, '{tipo_accidente}', v_accidente.tipo_accidente::TEXT);
    v_mensaje := REPLACE(v_mensaje, '{km}', COALESCE(v_accidente.kilometro::TEXT, ''));
  END IF;

  RETURN v_mensaje;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DATOS INICIALES: PLANTILLAS PREDEFINIDAS
-- ============================================
INSERT INTO plantilla_comunicacion (nombre, descripcion, tipo_situacion, contenido_plantilla, es_predefinida, hashtags) VALUES
(
  'Comunicado General de Accidente',
  'Plantilla estándar para comunicar accidentes de tránsito',
  'INCIDENTE',
  E'⚠️ COMUNICADO OFICIAL ⚠️\n\n📅 Fecha: {fecha}\n🕐 Hora: {hora}\n📍 Ubicación: {ubicacion}, {municipio}, {departamento}\n\n{descripcion}\n\n👥 Personas heridas: {heridos}\n🚗 Vehículos involucrados: {vehiculos}\n\nPROVIAL se encuentra atendiendo la emergencia.\n\n#PROVIAL #SeguridadVial #Guatemala',
  TRUE,
  ARRAY['PROVIAL', 'SeguridadVial', 'Guatemala', 'TransitoGT']
),
(
  'Alerta de Tráfico',
  'Plantilla para alertar sobre congestión vehicular',
  'INCIDENTE',
  E'🚧 ALERTA DE TRÁFICO 🚧\n\n📍 {ubicacion}\n\n⚠️ Se reporta {tipo} que ocasiona lentitud en la vía.\n\nSe recomienda tomar vías alternas.\n\n#TraficoGT #PROVIAL',
  TRUE,
  ARRAY['TraficoGT', 'PROVIAL', 'VíasAlternas']
),
(
  'Accidente con Fallecidos',
  'Plantilla para comunicar accidentes con víctimas mortales',
  'INCIDENTE',
  E'🕊️ COMUNICADO - ACCIDENTE DE TRÁNSITO 🕊️\n\n📅 {fecha} | 🕐 {hora}\n📍 {ubicacion}\n\nLamentamos informar que se registró un accidente de tránsito con consecuencias fatales.\n\n🚗 Vehículos involucrados: {vehiculos}\n👥 Heridos: {heridos}\n✝️ Fallecidos: {fallecidos}\n\nPROVIAL extiende sus condolencias a las familias afectadas.\n\n#PROVIAL #SeguridadVial',
  TRUE,
  ARRAY['PROVIAL', 'SeguridadVial']
),
(
  'Emergencia Atendida',
  'Plantilla para informar emergencias ya atendidas',
  'EMERGENCIA',
  E'✅ EMERGENCIA ATENDIDA ✅\n\n📍 {ubicacion}\n📅 {fecha} | 🕐 {hora}\n\nPROVIAL atendió exitosamente: {descripcion}\n\nLa vía se encuentra habilitada.\n\n#PROVIAL #Emergencia',
  TRUE,
  ARRAY['PROVIAL', 'Emergencia', 'ViaHabilitada']
),
(
  'Asistencia Vial',
  'Plantilla para comunicar asistencias',
  'ASISTENCIA',
  E'🛠️ ASISTENCIA VIAL 🛠️\n\n📍 {ubicacion}\n📅 {fecha}\n\nPROVIAL brindó asistencia: {descripcion}\n\n¿Necesitas ayuda en carretera? Comunícate con nosotros.\n\n#PROVIAL #AsistenciaVial',
  TRUE,
  ARRAY['PROVIAL', 'AsistenciaVial', 'AyudaEnCarretera']
);

-- ============================================
-- VISTA: RESUMEN DE ACCIDENTOLOGÍA
-- ============================================
CREATE OR REPLACE VIEW v_resumen_accidentologia AS
SELECT
  ha.id,
  ha.situacion_id,
  s.created_at AS fecha_hora_reporte,
  ha.tipo_accidente,
  ha.descripcion_accidente,
  CONCAT(s.km, ' km, ', s.sentido) AS ubicacion_texto,
  m.nombre AS municipio,
  d.nombre AS departamento,
  ha.estado,
  (SELECT COUNT(*) FROM vehiculo_accidente WHERE hoja_accidentologia_id = ha.id) AS total_vehiculos,
  (SELECT COUNT(*) FROM persona_accidente WHERE hoja_accidentologia_id = ha.id) AS total_personas,
  (SELECT COUNT(*) FROM persona_accidente WHERE hoja_accidentologia_id = ha.id AND estado IN ('HERIDO_LEVE', 'HERIDO_MODERADO', 'HERIDO_GRAVE')) AS total_heridos,
  (SELECT COUNT(*) FROM persona_accidente WHERE hoja_accidentologia_id = ha.id AND estado = 'FALLECIDO') AS total_fallecidos,
  u.nombre_completo AS elaborado_por_nombre,
  ha.created_at
FROM hoja_accidentologia ha
JOIN situacion s ON ha.situacion_id = s.id
LEFT JOIN municipio m ON s.municipio_id = m.id
LEFT JOIN departamento d ON m.departamento_id = d.id
LEFT JOIN usuario u ON ha.elaborado_por = u.id
ORDER BY ha.created_at DESC;

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON TABLE hoja_accidentologia IS 'Hoja de accidentología con datos completos del accidente';
COMMENT ON TABLE vehiculo_accidente IS 'Vehículos involucrados en accidente';
COMMENT ON TABLE persona_accidente IS 'Personas afectadas en accidente';
COMMENT ON TABLE plantilla_comunicacion IS 'Plantillas/machotes para mensajes de redes sociales';
COMMENT ON TABLE publicacion_social IS 'Registro de publicaciones realizadas en redes sociales';
COMMENT ON FUNCTION generar_mensaje_plantilla IS 'Genera mensaje de comunicación social desde plantilla';
