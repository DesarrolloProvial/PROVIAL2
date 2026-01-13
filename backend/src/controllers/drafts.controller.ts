/**
 * Controlador de Drafts (Borradores Offline-First)
 * Maneja incidentes, emergencias y asistencias guardadas localmente
 * que se sincronizan después
 */

import { Request, Response } from 'express';
import { db } from '../config/database';

/**
 * POST /api/drafts/incidente
 * Crear o actualizar borrador de incidente
 *
 * Body:
 * - draftUuid: UUID generado en cliente
 * - payload: JSON completo del formulario
 */
export async function createOrUpdateIncidenteDraft(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { draftUuid, payload } = req.body;

    // Validar parámetros
    if (!draftUuid) {
      return res.status(400).json({ error: 'draftUuid es requerido' });
    }

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'payload debe ser un objeto JSON' });
    }

    // Verificar si ya existe (idempotencia manual adicional)
    const existing = await db.oneOrNone(
      'SELECT draft_uuid, estado_sync FROM incidente_draft WHERE draft_uuid = $1',
      [draftUuid]
    );

    if (existing) {
      // Si ya está sincronizado, no permitir actualización
      if (existing.estado_sync === 'SINCRONIZADO') {
        return res.status(409).json({
          error: 'Draft ya sincronizado',
          message: 'Este borrador ya fue convertido a incidente final'
        });
      }

      // Actualizar draft existente
      await db.none(
        `UPDATE incidente_draft
         SET payload_json = $1, updated_at = NOW()
         WHERE draft_uuid = $2`,
        [payload, draftUuid]
      );

      console.log(`[DRAFTS] Draft actualizado: ${draftUuid} por usuario ${req.user.userId}`);

      return res.json({
        draftUuid,
        status: 'updated',
        message: 'Borrador actualizado exitosamente'
      });
    }

    // Crear nuevo draft
    await db.none(
      `INSERT INTO incidente_draft (draft_uuid, payload_json, usuario_id, estado_sync)
       VALUES ($1, $2, $3, 'LOCAL')`,
      [draftUuid, payload, req.user.userId]
    );

    console.log(`[DRAFTS] Draft creado: ${draftUuid} por usuario ${req.user.userId}`);

    return res.status(201).json({
      draftUuid,
      status: 'created',
      message: 'Borrador guardado exitosamente'
    });
  } catch (error: any) {
    console.error('[DRAFTS] Error creando/actualizando draft:', error);
    return res.status(500).json({
      error: 'Error al guardar borrador',
      message: error.message
    });
  }
}

/**
 * GET /api/drafts/incidente/:uuid
 * Obtener un borrador específico
 */
export async function getIncidenteDraft(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { uuid } = req.params;

    const draft = await db.oneOrNone(
      `SELECT * FROM incidente_draft WHERE draft_uuid = $1`,
      [uuid]
    );

    if (!draft) {
      return res.status(404).json({ error: 'Borrador no encontrado' });
    }

    // Verificar permisos (solo el creador puede ver su draft)
    if (draft.usuario_id !== req.user.userId && !['ADMIN', 'OPERACIONES'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No autorizado para ver este borrador' });
    }

    // Obtener evidencias asociadas
    const evidencias = await db.any(
      `SELECT * FROM situacion_multimedia WHERE draft_uuid = $1 ORDER BY created_at`,
      [uuid]
    );

    return res.json({
      draft,
      evidencias,
      evidencias_count: evidencias.length
    });
  } catch (error: any) {
    console.error('[DRAFTS] Error obteniendo draft:', error);
    return res.status(500).json({ error: 'Error al obtener borrador' });
  }
}

/**
 * GET /api/drafts/pending
 * Obtener todos los borradores pendientes del usuario
 */
export async function getPendingDrafts(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const drafts = await db.any(
      `SELECT
        'INCIDENTE' as tipo,
        d.*,
        (SELECT COUNT(*) FROM situacion_multimedia WHERE draft_uuid = d.draft_uuid) as evidencias_count
       FROM incidente_draft d
       WHERE usuario_id = $1 AND estado_sync IN ('LOCAL', 'ERROR')
       ORDER BY created_at DESC`,
      [req.user.userId]
    );

    return res.json({
      drafts,
      count: drafts.length
    });
  } catch (error: any) {
    console.error('[DRAFTS] Error obteniendo drafts pendientes:', error);
    return res.status(500).json({ error: 'Error al obtener borradores' });
  }
}

/**
 * POST /api/drafts/:uuid/evidencias
 * Registrar evidencia subida a Cloudinary
 *
 * Body:
 * - cloudinaryPublicId: Public ID único de Cloudinary
 * - url: URL segura de Cloudinary
 * - type: 'FOTO' | 'VIDEO'
 * - width, height, duration (opcional)
 */
export async function registerEvidencia(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { uuid } = req.params;
    const {
      cloudinaryPublicId,
      url,
      type,
      width,
      height,
      duration,
      thumbnailUrl,
      bytes
    } = req.body;

    // Validar parámetros
    if (!cloudinaryPublicId || !url || !type) {
      return res.status(400).json({
        error: 'cloudinaryPublicId, url y type son requeridos'
      });
    }

    if (!['FOTO', 'VIDEO'].includes(type)) {
      return res.status(400).json({
        error: 'type debe ser FOTO o VIDEO'
      });
    }

    // Verificar que el draft existe
    const draft = await db.oneOrNone(
      'SELECT draft_uuid FROM incidente_draft WHERE draft_uuid = $1',
      [uuid]
    );

    if (!draft) {
      return res.status(404).json({ error: 'Borrador no encontrado' });
    }

    // Obtener orden siguiente para fotos
    let orden = null;
    if (type === 'FOTO') {
      const maxOrden = await db.oneOrNone(
        `SELECT COALESCE(MAX(orden), 0) as max_orden
         FROM situacion_multimedia
         WHERE draft_uuid = $1 AND tipo = 'FOTO'`,
        [uuid]
      );
      orden = (maxOrden?.max_orden || 0) + 1;

      // Validar límite de fotos
      if (orden > 3) {
        return res.status(400).json({
          error: 'Límite de fotos alcanzado',
          message: 'Solo se permiten 3 fotos por incidente'
        });
      }
    }

    // Validar límite de videos
    if (type === 'VIDEO') {
      const existeVideo = await db.oneOrNone(
        `SELECT id FROM situacion_multimedia
         WHERE draft_uuid = $1 AND tipo = 'VIDEO'`,
        [uuid]
      );

      if (existeVideo) {
        return res.status(400).json({
          error: 'Límite de videos alcanzado',
          message: 'Solo se permite 1 video por incidente'
        });
      }
    }

    // Insertar evidencia (ON CONFLICT para idempotencia por cloudinary_public_id)
    const result = await db.one(
      `INSERT INTO situacion_multimedia (
        draft_uuid,
        cloudinary_public_id,
        url_original,
        url_thumbnail,
        tipo,
        orden,
        estado,
        nombre_archivo,
        mime_type,
        tamanio_bytes,
        ancho,
        alto,
        duracion_segundos,
        subido_por,
        uploaded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'SUBIDA', $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (cloudinary_public_id) DO UPDATE
        SET estado = 'SUBIDA', updated_at = NOW()
      RETURNING id, cloudinary_public_id`,
      [
        uuid,
        cloudinaryPublicId,
        url,
        thumbnailUrl || url,
        type,
        orden,
        cloudinaryPublicId.split('/').pop(), // nombre archivo
        type === 'FOTO' ? 'image/jpeg' : 'video/mp4',
        bytes || 0,
        width || null,
        height || null,
        duration || null,
        req.user.userId
      ]
    );

    console.log(`[DRAFTS] Evidencia registrada: ${cloudinaryPublicId} para draft ${uuid}`);

    // Verificar completitud (3 fotos + 1 video)
    const completitud = await db.one(
      `SELECT
        COUNT(*) FILTER (WHERE tipo = 'FOTO') as fotos_count,
        COUNT(*) FILTER (WHERE tipo = 'VIDEO') as videos_count
       FROM situacion_multimedia
       WHERE draft_uuid = $1`,
      [uuid]
    );

    const isComplete = completitud.fotos_count >= 3 && completitud.videos_count >= 1;

    return res.status(201).json({
      id: result.id,
      cloudinaryPublicId: result.cloudinary_public_id,
      message: 'Evidencia registrada exitosamente',
      completitud: {
        fotos: completitud.fotos_count,
        videos: completitud.videos_count,
        completa: isComplete
      }
    });
  } catch (error: any) {
    console.error('[DRAFTS] Error registrando evidencia:', error);

    // Error de duplicado (ON CONFLICT no debería llegar aquí, pero por si acaso)
    if (error.code === '23505') { // unique_violation
      return res.status(409).json({
        error: 'Evidencia duplicada',
        message: 'Esta evidencia ya fue registrada'
      });
    }

    return res.status(500).json({
      error: 'Error al registrar evidencia',
      message: error.message
    });
  }
}

/**
 * POST /api/drafts/:uuid/finalize
 * Finalizar draft: convertir a incidente real (TRANSACCIÓN ATÓMICA)
 *
 * Proceso:
 * 1. BEGIN
 * 2. Crear situación
 * 3. Crear incidente desde payload_json del draft
 * 4. Actualizar evidencias (asociarlas a situacion_id)
 * 5. Marcar draft como SINCRONIZADO
 * 6. COMMIT (si falla algo, ROLLBACK automático)
 */
export async function finalizeDraft(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { uuid } = req.params;

    // Obtener draft
    const draft = await db.oneOrNone(
      'SELECT * FROM incidente_draft WHERE draft_uuid = $1',
      [uuid]
    );

    if (!draft) {
      return res.status(404).json({ error: 'Borrador no encontrado' });
    }

    // Verificar que no esté ya sincronizado
    if (draft.estado_sync === 'SINCRONIZADO') {
      return res.status(409).json({
        error: 'Draft ya sincronizado',
        incidente_id: draft.incidente_id,
        situacion_id: draft.situacion_id
      });
    }

    // Verificar permisos (solo el creador puede finalizarlo)
    if (draft.usuario_id !== req.user.userId && !['ADMIN', 'OPERACIONES'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No autorizado para finalizar este borrador' });
    }

    const payload = draft.payload_json;

    // TRANSACCIÓN ATÓMICA
    const result = await db.tx(async (t) => {
      // 1. Crear situación
      const situacion = await t.one(
        `INSERT INTO situacion (
          uuid,
          tipo_situacion,
          estado,
          unidad_id,
          turno_id,
          asignacion_id,
          ruta_id,
          km,
          sentido,
          latitud,
          longitud,
          ubicacion_manual,
          combustible,
          kilometraje_unidad,
          descripcion,
          creado_por,
          actualizado_por
        ) VALUES (
          gen_random_uuid(),
          'INCIDENTE',
          'ACTIVA',
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) RETURNING id, uuid`,
        [
          payload.unidad_id || null,
          payload.turno_id || null,
          payload.asignacion_id || null,
          payload.ruta_id || null,
          payload.km || null,
          payload.sentido || null,
          payload.latitud || null,
          payload.longitud || null,
          payload.ubicacion_manual || false,
          payload.combustible || null,
          payload.kilometraje_unidad || null,
          payload.descripcion || null,
          req.user!.userId,
          req.user!.userId
        ]
      );

      // 2. Crear incidente
      const incidente = await t.one(
        `INSERT INTO incidente (
          situacion_id,
          tipo_hecho,
          departamento_id,
          municipio_id,
          descripcion_hecho,
          personas_lesionadas,
          personas_fallecidas,
          danos_materiales,
          danos_infraestructura,
          descripcion_danos_infra,
          obstruye,
          area,
          material_via,
          observaciones,
          creado_por
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        ) RETURNING id`,
        [
          situacion.id,
          payload.tipo_hecho || null,
          payload.departamento_id || null,
          payload.municipio_id || null,
          payload.descripcion_hecho || null,
          payload.personas_lesionadas || 0,
          payload.personas_fallecidas || 0,
          payload.danos_materiales || false,
          payload.danos_infraestructura || false,
          payload.descripcion_danos_infra || null,
          payload.obstruye || null,
          payload.area || null,
          payload.material_via || null,
          payload.observaciones || null,
          req.user!.userId
        ]
      );

      // 3. Actualizar evidencias (asociarlas a la situación)
      await t.none(
        `UPDATE situacion_multimedia
         SET situacion_id = $1, estado = 'REGISTRADA'
         WHERE draft_uuid = $2`,
        [situacion.id, uuid]
      );

      // 4. Marcar draft como SINCRONIZADO
      await t.none(
        `UPDATE incidente_draft
         SET estado_sync = 'SINCRONIZADO',
             incidente_id = $1,
             situacion_id = $2,
             synced_at = NOW()
         WHERE draft_uuid = $3`,
        [incidente.id, situacion.id, uuid]
      );

      console.log(`[DRAFTS] Draft finalizado: ${uuid} → incidente ${incidente.id}, situación ${situacion.id}`);

      return {
        incidente_id: incidente.id,
        situacion_id: situacion.id,
        situacion_uuid: situacion.uuid
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Incidente creado exitosamente',
      ...result
    });
  } catch (error: any) {
    console.error('[DRAFTS] Error finalizando draft:', error);

    // Actualizar draft con error
    try {
      await db.none(
        `UPDATE incidente_draft
         SET estado_sync = 'ERROR',
             error_message = $1,
             last_sync_attempt = NOW(),
             sync_attempts = sync_attempts + 1
         WHERE draft_uuid = $2`,
        [error.message, req.params.uuid]
      );
    } catch (updateError) {
      console.error('[DRAFTS] Error actualizando estado de error:', updateError);
    }

    return res.status(500).json({
      error: 'Error al finalizar borrador',
      message: error.message
    });
  }
}

/**
 * PATCH /api/drafts/:uuid
 * Actualizar estado de sincronización del draft
 * (usado internamente por el sistema, no por el cliente)
 */
export async function updateDraftStatus(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { uuid } = req.params;
    const { estado_sync, error_message, incidente_id, situacion_id } = req.body;

    const allowed_states = ['LOCAL', 'EN_PROCESO', 'SINCRONIZADO', 'ERROR'];
    if (estado_sync && !allowed_states.includes(estado_sync)) {
      return res.status(400).json({
        error: 'Estado inválido',
        message: `Debe ser uno de: ${allowed_states.join(', ')}`
      });
    }

    // Actualizar draft
    await db.none(
      `UPDATE incidente_draft
       SET estado_sync = COALESCE($1, estado_sync),
           error_message = $2,
           incidente_id = COALESCE($3, incidente_id),
           situacion_id = COALESCE($4, situacion_id),
           sync_attempts = sync_attempts + 1,
           last_sync_attempt = NOW(),
           synced_at = CASE WHEN $1 = 'SINCRONIZADO' THEN NOW() ELSE synced_at END
       WHERE draft_uuid = $5`,
      [estado_sync, error_message, incidente_id, situacion_id, uuid]
    );

    return res.json({ message: 'Estado actualizado' });
  } catch (error: any) {
    console.error('[DRAFTS] Error actualizando estado:', error);
    return res.status(500).json({ error: 'Error al actualizar estado' });
  }
}
