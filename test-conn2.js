const { Client } = require('pg');

const hosts = [
  { host: 'localhost', port: 5432 },
  { host: '127.0.0.1', port: 5432 },
  { host: '::1', port: 5432 },
  { host: 'localhost', port: 5433 },
  { host: '127.0.0.1', port: 5433 },
  { host: 'host.docker.internal', port: 5432 },
];

const databases = ['provabordo', 'provial_db', 'postgres'];

async function testConnection(host, port, database) {
  const client = new Client({
    host,
    port,
    database,
    user: 'postgres',
    password: 'postgres',
    connectionTimeoutMillis: 3000
  });

  try {
    await client.connect();
    console.log(`✅ ${host}:${port}/${database} - CONECTADO`);
    await client.end();
    return true;
  } catch (error) {
    console.log(`❌ ${host}:${port}/${database} - ${error.message.split('\n')[0]}`);
    return false;
  }
}

async function main() {
  console.log('Probando conexiones a PostgreSQL...\n');

  for (const { host, port } of hosts) {
    for (const database of databases) {
      await testConnection(host, port, database);
    }
  }
}

main();
