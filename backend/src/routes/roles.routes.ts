import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import {
    listarRoles,
    listarPermisos,
    crearRol,
    actualizarRol,
    eliminarRol
} from '../controllers/roles.controller';

const router = Router();

// Listar roles
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), listarRoles);

// Listar permisos
router.get('/permisos', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), listarPermisos);

// Crear permisos (optional, maybe standard?) 
// For now, only roles CRUD.

// Crear rol
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), crearRol);

// Actualizar rol
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), actualizarRol);

// Eliminar rol
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), eliminarRol);

export default router;
