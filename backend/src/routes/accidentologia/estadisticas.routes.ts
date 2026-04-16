import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import EstadisticasController from '../controllers/estadisticas.controller';

const router = Router();

router.use(authenticate);

// Obtener todas las estadisticas en una sola llamada
router.get('/', EstadisticasController.obtenerTodo);

// Detalle: lista de situaciones filtradas por dimensión (click en gráfica)
router.get('/detalle', EstadisticasController.obtenerDetalle);

export default router;
