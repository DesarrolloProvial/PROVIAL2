import { Request, Response } from 'express';
import { SituacionModel } from '../../models/cop/situacion.model';
import { ActividadModel } from '../../models/cop/actividad.model';
import { normalizeId } from '../../utils/db.utils';

// ========================================
// LISTADOS
// ========================================

export async function listSituaciones(req: Request, res: Response) {
  try {
    const list = await SituacionModel.list(req.query);
    return res.json({ situaciones: list, count: list.length });
  } catch (error) {
    console.error('listSituaciones:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function listSituacionesActivas(req: Request, res: Response) {
  try {
    const { unidad_id } = req.query;
    let uid: number | undefined;
    if (unidad_id) {
      const parsed = normalizeId(unidad_id as string);
      if (!parsed) return res.status(400).json({ error: 'unidad_id inválido' });
      uid = parsed;
    }
    const activas = await SituacionModel.listarActivas(uid);
    return res.json({ situaciones: activas });
  } catch (error) {
    console.error('listSituacionesActivas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// MI UNIDAD HOY (app móvil)
// ========================================

export async function getMiUnidadHoy(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;

    // 1. Query param directo (móvil puede enviarlo)
    let unidadId: number | null = normalizeId(req.query.unidad_id as string);

    // 2. Turno activo de hoy
    if (!unidadId) {
      try {
        unidadId = await SituacionModel.getUnidadIdDesdeTurno(userId);
      } catch { /* silencioso */ }
    }

    // 3. Fallback: última situación del usuario
    if (!unidadId) {
      try {
        unidadId = await SituacionModel.getUnidadIdDesdeUltimaSituacion(userId);
      } catch { /* silencioso */ }
    }

    if (!unidadId) return res.json({ situaciones: [], situacion_activa: null });

    const list = await SituacionModel.getMiUnidadHoy(unidadId);

    // Buscar situación activa desde cache situacion_actual
    let situacionActiva: any = null;
    try {
      const situacionIdActiva = await SituacionModel.getSituacionIdActiva(unidadId);
      if (situacionIdActiva) {
        situacionActiva = list.find((s: any) => s.id === situacionIdActiva) || null;

        // Situación activa de otro día (no está en la lista de hoy)
        if (!situacionActiva) {
          situacionActiva = await SituacionModel.getSituacionConMultimedia(situacionIdActiva);
        }
      }
    } catch (e) {
      console.warn('[getMiUnidadHoy] Error buscando situacion activa:', e);
    }

    if (!situacionActiva) {
      situacionActiva = list.find((s: any) => s.estado === 'ACTIVA') || null;
    }

    let actividadActiva: any = null;
    let actividadesHoy: any[] = [];
    try {
      actividadesHoy  = await ActividadModel.getByUnidadHoy(unidadId);
      actividadActiva = actividadesHoy.find((a: any) => a.estado === 'ACTIVA') || null;
    } catch (e) {
      console.warn('[getMiUnidadHoy] Error buscando actividades:', e);
    }

    return res.json({
      situaciones:     list,
      situacion_activa:situacionActiva,
      actividades:     actividadesHoy,
      actividad_activa:actividadActiva,
    });
  } catch (error) {
    console.error('getMiUnidadHoy:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// MAPA / BITÁCORA / HEATMAP / RESUMEN
// ========================================

export async function getMapaSituaciones(_req: Request, res: Response) {
  const list = await SituacionModel.getUltimaSituacionPorUnidad();
  return res.json({ unidades: list });
}

export async function getBitacoraUnidad(req: Request, res: Response) {
  try {
    const unidadId = normalizeId(req.params.unidad_id);
    if (!unidadId) return res.status(400).json({ error: 'ID inválido' });
    const list = await SituacionModel.getBitacoraUnidad(unidadId, req.query);
    return res.json({ bitacora: list });
  } catch (error) {
    console.error('Error en getBitacoraUnidad:', error);
    return res.status(500).json({ error: 'Error al cargar bitácora' });
  }
}

export async function getHeatmapData(req: Request, res: Response) {
  try {
    const dias = Math.min(parseInt(req.query.dias as string) || 30, 365);
    const tipo = req.query.tipo as string | undefined;
    const points = await SituacionModel.getHeatmap(dias, tipo);
    return res.json({ points });
  } catch (error) {
    console.error('getHeatmapData:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getResumenUnidades(_req: Request, res: Response) {
  try {
    const resumen = await SituacionModel.getResumen();
    return res.json({ resumen });
  } catch (error) {
    console.error('getResumenUnidades:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// CATÁLOGOS
// ========================================

export async function getTiposSituacion(_req: Request, res: Response) {
  const tipos = [
    { id: 10,  codigo: 'SALIDA_SEDE',         nombre: 'Salida de Sede' },
    { id: 20,  codigo: 'PATRULLAJE',           nombre: 'Patrullaje' },
    { id: 30,  codigo: 'CAMBIO_RUTA',          nombre: 'Cambio de Ruta' },
    { id: 40,  codigo: 'PARADA_ESTRATEGICA',   nombre: 'Parada Estratégica' },
    { id: 50,  codigo: 'COMIDA',               nombre: 'Comida' },
    { id: 60,  codigo: 'DESCANSO',             nombre: 'Descanso' },
    { id: 70,  codigo: 'INCIDENTE',            nombre: 'Hecho de Tránsito' },
    { id: 80,  codigo: 'REGULACION_TRAFICO',   nombre: 'Regulación de Tráfico' },
    { id: 90,  codigo: 'ASISTENCIA_VEHICULAR', nombre: 'Asistencia Vehicular' },
    { id: 100, codigo: 'EMERGENCIA',           nombre: 'Emergencia' },
    { id: 110, codigo: 'OTROS',                nombre: 'Otros' },
  ];
  return res.json({ tipos });
}

export async function getCatalogo(_req: Request, res: Response) {
  try {
    return res.json(await SituacionModel.getCatalogo());
  } catch (error) {
    console.error('getCatalogo:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getCatalogosAuxiliares(_req: Request, res: Response) {
  try {
    return res.json(await SituacionModel.getCatalogosAuxiliares());
  } catch (error) {
    console.error('getCatalogosAuxiliares:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
