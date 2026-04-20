import { Request, Response } from 'express';
import { AuditoriaModel } from '../../models/admin/auditoria.model';
import { normalizeId } from '../../utils/db.utils';

export async function registrarCambio(req: Request, res: Response) {
  try {
    const { tipo_cambio, tabla_afectada, registro_id, usuario_afectado_id, valores_anteriores, valores_nuevos, motivo } = req.body;

    if (!tipo_cambio || !tabla_afectada || !motivo) {
      return res.status(400).json({ error: 'tipo_cambio, tabla_afectada y motivo son requeridos' });
    }
    if (motivo.trim() === '') {
      return res.status(400).json({ error: 'El motivo no puede estar vacío' });
    }

    const registro = await AuditoriaModel.registrarCambio({
      tipo_cambio, tabla_afectada, registro_id, usuario_afectado_id,
      valores_anteriores, valores_nuevos, motivo,
      realizado_por: req.user!.userId,
    });

    return res.status(201).json({ message: 'Cambio registrado en auditoría', registro });
  } catch (error) {
    console.error('Error en registrarCambio:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getRegistroCambio(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const registro = await AuditoriaModel.getById(id);
    if (!registro) return res.status(404).json({ error: 'Registro no encontrado' });

    return res.json({ registro });
  } catch (error) {
    console.error('Error en getRegistroCambio:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getHistorialCambios(req: Request, res: Response) {
  try {
    const { tipo_cambio, tabla_afectada, usuario_afectado_id, realizado_por, fecha_desde, fecha_hasta, limit, offset } = req.query;

    const filters: any = {};
    if (tipo_cambio) filters.tipo_cambio = tipo_cambio;
    if (tabla_afectada) filters.tabla_afectada = tabla_afectada;
    if (usuario_afectado_id) filters.usuario_afectado_id = normalizeId(usuario_afectado_id as string);
    if (realizado_por) filters.realizado_por = normalizeId(realizado_por as string);
    if (fecha_desde) filters.fecha_desde = new Date(fecha_desde as string);
    if (fecha_hasta) filters.fecha_hasta = new Date(fecha_hasta as string);
    if (limit) { const l = parseInt(limit as string, 10); if (!isNaN(l)) filters.limit = l; }
    if (offset) { const o = parseInt(offset as string, 10); if (!isNaN(o)) filters.offset = o; }

    const cambios = await AuditoriaModel.getHistorial(filters);
    return res.json({ total: cambios.length, cambios, filters });
  } catch (error) {
    console.error('Error en getHistorialCambios:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getHistorialRegistro(req: Request, res: Response) {
  try {
    const { tabla } = req.params;
    const registroId = normalizeId(req.params.registro_id);
    if (!registroId) return res.status(400).json({ error: 'ID inválido' });

    const cambios = await AuditoriaModel.getHistorialRegistro(tabla, registroId);
    return res.json({ tabla, registro_id: registroId, total_cambios: cambios.length, cambios });
  } catch (error) {
    console.error('Error en getHistorialRegistro:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getHistorialUsuario(req: Request, res: Response) {
  try {
    const usuarioId = normalizeId(req.params.usuario_id);
    if (!usuarioId) return res.status(400).json({ error: 'ID inválido' });
    const limitRaw = parseInt(req.query.limit as string, 10);
    const limitNum = isNaN(limitRaw) ? 50 : limitRaw;

    const cambios = await AuditoriaModel.getHistorialUsuario(usuarioId, limitNum);
    return res.json({ usuario_id: usuarioId, total: cambios.length, cambios });
  } catch (error) {
    console.error('Error en getHistorialUsuario:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getMiHistorial(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const limitRaw = parseInt(req.query.limit as string, 10);
    const limitNum = isNaN(limitRaw) ? 50 : limitRaw;

    const cambios = await AuditoriaModel.getHistorialUsuario(userId, limitNum);
    return res.json({ total: cambios.length, cambios });
  } catch (error) {
    console.error('Error en getMiHistorial:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getCambiosRealizadosPor(req: Request, res: Response) {
  try {
    const usuarioId = normalizeId(req.params.usuario_id);
    if (!usuarioId) return res.status(400).json({ error: 'ID inválido' });
    const limitRaw = parseInt(req.query.limit as string, 10);
    const limitNum = isNaN(limitRaw) ? 50 : limitRaw;

    const cambios = await AuditoriaModel.getCambiosRealizadosPor(usuarioId, limitNum);
    return res.json({ usuario_id: usuarioId, total: cambios.length, cambios });
  } catch (error) {
    console.error('Error en getCambiosRealizadosPor:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getEstadisticasCambios(req: Request, res: Response) {
  try {
    const { fecha_desde, fecha_hasta } = req.query;
    const filters: any = {};
    if (fecha_desde) filters.fecha_desde = new Date(fecha_desde as string);
    if (fecha_hasta) filters.fecha_hasta = new Date(fecha_hasta as string);

    const estadisticas = await AuditoriaModel.getEstadisticas(filters);
    return res.json({ estadisticas, filters });
  } catch (error) {
    console.error('Error en getEstadisticasCambios:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function buscarPorMotivo(req: Request, res: Response) {
  try {
    const { q, limit } = req.query;
    if (!q) return res.status(400).json({ error: 'El parámetro q (texto de búsqueda) es requerido' });
    const limitRaw = parseInt(limit as string, 10);
    const limitNum = isNaN(limitRaw) ? 50 : limitRaw;

    const cambios = await AuditoriaModel.buscarPorMotivo(q as string, limitNum);
    return res.json({ query: q, total: cambios.length, cambios });
  } catch (error) {
    console.error('Error en buscarPorMotivo:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
