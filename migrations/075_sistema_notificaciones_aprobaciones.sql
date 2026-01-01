-- =====================================================
-- MIGRATION 075: Sistema de Notificaciones Push y Aprobaciones
-- =====================================================
-- Fecha: 2025-01-01
-- Descripcion:
--   1. Sistema de tokens para notificaciones push (Expo Push)
--   2. Sistema de aprobaciones de tripulacion (presencia, fin jornada, 360)
--   3. Historial de notificaciones enviadas
-- =====================================================

-- =====================================================
-- 1. TABLA DE TOKENS DE DISPOSITIVOS (Push Notifications)
-- =====================================================

CREATE TABLE IF NOT EXISTS dispositivo_push (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    push_token VARCHAR(255) NOT NULL,
    plataforma VARCHAR(20) NOT NULL CHECK (plataforma IN ('ios', 'android', 'web')),
    modelo_dispositivo VARCHAR(100),
    version_app VARCHAR(20),
    activo BOOLEAN DEFAULT TRUE,
    ultimo_uso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id, push_token)
);

CREATE INDEX idx_dispositivo_push_usuario ON dispositivo_push(usuario_id);
CREATE INDEX idx_dispositivo_push_token ON dispositivo_push(push_token);
CREATE INDEX idx_dispositivo_push_activo ON dispositivo_push(activo) WHERE activo = TRUE;

COMMENT ON TABLE dispositivo_push IS 'Tokens de dispositivos para notificaciones push (Expo Push Notifications)';

-- =====================================================
-- 2. TABLA DE HISTORIAL DE NOTIFICACIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS notificacion (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    datos JSONB DEFAULT '{}',
    -- Estado de envio
    enviada BOOLEAN DEFAULT FALSE,
    fecha_envio TIMESTAMP WITH TIME ZONE,
    error_envio TEXT,
    -- Estado de lectura
    leida BOOLEAN DEFAULT FALSE,
    fecha_lectura TIMESTAMP WITH TIME ZONE,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notificacion_usuario ON notificacion(usuario_id);
CREATE INDEX idx_notificacion_tipo ON notificacion(tipo);
CREATE INDEX idx_notificacion_no_leida ON notificacion(usuario_id, leida) WHERE leida = FALSE;
CREATE INDEX idx_notificacion_fecha ON notificacion(created_at DESC);

COMMENT ON TABLE notificacion IS 'Historial de notificaciones enviadas a usuarios';

-- Tipos de notificacion comunes:
-- ASIGNACION_NUEVA, ASIGNACION_MODIFICADA, ASIGNACION_CANCELADA
-- INSPECCION_PENDIENTE, INSPECCION_APROBADA, INSPECCION_RECHAZADA
-- APROBACION_REQUERIDA, APROBACION_COMPLETADA
-- SALIDA_AUTORIZADA, ALERTA_COMBUSTIBLE, ALERTA_MANTENIMIENTO

-- =====================================================
-- 3. SISTEMA DE APROBACIONES DE TRIPULACION
-- =====================================================

-- Tabla principal de solicitudes de aprobacion
CREATE TABLE IF NOT EXISTS aprobacion_tripulacion (
    id SERIAL PRIMARY KEY,
    salida_id INTEGER REFERENCES salida_unidad(id) ON DELETE CASCADE,
    unidad_id INTEGER NOT NULL REFERENCES unidad(id),
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN (
        'CONFIRMAR_PRESENCIA',    -- Antes de iniciar salida
        'APROBAR_FIN_JORNADA',    -- Antes de finalizar
        'APROBAR_360'             -- Aprobar inspeccion 360
    )),
    -- Referencia opcional a inspeccion 360
    inspeccion_360_id INTEGER REFERENCES inspeccion_360(id) ON DELETE CASCADE,
    -- Estado general
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN (
        'PENDIENTE',      -- Esperando aprobaciones
        'COMPLETADA',     -- Todos aprobaron
        'RECHAZADA',      -- Alguien rechazo
        'CANCELADA',      -- Cancelada por sistema o admin
        'EXPIRADA'        -- Tiempo limite excedido
    )),
    -- Configuracion
    requiere_todos BOOLEAN DEFAULT TRUE,  -- Si FALSE, solo necesita mayoria
    minimo_aprobaciones INTEGER DEFAULT 1,
    tiempo_limite_minutos INTEGER DEFAULT 30,
    -- Quien la inicio
    iniciado_por INTEGER REFERENCES usuario(id),
    fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_completada TIMESTAMP WITH TIME ZONE,
    -- Metadata
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_aprobacion_salida ON aprobacion_tripulacion(salida_id);
CREATE INDEX idx_aprobacion_unidad ON aprobacion_tripulacion(unidad_id);
CREATE INDEX idx_aprobacion_estado ON aprobacion_tripulacion(estado);
CREATE INDEX idx_aprobacion_tipo ON aprobacion_tripulacion(tipo);
CREATE INDEX idx_aprobacion_pendiente ON aprobacion_tripulacion(estado, fecha_inicio)
    WHERE estado = 'PENDIENTE';

COMMENT ON TABLE aprobacion_tripulacion IS 'Solicitudes de aprobacion que requieren consenso de tripulacion';

-- Tabla de respuestas individuales de cada tripulante
CREATE TABLE IF NOT EXISTS aprobacion_respuesta (
    id SERIAL PRIMARY KEY,
    aprobacion_id INTEGER NOT NULL REFERENCES aprobacion_tripulacion(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuario(id),
    -- Respuesta
    respuesta VARCHAR(20) CHECK (respuesta IN ('APROBADO', 'RECHAZADO', 'PENDIENTE')),
    fecha_respuesta TIMESTAMP WITH TIME ZONE,
    -- Si rechazo, motivo
    motivo_rechazo TEXT,
    -- Ubicacion al momento de responder (para confirmar presencia)
    latitud DECIMAL(10, 8),
    longitud DECIMAL(11, 8),
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(aprobacion_id, usuario_id)
);

CREATE INDEX idx_aprobacion_respuesta_aprobacion ON aprobacion_respuesta(aprobacion_id);
CREATE INDEX idx_aprobacion_respuesta_usuario ON aprobacion_respuesta(usuario_id);
CREATE INDEX idx_aprobacion_respuesta_pendiente ON aprobacion_respuesta(aprobacion_id, respuesta)
    WHERE respuesta = 'PENDIENTE';

COMMENT ON TABLE aprobacion_respuesta IS 'Respuestas individuales de cada tripulante a solicitudes de aprobacion';

-- =====================================================
-- 4. FUNCIONES AUXILIARES
-- =====================================================

-- Funcion para obtener tokens push de un usuario
CREATE OR REPLACE FUNCTION obtener_tokens_push(p_usuario_id INTEGER)
RETURNS TABLE(push_token VARCHAR, plataforma VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT dp.push_token, dp.plataforma
    FROM dispositivo_push dp
    WHERE dp.usuario_id = p_usuario_id
      AND dp.activo = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Funcion para obtener tokens push de toda la tripulacion de una unidad/salida
CREATE OR REPLACE FUNCTION obtener_tokens_tripulacion(p_salida_id INTEGER)
RETURNS TABLE(usuario_id INTEGER, push_token VARCHAR, plataforma VARCHAR, nombre_completo VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tt.usuario_id,
        dp.push_token,
        dp.plataforma,
        u.nombre_completo
    FROM tripulacion_turno tt
    JOIN salida_unidad su ON su.asignacion_id = tt.asignacion_id
    JOIN usuario u ON u.id = tt.usuario_id
    LEFT JOIN dispositivo_push dp ON dp.usuario_id = tt.usuario_id AND dp.activo = TRUE
    WHERE su.id = p_salida_id;
END;
$$ LANGUAGE plpgsql;

-- Funcion para crear solicitud de aprobacion con respuestas pendientes
CREATE OR REPLACE FUNCTION crear_aprobacion_tripulacion(
    p_salida_id INTEGER,
    p_tipo VARCHAR,
    p_iniciado_por INTEGER,
    p_inspeccion_360_id INTEGER DEFAULT NULL,
    p_tiempo_limite INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    v_aprobacion_id INTEGER;
    v_unidad_id INTEGER;
    v_tripulante RECORD;
BEGIN
    -- Obtener unidad de la salida
    SELECT unidad_id INTO v_unidad_id
    FROM salida_unidad
    WHERE id = p_salida_id;

    IF v_unidad_id IS NULL THEN
        RAISE EXCEPTION 'Salida no encontrada: %', p_salida_id;
    END IF;

    -- Crear solicitud de aprobacion
    INSERT INTO aprobacion_tripulacion (
        salida_id, unidad_id, tipo, inspeccion_360_id,
        iniciado_por, tiempo_limite_minutos
    ) VALUES (
        p_salida_id, v_unidad_id, p_tipo, p_inspeccion_360_id,
        p_iniciado_por, p_tiempo_limite
    ) RETURNING id INTO v_aprobacion_id;

    -- Crear respuestas pendientes para cada tripulante
    FOR v_tripulante IN (
        SELECT tt.usuario_id
        FROM tripulacion_turno tt
        JOIN salida_unidad su ON su.asignacion_id = tt.asignacion_id
        WHERE su.id = p_salida_id
    ) LOOP
        INSERT INTO aprobacion_respuesta (aprobacion_id, usuario_id, respuesta)
        VALUES (v_aprobacion_id, v_tripulante.usuario_id, 'PENDIENTE');
    END LOOP;

    RETURN v_aprobacion_id;
END;
$$ LANGUAGE plpgsql;

-- Funcion para registrar respuesta y verificar si se completo
CREATE OR REPLACE FUNCTION responder_aprobacion(
    p_aprobacion_id INTEGER,
    p_usuario_id INTEGER,
    p_respuesta VARCHAR,
    p_motivo TEXT DEFAULT NULL,
    p_latitud DECIMAL DEFAULT NULL,
    p_longitud DECIMAL DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_aprobacion RECORD;
    v_total_tripulantes INTEGER;
    v_aprobados INTEGER;
    v_rechazados INTEGER;
    v_pendientes INTEGER;
    v_nuevo_estado VARCHAR;
BEGIN
    -- Verificar que la aprobacion existe y esta pendiente
    SELECT * INTO v_aprobacion
    FROM aprobacion_tripulacion
    WHERE id = p_aprobacion_id;

    IF v_aprobacion IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Aprobacion no encontrada');
    END IF;

    IF v_aprobacion.estado != 'PENDIENTE' THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'La aprobacion ya no esta pendiente');
    END IF;

    -- Registrar respuesta
    UPDATE aprobacion_respuesta
    SET respuesta = p_respuesta,
        fecha_respuesta = NOW(),
        motivo_rechazo = p_motivo,
        latitud = p_latitud,
        longitud = p_longitud
    WHERE aprobacion_id = p_aprobacion_id
      AND usuario_id = p_usuario_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Usuario no es parte de esta aprobacion');
    END IF;

    -- Contar respuestas
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE respuesta = 'APROBADO'),
        COUNT(*) FILTER (WHERE respuesta = 'RECHAZADO'),
        COUNT(*) FILTER (WHERE respuesta = 'PENDIENTE')
    INTO v_total_tripulantes, v_aprobados, v_rechazados, v_pendientes
    FROM aprobacion_respuesta
    WHERE aprobacion_id = p_aprobacion_id;

    -- Determinar nuevo estado
    v_nuevo_estado := 'PENDIENTE';

    -- Si alguien rechazo y se requiere todos
    IF v_rechazados > 0 AND v_aprobacion.requiere_todos THEN
        v_nuevo_estado := 'RECHAZADA';
    -- Si todos aprobaron
    ELSIF v_aprobados = v_total_tripulantes THEN
        v_nuevo_estado := 'COMPLETADA';
    -- Si no requiere todos y hay suficientes aprobaciones
    ELSIF NOT v_aprobacion.requiere_todos AND v_aprobados >= v_aprobacion.minimo_aprobaciones THEN
        v_nuevo_estado := 'COMPLETADA';
    END IF;

    -- Actualizar estado si cambio
    IF v_nuevo_estado != 'PENDIENTE' THEN
        UPDATE aprobacion_tripulacion
        SET estado = v_nuevo_estado,
            fecha_completada = NOW(),
            updated_at = NOW()
        WHERE id = p_aprobacion_id;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'estado', v_nuevo_estado,
        'total', v_total_tripulantes,
        'aprobados', v_aprobados,
        'rechazados', v_rechazados,
        'pendientes', v_pendientes
    );
END;
$$ LANGUAGE plpgsql;

-- Vista de aprobaciones pendientes por usuario
CREATE OR REPLACE VIEW v_mis_aprobaciones_pendientes AS
SELECT
    at.id AS aprobacion_id,
    at.tipo,
    at.estado AS estado_aprobacion,
    at.fecha_inicio,
    at.tiempo_limite_minutos,
    at.observaciones,
    ar.usuario_id,
    ar.respuesta,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    su.id AS salida_id,
    -- Calcular tiempo restante
    EXTRACT(EPOCH FROM (
        at.fecha_inicio + (at.tiempo_limite_minutos || ' minutes')::INTERVAL - NOW()
    )) / 60 AS minutos_restantes,
    -- Info del iniciador
    ui.nombre_completo AS iniciado_por_nombre
FROM aprobacion_respuesta ar
JOIN aprobacion_tripulacion at ON at.id = ar.aprobacion_id
JOIN unidad u ON u.id = at.unidad_id
LEFT JOIN salida_unidad su ON su.id = at.salida_id
LEFT JOIN usuario ui ON ui.id = at.iniciado_por
WHERE at.estado = 'PENDIENTE'
  AND ar.respuesta = 'PENDIENTE';

COMMENT ON VIEW v_mis_aprobaciones_pendientes IS 'Aprobaciones pendientes de respuesta por usuario';

-- =====================================================
-- 5. AGREGAR CAMPO ES_COMANDANTE A TRIPULACION SI NO EXISTE
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tripulacion_turno' AND column_name = 'es_comandante'
    ) THEN
        ALTER TABLE tripulacion_turno ADD COLUMN es_comandante BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- =====================================================
-- 6. TRIGGER PARA ACTUALIZAR updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_dispositivo_push_updated ON dispositivo_push;
CREATE TRIGGER tr_dispositivo_push_updated
    BEFORE UPDATE ON dispositivo_push
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_aprobacion_tripulacion_updated ON aprobacion_tripulacion;
CREATE TRIGGER tr_aprobacion_tripulacion_updated
    BEFORE UPDATE ON aprobacion_tripulacion
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. INSERTAR CONFIGURACIONES POR DEFECTO
-- =====================================================

-- Agregar configuraciones de notificaciones al sistema
INSERT INTO configuracion_sistema (clave, valor, descripcion, tipo, categoria)
VALUES
    ('notif_push_habilitadas', 'true', 'Habilitar notificaciones push', 'boolean', 'notificaciones'),
    ('notif_tiempo_expiracion_aprobacion', '30', 'Minutos para que expire una solicitud de aprobacion', 'number', 'notificaciones'),
    ('notif_confirmar_presencia_requerido', 'true', 'Requerir confirmacion de presencia antes de salida', 'boolean', 'notificaciones'),
    ('notif_aprobar_fin_jornada_requerido', 'false', 'Requerir aprobacion de tripulacion para fin de jornada', 'boolean', 'notificaciones')
ON CONFLICT (clave) DO NOTHING;

-- =====================================================
-- FIN DE MIGRATION 075
-- =====================================================
