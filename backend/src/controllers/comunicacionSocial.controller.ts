import { Request, Response } from 'express';
import { ComunicacionSocialModel } from '../models/comunicacionSocial.model';

// ============================================
// CONTROLADOR DE COMUNICACIÓN SOCIAL
// ============================================

export const ComunicacionSocialController = {
  // ============================================
  // PLANTILLAS
  // ============================================

  /**
   * Crear plantilla de comunicación
   * POST /api/comunicacion-social/plantillas
   */
  async crearPlantilla(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).user.userId;
      const data = req.body;

      if (!data.nombre || !data.contenido_plantilla) {
        return res.status(400).json({
          error: 'nombre y contenido_plantilla son requeridos'
        });
      }

      const id = await ComunicacionSocialModel.crearPlantilla({
        ...data,
        creado_por: usuarioId
      });

      res.status(201).json({
        message: 'Plantilla creada',
        id
      });
    } catch (error) {
      console.error('Error creando plantilla:', error);
      res.status(500).json({ error: 'Error al crear plantilla' });
    }
  },

  /**
   * Actualizar plantilla
   * PUT /api/comunicacion-social/plantillas/:id
   */
  async actualizarPlantilla(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);

      await ComunicacionSocialModel.actualizarPlantilla(id, req.body);

      res.json({ message: 'Plantilla actualizada' });
    } catch (error: any) {
      console.error('Error actualizando plantilla:', error);
      if (error.message?.includes('predefinida')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Error al actualizar plantilla' });
    }
  },

  /**
   * Eliminar plantilla
   * DELETE /api/comunicacion-social/plantillas/:id
   */
  async eliminarPlantilla(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);

      await ComunicacionSocialModel.eliminarPlantilla(id);

      res.json({ message: 'Plantilla eliminada' });
    } catch (error: any) {
      console.error('Error eliminando plantilla:', error);
      if (error.message?.includes('predefinida')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Error al eliminar plantilla' });
    }
  },

  /**
   * Obtener plantilla por ID
   * GET /api/comunicacion-social/plantillas/:id
   */
  async obtenerPlantilla(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const plantilla = await ComunicacionSocialModel.obtenerPlantilla(id);

      if (!plantilla) {
        return res.status(404).json({ error: 'Plantilla no encontrada' });
      }

      res.json(plantilla);
    } catch (error) {
      console.error('Error obteniendo plantilla:', error);
      res.status(500).json({ error: 'Error al obtener plantilla' });
    }
  },

  /**
   * Listar plantillas
   * GET /api/comunicacion-social/plantillas
   */
  async listarPlantillas(req: Request, res: Response) {
    try {
      const { tipo_situacion, tipo_accidente, incluir_inactivas } = req.query;

      const plantillas = await ComunicacionSocialModel.listarPlantillas({
        tipo_situacion: tipo_situacion as string,
        tipo_accidente: tipo_accidente as string,
        solo_activas: incluir_inactivas !== 'true'
      });

      res.json(plantillas);
    } catch (error) {
      console.error('Error listando plantillas:', error);
      res.status(500).json({ error: 'Error al listar plantillas' });
    }
  },

  /**
   * Previsualizar mensaje generado desde plantilla
   * POST /api/comunicacion-social/plantillas/:id/preview
   */
  async previewPlantilla(req: Request, res: Response) {
    try {
      const plantillaId = parseInt(req.params.id);
      const { situacion_id } = req.body;

      if (!situacion_id) {
        return res.status(400).json({ error: 'situacion_id es requerido' });
      }

      const mensaje = await ComunicacionSocialModel.generarMensaje(plantillaId, situacion_id);

      if (!mensaje) {
        return res.status(404).json({ error: 'No se pudo generar el mensaje' });
      }

      // Obtener fotos de la situación
      const fotos = await ComunicacionSocialModel.obtenerFotosSituacion(situacion_id);

      // Obtener hashtags de la plantilla
      const plantilla = await ComunicacionSocialModel.obtenerPlantilla(plantillaId);

      res.json({
        mensaje,
        hashtags: plantilla?.hashtags || [],
        fotos
      });
    } catch (error) {
      console.error('Error previsualizando:', error);
      res.status(500).json({ error: 'Error al previsualizar mensaje' });
    }
  },

  // ============================================
  // PUBLICACIONES
  // ============================================

  /**
   * Crear publicación
   * POST /api/comunicacion-social/publicaciones
   */
  async crearPublicacion(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).user.userId;
      const data = req.body;

      if (!data.contenido_texto) {
        return res.status(400).json({ error: 'contenido_texto es requerido' });
      }

      const id = await ComunicacionSocialModel.crearPublicacion({
        ...data,
        publicado_por: usuarioId
      });

      res.status(201).json({
        message: 'Publicación creada',
        id
      });
    } catch (error) {
      console.error('Error creando publicación:', error);
      res.status(500).json({ error: 'Error al crear publicación' });
    }
  },

  /**
   * Crear publicación desde plantilla
   * POST /api/comunicacion-social/publicaciones/desde-plantilla
   */
  async crearDesePlantilla(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).user.userId;
      const { plantilla_id, situacion_id, fotos_urls, edicion } = req.body;

      if (!plantilla_id || !situacion_id) {
        return res.status(400).json({
          error: 'plantilla_id y situacion_id son requeridos'
        });
      }

      // Generar mensaje
      const mensaje = await ComunicacionSocialModel.generarMensaje(plantilla_id, situacion_id);
      if (!mensaje) {
        return res.status(400).json({ error: 'No se pudo generar el mensaje' });
      }

      // Obtener plantilla para hashtags
      const plantilla = await ComunicacionSocialModel.obtenerPlantilla(plantilla_id);

      // Crear publicación
      const id = await ComunicacionSocialModel.crearPublicacion({
        situacion_id,
        plantilla_id,
        contenido_texto: mensaje,
        contenido_editado: edicion || null,
        hashtags: plantilla?.hashtags || [],
        fotos_urls: fotos_urls || [],
        publicado_por: usuarioId,
        estado: 'BORRADOR'
      });

      res.status(201).json({
        message: 'Publicación creada desde plantilla',
        id,
        contenido: edicion || mensaje
      });
    } catch (error) {
      console.error('Error creando publicación:', error);
      res.status(500).json({ error: 'Error al crear publicación' });
    }
  },

  /**
   * Actualizar publicación
   * PUT /api/comunicacion-social/publicaciones/:id
   */
  async actualizarPublicacion(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      await ComunicacionSocialModel.actualizarPublicacion(id, req.body);

      res.json({ message: 'Publicación actualizada' });
    } catch (error) {
      console.error('Error actualizando publicación:', error);
      res.status(500).json({ error: 'Error al actualizar publicación' });
    }
  },

  /**
   * Obtener publicación por ID
   * GET /api/comunicacion-social/publicaciones/:id
   */
  async obtenerPublicacion(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const publicacion = await ComunicacionSocialModel.obtenerPublicacion(id);

      if (!publicacion) {
        return res.status(404).json({ error: 'Publicación no encontrada' });
      }

      res.json(publicacion);
    } catch (error) {
      console.error('Error obteniendo publicación:', error);
      res.status(500).json({ error: 'Error al obtener publicación' });
    }
  },

  /**
   * Listar publicaciones
   * GET /api/comunicacion-social/publicaciones
   */
  async listarPublicaciones(req: Request, res: Response) {
    try {
      const { situacion_id, estado, fecha_desde, fecha_hasta, limit, offset } = req.query;

      const publicaciones = await ComunicacionSocialModel.listarPublicaciones({
        situacion_id: situacion_id ? parseInt(situacion_id as string) : undefined,
        estado: estado as string,
        fecha_desde: fecha_desde as string,
        fecha_hasta: fecha_hasta as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0
      });

      res.json(publicaciones);
    } catch (error) {
      console.error('Error listando publicaciones:', error);
      res.status(500).json({ error: 'Error al listar publicaciones' });
    }
  },

  /**
   * Obtener publicaciones de una situación
   * GET /api/comunicacion-social/publicaciones/situacion/:situacionId
   */
  async obtenerPublicacionesSituacion(req: Request, res: Response) {
    try {
      const situacionId = parseInt(req.params.situacionId);
      const publicaciones = await ComunicacionSocialModel.obtenerPublicacionesSituacion(situacionId);

      res.json(publicaciones);
    } catch (error) {
      console.error('Error obteniendo publicaciones:', error);
      res.status(500).json({ error: 'Error al obtener publicaciones' });
    }
  },

  /**
   * Marcar publicación como compartida en red social
   * POST /api/comunicacion-social/publicaciones/:id/compartido
   */
  async marcarCompartido(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { red } = req.body;

      const redesValidas = ['facebook', 'twitter', 'instagram', 'whatsapp', 'threads'];
      if (!redesValidas.includes(red)) {
        return res.status(400).json({
          error: `Red inválida. Valores permitidos: ${redesValidas.join(', ')}`
        });
      }

      await ComunicacionSocialModel.marcarPublicado(id, red);

      res.json({ message: `Marcado como compartido en ${red}` });
    } catch (error) {
      console.error('Error marcando compartido:', error);
      res.status(500).json({ error: 'Error al marcar como compartido' });
    }
  },

  /**
   * Obtener links para compartir en redes sociales
   * GET /api/comunicacion-social/publicaciones/:id/compartir
   */
  async obtenerLinksCompartir(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const publicacion = await ComunicacionSocialModel.obtenerPublicacion(id);

      if (!publicacion) {
        return res.status(404).json({ error: 'Publicación no encontrada' });
      }

      const contenido = publicacion.contenido_editado || publicacion.contenido_texto;
      const links = ComunicacionSocialModel.generarLinksCompartir(
        contenido,
        publicacion.hashtags || [],
        publicacion.fotos_urls || []
      );

      // Preparar datos para compartir en móvil (API nativa)
      const datosMovil = ComunicacionSocialModel.prepararDatosCompartir(
        publicacion,
        publicacion.fotos_urls || []
      );

      res.json({
        links,
        movil: datosMovil,
        contenido_final: contenido,
        hashtags: publicacion.hashtags,
        fotos: publicacion.fotos_urls
      });
    } catch (error) {
      console.error('Error obteniendo links:', error);
      res.status(500).json({ error: 'Error al obtener links de compartir' });
    }
  },

  /**
   * Obtener fotos de una situación
   * GET /api/comunicacion-social/fotos/situacion/:situacionId
   */
  async obtenerFotosSituacion(req: Request, res: Response) {
    try {
      const situacionId = parseInt(req.params.situacionId);
      const fotos = await ComunicacionSocialModel.obtenerFotosSituacion(situacionId);

      res.json(fotos);
    } catch (error) {
      console.error('Error obteniendo fotos:', error);
      res.status(500).json({ error: 'Error al obtener fotos' });
    }
  },

  /**
   * Obtener variables disponibles para plantillas
   * GET /api/comunicacion-social/plantillas/variables
   */
  async obtenerVariables(_req: Request, res: Response) {
    try {
      res.json({
        variables: [
          { codigo: '{fecha}', descripcion: 'Fecha del reporte (DD/MM/YYYY)' },
          { codigo: '{hora}', descripcion: 'Hora del reporte (HH:MM)' },
          { codigo: '{ubicacion}', descripcion: 'Ubicación (km y sentido)' },
          { codigo: '{municipio}', descripcion: 'Nombre del municipio' },
          { codigo: '{departamento}', descripcion: 'Nombre del departamento' },
          { codigo: '{tipo}', descripcion: 'Tipo de situación' },
          { codigo: '{descripcion}', descripcion: 'Descripción de la situación' },
          { codigo: '{heridos}', descripcion: 'Número de personas heridas' },
          { codigo: '{fallecidos}', descripcion: 'Número de personas fallecidas' },
          { codigo: '{vehiculos}', descripcion: 'Número de vehículos involucrados' },
          { codigo: '{tipo_accidente}', descripcion: 'Tipo de accidente (solo accidentología)' },
          { codigo: '{km}', descripcion: 'Kilómetro específico del accidente' }
        ],
        ejemplo: 'Accidente en {ubicacion}, {municipio}. Heridos: {heridos}'
      });
    } catch (error) {
      console.error('Error obteniendo variables:', error);
      res.status(500).json({ error: 'Error al obtener variables' });
    }
  }
};

export default ComunicacionSocialController;
