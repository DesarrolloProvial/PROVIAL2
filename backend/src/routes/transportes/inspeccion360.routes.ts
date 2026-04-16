import { Router } from 'express';
import { Inspeccion360Controller } from '../controllers/inspeccion360.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// ========================================
// PLANTILLAS
// ========================================

// Obtener plantilla por tipo de unidad
router.get('/plantilla/:tipoUnidad', Inspeccion360Controller.obtenerPlantilla);

// Listar todas las plantillas activas
router.get('/plantillas', Inspeccion360Controller.listarPlantillas);

// Crear nueva plantilla (solo SUPER_ADMIN)
router.post('/plantillas', Inspeccion360Controller.crearPlantilla);

// Actualizar plantilla (solo SUPER_ADMIN)
router.put('/plantillas/:id', Inspeccion360Controller.actualizarPlantilla);

// ========================================
// INSPECCIONES
// ========================================

// Listar inspecciones pendientes de aprobación
router.get('/pendientes', Inspeccion360Controller.listarPendientes);

// Obtener estadísticas
router.get('/estadisticas', Inspeccion360Controller.obtenerEstadisticas);

// Verificar estado de inspección 360 por unidad
router.get('/verificar-unidad/:unidadId', Inspeccion360Controller.verificarUnidad);

// Verificar si una salida puede iniciar
router.get('/verificar-salida/:salidaId', Inspeccion360Controller.verificarSalida);

// Obtener inspección de una salida
router.get('/salida/:salidaId', Inspeccion360Controller.obtenerInspeccionDeSalida);

// Obtener inspección pendiente de una unidad
router.get('/unidad/:unidadId/pendiente', Inspeccion360Controller.obtenerInspeccionPendiente);

// Obtener historial de inspecciones de una unidad
router.get('/historial/:unidadId', Inspeccion360Controller.obtenerHistorial);

// Listar PDFs disponibles de una unidad
router.get('/historial/:unidadId/pdfs', Inspeccion360Controller.listarPDFsUnidad);

// Obtener comandante de una unidad
router.get('/comandante/:unidadId', Inspeccion360Controller.obtenerComandante);

// Establecer comandante de una unidad
router.put('/comandante/:unidadId', Inspeccion360Controller.establecerComandante);

// Crear nueva inspección
router.post('/', Inspeccion360Controller.crearInspeccion);

// Obtener inspección por ID
router.get('/:id', Inspeccion360Controller.obtenerInspeccion);

// Generar PDF de inspección
router.get('/:id/pdf', Inspeccion360Controller.generarPDF);

// Actualizar inspección
router.put('/:id', Inspeccion360Controller.actualizarInspeccion);

// Aprobar inspección (solo comandante)
router.put('/:id/aprobar', Inspeccion360Controller.aprobarInspeccion);

// Rechazar inspección (solo comandante)
router.put('/:id/rechazar', Inspeccion360Controller.rechazarInspeccion);

export default router;
