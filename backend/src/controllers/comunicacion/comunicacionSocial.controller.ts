import { Request, Response } from 'express';
import { ComunicacionSocialModel } from '../../models/comunicacion/comunicacionSocial.model';
import { EstadisticasService } from '../../services/accidentologia/estadisticas.service';
import { normalizeId } from '../../utils/db.utils';

const NOMBRE_MAX = 200;
const CONTENIDO_MAX = 5000;

// ============================================
// CONTROLADOR DE COMUNICACIÓN SOCIAL
// ============================================

export const ComunicacionSocialController = {
  // ============================================
  // PLANTILLAS
  // ============================================

  async crearPlantilla(req: Request, res: Response) {
    try {
      const usuarioId = req.user!.userId;
      const data = req.body;

      const nombre = (data.nombre ?? '').trim();
      const contenido = (data.contenido_plantilla ?? '').trim();

      if (!nombre || !contenido) {
        return res.status(400).json({ error: 'nombre y contenido_plantilla son requeridos' });
      }
      if (nombre.length > NOMBRE_MAX) {
        return res.status(400).json({ error: `nombre no puede superar ${NOMBRE_MAX} caracteres` });
      }
      if (contenido.length > CONTENIDO_MAX) {
        return res.status(400).json({ error: `contenido_plantilla no puede superar ${CONTENIDO_MAX} caracteres` });
      }

      const id = await ComunicacionSocialModel.crearPlantilla({
        ...data,
        nombre,
        contenido_plantilla: contenido,
        creado_por: usuarioId,
      });

      return res.status(201).json({ message: 'Plantilla creada', id });
    } catch (error) {
      console.error('Error creando plantilla:', error);
      return res.status(500).json({ error: 'Error al crear plantilla' });
    }
  },

  async actualizarPlantilla(req: Request, res: Response) {
    try {
      const id = normalizeId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });

      await ComunicacionSocialModel.actualizarPlantilla(id, req.body);

      return res.json({ message: 'Plantilla actualizada' });
    } catch (error) {
      console.error('Error actualizando plantilla:', error);
      if ((error as any).message?.includes('predefinida')) {
        return res.status(400).json({ error: (error as any).message });
      }
      return res.status(500).json({ error: 'Error al actualizar plantilla' });
    }
  },

  async eliminarPlantilla(req: Request, res: Response) {
    try {
      const id = normalizeId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });

      await ComunicacionSocialModel.eliminarPlantilla(id);

      return res.json({ message: 'Plantilla eliminada' });
    } catch (error) {
      console.error('Error eliminando plantilla:', error);
      if ((error as any).message?.includes('predefinida')) {
        return res.status(400).json({ error: (error as any).message });
      }
      return res.status(500).json({ error: 'Error al eliminar plantilla' });
    }
  },

  async obtenerPlantilla(req: Request, res: Response) {
    try {
      const id = normalizeId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });

      const plantilla = await ComunicacionSocialModel.obtenerPlantilla(id);

      if (!plantilla) {
        return res.status(404).json({ error: 'Plantilla no encontrada' });
      }

      return res.json(plantilla);
    } catch (error) {
      console.error('Error obteniendo plantilla:', error);
      return res.status(500).json({ error: 'Error al obtener plantilla' });
    }
  },

  async listarPlantillas(req: Request, res: Response) {
    try {
      const { tipo_situacion, tipo_accidente, incluir_inactivas } = req.query;

      const plantillas = await ComunicacionSocialModel.listarPlantillas({
        tipo_situacion: tipo_situacion as string,
        tipo_accidente: tipo_accidente as string,
        solo_activas: incluir_inactivas !== 'true',
      });

      return res.json(plantillas);
    } catch (error) {
      console.error('Error listando plantillas:', error);
      return res.status(500).json({ error: 'Error al listar plantillas' });
    }
  },

  async previewPlantilla(req: Request, res: Response) {
    try {
      const plantillaId = normalizeId(req.params.id);
      if (!plantillaId) return res.status(400).json({ error: 'ID inválido' });

      const { situacion_id } = req.body;
      if (!situacion_id) {
        return res.status(400).json({ error: 'situacion_id es requerido' });
      }

      const mensaje = await ComunicacionSocialModel.generarMensaje(plantillaId, situacion_id);
      if (!mensaje) {
        return res.status(404).json({ error: 'No se pudo generar el mensaje' });
      }

      const [fotos, plantilla] = await Promise.all([
        ComunicacionSocialModel.obtenerFotosSituacion(situacion_id),
        ComunicacionSocialModel.obtenerPlantilla(plantillaId),
      ]);

      return res.json({
        mensaje,
        hashtags: plantilla?.hashtags || [],
        fotos,
      });
    } catch (error) {
      console.error('Error previsualizando:', error);
      return res.status(500).json({ error: 'Error al previsualizar mensaje' });
    }
  },

  // ============================================
  // PUBLICACIONES
  // ============================================

  async crearPublicacion(req: Request, res: Response) {
    try {
      const usuarioId = req.user!.userId;
      const data = req.body;

      if (!data.contenido_texto?.trim()) {
        return res.status(400).json({ error: 'contenido_texto es requerido' });
      }

      const id = await ComunicacionSocialModel.crearPublicacion({
        ...data,
        publicado_por: usuarioId,
      });

      return res.status(201).json({ message: 'Publicación creada', id });
    } catch (error) {
      console.error('Error creando publicación:', error);
      return res.status(500).json({ error: 'Error al crear publicación' });
    }
  },

  async crearDesePlantilla(req: Request, res: Response) {
    try {
      const usuarioId = req.user!.userId;
      const { plantilla_id, situacion_id, fotos_urls, edicion } = req.body;

      if (!plantilla_id || !situacion_id) {
        return res.status(400).json({ error: 'plantilla_id y situacion_id son requeridos' });
      }

      const [mensaje, plantilla] = await Promise.all([
        ComunicacionSocialModel.generarMensaje(plantilla_id, situacion_id),
        ComunicacionSocialModel.obtenerPlantilla(plantilla_id),
      ]);

      if (!mensaje) {
        return res.status(400).json({ error: 'No se pudo generar el mensaje' });
      }

      const id = await ComunicacionSocialModel.crearPublicacion({
        situacion_id,
        plantilla_id,
        contenido_texto: mensaje,
        contenido_editado: edicion || null,
        hashtags: plantilla?.hashtags || [],
        fotos_urls: fotos_urls || [],
        publicado_por: usuarioId,
        estado: 'BORRADOR',
      });

      return res.status(201).json({
        message: 'Publicación creada desde plantilla',
        id,
        contenido: edicion || mensaje,
      });
    } catch (error) {
      console.error('Error creando publicación:', error);
      return res.status(500).json({ error: 'Error al crear publicación' });
    }
  },

  async actualizarPublicacion(req: Request, res: Response) {
    try {
      const id = normalizeId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });

      await ComunicacionSocialModel.actualizarPublicacion(id, req.body);

      return res.json({ message: 'Publicación actualizada' });
    } catch (error) {
      console.error('Error actualizando publicación:', error);
      return res.status(500).json({ error: 'Error al actualizar publicación' });
    }
  },

  async obtenerPublicacion(req: Request, res: Response) {
    try {
      const id = normalizeId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });

      const publicacion = await ComunicacionSocialModel.obtenerPublicacion(id);

      if (!publicacion) {
        return res.status(404).json({ error: 'Publicación no encontrada' });
      }

      return res.json(publicacion);
    } catch (error) {
      console.error('Error obteniendo publicación:', error);
      return res.status(500).json({ error: 'Error al obtener publicación' });
    }
  },

  async listarPublicaciones(req: Request, res: Response) {
    try {
      const { situacion_id, estado, fecha_desde, fecha_hasta, limit, offset } = req.query;

      const publicaciones = await ComunicacionSocialModel.listarPublicaciones({
        situacion_id: situacion_id ? normalizeId(situacion_id as string) ?? undefined : undefined,
        estado: estado as string,
        fecha_desde: fecha_desde as string,
        fecha_hasta: fecha_hasta as string,
        limit: limit ? Math.min(parseInt(limit as string, 10) || 50, 200) : 50,
        offset: offset ? parseInt(offset as string, 10) || 0 : 0,
      });

      return res.json(publicaciones);
    } catch (error) {
      console.error('Error listando publicaciones:', error);
      return res.status(500).json({ error: 'Error al listar publicaciones' });
    }
  },

  async obtenerPublicacionesSituacion(req: Request, res: Response) {
    try {
      const situacionId = normalizeId(req.params.situacionId);
      if (!situacionId) return res.status(400).json({ error: 'ID inválido' });

      const publicaciones = await ComunicacionSocialModel.obtenerPublicacionesSituacion(situacionId);

      return res.json(publicaciones);
    } catch (error) {
      console.error('Error obteniendo publicaciones:', error);
      return res.status(500).json({ error: 'Error al obtener publicaciones' });
    }
  },

  async marcarCompartido(req: Request, res: Response) {
    try {
      const id = normalizeId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });

      const { red } = req.body;
      const redesValidas = ['facebook', 'twitter', 'instagram', 'whatsapp', 'threads'];
      if (!redesValidas.includes(red)) {
        return res.status(400).json({
          error: `Red inválida. Valores permitidos: ${redesValidas.join(', ')}`,
        });
      }

      await ComunicacionSocialModel.marcarPublicado(id, red);

      return res.json({ message: `Marcado como compartido en ${red}` });
    } catch (error) {
      console.error('Error marcando compartido:', error);
      return res.status(500).json({ error: 'Error al marcar como compartido' });
    }
  },

  async obtenerLinksCompartir(req: Request, res: Response) {
    try {
      const id = normalizeId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });

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
      const datosMovil = ComunicacionSocialModel.prepararDatosCompartir(
        publicacion,
        publicacion.fotos_urls || []
      );

      return res.json({
        links,
        movil: datosMovil,
        contenido_final: contenido,
        hashtags: publicacion.hashtags,
        fotos: publicacion.fotos_urls,
      });
    } catch (error) {
      console.error('Error obteniendo links:', error);
      return res.status(500).json({ error: 'Error al obtener links de compartir' });
    }
  },

  async obtenerFotosSituacion(req: Request, res: Response) {
    try {
      const situacionId = normalizeId(req.params.situacionId);
      if (!situacionId) return res.status(400).json({ error: 'ID inválido' });

      const fotos = await ComunicacionSocialModel.obtenerFotosSituacion(situacionId);

      return res.json(fotos);
    } catch (error) {
      console.error('Error obteniendo fotos:', error);
      return res.status(500).json({ error: 'Error al obtener fotos' });
    }
  },

  async obtenerVariables(_req: Request, res: Response) {
    return res.json({
      variables: [
        { codigo: '{fecha}',         descripcion: 'Fecha del reporte (DD/MM/YYYY)' },
        { codigo: '{hora}',          descripcion: 'Hora del reporte (HH:MM)' },
        { codigo: '{ubicacion}',     descripcion: 'Ubicación (km y sentido)' },
        { codigo: '{municipio}',     descripcion: 'Nombre del municipio' },
        { codigo: '{departamento}',  descripcion: 'Nombre del departamento' },
        { codigo: '{tipo}',          descripcion: 'Tipo de situación' },
        { codigo: '{descripcion}',   descripcion: 'Descripción de la situación' },
        { codigo: '{heridos}',       descripcion: 'Número de personas heridas' },
        { codigo: '{fallecidos}',    descripcion: 'Número de personas fallecidas' },
        { codigo: '{vehiculos}',     descripcion: 'Número de vehículos involucrados' },
        { codigo: '{tipo_accidente}',descripcion: 'Tipo de accidente (solo accidentología)' },
        { codigo: '{km}',            descripcion: 'Kilómetro específico del accidente' },
      ],
      ejemplo: 'Accidente en {ubicacion}, {municipio}. Heridos: {heridos}',
    });
  },
};

// ============================================================
// ESTADÍSTICAS PARA COMUNICACIÓN SOCIAL
// Reutiliza EstadisticasService (mismo motor que /estadisticas)
// 3 paneles independientes: INCIDENTE, ASISTENCIA, EMERGENCIA
// ============================================================

export async function getEstadisticasComunicacion(req: Request, res: Response) {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const hace30 = new Date(Date.now() - 30 * 24 * 3600_000).toISOString().split('T')[0];
    const desde = (req.query.desde as string) || hace30;
    const hasta = (req.query.hasta as string) || hoy;

    const base = { fecha_inicio: desde, fecha_fin: hasta, origen_datos: 'ALL' };

    const [incidentes, asistencias, emergencias, porSubtipo] = await Promise.all([
      EstadisticasService.obtenerTodo({ ...base, tipo_situacion: 'INCIDENTE' }),
      EstadisticasService.obtenerTodo({ ...base, tipo_situacion: 'ASISTENCIA_ALL' }),
      EstadisticasService.obtenerTodo({ ...base, tipo_situacion: 'EMERGENCIA' }),
      ComunicacionSocialModel.getPorSubtipo(desde, hasta),
    ]);

    return res.json({
      success: true,
      desde,
      hasta,
      data: {
        incidentes:  { ...incidentes,  por_subtipo: porSubtipo.filter((r) => r.tipo_panel === 'INCIDENTE')  },
        asistencias: { ...asistencias, por_subtipo: porSubtipo.filter((r) => r.tipo_panel === 'ASISTENCIA') },
        emergencias: { ...emergencias, por_subtipo: porSubtipo.filter((r) => r.tipo_panel === 'EMERGENCIA') },
      },
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
    const [situaciones, actividades, unidades] = await Promise.all([
      ComunicacionSocialModel.getSnapshotSituaciones(),
      ComunicacionSocialModel.getSnapshotActividades(),
      ComunicacionSocialModel.getSnapshotUnidades(),
    ]);

    let fotosMap: Record<number, any[]> = {};
    if (situaciones.length > 0) {
      const ids = situaciones.map((s) => s.id);
      const fotos = await ComunicacionSocialModel.getFotosPorSituaciones(ids);
      fotos.forEach((f) => {
        if (!fotosMap[f.situacion_id]) fotosMap[f.situacion_id] = [];
        fotosMap[f.situacion_id].push(f);
      });
    }

    const situacionesConFotos = situaciones.map((s) => ({
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

// ============================================================
// ESTADO DE UNIDADES PARA BOLETÍN (por ruta, por unidad)
// ============================================================

export async function getEstadoUnidades(_req: Request, res: Response) {
  try {
    const [unidades, plantillas] = await Promise.all([
      ComunicacionSocialModel.getEstadoUnidadesDetalle(),
      ComunicacionSocialModel.getPlantillasActivas(),
    ]);

    const situacionIds = [...new Set(
      unidades.filter((u) => u.situacion_id).map((u) => u.situacion_id)
    )] as number[];

    let fotosMap: Record<number, any[]> = {};
    if (situacionIds.length > 0) {
      const fotos = await ComunicacionSocialModel.getFotosPorSituaciones(situacionIds);
      fotos.forEach((f) => {
        if (!fotosMap[f.situacion_id]) fotosMap[f.situacion_id] = [];
        fotosMap[f.situacion_id].push(f);
      });
    }

    const porRuta: Record<string, any[]> = {};
    unidades.forEach((u) => {
      const r = u.ruta_codigo;
      if (!porRuta[r]) porRuta[r] = [];
      porRuta[r].push({
        ...u,
        fotos: u.situacion_id ? (fotosMap[u.situacion_id] || []) : [],
      });
    });

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: { por_ruta: porRuta, plantillas },
    });
  } catch (error) {
    console.error('Error en getEstadoUnidades:', error);
    return res.status(500).json({ error: 'Error obteniendo estado de unidades' });
  }
}

export default ComunicacionSocialController;
