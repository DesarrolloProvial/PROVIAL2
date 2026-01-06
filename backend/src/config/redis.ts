import Redis from 'ioredis';
import { config } from './env';

// Crear cliente Redis
// Si REDIS_URL está disponible (Railway), usarla directamente
// Si no, usar parámetros individuales (desarrollo local)
export const redis = config.redis.url
  ? new Redis(config.redis.url, {
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  })
  : new Redis({
    host: config.redis.host,
    port: config.redis.port,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

// Event handlers
redis.on('connect', () => {
  console.log('✅ Conexión a Redis establecida');
});

redis.on('error', (err) => {
  console.error('❌ Error en Redis:', err);
});

redis.on('ready', () => {
  console.log('✅ Redis listo para recibir comandos');
});

// Test de conexión
export async function testRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('❌ Redis no está disponible:', error);
    return false;
  }
}

// Cerrar conexión
export async function closeRedis(): Promise<void> {
  await redis.quit();
  console.log('🔌 Conexión a Redis cerrada');
}

// Utilidades de caché
export const cache = {
  // Guardar en cache con TTL
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, serialized);
    } else {
      await redis.set(key, serialized);
    }
  },

  // Obtener de cache
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  },

  // Eliminar de cache
  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  // Invalidar patrón
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
};
