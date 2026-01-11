-- Actualización de plantilla 360: Remover item duplicado "Sin daños"
-- El DANOS_LISTA ya tiene integrado su propio checkbox "Sin daños"
-- Fecha: 2026-01-11

-- Actualizar la plantilla para quitar RD001 (CHECKBOX_BLOQUEO)
UPDATE plantilla_inspeccion_360
SET secciones = jsonb_set(
    secciones,
    '{3,items}',
    '[
        {"codigo": "RD002", "descripcion": "Lista de daños", "tipo": "DANOS_LISTA", "requerido": false,
         "config": {
            "ubicaciones": ["Derecho", "Izquierdo", "Frente", "Atrás", "Arriba", "Abajo"],
            "clasificaciones": ["Golpe", "Rayón", "Pieza rota", "Falta algo"],
            "max_fotos": 3
         }
        }
    ]'::jsonb
)
WHERE tipo_unidad = 'DEFAULT' AND activa = true;

-- Verificar
SELECT id, tipo_unidad, secciones->3 as seccion_danos FROM plantilla_inspeccion_360 WHERE activa = true;
