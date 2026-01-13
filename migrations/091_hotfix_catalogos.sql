-- Hotfix 091: Añadir columnas faltantes y completar migración
-- Fecha: 2026-01-12
-- Problema: tipo_hecho y tipo_vehiculo no tienen columna "codigo"
-- Esto causó que los INSERTs y la vista fallaran

BEGIN;

-- ========================================
-- 1. AGREGAR COLUMNAS FALTANTES A tipo_hecho
-- ========================================

ALTER TABLE public.tipo_hecho
    ADD COLUMN IF NOT EXISTS codigo VARCHAR(30),
    ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- ========================================
-- 2. AGREGAR COLUMNAS FALTANTES A tipo_vehiculo
-- ========================================

ALTER TABLE public.tipo_vehiculo
    ADD COLUMN IF NOT EXISTS codigo VARCHAR(30),
    ADD COLUMN IF NOT EXISTS descripcion TEXT,
    ADD COLUMN IF NOT EXISTS icono VARCHAR(80),
    ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

-- ========================================
-- 3. BACKFILL: Asignar códigos a registros existentes por nombre
-- ========================================

-- tipo_hecho existentes (por nombre)
UPDATE public.tipo_hecho SET codigo = 'CAIDA', descripcion = COALESCE(descripcion, 'Caída de vehículo o persona')
WHERE codigo IS NULL AND LOWER(nombre) IN ('caída', 'caida');

UPDATE public.tipo_hecho SET codigo = 'DERRAPE', descripcion = COALESCE(descripcion, 'Pérdida de tracción del vehículo')
WHERE codigo IS NULL AND LOWER(nombre) = 'derrape';

UPDATE public.tipo_hecho SET codigo = 'SALIDA_PISTA', descripcion = COALESCE(descripcion, 'Vehículo salió de la vía')
WHERE codigo IS NULL AND LOWER(nombre) LIKE 'salida%pist%';

UPDATE public.tipo_hecho SET codigo = 'ATAQUE_ARMADO', descripcion = COALESCE(descripcion, 'Ataque con arma de fuego u otra')
WHERE codigo IS NULL AND LOWER(nombre) LIKE 'ataque%arm%';

UPDATE public.tipo_hecho SET codigo = 'DESPRENDIMIENTO', descripcion = COALESCE(descripcion, 'Desprendimiento de carga o partes')
WHERE codigo IS NULL AND LOWER(nombre) LIKE 'desprend%';

-- tipo_vehiculo existentes (por nombre)
UPDATE public.tipo_vehiculo SET codigo = 'MOTOBICICLETA', descripcion = COALESCE(descripcion, 'Bicicleta con motor auxiliar'), icono = COALESCE(icono, 'bike')
WHERE codigo IS NULL AND LOWER(nombre) LIKE 'motobicic%';

UPDATE public.tipo_vehiculo SET codigo = 'MOTOTAXI', descripcion = COALESCE(descripcion, 'Motocicleta con cabina para pasajeros'), icono = COALESCE(icono, 'truck')
WHERE codigo IS NULL AND LOWER(nombre) LIKE 'mototax%';

UPDATE public.tipo_vehiculo SET codigo = 'CISTERNA', descripcion = COALESCE(descripcion, 'Vehículo cisterna'), icono = COALESCE(icono, 'droplet')
WHERE codigo IS NULL AND LOWER(nombre) = 'cisterna';

UPDATE public.tipo_vehiculo SET codigo = 'TRACTOR', descripcion = COALESCE(descripcion, 'Tractor agrícola o de construcción'), icono = COALESCE(icono, 'cog')
WHERE codigo IS NULL AND LOWER(nombre) = 'tractor';

UPDATE public.tipo_vehiculo SET codigo = 'CAMIONETA_AGRICOLA', descripcion = COALESCE(descripcion, 'Camioneta para uso agrícola'), icono = COALESCE(icono, 'truck')
WHERE codigo IS NULL AND LOWER(nombre) LIKE 'camioneta%agr%';

UPDATE public.tipo_vehiculo SET codigo = 'GRUA', descripcion = COALESCE(descripcion, 'Vehículo grúa'), icono = COALESCE(icono, 'anchor')
WHERE codigo IS NULL AND LOWER(nombre) IN ('grúa', 'grua');

UPDATE public.tipo_vehiculo SET codigo = 'SIN_DATOS', descripcion = COALESCE(descripcion, 'No hay datos del vehículo'), icono = COALESCE(icono, 'help-circle')
WHERE codigo IS NULL AND LOWER(nombre) LIKE 'sin%dat%';

-- ========================================
-- 4. RE-EJECUTAR INSERTs FALLIDOS (idempotente)
-- ========================================

-- tipo_hecho
INSERT INTO public.tipo_hecho (codigo, nombre, descripcion, color, icono, activo) 
SELECT 'CAIDA', 'Caída', 'Caída de vehículo o persona', '#FFA500', 'alert-triangle', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.tipo_hecho WHERE codigo = 'CAIDA');

INSERT INTO public.tipo_hecho (codigo, nombre, descripcion, color, icono, activo) 
SELECT 'DERRAPE', 'Derrape', 'Pérdida de tracción del vehículo', '#8B4513', 'rotate-ccw', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.tipo_hecho WHERE codigo = 'DERRAPE');

INSERT INTO public.tipo_hecho (codigo, nombre, descripcion, color, icono, activo) 
SELECT 'SALIDA_PISTA', 'Salida de pista', 'Vehículo salió de la vía', '#DC143C', 'external-link', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.tipo_hecho WHERE codigo = 'SALIDA_PISTA');

INSERT INTO public.tipo_hecho (codigo, nombre, descripcion, color, icono, activo) 
SELECT 'ATAQUE_ARMADO', 'Ataque armado', 'Ataque con arma de fuego u otra', '#800000', 'crosshair', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.tipo_hecho WHERE codigo = 'ATAQUE_ARMADO');

INSERT INTO public.tipo_hecho (codigo, nombre, descripcion, color, icono, activo) 
SELECT 'DESPRENDIMIENTO', 'Desprendimiento', 'Desprendimiento de carga o partes', '#4B0082', 'package', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.tipo_hecho WHERE codigo = 'DESPRENDIMIENTO');

-- tipo_vehiculo
INSERT INTO public.tipo_vehiculo (codigo, nombre, descripcion, icono, activo)
SELECT 'MOTOBICICLETA', 'Motobicicleta', 'Bicicleta con motor auxiliar', 'bike', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.tipo_vehiculo WHERE codigo = 'MOTOBICICLETA');

INSERT INTO public.tipo_vehiculo (codigo, nombre, descripcion, icono, activo)
SELECT 'MOTOTAXI', 'Mototaxi', 'Motocicleta con cabina para pasajeros', 'truck', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.tipo_vehiculo WHERE codigo = 'MOTOTAXI');

INSERT INTO public.tipo_vehiculo (codigo, nombre, descripcion, icono, activo)
SELECT 'CISTERNA', 'Cisterna', 'Vehículo cisterna', 'droplet', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.tipo_vehiculo WHERE codigo = 'CISTERNA');

INSERT INTO public.tipo_vehiculo (codigo, nombre, descripcion, icono, activo)
SELECT 'TRACTOR', 'Tractor', 'Tractor agrícola o de construcción', 'cog', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.tipo_vehiculo WHERE codigo = 'TRACTOR');

INSERT INTO public.tipo_vehiculo (codigo, nombre, descripcion, icono, activo)
SELECT 'CAMIONETA_AGRICOLA', 'Camioneta Agrícola', 'Camioneta para uso agrícola', 'truck', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.tipo_vehiculo WHERE codigo = 'CAMIONETA_AGRICOLA');

INSERT INTO public.tipo_vehiculo (codigo, nombre, descripcion, icono, activo)
SELECT 'GRUA', 'Grúa', 'Vehículo grúa', 'anchor', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.tipo_vehiculo WHERE codigo = 'GRUA');

INSERT INTO public.tipo_vehiculo (codigo, nombre, descripcion, icono, activo)
SELECT 'SIN_DATOS', 'Sin datos', 'No hay datos del vehículo', 'help-circle', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.tipo_vehiculo WHERE codigo = 'SIN_DATOS');

-- ========================================
-- 5. ÍNDICES ÚNICOS PARA CODIGO (solo si tiene valor)
-- ========================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_tipo_hecho_codigo
    ON public.tipo_hecho (codigo) WHERE codigo IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tipo_vehiculo_codigo
    ON public.tipo_vehiculo (codigo) WHERE codigo IS NOT NULL;

-- ========================================
-- 6. CREAR VISTA QUE FALLÓ
-- ========================================

CREATE OR REPLACE VIEW public.v_accidentologia_completa AS
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
FROM public.incidente i
LEFT JOIN public.hoja_accidentologia h ON h.incidente_id = i.id
LEFT JOIN public.ruta r ON i.ruta_id = r.id
LEFT JOIN public.departamento d ON i.departamento_id = d.id
LEFT JOIN public.municipio m ON i.municipio_id = m.id
LEFT JOIN public.tipo_hecho th ON i.tipo_hecho_id = th.id
LEFT JOIN public.estado_via ev ON h.estado_via_id = ev.id
LEFT JOIN public.topografia_via tv ON h.topografia_id = tv.id
LEFT JOIN public.geometria_via gv ON h.geometria_via_id = gv.id
LEFT JOIN public.unidad u ON i.unidad_id = u.id
LEFT JOIN public.usuario usr ON h.elaborado_por = usr.id;

COMMENT ON VIEW public.v_accidentologia_completa IS 'Vista consolidada de incidente + hoja_accidentologia para reportes y boleta PDF';

COMMIT;

-- ========================================
-- VERIFICACIÓN (ejecutar manualmente)
-- ========================================
-- SELECT codigo, nombre FROM tipo_hecho WHERE codigo IS NOT NULL LIMIT 10;
-- SELECT codigo, nombre FROM tipo_vehiculo WHERE codigo IS NOT NULL LIMIT 10;
-- SELECT * FROM v_accidentologia_completa LIMIT 1;
