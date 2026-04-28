import { db } from '../../config/database';
import { SituacionDetalleModel } from './situacionDetalle.model';
import { UbicacionBrigadaModel } from './ubicacionBrigada.model';

// ========================================
// INTERFACES
// ========================================

export type TipoSituacion =
  | 'SALIDA_SEDE'
  | 'PATRULLAJE'
  | 'CAMBIO_RUTA'
  | 'PARADA_ESTRATEGICA'
  | 'COMIDA'
  | 'DESCANSO'
  | 'INCIDENTE'
  | 'REGULACION_TRAFICO'
  | 'ASISTENCIA_VEHICULAR'
  | 'EMERGENCIA'
  | 'OTROS';

export type EstadoSituacion = 'ACTIVA' | 'CERRADA' | 'CANCELADA';

export interface Situacion {
  id: number;
  codigo_situacion: string; // ID Determinista
  tipo_situacion: TipoSituacion;
  tipo_situacion_id?: number | null;
  estado: EstadoSituacion;

  // Relaciones
  unidad_id?: number | null;
  salida_unidad_id?: number | null;
  turno_id?: number | null;
  asignacion_id?: number | null;
  ruta_id?: number | null;

  // Ubicación
  km?: number | null;
  sentido?: string | null;
  latitud?: number | null;
  longitud?: number | null;

  // Observaciones
  observaciones?: any[] | null;

  // Contexto
  clima?: string | null;
  carga_vehicular?: string | null;
  departamento_id?: number | null;
  municipio_id?: number | null;
  obstruccion_data?: any | null;

  // Campos adicionales
  origen?: string;
  area?: string | null;

  fecha_hora_aviso?: Date | null;
  fecha_hora_llegada?: Date | null;
  fecha_hora_finalizacion?: Date | null;

  // Víctimas (consolidado)
  heridos?: number;
  fallecidos?: number;

  tipo_pavimento?: string | null;
  iluminacion?: string | null;
  senalizacion?: string | null;
  visibilidad?: string | null;

  causa_probable?: string | null;
  causa_especificar?: string | null;

  danios_materiales?: boolean;
  danios_infraestructura?: boolean;
  danios_descripcion?: string | null;

  grupo?: number | null;

  // Acuerdo entre involucrados
  acuerdo_involucrados?: boolean | null;
  acuerdo_detalle?: string | null;

  // Conteos detallados
  ilesos?: number;
  heridos_leves?: number;
  heridos_graves?: number;
  trasladados?: number;
  fugados?: number;

  // Condiciones de vía
  via_estado?: string | null;
  via_topografia?: string | null;
  via_geometria?: string | null;
  via_peralte?: string | null;
  via_condicion?: string | null;

  // Import
  codigo_boleta?: string | null;
  origen_datos?: string;

  created_at: Date;
  updated_at: Date;
  creado_por: number;
  actualizado_por?: number | null;
}

export interface SituacionUpdateData {
  actualizado_por: number;
  km?: number | null;
  sentido?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  area?: string | null;
  tipo_pavimento?: string | null;
  clima?: string | null;
  carga_vehicular?: string | null;
  danios_materiales?: boolean;
  danios_infraestructura?: boolean;
  danios_descripcion?: string | null;
  obstruccion_data?: any;
  tipo_situacion_id?: number | null;
  heridos?: number;
  fallecidos?: number;
  causa_probable?: string | null;
  causa_especificar?: string | null;
  iluminacion?: string | null;
  senalizacion?: string | null;
  visibilidad?: string | null;
  via_estado?: string | null;
  ilesos?: number;
  heridos_leves?: number;
  heridos_graves?: number;
  trasladados?: number;
  fugados?: number;
  acuerdo_involucrados?: boolean | null;
  acuerdo_detalle?: string | null;
  departamento_id?: number | null;
  municipio_id?: number | null;
}

export interface SituacionCompleta extends Situacion {
  unidad_codigo?: string;
  ruta_nombre?: string;
  ruta_codigo?: string;
  sede_id?: number;
  sede_nombre?: string;
  creado_por_nombre?: string;
  actualizado_por_nombre?: string;
  departamento_nombre?: string | null;
  municipio_nombre?: string | null;
  // Campos del catálogo tipo_situacion_catalogo
  tipo_situacion_nombre?: string | null;
  tipo_situacion_categoria?: string | null;
}

// ========================================
// SITUACION MODEL
// ========================================

export const SituacionModel = {
  /**
   * Buscar situación por ID Determinista (codigo_situacion)
   */
  async findByCodigoSituacion(codigo: string): Promise<Situacion | null> {
    return db.oneOrNone('SELECT * FROM situacion WHERE codigo_situacion = $1', [codigo]);
  },

  /**
   * Obtener por ID
   */
  async getById(id: number): Promise<SituacionCompleta | null> {
    const query = `
      SELECT s.*,
        u.codigo as unidad_codigo,
        r.nombre as ruta_nombre, r.codigo as ruta_codigo,
        u.sede_id, se.nombre as sede_nombre,
        us1.nombre_completo as creado_por_nombre,
        us2.nombre_completo as actualizado_por_nombre,
        d.nombre as departamento_nombre,
        m.nombre as municipio_nombre
      FROM situacion s
      LEFT JOIN unidad u ON s.unidad_id = u.id
      LEFT JOIN ruta r ON s.ruta_id = r.id
      LEFT JOIN sede se ON u.sede_id = se.id
      LEFT JOIN usuario us1 ON s.creado_por = us1.id
      LEFT JOIN usuario us2 ON s.actualizado_por = us2.id
      LEFT JOIN departamento d ON s.departamento_id = d.id
      LEFT JOIN municipio m ON s.municipio_id = m.id
      WHERE s.id = $1
    `;
    return db.oneOrNone(query, [id]);
  },

  /**
   * Crear nueva situación
   */
  async create(data: Partial<Situacion>, conn: any = db): Promise<Situacion> {
    const qInsert = `
      INSERT INTO situacion (
        tipo_situacion, unidad_id, salida_unidad_id, turno_id, asignacion_id,
        ruta_id, km, sentido, latitud, longitud,
        observaciones, creado_por, tipo_situacion_id,
        clima, carga_vehicular, departamento_id, municipio_id, codigo_situacion, obstruccion_data,
        origen, area,
        fecha_hora_aviso, fecha_hora_llegada,
        heridos, fallecidos,
        tipo_pavimento, iluminacion, senalizacion, visibilidad,
        causa_probable, causa_especificar,
        danios_materiales, danios_infraestructura, danios_descripcion,
        grupo,
        acuerdo_involucrados, acuerdo_detalle,
        ilesos, heridos_leves, heridos_graves, trasladados, fugados,
        via_estado, via_topografia, via_geometria, via_peralte, via_condicion,
        codigo_boleta, origen_datos, created_at
      ) VALUES (
        $/tipo_situacion/, $/unidad_id/, $/salida_unidad_id/, $/turno_id/, $/asignacion_id/,
        $/ruta_id/, $/km/, $/sentido/, $/latitud/, $/longitud/,
        $/observaciones/, $/creado_por/, $/tipo_situacion_id/,
        $/clima/, $/carga_vehicular/, $/departamento_id/, $/municipio_id/, $/codigo_situacion/, $/obstruccion_data/,
        $/origen/, $/area/,
        $/fecha_hora_aviso/, $/fecha_hora_llegada/,
        $/heridos/, $/fallecidos/,
        $/tipo_pavimento/, $/iluminacion/, $/senalizacion/, $/visibilidad/,
        $/causa_probable/, $/causa_especificar/,
        $/danios_materiales/, $/danios_infraestructura/, $/danios_descripcion/,
        $/grupo/,
        $/acuerdo_involucrados/, $/acuerdo_detalle/,
        $/ilesos/, $/heridos_leves/, $/heridos_graves/, $/trasladados/, $/fugados/,
        $/via_estado/, $/via_topografia/, $/via_geometria/, $/via_peralte/, $/via_condicion/,
        $/codigo_boleta/, $/origen_datos/, COALESCE($/created_at/, NOW())
      ) RETURNING *
    `;

    const params = {
      // Campos principales
      tipo_situacion: data.tipo_situacion,
      creado_por: data.creado_por,
      codigo_situacion: data.codigo_situacion || null,

      // Relaciones
      unidad_id: data.unidad_id ?? null,
      salida_unidad_id: data.salida_unidad_id ?? null,
      turno_id: data.turno_id ?? null,
      asignacion_id: data.asignacion_id ?? null,
      ruta_id: data.ruta_id ?? null,
      tipo_situacion_id: data.tipo_situacion_id ?? null,

      // Ubicación
      km: data.km ?? null,
      sentido: data.sentido ?? null,
      // Latitud y longitud
      latitud: data.latitud ?? null,
      longitud: data.longitud ?? null,

      // Observaciones formateadas para JSONB timeline
      observaciones: data.observaciones 
        ? JSON.stringify([{ 
            hora: new Intl.DateTimeFormat('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit', 
              timeZone: 'America/Guatemala' 
            }).format(new Date()),
            usuario: 'Creador del Incidente',
            mensaje: data.observaciones 
          }]) 
        : JSON.stringify([]),

      // Contexto
      clima: data.clima ?? null,
      carga_vehicular: data.carga_vehicular ?? null,
      departamento_id: data.departamento_id ?? null,
      municipio_id: data.municipio_id ?? null,
      obstruccion_data: data.obstruccion_data ?? null,

      // Campos adicionales
      origen: data.origen || 'BRIGADA',
      area: data.area ?? null,

      // Fechas
      fecha_hora_aviso: data.fecha_hora_aviso ?? null,
      fecha_hora_llegada: data.fecha_hora_llegada ?? null,

      // Víctimas (consolidado)
      heridos: data.heridos ?? 0,
      fallecidos: data.fallecidos ?? 0,

      // Condiciones de vía
      tipo_pavimento: data.tipo_pavimento ?? null,
      iluminacion: data.iluminacion ?? null,
      senalizacion: data.senalizacion ?? null,
      visibilidad: data.visibilidad ?? null,

      // Causa
      causa_probable: data.causa_probable ?? null,
      causa_especificar: data.causa_especificar ?? null,

      // Daños
      danios_materiales: data.danios_materiales ?? false,
      danios_infraestructura: data.danios_infraestructura ?? false,
      danios_descripcion: data.danios_descripcion ?? null,

      grupo: data.grupo ?? null,

      // Acuerdo
      acuerdo_involucrados: data.acuerdo_involucrados ?? null,
      acuerdo_detalle: data.acuerdo_detalle ?? null,

      // Conteos detallados
      ilesos: data.ilesos ?? 0,
      heridos_leves: data.heridos_leves ?? 0,
      heridos_graves: data.heridos_graves ?? 0,
      trasladados: data.trasladados ?? 0,
      fugados: data.fugados ?? 0,

      // Condiciones de vía
      via_estado: data.via_estado ?? null,
      via_topografia: data.via_topografia ?? null,
      via_geometria: data.via_geometria ?? null,
      via_peralte: data.via_peralte ?? null,
      via_condicion: data.via_condicion ?? null,

      // Import
      codigo_boleta: data.codigo_boleta ?? null,
      origen_datos: data.origen_datos ?? 'APP',
      created_at: data.created_at ?? null,
    };

    try {
      return await conn.one(qInsert, params);
    } catch (err: any) {
      // Fallback: if new columns from migration 117 don't exist yet, retry without them
      if (err.message?.includes('acuerdo_involucrados') || err.message?.includes('ilesos') ||
        err.message?.includes('via_estado') || err.message?.includes('heridos_leves')) {
        const qFallback = `
          INSERT INTO situacion (
            tipo_situacion, unidad_id, salida_unidad_id, turno_id, asignacion_id,
            ruta_id, km, sentido, latitud, longitud,
            observaciones, creado_por, tipo_situacion_id,
            clima, carga_vehicular, departamento_id, municipio_id, codigo_situacion, obstruccion_data,
            origen, area,
            fecha_hora_aviso, fecha_hora_llegada,
            heridos, fallecidos,
            tipo_pavimento, iluminacion, senalizacion, visibilidad,
            causa_probable, causa_especificar,
            danios_materiales, danios_infraestructura, danios_descripcion,
            grupo
          ) VALUES (
            $/tipo_situacion/, $/unidad_id/, $/salida_unidad_id/, $/turno_id/, $/asignacion_id/,
            $/ruta_id/, $/km/, $/sentido/, $/latitud/, $/longitud/,
            $/observaciones/, $/creado_por/, $/tipo_situacion_id/,
            $/clima/, $/carga_vehicular/, $/departamento_id/, $/municipio_id/, $/codigo_situacion/, $/obstruccion_data/,
            $/origen/, $/area/,
            $/fecha_hora_aviso/, $/fecha_hora_llegada/,
            $/heridos/, $/fallecidos/,
            $/tipo_pavimento/, $/iluminacion/, $/senalizacion/, $/visibilidad/,
            $/causa_probable/, $/causa_especificar/,
            $/danios_materiales/, $/danios_infraestructura/, $/danios_descripcion/,
            $/grupo/
          ) RETURNING *
        `;
        return conn.one(qFallback, params);
      }
      throw err;
    }
  },

  /**
   * Actualizar situación por ID
   */
  async update(id: number, data: Partial<Situacion>, conn: any = db): Promise<Situacion> {
    const sets: string[] = [];
    const values: any = { id, actualizado_por: data.actualizado_por };

    const fields = [
      'tipo_situacion', 'ruta_id', 'km', 'sentido', 'latitud', 'longitud',
      'observaciones',
      'tipo_situacion_id', 'clima', 'carga_vehicular', 'departamento_id', 'municipio_id', 'obstruccion_data',
      'origen', 'area',
      'fecha_hora_aviso', 'fecha_hora_llegada', 'fecha_hora_finalizacion',
      'heridos', 'fallecidos',
      'tipo_pavimento', 'iluminacion', 'senalizacion', 'visibilidad',
      'causa_probable', 'causa_especificar',
      'danios_materiales', 'danios_infraestructura', 'danios_descripcion',
      'estado',
      'acuerdo_involucrados', 'acuerdo_detalle',
      'ilesos', 'heridos_leves', 'heridos_graves', 'trasladados', 'fugados',
      'via_estado', 'via_topografia', 'via_geometria', 'via_peralte', 'via_condicion'
    ];

    fields.forEach(field => {
      if ((data as any)[field] !== undefined) {
        sets.push(`${field} = $/${field}/`);
        values[field] = (data as any)[field];
      }
    });

    sets.push('actualizado_por = $/actualizado_por/');
    sets.push('updated_at = NOW()');

    if (sets.length === 0) throw new Error('No data to update');

    const query = `
          UPDATE situacion
          SET ${sets.join(', ')}
          WHERE id = $/id/
          RETURNING *
      `;

    return conn.one(query, values);
  },

  /**
   * Listar situaciones (Filtros)
   */
  async list(filters: any = {}): Promise<SituacionCompleta[]> {
    let where = 'WHERE 1=1';
    const params: any = {};

    if (filters.unidad_id) {
      where += ' AND s.unidad_id = $/unidad_id/';
      params.unidad_id = filters.unidad_id;
    }
    if (filters.tipo_situacion) {
      where += ' AND s.tipo_situacion = $/tipo_situacion/';
      params.tipo_situacion = filters.tipo_situacion;
    }
    if (filters.estado) {
      where += ' AND s.estado = $/estado/';
      params.estado = filters.estado;
    }
    if (filters.fecha_desde) {
      where += ' AND s.created_at >= $/fecha_desde/';
      params.fecha_desde = filters.fecha_desde;
    }
    if (filters.fecha_hasta) {
      where += ' AND s.created_at <= $/fecha_hasta/';
      params.fecha_hasta = filters.fecha_hasta;
    }

    const limit = filters.limit ? `LIMIT ${parseInt(filters.limit)}` : 'LIMIT 50';
    const offset = filters.offset ? `OFFSET ${parseInt(filters.offset)}` : '';

    const query = `
      SELECT s.*,
        u.codigo as unidad_codigo,
        r.nombre as ruta_nombre
      FROM situacion s
      LEFT JOIN unidad u ON s.unidad_id = u.id
      LEFT JOIN ruta r ON s.ruta_id = r.id
      ${where}
      ORDER BY s.created_at DESC
      ${limit} ${offset}
    `;

    return db.manyOrNone(query, params);
  },

  async getActivas(filters: any = {}): Promise<SituacionCompleta[]> {
    return this.list({ ...filters, estado: 'ACTIVA' });
  },

  async getMiUnidadHoy(unidad_id: number, salida_id?: number): Promise<SituacionCompleta[]> {
    const params: any = { unidad_id, salida_id };

    // Query simplificado - tipo_situacion_id apunta al catálogo unificado
    let query = `
      SELECT s.*,
        r.codigo as ruta_codigo,
        r.nombre as ruta_nombre,
        tsc.nombre as tipo_situacion_nombre,
        tsc.categoria as tipo_situacion_categoria,
        s.tipo_pavimento as material_via,
        -- Multimedia
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', sm.id,
            'tipo', sm.tipo,
            'orden', sm.orden,
            'url', sm.url_original,
            'thumbnail', sm.url_thumbnail
          ) ORDER BY sm.tipo, sm.orden)
          FROM situacion_multimedia sm WHERE sm.situacion_id = s.id),
          '[]'
        ) as multimedia,
        (SELECT COUNT(*) FROM situacion_multimedia WHERE situacion_id = s.id AND tipo = 'FOTO') as total_fotos,
        (SELECT COUNT(*) FROM situacion_multimedia WHERE situacion_id = s.id AND tipo = 'VIDEO') as total_videos
      FROM situacion s
      LEFT JOIN ruta r ON s.ruta_id = r.id
      LEFT JOIN catalogo_tipo_situacion tsc ON s.tipo_situacion_id = tsc.id
      WHERE s.unidad_id = $/unidad_id/
      AND s.created_at >= CURRENT_DATE
    `;

    if (salida_id) {
      query += ` AND s.salida_unidad_id = $/salida_id/`;
    }

    query += ` ORDER BY s.created_at DESC`;

    return db.manyOrNone(query, params);
  },

  async getUltimaSituacionPorUnidad(): Promise<any[]> {
    // Usar tabla situacion_actual para consulta O(1) por unidad
    const query = `
        SELECT
            sa.situacion_id as id,
            sa.tipo_situacion,
            sa.estado,
            sa.latitud,
            sa.longitud,
            sa.km,
            sa.sentido,
            sa.situacion_created_at as created_at,
            sa.icono,
            sa.actividad_id,
            sa.actividad_tipo_nombre,
            sa.actividad_estado,
            sa.actividad_created_at,
            u.id as unidad_id,
            u.codigo as unidad_codigo,
            u.tipo_unidad,
            u.sede_id,
            sa.ruta_codigo,
            COALESCE(cts_sit.icono, cts_act.icono, sa.icono) as situacion_icono,
            COALESCE(cts_sit.color, cts_act.color) as situacion_color,
            COALESCE(cts_sit.nombre, cts_act.nombre, sa.actividad_tipo_nombre) as situacion_nombre
        FROM unidad u
        INNER JOIN salida_unidad su ON u.id = su.unidad_id
          AND su.estado = 'EN_SALIDA'
        LEFT JOIN situacion_actual sa ON u.id = sa.unidad_id
        LEFT JOIN situacion s_ref ON sa.situacion_id = s_ref.id
        LEFT JOIN catalogo_tipo_situacion cts_sit ON s_ref.tipo_situacion_id = cts_sit.id
        LEFT JOIN actividad a_ref ON sa.actividad_id = a_ref.id
        LEFT JOIN catalogo_tipo_situacion cts_act ON a_ref.tipo_actividad_id = cts_act.id
        WHERE u.activa = true
        ORDER BY u.codigo
    `;
    return db.manyOrNone(query);
  },

  async getBitacoraUnidad(unidad_id: number, filters: any): Promise<any[]> {
    const params: any = { unidad_id };
    const limit = filters.limit ? parseInt(filters.limit) : 50;

    // Paso 1: obtener las salidas recientes de la unidad (ancla todo lo demás)
    const query = `
      WITH salidas AS (
        SELECT su.id, su.unidad_id, su.estado, su.fecha_hora_salida, su.fecha_hora_regreso,
               su.ruta_inicial_id, su.km_inicial, su.combustible_inicial, su.km_final,
               su.combustible_final,
               COALESCE(su.tripulacion, '[]'::jsonb) as tripulacion,
               su.observaciones_salida,
               su.observaciones_regreso, su.finalizada_por
        FROM salida_unidad su
        WHERE su.unidad_id = $/unidad_id/
        ORDER BY su.fecha_hora_salida DESC
        LIMIT ${limit}
      )
      -- UNION: salidas + situaciones de esas salidas + actividades de esas salidas
      SELECT * FROM (
        -- 1) Las salidas como registros de jornada
        SELECT
          sal.id,
          'SALIDA' as tipo_registro,
          CASE sal.estado WHEN 'EN_SALIDA' THEN 'INICIO_JORNADA' ELSE 'FIN_JORNADA' END as tipo_situacion,
          CASE sal.estado WHEN 'EN_SALIDA' THEN 'Inicio de Jornada' ELSE 'Fin de Jornada' END as subtipo_nombre,
          sal.estado,
          sal.observaciones_salida as descripcion,
          CASE 
            WHEN sal.observaciones_regreso IS NULL THEN '[]'::jsonb 
            ELSE jsonb_build_array(jsonb_build_object('usuario', 'Sistema', 'hora', to_char(sal.fecha_hora_salida, 'HH24:MI'), 'mensaje', sal.observaciones_regreso)) 
          END as observaciones,
          sal.fecha_hora_salida as created_at,
          r.codigo as ruta_codigo,
          sal.km_inicial as km,
          NULL::text as sentido,
          sal.id as salida_id,
          u.codigo as unidad_codigo,
          u.tipo_unidad,
          uf.nombre_completo as creado_por_nombre,
          NULL::text as icono,
          NULL::text as color,
          sal.fecha_hora_salida,
          r.codigo as salida_ruta_codigo,
          sal.km_inicial as salida_km_inicial,
          sal.combustible_inicial as salida_combustible_inicial,
          sal.tripulacion,
          NULL::jsonb as datos,
          NULL::json as fotos
        FROM salidas sal
        LEFT JOIN unidad u ON sal.unidad_id = u.id
        LEFT JOIN ruta r ON sal.ruta_inicial_id = r.id
        LEFT JOIN usuario uf ON sal.finalizada_por = uf.id

        UNION ALL

        -- 2) Situaciones vinculadas a esas salidas
        SELECT
          s.id,
          'SITUACION' as tipo_registro,
          s.tipo_situacion,
          cts.nombre as subtipo_nombre,
          s.estado,
          COALESCE(s.observaciones->0->>'mensaje', '')::text as descripcion,
          COALESCE(s.observaciones, '[]'::jsonb) as observaciones,
          s.created_at,
          r.codigo as ruta_codigo,
          s.km,
          s.sentido,
          s.salida_unidad_id as salida_id,
          u.codigo as unidad_codigo,
          u.tipo_unidad,
          us.nombre_completo as creado_por_nombre,
          cts.icono as icono,
          cts.color as color,
          NULL::timestamptz as fecha_hora_salida,
          NULL::text as salida_ruta_codigo,
          NULL::numeric as salida_km_inicial,
          NULL::numeric as salida_combustible_inicial,
          sal.tripulacion,
          NULL::jsonb as datos,
          (SELECT json_agg(json_build_object(
            'id', sm.id,
            'url', sm.url_original,
            'thumbnail', sm.url_thumbnail,
            'orden', sm.orden,
            'infografia_numero', sm.infografia_numero
          ) ORDER BY sm.infografia_numero, sm.orden)
           FROM situacion_multimedia sm WHERE sm.situacion_id = s.id AND sm.tipo = 'FOTO') as fotos
        FROM situacion s
        -- LEFT JOIN para incluir situaciones sin salida_unidad_id (creadas desde COP)
        LEFT JOIN salidas sal ON s.salida_unidad_id = sal.id
        LEFT JOIN unidad u ON s.unidad_id = u.id
        LEFT JOIN ruta r ON s.ruta_id = r.id
        LEFT JOIN catalogo_tipo_situacion cts ON s.tipo_situacion_id = cts.id
        LEFT JOIN usuario us ON s.creado_por = us.id
        WHERE s.unidad_id = $/unidad_id/
          AND s.created_at >= (SELECT MIN(fecha_hora_salida) FROM salidas)

        UNION ALL

        -- 3) Actividades vinculadas a esas salidas
        SELECT
          a.id,
          'ACTIVIDAD' as tipo_registro,
          cts.nombre as tipo_situacion,
          cts.nombre as subtipo_nombre,
          a.estado,
          COALESCE(a.observaciones->0->>'mensaje', '')::text as descripcion,
          COALESCE(a.observaciones, '[]'::jsonb) as observaciones,
          a.created_at,
          r.codigo as ruta_codigo,
          a.km,
          a.sentido,
          a.salida_unidad_id as salida_id,
          u.codigo as unidad_codigo,
          u.tipo_unidad,
          us.nombre_completo as creado_por_nombre,
          cts.icono as icono,
          cts.color as color,
          NULL::timestamptz as fecha_hora_salida,
          NULL::text as salida_ruta_codigo,
          NULL::numeric as salida_km_inicial,
          NULL::numeric as salida_combustible_inicial,
          sal.tripulacion,
          a.datos,
          (SELECT json_agg(json_build_object(
            'id', sm.id,
            'url', sm.url_original,
            'thumbnail', sm.url_thumbnail,
            'orden', sm.orden,
            'infografia_numero', sm.infografia_numero
          ) ORDER BY sm.infografia_numero, sm.orden)
           FROM situacion_multimedia sm WHERE sm.actividad_id = a.id AND sm.tipo = 'FOTO') as fotos
        FROM actividad a
        INNER JOIN salidas sal ON a.salida_unidad_id = sal.id
        LEFT JOIN unidad u ON a.unidad_id = u.id
        LEFT JOIN ruta r ON a.ruta_id = r.id
        LEFT JOIN catalogo_tipo_situacion cts ON a.tipo_actividad_id = cts.id
        LEFT JOIN usuario us ON a.creado_por = us.id
      ) combined
      ORDER BY created_at DESC
    `;

    return db.manyOrNone(query, params);
  },

  /**
   * Resumen de todas las unidades en salida con su situación/actividad actual.
   * Usado por el dashboard de monitoreo COP.
   */
  async getResumen(): Promise<any[]> {
    const rows = await db.manyOrNone(`
      SELECT
        u.id as unidad_id,
        u.codigo as unidad_codigo,
        u.tipo_unidad,
        u.sede_id,
        se.nombre as sede_nombre,
        sa.situacion_id,
        sa.tipo_situacion as ultima_situacion,
        sa.estado as estado_situacion,
        sa.latitud,
        sa.longitud,
        COALESCE(CASE WHEN sa.situacion_id IS NULL AND sa.actividad_id IS NOT NULL THEN a_ref.km ELSE NULL END, sa.km) as km,
        COALESCE(CASE WHEN sa.situacion_id IS NULL AND sa.actividad_id IS NOT NULL THEN a_ref.sentido ELSE NULL END, sa.sentido) as sentido,
        sa.ruta_id as sa_ruta_id,
        sa.ruta_codigo,
        sa.situacion_created_at,
        sa.icono,
        sa.actividad_id,
        sa.actividad_tipo_nombre,
        sa.actividad_estado,
        sa.actividad_created_at,
        sa.updated_at as sa_updated_at,
        s_ref.observaciones as situacion_observaciones,
        s_ref.clima,
        s_ref.carga_vehicular,
        s_ref.obstruccion_data,
        a_ref.observaciones as actividad_observaciones,
        a_ref.datos as actividad_datos,
        cts_sit.icono as situacion_icono,
        cts_sit.color as situacion_color,
        cts_sit.nombre as situacion_nombre,
        cts_act.icono as tipo_actividad_icono,
        cts_act.color as tipo_actividad_color,
        cts_act.nombre as tipo_actividad_nombre,
        CASE WHEN sa.situacion_id IS NOT NULL THEN
          (SELECT sm.url_thumbnail FROM situacion_multimedia sm
           WHERE sm.situacion_id = sa.situacion_id AND sm.tipo = 'FOTO'
           ORDER BY sm.infografia_numero, sm.orden LIMIT 1)
        ELSE NULL END as foto_preview,
        CASE WHEN sa.situacion_id IS NOT NULL THEN
          (SELECT COUNT(*)::int FROM situacion_multimedia sm
           WHERE sm.situacion_id = sa.situacion_id AND sm.tipo = 'FOTO')
        ELSE 0 END as total_fotos,
        CASE WHEN sa.situacion_id IS NOT NULL THEN
          (SELECT json_agg(json_build_object(
            'id', sm.id, 'url', sm.url_original, 'thumbnail', sm.url_thumbnail,
            'orden', sm.orden, 'infografia_numero', sm.infografia_numero,
            'infografia_titulo', sm.infografia_titulo
          ) ORDER BY sm.infografia_numero, sm.orden)
           FROM situacion_multimedia sm
           WHERE sm.situacion_id = sa.situacion_id AND sm.tipo = 'FOTO')
        ELSE NULL END as fotos
      FROM unidad u
      INNER JOIN salida_unidad su ON u.id = su.unidad_id AND su.estado = 'EN_SALIDA'
      LEFT JOIN sede se ON u.sede_id = se.id
      LEFT JOIN situacion_actual sa ON u.id = sa.unidad_id
      LEFT JOIN situacion s_ref ON sa.situacion_id = s_ref.id
      LEFT JOIN catalogo_tipo_situacion cts_sit ON s_ref.tipo_situacion_id = cts_sit.id
      LEFT JOIN actividad a_ref ON sa.actividad_id = a_ref.id
      LEFT JOIN catalogo_tipo_situacion cts_act ON a_ref.tipo_actividad_id = cts_act.id
      WHERE u.activa = true
      ORDER BY u.codigo
    `);

    return rows.map((r: any) => {
      const esSituacion = !!r.situacion_id;
      const esActividad = !esSituacion && !!r.actividad_id;
      return {
        ...r,
        situacion_icono:  esSituacion ? r.situacion_icono  : (r.tipo_actividad_icono  || r.icono || null),
        situacion_color:  esSituacion ? r.situacion_color  : (r.tipo_actividad_color  || null),
        situacion_nombre: esSituacion ? r.situacion_nombre : (r.tipo_actividad_nombre || r.actividad_tipo_nombre || null),
        ultima_situacion: esSituacion ? r.ultima_situacion : (r.tipo_actividad_nombre || r.actividad_tipo_nombre || null),
        observaciones:    esSituacion ? r.situacion_observaciones : (esActividad ? r.actividad_observaciones : null),
        estado_situacion: esSituacion ? r.estado_situacion : (esActividad ? r.actividad_estado : null),
        tipo_registro:    esSituacion ? 'SITUACION' : (esActividad ? 'ACTIVIDAD' : null),
        created_at:       esSituacion ? r.situacion_created_at : (esActividad ? r.actividad_created_at : null),
      };
    });
  },

  async cerrar(id: number, actualizado_por: number, obs?: string): Promise<Situacion> {
    const result = await this.update(id, {
      estado: 'CERRADA',
      actualizado_por,
      fecha_hora_finalizacion: new Date()
    } as any);
    if (obs) {
      const entry = JSON.stringify([{
        hora: new Intl.DateTimeFormat('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'America/Guatemala' }).format(new Date()),
        usuario: 'Sistema',
        mensaje: obs
      }]);
      await db.none(
        `UPDATE situacion SET observaciones = COALESCE(observaciones, '[]'::jsonb) || $2::jsonb WHERE id = $1`,
        [id, entry]
      );
    }
    return result;
  },

  async listarActivas(unidadId?: number): Promise<any[]> {
    const params: any[] = [];
    let where = `WHERE s.estado = 'ACTIVA'`;
    if (unidadId) {
      where += ` AND s.unidad_id = $1`;
      params.push(unidadId);
    }
    return db.manyOrNone(
      `SELECT s.*, u.codigo as unidad_codigo, r.codigo as ruta_codigo
       FROM situacion s
       LEFT JOIN unidad u ON s.unidad_id = u.id
       LEFT JOIN ruta r ON s.ruta_id = r.id
       ${where}
       ORDER BY s.created_at DESC`,
      params
    );
  },

  async agregarObservacion(id: number, entrada: string): Promise<any> {
    return db.one(
      `UPDATE situacion
       SET observaciones = COALESCE(observaciones, '[]'::jsonb) || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [entrada, id],
    );
  },

  async eliminar(id: number): Promise<boolean> {
    const result = await db.result('DELETE FROM situacion WHERE id = $1', [id]);
    return result.rowCount > 0;
  },

  async getHeatmap(dias: number, tipo?: string): Promise<any[]> {
    return db.manyOrNone(
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
  },

  async getCatalogo(): Promise<any[]> {
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

    return Array.from(categoriasMap.values());
  },

  async getCatalogosAuxiliares(): Promise<any> {
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

    return {
      tipos_hecho, tipos_asistencia, tipos_emergencia,
      tipos_vehiculo, marcas_vehiculo, etnias,
      dispositivos_seguridad, causas_hecho,
    };
  },

  async marcarPersistente(id: number): Promise<any | null> {
    return db.oneOrNone(
      `UPDATE situacion SET persistente = true, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );
  },

  async getUnidadIdDesdeTurno(userId: number): Promise<number | null> {
    const row = await db.oneOrNone(
      `SELECT au.unidad_id FROM tripulacion_turno tt
       JOIN asignacion_unidad au ON tt.asignacion_id = au.id
       JOIN turno t ON au.turno_id = t.id
       WHERE tt.usuario_id = $1 AND t.fecha = CURRENT_DATE
       ORDER BY tt.created_at DESC LIMIT 1`,
      [userId]
    );
    return row?.unidad_id ?? null;
  },

  async getUnidadIdDesdeUltimaSituacion(userId: number): Promise<number | null> {
    const row = await db.oneOrNone(
      'SELECT unidad_id FROM situacion WHERE creado_por = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    return row?.unidad_id ?? null;
  },

  async getSituacionIdActiva(unidadId: number): Promise<number | null> {
    const row = await db.oneOrNone(
      "SELECT situacion_id FROM situacion_actual WHERE unidad_id = $1 AND estado = 'ACTIVA'",
      [unidadId]
    );
    return row?.situacion_id ?? null;
  },

  async getSituacionConMultimedia(situacionId: number): Promise<any | null> {
    return db.oneOrNone(`
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
    `, [situacionId]);
  },

  async actualizarCompleta(
    situacionId: number,
    data: {
      campos: SituacionUpdateData;
      vehiculos?: any[];
      autoridades?: any[];
      gruas?: any[];
      ajustadores?: any[];
    }
  ): Promise<any | null> {
    await db.tx(async t => {
      // 1. Update campos principales
      await this.update(situacionId, data.campos as any, t);

      // 2. Refresh vehículos: delete-all + reinsert atómico
      if (Array.isArray(data.vehiculos)) {
        await t.none('DELETE FROM situacion_vehiculo WHERE situacion_id = $1', [situacionId]);
        for (const v of data.vehiculos) {
          await SituacionDetalleModel.addVehiculo(situacionId, v, t);
        }
      }

      // 3. Refresh autoridades: delete-all + reinsert atómico
      if (Array.isArray(data.autoridades) && data.autoridades.length > 0) {
        await t.none('DELETE FROM autoridad WHERE situacion_id = $1', [situacionId]);
        for (const a of data.autoridades) {
          const tipo = typeof a === 'string' ? a : (a.tipo || a);
          await SituacionDetalleModel.addAutoridad(situacionId, { tipo }, t);
        }
      }

      // 4+5. Refresh grúas y ajustadores — un solo SELECT del primer sv
      const necesitaGruas      = Array.isArray(data.gruas)      && data.gruas.length      > 0;
      const necesitaAjustadores= Array.isArray(data.ajustadores) && data.ajustadores.length > 0;

      if (necesitaGruas || necesitaAjustadores) {
        const primerSv = await t.oneOrNone(
          'SELECT id FROM situacion_vehiculo WHERE situacion_id = $1 LIMIT 1',
          [situacionId]
        );

        if (primerSv) {
          if (necesitaGruas) {
            await t.none('DELETE FROM vehiculo_grua WHERE situacion_vehiculo_id = $1', [primerSv.id]);
            for (const g of data.gruas!) {
              await SituacionDetalleModel.addGrua(primerSv.id, g, t);
            }
          }

          if (necesitaAjustadores) {
            await t.none('DELETE FROM vehiculo_aseguradora WHERE situacion_vehiculo_id = $1', [primerSv.id]);
            for (const a of data.ajustadores!) {
              await SituacionDetalleModel.addAjustador(primerSv.id, a, t);
            }
          }
        }
      }
    });

    // getById fuera del tx — lectura limpia post-commit
    return this.getById(situacionId);
  },

  async resolverContextoCreacion(
    userId: number,
    rol: string,
    hints: {
      unidadId?: number | null;
      salidaUnidadId?: number | null;
      turnoId?: number | null;
      asignacionId?: number | null;
      rutaId?: number | null;
      departamentoId?: number | null;
      municipioId?: number | null;
    }
  ): Promise<{
    unidadId: number | null;
    rutaId: number | null;
    salidaId: number | null;
    turnoId: number | null;
    asignacionId: number | null;
    deptoId: number | null;
    muniId: number | null;
  }> {
    let unidadFinal     = hints.unidadId     ?? null;
    let turnoFinal      = hints.turnoId      ?? null;
    let asignacionFinal = hints.asignacionId ?? null;
    let rutaFinal       = hints.rutaId       ?? null;
    let salidaFinal     = hints.salidaUnidadId ?? null;

    // 1. Resolver desde salidaUnidadId explícito
    if (!unidadFinal && hints.salidaUnidadId) {
      try {
        const sal = await db.oneOrNone(
          'SELECT unidad_id, ruta_inicial_id FROM salida_unidad WHERE id = $1',
          [hints.salidaUnidadId]
        );
        if (sal) {
          unidadFinal = sal.unidad_id;
          if (!rutaFinal) rutaFinal = sal.ruta_inicial_id;
        }
      } catch { /* silencioso */ }
    }

    // 2. Fallbacks específicos para BRIGADA
    if (rol === 'BRIGADA' && (!unidadFinal || !rutaFinal)) {
      // tripulacion_turno vigente
      if (!unidadFinal || !rutaFinal) {
        try {
          const tt = await db.oneOrNone(`
            SELECT a.unidad_id, a.ruta_id, a.id as asignacion_id, a.turno_id
            FROM tripulacion_turno tc
            JOIN asignacion_unidad a ON tc.asignacion_id = a.id
            JOIN turno t ON a.turno_id = t.id
            WHERE tc.usuario_id = $1
              AND t.estado IN ('PLANIFICADO', 'ACTIVO')
              AND t.fecha <= CURRENT_DATE
              AND (t.fecha_fin IS NULL OR t.fecha_fin >= CURRENT_DATE)
              AND a.hora_entrada_real IS NULL
            ORDER BY t.fecha DESC LIMIT 1
          `, [userId]);
          if (tt) {
            if (!unidadFinal)     unidadFinal     = tt.unidad_id;
            if (!rutaFinal)       rutaFinal       = tt.ruta_id;
            if (!turnoFinal)      turnoFinal      = tt.turno_id;
            if (!asignacionFinal) asignacionFinal = tt.asignacion_id;
          }
        } catch { /* silencioso */ }
      }

      // ubicacion_brigada (préstamo a otra unidad)
      if (!unidadFinal) {
        try {
          const ub = await UbicacionBrigadaModel.getUbicacionActual(userId);
          if (ub) unidadFinal = ub.unidad_actual_id || ub.unidad_origen_id;
        } catch { /* silencioso */ }
      }
    }

    // 3. Resolver ruta desde asignacion_unidad
    if (!rutaFinal && asignacionFinal) {
      try {
        const asig = await db.oneOrNone(
          'SELECT ruta_id FROM asignacion_unidad WHERE id = $1',
          [asignacionFinal]
        );
        if (asig) rutaFinal = asig.ruta_id;
      } catch { /* silencioso */ }
    }

    // 4. Resolver ruta y salida desde salida activa de la unidad
    if (unidadFinal && (!rutaFinal || !salidaFinal)) {
      try {
        const salidaActiva = await db.oneOrNone(
          `SELECT id, ruta_inicial_id FROM salida_unidad
           WHERE unidad_id = $1 AND estado = 'EN_SALIDA'
           ORDER BY created_at DESC LIMIT 1`,
          [unidadFinal]
        );
        if (salidaActiva) {
          if (!rutaFinal    && salidaActiva.ruta_inicial_id) rutaFinal   = salidaActiva.ruta_inicial_id;
          if (!salidaFinal)                                  salidaFinal = salidaActiva.id;
        }
      } catch { /* silencioso */ }
    }

    // 5. Validar FK departamento / municipio (silencioso — nullifica si no existe)
    let deptoId = hints.departamentoId ?? null;
    let muniId  = hints.municipioId    ?? null;
    if (deptoId) {
      const ok = await db.oneOrNone('SELECT id FROM departamento WHERE id = $1', [deptoId]);
      if (!ok) { console.warn(`[resolverContextoCreacion] departamento_id ${deptoId} no encontrado`); deptoId = null; }
    }
    if (muniId) {
      const ok = await db.oneOrNone('SELECT id FROM municipio WHERE id = $1', [muniId]);
      if (!ok) { console.warn(`[resolverContextoCreacion] municipio_id ${muniId} no encontrado`); muniId = null; }
    }

    return { unidadId: unidadFinal, rutaId: rutaFinal, salidaId: salidaFinal, turnoId: turnoFinal, asignacionId: asignacionFinal, deptoId, muniId };
  },

  async getAnteriorActiva(unidadId: number): Promise<{ id: number } | null> {
    return db.oneOrNone(
      "SELECT id FROM situacion WHERE unidad_id = $1 AND estado = 'ACTIVA' ORDER BY created_at DESC LIMIT 1",
      [unidadId]
    );
  },

  async cerrarAnterior(id: number, conn: any = db): Promise<void> {
    await conn.none(
      `UPDATE situacion
       SET estado = 'CERRADA', fecha_hora_finalizacion = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  },

  async insertarCausas(situacionId: number, causas: number[], conn: any = db): Promise<void> {
    try {
      for (const causaId of causas) {
        await conn.none(
          'INSERT INTO situacion_causa (situacion_id, causa_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [situacionId, causaId]
        );
      }
    } catch (e) {
      console.warn('situacion_causa insert failed (table may not exist):', e);
    }
  },

  async crearCompleta(data: {
    situacionData: Partial<Situacion>;
    anteriorId: number | null;
    detalles?: { tipo_detalle: string; datos: any }[];
    vehiculos?: any[];
    autoridades?: any[];
    causas?: number[];
  }): Promise<{ nuevaId: number; anteriorId: number | null }> {
    const { situacionData, anteriorId, detalles, vehiculos, autoridades, causas } = data;

    const nuevaId: number = await db.tx(async t => {
      if (anteriorId) {
        await this.cerrarAnterior(anteriorId, t);
      }

      const situacion = await this.create(situacionData, t);

      if (Array.isArray(detalles)) {
        for (const d of detalles) {
          await SituacionDetalleModel.createByTipo(situacion.id, d.tipo_detalle, d.datos, t);
        }
      }

      if (Array.isArray(vehiculos)) {
        for (const v of vehiculos) {
          await SituacionDetalleModel.addVehiculo(situacion.id, v, t);
        }
      }

      if (Array.isArray(autoridades)) {
        for (const a of autoridades) {
          await SituacionDetalleModel.addAutoridad(situacion.id, a, t);
        }
      }

      if (Array.isArray(causas) && causas.length > 0) {
        await this.insertarCausas(situacion.id, causas, t);
      }

      return situacion.id;
    });

    return { nuevaId, anteriorId };
  },
};

