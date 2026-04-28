import { Request, Response } from 'express';
import { Inspeccion360Model } from '../../models/transportes/inspeccion360.model';
import { PDF360Service } from '../../services/transportes/pdf360.service';
import { normalizeId } from '../../utils/db.utils';

// ========================================
// CONTROLADOR: INSPECCIÓN 360
// ========================================

export const Inspeccion360Controller = {
  // ========================================
  // PLANTILLAS
  // ========================================

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
    } catch (error) {
      console.error('obtenerPlantilla:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async listarPlantillas(_req: Request, res: Response) {
    try {
      const plantillas = await Inspeccion360Model.obtenerPlantillasActivas();
      res.json({ plantillas });
    } catch (error) {
      console.error('listarPlantillas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async crearPlantilla(req: Request, res: Response) {
    try {
      const { tipo_unidad, nombre, descripcion, secciones } = req.body;
      const userId = req.user!.userId;

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
    } catch (error) {
      console.error('crearPlantilla:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async actualizarPlantilla(req: Request, res: Response) {
    try {
      const id = normalizeId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });

      const { nombre, descripcion, secciones } = req.body;
      const userId = req.user!.userId;

      const plantilla = await Inspeccion360Model.actualizarPlantilla(id, {
        nombre,
        descripcion,
        secciones,
        creado_por: userId
      });

      res.json(plantilla);
    } catch (error) {
      console.error('actualizarPlantilla:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // ========================================
  // INSPECCIONES
  // ========================================

  async crearInspeccion(req: Request, res: Response) {
    try {
      const {
        unidad_id,
        plantilla_id,
        respuestas,
        observaciones_inspector,
        firma_inspector,
        fotos,
        salida_id,
        danos
      } = req.body;
      const userId = req.user!.userId;

      if (!unidad_id || !plantilla_id || !respuestas) {
        return res.status(400).json({
          error: 'Faltan campos requeridos: unidad_id, plantilla_id, respuestas'
        });
      }

      const unidadIdFinal = normalizeId(unidad_id);
      const plantillaIdFinal = normalizeId(plantilla_id);
      if (!unidadIdFinal)    return res.status(400).json({ error: 'unidad_id inválido' });
      if (!plantillaIdFinal) return res.status(400).json({ error: 'plantilla_id inválido' });
      const salidaIdFinal = normalizeId(salida_id) ?? undefined;

      const plantilla = await Inspeccion360Model.obtenerPlantillaPorId(plantillaIdFinal);
      if (!plantilla) {
        return res.status(404).json({ error: 'Plantilla no encontrada' });
      }

      let fotosFinales = fotos || [];
      let respuestasFinales = [...(respuestas || [])];

      if (danos && Array.isArray(danos) && danos.length > 0) {
        danos.forEach((dano: any) => {
          if (dano.fotos && Array.isArray(dano.fotos)) {
            dano.fotos.forEach((fotoUrl: string) => {
              if (fotoUrl && !fotoUrl.startsWith('file://')) {
                fotosFinales.push(fotoUrl);
              }
            });
          }
        });

        respuestasFinales.push({
          codigo: 'DANOS_REPORTADOS',
          valor: danos.length,
          observacion: JSON.stringify(danos)
        });

        console.log(`[INSPECCION360] Procesados ${danos.length} daños con ${fotosFinales.length} fotos`);
      }

      const existePendiente = await Inspeccion360Model.obtenerInspeccionPendienteUnidad(unidadIdFinal);
      if (existePendiente) {
        return res.status(400).json({
          error: 'Ya existe una inspección pendiente para esta unidad',
          inspeccion_id: existePendiente.id
        });
      }

      const esComandante = await Inspeccion360Model.esComandante(userId, unidadIdFinal);

      const inspeccion = await Inspeccion360Model.crearInspeccion({
        salida_id: salidaIdFinal,
        unidad_id: unidadIdFinal,
        plantilla_id: plantillaIdFinal,
        realizado_por: userId,
        respuestas: respuestasFinales,
        observaciones_inspector,
        firma_inspector,
        fotos: fotosFinales.length > 0 ? fotosFinales : undefined
      });

      if (esComandante) {
        await Inspeccion360Model.aprobarInspeccion(
          inspeccion.id,
          userId,
          firma_inspector,
          'Auto-aprobada (realizada por comandante)'
        );
        (inspeccion as any).estado = 'APROBADA';
        (inspeccion as any).mensaje = 'Inspección aprobada automáticamente (comandante)';
      }

      res.status(201).json(inspeccion);
    } catch (error) {
      console.error('crearInspeccion:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async obtenerInspeccion(req: Request, res: Response) {
    try {
      const id = normalizeId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });

      const inspeccion = await Inspeccion360Model.obtenerInspeccionPorId(id);

      if (!inspeccion) {
        return res.status(404).json({ error: 'Inspección no encontrada' });
      }

      res.json(inspeccion);
    } catch (error) {
      console.error('obtenerInspeccion:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async obtenerInspeccionDeSalida(req: Request, res: Response) {
    try {
      const salidaId = normalizeId(req.params.salidaId);
      if (!salidaId) return res.status(400).json({ error: 'ID inválido' });

      const inspeccion = await Inspeccion360Model.obtenerInspeccionPorSalida(salidaId);

      if (!inspeccion) {
        return res.status(404).json({ error: 'No hay inspección para esta salida' });
      }

      res.json(inspeccion);
    } catch (error) {
      console.error('obtenerInspeccionDeSalida:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async obtenerInspeccionPendiente(req: Request, res: Response) {
    try {
      const unidadId = normalizeId(req.params.unidadId);
      if (!unidadId) return res.status(400).json({ error: 'ID inválido' });

      const inspeccion = await Inspeccion360Model.obtenerInspeccionPendienteUnidad(unidadId);

      if (!inspeccion) {
        return res.status(404).json({ error: 'No hay inspección pendiente' });
      }

      res.json(inspeccion);
    } catch (error) {
      console.error('obtenerInspeccionPendiente:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async actualizarInspeccion(req: Request, res: Response) {
    try {
      const id = normalizeId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });

      const { respuestas, observaciones_inspector, firma_inspector, fotos } = req.body;

      const inspeccion = await Inspeccion360Model.actualizarInspeccion(id, {
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
    } catch (error) {
      console.error('actualizarInspeccion:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async aprobarInspeccion(req: Request, res: Response) {
    try {
      const id = normalizeId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });

      const { firma, observaciones } = req.body;
      const userId = req.user!.userId;

      const resultado = await Inspeccion360Model.aprobarInspeccion(id, userId, firma, observaciones);

      if (!resultado.success) {
        return res.status(400).json({ error: resultado.mensaje });
      }

      res.json({ mensaje: resultado.mensaje });
    } catch (error) {
      console.error('aprobarInspeccion:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async rechazarInspeccion(req: Request, res: Response) {
    try {
      const id = normalizeId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });

      const { motivo } = req.body;
      const userId = req.user!.userId;

      if (!motivo) {
        return res.status(400).json({ error: 'Debe proporcionar un motivo de rechazo' });
      }

      const resultado = await Inspeccion360Model.rechazarInspeccion(id, userId, motivo);

      if (!resultado.success) {
        return res.status(400).json({ error: resultado.mensaje });
      }

      res.json({ mensaje: resultado.mensaje });
    } catch (error) {
      console.error('rechazarInspeccion:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async listarPendientes(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const userRol = req.user!.rol;

      const comandanteId = ['SUPER_ADMIN', 'ADMIN', 'OPERACIONES', 'TRANSPORTES'].includes(userRol ?? '')
        ? undefined
        : userId;

      const inspecciones = await Inspeccion360Model.obtenerInspeccionesPendientes(comandanteId);

      res.json({ inspecciones });
    } catch (error) {
      console.error('listarPendientes:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async obtenerHistorial(req: Request, res: Response) {
    try {
      const unidadId = normalizeId(req.params.unidadId);
      if (!unidadId) return res.status(400).json({ error: 'ID inválido' });

      const limit = parseInt(req.query.limit as string) || 20;

      const historial = await Inspeccion360Model.obtenerHistorialUnidad(unidadId, limit);

      res.json({ historial });
    } catch (error) {
      console.error('obtenerHistorial:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // ========================================
  // COMANDANTE
  // ========================================

  async obtenerComandante(req: Request, res: Response) {
    try {
      const unidadId = normalizeId(req.params.unidadId);
      if (!unidadId) return res.status(400).json({ error: 'ID inválido' });

      const comandante = await Inspeccion360Model.obtenerComandante(unidadId);

      if (!comandante) {
        return res.status(404).json({ error: 'La unidad no tiene comandante asignado' });
      }

      res.json(comandante);
    } catch (error) {
      console.error('obtenerComandante:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async establecerComandante(req: Request, res: Response) {
    try {
      const unidadId = normalizeId(req.params.unidadId);
      if (!unidadId) return res.status(400).json({ error: 'ID inválido' });

      const { comandante_id } = req.body;

      if (!comandante_id) {
        return res.status(400).json({ error: 'Debe proporcionar comandante_id' });
      }

      const success = await Inspeccion360Model.establecerComandante(unidadId, comandante_id);

      if (!success) {
        return res.status(400).json({
          error: 'No se pudo establecer el comandante. Verifique que el usuario esté asignado a la unidad.'
        });
      }

      res.json({ mensaje: 'Comandante establecido correctamente' });
    } catch (error) {
      console.error('establecerComandante:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async verificarUnidad(req: Request, res: Response) {
    try {
      const unidadId = normalizeId(req.params.unidadId);
      if (!unidadId) return res.status(400).json({ error: 'ID de unidad inválido' });

      const userId = req.user!.userId;

      const [inspeccion, esComandante] = await Promise.all([
        Inspeccion360Model.obtenerEstadoInspeccionDia(unidadId),
        Inspeccion360Model.esComandante(userId, unidadId),
      ]);

      if (!inspeccion) {
        return res.json({
          tiene_inspeccion: false,
          es_comandante: esComandante,
          mensaje: 'No hay inspección 360 del día'
        });
      }

      res.json({
        tiene_inspeccion: true,
        es_comandante: esComandante,
        inspeccion: {
          id: inspeccion.id,
          estado: inspeccion.estado,
          fecha: inspeccion.fecha_realizacion,
          inspector: inspeccion.inspector_nombre,
          motivo_rechazo: inspeccion.motivo_rechazo
        }
      });
    } catch (error) {
      console.error('verificarUnidad:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async verificarSalida(req: Request, res: Response) {
    try {
      const salidaId = normalizeId(req.params.salidaId);
      if (!salidaId) return res.status(400).json({ error: 'ID inválido' });

      const resultado = await Inspeccion360Model.puedeIniciarSalida(salidaId);

      res.json(resultado);
    } catch (error) {
      console.error('verificarSalida:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // ========================================
  // ESTADÍSTICAS
  // ========================================

  async obtenerEstadisticas(req: Request, res: Response) {
    try {
      const { fecha_inicio, fecha_fin } = req.query;

      const fechaInicio = fecha_inicio ? new Date(fecha_inicio as string) : undefined;
      const fechaFin = fecha_fin ? new Date(fecha_fin as string) : undefined;

      const estadisticas = await Inspeccion360Model.obtenerEstadisticas(fechaInicio, fechaFin);

      res.json(estadisticas);
    } catch (error) {
      console.error('obtenerEstadisticas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // ========================================
  // PDF
  // ========================================

  async generarPDF(req: Request, res: Response) {
    try {
      const id = normalizeId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });

      const inspeccion = await Inspeccion360Model.obtenerInspeccionPorId(id);
      if (!inspeccion) {
        return res.status(404).json({ error: 'Inspección no encontrada' });
      }

      const plantilla = await Inspeccion360Model.obtenerPlantillaPorId(inspeccion.plantilla_id);
      if (!plantilla) {
        return res.status(404).json({ error: 'Plantilla no encontrada' });
      }

      const datosPDF = await Inspeccion360Model.obtenerDatosParaPDF(id);
      if (!datosPDF) return res.status(404).json({ error: 'Inspección no encontrada' });
      const { unidad, inspector, comandante } = datosPDF;

      const pdfData = await PDF360Service.prepararDatos(
        inspeccion,
        plantilla,
        unidad,
        inspector,
        comandante
      );

      const pdfStream = await PDF360Service.generarPDF(pdfData);

      const filename = `inspeccion_360_${unidad.codigo}_${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      pdfStream.pipe(res);
    } catch (error) {
      console.error('generarPDF:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async listarPDFsUnidad(req: Request, res: Response) {
    try {
      const unidadId = normalizeId(req.params.unidadId);
      if (!unidadId) return res.status(400).json({ error: 'ID de unidad inválido' });

      const diasRaw = parseInt(req.query.dias as string, 10);
      const limiteRaw = parseInt(req.query.limite as string, 10);
      const dias = Math.min(isNaN(diasRaw) ? 30 : diasRaw, 90);
      const limite = Math.min(isNaN(limiteRaw) ? 50 : limiteRaw, 100);

      const inspecciones = await Inspeccion360Model.listarParaPDFs(unidadId, dias, limite);

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
    } catch (error) {
      console.error('listarPDFsUnidad:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};
