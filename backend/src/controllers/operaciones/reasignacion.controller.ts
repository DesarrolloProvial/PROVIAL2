import { Request, Response } from 'express';
import { SalidaModel } from '../models/salida.model';

// ========================================
// CONTROLADOR DE REASIGNACIONES
// ========================================

/**
 * POST /api/reasignaciones
 * Crear reasignación de personal o unidad entre sedes
 */
export async function crearReasignacion(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const {
      tipo,
      recurso_id,
      sede_origen_id,
      sede_destino_id,
      fecha_inicio,
      fecha_fin,
      es_permanente,
      motivo
    } = req.body;

    // Validar campos requeridos
    if (!tipo || !recurso_id || !sede_origen_id || !sede_destino_id || !fecha_inicio) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        required: ['tipo', 'recurso_id', 'sede_origen_id', 'sede_destino_id', 'fecha_inicio']
      });
    }

    // Validar tipos
    const tiposValidos = ['USUARIO', 'UNIDAD'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({
        error: 'Tipo inválido',
        tipos_validos: tiposValidos
      });
    }

    // Verificar que el usuario tenga permiso sobre la sede origen
    const tienePermiso = await SalidaModel.tienePermisoSede(req.user.userId, sede_origen_id);

    if (!tienePermiso) {
      return res.status(403).json({
        error: 'No autorizado',
        message: 'No tienes permiso sobre la sede de origen'
      });
    }

    // Crear reasignación
    const reasignacion = await SalidaModel.crearReasignacion({
      tipo,
      recurso_id,
      sede_origen_id,
      sede_destino_id,
      fecha_inicio,
      fecha_fin,
      es_permanente: es_permanente || false,
      motivo,
      autorizado_por: req.user.userId
    });

    return res.status(201).json({
      message: 'Reasignación creada exitosamente',
      reasignacion
    });
  } catch (error) {
    console.error('Error en crearReasignacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/reasignaciones/activas
 * Obtener reasignaciones activas
 */
export async function getReasignacionesActivas(_req: Request, res: Response) {
  try {
    const reasignaciones = await SalidaModel.getReasignacionesActivas();

    return res.json({
      reasignaciones,
      total: reasignaciones.length
    });
  } catch (error) {
    console.error('Error en getReasignacionesActivas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/reasignaciones/:id/finalizar
 * Finalizar una reasignación
 */
export async function finalizarReasignacion(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { id } = req.params;

    const reasignacion = await SalidaModel.finalizarReasignacion(parseInt(id));

    return res.json({
      message: 'Reasignación finalizada exitosamente',
      reasignacion
    });
  } catch (error) {
    console.error('Error en finalizarReasignacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
