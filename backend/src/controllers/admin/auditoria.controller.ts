import { Request, Response } from 'express';
import { AuditoriaModel } from '../models/auditoria.model';

// ========================================
// REGISTRAR CAMBIO MANUALMENTE
// ========================================

export async function registrarCambio(req: Request, res: Response) {
  try {
    const {
      tipo_cambio,
      tabla_afectada,
      registro_id,
      usuario_afectado_id,
      valores_anteriores,
      valores_nuevos,
      motivo,
    } = req.body;

    if (!tipo_cambio || !tabla_afectada || !motivo) {
      return res.status(400).json({
        error: 'tipo_cambio, tabla_afectada y motivo son requeridos',
      });
    }

    if (motivo.trim() === '') {
      return res.status(400).json({
        error: 'El motivo no puede estar vacío',
      });
    }

    const userId = req.user!.userId;

    const registro = await AuditoriaModel.registrarCambio({
      tipo_cambio,
      tabla_afectada,
      registro_id,
      usuario_afectado_id,
      valores_anteriores,
      valores_nuevos,
      motivo,
      realizado_por: userId,
    });

    return res.status(201).json({
      message: 'Cambio registrado en auditoría',
      registro,
    });
  } catch (error) {
    console.error('Error en registrarCambio:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER REGISTRO POR ID
// ========================================

export async function getRegistroCambio(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const registro = await AuditoriaModel.getById(parseInt(id, 10));

    if (!registro) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    return res.json({ registro });
  } catch (error) {
    console.error('Error en getRegistroCambio:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER HISTORIAL DE CAMBIOS
// ========================================

export async function getHistorialCambios(req: Request, res: Response) {
  try {
    const {
      tipo_cambio,
      tabla_afectada,
      usuario_afectado_id,
      realizado_por,
      fecha_desde,
      fecha_hasta,
      limit,
      offset,
    } = req.query;

    const filters: any = {};

    if (tipo_cambio) filters.tipo_cambio = tipo_cambio;
    if (tabla_afectada) filters.tabla_afectada = tabla_afectada;
    if (usuario_afectado_id) filters.usuario_afectado_id = parseInt(usuario_afectado_id as string, 10);
    if (realizado_por) filters.realizado_por = parseInt(realizado_por as string, 10);
    if (fecha_desde) filters.fecha_desde = new Date(fecha_desde as string);
    if (fecha_hasta) filters.fecha_hasta = new Date(fecha_hasta as string);
    if (limit) filters.limit = parseInt(limit as string, 10);
    if (offset) filters.offset = parseInt(offset as string, 10);

    const cambios = await AuditoriaModel.getHistorial(filters);

    return res.json({
      total: cambios.length,
      cambios,
      filters,
    });
  } catch (error) {
    console.error('Error en getHistorialCambios:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER HISTORIAL DE UN REGISTRO
// ========================================

export async function getHistorialRegistro(req: Request, res: Response) {
  try {
    const { tabla, registro_id } = req.params;

    const cambios = await AuditoriaModel.getHistorialRegistro(tabla, parseInt(registro_id, 10));

    return res.json({
      tabla,
      registro_id: parseInt(registro_id, 10),
      total_cambios: cambios.length,
      cambios,
    });
  } catch (error) {
    console.error('Error en getHistorialRegistro:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER HISTORIAL DE UN USUARIO
// ========================================

export async function getHistorialUsuario(req: Request, res: Response) {
  try {
    const { usuario_id } = req.params;
    const { limit } = req.query;

    const limitNum = limit ? parseInt(limit as string, 10) : 50;

    const cambios = await AuditoriaModel.getHistorialUsuario(parseInt(usuario_id, 10), limitNum);

    return res.json({
      usuario_id: parseInt(usuario_id, 10),
      total: cambios.length,
      cambios,
    });
  } catch (error) {
    console.error('Error en getHistorialUsuario:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER MI HISTORIAL (BRIGADA)
// ========================================

export async function getMiHistorial(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const { limit } = req.query;

    const limitNum = limit ? parseInt(limit as string, 10) : 50;

    const cambios = await AuditoriaModel.getHistorialUsuario(userId, limitNum);

    return res.json({
      total: cambios.length,
      cambios,
    });
  } catch (error) {
    console.error('Error en getMiHistorial:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER CAMBIOS REALIZADOS POR UN USUARIO
// ========================================

export async function getCambiosRealizadosPor(req: Request, res: Response) {
  try {
    const { usuario_id } = req.params;
    const { limit } = req.query;

    const limitNum = limit ? parseInt(limit as string, 10) : 50;

    const cambios = await AuditoriaModel.getCambiosRealizadosPor(parseInt(usuario_id, 10), limitNum);

    return res.json({
      usuario_id: parseInt(usuario_id, 10),
      total: cambios.length,
      cambios,
    });
  } catch (error) {
    console.error('Error en getCambiosRealizadosPor:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER ESTADÍSTICAS DE CAMBIOS
// ========================================

export async function getEstadisticasCambios(req: Request, res: Response) {
  try {
    const { fecha_desde, fecha_hasta } = req.query;

    const filters: any = {};

    if (fecha_desde) filters.fecha_desde = new Date(fecha_desde as string);
    if (fecha_hasta) filters.fecha_hasta = new Date(fecha_hasta as string);

    const estadisticas = await AuditoriaModel.getEstadisticas(filters);

    return res.json({
      estadisticas,
      filters,
    });
  } catch (error) {
    console.error('Error en getEstadisticasCambios:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// BUSCAR POR MOTIVO
// ========================================

export async function buscarPorMotivo(req: Request, res: Response) {
  try {
    const { q, limit } = req.query;

    if (!q) {
      return res.status(400).json({
        error: 'El parámetro q (texto de búsqueda) es requerido',
      });
    }

    const limitNum = limit ? parseInt(limit as string, 10) : 50;

    const cambios = await AuditoriaModel.buscarPorMotivo(q as string, limitNum);

    return res.json({
      query: q,
      total: cambios.length,
      cambios,
    });
  } catch (error) {
    console.error('Error en buscarPorMotivo:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
