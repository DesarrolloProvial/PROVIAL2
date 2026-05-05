import { Router } from 'express';
import {
  getEstadoGruposHoy,
  getEstadoGrupo,
  getCalendarioGrupo,
  generarCalendario,
  updateCalendario,
  verificarAccesoApp,
  verificarMiAcceso,
  getBrigadasActivas,
  getBrigadasPorGrupo,
  toggleAccesoIndividual,
  actualizarGrupoBrigada,
  toggleExentoGrupos,
  setEstadoGrupo,
} from '../../controllers/operaciones/grupo.controller';
import { authenticate, authorize } from '../../middlewares/auth';
import { authorizeGruposGestion } from '../../middlewares/subRolCop';

const router = Router();

// ========================================
// RUTAS PÚBLICAS (AUTENTICADAS)
// ========================================

// Verificar mi propio acceso (cualquier usuario)
router.get('/acceso/verificar-mi-acceso', authenticate, verificarMiAcceso);

// ========================================
// CONSULTAS DE ESTADO
// ========================================

// Estado de grupos hoy
router.get('/estado/hoy', authenticate, getEstadoGruposHoy);

// Estado de un grupo específico
router.get('/estado/:grupo', authenticate, getEstadoGrupo);

// Calendario de un grupo
router.get('/:grupo/calendario', authenticate, getCalendarioGrupo);

// ========================================
// BRIGADAS
// ========================================

// Listar brigadas activas en este momento
router.get('/brigadas/activas', authenticate, authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'), getBrigadasActivas);

// Listar brigadas de un grupo
router.get('/:grupo/brigadas', authenticate, authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'), getBrigadasPorGrupo);

// Verificar acceso de un usuario específico
router.get('/acceso/verificar/:usuario_id', authenticate, authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN'), verificarAccesoApp);

// ========================================
// GESTIÓN DE CALENDARIO (SOLO OPERACIONES/ADMIN)
// ========================================

// Generar calendario automáticamente
router.post('/calendario/generar', authenticate, authorizeGruposGestion, generarCalendario);

// Actualizar entrada de calendario
router.patch('/:grupo/calendario/:fecha', authenticate, authorizeGruposGestion, updateCalendario);

// Establecer estado de grupo (Manual)
router.post('/:grupo/estado', authenticate, authorizeGruposGestion, setEstadoGrupo);

// ========================================
// GESTIÓN DE ACCESO (OPERACIONES/MANDOS/ADMIN)
// ========================================

// Suspender/activar acceso individual
router.patch('/brigadas/:usuario_id/acceso', authenticate, authorize('OPERACIONES', 'MANDOS', 'ADMIN'), toggleAccesoIndividual);

// Actualizar grupo de un brigada
router.patch('/brigadas/:usuario_id/grupo', authenticate, authorize('OPERACIONES', 'ADMIN'), actualizarGrupoBrigada);

// Marcar/desmarcar exento de grupos
router.patch('/brigadas/:usuario_id/exento', authenticate, authorize('ADMIN'), toggleExentoGrupos);

export default router;
