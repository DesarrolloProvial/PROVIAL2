const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:ifbdslrLVlNfacUAHUHirdDQKOODrSuT@maglev.proxy.rlwy.net:31911/railway'
});

async function run() {
    try {
        await client.connect();
        const query = `
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name IN ('salida_unidad', 'situacion', 'actividad', 'salida_evento', 'situacion_vehiculo', 'autoridad', 'vehiculo_grua', 'vehiculo_aseguradora')
            ORDER BY table_name, ordinal_position;
        `;
        const res = await client.query(query);
        
        let currentTable = '';
        for (const row of res.rows) {
            if (currentTable !== row.table_name) {
                currentTable = row.table_name;
                console.log('\n--- Tabla: ' + currentTable + ' ---');
            }
            console.log(`  ${row.column_name}: ${row.data_type}`);
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}
run();
