-- ============================================
-- SISTEMA DE ALERTAS COMPLETO
-- Migración 076
-- ============================================

-- Tipos de alerta
CREATE TYPE tipo_alerta AS ENUM (
  'EMERGENCIA',              -- Situación de emergencia reportada
  'UNIDAD_SIN_ACTIVIDAD',    -- Unidad sin movimiento por X tiempo
  'INSPECCION_PENDIENTE',    -- Inspección 360 esperando aprobación
  'BRIGADA_FUERA_ZONA',      -- Brigada fuera de su zona asignada
  'COMBUSTIBLE_BAJO',        -- Nivel de combustible bajo
  'MANTENIMIENTO_REQUERIDO', -- Unidad requiere mantenimiento
  'APROBACION_REQUERIDA',    -- Acción requiere aprobación
  'SISTEMA',                 -- Alertas del sistema
  'PERSONALIZADA'            -- Alertas personalizadas
);

CREATE TYPE severidad_alerta AS ENUM (
  'BAJA',
  'MEDIA',
  'ALTA',
  'CRITICA'
);

CREATE TYPE estado_alerta AS ENUM (
  'ACTIVA',
  'ATENDIDA',
  'RESUELTA',
  'IGNORADA',
  'EXPIRADA'
);

-- ============================================
-- TABLA: CONFIGURACION DE ALERTAS
-- ============================================
CREATE TABLE IF NOT EXISTS configuracion_alerta (
  id SERIAL PRIMARY KEY,
  tipo tipo_alerta NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  severidad_default severidad_alerta DEFAULT 'MEDIA',
  activa BOOLEAN DEFAULT TRUE,
  -- Configuración
  tiempo_inactividad_minutos INTEGER DEFAULT 60, -- Para UNIDAD_SIN_ACTIVIDAD
  umbral_combustible DECIMAL(5,2) DEFAULT 20.00, -- Para COMBUSTIBLE_BAJO
  umbral_km INTEGER DEFAULT 5000, -- Para MANTENIMIENTO_REQUERIDO
  -- Notificaciones
  notificar_push BOOLEAN DEFAULT TRUE,
  notificar_email BOOLEAN DEFAULT FALSE,
  notificar_sms BOOLEAN DEFAULT FALSE,
  -- Roles que reciben la alerta
  roles_destino TEXT[] DEFAULT ARRAY['COP', 'OPERACIONES', 'ADMIN'],
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tipo)
);

-- ============================================
-- TABLA: ALERTAS
-- ============================================
CREATE TABLE IF NOT EXISTS alerta (
  id SERIAL PRIMARY KEY,
  tipo tipo_alerta NOT NULL,
  severidad severidad_alerta NOT NULL DEFAULT 'MEDIA',
  estado estado_alerta NOT NULL DEFAULT 'ACTIVA',
  -- Información
  titulo VARCHAR(200) NOT NULL,
  mensaje TEXT NOT NULL,
  datos JSONB, -- Datos adicionales (unidad_id, brigada_id, situacion_id, etc.)
  -- Relaciones opcionales
  sede_id INTEGER REFERENCES sede(id),
  unidad_id INTEGER REFERENCES unidad(id),
  brigada_id INTEGER REFERENCES brigada(id),
  situacion_id INTEGER,
  -- Atención
  atendida_por INTEGER REFERENCES usuario(id),
  fecha_atencion TIMESTAMP,
  nota_resolucion TEXT,
  -- Expiración
  fecha_expiracion TIMESTAMP,
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para alertas
CREATE INDEX idx_alerta_tipo ON alerta(tipo);
CREATE INDEX idx_alerta_estado ON alerta(estado);
CREATE INDEX idx_alerta_severidad ON alerta(severidad);
CREATE INDEX idx_alerta_sede ON alerta(sede_id);
CREATE INDEX idx_alerta_unidad ON alerta(unidad_id);
CREATE INDEX idx_alerta_created ON alerta(created_at DESC);

-- ============================================
-- TABLA: ALERTAS LEÍDAS POR USUARIO
-- ============================================
CREATE TABLE IF NOT EXISTS alerta_leida (
  id SERIAL PRIMARY KEY,
  alerta_id INTEGER NOT NULL REFERENCES alerta(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  leida_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(alerta_id, usuario_id)
);

-- ============================================
-- TABLA: SUSCRIPCIONES A ALERTAS
-- ============================================
CREATE TABLE IF NOT EXISTS suscripcion_alerta (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  tipo_alerta tipo_alerta NOT NULL,
  activa BOOLEAN DEFAULT TRUE,
  -- Filtros opcionales
  solo_sede_id INTEGER REFERENCES sede(id),
  severidad_minima severidad_alerta DEFAULT 'BAJA',
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(usuario_id, tipo_alerta)
);

-- ============================================
-- FUNCIÓN: CREAR ALERTA
-- ============================================
CREATE OR REPLACE FUNCTION crear_alerta(
  p_tipo tipo_alerta,
  p_titulo VARCHAR(200),
  p_mensaje TEXT,
  p_severidad severidad_alerta DEFAULT NULL,
  p_datos JSONB DEFAULT NULL,
  p_sede_id INTEGER DEFAULT NULL,
  p_unidad_id INTEGER DEFAULT NULL,
  p_brigada_id INTEGER DEFAULT NULL,
  p_situacion_id INTEGER DEFAULT NULL,
  p_expira_en_minutos INTEGER DEFAULT NULL
) RETURNS alerta AS $$
DECLARE
  v_config configuracion_alerta;
  v_alerta alerta;
  v_fecha_exp TIMESTAMP;
BEGIN
  -- Obtener configuración
  SELECT * INTO v_config FROM configuracion_alerta WHERE tipo = p_tipo;

  -- Si no hay config o está desactivada, no crear alerta
  IF v_config IS NULL OR NOT v_config.activa THEN
    RETURN NULL;
  END IF;

  -- Calcular fecha de expiración
  IF p_expira_en_minutos IS NOT NULL THEN
    v_fecha_exp := CURRENT_TIMESTAMP + (p_expira_en_minutos || ' minutes')::INTERVAL;
  END IF;

  -- Insertar alerta
  INSERT INTO alerta (
    tipo, severidad, titulo, mensaje, datos,
    sede_id, unidad_id, brigada_id, situacion_id,
    fecha_expiracion
  ) VALUES (
    p_tipo,
    COALESCE(p_severidad, v_config.severidad_default),
    p_titulo,
    p_mensaje,
    p_datos,
    p_sede_id,
    p_unidad_id,
    p_brigada_id,
    p_situacion_id,
    v_fecha_exp
  ) RETURNING * INTO v_alerta;

  RETURN v_alerta;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN: ATENDER ALERTA
-- ============================================
CREATE OR REPLACE FUNCTION atender_alerta(
  p_alerta_id INTEGER,
  p_usuario_id INTEGER,
  p_nota TEXT DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, mensaje TEXT) AS $$
DECLARE
  v_alerta alerta;
BEGIN
  -- Obtener alerta
  SELECT * INTO v_alerta FROM alerta WHERE id = p_alerta_id;

  IF v_alerta IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Alerta no encontrada'::TEXT;
    RETURN;
  END IF;

  IF v_alerta.estado != 'ACTIVA' THEN
    RETURN QUERY SELECT FALSE, 'La alerta ya no está activa'::TEXT;
    RETURN;
  END IF;

  -- Actualizar alerta
  UPDATE alerta
  SET estado = 'ATENDIDA',
      atendida_por = p_usuario_id,
      fecha_atencion = CURRENT_TIMESTAMP,
      nota_resolucion = p_nota,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_alerta_id;

  RETURN QUERY SELECT TRUE, 'Alerta marcada como atendida'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN: RESOLVER ALERTA
-- ============================================
CREATE OR REPLACE FUNCTION resolver_alerta(
  p_alerta_id INTEGER,
  p_usuario_id INTEGER,
  p_nota TEXT DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, mensaje TEXT) AS $$
DECLARE
  v_alerta alerta;
BEGIN
  -- Obtener alerta
  SELECT * INTO v_alerta FROM alerta WHERE id = p_alerta_id;

  IF v_alerta IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Alerta no encontrada'::TEXT;
    RETURN;
  END IF;

  IF v_alerta.estado NOT IN ('ACTIVA', 'ATENDIDA') THEN
    RETURN QUERY SELECT FALSE, 'La alerta ya está cerrada'::TEXT;
    RETURN;
  END IF;

  -- Actualizar alerta
  UPDATE alerta
  SET estado = 'RESUELTA',
      atendida_por = COALESCE(atendida_por, p_usuario_id),
      fecha_atencion = COALESCE(fecha_atencion, CURRENT_TIMESTAMP),
      nota_resolucion = COALESCE(p_nota, nota_resolucion),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_alerta_id;

  RETURN QUERY SELECT TRUE, 'Alerta resuelta'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VISTA: ALERTAS ACTIVAS
-- ============================================
CREATE OR REPLACE VIEW v_alertas_activas AS
SELECT
  a.*,
  s.nombre AS sede_nombre,
  u.codigo AS unidad_codigo,
  u.tipo_unidad,
  b.nombre_completo AS brigada_nombre,
  b.chapa AS brigada_chapa,
  aten.nombre_completo AS atendida_por_nombre,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.created_at)) / 60 AS minutos_activa
FROM alerta a
LEFT JOIN sede s ON a.sede_id = s.id
LEFT JOIN unidad u ON a.unidad_id = u.id
LEFT JOIN brigada b ON a.brigada_id = b.id
LEFT JOIN usuario aten ON a.atendida_por = aten.id
WHERE a.estado = 'ACTIVA'
  AND (a.fecha_expiracion IS NULL OR a.fecha_expiracion > CURRENT_TIMESTAMP)
ORDER BY
  CASE a.severidad
    WHEN 'CRITICA' THEN 1
    WHEN 'ALTA' THEN 2
    WHEN 'MEDIA' THEN 3
    ELSE 4
  END,
  a.created_at DESC;

-- ============================================
-- VISTA: MIS ALERTAS PENDIENTES
-- ============================================
CREATE OR REPLACE VIEW v_mis_alertas_no_leidas AS
SELECT
  a.*,
  s.nombre AS sede_nombre,
  u.codigo AS unidad_codigo,
  b.nombre_completo AS brigada_nombre
FROM alerta a
LEFT JOIN sede s ON a.sede_id = s.id
LEFT JOIN unidad u ON a.unidad_id = u.id
LEFT JOIN brigada b ON a.brigada_id = b.id
WHERE a.estado = 'ACTIVA'
  AND (a.fecha_expiracion IS NULL OR a.fecha_expiracion > CURRENT_TIMESTAMP);

-- ============================================
-- TRIGGER: ALERTA POR EMERGENCIA
-- ============================================
CREATE OR REPLACE FUNCTION trigger_alerta_emergencia()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo para situaciones de tipo EMERGENCIA
  IF NEW.tipo = 'EMERGENCIA' THEN
    PERFORM crear_alerta(
      'EMERGENCIA',
      'EMERGENCIA: ' || NEW.tipo,
      'Se ha reportado una emergencia. Ubicación: ' || COALESCE(NEW.ubicacion_texto, 'No especificada'),
      'CRITICA',
      jsonb_build_object(
        'situacion_id', NEW.id,
        'descripcion', NEW.descripcion,
        'ubicacion', NEW.ubicacion_texto,
        'coordenadas', jsonb_build_object('lat', NEW.latitud, 'lng', NEW.longitud)
      ),
      NULL, -- sede_id
      NULL, -- unidad_id
      NULL, -- brigada_id
      NEW.id,
      NULL -- sin expiración
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS trg_alerta_emergencia ON situacion;
CREATE TRIGGER trg_alerta_emergencia
  AFTER INSERT ON situacion
  FOR EACH ROW
  EXECUTE FUNCTION trigger_alerta_emergencia();

-- ============================================
-- FUNCIÓN: VERIFICAR UNIDADES INACTIVAS
-- ============================================
CREATE OR REPLACE FUNCTION verificar_unidades_inactivas(
  p_minutos_inactividad INTEGER DEFAULT 60
) RETURNS INTEGER AS $$
DECLARE
  v_unidad RECORD;
  v_count INTEGER := 0;
  v_alerta_existente BOOLEAN;
BEGIN
  FOR v_unidad IN
    SELECT u.id, u.codigo, u.sede_id, su.fecha_hora_salida, su.id AS salida_id
    FROM unidad u
    JOIN salida_unidad su ON u.id = su.unidad_id
    WHERE su.fecha_hora_salida IS NOT NULL
      AND su.fecha_hora_ingreso IS NULL
      AND su.fecha_hora_salida < CURRENT_TIMESTAMP - (p_minutos_inactividad || ' minutes')::INTERVAL
      -- Sin situaciones recientes
      AND NOT EXISTS (
        SELECT 1 FROM situacion s
        WHERE s.salida_id = su.id
          AND s.fecha_hora_reporte > CURRENT_TIMESTAMP - (p_minutos_inactividad || ' minutes')::INTERVAL
      )
  LOOP
    -- Verificar si ya hay alerta activa para esta unidad
    SELECT EXISTS (
      SELECT 1 FROM alerta
      WHERE tipo = 'UNIDAD_SIN_ACTIVIDAD'
        AND unidad_id = v_unidad.id
        AND estado = 'ACTIVA'
    ) INTO v_alerta_existente;

    IF NOT v_alerta_existente THEN
      PERFORM crear_alerta(
        'UNIDAD_SIN_ACTIVIDAD',
        'Unidad ' || v_unidad.codigo || ' sin actividad',
        'La unidad ' || v_unidad.codigo || ' lleva más de ' || p_minutos_inactividad ||
        ' minutos sin reportar actividad desde que salió.',
        'MEDIA',
        jsonb_build_object(
          'salida_id', v_unidad.salida_id,
          'ultima_salida', v_unidad.fecha_hora_salida
        ),
        v_unidad.sede_id,
        v_unidad.id,
        NULL,
        NULL,
        120 -- Expira en 2 horas
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN: VERIFICAR INSPECCIONES PENDIENTES
-- ============================================
CREATE OR REPLACE FUNCTION verificar_inspecciones_pendientes(
  p_minutos_espera INTEGER DEFAULT 30
) RETURNS INTEGER AS $$
DECLARE
  v_inspeccion RECORD;
  v_count INTEGER := 0;
  v_alerta_existente BOOLEAN;
BEGIN
  FOR v_inspeccion IN
    SELECT i.id, i.unidad_id, u.codigo AS unidad_codigo, u.sede_id,
           i.fecha_realizacion
    FROM inspeccion_360 i
    JOIN unidad u ON i.unidad_id = u.id
    WHERE i.estado = 'PENDIENTE'
      AND i.fecha_realizacion < CURRENT_TIMESTAMP - (p_minutos_espera || ' minutes')::INTERVAL
  LOOP
    -- Verificar si ya hay alerta activa
    SELECT EXISTS (
      SELECT 1 FROM alerta
      WHERE tipo = 'INSPECCION_PENDIENTE'
        AND datos->>'inspeccion_id' = v_inspeccion.id::TEXT
        AND estado = 'ACTIVA'
    ) INTO v_alerta_existente;

    IF NOT v_alerta_existente THEN
      PERFORM crear_alerta(
        'INSPECCION_PENDIENTE',
        'Inspección 360 pendiente - Unidad ' || v_inspeccion.unidad_codigo,
        'La inspección 360 de la unidad ' || v_inspeccion.unidad_codigo ||
        ' lleva más de ' || p_minutos_espera || ' minutos esperando aprobación.',
        'MEDIA',
        jsonb_build_object(
          'inspeccion_id', v_inspeccion.id,
          'fecha_realizacion', v_inspeccion.fecha_realizacion
        ),
        v_inspeccion.sede_id,
        v_inspeccion.unidad_id,
        NULL,
        NULL,
        60 -- Expira en 1 hora
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DATOS INICIALES: CONFIGURACIÓN DE ALERTAS
-- ============================================
INSERT INTO configuracion_alerta (tipo, nombre, descripcion, severidad_default, roles_destino) VALUES
('EMERGENCIA', 'Emergencia', 'Situación de emergencia reportada', 'CRITICA', ARRAY['COP', 'OPERACIONES', 'ADMIN', 'SUPER_ADMIN']),
('UNIDAD_SIN_ACTIVIDAD', 'Unidad sin actividad', 'Unidad sin reportar actividad por tiempo prolongado', 'MEDIA', ARRAY['COP', 'OPERACIONES']),
('INSPECCION_PENDIENTE', 'Inspección pendiente', 'Inspección 360 esperando aprobación', 'MEDIA', ARRAY['COP', 'BRIGADA']),
('BRIGADA_FUERA_ZONA', 'Brigada fuera de zona', 'Brigada detectada fuera de su zona asignada', 'ALTA', ARRAY['COP', 'OPERACIONES']),
('COMBUSTIBLE_BAJO', 'Combustible bajo', 'Nivel de combustible bajo reportado', 'MEDIA', ARRAY['COP', 'OPERACIONES']),
('MANTENIMIENTO_REQUERIDO', 'Mantenimiento requerido', 'Unidad requiere mantenimiento por kilometraje', 'BAJA', ARRAY['OPERACIONES']),
('APROBACION_REQUERIDA', 'Aprobación requerida', 'Una acción requiere aprobación', 'MEDIA', ARRAY['COP', 'BRIGADA']),
('SISTEMA', 'Alerta del sistema', 'Alertas generadas por el sistema', 'BAJA', ARRAY['ADMIN', 'SUPER_ADMIN']),
('PERSONALIZADA', 'Alerta personalizada', 'Alertas personalizadas', 'MEDIA', ARRAY['COP', 'OPERACIONES'])
ON CONFLICT (tipo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion;

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON TABLE alerta IS 'Alertas del sistema PROVIAL';
COMMENT ON TABLE configuracion_alerta IS 'Configuración de tipos de alerta';
COMMENT ON TABLE alerta_leida IS 'Registro de alertas leídas por usuario';
COMMENT ON TABLE suscripcion_alerta IS 'Suscripciones de usuarios a tipos de alerta';
COMMENT ON FUNCTION crear_alerta IS 'Crea una nueva alerta en el sistema';
COMMENT ON FUNCTION atender_alerta IS 'Marca una alerta como atendida';
COMMENT ON FUNCTION resolver_alerta IS 'Marca una alerta como resuelta';
COMMENT ON FUNCTION verificar_unidades_inactivas IS 'Verifica unidades sin actividad y crea alertas';
COMMENT ON FUNCTION verificar_inspecciones_pendientes IS 'Verifica inspecciones pendientes y crea alertas';
