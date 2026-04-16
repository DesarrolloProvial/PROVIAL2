const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:ifbdslrLVlNfacUAHUHirdDQKOODrSuT@maglev.proxy.rlwy.net:31911/railway'
});

async function run() {
  try {
    await client.connect();
    
    // Buscar tablas que contengan map, capa, punto
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    const tables = res.rows.map(r => r.table_name);
    console.log('Todas las tablas:');
    console.log(tables.join(', '));
    
    console.log('\nTablas posiblemente relacionadas con mapas:');
    const mapTables = tables.filter(t => 
      t.includes('map') || t.includes('capa') || t.includes('punto') || t.includes('layer') || t.includes('ruta')
    );
    console.log(mapTables.join('\n'));

    for(let table of mapTables) {
         console.log(`\nColumnas de ${table}:`);
         const colRes = await client.query(`
             SELECT column_name, data_type 
             FROM information_schema.columns 
             WHERE table_name = '${table}'
             ORDER BY ordinal_position;
         `);
         console.log(colRes.rows.map(r => `  - ${r.column_name} (${r.data_type})`).join('\n'));
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
