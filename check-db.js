const { Client } = require('pg');

async function checkDatabases() {
  // Probar conexión a provial_db
  const client1 = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres',
    connectionTimeoutMillis: 5000
  });

  try {
    await client1.connect();
    console.log('Conectado a PostgreSQL en puerto 5432');

    const result = await client1.query("SELECT datname FROM pg_database WHERE datistemplate = false;");
    console.log('Bases de datos disponibles:');
    result.rows.forEach(row => console.log('  -', row.datname));

    await client1.end();
  } catch (error) {
    console.error('Error en puerto 5432:', error.message);
  }

  // Probar en puerto 5433
  const client2 = new Client({
    host: '127.0.0.1',
    port: 5433,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres',
    connectionTimeoutMillis: 5000
  });

  try {
    await client2.connect();
    console.log('\nConectado a PostgreSQL en puerto 5433');

    const result = await client2.query("SELECT datname FROM pg_database WHERE datistemplate = false;");
    console.log('Bases de datos disponibles:');
    result.rows.forEach(row => console.log('  -', row.datname));

    await client2.end();
  } catch (error) {
    console.error('Error en puerto 5433:', error.message);
  }
}

checkDatabases();
