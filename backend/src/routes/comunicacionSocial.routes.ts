import { Router } from 'express';
import { ComunicacionSocialController } from '../controllers/comunicacionSocial.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// ============================================
// RUTAS DE PLANTILLAS
// ============================================

// Obtener variables disponibles (antes de rutas con parámetros)
router.get('/plantillas/variables', ComunicacionSocialController.obtenerVariables);

// CRUD de plantillas
router.post('/plantillas', ComunicacionSocialController.crearPlantilla);
router.get('/plantillas', ComunicacionSocialController.listarPlantillas);
router.get('/plantillas/:id', ComunicacionSocialController.obtenerPlantilla);
router.put('/plantillas/:id', ComunicacionSocialController.actualizarPlantilla);
router.delete('/plantillas/:id', ComunicacionSocialController.eliminarPlantilla);

// Preview de plantilla con datos de situación
router.post('/plantillas/:id/preview', ComunicacionSocialController.previewPlantilla);

// ============================================
// RUTAS DE PUBLICACIONES
// ============================================

// Crear publicación desde plantilla
router.post('/publicaciones/desde-plantilla', ComunicacionSocialController.crearDesePlantilla);

// CRUD de publicaciones
router.post('/publicaciones', ComunicacionSocialController.crearPublicacion);
router.get('/publicaciones', ComunicacionSocialController.listarPublicaciones);
router.get('/publicaciones/:id', ComunicacionSocialController.obtenerPublicacion);
router.put('/publicaciones/:id', ComunicacionSocialController.actualizarPublicacion);

// Por situación
router.get('/publicaciones/situacion/:situacionId', ComunicacionSocialController.obtenerPublicacionesSituacion);

// Compartir
router.get('/publicaciones/:id/compartir', ComunicacionSocialController.obtenerLinksCompartir);
router.post('/publicaciones/:id/compartido', ComunicacionSocialController.marcarCompartido);

// ============================================
// FOTOS
// ============================================

router.get('/fotos/situacion/:situacionId', ComunicacionSocialController.obtenerFotosSituacion);

export default router;
