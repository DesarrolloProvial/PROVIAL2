import pgPromise from 'pg-promise';
// @ts-ignore
import { Pool } from 'pg';
import { config } from './env';

// Inicializar pg-promise
const pgp = pgPromise({
  // Opciones de configuración
  capSQL: true, // Generar SQL capitalizado
});

// Configuración de conexión
// Si DATABASE_URL está disponible (Railway), usarla directamente
// Si no, usar parámetros individuales (desarrollo local)
const connectionConfig = config.db.url
  ? config.db.url  // Railway: usa DATABASE_URL
  : {              // Local: usa parámetros individuales
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

// Crear instancia de base de datos (pg-promise)
export const db = pgp(connectionConfig);

// Pool de pg nativo para controladores que usan pool.connect()
const pool = new Pool(
  config.db.url
    ? { connectionString: config.db.url, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 }
    : {
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
);

export default pool;

// Test de conexión
export async function testConnection(): Promise<boolean> {
  try {
    await db.one('SELECT 1 as test');
    console.log('✅ Conexión a PostgreSQL exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error);
    return false;
  }
}

// Cerrar conexión (para shutdown graceful)
export async function closeConnection(): Promise<void> {
  await pgp.end();
  console.log('🔌 Conexión a PostgreSQL cerrada');
}
