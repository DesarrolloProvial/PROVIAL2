-- =====================================================
-- SISTEMA DE COLUMNAS DINAMICAS PARA TABLAS
-- =====================================================
-- Permite configurar las columnas visibles por sede/usuario
-- para las tablas de brigadas y unidades

-- Crear tabla de configuracion de columnas por sede
CREATE TABLE IF NOT EXISTS configuracion_columnas_tabla (
    id SERIAL PRIMARY KEY,
    sede_id INTEGER REFERENCES sede(id) ON DELETE CASCADE,
    tabla_nombre VARCHAR(50) NOT NULL,
    columnas_visibles JSONB NOT NULL DEFAULT '[]'::jsonb,
    orden_columnas TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    creado_por INTEGER REFERENCES usuario(id),
    UNIQUE(sede_id, tabla_nombre)
);

-- Indice para busquedas rapidas
CREATE INDEX IF NOT EXISTS idx_config_columnas_sede_tabla ON configuracion_columnas_tabla(sede_id, tabla_nombre);

-- Insertar configuraciones por defecto para todas las sedes existentes
INSERT INTO configuracion_columnas_tabla (sede_id, tabla_nombre, columnas_visibles, orden_columnas)
SELECT
    s.id,
    'brigadas',
    '["chapa", "nombre", "rol_brigada", "grupo", "sede", "telefono", "estado"]'::jsonb,
    ARRAY['chapa', 'nombre', 'rol_brigada', 'grupo', 'sede', 'telefono', 'estado']
FROM sede s
WHERE NOT EXISTS (
    SELECT 1 FROM configuracion_columnas_tabla
    WHERE sede_id = s.id AND tabla_nombre = 'brigadas'
)
ON CONFLICT (sede_id, tabla_nombre) DO NOTHING;

INSERT INTO configuracion_columnas_tabla (sede_id, tabla_nombre, columnas_visibles, orden_columnas)
SELECT
    s.id,
    'unidades',
    '["codigo", "tipo_unidad", "marca", "modelo", "placa", "sede", "estado"]'::jsonb,
    ARRAY['codigo', 'tipo_unidad', 'marca', 'modelo', 'placa', 'sede', 'estado']
FROM sede s
WHERE NOT EXISTS (
    SELECT 1 FROM configuracion_columnas_tabla
    WHERE sede_id = s.id AND tabla_nombre = 'unidades'
)
ON CONFLICT (sede_id, tabla_nombre) DO NOTHING;

-- Configuracion global (NULL sede_id = aplicable a todas las sedes)
INSERT INTO configuracion_columnas_tabla (sede_id, tabla_nombre, columnas_visibles, orden_columnas)
VALUES (
    NULL,
    'brigadas',
    '["chapa", "nombre", "rol_brigada", "grupo", "sede", "telefono", "estado"]'::jsonb,
    ARRAY['chapa', 'nombre', 'rol_brigada', 'grupo', 'sede', 'telefono', 'estado']
),
(
    NULL,
    'unidades',
    '["codigo", "tipo_unidad", "marca", "modelo", "placa", "sede", "estado"]'::jsonb,
    ARRAY['codigo', 'tipo_unidad', 'marca', 'modelo', 'placa', 'sede', 'estado']
)
ON CONFLICT (sede_id, tabla_nombre) DO NOTHING;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_config_columnas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_config_columnas_updated_at ON configuracion_columnas_tabla;
CREATE TRIGGER trg_config_columnas_updated_at
    BEFORE UPDATE ON configuracion_columnas_tabla
    FOR EACH ROW EXECUTE FUNCTION update_config_columnas_updated_at();

-- Definicion de columnas disponibles para cada tabla (referencia)
COMMENT ON TABLE configuracion_columnas_tabla IS
'Configuracion de columnas visibles por sede para tablas de brigadas y unidades.

COLUMNAS DISPONIBLES BRIGADAS:
- chapa: Numero de identificacion
- nombre: Nombre completo
- rol_brigada: Rol (PILOTO, COPILOTO, ACOMPANANTE)
- grupo: Grupo de trabajo (0, 1, 2)
- sede: Sede asignada
- telefono: Numero de telefono
- email: Correo electronico
- estado: Activo/Inactivo
- created_at: Fecha de creacion
- ultimo_acceso: Ultimo acceso al sistema

COLUMNAS DISPONIBLES UNIDADES:
- codigo: Codigo de la unidad
- tipo_unidad: Tipo (MOTORIZADA, PICKUP, etc.)
- marca: Marca del vehiculo
- modelo: Modelo del vehiculo
- anio: Anio del vehiculo
- placa: Numero de placa
- sede: Sede asignada
- estado: Activo/Inactivo
- created_at: Fecha de creacion
';
