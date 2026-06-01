
ALTER TABLE situacion 
ALTER COLUMN observaciones TYPE JSONB 
USING COALESCE(
  CASE 
    WHEN observaciones IS NULL OR btrim(observaciones) = '' THEN '[]'::jsonb
    ELSE jsonb_build_array(
      jsonb_build_object(
        'hora', to_char(created_at, 'HH24:MI'),
        'usuario', 'SISTEMA',
        'mensaje', observaciones
      )
    )
  END, 
  '[]'::jsonb
);
ALTER TABLE situacion ALTER COLUMN observaciones SET DEFAULT '[]'::jsonb;

ALTER TABLE actividad 
ALTER COLUMN observaciones TYPE JSONB 
USING COALESCE(
  CASE 
    WHEN observaciones IS NULL OR btrim(observaciones) = '' THEN '[]'::jsonb
    ELSE jsonb_build_array(
      jsonb_build_object(
        'hora', to_char(created_at, 'HH24:MI'),
        'usuario', 'SISTEMA',
        'mensaje', observaciones
      )
    )
  END, 
  '[]'::jsonb
);
ALTER TABLE actividad ALTER COLUMN observaciones SET DEFAULT '[]'::jsonb;
