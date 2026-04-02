const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
    connectionString: 'postgresql://postgres:ifbdslrLVlNfacUAHUHirdDQKOODrSuT@maglev.proxy.rlwy.net:31911/railway'
});

const sql = `
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
`;

async function run() {
    try {
        await client.connect();
        await client.query(sql);
        console.log('Migración JSONB completada en Railway.');
        fs.writeFileSync('backend/migrations/131_observaciones_jsonb.sql', sql);
        console.log('Archivo de migración guardado localmente.');
    } catch (e) {
        console.error('Error aplicando migración:', e);
    } finally {
        await client.end();
    }
}
run();
