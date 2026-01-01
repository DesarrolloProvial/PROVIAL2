import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import AlertasController from '../controllers/alertas.controller';

const router = Router();

// Todas las rutas requieren autenticacion
router.use(authenticate);

// Obtener tipos de alerta
router.get('/tipos', AlertasController.obtenerTipos);

// Obtener alertas activas (alias)
router.get('/activas', AlertasController.obtenerAlertas);

// Obtener mis alertas no leídas
router.get('/mis-alertas', AlertasController.obtenerMisAlertas);

// Contador de alertas no leídas
router.get('/contador', AlertasController.contarAlertas);

// Historial de alertas
router.get('/historial', AlertasController.obtenerHistorial);

// Configuración de alertas
router.get('/configuracion', AlertasController.obtenerConfiguracion);
router.put('/configuracion/:tipo', AlertasController.actualizarConfiguracion);

// Estadísticas de alertas
router.get('/estadisticas', AlertasController.obtenerEstadisticas);

// Ejecutar verificaciones automáticas (para cron o admin)
router.post('/verificar', AlertasController.ejecutarVerificaciones);

// Limpiar alertas expiradas
router.post('/limpiar', AlertasController.limpiarExpiradas);

// Obtener alertas activas
router.get('/', AlertasController.obtenerAlertas);

// Crear alerta personalizada
router.post('/', AlertasController.crearAlerta);

// Obtener alerta por ID
router.get('/:id', AlertasController.obtenerAlertaPorId);

// Acciones sobre alertas
router.post('/:id/leer', AlertasController.marcarComoLeida);
router.put('/:id/atender', AlertasController.atenderAlerta);
router.put('/:id/resolver', AlertasController.resolverAlerta);
router.put('/:id/ignorar', AlertasController.ignorarAlerta);

export default router;
