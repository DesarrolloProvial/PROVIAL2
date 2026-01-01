-- Migración 074: Sistema de Inspección 360 con Comandante
-- Implementa inspección vehicular obligatoria antes de cada salida
-- con aprobación del comandante de la unidad

-- ========================================
-- 1. AGREGAR CAMPO COMANDANTE A ASIGNACIONES
-- ========================================

-- Agregar es_comandante a brigada_unidad (asignaciones permanentes)
ALTER TABLE brigada_unidad
ADD COLUMN IF NOT EXISTS es_comandante BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN brigada_unidad.es_comandante IS 'TRUE = es el comandante responsable de la unidad';

-- Agregar es_comandante a tripulacion_turno (asignaciones por turno)
ALTER TABLE tripulacion_turno
ADD COLUMN IF NOT EXISTS es_comandante BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN tripulacion_turno.es_comandante IS 'TRUE = es el comandante responsable de la unidad en este turno';

-- ========================================
-- 2. TABLA: PLANTILLA_INSPECCION_360
-- ========================================

CREATE TABLE IF NOT EXISTS plantilla_inspeccion_360 (
    id SERIAL PRIMARY KEY,

    -- Identificación
    tipo_unidad VARCHAR(50) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    version INT NOT NULL DEFAULT 1,

    -- Secciones del formulario (JSONB)
    -- Formato: [{"nombre": "Exterior", "items": [{"codigo": "EXT001", "descripcion": "...", "tipo": "CHECKBOX|ESTADO|TEXTO|TEXTO_FOTO|NUMERO", "requerido": true, "opciones": [...]}]}]
    secciones JSONB NOT NULL,

    -- Estado
    activa BOOLEAN NOT NULL DEFAULT TRUE,

    -- Auditoría
    creado_por INT REFERENCES usuario(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE plantilla_inspeccion_360 IS 'Plantillas dinámicas de inspección 360 por tipo de unidad';
COMMENT ON COLUMN plantilla_inspeccion_360.secciones IS 'Estructura JSON con secciones e items del formulario';

CREATE INDEX idx_plantilla_360_tipo ON plantilla_inspeccion_360(tipo_unidad);
CREATE INDEX idx_plantilla_360_activa ON plantilla_inspeccion_360(activa) WHERE activa = TRUE;

-- Solo una plantilla activa por tipo de unidad
CREATE UNIQUE INDEX idx_plantilla_360_tipo_activa
    ON plantilla_inspeccion_360(tipo_unidad)
    WHERE activa = TRUE;

-- Trigger para updated_at
CREATE TRIGGER update_plantilla_360_updated_at
    BEFORE UPDATE ON plantilla_inspeccion_360
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 3. TABLA: INSPECCION_360
-- ========================================

CREATE TABLE IF NOT EXISTS inspeccion_360 (
    id SERIAL PRIMARY KEY,

    -- Relaciones
    salida_id INT REFERENCES salida_unidad(id) ON DELETE CASCADE,
    unidad_id INT NOT NULL REFERENCES unidad(id) ON DELETE RESTRICT,
    plantilla_id INT NOT NULL REFERENCES plantilla_inspeccion_360(id) ON DELETE RESTRICT,

    -- Quién realiza y aprueba
    realizado_por INT NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    aprobado_por INT REFERENCES usuario(id) ON DELETE SET NULL,

    -- Estado
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),

    -- Fechas
    fecha_realizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_aprobacion TIMESTAMPTZ,

    -- Respuestas del formulario (JSONB)
    -- Formato: [{"codigo": "EXT001", "valor": true/false/"texto"/number, "foto_url": "...", "observacion": "..."}]
    respuestas JSONB NOT NULL,

    -- Observaciones
    observaciones_inspector TEXT,
    observaciones_comandante TEXT,
    motivo_rechazo TEXT,

    -- Firmas (base64 o URL)
    firma_inspector TEXT,
    firma_comandante TEXT,

    -- Fotos generales de la inspección
    fotos JSONB, -- Array de URLs

    -- Auditoría
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE inspeccion_360 IS 'Inspecciones 360 realizadas antes de cada salida';
COMMENT ON COLUMN inspeccion_360.respuestas IS 'Respuestas a cada item del formulario';
COMMENT ON COLUMN inspeccion_360.estado IS 'PENDIENTE = esperando aprobación | APROBADA = comandante aprobó | RECHAZADA = comandante rechazó';

CREATE INDEX idx_inspeccion_360_salida ON inspeccion_360(salida_id);
CREATE INDEX idx_inspeccion_360_unidad ON inspeccion_360(unidad_id);
CREATE INDEX idx_inspeccion_360_estado ON inspeccion_360(estado);
CREATE INDEX idx_inspeccion_360_fecha ON inspeccion_360(fecha_realizacion DESC);

-- Solo una inspección pendiente o aprobada por salida
CREATE UNIQUE INDEX idx_inspeccion_360_salida_valida
    ON inspeccion_360(salida_id)
    WHERE estado IN ('PENDIENTE', 'APROBADA');

-- Trigger para updated_at
CREATE TRIGGER update_inspeccion_360_updated_at
    BEFORE UPDATE ON inspeccion_360
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 4. MODIFICAR SALIDA_UNIDAD
-- ========================================

-- Agregar referencia a inspección 360 aprobada
ALTER TABLE salida_unidad
ADD COLUMN IF NOT EXISTS inspeccion_360_id INT REFERENCES inspeccion_360(id) ON DELETE SET NULL;

COMMENT ON COLUMN salida_unidad.inspeccion_360_id IS 'Inspección 360 aprobada para esta salida';

CREATE INDEX IF NOT EXISTS idx_salida_inspeccion_360 ON salida_unidad(inspeccion_360_id);

-- ========================================
-- 5. FUNCIONES
-- ========================================

-- Función: Obtener plantilla activa por tipo de unidad
CREATE OR REPLACE FUNCTION obtener_plantilla_360(p_tipo_unidad VARCHAR)
RETURNS TABLE (
    id INT,
    tipo_unidad VARCHAR,
    nombre VARCHAR,
    descripcion TEXT,
    version INT,
    secciones JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.tipo_unidad,
        p.nombre,
        p.descripcion,
        p.version,
        p.secciones
    FROM plantilla_inspeccion_360 p
    WHERE p.tipo_unidad = p_tipo_unidad
      AND p.activa = TRUE
    LIMIT 1;

    -- Si no hay plantilla específica, buscar DEFAULT
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            p.id,
            p.tipo_unidad,
            p.nombre,
            p.descripcion,
            p.version,
            p.secciones
        FROM plantilla_inspeccion_360 p
        WHERE p.tipo_unidad = 'DEFAULT'
          AND p.activa = TRUE
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION obtener_plantilla_360 IS 'Obtiene la plantilla 360 activa para un tipo de unidad';

-- Función: Verificar si puede iniciar salida (tiene 360 aprobada)
CREATE OR REPLACE FUNCTION puede_iniciar_salida_con_360(p_salida_id INT)
RETURNS TABLE (
    puede_iniciar BOOLEAN,
    inspeccion_id INT,
    estado_inspeccion VARCHAR,
    mensaje TEXT
) AS $$
DECLARE
    v_inspeccion RECORD;
BEGIN
    -- Buscar inspección vigente para esta salida
    SELECT i.id, i.estado
    INTO v_inspeccion
    FROM inspeccion_360 i
    WHERE i.salida_id = p_salida_id
      AND i.estado IN ('PENDIENTE', 'APROBADA')
    ORDER BY i.created_at DESC
    LIMIT 1;

    IF v_inspeccion IS NULL THEN
        RETURN QUERY SELECT
            FALSE,
            NULL::INT,
            NULL::VARCHAR,
            'No existe inspección 360 para esta salida'::TEXT;
    ELSIF v_inspeccion.estado = 'PENDIENTE' THEN
        RETURN QUERY SELECT
            FALSE,
            v_inspeccion.id,
            v_inspeccion.estado,
            'La inspección 360 está pendiente de aprobación'::TEXT;
    ELSE
        RETURN QUERY SELECT
            TRUE,
            v_inspeccion.id,
            v_inspeccion.estado,
            'Inspección 360 aprobada'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION puede_iniciar_salida_con_360 IS 'Verifica si una salida tiene inspección 360 aprobada';

-- Función: Aprobar inspección 360
CREATE OR REPLACE FUNCTION aprobar_inspeccion_360(
    p_inspeccion_id INT,
    p_aprobador_id INT,
    p_firma TEXT DEFAULT NULL,
    p_observaciones TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    mensaje TEXT
) AS $$
DECLARE
    v_inspeccion RECORD;
    v_es_comandante BOOLEAN;
    v_salida_id INT;
BEGIN
    -- Obtener datos de la inspección
    SELECT i.*, s.unidad_id
    INTO v_inspeccion
    FROM inspeccion_360 i
    LEFT JOIN salida_unidad s ON i.salida_id = s.id
    WHERE i.id = p_inspeccion_id;

    IF v_inspeccion IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Inspección no encontrada'::TEXT;
        RETURN;
    END IF;

    IF v_inspeccion.estado != 'PENDIENTE' THEN
        RETURN QUERY SELECT FALSE, ('La inspección ya fue ' || v_inspeccion.estado)::TEXT;
        RETURN;
    END IF;

    -- Verificar que el aprobador sea comandante de la unidad
    SELECT EXISTS (
        SELECT 1 FROM brigada_unidad bu
        WHERE bu.brigada_id = p_aprobador_id
          AND bu.unidad_id = v_inspeccion.unidad_id
          AND bu.activo = TRUE
          AND bu.es_comandante = TRUE
        UNION
        SELECT 1 FROM tripulacion_turno tt
        JOIN asignacion_unidad au ON tt.asignacion_id = au.id
        WHERE tt.usuario_id = p_aprobador_id
          AND au.unidad_id = v_inspeccion.unidad_id
          AND tt.es_comandante = TRUE
    ) INTO v_es_comandante;

    IF NOT v_es_comandante THEN
        RETURN QUERY SELECT FALSE, 'Solo el comandante de la unidad puede aprobar la inspección'::TEXT;
        RETURN;
    END IF;

    -- Aprobar la inspección
    UPDATE inspeccion_360
    SET estado = 'APROBADA',
        aprobado_por = p_aprobador_id,
        fecha_aprobacion = NOW(),
        firma_comandante = COALESCE(p_firma, firma_comandante),
        observaciones_comandante = COALESCE(p_observaciones, observaciones_comandante)
    WHERE id = p_inspeccion_id;

    -- Actualizar la salida con la referencia a la inspección
    IF v_inspeccion.salida_id IS NOT NULL THEN
        UPDATE salida_unidad
        SET inspeccion_360_id = p_inspeccion_id
        WHERE id = v_inspeccion.salida_id;
    END IF;

    RETURN QUERY SELECT TRUE, 'Inspección aprobada exitosamente'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION aprobar_inspeccion_360 IS 'Aprueba una inspección 360 (solo comandante)';

-- Función: Rechazar inspección 360
CREATE OR REPLACE FUNCTION rechazar_inspeccion_360(
    p_inspeccion_id INT,
    p_aprobador_id INT,
    p_motivo TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    mensaje TEXT
) AS $$
DECLARE
    v_inspeccion RECORD;
    v_es_comandante BOOLEAN;
BEGIN
    -- Obtener datos de la inspección
    SELECT i.*, s.unidad_id
    INTO v_inspeccion
    FROM inspeccion_360 i
    LEFT JOIN salida_unidad s ON i.salida_id = s.id
    WHERE i.id = p_inspeccion_id;

    IF v_inspeccion IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Inspección no encontrada'::TEXT;
        RETURN;
    END IF;

    IF v_inspeccion.estado != 'PENDIENTE' THEN
        RETURN QUERY SELECT FALSE, ('La inspección ya fue ' || v_inspeccion.estado)::TEXT;
        RETURN;
    END IF;

    -- Verificar que el aprobador sea comandante de la unidad
    SELECT EXISTS (
        SELECT 1 FROM brigada_unidad bu
        WHERE bu.brigada_id = p_aprobador_id
          AND bu.unidad_id = v_inspeccion.unidad_id
          AND bu.activo = TRUE
          AND bu.es_comandante = TRUE
        UNION
        SELECT 1 FROM tripulacion_turno tt
        JOIN asignacion_unidad au ON tt.asignacion_id = au.id
        WHERE tt.usuario_id = p_aprobador_id
          AND au.unidad_id = v_inspeccion.unidad_id
          AND tt.es_comandante = TRUE
    ) INTO v_es_comandante;

    IF NOT v_es_comandante THEN
        RETURN QUERY SELECT FALSE, 'Solo el comandante de la unidad puede rechazar la inspección'::TEXT;
        RETURN;
    END IF;

    -- Rechazar la inspección
    UPDATE inspeccion_360
    SET estado = 'RECHAZADA',
        aprobado_por = p_aprobador_id,
        fecha_aprobacion = NOW(),
        motivo_rechazo = p_motivo
    WHERE id = p_inspeccion_id;

    RETURN QUERY SELECT TRUE, 'Inspección rechazada. El inspector debe corregir y reenviar.'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rechazar_inspeccion_360 IS 'Rechaza una inspección 360 (solo comandante)';

-- Función: Obtener comandante de una unidad
CREATE OR REPLACE FUNCTION obtener_comandante_unidad(p_unidad_id INT)
RETURNS TABLE (
    usuario_id INT,
    nombre_completo VARCHAR,
    chapa VARCHAR,
    tipo_asignacion VARCHAR
) AS $$
BEGIN
    -- Primero buscar en asignaciones permanentes
    RETURN QUERY
    SELECT
        u.id,
        u.nombre_completo,
        u.chapa,
        'PERMANENTE'::VARCHAR
    FROM brigada_unidad bu
    JOIN usuario u ON bu.brigada_id = u.id
    WHERE bu.unidad_id = p_unidad_id
      AND bu.activo = TRUE
      AND bu.es_comandante = TRUE
    LIMIT 1;

    IF FOUND THEN
        RETURN;
    END IF;

    -- Si no hay permanente, buscar en turnos activos
    RETURN QUERY
    SELECT
        u.id,
        u.nombre_completo,
        u.chapa,
        'TURNO'::VARCHAR
    FROM tripulacion_turno tt
    JOIN asignacion_unidad au ON tt.asignacion_id = au.id
    JOIN turno t ON au.turno_id = t.id
    JOIN usuario u ON tt.usuario_id = u.id
    WHERE au.unidad_id = p_unidad_id
      AND tt.es_comandante = TRUE
      AND t.estado IN ('ACTIVO', 'PLANIFICADO')
      AND (
          t.fecha = CURRENT_DATE
          OR (t.fecha <= CURRENT_DATE AND COALESCE(t.fecha_fin, t.fecha) >= CURRENT_DATE)
      )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION obtener_comandante_unidad IS 'Obtiene el comandante actual de una unidad';

-- ========================================
-- 6. VISTAS
-- ========================================

-- Vista: Inspecciones pendientes de aprobación
CREATE OR REPLACE VIEW v_inspecciones_360_pendientes AS
SELECT
    i.id AS inspeccion_id,
    i.unidad_id,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    i.salida_id,
    i.fecha_realizacion,
    i.estado,

    -- Inspector
    insp.id AS inspector_id,
    insp.nombre_completo AS inspector_nombre,
    insp.chapa AS inspector_chapa,

    -- Comandante
    cmd.usuario_id AS comandante_id,
    cmd.nombre_completo AS comandante_nombre,
    cmd.chapa AS comandante_chapa,

    -- Plantilla
    p.nombre AS plantilla_nombre,
    p.version AS plantilla_version,

    -- Tiempo esperando
    EXTRACT(EPOCH FROM (NOW() - i.fecha_realizacion)) / 60 AS minutos_esperando

FROM inspeccion_360 i
JOIN unidad u ON i.unidad_id = u.id
JOIN usuario insp ON i.realizado_por = insp.id
JOIN plantilla_inspeccion_360 p ON i.plantilla_id = p.id
LEFT JOIN LATERAL obtener_comandante_unidad(i.unidad_id) cmd ON TRUE
WHERE i.estado = 'PENDIENTE'
ORDER BY i.fecha_realizacion ASC;

COMMENT ON VIEW v_inspecciones_360_pendientes IS 'Inspecciones 360 pendientes de aprobación';

-- Vista: Historial de inspecciones por unidad
CREATE OR REPLACE VIEW v_historial_inspecciones_360 AS
SELECT
    i.id AS inspeccion_id,
    i.unidad_id,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    i.salida_id,
    i.fecha_realizacion,
    i.fecha_aprobacion,
    i.estado,

    -- Inspector
    insp.nombre_completo AS inspector_nombre,
    insp.chapa AS inspector_chapa,

    -- Aprobador
    apr.nombre_completo AS aprobador_nombre,
    apr.chapa AS aprobador_chapa,

    -- Observaciones
    i.observaciones_inspector,
    i.observaciones_comandante,
    i.motivo_rechazo,

    -- Plantilla
    p.nombre AS plantilla_nombre

FROM inspeccion_360 i
JOIN unidad u ON i.unidad_id = u.id
JOIN usuario insp ON i.realizado_por = insp.id
LEFT JOIN usuario apr ON i.aprobado_por = apr.id
JOIN plantilla_inspeccion_360 p ON i.plantilla_id = p.id
ORDER BY i.fecha_realizacion DESC;

COMMENT ON VIEW v_historial_inspecciones_360 IS 'Historial completo de inspecciones 360';

-- ========================================
-- 7. PLANTILLAS INICIALES
-- ========================================

-- Plantilla DEFAULT (para tipos no específicos)
INSERT INTO plantilla_inspeccion_360 (tipo_unidad, nombre, descripcion, version, secciones)
VALUES (
    'DEFAULT',
    'Inspección 360 General',
    'Plantilla general para vehículos sin plantilla específica',
    1,
    '[
        {
            "nombre": "Exterior",
            "items": [
                {"codigo": "EXT001", "descripcion": "Emblemas/logos visibles", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "EXT002", "descripcion": "Espejos retrovisores", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "EXT003", "descripcion": "Placas visibles", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "EXT004", "descripcion": "Estado de pintura", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "EXT005", "descripcion": "Rayones o golpes", "tipo": "TEXTO_FOTO", "requerido": true}
            ]
        },
        {
            "nombre": "Luces",
            "items": [
                {"codigo": "LUZ001", "descripcion": "Luces delanteras", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "LUZ002", "descripcion": "Luces traseras", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "LUZ003", "descripcion": "Direccionales", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "LUZ004", "descripcion": "Luces de freno", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true}
            ]
        },
        {
            "nombre": "Interior",
            "items": [
                {"codigo": "INT001", "descripcion": "Radio/Comunicaciones", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "INT002", "descripcion": "Extintor", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "INT003", "descripcion": "Triángulos de seguridad", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "INT004", "descripcion": "Botiquín", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "INT005", "descripcion": "Documentos del vehículo", "tipo": "CHECKBOX", "requerido": true}
            ]
        },
        {
            "nombre": "Mecánico",
            "items": [
                {"codigo": "MEC001", "descripcion": "Nivel de combustible", "tipo": "ESTADO", "opciones": ["LLENO", "3/4", "1/2", "1/4", "RESERVA"], "requerido": true},
                {"codigo": "MEC002", "descripcion": "Estado de llantas", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "MEC003", "descripcion": "Frenos", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "MEC004", "descripcion": "Llanta de repuesto", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "MEC005", "descripcion": "Herramientas básicas (tricket, llave cruz)", "tipo": "CHECKBOX", "requerido": true}
            ]
        }
    ]'::JSONB
) ON CONFLICT DO NOTHING;

-- Plantilla PICK-UP / TOYOTA
INSERT INTO plantilla_inspeccion_360 (tipo_unidad, nombre, descripcion, version, secciones)
VALUES (
    'PICK-UP',
    'Inspección 360 Pick-Up',
    'Plantilla para vehículos Pick-Up (Toyota, etc.)',
    1,
    '[
        {
            "nombre": "Exterior",
            "items": [
                {"codigo": "EXT001", "descripcion": "Emblemas/logos PROVIAL", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "EXT002", "descripcion": "Cámaras de video", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "EXT003", "descripcion": "Antenas (radio/GPS)", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "EXT004", "descripcion": "Placas visibles y legibles", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "EXT005", "descripcion": "Espejos retrovisores", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "EXT006", "descripcion": "Estado de pintura", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "EXT007", "descripcion": "Rayones/golpes (describir y fotografiar)", "tipo": "TEXTO_FOTO", "requerido": true},
                {"codigo": "EXT008", "descripcion": "Estado de vidrios", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true}
            ]
        },
        {
            "nombre": "Luces y Señalización",
            "items": [
                {"codigo": "LUZ001", "descripcion": "Luces delanteras (bajas)", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "LUZ002", "descripcion": "Luces delanteras (altas)", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "LUZ003", "descripcion": "Luces traseras", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "LUZ004", "descripcion": "Neblineras", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA", "N/A"], "requerido": false},
                {"codigo": "LUZ005", "descripcion": "Direccionales delanteras", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "LUZ006", "descripcion": "Direccionales traseras", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "LUZ007", "descripcion": "Luces de freno", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "LUZ008", "descripcion": "Luz de reversa", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "LUZ009", "descripcion": "Balizas/torretas", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true}
            ]
        },
        {
            "nombre": "Interior y Equipamiento",
            "items": [
                {"codigo": "INT001", "descripcion": "Radio de comunicación", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "INT002", "descripcion": "Extintor (fecha vigente)", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "INT003", "descripcion": "Triángulos de seguridad (2)", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "INT004", "descripcion": "Botiquín primeros auxilios", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "INT005", "descripcion": "Chaleco reflectivo", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "INT006", "descripcion": "Linterna", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "INT007", "descripcion": "Documentos del vehículo", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "INT008", "descripcion": "Póliza de seguro vigente", "tipo": "CHECKBOX", "requerido": true}
            ]
        },
        {
            "nombre": "Mecánico",
            "items": [
                {"codigo": "MEC001", "descripcion": "Estado de batería", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "MEC002", "descripcion": "Limpiabrisas", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "MEC003", "descripcion": "Nivel de aceite", "tipo": "ESTADO", "opciones": ["NORMAL", "BAJO", "CRÍTICO"], "requerido": true},
                {"codigo": "MEC004", "descripcion": "Nivel de refrigerante", "tipo": "ESTADO", "opciones": ["NORMAL", "BAJO", "CRÍTICO"], "requerido": true},
                {"codigo": "MEC005", "descripcion": "Nivel de líquido de frenos", "tipo": "ESTADO", "opciones": ["NORMAL", "BAJO", "CRÍTICO"], "requerido": true},
                {"codigo": "MEC006", "descripcion": "Estado de llantas delanteras", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "MEC007", "descripcion": "Estado de llantas traseras", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "MEC008", "descripcion": "Freno de mano", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true}
            ]
        },
        {
            "nombre": "Accesorios y Herramientas",
            "items": [
                {"codigo": "ACC001", "descripcion": "Llanta de repuesto", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "ACC002", "descripcion": "Gato/Tricket", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "ACC003", "descripcion": "Llave de cruz", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "ACC004", "descripcion": "Cables de arranque", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "ACC005", "descripcion": "Cuerda de remolque", "tipo": "CHECKBOX", "requerido": false}
            ]
        }
    ]'::JSONB
) ON CONFLICT DO NOTHING;

-- Plantilla GRUA
INSERT INTO plantilla_inspeccion_360 (tipo_unidad, nombre, descripcion, version, secciones)
VALUES (
    'GRUA',
    'Inspección 360 Grúa',
    'Plantilla para vehículos tipo Grúa',
    1,
    '[
        {
            "nombre": "Exterior",
            "items": [
                {"codigo": "EXT001", "descripcion": "Emblemas/logos PROVIAL", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "EXT002", "descripcion": "Cámaras de video", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "EXT003", "descripcion": "Antenas (radio/GPS)", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "EXT004", "descripcion": "Placas visibles y legibles", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "EXT005", "descripcion": "Espejos retrovisores", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "EXT006", "descripcion": "Estado de pintura", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "EXT007", "descripcion": "Rayones/golpes (describir y fotografiar)", "tipo": "TEXTO_FOTO", "requerido": true},
                {"codigo": "EXT008", "descripcion": "Estado de vidrios", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "EXT009", "descripcion": "Calcomanías/franjas reflectivas", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true}
            ]
        },
        {
            "nombre": "Sistema Federal Master",
            "items": [
                {"codigo": "FED001", "descripcion": "Balizas LED", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "FED002", "descripcion": "Sirena", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "FED003", "descripcion": "Horn (bocina emergencia)", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "FED004", "descripcion": "Wail (sirena americana)", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "FED005", "descripcion": "Megáfono/PA", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "FED006", "descripcion": "Callejoneras", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true}
            ]
        },
        {
            "nombre": "Comunicaciones",
            "items": [
                {"codigo": "COM001", "descripcion": "Radio H&T", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "COM002", "descripcion": "Radio Motorola", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "COM003", "descripcion": "Radio base/móvil", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true}
            ]
        },
        {
            "nombre": "Luces",
            "items": [
                {"codigo": "LUZ001", "descripcion": "Luces delanteras", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "LUZ002", "descripcion": "Luces traseras", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "LUZ003", "descripcion": "Direccionales", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "LUZ004", "descripcion": "Luces de freno", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "LUZ005", "descripcion": "Luces de trabajo (pluma)", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true}
            ]
        },
        {
            "nombre": "Sistema Hidráulico y Grúa",
            "items": [
                {"codigo": "HID001", "descripcion": "Nivel de aceite hidráulico", "tipo": "ESTADO", "opciones": ["NORMAL", "BAJO", "CRÍTICO"], "requerido": true},
                {"codigo": "HID002", "descripcion": "Estado de mangueras hidráulicas", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "HID003", "descripcion": "Funcionamiento pluma", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "HID004", "descripcion": "Estado de cables winche", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "HID005", "descripcion": "Funcionamiento winche", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "HID006", "descripcion": "Estabilizadores/patas", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "HID007", "descripcion": "Control remoto grúa", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": false}
            ]
        },
        {
            "nombre": "Mecánico y Niveles",
            "items": [
                {"codigo": "MEC001", "descripcion": "Nivel de aceite motor", "tipo": "ESTADO", "opciones": ["NORMAL", "BAJO", "CRÍTICO"], "requerido": true},
                {"codigo": "MEC002", "descripcion": "Nivel de refrigerante", "tipo": "ESTADO", "opciones": ["NORMAL", "BAJO", "CRÍTICO"], "requerido": true},
                {"codigo": "MEC003", "descripcion": "Nivel líquido de frenos", "tipo": "ESTADO", "opciones": ["NORMAL", "BAJO", "CRÍTICO"], "requerido": true},
                {"codigo": "MEC004", "descripcion": "Estado de llantas", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "MEC005", "descripcion": "Freno de mano/estacionamiento", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true}
            ]
        },
        {
            "nombre": "Interior y Equipamiento",
            "items": [
                {"codigo": "INT001", "descripcion": "Extintor (fecha vigente)", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "INT002", "descripcion": "Triángulos de seguridad", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "INT003", "descripcion": "Conos de señalización", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "INT004", "descripcion": "Chaleco reflectivo", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "INT005", "descripcion": "Guantes de trabajo", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "INT006", "descripcion": "Documentos del vehículo", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "INT007", "descripcion": "Póliza de seguro vigente", "tipo": "CHECKBOX", "requerido": true}
            ]
        }
    ]'::JSONB
) ON CONFLICT DO NOTHING;

-- Plantilla MOTO
INSERT INTO plantilla_inspeccion_360 (tipo_unidad, nombre, descripcion, version, secciones)
VALUES (
    'MOTO',
    'Inspección 360 Motocicleta',
    'Plantilla para motocicletas',
    1,
    '[
        {
            "nombre": "Exterior",
            "items": [
                {"codigo": "EXT001", "descripcion": "Emblemas/logos PROVIAL", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "EXT002", "descripcion": "Espejos retrovisores (ambos)", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "EXT003", "descripcion": "Placas visibles", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "EXT004", "descripcion": "Estado de pintura", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "EXT005", "descripcion": "Rayones/golpes (describir y fotografiar)", "tipo": "TEXTO_FOTO", "requerido": true},
                {"codigo": "EXT006", "descripcion": "Guardafangos", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true}
            ]
        },
        {
            "nombre": "Luces",
            "items": [
                {"codigo": "LUZ001", "descripcion": "Luz delantera", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "LUZ002", "descripcion": "Luz trasera", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "LUZ003", "descripcion": "Direccionales delanteras", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "LUZ004", "descripcion": "Direccionales traseras", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true},
                {"codigo": "LUZ005", "descripcion": "Luz de freno", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "PARCIAL", "NO FUNCIONA"], "requerido": true}
            ]
        },
        {
            "nombre": "Mecánico",
            "items": [
                {"codigo": "MEC001", "descripcion": "Freno delantero", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "MEC002", "descripcion": "Freno trasero", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "MEC003", "descripcion": "Estado de cadena", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "MEC004", "descripcion": "Tensión de cadena", "tipo": "ESTADO", "opciones": ["CORRECTA", "FLOJA", "TENSA"], "requerido": true},
                {"codigo": "MEC005", "descripcion": "Estado de llanta delantera", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "MEC006", "descripcion": "Estado de llanta trasera", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "MEC007", "descripcion": "Suspensión delantera", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "MEC008", "descripcion": "Suspensión trasera", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "MEC009", "descripcion": "Nivel de aceite motor", "tipo": "ESTADO", "opciones": ["NORMAL", "BAJO", "CRÍTICO"], "requerido": true},
                {"codigo": "MEC010", "descripcion": "Bocina/claxon", "tipo": "ESTADO", "opciones": ["FUNCIONANDO", "NO FUNCIONA"], "requerido": true}
            ]
        },
        {
            "nombre": "Equipamiento de Seguridad",
            "items": [
                {"codigo": "SEG001", "descripcion": "Casco (estado)", "tipo": "ESTADO", "opciones": ["BUENO", "REGULAR", "MALO"], "requerido": true},
                {"codigo": "SEG002", "descripcion": "Chaleco reflectivo", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "SEG003", "descripcion": "Guantes", "tipo": "CHECKBOX", "requerido": false},
                {"codigo": "SEG004", "descripcion": "Documentos del vehículo", "tipo": "CHECKBOX", "requerido": true},
                {"codigo": "SEG005", "descripcion": "Licencia de conducir", "tipo": "CHECKBOX", "requerido": true}
            ]
        }
    ]'::JSONB
) ON CONFLICT DO NOTHING;

-- ========================================
-- 8. PERMISOS
-- ========================================

-- Dar permisos de lectura a roles necesarios
GRANT SELECT ON plantilla_inspeccion_360 TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON inspeccion_360 TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE inspeccion_360_id_seq TO PUBLIC;

-- ========================================
-- 9. COMENTARIOS FINALES
-- ========================================

COMMENT ON TABLE plantilla_inspeccion_360 IS 'Plantillas dinámicas de inspección 360 por tipo de unidad. Los SUPER_ADMIN pueden crear/editar plantillas.';
COMMENT ON TABLE inspeccion_360 IS 'Registro de inspecciones 360 realizadas. Cada salida requiere una inspección aprobada.';
