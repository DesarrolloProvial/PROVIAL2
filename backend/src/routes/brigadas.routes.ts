import { Router } from 'express';
import {
  listarBrigadas,
  obtenerBrigada,
  crearBrigada,
  actualizarBrigada,
  desactivarBrigada,
  activarBrigada,
  transferirBrigada,
  eliminarBrigada,
  getMotivosInactividad,
  getRolesDisponibles,
  getUsuariosSistema,
  getRolesBrigada,
  asignarRolBrigada,
  revocarRolBrigada,
  getHistorialInactividad
} from '../controllers/brigadas.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// =====================================================
// CATÁLOGOS (deben ir primero para no confundir con :id)
// =====================================================

// Obtener catálogo de motivos de inactividad
router.get('/catalogo/motivos-inactividad', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'), getMotivosInactividad);

// Obtener roles disponibles para asignar
router.get('/catalogo/roles', authenticate, authorize('ADMIN', 'ENCARGADO_NOMINAS'), getRolesDisponibles);

// Obtener usuarios con roles del sistema (no BRIGADA) - para Panel Admin
router.get('/usuarios-sistema', authenticate, authorize('ADMIN', 'ENCARGADO_NOMINAS'), getUsuariosSistema);

// =====================================================
// CRUD BRIGADAS
// =====================================================

// Listar brigadas (Operaciones, Admin, Encargado Nóminas)
// ENCARGADO_NOMINAS: Si puede_ver_todas_sedes=true ve todas, sino solo su sede
router.get('/', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'), listarBrigadas);

// Obtener brigada específica
router.get('/:id', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'), obtenerBrigada);

// Crear brigada (Admin y Encargado Nóminas)
router.post('/', authenticate, authorize('ADMIN', 'ENCARGADO_NOMINAS'), crearBrigada);

// Actualizar brigada
router.put('/:id', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'), actualizarBrigada);

// Desactivar brigada (requiere motivo)
router.put('/:id/desactivar', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'), desactivarBrigada);

// Activar brigada
router.put('/:id/activar', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'), activarBrigada);

// Transferir brigada a otra sede
router.put('/:id/transferir', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'), transferirBrigada);

// Eliminar brigada (solo si no tiene historial)
router.delete('/:id', authenticate, authorize('ADMIN', 'ENCARGADO_NOMINAS'), eliminarBrigada);

// =====================================================
// GESTIÓN DE ROLES (solo ADMIN y ENCARGADO_NOMINAS con puede_ver_todas_sedes)
// =====================================================

// Obtener roles de una brigada
router.get('/:id/roles', authenticate, authorize('ADMIN', 'ENCARGADO_NOMINAS'), getRolesBrigada);

// Asignar rol a brigada
router.post('/:id/roles', authenticate, authorize('ADMIN', 'ENCARGADO_NOMINAS'), asignarRolBrigada);

// Revocar rol de brigada
router.delete('/:id/roles/:rolId', authenticate, authorize('ADMIN', 'ENCARGADO_NOMINAS'), revocarRolBrigada);

// =====================================================
// HISTORIAL DE INACTIVIDAD
// =====================================================

// Obtener historial de inactividad de una brigada
router.get('/:id/inactividad', authenticate, authorize('OPERACIONES', 'ADMIN', 'ENCARGADO_NOMINAS'), getHistorialInactividad);

export default router;
