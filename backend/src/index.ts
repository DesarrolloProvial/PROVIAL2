import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config/env';
import { /* db, */ testConnection, closeConnection } from './config/database';
import { /* redis, */ testRedisConnection, closeRedis } from './config/redis';
import routes from './routes';
import { initSocketService, getConnectionStats } from './services/socket.service';

// Crear app Express
const app = express();
const server = http.createServer(app);

// Inicializar Socket.io con el servicio
const io = initSocketService(server);

// Middlewares globales
app.use(helmet());
app.use(cors({
  origin: '*', // Permitir todas las conexiones
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false, // Debe ser false cuando origin es '*'
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Debug Middleware: Log all requests
app.use((req, _res, next) => {
  console.log(`🔍 [REQUEST] ${req.method} ${req.url}`);
  next();
});

// Health check - Basic (always returns 200)
app.get('/health', async (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Health check - Detailed (checks services)
app.get('/api/health', async (_req, res) => {
  const dbConnected = await testConnection();
  const redisConnected = await testRedisConnection();

  // Return 200 even if Redis is down (it's optional)
  const status = dbConnected ? 'healthy' : 'unhealthy';
  const statusCode = dbConnected ? 200 : 503;

  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: dbConnected ? 'up' : 'down',
      redis: redisConnected ? 'up' : 'down (optional)',
    },
  });
});

// Ruta de prueba
app.get(config.apiPrefix, (_req, res) => {
  res.json({
    message: 'API Provial funcionando',
    version: '1.0.0',
    environment: config.env,
  });
});

// Servir archivos estáticos de uploads (multimedia)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rutas de la API
app.use(config.apiPrefix, routes);

// Endpoint para estadísticas de WebSocket
app.get('/api/socket/stats', async (_req, res) => {
  const stats = await getConnectionStats();
  res.json(stats || { error: 'Socket service not available' });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: _req.path,
  });
});

// Error handler global
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    ...(config.env === 'development' && { stack: err.stack }),
  });
});

// Iniciar servidor
async function start() {
  try {
    // Test de conexiones
    const dbOk = await testConnection();
    const redisOk = await testRedisConnection();

    if (!dbOk) {
      throw new Error('No se pudo conectar a PostgreSQL');
    }

    if (!redisOk) {
      console.warn('⚠️  Redis no disponible, continuando sin cache');
    }

    // Iniciar servidor
    server.listen(config.port, '0.0.0.0', () => {
      console.log('');
      console.log('🚀 ========================================');
      console.log(`🚀  Servidor iniciado en puerto ${config.port}`);
      console.log(`🚀  Ambiente: ${config.env}`);
      console.log(`🚀  API: http://localhost:${config.port}${config.apiPrefix}`);
      console.log(`🚀  Health: http://localhost:${config.port}/api/health`);
      console.log('🚀 ========================================');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Shutdown graceful
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM recibido, cerrando servidor...');
  server.close(async () => {
    await closeConnection();
    await closeRedis();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT recibido, cerrando servidor...');
  server.close(async () => {
    await closeConnection();
    await closeRedis();
    process.exit(0);
  });
});

// Iniciar
start();

// Exportar para testing
export { app, io };
