/**
 * Rutas para Asignaciones Programadas
 */

import express from 'express';
import {
    crearAsignacionProgramada,
    listarAsignaciones,
    obtenerAsignacion,
    cancelarAsignacion
} from '../controllers/asignacionesController';
import { authenticate, authorize } from '../middlewares/auth';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * POST /api/asignaciones
 * Crear nueva asignación programada (Operaciones, Admin, Encargado Nóminas)
 */
router.post(
    '/',
    authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'),
    crearAsignacionProgramada
);

/**
 * GET /api/asignaciones
 * Listar todas las asignaciones (con filtros)
 */
router.get(
    '/',
    authorize('OPERACIONES', 'ADMIN', 'COP', 'ENCARGADO_SEDE', 'ENCARGADO_NOMINAS'),
    listarAsignaciones
);

// NOTA: Para obtener "mi asignación" como brigada, usar /api/turnos/mi-asignacion-hoy

/**
 * GET /api/asignaciones/:id
 * Obtener una asignación específica
 */
router.get('/:id', obtenerAsignacion);

/**
 * PUT /api/asignaciones/:id/cancelar
 * Cancelar una asignación programada (Operaciones, Admin, Encargado Nóminas)
 */
router.put(
    '/:id/cancelar',
    authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'),
    cancelarAsignacion
);

export default router;
