-- Migración 120: Crear rol TRANSPORTES y usuario de prueba
-- Fecha: 2026-03-02

-- 1. Crear rol TRANSPORTES si no existe
INSERT INTO rol (nombre, descripcion, permisos)
VALUES (
  'TRANSPORTES',
  'Departamento de Transportes - Control de flota, combustible e inspecciones 360',
  '{"unidades": ["create","read","update","deactivate","transfer"], "combustible": ["read","write"], "inspecciones360": ["read","update","approve"]}'
)
ON CONFLICT (nombre) DO NOTHING;

-- 2. Crear usuario de prueba para TRANSPORTES
-- Username: transportes01  |  Password: transportes123
INSERT INTO usuario (
  username,
  password_hash,
  nombre_completo,
  rol_id,
  sede_id,
  activo
)
SELECT
  'transportes01',
  '$2a$10$hA8bn26Xsp/Pg3bE5a.8guBfTds0QUqzn3Mq2AC63Asuw8hBOQnbm',
  'Transportes Sede Central',
  (SELECT id FROM rol WHERE nombre = 'TRANSPORTES'),
  (SELECT id FROM sede ORDER BY id LIMIT 1),  -- primera sede disponible
  true
WHERE NOT EXISTS (
  SELECT 1 FROM usuario WHERE username = 'transportes01'
);

-- Confirmación
SELECT
  u.username,
  u.nombre_completo,
  r.nombre AS rol,
  s.nombre AS sede,
  u.activo
FROM usuario u
JOIN rol r ON u.rol_id = r.id
LEFT JOIN sede s ON u.sede_id = s.id
WHERE u.username = 'transportes01';
