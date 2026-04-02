const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:ifbdslrLVlNfacUAHUHirdDQKOODrSuT@maglev.proxy.rlwy.net:31911/railway'
});

const sql = \
ALTER TABLE situacion 
ALTER COLUMN observaciones TYPE JSONB 
USING COALESCE(
  CASE 
    WHEN observaciones IS NULL OR btrim(observaciones) = '' THEN '[]'::jsonb
    ELSE jsonb_build_array(
      jsonb_build_object(
        'hora', to_char(created_at, 'HH24:MI'),
        'usuario', 'SISTEMA (E. Legado)',
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
        'usuario', 'SISTEMA (E. Legado)',
        'mensaje', observaciones
      )
    )
  END, 
  '[]'::jsonb
);
ALTER TABLE actividad ALTER COLUMN observaciones SET DEFAULT '[]'::jsonb;
\;

async function run() {
    try {
        await client.connect();
        await client.query(sql);
        console.log('Migracion jsonb completada en bd remota.');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}
run();
