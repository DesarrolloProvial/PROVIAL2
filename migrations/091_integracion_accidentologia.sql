-- Migración 091: Integración Accidentología (v3 - PROD-READY)
-- Referencia: Boleta UAV-205-13
-- Fecha: 2026-01-12
-- 
-- DECISIONES DE DISEÑO:
-- 1. hoja_accidentologia es la FUENTE DE VERDAD para campos de vía (no duplicar en incidente)
-- 2. Tabla puente incidente_causa para integridad referencial (no array INT[])
-- 3. Trigger automático para generar numero_boleta + secuencia
-- 
-- Ver: docs/DICCIONARIO_DATOS_PROVIAL.md

-- ========================================
-- 1. AGREGAR codigo_boleta A SEDE
-- ========================================

ALTER TABLE sede ADD COLUMN IF NOT EXISTS codigo_boleta VARCHAR(10);

COMMENT ON COLUMN sede.codigo_boleta IS 'Código abreviado para numeración de boletas de accidentología';

UPDATE sede SET codigo_boleta = 'SC' WHERE id = 1 AND codigo_boleta IS NULL;
UPDATE sede SET codigo_boleta = 'SRSB' WHERE id = 2 AND codigo_boleta IS NULL;
UPDATE sede SET codigo_boleta = 'SRPP' WHERE id = 3 AND codigo_boleta IS NULL;
UPDATE sede SET codigo_boleta = 'SRSCA' WHERE id = 4 AND codigo_boleta IS NULL;
UPDATE sede SET codigo_boleta = 'SRQ' WHERE id = 5 AND codigo_boleta IS NULL;
UPDATE sede SET codigo_boleta = 'SRCOA' WHERE id = 6 AND codigo_boleta IS NULL;
UPDATE sede SET codigo_boleta = 'SRTPE' WHERE id = 7 AND codigo_boleta IS NULL;
UPDATE sede SET codigo_boleta = 'SRMI' WHERE id = 8 AND codigo_boleta IS NULL;
UPDATE sede SET codigo_boleta = 'SRDPBI' WHERE id = 9 AND codigo_boleta IS NULL;

-- ========================================
-- 2. CATÁLOGO: CAUSAS DE HECHO DE TRÁNSITO
-- ========================================

CREATE TABLE IF NOT EXISTS causa_hecho_transito (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    orden INT NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE causa_hecho_transito IS 'Catálogo de 23 causas de hechos de tránsito según boleta UAV-205-13';

INSERT INTO causa_hecho_transito (codigo, nombre, orden) VALUES
('EXCESO_VELOCIDAD', 'Exceso de velocidad', 1),
('NO_OBEDECER_SENALES', 'No obedecer señales', 2),
('HABLAR_TELEFONO', 'Hablar por teléfono', 3),
('VIRAJES_PROHIBIDOS', 'Realizar virajes prohibidos', 4),
('RETROCESO', 'Retroceso', 5),
('ALCOHOL_DROGAS', 'Efectos de alcohol/drogas', 6),
('PROBLEMAS_SALUD', 'Problemas de salud', 7),
('REBASAR', 'Rebasar', 8),
('VIA_CONTRARIA', 'Circular en vía contraria', 9),
('EXCESO_PASAJEROS', 'Exceso de pasajeros', 10),
('EXCESO_CARGA', 'Exceso de carga', 11),
('CONDICION_VIA', 'Condición de la vía', 12),
('FALLA_MECANICA', 'Falla mecánica', 13),
('ESTACIONAMIENTO_PROHIBIDO', 'Estacionamiento prohibido', 14),
('BAJA_VISIBILIDAD', 'Baja visibilidad', 15),
('SE_IGNORA', 'Se ignora', 16),
('IMPRUDENCIA_PILOTO', 'Imprudencia del piloto', 17),
('IMPRUDENCIA_PEATON', 'Imprudencia del peatón', 18),
('CARGA_MAL_COLOCADA', 'Carga mal colocada', 19),
('ARMA_FUEGO', 'Fallecido por arma de fuego', 20),
('CANSANCIO', 'Cansancio', 21),
('EXPLOSION_NEUMATICO', 'Explosión del neumático', 22),
('OTRO', 'Otro (especificar)', 23)
ON CONFLICT (codigo) DO NOTHING;

-- ========================================
-- 3. TABLA PUENTE: INCIDENTE - CAUSAS (con integridad referencial)
-- ========================================

CREATE TABLE IF NOT EXISTS incidente_causa (
    id SERIAL PRIMARY KEY,
    incidente_id BIGINT NOT NULL REFERENCES incidente(id) ON DELETE CASCADE,
    causa_id INT NOT NULL REFERENCES causa_hecho_transito(id) ON DELETE RESTRICT,
    es_causa_principal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_incidente_causa UNIQUE (incidente_id, causa_id)
);

COMMENT ON TABLE incidente_causa IS 'Relación N:M entre incidentes y causas con integridad referencial';
CREATE INDEX IF NOT EXISTS idx_incidente_causa_incidente ON incidente_causa(incidente_id);
CREATE INDEX IF NOT EXISTS idx_incidente_causa_causa ON incidente_causa(causa_id);

-- ========================================
-- 4. CATÁLOGOS DE VÍA (usados por hoja_accidentologia)
-- ========================================

CREATE TABLE IF NOT EXISTS estado_via (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(30) NOT NULL,
    orden INT NOT NULL DEFAULT 0
);

INSERT INTO estado_via (codigo, nombre, orden) VALUES
('OPTIMO', 'Óptimo', 1),
('BUENO', 'Bueno', 2),
('REGULAR', 'Regular', 3),
('MALO', 'Malo', 4)
ON CONFLICT (codigo) DO NOTHING;

CREATE TABLE IF NOT EXISTS topografia_via (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(30) NOT NULL,
    orden INT NOT NULL DEFAULT 0
);

INSERT INTO topografia_via (codigo, nombre, orden) VALUES
('SUBIDA', 'Subida', 1),
('BAJADA', 'Bajada', 2),
('PLANA', 'Plana', 3)
ON CONFLICT (codigo) DO NOTHING;

CREATE TABLE IF NOT EXISTS geometria_via (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(50) NOT NULL,
    orden INT NOT NULL DEFAULT 0
);

INSERT INTO geometria_via (codigo, nombre, orden) VALUES
('RECTA', 'Recta', 1),
('CURVA', 'Curva', 2),
('MIXTA', 'Mixta', 3),
('INTERSECCION', 'Intersección', 4),
('PERALTE_ADECUADO', 'Peralte adecuado', 5),
('PERALTE_INVERTIDO', 'Peralte invertido', 6),
('SIN_PERALTE', 'Sin peralte', 7)
ON CONFLICT (codigo) DO NOTHING;

CREATE TABLE IF NOT EXISTS dispositivo_seguridad (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(50) NOT NULL,
    orden INT NOT NULL DEFAULT 0
);

INSERT INTO dispositivo_seguridad (codigo, nombre, orden) VALUES
('CINTURON', 'Cinturón de seguridad', 1),
('CASCO', 'Casco', 2),
('BOLSA_AIRE', 'Bolsa de aire', 3),
('SILLA_BEBE', 'Silla para bebé', 4),
('REPOSA_CABEZA', 'Reposa cabeza', 5),
('OTRO', 'Otro', 6)
ON CONFLICT (codigo) DO NOTHING;

-- ========================================
-- 5. AGREGAR TIPOS DE HECHO FALTANTES
-- ========================================

INSERT INTO tipo_hecho (codigo, nombre, descripcion, color, icono, activo) 
SELECT 'CAIDA', 'Caída', 'Caída de vehículo o persona', '#FFA500', 'alert-triangle', TRUE
WHERE NOT EXISTS (SELECT 1 FROM tipo_hecho WHERE codigo = 'CAIDA');

INSERT INTO tipo_hecho (codigo, nombre, descripcion, color, icono, activo) 
SELECT 'DERRAPE', 'Derrape', 'Pérdida de tracción del vehículo', '#8B4513', 'rotate-ccw', TRUE
WHERE NOT EXISTS (SELECT 1 FROM tipo_hecho WHERE codigo = 'DERRAPE');

INSERT INTO tipo_hecho (codigo, nombre, descripcion, color, icono, activo) 
SELECT 'SALIDA_PISTA', 'Salida de pista', 'Vehículo salió de la vía', '#DC143C', 'external-link', TRUE
WHERE NOT EXISTS (SELECT 1 FROM tipo_hecho WHERE codigo = 'SALIDA_PISTA');

INSERT INTO tipo_hecho (codigo, nombre, descripcion, color, icono, activo) 
SELECT 'ATAQUE_ARMADO', 'Ataque armado', 'Ataque con arma de fuego u otra', '#800000', 'crosshair', TRUE
WHERE NOT EXISTS (SELECT 1 FROM tipo_hecho WHERE codigo = 'ATAQUE_ARMADO');

INSERT INTO tipo_hecho (codigo, nombre, descripcion, color, icono, activo) 
SELECT 'DESPRENDIMIENTO', 'Desprendimiento', 'Desprendimiento de carga o partes', '#4B0082', 'package', TRUE
WHERE NOT EXISTS (SELECT 1 FROM tipo_hecho WHERE codigo = 'DESPRENDIMIENTO');

-- ========================================
-- 6. AGREGAR TIPOS DE VEHÍCULO FALTANTES
-- ========================================

INSERT INTO tipo_vehiculo (codigo, nombre, descripcion, icono, activo)
SELECT 'MOTOBICICLETA', 'Motobicicleta', 'Bicicleta con motor auxiliar', 'bike', TRUE
WHERE NOT EXISTS (SELECT 1 FROM tipo_vehiculo WHERE codigo = 'MOTOBICICLETA');

INSERT INTO tipo_vehiculo (codigo, nombre, descripcion, icono, activo)
SELECT 'MOTOTAXI', 'Mototaxi', 'Motocicleta con cabina para pasajeros', 'truck', TRUE
WHERE NOT EXISTS (SELECT 1 FROM tipo_vehiculo WHERE codigo = 'MOTOTAXI');

INSERT INTO tipo_vehiculo (codigo, nombre, descripcion, icono, activo)
SELECT 'CISTERNA', 'Cisterna', 'Vehículo cisterna', 'droplet', TRUE
WHERE NOT EXISTS (SELECT 1 FROM tipo_vehiculo WHERE codigo = 'CISTERNA');

INSERT INTO tipo_vehiculo (codigo, nombre, descripcion, icono, activo)
SELECT 'TRACTOR', 'Tractor', 'Tractor agrícola o de construcción', 'cog', TRUE
WHERE NOT EXISTS (SELECT 1 FROM tipo_vehiculo WHERE codigo = 'TRACTOR');

INSERT INTO tipo_vehiculo (codigo, nombre, descripcion, icono, activo)
SELECT 'CAMIONETA_AGRICOLA', 'Camioneta Agrícola', 'Camioneta para uso agrícola', 'truck', TRUE
WHERE NOT EXISTS (SELECT 1 FROM tipo_vehiculo WHERE codigo = 'CAMIONETA_AGRICOLA');

INSERT INTO tipo_vehiculo (codigo, nombre, descripcion, icono, activo)
SELECT 'GRUA', 'Grúa', 'Vehículo grúa', 'anchor', TRUE
WHERE NOT EXISTS (SELECT 1 FROM tipo_vehiculo WHERE codigo = 'GRUA');

INSERT INTO tipo_vehiculo (codigo, nombre, descripcion, icono, activo)
SELECT 'SIN_DATOS', 'Sin datos', 'No hay datos del vehículo', 'help-circle', TRUE
WHERE NOT EXISTS (SELECT 1 FROM tipo_vehiculo WHERE codigo = 'SIN_DATOS');

-- ========================================
-- 7. CAMPOS EN incidente (solo boleta, NO vía)
-- Decisión: campos de vía viven en hoja_accidentologia
-- ========================================

-- Número de boleta
ALTER TABLE incidente ADD COLUMN IF NOT EXISTS numero_boleta VARCHAR(20);
ALTER TABLE incidente ADD COLUMN IF NOT EXISTS numero_boleta_secuencia INT;

-- Área del accidente
ALTER TABLE incidente ADD COLUMN IF NOT EXISTS area VARCHAR(10);

-- Causa especificada cuando es "OTRO"
ALTER TABLE incidente ADD COLUMN IF NOT EXISTS causa_especificar TEXT;

-- Fotos/croquis
ALTER TABLE incidente ADD COLUMN IF NOT EXISTS croquis_url TEXT;
ALTER TABLE incidente ADD COLUMN IF NOT EXISTS fotos_urls TEXT[];

-- Constraints
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'incidente_numero_boleta_unique'
    ) THEN
        ALTER TABLE incidente ADD CONSTRAINT incidente_numero_boleta_unique UNIQUE (numero_boleta);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'incidente_area_check'
    ) THEN
        ALTER TABLE incidente ADD CONSTRAINT incidente_area_check 
            CHECK (area IS NULL OR area IN ('URBANA', 'RURAL'));
    END IF;
END $$;

COMMENT ON COLUMN incidente.numero_boleta IS 'Número de boleta formato SEDE-AÑO-SEQ (ej: SC-2026-0001). UNIQUE.';
COMMENT ON COLUMN incidente.numero_boleta_secuencia IS 'Secuencia numérica dentro del año/sede para ordenamiento';
COMMENT ON COLUMN incidente.area IS 'Área donde ocurrió: URBANA o RURAL';

-- ========================================
-- 8. EXTENSIÓN DE hoja_accidentologia (FUENTE DE VERDAD para vía)
-- ========================================

-- Enlace directo a incidente (1:1)
ALTER TABLE hoja_accidentologia ADD COLUMN IF NOT EXISTS incidente_id BIGINT REFERENCES incidente(id);

-- Campos de vía (SOLO aquí, no en incidente)
ALTER TABLE hoja_accidentologia ADD COLUMN IF NOT EXISTS estado_via_id INT REFERENCES estado_via(id);
ALTER TABLE hoja_accidentologia ADD COLUMN IF NOT EXISTS topografia_id INT REFERENCES topografia_via(id);
ALTER TABLE hoja_accidentologia ADD COLUMN IF NOT EXISTS geometria_via_id INT REFERENCES geometria_via(id);
ALTER TABLE hoja_accidentologia ADD COLUMN IF NOT EXISTS numero_carriles INT;

-- Datos del agente de apoyo externo
ALTER TABLE hoja_accidentologia ADD COLUMN IF NOT EXISTS agente_apoyo_nombre VARCHAR(150);
ALTER TABLE hoja_accidentologia ADD COLUMN IF NOT EXISTS agente_apoyo_id_externo VARCHAR(50);
ALTER TABLE hoja_accidentologia ADD COLUMN IF NOT EXISTS agente_apoyo_unidad VARCHAR(50);
ALTER TABLE hoja_accidentologia ADD COLUMN IF NOT EXISTS agente_apoyo_institucion VARCHAR(20);

-- Constraint 1:1
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'hoja_accidentologia_incidente_unique'
    ) THEN
        ALTER TABLE hoja_accidentologia ADD CONSTRAINT hoja_accidentologia_incidente_unique UNIQUE (incidente_id);
    END IF;
END $$;

-- Check para institución
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'hoja_acc_institucion_check'
    ) THEN
        ALTER TABLE hoja_accidentologia ADD CONSTRAINT hoja_acc_institucion_check 
            CHECK (agente_apoyo_institucion IS NULL OR agente_apoyo_institucion IN 
                   ('PMT', 'PNC', 'MP', 'BV', 'BM', 'EJERCITO', 'DGT', 'IGSS', 'CRUZ_ROJA'));
    END IF;
END $$;

COMMENT ON COLUMN hoja_accidentologia.incidente_id IS 'FK directa a incidente (1:1). UNIQUE.';
COMMENT ON COLUMN hoja_accidentologia.estado_via_id IS 'FUENTE DE VERDAD para estado vía';
COMMENT ON COLUMN hoja_accidentologia.agente_apoyo_institucion IS 'Valores: PMT, PNC, MP, BV, BM, EJERCITO, DGT, IGSS, CRUZ_ROJA';

-- ========================================
-- 9. EXTENSIÓN DE vehiculo_accidente
-- ========================================

-- Ebriedad y licencia
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS estado_ebriedad BOOLEAN DEFAULT FALSE;
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS tiene_licencia VARCHAR(10);
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS licencia_extranjera BOOLEAN DEFAULT FALSE;
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS piloto_domicilio TEXT;

-- Pasajeros
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS pasajeros_ilesos INT DEFAULT 0;

-- Traslados
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS traslados JSONB DEFAULT '{}';

-- Dispositivos de seguridad
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS dispositivos_seguridad VARCHAR(30)[];
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS dispositivo_otro VARCHAR(100);

-- Consignación
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS doc_consignado_licencia BOOLEAN DEFAULT FALSE;
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS doc_consignado_tarjeta BOOLEAN DEFAULT FALSE;
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS doc_consignado_por VARCHAR(20);
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS vehiculo_consignado BOOLEAN DEFAULT FALSE;
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS vehiculo_consignado_por VARCHAR(20);
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS conductor_consignado BOOLEAN DEFAULT FALSE;
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS conductor_consignado_por VARCHAR(20);

-- Acuerdo
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS acuerdo BOOLEAN;
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS acuerdo_tipo VARCHAR(30);

-- Licencias comerciales
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS licencia_transporte VARCHAR(50);
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS tarjeta_operaciones VARCHAR(50);

-- Remolque
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS placa_remolque VARCHAR(20);
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS nit_remolque VARCHAR(20);

-- Empresa
ALTER TABLE vehiculo_accidente ADD COLUMN IF NOT EXISTS empresa VARCHAR(150);

-- Constraints con CHECK
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'vehiculo_accidente_tiene_licencia_check'
    ) THEN
        ALTER TABLE vehiculo_accidente ADD CONSTRAINT vehiculo_accidente_tiene_licencia_check 
            CHECK (tiene_licencia IS NULL OR tiene_licencia IN ('SI', 'NO', 'NO_PORTA'));
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'vehiculo_accidente_acuerdo_tipo_check'
    ) THEN
        ALTER TABLE vehiculo_accidente ADD CONSTRAINT vehiculo_accidente_acuerdo_tipo_check 
            CHECK (acuerdo_tipo IS NULL OR acuerdo_tipo IN ('ASEGURADORA', 'INICIATIVA_PROPIA'));
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'vehiculo_acc_consignado_por_check'
    ) THEN
        ALTER TABLE vehiculo_accidente ADD CONSTRAINT vehiculo_acc_consignado_por_check 
            CHECK (doc_consignado_por IS NULL OR doc_consignado_por IN ('DGT', 'PMT', 'PNC'));
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'vehiculo_acc_vehiculo_consignado_por_check'
    ) THEN
        ALTER TABLE vehiculo_accidente ADD CONSTRAINT vehiculo_acc_vehiculo_consignado_por_check 
            CHECK (vehiculo_consignado_por IS NULL OR vehiculo_consignado_por IN ('PMT', 'PNC'));
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'vehiculo_acc_conductor_consignado_por_check'
    ) THEN
        ALTER TABLE vehiculo_accidente ADD CONSTRAINT vehiculo_acc_conductor_consignado_por_check 
            CHECK (conductor_consignado_por IS NULL OR conductor_consignado_por IN ('EJERCITO', 'PMT', 'PNC'));
    END IF;
END $$;

-- ========================================
-- 10. FUNCIÓN PARA GENERAR NÚMERO BOLETA
-- ========================================

CREATE OR REPLACE FUNCTION fn_generar_numero_boleta(p_sede_id INT)
RETURNS TABLE(numero TEXT, secuencia INT) AS $$
DECLARE
    v_codigo_sede VARCHAR(10);
    v_anio INT;
    v_secuencia INT;
    v_numero_boleta TEXT;
BEGIN
    -- Obtener código de sede
    SELECT codigo_boleta INTO v_codigo_sede FROM sede WHERE id = p_sede_id;
    
    IF v_codigo_sede IS NULL THEN
        RAISE EXCEPTION 'Sede % no tiene codigo_boleta definido', p_sede_id;
    END IF;
    
    -- Año actual
    v_anio := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
    
    -- Obtener siguiente secuencia con lock a nivel de fila
    SELECT COALESCE(MAX(numero_boleta_secuencia), 0) + 1
    INTO v_secuencia
    FROM incidente
    WHERE numero_boleta LIKE v_codigo_sede || '-' || v_anio || '-%'
    FOR UPDATE;
    
    -- Formatear
    v_numero_boleta := v_codigo_sede || '-' || v_anio || '-' || LPAD(v_secuencia::TEXT, 4, '0');
    
    RETURN QUERY SELECT v_numero_boleta, v_secuencia;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_generar_numero_boleta IS 'Genera número y secuencia de boleta. Usar dentro de transacción.';

-- ========================================
-- 11. TRIGGER PARA AUTO-GENERAR BOLETA EN INSERT
-- ========================================

CREATE OR REPLACE FUNCTION tr_fn_generar_boleta_incidente()
RETURNS TRIGGER AS $$
DECLARE
    v_sede_id INT;
    v_resultado RECORD;
BEGIN
    -- Solo generar si numero_boleta es NULL y hay unidad asignada
    IF NEW.numero_boleta IS NULL AND NEW.unidad_id IS NOT NULL THEN
        -- Obtener sede de la unidad
        SELECT sede_id INTO v_sede_id FROM unidad WHERE id = NEW.unidad_id;
        
        IF v_sede_id IS NOT NULL THEN
            -- Obtener número y secuencia
            SELECT * INTO v_resultado FROM fn_generar_numero_boleta(v_sede_id);
            
            NEW.numero_boleta := v_resultado.numero;
            NEW.numero_boleta_secuencia := v_resultado.secuencia;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS tr_generar_boleta_incidente ON incidente;
CREATE TRIGGER tr_generar_boleta_incidente
    BEFORE INSERT ON incidente
    FOR EACH ROW
    EXECUTE FUNCTION tr_fn_generar_boleta_incidente();

COMMENT ON FUNCTION tr_fn_generar_boleta_incidente IS 'Trigger que auto-genera numero_boleta y secuencia al insertar incidente';

-- ========================================
-- 12. ÍNDICES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_incidente_numero_boleta ON incidente(numero_boleta);
CREATE INDEX IF NOT EXISTS idx_incidente_area ON incidente(area);
CREATE INDEX IF NOT EXISTS idx_hoja_acc_incidente ON hoja_accidentologia(incidente_id);
CREATE INDEX IF NOT EXISTS idx_hoja_acc_estado_via ON hoja_accidentologia(estado_via_id);

-- ========================================
-- 13. VISTA PARA ACCIDENTOLOGÍA COMPLETA
-- ========================================

CREATE OR REPLACE VIEW v_accidentologia_completa AS
SELECT 
    i.id AS incidente_id,
    i.uuid AS incidente_uuid,
    i.numero_boleta,
    i.numero_boleta_secuencia,
    i.fecha_hora_aviso,
    i.estado AS incidente_estado,
    -- Ubicación
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    i.km,
    i.sentido,
    i.latitud,
    i.longitud,
    d.nombre AS departamento,
    m.nombre AS municipio,
    i.area,
    -- Tipo hecho
    th.codigo AS tipo_hecho_codigo,
    th.nombre AS tipo_hecho,
    -- Víctimas
    i.cantidad_heridos,
    i.cantidad_fallecidos,
    -- Hoja accidentología
    h.id AS hoja_id,
    h.tipo_accidente,
    h.descripcion_accidente,
    h.condiciones_climaticas,
    h.iluminacion,
    h.visibilidad,
    h.causa_principal,
    h.causas_contribuyentes,
    -- Vía (de hoja_accidentologia - fuente de verdad)
    ev.nombre AS estado_via,
    tv.nombre AS topografia,
    gv.nombre AS geometria_via,
    h.numero_carriles,
    -- Autoridades
    h.pnc_presente,
    h.pnc_agente,
    h.bomberos_presente,
    h.bomberos_unidad,
    h.mp_presente,
    h.mp_fiscal,
    h.agente_apoyo_nombre,
    h.agente_apoyo_institucion,
    -- Estado
    h.estado AS hoja_estado,
    h.numero_caso_pnc,
    h.numero_caso_mp,
    -- Unidad/Brigada
    u.codigo AS unidad_codigo,
    usr.nombre_completo AS elaborado_por
FROM incidente i
LEFT JOIN hoja_accidentologia h ON h.incidente_id = i.id
LEFT JOIN ruta r ON i.ruta_id = r.id
LEFT JOIN departamento d ON i.departamento_id = d.id
LEFT JOIN municipio m ON i.municipio_id = m.id
LEFT JOIN tipo_hecho th ON i.tipo_hecho_id = th.id
LEFT JOIN estado_via ev ON h.estado_via_id = ev.id
LEFT JOIN topografia_via tv ON h.topografia_id = tv.id
LEFT JOIN geometria_via gv ON h.geometria_via_id = gv.id
LEFT JOIN unidad u ON i.unidad_id = u.id
LEFT JOIN usuario usr ON h.elaborado_por = usr.id;

COMMENT ON VIEW v_accidentologia_completa IS 'Vista consolidada de incidente + hoja_accidentologia para reportes y boleta PDF';

-- ========================================
-- FIN MIGRACIÓN 091
-- ========================================

