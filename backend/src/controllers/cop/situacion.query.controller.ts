import { Request, Response } from 'express';
import { SituacionModel } from '../../models/cop/situacion.model';
import { ActividadModel } from '../../models/cop/actividad.model';
import { db } from '../../config/database';
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
    let query = `
      SELECT s.*, u.codigo as unidad_codigo, r.codigo as ruta_codigo
      FROM situacion s
      LEFT JOIN unidad u ON s.unidad_id = u.id
      LEFT JOIN ruta r ON s.ruta_id = r.id
      WHERE s.estado = 'ACTIVA'
    `;
    const params: any[] = [];
    if (unidad_id) {
      const uid = normalizeId(unidad_id as string);
      if (!uid) return res.status(400).json({ error: 'unidad_id inválido' });
      query += ` AND s.unidad_id = $1`;
      params.push(uid);
    }
    query += ` ORDER BY s.created_at DESC`;
    const activas = await db.manyOrNone(query, params);
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
        const tt = await db.oneOrNone(
          `SELECT au.unidad_id FROM tripulacion_turno tt
           JOIN asignacion_unidad au ON tt.asignacion_id = au.id
           JOIN turno t ON au.turno_id = t.id
           WHERE tt.usuario_id = $1 AND t.fecha = CURRENT_DATE
           ORDER BY tt.created_at DESC LIMIT 1`,
          [userId]
        );
        if (tt) unidadId = tt.unidad_id;
      } catch { /* silencioso */ }
    }

    // 3. Fallback: última situación del usuario
    if (!unidadId) {
      try {
        const s = await db.oneOrNone(
          'SELECT unidad_id FROM situacion WHERE creado_por = $1 ORDER BY created_at DESC LIMIT 1',
          [userId]
        );
        if (s) unidadId = s.unidad_id;
      } catch { /* silencioso */ }
    }

    if (!unidadId) return res.json({ situaciones: [], situacion_activa: null });

    const list = await SituacionModel.getMiUnidadHoy(unidadId);

    // Buscar situación activa desde cache situacion_actual
    let situacionActiva: any = null;
    try {
      const cache = await db.oneOrNone(
        "SELECT situacion_id FROM situacion_actual WHERE unidad_id = $1 AND estado = 'ACTIVA'",
        [unidadId]
      );
      if (cache?.situacion_id) {
        situacionActiva = list.find((s: any) => s.id === cache.situacion_id) || null;

        // Situación activa de otro día (no está en la lista de hoy)
        if (!situacionActiva) {
          situacionActiva = await db.oneOrNone(`
            SELECT s.*,
              r.codigo as ruta_codigo, r.nombre as ruta_nombre,
              tsc.nombre as tipo_situacion_nombre, tsc.categoria as tipo_situacion_categoria,
              s.tipo_pavimento as material_via,
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', sm.id, 'tipo', sm.tipo, 'orden', sm.orden,
                  'url', sm.url_original, 'thumbnail', sm.url_thumbnail,
                  'infografia_numero', sm.infografia_numero,
                  'infografia_titulo', sm.infografia_titulo
                ) ORDER BY sm.infografia_numero, sm.tipo, sm.orden)
                FROM situacion_multimedia sm WHERE sm.situacion_id = s.id),
                '[]'
              ) as multimedia,
              (SELECT COUNT(*) FROM situacion_multimedia WHERE situacion_id = s.id AND tipo = 'FOTO') as total_fotos,
              (SELECT COUNT(*) FROM situacion_multimedia WHERE situacion_id = s.id AND tipo = 'VIDEO') as total_videos
            FROM situacion s
            LEFT JOIN ruta r ON s.ruta_id = r.id
            LEFT JOIN catalogo_tipo_situacion tsc ON s.tipo_situacion_id = tsc.id
            WHERE s.id = $1
          `, [cache.situacion_id]);
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

    const points = await db.manyOrNone(
      `SELECT latitud, longitud,
              CASE tipo_situacion
                WHEN 'INCIDENTE'  THEN 3
                WHEN 'EMERGENCIA' THEN 2
                ELSE 1
              END AS peso
       FROM situacion
       WHERE latitud IS NOT NULL AND longitud IS NOT NULL
         AND created_at > NOW() - ($1 || ' days')::INTERVAL
         ${tipo ? `AND tipo_situacion = $2` : ''}
       LIMIT 2000`,
      tipo ? [dias, tipo] : [dias]
    );

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
    const tipos = await db.manyOrNone(`
      SELECT id, categoria, nombre, icono, color, formulario_tipo
      FROM catalogo_tipo_situacion
      WHERE activo = true
        AND categoria NOT IN ('HECHO_TRANSITO', 'ASISTENCIA', 'EMERGENCIA')
      ORDER BY categoria, nombre
    `);

    const categoriaNombres: Record<string, string> = {
      OPERATIVO:     'Operativo',
      APOYO:         'Apoyo',
      ADMINISTRATIVO:'Administrativo',
    };

    const categoriasMap = new Map<string, any>();
    for (const tipo of tipos) {
      if (!categoriasMap.has(tipo.categoria)) {
        categoriasMap.set(tipo.categoria, {
          id:     tipo.categoria,
          codigo: tipo.categoria,
          nombre: categoriaNombres[tipo.categoria] || tipo.categoria,
          tipos:  [],
        });
      }
      categoriasMap.get(tipo.categoria).tipos.push({
        id:             tipo.id,
        nombre:         tipo.nombre,
        icono:          tipo.icono,
        color:          tipo.color,
        formulario_tipo:tipo.formulario_tipo,
      });
    }

    return res.json(Array.from(categoriasMap.values()));
  } catch (error) {
    console.error('getCatalogo:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getCatalogosAuxiliares(_req: Request, res: Response) {
  try {
    const [tipos_hecho, tipos_asistencia, tipos_emergencia, tipos_vehiculo, marcas_vehiculo, etnias] =
      await Promise.all([
        db.manyOrNone("SELECT id, nombre, icono, color FROM catalogo_tipo_situacion WHERE categoria = 'HECHO_TRANSITO' AND activo = true ORDER BY nombre"),
        db.manyOrNone("SELECT id, nombre, icono, color FROM catalogo_tipo_situacion WHERE categoria = 'ASISTENCIA'     AND activo = true ORDER BY nombre"),
        db.manyOrNone("SELECT id, nombre, icono, color FROM catalogo_tipo_situacion WHERE categoria = 'EMERGENCIA'     AND activo = true ORDER BY nombre"),
        db.manyOrNone("SELECT id, nombre FROM tipo_vehiculo ORDER BY nombre"),
        db.manyOrNone("SELECT id, nombre FROM marca_vehiculo ORDER BY nombre"),
        db.manyOrNone("SELECT id, nombre FROM etnia WHERE activo = true ORDER BY nombre"),
      ]);

    let dispositivos_seguridad: any[] = [];
    let causas_hecho: any[] = [];
    try {
      dispositivos_seguridad = await db.manyOrNone("SELECT id, nombre FROM dispositivo_seguridad ORDER BY nombre");
    } catch { console.warn('dispositivo_seguridad table not found, skipping'); }
    try {
      causas_hecho = await db.manyOrNone("SELECT id, nombre FROM causa_hecho_transito WHERE activo = true ORDER BY nombre");
    } catch { console.warn('causa_hecho_transito table not found, skipping'); }

    return res.json({
      tipos_hecho, tipos_asistencia, tipos_emergencia,
      tipos_vehiculo, marcas_vehiculo, etnias,
      dispositivos_seguridad, causas_hecho,
    });
  } catch (error) {
    console.error('getCatalogosAuxiliares:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
