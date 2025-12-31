import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import * as controller from '../controllers/ubicacionBrigada.controller';

const router = Router();

// ========================================
// RUTAS PARA BRIGADAS
// ========================================

// Obtener mi ubicación actual
router.get('/mi-ubicacion', authenticate, controller.getMiUbicacion);

// Obtener mis permisos (qué unidad puedo ver/crear situaciones)
router.get('/mis-permisos', authenticate, controller.getMisPermisos);

// ========================================
// RUTAS PARA COP
// ========================================

// Obtener todas las ubicaciones activas
router.get('/', authenticate, authorize('COP', 'ADMIN', 'OPERACIONES'), controller.getAllUbicaciones);

// Obtener ubicaciones de una unidad específica
router.get('/unidad/:unidadId', authenticate, controller.getUbicacionesByUnidad);

// ========================================
// PRÉSTAMO DE BRIGADA
// ========================================

// Obtener brigadas disponibles para préstamo desde una unidad
router.get('/para-prestamo/:unidadId', authenticate, authorize('COP', 'ADMIN'), controller.getBrigadasParaPrestamo);

// Obtener brigadas actualmente prestados
router.get('/prestados', authenticate, authorize('COP', 'ADMIN'), controller.getBrigadasPrestados);

// Prestar brigada a otra unidad
router.post('/prestamo', authenticate, authorize('COP', 'ADMIN'), controller.prestarBrigada);

// Retornar brigada de préstamo
router.post('/retorno-prestamo', authenticate, authorize('COP', 'ADMIN'), controller.retornarDePrestamo);

// ========================================
// DIVISIÓN DE FUERZA
// ========================================

// Obtener brigadas en punto fijo
router.get('/en-punto-fijo', authenticate, authorize('COP', 'ADMIN'), controller.getBrigadasEnPuntoFijo);

// Dividir brigada (se queda en punto fijo)
router.post('/division', authenticate, authorize('COP', 'ADMIN'), controller.dividirFuerza);

// Reunir brigada con su unidad
router.post('/reunion', authenticate, authorize('COP', 'ADMIN'), controller.reunirConUnidad);

// ========================================
// CAMBIO DE UNIDAD COMPLETO
// ========================================

// Cambiar toda la tripulación a otra unidad
router.post('/cambio-unidad', authenticate, authorize('COP', 'ADMIN'), controller.cambiarUnidadCompleta);

export default router;
