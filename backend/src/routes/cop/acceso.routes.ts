import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth';
import { canGestionarAcceso, isAdminCop } from '../../middlewares/copAcceso';
import {
  verificarAccesoApp,
  getBrigadasActivas,
  getBrigadasPorGrupo,
  toggleAccesoIndividual,
  listarDelegaciones,
  otorgarDelegacion,
  revocarDelegacion,
} from '../../controllers/cop/acceso.controller';

const router = Router();

router.use(authenticate);

// ── Consultas de brigadas (COP, OPERACIONES, MANDOS, ADMIN) ──────────────────

router.get(
  '/brigadas/activas',
  authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN', 'SUPER_ADMIN'),
  getBrigadasActivas
);

router.get(
  '/brigadas/por-grupo/:grupo',
  authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN', 'SUPER_ADMIN'),
  getBrigadasPorGrupo
);

router.get(
  '/brigadas/:usuario_id/acceso',
  authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN', 'SUPER_ADMIN'),
  verificarAccesoApp
);

// ── Gestión de acceso individual (requiere permiso COP) ──────────────────────

router.patch(
  '/brigadas/:usuario_id/acceso',
  authorize('COP', 'OPERACIONES', 'MANDOS', 'ADMIN', 'SUPER_ADMIN'),
  canGestionarAcceso,
  toggleAccesoIndividual
);

// ── Delegaciones (solo ADMIN_COP puede otorgar/revocar) ──────────────────────

router.get(
  '/delegaciones',
  authorize('COP', 'ADMIN', 'SUPER_ADMIN'),
  isAdminCop,
  listarDelegaciones
);

router.post(
  '/delegaciones',
  authorize('COP', 'ADMIN', 'SUPER_ADMIN'),
  isAdminCop,
  otorgarDelegacion
);

router.delete(
  '/delegaciones/:id',
  authorize('COP', 'ADMIN', 'SUPER_ADMIN'),
  isAdminCop,
  revocarDelegacion
);

export default router;
