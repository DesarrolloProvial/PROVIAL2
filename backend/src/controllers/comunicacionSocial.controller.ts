import { Request, Response } from 'express';
import { ComunicacionSocialModel } from '../models/comunicacionSocial.model';
import { db } from '../config/database';

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

// ============================================================
// ESTADÍSTICAS PARA COMUNICACIÓN SOCIAL (sin drill-down)
// ============================================================

export async function getEstadisticasComunicacion(req: Request, res: Response) {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const hace30 = new Date(Date.now() - 30 * 24 * 3600_000).toISOString().split('T')[0];
    const desde = (req.query.desde as string) || hace30;
    const hasta = (req.query.hasta as string) || hoy;

    // Totales por categoría + personas
    const kpis = await db.any(
      `SELECT
         tipo_situacion,
         COUNT(*)::int                                                   AS total,
         SUM(COALESCE(ilesos, 0))::int                                   AS ilesos,
         SUM(COALESCE(heridos_leves, 0))::int                            AS heridos_leves,
         SUM(COALESCE(heridos_graves, 0))::int                           AS heridos_graves,
         SUM(COALESCE(heridos_leves,0)+COALESCE(heridos_graves,0))::int  AS heridos,
         SUM(COALESCE(fallecidos, 0))::int                               AS fallecidos,
         SUM(COALESCE(trasladados, 0))::int                              AS trasladados
       FROM situacion
       WHERE tipo_situacion IN ('INCIDENTE','ASISTENCIA','EMERGENCIA')
         AND fecha_hora_aviso::date BETWEEN $1::date AND $2::date
       GROUP BY tipo_situacion`,
      [desde, hasta]
    );

    // Por ruta
    const porRuta = await db.any(
      `SELECT
         COALESCE(r.codigo, 'Sin ruta')  AS ruta,
         COALESCE(r.nombre, 'Sin ruta')  AS ruta_nombre,
         s.tipo_situacion,
         COUNT(*)::int                   AS total
       FROM situacion s
       LEFT JOIN ruta r ON s.ruta_id = r.id
       WHERE s.tipo_situacion IN ('INCIDENTE','ASISTENCIA','EMERGENCIA')
         AND s.fecha_hora_aviso::date BETWEEN $1::date AND $2::date
       GROUP BY r.codigo, r.nombre, s.tipo_situacion
       ORDER BY total DESC
       LIMIT 40`,
      [desde, hasta]
    );

    // Por subtipo
    const porSubtipo = await db.any(
      `SELECT
         s.tipo_situacion,
         COALESCE(cst.nombre, 'No especificado') AS subtipo,
         COUNT(*)::int                           AS total
       FROM situacion s
       LEFT JOIN catalogo_tipo_situacion cst ON s.tipo_situacion_id = cst.id
       WHERE s.tipo_situacion IN ('INCIDENTE','ASISTENCIA','EMERGENCIA')
         AND s.fecha_hora_aviso::date BETWEEN $1::date AND $2::date
       GROUP BY s.tipo_situacion, cst.nombre
       ORDER BY total DESC`,
      [desde, hasta]
    );

    // Por tipo de vehículo (solo INCIDENTE)
    const porVehiculo = await db.any(
      `SELECT
         COALESCE(tv.nombre, 'No especificado') AS tipo_vehiculo,
         COUNT(*)::int                           AS total
       FROM situacion s
       JOIN situacion_vehiculo sv ON s.id = sv.situacion_id
       JOIN vehiculo v             ON sv.vehiculo_id = v.id
       LEFT JOIN tipo_vehiculo tv  ON v.tipo_vehiculo_id = tv.id
       WHERE s.tipo_situacion = 'INCIDENTE'
         AND s.fecha_hora_aviso::date BETWEEN $1::date AND $2::date
       GROUP BY tv.nombre
       ORDER BY total DESC
       LIMIT 15`,
      [desde, hasta]
    );

    return res.json({
      success: true,
      desde, hasta,
      data: { kpis, por_ruta: porRuta, por_subtipo: porSubtipo, por_vehiculo: porVehiculo },
    });
  } catch (error) {
    console.error('Error en getEstadisticasComunicacion:', error);
    return res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
}

// ============================================================
// SNAPSHOT ESTADO ACTUAL (por ruta, sin datos privados)
// ============================================================

export async function getSnapshotActual(_req: Request, res: Response) {
  try {
    // Situaciones activas (campos limitados, sin vehiculos/causas/detalles privados)
    const situaciones = await db.any(
      `SELECT
         s.id,
         s.codigo_situacion,
         s.tipo_situacion,
         cst.nombre                       AS subtipo_nombre,
         s.estado,
         s.km,
         s.sentido,
         s.clima,
         s.carga_vehicular,
         s.observaciones,
         s.ilesos,
         s.heridos_leves,
         s.heridos_graves,
         s.fallecidos,
         s.trasladados,
         s.fecha_hora_aviso,
         s.fecha_hora_finalizacion,
         COALESCE(r.codigo, 'Sin ruta')   AS ruta_codigo,
         COALESCE(r.nombre, 'Sin ruta')   AS ruta_nombre,
         u.codigo                         AS unidad_codigo
       FROM situacion s
       LEFT JOIN ruta r                   ON s.ruta_id = r.id
       LEFT JOIN catalogo_tipo_situacion cst ON s.tipo_situacion_id = cst.id
       LEFT JOIN unidad u                 ON s.unidad_id = u.id
       WHERE s.estado = 'ACTIVA'
         AND s.tipo_situacion IN ('INCIDENTE','ASISTENCIA','EMERGENCIA')
       ORDER BY r.codigo NULLS LAST, s.fecha_hora_aviso DESC`
    );

    // Infografías de las situaciones activas (solo URLs)
    let fotos: any[] = [];
    if (situaciones.length > 0) {
      const ids = situaciones.map((s: any) => s.id);
      fotos = await db.any(
        `SELECT situacion_id, url_original, url_thumbnail, infografia_numero, orden
         FROM situacion_multimedia
         WHERE situacion_id = ANY($1::int[])
           AND tipo = 'FOTO' AND estado = 'SUBIDO'
         ORDER BY situacion_id, infografia_numero, orden`,
        [ids]
      );
    }

    // Actividades activas (sin campo datos JSONB)
    const actividades = await db.any(
      `SELECT
         a.id,
         cst.nombre                       AS tipo_nombre,
         a.km,
         a.sentido,
         a.clima,
         a.carga_vehicular,
         a.estado,
         a.created_at,
         COALESCE(r.codigo, 'Sin ruta')   AS ruta_codigo,
         COALESCE(r.nombre, 'Sin ruta')   AS ruta_nombre,
         u.codigo                         AS unidad_codigo,
         u.tipo_unidad
       FROM actividad a
       LEFT JOIN catalogo_tipo_situacion cst ON a.tipo_actividad_id = cst.id
       LEFT JOIN ruta r                   ON a.ruta_id = r.id
       LEFT JOIN unidad u                 ON a.unidad_id = u.id
       WHERE a.estado = 'ACTIVA'
       ORDER BY r.codigo NULLS LAST, a.created_at DESC`
    );

    // Unidades en salida activa
    const unidades = await db.any(
      `SELECT
         u.codigo,
         u.tipo_unidad,
         COALESCE(r.codigo, 'Sin ruta')   AS ruta_codigo,
         COALESCE(r.nombre, 'Sin ruta')   AS ruta_nombre,
         su.fecha_hora_salida,
         su.km_inicial
       FROM salida_unidad su
       JOIN  unidad u  ON su.unidad_id = u.id
       LEFT JOIN ruta r ON su.ruta_inicial_id = r.id
       WHERE su.estado = 'EN_SALIDA'
       ORDER BY r.codigo NULLS LAST, u.codigo`
    );

    // Adjuntar fotos a sus situaciones
    const fotosMap: Record<number, any[]> = {};
    fotos.forEach((f: any) => {
      if (!fotosMap[f.situacion_id]) fotosMap[f.situacion_id] = [];
      fotosMap[f.situacion_id].push(f);
    });
    const situacionesConFotos = situaciones.map((s: any) => ({
      ...s,
      fotos: fotosMap[s.id] || [],
    }));

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: { situaciones: situacionesConFotos, actividades, unidades },
    });
  } catch (error) {
    console.error('Error en getSnapshotActual:', error);
    return res.status(500).json({ error: 'Error obteniendo snapshot' });
  }
}

export default ComunicacionSocialController;
