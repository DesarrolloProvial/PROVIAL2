-- Migración 120: Crear rol TRANSPORTES y usuario de prueba
-- Fecha: 2026-03-02
-- Usar WHERE NOT EXISTS en lugar de ON CONFLICT para evitar dependencia de constraints únicos

-- 1. Crear rol TRANSPORTES (si no existe)
INSERT INTO rol (nombre, descripcion, permisos)
SELECT
  'TRANSPORTES',
  'Departamento de Transportes - Control de flota, combustible e inspecciones 360',
  '{"unidades": ["create","read","update","deactivate","transfer"], "combustible": ["read","write"], "inspecciones360": ["read","update","approve"]}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM rol WHERE nombre = 'TRANSPORTES'
);

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
  (SELECT id FROM sede ORDER BY id LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM usuario WHERE username = 'transportes01'
);

-- 3. Verificar resultado
SELECT
  u.id,
  u.username,
  u.nombre_completo,
  r.nombre AS rol,
  s.nombre AS sede,
  u.activo
FROM usuario u
JOIN rol r ON u.rol_id = r.id
LEFT JOIN sede s ON u.sede_id = s.id
WHERE r.nombre = 'TRANSPORTES';
