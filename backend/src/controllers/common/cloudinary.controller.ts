import { Request, Response } from 'express';
import { isCloudinaryConfigured } from '../../services/common/cloudinary.service';

/**
 * GET /api/cloudinary/status
 * Verificar si Cloudinary está configurado (monitoreo de infraestructura)
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
  } catch (error) {
    console.error('[CLOUDINARY] Error verificando status:', error);
    return res.status(500).json({ error: 'Error al verificar status' });
  }
}
