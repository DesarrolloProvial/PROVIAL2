-- Migración 130: Estado de fuerza oficial de unidades
-- Sedes: 1=Central, 2=Mazatenango, 3=Poptún, 4=San Cristóbal,
--        5=Quetzaltenango, 6=Coatepeque, 7=Palín Escuintla, 8=Morales, 9=Río Dulce

INSERT INTO unidad (codigo, tipo_unidad, marca, sede_id, tipo_combustible, activa)
VALUES
  -- SEDE CENTRAL (1) — Sedan sin marca
  ('1104',     'SEDAN',     NULL,     1, 'GASOLINA', true),
  ('1106',     'SEDAN',     NULL,     1, 'GASOLINA', true),
  ('1110',     'SEDAN',     NULL,     1, 'GASOLINA', true),
  -- SEDE CENTRAL (1) — Pick-up Toyota
  ('005',      'PICKUP',    'Toyota', 1, 'DIESEL',   true),
  ('007',      'PICKUP',    'Toyota', 1, 'DIESEL',   true),
  ('009',      'PICKUP',    'Toyota', 1, 'DIESEL',   true),
  ('019',      'PICKUP',    'Toyota', 1, 'DIESEL',   true),
  ('023',      'PICKUP',    'Toyota', 1, 'DIESEL',   true),
  ('024',      'PICKUP',    'Toyota', 1, 'DIESEL',   true),
  ('025',      'PICKUP',    'Toyota', 1, 'DIESEL',   true),
  ('026',      'PICKUP',    'Toyota', 1, 'DIESEL',   true),
  ('027',      'PICKUP',    'Toyota', 1, 'DIESEL',   true),
  ('1121',     'PICKUP',    'Toyota', 1, 'DIESEL',   true),
  ('1131',     'PICKUP',    'Toyota', 1, 'DIESEL',   true),
  ('1139',     'PICKUP',    'Toyota', 1, 'DIESEL',   true),
  -- SEDE CENTRAL (1) — Pick-up Isuzu
  ('036',      'PICKUP',    'Isuzu',  1, 'DIESEL',   true),
  ('037',      'PICKUP',    'Isuzu',  1, 'DIESEL',   true),
  ('038',      'PICKUP',    'Isuzu',  1, 'DIESEL',   true),
  ('039',      'PICKUP',    'Isuzu',  1, 'DIESEL',   true),
  ('040',      'PICKUP',    'Isuzu',  1, 'DIESEL',   true),
  ('041',      'PICKUP',    'Isuzu',  1, 'DIESEL',   true),
  ('042',      'PICKUP',    'Isuzu',  1, 'DIESEL',   true),
  ('043',      'PICKUP',    'Isuzu',  1, 'DIESEL',   true),
  ('044',      'PICKUP',    'Isuzu',  1, 'DIESEL',   true),
  ('045',      'PICKUP',    'Isuzu',  1, 'DIESEL',   true),
  -- SEDE CENTRAL (1) — Microbus
  ('1170',     'MICROBUS',  NULL,     1, 'DIESEL',   true),
  -- SEDE CENTRAL (1) — Grúa
  ('1171',     'GRUA',      NULL,     1, 'DIESEL',   true),
  ('1173',     'GRUA',      NULL,     1, 'DIESEL',   true),
  -- SEDE CENTRAL (1) — Pick-up placa=codigo
  ('O722BBZ',  'PICKUP',    NULL,     1, 'DIESEL',   true),
  ('O706BBH',  'PICKUP',    NULL,     1, 'DIESEL',   true),
  ('O708BBH',  'PICKUP',    NULL,     1, 'DIESEL',   true),
  ('O622BCB',  'PICKUP',    NULL,     1, 'DIESEL',   true),
  ('P885DBY',  'PICKUP',    NULL,     1, 'DIESEL',   true),
  ('P305GNR',  'PICKUP',    NULL,     1, 'DIESEL',   true),
  ('P931BHR',  'PICKUP',    NULL,     1, 'DIESEL',   true),
  -- SEDE CENTRAL (1) — Motorizadas
  ('M007',     'MOTORIZADA',NULL,     1, 'GASOLINA', true),
  ('M016',     'MOTORIZADA',NULL,     1, 'GASOLINA', true),
  ('M017',     'MOTORIZADA',NULL,     1, 'GASOLINA', true),
  ('M018',     'MOTORIZADA',NULL,     1, 'GASOLINA', true),
  ('M019',     'MOTORIZADA',NULL,     1, 'GASOLINA', true),
  ('M020',     'MOTORIZADA',NULL,     1, 'GASOLINA', true),
  ('M021',     'MOTORIZADA',NULL,     1, 'GASOLINA', true),
  ('M022',     'MOTORIZADA',NULL,     1, 'GASOLINA', true),
  ('M023',     'MOTORIZADA',NULL,     1, 'GASOLINA', true),
  ('M024',     'MOTORIZADA',NULL,     1, 'GASOLINA', true),
  -- SEDE SAN CRISTÓBAL (4) — Pick-up Toyota
  ('006',      'PICKUP',    'Toyota', 4, 'DIESEL',   true),
  ('017',      'PICKUP',    'Toyota', 4, 'DIESEL',   true),
  ('1117',     'PICKUP',    'Toyota', 4, 'DIESEL',   true),
  ('1133',     'PICKUP',    'Toyota', 4, 'DIESEL',   true),
  ('1134',     'PICKUP',    'Toyota', 4, 'DIESEL',   true),
  -- SEDE SAN CRISTÓBAL (4) — Pick-up Isuzu
  ('033',      'PICKUP',    'Isuzu',  4, 'DIESEL',   true),
  ('034',      'PICKUP',    'Isuzu',  4, 'DIESEL',   true),
  -- SEDE SAN CRISTÓBAL (4) — Motorizadas
  ('M010',     'MOTORIZADA',NULL,     4, 'GASOLINA', true),
  ('M011',     'MOTORIZADA',NULL,     4, 'GASOLINA', true),
  -- SEDE SAN CRISTÓBAL (4) — Grúa
  ('1174',     'GRUA',      NULL,     4, 'DIESEL',   true),
  -- SEDE POPTÚN (3) — Pick-up Toyota
  ('008',      'PICKUP',    'Toyota', 3, 'DIESEL',   true),
  ('014',      'PICKUP',    'Toyota', 3, 'DIESEL',   true),
  -- SEDE QUETZALTENANGO (5) — Sedan
  ('1105',     'SEDAN',     NULL,     5, 'GASOLINA', true),
  -- SEDE QUETZALTENANGO (5) — Pick-up Toyota
  ('018',      'PICKUP',    'Toyota', 5, 'DIESEL',   true),
  ('022',      'PICKUP',    'Toyota', 5, 'DIESEL',   true),
  ('1135',     'PICKUP',    'Toyota', 5, 'DIESEL',   true),
  -- SEDE QUETZALTENANGO (5) — Pick-up Isuzu
  ('030',      'PICKUP',    'Isuzu',  5, 'DIESEL',   true),
  -- SEDE MAZATENANGO (2) — Pick-up Toyota
  ('002',      'PICKUP',    'Toyota', 2, 'DIESEL',   true),
  ('010',      'PICKUP',    'Toyota', 2, 'DIESEL',   true),
  -- SEDE MAZATENANGO (2) — Pick-up Isuzu
  ('028',      'PICKUP',    'Isuzu',  2, 'DIESEL',   true),
  -- SEDE MAZATENANGO (2) — Motorizadas
  ('M014',     'MOTORIZADA',NULL,     2, 'GASOLINA', true),
  ('M015',     'MOTORIZADA',NULL,     2, 'GASOLINA', true),
  -- SEDE COATEPEQUE (6) — Pick-up Toyota
  ('012',      'PICKUP',    'Toyota', 6, 'DIESEL',   true),
  ('021',      'PICKUP',    'Toyota', 6, 'DIESEL',   true),
  ('1132',     'PICKUP',    'Toyota', 6, 'DIESEL',   true),
  -- SEDE COATEPEQUE (6) — Grúa
  ('1175',     'GRUA',      NULL,     6, 'DIESEL',   true),
  -- SEDE PALÍN ESCUINTLA (7) — Pick-up Toyota
  ('016',      'PICKUP',    'Toyota', 7, 'DIESEL',   true),
  ('1125',     'PICKUP',    'Toyota', 7, 'DIESEL',   true),
  ('1137',     'PICKUP',    'Toyota', 7, 'DIESEL',   true),
  -- SEDE PALÍN ESCUINTLA (7) — Pick-up Isuzu
  ('031',      'PICKUP',    'Isuzu',  7, 'DIESEL',   true),
  ('032',      'PICKUP',    'Isuzu',  7, 'DIESEL',   true),
  -- SEDE PALÍN ESCUINTLA (7) — Motorizadas
  ('M008',     'MOTORIZADA',NULL,     7, 'GASOLINA', true),
  ('M009',     'MOTORIZADA',NULL,     7, 'GASOLINA', true),
  -- SEDE PALÍN ESCUINTLA (7) — Grúa
  ('1172',     'GRUA',      NULL,     7, 'DIESEL',   true),
  -- SEDE MORALES (8) — Pick-up Toyota
  ('003',      'PICKUP',    'Toyota', 8, 'DIESEL',   true),
  ('011',      'PICKUP',    'Toyota', 8, 'DIESEL',   true),
  -- SEDE MORALES (8) — Pick-up Isuzu
  ('029',      'PICKUP',    'Isuzu',  8, 'DIESEL',   true),
  -- SEDE MORALES (8) — Motorizadas
  ('M012',     'MOTORIZADA',NULL,     8, 'GASOLINA', true),
  ('M013',     'MOTORIZADA',NULL,     8, 'GASOLINA', true),
  -- SEDE RÍO DULCE (9)
  ('015',      'PICKUP',    'Toyota', 9, 'DIESEL',   true),
  ('035',      'PICKUP',    'Isuzu',  9, 'DIESEL',   true),
  -- NO DISPONIBLES — nueva (sede Central)
  ('O849BBH',  'PICKUP',    NULL,     1, 'DIESEL',   false),
  -- EN PROCESO DE BAJA — nuevas
  ('1101',     'PICKUP',    'Toyota', 1, 'DIESEL',   false),
  ('1102',     'PICKUP',    'Toyota', 1, 'DIESEL',   false),
  ('1103',     'PICKUP',    'Toyota', 1, 'DIESEL',   false),
  ('O655BMJ',  'PICKUP',    NULL,     1, 'DIESEL',   false)
ON CONFLICT (codigo) DO UPDATE SET
  tipo_unidad      = EXCLUDED.tipo_unidad,
  marca            = EXCLUDED.marca,
  sede_id          = EXCLUDED.sede_id,
  activa           = EXCLUDED.activa,
  tipo_combustible = EXCLUDED.tipo_combustible,
  updated_at       = NOW();

-- Para pick-ups cuyo código ES la placa, actualizar columna placa
UPDATE unidad SET placa = codigo, updated_at = NOW()
WHERE codigo IN ('O722BBZ','O706BBH','O708BBH','O622BCB','P885DBY','P305GNR','P931BHR','O849BBH','O655BMJ');

-- Marcar no disponibles por problemas mecánicos como inactivas
UPDATE unidad SET activa = false, updated_at = NOW()
WHERE codigo IN ('M002','004','013','1115','1119','1126','1127','1138');

-- Marcar en proceso de baja como inactivas
UPDATE unidad SET activa = false, updated_at = NOW()
WHERE codigo IN ('1101','1102','1103','1107','1108','1109','1111','1112','1113','1114',
                 '1116','1118','1120','1122','1123','1124','1128','1129','1130','O655BMJ');
