/**
 * Controlador de Cloudinary
 * Maneja generación de signatures para signed uploads
 */

import { Request, Response } from 'express';
import { generateSignedUploadParams, isCloudinaryConfigured } from '../services/cloudinary.service';

/**
 * POST /api/cloudinary/sign
 * Generar signature para que el cliente suba directo a Cloudinary
 *
 * Body:
 * - draftUuid: UUID del draft (generado en cliente)
 * - fileType: 'image' | 'video'
 * - resourceType: 'image' | 'video' | 'auto' (opcional)
 */
export async function getSignature(req: Request, res: Response) {
  try {
    // Verificar autenticación
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // Verificar que Cloudinary esté configurado
    if (!isCloudinaryConfigured()) {
      console.error('[CLOUDINARY] Cloudinary no está configurado. Verifica las variables de entorno.');
      return res.status(500).json({
        error: 'Servicio de almacenamiento no configurado',
        message: 'Cloudinary no está disponible en este momento'
      });
    }

    const { draftUuid, fileType, resourceType, folder, publicId, tags } = req.body;

    // Validar parámetros requeridos
    if (!draftUuid) {
      return res.status(400).json({ error: 'draftUuid es requerido' });
    }

    if (!fileType || !['image', 'video'].includes(fileType)) {
      return res.status(400).json({
        error: 'fileType debe ser "image" o "video"'
      });
    }

    // Generar signature y parámetros
    const signedParams = generateSignedUploadParams({
      draftUuid,
      fileType,
      resourceType: resourceType || 'auto',
      folder,
      publicId,
      tags
    });

    console.log(`[CLOUDINARY] Signature generada para publicId ${signedParams.publicId} (${fileType}) por usuario ${req.user.userId}`);

    return res.json({
      success: true,
      ...signedParams,
      instructions: {
        method: 'POST',
        url: signedParams.uploadUrl,
        formData: {
          file: '<binary>',
          api_key: signedParams.apiKey,
          timestamp: signedParams.timestamp,
          signature: signedParams.signature,
          folder: signedParams.folder,
          public_id: signedParams.publicId
        }
      }
    });
  } catch (error: any) {
    console.error('[CLOUDINARY] Error generando signature:', error);
    return res.status(500).json({
      error: 'Error al generar signature',
      message: error.message
    });
  }
}

/**
 * GET /api/cloudinary/status
 * Verificar si Cloudinary está configurado
 */
export async function getStatus(_req: Request, res: Response) {
  try {
    const configured = isCloudinaryConfigured();

    return res.json({
      configured,
      cloudName: configured ? process.env.CLOUDINARY_CLOUD_NAME : null,
      message: configured
        ? 'Cloudinary está configurado correctamente'
        : 'Cloudinary no está configurado. Verifica las variables de entorno.'
    });
  } catch (error: any) {
    console.error('[CLOUDINARY] Error verificando status:', error);
    return res.status(500).json({ error: 'Error al verificar status' });
  }
}
