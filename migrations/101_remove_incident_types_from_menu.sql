-- 101_remove_incident_types_from_menu.sql
-- Desactivar Accidente/Asistencia/Emergencia del menú de Nueva Situación
-- porque se reportan desde la pantalla dedicada de Incidentes

BEGIN;

UPDATE catalogo_tipo_situacion SET activo = false 
WHERE nombre IN (
    'Accidente de Tránsito',
    'Accidente',
    'Asistencia Vial',
    'Asistencia vial',
    'Asistencia Vehicular',
    'Emergencia / Obstáculo',
    'Emergencia',
    'Obstáculo'
);

COMMIT;
