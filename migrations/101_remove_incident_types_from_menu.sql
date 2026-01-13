-- 101_remove_incident_types_from_menu.sql
-- Desactivar Accidente/Asistencia/Emergencia del menú de Nueva Situación
-- porque se reportan desde la pantalla dedicada de Incidentes

BEGIN;

-- Usar los nombres EXACTOS de la migración 098
UPDATE catalogo_tipo_situacion SET activo = false 
WHERE nombre IN (
    'Accidente de Tránsito',
    'Asistencia Vial',
    'Emergencia / Obstáculo'
);

COMMIT;
