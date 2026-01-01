import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  authorizeSuperAdmin,
  authorizeAdminOrSuperAdmin,
  authorizeGestionUsuarios,
  authorizeGestionGrupos
} from '../middlewares/superAdmin';
import * as controller from '../controllers/administracion.controller';

const router = Router();

// =====================================================
// DEPARTAMENTOS
// =====================================================

// Obtener lista de departamentos
router.get('/departamentos', authenticate, authorizeAdminOrSuperAdmin(), controller.getDepartamentos);

// =====================================================
// ESTADO DE GRUPOS
// =====================================================

// Alias: listar grupos
router.get('/grupos', authenticate, authorizeGestionGrupos(), controller.getEstadoGrupos);

// Obtener estado de grupos por departamento/sede
router.get('/grupos/estado', authenticate, authorizeGestionGrupos(), controller.getEstadoGrupos);

// Activar/desactivar grupo
router.post('/grupos/toggle', authenticate, authorizeGestionGrupos(), controller.toggleGrupo);

// =====================================================
// ENCARGADOS
// =====================================================

// Obtener encargados actuales
router.get('/encargados', authenticate, authorizeAdminOrSuperAdmin(), controller.getEncargados);

// Asignar nuevo encargado
router.post('/encargados', authenticate, authorizeAdminOrSuperAdmin(), controller.asignarEncargado);

// Remover encargado
router.delete('/encargados/:sede_id/:grupo', authenticate, authorizeAdminOrSuperAdmin(), controller.removerEncargado);

// Historial de encargados por sede
router.get('/encargados/historial/:sede_id', authenticate, authorizeAdminOrSuperAdmin(), controller.getHistorialEncargados);

// =====================================================
// USUARIOS
// =====================================================

// Obtener lista de usuarios (con filtros)
router.get('/usuarios', authenticate, authorizeGestionUsuarios(), controller.getUsuarios);

// Obtener usuario por ID
router.get('/usuarios/:id', authenticate, authorizeGestionUsuarios(), controller.getUsuario);

// Activar/desactivar usuario
router.post('/usuarios/:id/toggle', authenticate, authorizeGestionUsuarios(), controller.toggleUsuario);

// Activar/desactivar acceso a app
router.post('/usuarios/:id/toggle-app', authenticate, authorizeGestionUsuarios(), controller.toggleAccesoApp);

// Cambiar grupo de usuario
router.put('/usuarios/:id/grupo', authenticate, authorizeGestionGrupos(), controller.cambiarGrupoUsuario);

// Cambiar rol de usuario (solo SUPER_ADMIN)
router.put('/usuarios/:id/rol', authenticate, authorizeSuperAdmin(), controller.cambiarRolUsuario);

// Cambiar sub-rol COP
router.put('/usuarios/:id/sub-rol-cop', authenticate, authorizeAdminOrSuperAdmin(), controller.cambiarSubRolCop);

// Cambiar sede de usuario
router.put('/usuarios/:id/sede', authenticate, authorizeGestionUsuarios(), controller.cambiarSedeUsuario);

// =====================================================
// CONFIGURACION (Solo SUPER_ADMIN)
// =====================================================

// Obtener configuracion del sistema
router.get('/config', authenticate, authorizeSuperAdmin(), controller.getConfiguracion);

// Actualizar configuracion
router.put('/config', authenticate, authorizeSuperAdmin(), controller.setConfiguracion);

// =====================================================
// ROLES Y SUB-ROLES
// =====================================================

// Obtener lista de roles
router.get('/roles', authenticate, authorizeAdminOrSuperAdmin(), controller.getRoles);

// Obtener lista de sub-roles COP
router.get('/sub-roles-cop', authenticate, authorizeAdminOrSuperAdmin(), controller.getSubRolesCop);

// =====================================================
// LOG Y AUDITORIA (Solo SUPER_ADMIN)
// =====================================================

// Alias: log de auditoría
router.get('/auditoria', authenticate, authorizeSuperAdmin(), controller.getLogAdministracion);

// Obtener log de acciones administrativas
router.get('/log', authenticate, authorizeSuperAdmin(), controller.getLogAdministracion);

// =====================================================
// ESTADISTICAS
// =====================================================

// Obtener estadisticas de administracion
router.get('/estadisticas', authenticate, authorizeAdminOrSuperAdmin(), controller.getEstadisticas);

export default router;
