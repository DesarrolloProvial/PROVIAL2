-- ================================================
-- Migración 051: Fix encoding names
-- Fecha: 2025-12-11
-- Descripción: Corregir nombres de departamentos y municipios
--              que tienen '??' o caracteres corruptos.
-- ================================================

-- Corregir Departamentos
UPDATE departamento SET nombre = 'Totonicapán' WHERE nombre LIKE 'Totonicap%n';
UPDATE departamento SET nombre = 'Petén' WHERE nombre LIKE 'Pet%n';
UPDATE departamento SET nombre = 'Quiché' WHERE nombre LIKE 'Quich%';
UPDATE departamento SET nombre = 'Suchitepéquez' WHERE nombre LIKE 'Suchitep%quez';
UPDATE departamento SET nombre = 'Sacatepéquez' WHERE nombre LIKE 'Sacatep%quez';
UPDATE departamento SET nombre = 'Sololá' WHERE nombre LIKE 'Solol%';


-- Corregir Municipios (lista común)
UPDATE municipio SET nombre = 'San José' WHERE nombre LIKE 'San Jos%';
UPDATE municipio SET nombre = 'San Andrés' WHERE nombre LIKE 'San Andr%';
UPDATE municipio SET nombre = 'San Martín' WHERE nombre LIKE 'San Mart%n';
UPDATE municipio SET nombre = 'Asunción' WHERE nombre LIKE 'Asunci%';
UPDATE municipio SET nombre = 'Concepción' WHERE nombre LIKE 'Concepci%';
UPDATE municipio SET nombre = 'Río Bravo' WHERE nombre LIKE 'R% Bravo';
UPDATE municipio SET nombre = 'Génova' WHERE nombre LIKE 'G%nova';
UPDATE municipio SET nombre = 'Almolonga' WHERE nombre LIKE 'Almolonga';
UPDATE municipio SET nombre = 'Zunil' WHERE nombre LIKE 'Zunil';
UPDATE municipio SET nombre = 'San Cristóbal' WHERE nombre LIKE 'San Crist%bal';
UPDATE municipio SET nombre = 'San Sebastián' WHERE nombre LIKE 'San Sebasti%n';

-- Add more specific ones as found
