-- 097_add_situacion_details.sql
-- Agrega columnas para detalles de situación y actualiza vistas
-- Desactiva tipos de situación no utilizados

BEGIN;

-- 1. Agregar columnas a tabla situacion
ALTER TABLE situacion
ADD COLUMN IF NOT EXISTS clima VARCHAR(50),
ADD COLUMN IF NOT EXISTS carga_vehicular VARCHAR(50),
ADD COLUMN IF NOT EXISTS departamento_id INTEGER REFERENCES departamento(id),
ADD COLUMN IF NOT EXISTS municipio_id INTEGER REFERENCES municipio(id);

-- 2. Flexibilizar detalle_situacion (quitar check constraint para permitir tipos dinámicos)
ALTER TABLE detalle_situacion DROP CONSTRAINT IF EXISTS detalle_situacion_tipo_detalle_check;

-- 3. Desactivar tipos de situación no deseados
UPDATE catalogo_tipo_situacion 
SET activo = false 
WHERE nombre IN (
    'Retirando señalización', 
    'Regulación en aeropuerto', 
    'Denuncia de usuario', 
    'Apoyo a bascula', 
    'Escoltando Autoridades', 
    'Bloqueo', 
    'Manifestación', 
    'Orden del Día'
);

-- 4. Actualizar Vistas (DROP CASCADE obligatoria para recrear dependencias)
DROP VIEW IF EXISTS v_ultima_situacion_unidad CASCADE; -- Tambien esta depende
DROP VIEW IF EXISTS v_situaciones_completas CASCADE;

CREATE OR REPLACE VIEW v_situaciones_completas AS
SELECT 
    s.id,
    s.uuid,
    s.numero_situacion,
    s.tipo_situacion,
    s.estado,
    s.salida_unidad_id,
    s.ruta_id,
    s.km,
    s.sentido,
    s.latitud,
    s.longitud,
    s.ubicacion_manual,
    s.combustible,
    s.kilometraje_unidad,
    s.descripcion,
    s.observaciones,
    s.tripulacion_confirmada,
    s.unidad_id,
    s.turno_id,
    s.asignacion_id,
    s.incidente_id,
    s.evento_persistente_id,
    s.creado_por,
    s.actualizado_por,
    s.created_at,
    s.updated_at,
    s.tipo_situacion_id,
    -- NUEVOS CAMPOS
    s.clima,
    s.carga_vehicular,
    s.departamento_id,
    s.municipio_id,
    
    -- Relaciones
    d.nombre as departamento_nombre,
    m.nombre as municipio_nombre,

    u.codigo as unidad_codigo,
    u.tipo_unidad as tipo_unidad,
    r.codigo as ruta_codigo,
    r.nombre as ruta_nombre,
    t.fecha as turno_fecha,
    i.numero_reporte as incidente_numero,
    uc.nombre_completo as creado_por_nombre,
    ua.nombre_completo as actualizado_por_nombre,
    ep.titulo as evento_titulo,
    ep.tipo as evento_tipo,
    cts.nombre as subtipo_nombre,
    cts.icono as subtipo_icono,
    ccs.nombre as categoria_nombre,
    ccs.codigo as categoria_codigo,
    ccs.icono as categoria_icono,
    
    (SELECT json_agg(json_build_object(
        'id', det.id,
        'tipo_detalle', det.tipo_detalle,
        'datos', det.datos,
        'created_at', det.created_at
    ) ORDER BY det.created_at)
    FROM detalle_situacion det
    WHERE det.situacion_id = s.id) AS detalles
FROM situacion s
LEFT JOIN unidad u ON s.unidad_id = u.id
LEFT JOIN ruta r ON s.ruta_id = r.id
LEFT JOIN departamento d ON s.departamento_id = d.id
LEFT JOIN municipio m ON s.municipio_id = m.id
LEFT JOIN turno t ON s.turno_id = t.id
LEFT JOIN incidente i ON s.incidente_id = i.id
LEFT JOIN usuario uc ON s.creado_por = uc.id
LEFT JOIN usuario ua ON s.actualizado_por = ua.id
LEFT JOIN evento_persistente ep ON s.evento_persistente_id = ep.id
LEFT JOIN catalogo_tipo_situacion cts ON s.tipo_situacion_id = cts.id
LEFT JOIN catalogo_categoria_situacion ccs ON cts.categoria_id = ccs.id
ORDER BY s.created_at DESC;

COMMENT ON VIEW v_situaciones_completas IS 'Vista completa de situaciones con todos los datos relacionados, incluyendo nuevos campos (clima, carga, jurisdiccion)';

-- Recrear bitacora
CREATE OR REPLACE VIEW v_bitacora_unidad AS
SELECT
    s.id,
    s.uuid,
    s.numero_situacion,
    s.unidad_id,
    s.unidad_codigo,
    s.tipo_situacion,
    s.estado,
    s.salida_unidad_id,
    s.ruta_codigo,
    s.km,
    s.sentido,
    s.latitud,
    s.longitud,
    s.descripcion,
    s.observaciones,
    s.evento_titulo,
    s.created_at AS fecha_hora,
    s.creado_por_nombre AS reportado_por,
    s.turno_fecha,
    -- Nuevos campos en bitacora
    s.clima,
    s.carga_vehicular,
    s.departamento_nombre,
    s.municipio_nombre,

    CASE
        WHEN s.estado = 'CERRADA' THEN
            EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 60
        ELSE NULL
    END AS duracion_minutos,
    CASE WHEN s.detalles IS NOT NULL THEN TRUE ELSE FALSE END AS tiene_detalles,
    (
        SELECT json_object_agg(tipo_detalle, cantidad)
        FROM (
            SELECT
                d.tipo_detalle,
                COUNT(*) AS cantidad
            FROM detalle_situacion d
            WHERE d.situacion_id = s.id
            GROUP BY d.tipo_detalle
        ) AS detalles_count
    ) AS resumen_detalles,
    s.subtipo_nombre,
    s.categoria_codigo
FROM v_situaciones_completas s
JOIN unidad u ON s.unidad_id = u.id
ORDER BY s.unidad_id, s.created_at DESC;

COMMENT ON VIEW v_bitacora_unidad IS 'Bitácora extendida con campos de clima y jurisdicción';

-- Actualizar v_ultima_situacion_unidad
CREATE OR REPLACE VIEW v_ultima_situacion_unidad AS
WITH ultima_situacion_por_salida AS (
  SELECT DISTINCT ON (salida_unidad_id)
    id,
    uuid,
    tipo_situacion,
    estado,
    ruta_id,
    km,
    sentido,
    latitud,
    longitud,
    combustible,
    combustible_fraccion,
    kilometraje_unidad,
    descripcion,
    created_at,
    turno_id,
    salida_unidad_id,
    -- Nuevos
    clima,
    carga_vehicular,
    departamento_id,
    municipio_id
  FROM situacion
  WHERE salida_unidad_id IS NOT NULL
  ORDER BY salida_unidad_id, created_at DESC
)
SELECT
  sal.unidad_id,
  u.codigo AS unidad_codigo,
  u.tipo_unidad,
  
  -- Información de la situación
  s.id AS situacion_id,
  s.uuid AS situacion_uuid,
  s.tipo_situacion,
  s.estado,
  s.ruta_id,
  r.codigo AS ruta_codigo,
  r.nombre AS ruta_nombre,
  s.km,
  s.sentido,
  s.latitud,
  s.longitud,
  s.combustible,
  s.combustible_fraccion,
  s.kilometraje_unidad,
  s.descripcion,
  s.created_at AS situacion_fecha,
  s.turno_id,
  t.fecha AS turno_fecha,
  -- Nuevos
  s.clima,
  s.carga_vehicular,
  d.nombre as departamento_nombre,
  m.nombre as municipio_nombre,
  
  -- Información de la salida
  sal.id AS salida_id,
  sal.estado AS salida_estado,
  sal.fecha_hora_salida

FROM salida_unidad sal
JOIN unidad u ON sal.unidad_id = u.id
LEFT JOIN ultima_situacion_por_salida s ON s.salida_unidad_id = sal.id
LEFT JOIN ruta r ON s.ruta_id = r.id
LEFT JOIN turno t ON s.turno_id = t.id
LEFT JOIN departamento d ON s.departamento_id = d.id
LEFT JOIN municipio m ON s.municipio_id = m.id

WHERE sal.estado = 'EN_SALIDA'

ORDER BY u.codigo;

COMMIT;
