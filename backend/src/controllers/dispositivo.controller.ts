import { Request, Response } from 'express';
import { DispositivoModel } from '../models/dispositivo.model';

/** GET /api/admin/dispositivos — Lista todos los dispositivos */
export async function listarDispositivos(_req: Request, res: Response) {
  try {
    const dispositivos = await DispositivoModel.getAll();
    return res.json({ dispositivos, total: dispositivos.length });
  } catch (error) {
    console.error('Error listando dispositivos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/** PATCH /api/admin/dispositivos/:id — Aprobar o bloquear un dispositivo */
export async function actualizarEstadoDispositivo(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    const { estado, notas } = req.body;

    if (!['APROBADO', 'BLOQUEADO', 'PENDIENTE'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido. Use APROBADO, BLOQUEADO o PENDIENTE.' });
    }

    const aprobadoPor = req.user!.userId;
    const dispositivo = await DispositivoModel.updateEstado(id, estado, aprobadoPor, notas);

    if (!dispositivo) {
      return res.status(404).json({ error: 'Dispositivo no encontrado' });
    }

    return res.json({ message: `Dispositivo ${estado.toLowerCase()} correctamente`, dispositivo });
  } catch (error) {
    console.error('Error actualizando dispositivo:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
