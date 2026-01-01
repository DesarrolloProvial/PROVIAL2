import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import ReportesController from '../controllers/reportes.controller';

const router = Router();

// Todas las rutas requieren autenticacion
router.use(authenticate);

// Tipos de reportes disponibles
router.get('/tipos', ReportesController.obtenerTipos);

// Reportes de inspecciones 360
router.get('/inspecciones-360/:unidadId/pdf', ReportesController.inspecciones360PDF);
router.get('/inspecciones-360/:unidadId/excel', ReportesController.inspecciones360Excel);

// Reportes de brigadas
router.get('/brigadas/pdf', ReportesController.brigadasPDF);
router.get('/brigadas/excel', ReportesController.brigadasExcel);

export default router;
