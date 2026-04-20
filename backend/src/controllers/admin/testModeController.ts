import { Request, Response } from 'express';
import { TestModel } from '../../models/admin/test.model';

export async function resetSalidaActiva(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autorizado' });
    const userId = req.user!.userId;
    console.log(`🧪 [TEST MODE] Intentando resetear salida para usuario ${userId}`);
    const result = await TestModel.resetSalidaActiva(userId);
    res.json(result);
  } catch (error) {
    console.error('[TEST MODE] Error resetting salida:', error);
    res.status(500).json({ error: 'Error al resetear salida en backend' });
  }
}

export async function resetIngresosActivos(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autorizado' });
    const result = await TestModel.resetIngresosActivos(req.user!.userId);
    res.json(result);
  } catch (error) {
    console.error('[TEST MODE] Error resetting ingresos:', error);
    res.status(500).json({ error: 'Error al resetear ingresos en backend' });
  }
}

export async function resetSituacionesHoy(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autorizado' });
    const result = await TestModel.resetSituacionesHoy(req.user!.userId);
    res.json(result);
  } catch (error) {
    console.error('[TEST MODE] Error resetting situaciones:', error);
    res.status(500).json({ error: 'Error al resetear situaciones en backend' });
  }
}

export async function resetTodoUsuario(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autorizado' });
    const userId = req.user!.userId;
    console.log(`🧪 [TEST MODE] Reset completo iniciado para usuario ${userId}`);
    const result = await TestModel.resetTodoUsuario(userId);
    console.log(`🧪 [TEST MODE] Reset completo para usuario ${userId}:`, result);
    res.json({
      message: 'Estado reseteado correctamente. Puedes iniciar una nueva salida.',
      results: {
        unidad: result.unidad || 'Sin asignar',
        salida: result.salida ? `Finalizada (ID: ${result.salidaId})` : 'Sin salida activa',
        ingresos: `${result.ingresos} eliminados`,
        situaciones: `${result.situaciones} eliminadas`
      }
    });
  } catch (error) {
    console.error('[TEST MODE] Error resetting todo:', error);
    res.status(500).json({ error: 'Error al resetear todo en backend' });
  }
}
