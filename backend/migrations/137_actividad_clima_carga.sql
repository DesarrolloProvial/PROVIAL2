-- Migration 137: Agregar clima y carga_vehicular a tabla actividad
-- Necesario para patrullaje, toma de velocidad, paradas

ALTER TABLE actividad
  ADD COLUMN IF NOT EXISTS clima          VARCHAR(50),
  ADD COLUMN IF NOT EXISTS carga_vehicular VARCHAR(50);
