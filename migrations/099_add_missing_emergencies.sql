-- 099_add_missing_emergencies.sql
BEGIN;

INSERT INTO tipo_emergencia_vial (codigo, nombre, activo, icono) VALUES
('MANIFESTACION', 'Manifestación', true, 'account-group'),
('BLOQUEO', 'Bloqueo de ruta', true, 'road-variant'),
('INCENDIO_FORESTAL', 'Incendio forestal', true, 'fire')
ON CONFLICT (codigo) DO UPDATE SET activo = true;

COMMIT;
