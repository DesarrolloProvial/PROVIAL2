import { Router } from 'express';
import {
  createOrUpdateSituacionDraft,
  createOrUpdateIncidenteDraft,
  getSituacionDraft,
  getIncidenteDraft,
  getPendingDrafts,
  registerEvidencia,
  updateDraftStatus,
  finalizeDraft
} from '../controllers/drafts.controller';
import { authenticate } from '../middlewares/auth';
import { idempotency } from '../middlewares/idempotency';

const router = Router();

/**
 * POST /api/drafts/situacion
 * Crear o actualizar borrador de cualquier tipo de situación
 * Body: { draftUuid, tipoSituacion, payload }
 */
router.post('/situacion', authenticate, idempotency, createOrUpdateSituacionDraft);

/**
 * GET /api/drafts/situacion/:uuid
 * Obtener un borrador específico con sus evidencias
 */
router.get('/situacion/:uuid', authenticate, getSituacionDraft);

/**
 * POST /api/drafts/incidente (LEGACY - usa /situacion en su lugar)
 * Mantener compatibilidad con código existente
 */
router.post('/incidente', authenticate, idempotency, createOrUpdateIncidenteDraft);

/**
 * GET /api/drafts/incidente/:uuid (LEGACY)
 * Obtener un borrador específico con sus evidencias
 */
router.get('/incidente/:uuid', authenticate, getIncidenteDraft);

/**
 * GET /api/drafts/pending
 * Obtener todos los borradores pendientes del usuario autenticado
 */
router.get('/pending', authenticate, getPendingDrafts);

/**
 * POST /api/drafts/:uuid/evidencias
 * Registrar evidencia (foto o video) subida a Cloudinary
 * Soporta idempotencia con header Idempotency-Key
 */
router.post('/:uuid/evidencias', authenticate, idempotency, registerEvidencia);

/**
 * POST /api/drafts/:uuid/finalize
 * Finalizar draft: convertir a incidente real (transacción atómica)
 * Soporta idempotencia con header Idempotency-Key
 */
router.post('/:uuid/finalize', authenticate, idempotency, finalizeDraft);

/**
 * PATCH /api/drafts/:uuid
 * Actualizar estado de sincronización
 * (Uso interno del sistema)
 */
router.patch('/:uuid', authenticate, updateDraftStatus);

export default router;
