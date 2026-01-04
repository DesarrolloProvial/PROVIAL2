const { Client } = require('pg');

async function test() {
  console.log('Probando conexión IPv6...');

  const client = new Client({
    host: '::1',
    port: 5432,
    database: 'provabordo',
    user: 'postgres',
    password: 'postgres',
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log('✅ Conexión exitosa a ::1:5432/provabordo');

    const res = await client.query('SELECT current_database(), current_user');
    console.log('Database:', res.rows[0].current_database);
    console.log('User:', res.rows[0].current_user);

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
