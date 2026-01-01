import { Request, Response } from 'express';
import { Inspeccion360Model } from '../models/inspeccion360.model';
import { PDF360Service } from '../services/pdf360.service';
import { db } from '../config/database';

// ========================================
// CONTROLADOR: INSPECCIÓN 360
// ========================================

export const Inspeccion360Controller = {
  // ========================================
  // PLANTILLAS
  // ========================================

  /**
   * GET /api/inspeccion360/plantilla/:tipoUnidad
   * Obtener plantilla activa para un tipo de unidad
   */
  async obtenerPlantilla(req: Request, res: Response) {
    try {
      const { tipoUnidad } = req.params;

      const plantilla = await Inspeccion360Model.obtenerPlantillaPorTipo(tipoUnidad);

      if (!plantilla) {
        return res.status(404).json({
          error: 'No existe plantilla para este tipo de unidad'
        });
      }

      res.json(plantilla);
    } catch (error: any) {
      console.error('Error al obtener plantilla 360:', error);
      res.status(500).json({ error: 'Error al obtener plantilla' });
    }
  },

  /**
   * GET /api/inspeccion360/plantillas
   * Obtener todas las plantillas activas
   */
  async listarPlantillas(_req: Request, res: Response) {
    try {
      const plantillas = await Inspeccion360Model.obtenerPlantillasActivas();
      res.json({ plantillas });
    } catch (error: any) {
      console.error('Error al listar plantillas:', error);
      res.status(500).json({ error: 'Error al listar plantillas' });
    }
  },

  /**
   * POST /api/inspeccion360/plantillas
   * Crear nueva plantilla (solo SUPER_ADMIN)
   */
  async crearPlantilla(req: Request, res: Response) {
    try {
      const { tipo_unidad, nombre, descripcion, secciones } = req.body;
      const userId = (req as any).user?.userId;

      if (!tipo_unidad || !nombre || !secciones) {
        return res.status(400).json({
          error: 'Faltan campos requeridos: tipo_unidad, nombre, secciones'
        });
      }

      const plantilla = await Inspeccion360Model.crearPlantilla({
        tipo_unidad,
        nombre,
        descripcion,
        secciones,
        creado_por: userId
      });

      res.status(201).json(plantilla);
    } catch (error: any) {
      console.error('Error al crear plantilla:', error);
      res.status(500).json({ error: 'Error al crear plantilla' });
    }
  },

  /**
   * PUT /api/inspeccion360/plantillas/:id
   * Actualizar plantilla (crea nueva versión)
   */
  async actualizarPlantilla(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nombre, descripcion, secciones } = req.body;
      const userId = (req as any).user?.userId;

      const plantilla = await Inspeccion360Model.actualizarPlantilla(parseInt(id), {
        nombre,
        descripcion,
        secciones,
        creado_por: userId
      });

      res.json(plantilla);
    } catch (error: any) {
      console.error('Error al actualizar plantilla:', error);
      res.status(500).json({ error: error.message || 'Error al actualizar plantilla' });
    }
  },

  // ========================================
  // INSPECCIONES
  // ========================================

  /**
   * POST /api/inspeccion360
   * Crear nueva inspección 360
   */
  async crearInspeccion(req: Request, res: Response) {
    try {
      const {
        salida_id,
        unidad_id,
        plantilla_id,
        respuestas,
        observaciones_inspector,
        firma_inspector,
        fotos
      } = req.body;
      const userId = (req as any).user?.userId;

      if (!unidad_id || !plantilla_id || !respuestas) {
        return res.status(400).json({
          error: 'Faltan campos requeridos: unidad_id, plantilla_id, respuestas'
        });
      }

      // Validar que exista la plantilla
      const plantilla = await Inspeccion360Model.obtenerPlantillaPorId(plantilla_id);
      if (!plantilla) {
        return res.status(404).json({ error: 'Plantilla no encontrada' });
      }

      // Validar respuestas requeridas
      const itemsRequeridos = plantilla.secciones.flatMap(s =>
        s.items.filter(i => i.requerido).map(i => i.codigo)
      );

      const codigosRespondidos = respuestas.map((r: any) => r.codigo);
      const faltantes = itemsRequeridos.filter(
        (codigo: string) => !codigosRespondidos.includes(codigo)
      );

      if (faltantes.length > 0) {
        return res.status(400).json({
          error: 'Faltan respuestas requeridas',
          faltantes
        });
      }

      const inspeccion = await Inspeccion360Model.crearInspeccion({
        salida_id,
        unidad_id,
        plantilla_id,
        realizado_por: userId,
        respuestas,
        observaciones_inspector,
        firma_inspector,
        fotos
      });

      res.status(201).json(inspeccion);
    } catch (error: any) {
      console.error('Error al crear inspección:', error);
      res.status(500).json({ error: 'Error al crear inspección' });
    }
  },

  /**
   * GET /api/inspeccion360/:id
   * Obtener inspección por ID
   */
  async obtenerInspeccion(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const inspeccion = await Inspeccion360Model.obtenerInspeccionPorId(parseInt(id));

      if (!inspeccion) {
        return res.status(404).json({ error: 'Inspección no encontrada' });
      }

      res.json(inspeccion);
    } catch (error: any) {
      console.error('Error al obtener inspección:', error);
      res.status(500).json({ error: 'Error al obtener inspección' });
    }
  },

  /**
   * GET /api/inspeccion360/salida/:salidaId
   * Obtener inspección de una salida
   */
  async obtenerInspeccionDeSalida(req: Request, res: Response) {
    try {
      const { salidaId } = req.params;

      const inspeccion = await Inspeccion360Model.obtenerInspeccionPorSalida(parseInt(salidaId));

      if (!inspeccion) {
        return res.status(404).json({ error: 'No hay inspección para esta salida' });
      }

      res.json(inspeccion);
    } catch (error: any) {
      console.error('Error al obtener inspección de salida:', error);
      res.status(500).json({ error: 'Error al obtener inspección' });
    }
  },

  /**
   * GET /api/inspeccion360/unidad/:unidadId/pendiente
   * Obtener inspección pendiente de una unidad
   */
  async obtenerInspeccionPendiente(req: Request, res: Response) {
    try {
      const { unidadId } = req.params;

      const inspeccion = await Inspeccion360Model.obtenerInspeccionPendienteUnidad(parseInt(unidadId));

      if (!inspeccion) {
        return res.status(404).json({ error: 'No hay inspección pendiente' });
      }

      res.json(inspeccion);
    } catch (error: any) {
      console.error('Error al obtener inspección pendiente:', error);
      res.status(500).json({ error: 'Error al obtener inspección' });
    }
  },

  /**
   * PUT /api/inspeccion360/:id
   * Actualizar inspección (solo si está pendiente)
   */
  async actualizarInspeccion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { respuestas, observaciones_inspector, firma_inspector, fotos } = req.body;

      const inspeccion = await Inspeccion360Model.actualizarInspeccion(parseInt(id), {
        respuestas,
        observaciones_inspector,
        firma_inspector,
        fotos
      });

      if (!inspeccion) {
        return res.status(400).json({
          error: 'No se puede actualizar la inspección (ya fue aprobada/rechazada o no existe)'
        });
      }

      res.json(inspeccion);
    } catch (error: any) {
      console.error('Error al actualizar inspección:', error);
      res.status(500).json({ error: 'Error al actualizar inspección' });
    }
  },

  /**
   * PUT /api/inspeccion360/:id/aprobar
   * Aprobar inspección (solo comandante)
   */
  async aprobarInspeccion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { firma, observaciones } = req.body;
      const userId = (req as any).user?.userId;

      const resultado = await Inspeccion360Model.aprobarInspeccion(
        parseInt(id),
        userId,
        firma,
        observaciones
      );

      if (!resultado.success) {
        return res.status(400).json({ error: resultado.mensaje });
      }

      res.json({ mensaje: resultado.mensaje });
    } catch (error: any) {
      console.error('Error al aprobar inspección:', error);
      res.status(500).json({ error: 'Error al aprobar inspección' });
    }
  },

  /**
   * PUT /api/inspeccion360/:id/rechazar
   * Rechazar inspección (solo comandante)
   */
  async rechazarInspeccion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      const userId = (req as any).user?.userId;

      if (!motivo) {
        return res.status(400).json({ error: 'Debe proporcionar un motivo de rechazo' });
      }

      const resultado = await Inspeccion360Model.rechazarInspeccion(
        parseInt(id),
        userId,
        motivo
      );

      if (!resultado.success) {
        return res.status(400).json({ error: resultado.mensaje });
      }

      res.json({ mensaje: resultado.mensaje });
    } catch (error: any) {
      console.error('Error al rechazar inspección:', error);
      res.status(500).json({ error: 'Error al rechazar inspección' });
    }
  },

  /**
   * GET /api/inspeccion360/pendientes
   * Obtener inspecciones pendientes de aprobación
   */
  async listarPendientes(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const userRol = (req as any).user?.rol;

      // Si es admin, ver todas. Si no, solo las suyas como comandante
      const comandanteId = ['SUPER_ADMIN', 'ADMIN', 'OPERACIONES'].includes(userRol)
        ? undefined
        : userId;

      const inspecciones = await Inspeccion360Model.obtenerInspeccionesPendientes(comandanteId);

      res.json({ inspecciones });
    } catch (error: any) {
      console.error('Error al listar pendientes:', error);
      res.status(500).json({ error: 'Error al listar inspecciones pendientes' });
    }
  },

  /**
   * GET /api/inspeccion360/historial/:unidadId
   * Obtener historial de inspecciones de una unidad
   */
  async obtenerHistorial(req: Request, res: Response) {
    try {
      const { unidadId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;

      const historial = await Inspeccion360Model.obtenerHistorialUnidad(
        parseInt(unidadId),
        limit
      );

      res.json({ historial });
    } catch (error: any) {
      console.error('Error al obtener historial:', error);
      res.status(500).json({ error: 'Error al obtener historial' });
    }
  },

  // ========================================
  // COMANDANTE
  // ========================================

  /**
   * GET /api/inspeccion360/comandante/:unidadId
   * Obtener comandante de una unidad
   */
  async obtenerComandante(req: Request, res: Response) {
    try {
      const { unidadId } = req.params;

      const comandante = await Inspeccion360Model.obtenerComandante(parseInt(unidadId));

      if (!comandante) {
        return res.status(404).json({ error: 'La unidad no tiene comandante asignado' });
      }

      res.json(comandante);
    } catch (error: any) {
      console.error('Error al obtener comandante:', error);
      res.status(500).json({ error: 'Error al obtener comandante' });
    }
  },

  /**
   * PUT /api/inspeccion360/comandante/:unidadId
   * Establecer comandante de una unidad
   */
  async establecerComandante(req: Request, res: Response) {
    try {
      const { unidadId } = req.params;
      const { comandante_id } = req.body;

      if (!comandante_id) {
        return res.status(400).json({ error: 'Debe proporcionar comandante_id' });
      }

      const success = await Inspeccion360Model.establecerComandante(
        parseInt(unidadId),
        comandante_id
      );

      if (!success) {
        return res.status(400).json({
          error: 'No se pudo establecer el comandante. Verifique que el usuario esté asignado a la unidad.'
        });
      }

      res.json({ mensaje: 'Comandante establecido correctamente' });
    } catch (error: any) {
      console.error('Error al establecer comandante:', error);
      res.status(500).json({ error: 'Error al establecer comandante' });
    }
  },

  /**
   * GET /api/inspeccion360/verificar-salida/:salidaId
   * Verificar si una salida puede iniciar (tiene 360 aprobada)
   */
  async verificarSalida(req: Request, res: Response) {
    try {
      const { salidaId } = req.params;

      const resultado = await Inspeccion360Model.puedeIniciarSalida(parseInt(salidaId));

      res.json(resultado);
    } catch (error: any) {
      console.error('Error al verificar salida:', error);
      res.status(500).json({ error: 'Error al verificar salida' });
    }
  },

  // ========================================
  // ESTADÍSTICAS
  // ========================================

  /**
   * GET /api/inspeccion360/estadisticas
   * Obtener estadísticas de inspecciones
   */
  async obtenerEstadisticas(req: Request, res: Response) {
    try {
      const { fecha_inicio, fecha_fin } = req.query;

      const fechaInicio = fecha_inicio ? new Date(fecha_inicio as string) : undefined;
      const fechaFin = fecha_fin ? new Date(fecha_fin as string) : undefined;

      const estadisticas = await Inspeccion360Model.obtenerEstadisticas(fechaInicio, fechaFin);

      res.json(estadisticas);
    } catch (error: any) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
  },

  // ========================================
  // PDF
  // ========================================

  /**
   * GET /api/inspeccion360/:id/pdf
   * Generar y descargar PDF de una inspección
   */
  async generarPDF(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const inspeccionId = parseInt(id);

      // Obtener la inspección con todos los datos necesarios
      const inspeccion = await Inspeccion360Model.obtenerInspeccionPorId(inspeccionId);

      if (!inspeccion) {
        return res.status(404).json({ error: 'Inspección no encontrada' });
      }

      // Obtener la plantilla
      const plantilla = await Inspeccion360Model.obtenerPlantillaPorId(inspeccion.plantilla_id);

      if (!plantilla) {
        return res.status(404).json({ error: 'Plantilla no encontrada' });
      }

      // Obtener datos de la unidad
      const unidad = await db.one(`
        SELECT u.id, u.codigo, u.tipo_unidad, u.placa, s.nombre as sede_nombre
        FROM unidad u
        LEFT JOIN sede s ON u.sede_id = s.id
        WHERE u.id = $1
      `, [inspeccion.unidad_id]);

      // Obtener datos del inspector
      const inspector = await db.one(`
        SELECT id, nombre_completo, chapa
        FROM usuario
        WHERE id = $1
      `, [inspeccion.realizado_por]);

      // Obtener datos del comandante (si existe)
      let comandante = null;
      if (inspeccion.aprobado_por) {
        comandante = await db.oneOrNone(`
          SELECT id, nombre_completo, chapa
          FROM usuario
          WHERE id = $1
        `, [inspeccion.aprobado_por]);
      }

      // Preparar datos para el PDF
      const pdfData = await PDF360Service.prepararDatos(
        inspeccion,
        plantilla,
        unidad,
        inspector,
        comandante
      );

      // Generar PDF
      const pdfStream = await PDF360Service.generarPDF(pdfData);

      // Configurar headers para descarga
      const filename = `inspeccion_360_${unidad.codigo}_${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Enviar el PDF
      pdfStream.pipe(res);
    } catch (error: any) {
      console.error('Error al generar PDF:', error);
      res.status(500).json({ error: 'Error al generar PDF' });
    }
  },

  /**
   * GET /api/inspeccion360/historial/:unidadId/pdfs
   * Listar PDFs disponibles de una unidad (últimos N días)
   * Params: dias (default 30, max 90), limite (default 50, max 100)
   */
  async listarPDFsUnidad(req: Request, res: Response) {
    try {
      const { unidadId } = req.params;
      const diasParam = parseInt(req.query.dias as string) || 30;
      const limiteParam = parseInt(req.query.limite as string) || 50;

      // Limites maximos para evitar sobrecarga
      const dias = Math.min(diasParam, 90);
      const limite = Math.min(limiteParam, 100);

      const inspecciones = await db.manyOrNone(`
        SELECT
          i.id,
          i.fecha_realizacion,
          i.fecha_aprobacion,
          i.estado,
          u.codigo as unidad_codigo,
          ins.nombre_completo as inspector_nombre,
          cmd.nombre_completo as comandante_nombre
        FROM inspeccion_360 i
        JOIN unidad u ON i.unidad_id = u.id
        JOIN usuario ins ON i.realizado_por = ins.id
        LEFT JOIN usuario cmd ON i.aprobado_por = cmd.id
        WHERE i.unidad_id = $1
          AND i.fecha_realizacion >= CURRENT_DATE - $2::int
        ORDER BY i.fecha_realizacion DESC
        LIMIT $3
      `, [unidadId, dias, limite]);

      res.json({
        inspecciones: inspecciones.map(i => ({
          id: i.id,
          fecha: i.fecha_realizacion,
          estado: i.estado,
          inspector: i.inspector_nombre,
          comandante: i.comandante_nombre,
          pdf_url: `/api/inspeccion360/${i.id}/pdf`
        })),
        meta: {
          dias_consultados: dias,
          limite_aplicado: limite,
          total_encontrados: inspecciones.length
        }
      });
    } catch (error: any) {
      console.error('Error al listar PDFs:', error);
      res.status(500).json({ error: 'Error al listar PDFs' });
    }
  }
};
