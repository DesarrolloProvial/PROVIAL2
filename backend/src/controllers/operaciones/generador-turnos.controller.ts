import { Request, Response, NextFunction } from 'express';
import { generadorTurnosService } from '../services/generador-turnos.service';

export const GeneradorTurnosController = {
  /**
   * POST /api/generador-turnos/sugerencias
   * Genera sugerencias de asignaciones optimizadas
   */
  async generarSugerencias(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        fecha,
        num_unidades,
        tripulantes_por_unidad,
        incluir_garita,
        incluir_encargado_ruta,
        priorizar_descanso,
        priorizar_equidad,
        min_dias_descanso,
        considerar_patron_trabajo,
      } = req.body;

      // Validar fecha
      if (!fecha) {
        return res.status(400).json({
          success: false,
          error: 'La fecha es requerida',
        });
      }

      // Obtener sede del usuario autenticado
      const sede_id = req.user?.sede;

      // Generar sugerencias
      const sugerencias = await generadorTurnosService.generarSugerencias({
        fecha,
        sede_id,
        num_unidades,
        tripulantes_por_unidad,
        incluir_garita,
        incluir_encargado_ruta,
        priorizar_descanso,
        priorizar_equidad,
        min_dias_descanso,
        considerar_patron_trabajo,
      });

      return res.json({
        success: true,
        data: sugerencias,
        metadata: {
          fecha,
          total_sugerencias: sugerencias.length,
          sede_id: sede_id || 'todas',
        },
      });
    } catch (error) {
      return next(error);
    }
  },
};
