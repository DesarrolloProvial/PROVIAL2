import { db } from '../../config/database';
import { ActividadModel } from '../cop/actividad.model';

// ========================================
// INTERFACES
// ========================================

export interface SalidaUnidad {
  id: number;
  unidad_id: number;
  fecha_hora_salida: Date;
  fecha_hora_regreso: Date | null;
  estado: 'EN_SALIDA' | 'FINALIZADA' | 'CANCELADA';
  ruta_inicial_id: number | null;
  km_inicial: number | null;
  combustible_inicial: number | null;
  km_final: number | null;
  combustible_final: number | null;
  km_recorridos: number | null;
  tripulacion: any; // JSONB
  finalizada_por: number | null;
  observaciones_salida: string | null;
  observaciones_regreso: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MiSalidaActiva {
  brigada_id: number;
  chapa: string | null;
  nombre_completo: string;
  salida_id: number;
  unidad_id: number;
  unidad_codigo: string;
  tipo_unidad: string | null;
  estado: string;
  fecha_hora_salida: Date;
  fecha_hora_regreso: Date | null;
  horas_salida: number;
  ruta_id: number | null;
  ruta_codigo: string | null;
  ruta_nombre: string | null;
  km_inicial: number | null;
  combustible_inicial: number | null;
  tripulacion: any | null;
  tipo_asignacion: 'TURNO';
  mi_rol: string | null;
  primera_situacion: any | null;
}

export interface Relevo {
  id: number;
  situacion_id: number | null;
  tipo_relevo: 'UNIDAD_COMPLETA' | 'CRUZADO';
  unidad_saliente_id: number;
  unidad_entrante_id: number;
  brigadistas_salientes: any; // JSONB
  brigadistas_entrantes: any; // JSONB
  fecha_hora: Date;
  observaciones: string | null;
  registrado_por: number;
  created_at: Date;
}

// ========================================
// MODELO: SALIDA
// ========================================

export const SalidaModel = {
  // ========================================
  // SALIDAS
  // ========================================

  /**
   * Obtener mi salida activa (si existe)
   */
  async getMiSalidaActiva(brigadaId: number): Promise<MiSalidaActiva | null> {
    return db.oneOrNone(
      'SELECT * FROM v_mi_salida_activa WHERE brigada_id = $1',
      [brigadaId]
    );
  },

  /**
   * Obtener mi salida de hoy (activa o finalizada) — solo por turno
   * Incluye resumen de situaciones del día
   */
  async getMiSalidaHoy(brigadaId: number): Promise<any | null> {
    return db.oneOrNone(`
      SELECT
        s.id AS salida_id,
        s.unidad_id,
        un.codigo AS unidad_codigo,
        un.tipo_unidad,
        s.estado,
        s.fecha_hora_salida,
        s.fecha_hora_regreso,
        EXTRACT(EPOCH FROM COALESCE(s.fecha_hora_regreso, NOW()) - s.fecha_hora_salida) / 3600 AS horas_salida,
        s.ruta_inicial_id,
        r.codigo AS ruta_codigo,
        r.nombre AS ruta_nombre,
        s.km_inicial,
        s.km_final,
        s.combustible_inicial,
        s.combustible_final,
        s.km_recorridos,
        s.tripulacion,
        tt.rol_tripulacion AS mi_rol,
        'TURNO' AS tipo_asignacion,
        (
          SELECT COUNT(*)
          FROM situacion sit
          WHERE sit.salida_unidad_id = s.id
        ) AS total_situaciones,
        (
          SELECT json_agg(json_build_object(
            'id', sit.id,
            'tipo', sit.tipo_situacion,
            'estado', sit.estado,
            'ruta_codigo', r2.codigo,
            'km', sit.km,
            'sentido', sit.sentido,
            'clima', sit.clima,
            'carga_vehicular', sit.carga_vehicular,
            'created_at', sit.created_at
          ) ORDER BY sit.created_at)
          FROM situacion sit
          LEFT JOIN ruta r2 ON sit.ruta_id = r2.id
          WHERE sit.salida_unidad_id = s.id
        ) AS situaciones
      FROM usuario u
      JOIN tripulacion_turno tt ON u.id = tt.usuario_id
      JOIN asignacion_unidad au ON tt.asignacion_id = au.id
      JOIN turno t ON au.turno_id = t.id
      JOIN unidad un ON au.unidad_id = un.id
      JOIN salida_unidad s ON un.id = s.unidad_id
        AND DATE(s.fecha_hora_salida) = CURRENT_DATE
      LEFT JOIN ruta r ON s.ruta_inicial_id = r.id
      WHERE u.id = $1
        AND (
          t.fecha = CURRENT_DATE
          OR t.fecha = CURRENT_DATE + INTERVAL '1 day'
          OR (t.fecha <= CURRENT_DATE AND COALESCE(t.fecha_fin, t.fecha) >= CURRENT_DATE)
          OR (t.estado IN ('ACTIVO', 'PLANIFICADO') AND t.fecha >= CURRENT_DATE - INTERVAL '1 day')
        )
      ORDER BY s.fecha_hora_salida DESC
      LIMIT 1
    `, [brigadaId]);
  },

  /**
   * Iniciar salida de unidad
   */
  async iniciarSalida(data: {
    unidad_id: number;
    ruta_inicial_id?: number;
    km_inicial?: number;
    combustible_inicial?: number;
    observaciones_salida?: string;
  }): Promise<number> {
    // La función PostgreSQL acepta NUMERIC para km y combustible
    const result = await db.one(
      `SELECT iniciar_salida_unidad($1, $2, $3, $4, $5) AS salida_id`,
      [
        data.unidad_id,
        data.ruta_inicial_id || null,
        data.km_inicial || null,
        data.combustible_inicial || null,
        data.observaciones_salida || null
      ]
    );

    return result.salida_id;
  },

  /**
   * Finalizar salida de unidad
   */
  async finalizarSalida(data: {
    salida_id: number;
    km_final?: number;
    combustible_final?: number;
    observaciones_regreso?: string;
    finalizada_por: number;
  }): Promise<boolean> {
    const result = await db.one(
      `SELECT finalizar_salida_unidad($1, $2, $3, $4, $5) AS success`,
      [
        data.salida_id,
        data.km_final || null,
        data.combustible_final || null,
        data.observaciones_regreso || null,
        data.finalizada_por
      ]
    );

    return result.success;
  },

  /**
   * Finalizar jornada completa: marca salida como FINALIZADA,
   * crea snapshot en bitacora_historica, y limpia las tablas operacionales
   */
  async finalizarJornadaCompleta(data: {
    salida_id: number;
    km_final?: number;
    combustible_final?: number;
    observaciones?: string;
    finalizada_por: number;
  }): Promise<{ success: boolean; bitacora_id: number | null; mensaje: string }> {
    const result = await db.one(
      `SELECT * FROM finalizar_jornada_completa($1, $2, $3, $4, $5)`,
      [
        data.salida_id,
        data.km_final || null,
        data.combustible_final || null,
        data.observaciones || null,
        data.finalizada_por
      ]
    );

    return {
      success: result.success,
      bitacora_id: result.bitacora_id,
      mensaje: result.mensaje
    };
  },

  /**
   * Cambiar ruta de una salida activa
   */
  async cambiarRuta(salidaId: number, nuevaRutaId: number): Promise<boolean> {
    const result = await db.result(
      `UPDATE salida_unidad
       SET ruta_inicial_id = $2
       WHERE id = $1
         AND estado = 'EN_SALIDA'`,
      [salidaId, nuevaRutaId]
    );

    return result.rowCount > 0;
  },

  /**
   * Obtener información de una salida
   */
  async getSalidaById(salidaId: number): Promise<SalidaUnidad | null> {
    return db.oneOrNone(
      'SELECT * FROM salida_unidad WHERE id = $1',
      [salidaId]
    );
  },

  /**
   * Obtener todas las unidades en salida
   */
  async getUnidadesEnSalida(): Promise<any[]> {
    return db.any('SELECT * FROM v_unidades_en_salida');
  },

  /**
   * Obtener historial de salidas de una unidad
   */
  async getHistorialSalidas(unidadId: number, limit: number = 20): Promise<SalidaUnidad[]> {
    return db.any(
      `SELECT su.*, r.codigo AS ruta_codigo
       FROM salida_unidad su
       LEFT JOIN ruta r ON su.ruta_inicial_id = r.id
       WHERE su.unidad_id = $1
       ORDER BY su.fecha_hora_salida DESC
       LIMIT $2`,
      [unidadId, limit]
    );
  },

  // ========================================
  // RELEVOS
  // ========================================

  /**
   * Registrar relevo de unidades/tripulaciones
   */
  async registrarRelevo(data: {
    situacion_id?: number;
    tipo_relevo: 'UNIDAD_COMPLETA' | 'CRUZADO';
    unidad_saliente_id: number;
    unidad_entrante_id: number;
    brigadistas_salientes: any[]; // Array de objetos
    brigadistas_entrantes: any[]; // Array de objetos
    observaciones?: string;
    registrado_por: number;
  }): Promise<Relevo> {
    return db.one(
      `INSERT INTO relevo
       (situacion_id, tipo_relevo, unidad_saliente_id, unidad_entrante_id,
        brigadistas_salientes, brigadistas_entrantes, observaciones, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.situacion_id || null,
        data.tipo_relevo,
        data.unidad_saliente_id,
        data.unidad_entrante_id,
        JSON.stringify(data.brigadistas_salientes),
        JSON.stringify(data.brigadistas_entrantes),
        data.observaciones || null,
        data.registrado_por
      ]
    );
  },

  /**
   * Obtener relevos de una situación
   */
  async getRelevosBySituacion(situacionId: number): Promise<Relevo[]> {
    return db.any(
      `SELECT * FROM relevo WHERE situacion_id = $1 ORDER BY fecha_hora DESC`,
      [situacionId]
    );
  },

  // ========================================
  // SITUACIONES CON SALIDA
  // ========================================

  /**
   * Verificar si una salida tiene situación SALIDA_SEDE
   */
  async tieneSalidaSede(salidaId: number): Promise<boolean> {
    const result = await db.oneOrNone(
      `SELECT 1 FROM situacion
       WHERE salida_unidad_id = $1
         AND tipo_situacion = 'SALIDA_SEDE'`,
      [salidaId]
    );

    return !!result;
  },

  /**
   * Contar situaciones de una salida
   */
  async contarSituaciones(salidaId: number): Promise<number> {
    const result = await db.one(
      `SELECT COUNT(*) as count FROM situacion WHERE salida_unidad_id = $1`,
      [salidaId]
    );

    return parseInt(result.count);
  },

  /**
   * Obtener situaciones de una salida
   */
  async getSituacionesDeSalida(salidaId: number): Promise<any[]> {
    return db.any(
      `SELECT * FROM situacion
       WHERE salida_unidad_id = $1
       ORDER BY created_at ASC`,
      [salidaId]
    );
  },

  // ========================================
  // INGRESOS A SEDE
  // ========================================

  /**
   * Registrar ingreso a sede
   */
  async registrarIngreso(data: {
    salida_id: number;
    sede_id: number;
    tipo_ingreso: string;
    km_ingreso?: number;
    combustible_ingreso?: number;
    observaciones?: string;
    es_ingreso_final?: boolean;
    registrado_por: number;
  }): Promise<number> {
    const result = await db.one(
      `SELECT registrar_ingreso_sede($1, $2, $3, $4, $5, $6, $7, $8) AS ingreso_id`,
      [
        data.salida_id,
        data.sede_id,
        data.tipo_ingreso,
        data.km_ingreso || null,
        data.combustible_ingreso || null,
        data.observaciones || null,
        data.es_ingreso_final || false,
        data.registrado_por
      ]
    );

    return result.ingreso_id;
  },

  /**
   * Registrar salida de sede (volver a la calle)
   */
  async registrarSalidaDeSede(data: {
    ingreso_id: number;
    km_salida?: number;
    combustible_salida?: number;
    observaciones?: string;
  }): Promise<boolean> {
    const result = await db.one(
      `SELECT registrar_salida_de_sede($1, $2, $3, $4) AS success`,
      [
        data.ingreso_id,
        data.km_salida || null,
        data.combustible_salida || null,
        data.observaciones || null
      ]
    );

    return result.success;
  },

  /**
   * Obtener ingreso activo de una salida
   */
  async getIngresoActivo(salidaId: number): Promise<any | null> {
    return db.oneOrNone(
      `SELECT
         i.id AS ingreso_id,
         i.salida_unidad_id,
         i.sede_id,
         i.tipo_ingreso,
         i.fecha_hora_ingreso,
         i.km_ingreso,
         i.combustible_ingreso,
         i.es_ingreso_final,
         i.observaciones_ingreso,
         s.codigo AS sede_codigo,
         s.nombre AS sede_nombre
       FROM ingreso_sede i
       JOIN sede s ON i.sede_id = s.id
       WHERE i.salida_unidad_id = $1
         AND i.fecha_hora_salida IS NULL
       LIMIT 1`,
      [salidaId]
    );
  },

  /**
   * Obtener historial de ingresos de una salida
   */
  async getHistorialIngresos(salidaId: number): Promise<any[]> {
    return db.any(
      `SELECT i.*, s.codigo AS sede_codigo, s.nombre AS sede_nombre
       FROM ingreso_sede i
       JOIN sede s ON i.sede_id = s.id
       WHERE i.salida_unidad_id = $1
       ORDER BY i.fecha_hora_ingreso ASC`,
      [salidaId]
    );
  },

  /**
   * Obtener un ingreso por ID
   */
  async getIngresoById(ingresoId: number): Promise<any | null> {
    return db.oneOrNone(
      `SELECT i.*, s.codigo AS sede_codigo, s.nombre AS sede_nombre
       FROM ingreso_sede i
       JOIN sede s ON i.sede_id = s.id
       WHERE i.id = $1`,
      [ingresoId]
    );
  },

  // ========================================
  // SEDES
  // ========================================

  /**
   * Obtener todas las sedes activas
   */
  async getSedes(): Promise<any[]> {
    return db.any(
      `SELECT s.*,
              d.nombre AS departamento_nombre,
              m.nombre AS municipio_nombre
       FROM sede s
       LEFT JOIN departamento d ON s.departamento_id = d.id
       LEFT JOIN municipio m ON s.municipio_id = m.id
       WHERE s.activa = TRUE
       ORDER BY s.nombre ASC`
    );
  },

  /**
   * Obtener sede por ID
   */
  async getSedeById(sedeId: number): Promise<any | null> {
    return db.oneOrNone(
      `SELECT s.*,
              d.nombre AS departamento_nombre,
              m.nombre AS municipio_nombre
       FROM sede s
       LEFT JOIN departamento d ON s.departamento_id = d.id
       LEFT JOIN municipio m ON s.municipio_id = m.id
       WHERE s.id = $1`,
      [sedeId]
    );
  },

  /**
   * Obtener sede de una unidad
   */
  async getSedeDeUnidad(unidadId: number): Promise<{ sede_id: number; sede_codigo: string; sede_nombre: string } | null> {
    return db.oneOrNone(
      `SELECT s.id as sede_id, s.codigo as sede_codigo, s.nombre as sede_nombre
       FROM unidad u
       JOIN sede s ON u.sede_id = s.id
       WHERE u.id = $1`,
      [unidadId]
    );
  },

  /**
   * Obtener unidades de una sede
   */
  async getUnidadesDeSede(sedeId: number): Promise<any[]> {
    return db.any(
      `SELECT * FROM (
        SELECT u.*,
              COALESCE(
                (SELECT sede_destino_id
                 FROM reasignacion_sede
                 WHERE tipo = 'UNIDAD'
                   AND recurso_id = u.id
                   AND estado = 'ACTIVA'
                   AND fecha_inicio <= CURRENT_DATE
                   AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)
                 ORDER BY created_at DESC
                 LIMIT 1),
                u.sede_id
              ) AS sede_efectiva
       FROM unidad u
       WHERE u.activa = TRUE
      ) sub WHERE sede_efectiva = $1
       ORDER BY codigo`,
      [sedeId]
    );
  },

  /**
   * Obtener personal de una sede
   */
  async getPersonalDeSede(sedeId: number): Promise<any[]> {
    return db.any(
      `SELECT * FROM (
        SELECT u.*,
              r.nombre AS rol_nombre,
              COALESCE(
                (SELECT sede_destino_id
                 FROM reasignacion_sede
                 WHERE tipo = 'USUARIO'
                   AND recurso_id = u.id
                   AND estado = 'ACTIVA'
                   AND fecha_inicio <= CURRENT_DATE
                   AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)
                 ORDER BY created_at DESC
                 LIMIT 1),
                u.sede_id
              ) AS sede_efectiva
       FROM usuario u
       JOIN rol r ON u.rol_id = r.id
       WHERE r.nombre != 'COP'
      ) sub WHERE sede_efectiva = $1
       ORDER BY rol_nombre, nombre_completo`,
      [sedeId]
    );
  },

  async iniciarSalidaBrigada(data: {
    unidad_id: number;
    ruta_id?: number | null;
    km_inicial?: number | null;
    indicador?: number | null;
    observaciones_salida?: string | null;
  }): Promise<{ salidaId: number; inspeccionId: number | null }> {
    const inspeccionAprobada = await db.oneOrNone<{ id: number }>(
      `SELECT id FROM inspeccion_360
       WHERE unidad_id = $1
         AND estado = 'APROBADA'
         AND salida_id IS NULL
         AND fecha_aprobacion > NOW() - INTERVAL '24 hours'
       ORDER BY fecha_aprobacion DESC
       LIMIT 1`,
      [data.unidad_id],
    );

    const salidaId = await db.tx(async (conn) => {
      const { salida_id } = await conn.one<{ salida_id: number }>(
        `SELECT iniciar_salida_unidad($1, $2, $3, $4, $5) AS salida_id`,
        [data.unidad_id, data.ruta_id ?? null, data.km_inicial ?? null, data.indicador ?? null, data.observaciones_salida ?? null],
      );

      if (inspeccionAprobada) {
        await conn.none(
          `UPDATE inspeccion_360 SET salida_id = $1 WHERE id = $2`,
          [salida_id, inspeccionAprobada.id],
        );
      }

      return salida_id;
    });

    return { salidaId, inspeccionId: inspeccionAprobada?.id ?? null };
  },

  async iniciarSalidaCOPCompleto(data: {
    unidad_id: number;
    ruta_inicial_id?: number | null;
    km_inicial?: number | null;
    indicador?: number | null;
    observaciones_salida?: string | null;
    tripulacion?: any[] | null;
    userId: number;
  }): Promise<{ salidaId: number; forzadaNoDisponible: boolean; instrucciones: string | null } | { conflict: true }> {
    const salidaActiva = await db.oneOrNone<{ id: number }>(
      `SELECT id FROM salida_unidad WHERE unidad_id = $1 AND estado = 'EN_SALIDA'`,
      [data.unidad_id],
    );
    if (salidaActiva) return { conflict: true };

    const estadoUnidad = await db.oneOrNone<{ disponible_transportes: boolean; instrucciones_transportes: string | null }>(
      `SELECT disponible_transportes, instrucciones_transportes FROM unidad WHERE id = $1`,
      [data.unidad_id],
    );
    const forzadaNoDisponible = estadoUnidad?.disponible_transportes === false;

    const salidaId: number = await db.one(
      `SELECT iniciar_salida_unidad($1, $2, $3, $4, $5) AS salida_id`,
      [data.unidad_id, data.ruta_inicial_id ?? null, data.km_inicial ?? null, data.indicador ?? null, data.observaciones_salida ?? null],
    ).then((r) => r.salida_id);

    const tieneTripulacion = Array.isArray(data.tripulacion) && data.tripulacion.length > 0;
    await db.none(
      `UPDATE salida_unidad SET origen = 'COP_EMERGENCIA', tripulacion = $1 WHERE id = $2`,
      [tieneTripulacion ? JSON.stringify(data.tripulacion) : null, salidaId],
    );

    const descEvento = [
      tieneTripulacion
        ? `Salida iniciada desde COP con ${data.tripulacion!.length} integrante(s)`
        : 'Salida iniciada desde COP',
      forzadaNoDisponible
        ? `[FORZADA: unidad marcada no disponible por Transportes — "${estadoUnidad!.instrucciones_transportes || 'sin motivo'}"]`
        : null,
    ].filter(Boolean).join(' ');

    await db.none(
      `INSERT INTO salida_evento (salida_id, tipo, descripcion, datos_new, realizado_por)
       VALUES ($1, 'INICIO_COP', $2, $3, $4)`,
      [salidaId, descEvento,
       JSON.stringify({ unidad_id: data.unidad_id, ruta_inicial_id: data.ruta_inicial_id, tripulacion: data.tripulacion ?? null, forzada_no_disponible: forzadaNoDisponible }),
       data.userId],
    );

    return { salidaId, forzadaNoDisponible, instrucciones: estadoUnidad?.instrucciones_transportes ?? null };
  },

  async finalizarSalidaCOP(salidaId: number, data: {
    km_final?: number | null;
    indicador?: number | null;
    observaciones_regreso?: string | null;
    userId: number;
  }): Promise<{ unidad_id: number } | null> {
    const salidaInfo = await db.oneOrNone<{ unidad_id: number }>(
      `SELECT unidad_id FROM salida_unidad WHERE id = $1 AND estado = 'EN_SALIDA'`,
      [salidaId],
    );
    if (!salidaInfo) return null;

    await db.tx(async (conn) => {
      await ActividadModel.cerrarActivasDeUnidad(salidaInfo.unidad_id, conn);
      await conn.none(
        `UPDATE actividad SET salida_unidad_id = NULL WHERE salida_unidad_id = $1`,
        [salidaId],
      );

      const { success } = await conn.one<{ success: boolean }>(
        `SELECT finalizar_salida_unidad($1, $2, $3, $4, $5) AS success`,
        [salidaId, data.km_final ?? null, data.indicador ?? null, data.observaciones_regreso ?? null, data.userId],
      );
      if (!success) throw new Error('finalizar_salida_unidad retornó false');

      await conn.none(
        `UPDATE situacion_actual
         SET situacion_id = NULL, tipo_situacion = NULL, estado = NULL,
             latitud = NULL, longitud = NULL, km = NULL, sentido = NULL,
             ruta_id = NULL, ruta_codigo = NULL, situacion_created_at = NULL,
             actividad_id = NULL, actividad_tipo_nombre = NULL, actividad_estado = NULL,
             actividad_created_at = NULL, icono = NULL, updated_at = NOW()
         WHERE unidad_id = $1`,
        [salidaInfo.unidad_id],
      );
    });

    return salidaInfo;
  },

  async getSalidaActivaDeUnidad(unidadId: number): Promise<{ id: number } | null> {
    return db.oneOrNone(
      `SELECT id FROM salida_unidad WHERE unidad_id = $1 AND estado = 'EN_SALIDA'`,
      [unidadId],
    );
  },

  async registrarCambioRuta(salidaId: number, rutaId: number, userId: number): Promise<any | null> {
    const antes = await db.oneOrNone<{ ruta_inicial_id: number | null; ruta_codigo: string | null }>(
      `SELECT su.ruta_inicial_id, r.codigo AS ruta_codigo
       FROM salida_unidad su LEFT JOIN ruta r ON su.ruta_inicial_id = r.id
       WHERE su.id = $1`,
      [salidaId],
    );

    const updated = await db.result(
      `UPDATE salida_unidad SET ruta_inicial_id = $2 WHERE id = $1 AND estado = 'EN_SALIDA'`,
      [salidaId, rutaId],
    );
    if (updated.rowCount === 0) return null;

    const nuevaRuta = await db.oneOrNone<{ codigo: string }>('SELECT codigo FROM ruta WHERE id = $1', [rutaId]);

    await db.none(
      `INSERT INTO salida_evento (salida_id, tipo, descripcion, datos_ant, datos_new, realizado_por)
       VALUES ($1, 'CAMBIO_RUTA', $2, $3, $4, $5)`,
      [salidaId,
       `Ruta cambiada: ${antes?.ruta_codigo ?? 'sin ruta'} → ${nuevaRuta?.codigo ?? rutaId}`,
       JSON.stringify({ ruta_id: antes?.ruta_inicial_id }),
       JSON.stringify({ ruta_id: rutaId }),
       userId],
    );

    await db.none(
      `UPDATE situacion_actual sa
       SET ruta_id = $1, ruta_codigo = $2, updated_at = NOW()
       FROM salida_unidad su
       WHERE su.id = $3 AND sa.unidad_id = su.unidad_id`,
      [rutaId, nuevaRuta?.codigo ?? null, salidaId],
    );

    return db.oneOrNone('SELECT * FROM salida_unidad WHERE id = $1', [salidaId]);
  },

  async editarDatosSalida(salidaId: number, campos: {
    km_inicial?: number | null;
    combustible?: number | null;
  }, userId: number): Promise<any | null> {
    const sets: string[] = ['updated_at = NOW()'];
    const params: Record<string, unknown> = { id: salidaId };

    if (campos.km_inicial !== undefined) {
      sets.push('km_inicial = $/km_inicial/');
      params.km_inicial = campos.km_inicial;
    }
    if (campos.combustible !== undefined) {
      sets.push('combustible_inicial = $/combustible/');
      params.combustible = campos.combustible;
    }

    const antes = await db.oneOrNone<{ km_inicial: number | null; combustible_inicial: number | null }>(
      'SELECT km_inicial, combustible_inicial FROM salida_unidad WHERE id = $/id/',
      params,
    );
    if (!antes) return null;

    await db.none(`UPDATE salida_unidad SET ${sets.join(', ')} WHERE id = $/id/`, params);

    if (campos.km_inicial !== undefined) {
      await db.none(
        `INSERT INTO salida_evento (salida_id, tipo, descripcion, datos_ant, datos_new, realizado_por)
         VALUES ($/id/, 'EDICION_KM', $/desc/, $/ant/, $/new/, $/userId/)`,
        {
          id: salidaId,
          desc: `km_inicial editado: ${antes.km_inicial} → ${campos.km_inicial}`,
          ant: JSON.stringify({ km_inicial: antes.km_inicial }),
          new: JSON.stringify({ km_inicial: campos.km_inicial }),
          userId,
        },
      );
    }
    if (campos.combustible !== undefined) {
      await db.none(
        `INSERT INTO salida_evento (salida_id, tipo, descripcion, datos_ant, datos_new, realizado_por)
         VALUES ($/id/, 'EDICION_COMBUSTIBLE', $/desc/, $/ant/, $/new/, $/userId/)`,
        {
          id: salidaId,
          desc: `combustible_inicial editado: ${antes.combustible_inicial} → ${campos.combustible}`,
          ant: JSON.stringify({ combustible_inicial: antes.combustible_inicial }),
          new: JSON.stringify({ combustible_inicial: campos.combustible }),
          userId,
        },
      );
    }

    return this.getSalidaById(salidaId);
  },

  async getBitacoraTimeline(salidaId: number): Promise<{ salida: any; timeline: any[] } | null> {
    const salida = await db.oneOrNone(
      `SELECT s.*, u.codigo AS unidad_codigo, u.tipo_unidad,
              r.codigo AS ruta_codigo, r.nombre AS ruta_nombre,
              fin.nombre_completo AS finalizado_por_nombre
       FROM salida_unidad s
       JOIN unidad u ON s.unidad_id = u.id
       LEFT JOIN ruta r ON s.ruta_inicial_id = r.id
       LEFT JOIN usuario fin ON s.finalizada_por = fin.id
       WHERE s.id = $1`,
      [salidaId],
    );
    if (!salida) return null;

    const timeline = await db.any(
      `-- SITUACIONES
       SELECT
         'SITUACION'          AS tipo,
         sit.id               AS ref_id,
         sit.created_at       AS ts,
         json_build_object(
           'id',              sit.id,
           'codigo',          sit.codigo_situacion,
           'tipo_macro',      sit.tipo_situacion,
           'tipo_nombre',     cts.nombre,
           'estado',          sit.estado,
           'km',              sit.km,
           'sentido',         sit.sentido,
           'area',            sit.area,
           'referencia',      COALESCE(sit.referencia_ubicacion, sit.direccion_detallada),
           'departamento',    dep.nombre,
           'municipio',       mun.nombre,
           'latitud',         sit.latitud,
           'longitud',        sit.longitud,
           'observaciones',   sit.observaciones,
           'causa_probable',  sit.causa_probable,
           'causa_especificar', sit.causa_especificar,
           'hora_aviso',      sit.fecha_hora_aviso,
           'hora_llegada',    sit.fecha_hora_llegada,
           'hora_cierre',     sit.fecha_hora_finalizacion,
           'heridos',         sit.heridos,
           'heridos_leves',   sit.heridos_leves,
           'heridos_graves',  sit.heridos_graves,
           'fallecidos',      sit.fallecidos,
           'ilesos',          sit.ilesos,
           'trasladados',     sit.trasladados,
           'fugados',         sit.fugados,
           'danios_materiales',      sit.danios_materiales,
           'danios_infraestructura', sit.danios_infraestructura,
           'danios_descripcion',     sit.danios_descripcion,
           'clima',           sit.clima,
           'carga_vehicular', sit.carga_vehicular,
           'tipo_pavimento',  sit.tipo_pavimento,
           'iluminacion',     sit.iluminacion,
           'senalizacion',    sit.senalizacion,
           'visibilidad',     sit.visibilidad,
           'via_estado',      sit.via_estado,
           'acuerdo_involucrados', sit.acuerdo_involucrados,
           'acuerdo_detalle',      sit.acuerdo_detalle,
           'reportado_por_nombre',   sit.reportado_por_nombre,
           'reportado_por_telefono', sit.reportado_por_telefono,
           'numero_boleta',          sit.numero_boleta,
           'codigo_boleta',          sit.codigo_boleta,
           'obstruccion_data',  sit.obstruccion_data,
           'creado_por_nombre',  u_cre.nombre_completo,
           'cerrado_por_nombre', u_cer.nombre_completo,
           'vehiculos', COALESCE(
             (SELECT json_agg(json_build_object(
                 'placa',          v.placa,
                 'marca',          mv.nombre,
                 'color',          v.color,
                 'piloto',         COALESCE(sv.datos_piloto->>'nombre', p.nombre),
                 'licencia',       COALESCE(sv.datos_piloto->>'licencia', p.licencia_numero::text),
                 'estado_piloto',  sv.estado_piloto,
                 'heridos',        sv.heridos_en_vehiculo,
                 'fallecidos',     sv.fallecidos_en_vehiculo,
                 'danos',          sv.danos_estimados,
                 'sancion',        sv.sancion
               ) ORDER BY sv.id)
              FROM situacion_vehiculo sv
              JOIN vehiculo v ON sv.vehiculo_id = v.id
              LEFT JOIN marca_vehiculo mv ON v.marca_id = mv.id
              LEFT JOIN piloto p ON sv.piloto_id = p.id
              WHERE sv.situacion_id = sit.id
             ), '[]'::json),
           'fotos', COALESCE(
             (SELECT json_agg(json_build_object(
                 'id',        sm.id,
                 'tipo',      sm.tipo,
                 'url',       sm.url_original,
                 'thumbnail', sm.url_thumbnail,
                 'titulo',    sm.infografia_titulo,
                 'subido_por', usm.nombre_completo
               ) ORDER BY sm.infografia_numero, sm.orden, sm.created_at)
              FROM situacion_multimedia sm
              LEFT JOIN usuario usm ON sm.subido_por = usm.id
              WHERE sm.situacion_id = sit.id
             ), '[]'::json)
         ) AS datos
       FROM situacion sit
       LEFT JOIN catalogo_tipo_situacion cts ON sit.tipo_situacion_id = cts.id
       LEFT JOIN usuario u_cre ON sit.creado_por = u_cre.id
       LEFT JOIN usuario u_cer ON sit.actualizado_por = u_cer.id
       LEFT JOIN departamento dep ON sit.departamento_id = dep.id
       LEFT JOIN municipio mun ON sit.municipio_id = mun.id
       WHERE sit.salida_unidad_id = $1

       UNION ALL

       -- ACTIVIDADES
       SELECT
         'ACTIVIDAD'          AS tipo,
         act.id               AS ref_id,
         act.created_at       AS ts,
         json_build_object(
           'id',              act.id,
           'codigo',          act.codigo_actividad,
           'tipo_nombre',     cts2.nombre,
           'km',              act.km,
           'sentido',         act.sentido,
           'observaciones',   act.observaciones,
           'estado',          act.estado,
           'datos',           act.datos,
           'closed_at',       act.closed_at,
           'creado_por_nombre', u2.nombre_completo,
           'fotos', COALESCE(
             (SELECT json_agg(json_build_object(
                 'id',        sm.id,
                 'tipo',      sm.tipo,
                 'url',       sm.url_original,
                 'thumbnail', sm.url_thumbnail,
                 'titulo',    sm.infografia_titulo
               ) ORDER BY sm.infografia_numero, sm.orden, sm.created_at)
              FROM situacion_multimedia sm
              WHERE sm.actividad_id = act.id
             ), '[]'::json)
         ) AS datos
       FROM actividad act
       LEFT JOIN catalogo_tipo_situacion cts2 ON act.tipo_actividad_id = cts2.id
       LEFT JOIN usuario u2 ON act.creado_por = u2.id
       WHERE act.salida_unidad_id = $1

       UNION ALL

       -- EVENTOS (ediciones, cambio ruta, inicio COP, etc.)
       SELECT
         'EVENTO'             AS tipo,
         ev.id                AS ref_id,
         ev.created_at        AS ts,
         json_build_object(
           'id',              ev.id,
           'tipo_evento',     ev.tipo,
           'descripcion',     ev.descripcion,
           'datos_ant',       ev.datos_ant,
           'datos_new',       ev.datos_new,
           'realizado_por',   uev.nombre_completo
         ) AS datos
       FROM salida_evento ev
       LEFT JOIN usuario uev ON ev.realizado_por = uev.id
       WHERE ev.salida_id = $1

       ORDER BY ts ASC`,
      [salidaId],
    );

    return { salida, timeline };
  },

  async getBitacoraDia(fecha: string, sedeId?: number): Promise<any[]> {
    return db.any(
      `SELECT
         s.id              AS salida_id,
         s.unidad_id,
         u.codigo          AS unidad_codigo,
         u.tipo_unidad,
         u.sede_id,
         sede.nombre       AS sede_nombre,
         r.codigo          AS ruta_codigo,
         r.nombre          AS ruta_nombre,
         s.fecha_hora_salida,
         s.fecha_hora_regreso,
         s.estado,
         s.km_inicial,
         s.km_final,
         s.km_recorridos,
         s.combustible_inicial,
         s.combustible_final,
         s.tripulacion,
         s.observaciones_salida,
         s.observaciones_regreso,
         fin.nombre_completo                       AS finalizado_por_nombre,
         COUNT(DISTINCT sit.id)::int               AS total_situaciones,
         COUNT(DISTINCT act.id)::int               AS total_actividades,
         COUNT(DISTINCT ev.id)::int                AS total_eventos,
         COALESCE(
           (SELECT json_agg(json_build_object(
               'tipo', sit2.tipo_situacion,
               'tipo_nombre', cts.nombre
             ) ORDER BY sit2.created_at)
            FROM situacion sit2
            LEFT JOIN catalogo_tipo_situacion cts ON sit2.tipo_situacion_id = cts.id
            WHERE sit2.salida_unidad_id = s.id
           ), '[]'::json)                          AS situaciones_resumen
       FROM salida_unidad s
       JOIN unidad u    ON s.unidad_id = u.id
       JOIN sede        ON u.sede_id = sede.id
       LEFT JOIN ruta r ON s.ruta_inicial_id = r.id
       LEFT JOIN usuario fin ON s.finalizada_por = fin.id
       LEFT JOIN situacion sit ON sit.salida_unidad_id = s.id
       LEFT JOIN actividad act ON act.salida_unidad_id = s.id
       LEFT JOIN salida_evento ev ON ev.salida_id = s.id
       WHERE DATE(s.fecha_hora_salida AT TIME ZONE 'America/Guatemala') = $1::date
         AND ($2::integer IS NULL OR u.sede_id = $2)
       GROUP BY s.id, u.codigo, u.tipo_unidad, u.sede_id, sede.nombre,
                r.codigo, r.nombre, fin.nombre_completo
       ORDER BY u.codigo, s.fecha_hora_salida`,
      [fecha, sedeId ?? null],
    );
  },

  async getBitacoraUnidad(unidadId: number, limit: number, fechaDesde?: string): Promise<any[]> {
    return db.any(
      `SELECT
         s.id,
         s.unidad_id,
         u.codigo                                      AS unidad_codigo,
         u.tipo_unidad,
         r.codigo                                      AS ruta_codigo,
         r.nombre                                      AS ruta_nombre,
         s.fecha_hora_salida,
         s.fecha_hora_regreso,
         s.estado,
         s.km_inicial,
         s.km_final,
         s.km_recorridos,
         s.combustible_inicial,
         s.combustible_final,
         s.tripulacion,
         s.observaciones_salida,
         s.observaciones_regreso,
         COALESCE(
           (SELECT json_agg(json_build_object(
               'id',            sit.id,
               'tipo_macro',    sit.tipo_situacion,
               'tipo_nombre',   cts.nombre,
               'km',            sit.km,
               'sentido',       sit.sentido,
               'observaciones', sit.observaciones,
               'created_at',    sit.created_at,
               'cerrado_at',    sit.cerrado_at
             ) ORDER BY sit.created_at)
            FROM situacion sit
            LEFT JOIN catalogo_tipo_situacion cts ON sit.tipo_situacion_id = cts.id
            WHERE sit.salida_unidad_id = s.id
           ), '[]'::json)                             AS situaciones,
         COALESCE(
           (SELECT json_agg(json_build_object(
               'id',            a.id,
               'tipo_nombre',   cts2.nombre,
               'km',            a.km,
               'sentido',       a.sentido,
               'observaciones', a.observaciones,
               'estado',        a.estado,
               'created_at',    a.created_at,
               'closed_at',     a.closed_at
             ) ORDER BY a.created_at)
            FROM actividad a
            LEFT JOIN catalogo_tipo_situacion cts2 ON a.tipo_actividad_id = cts2.id
            WHERE a.salida_unidad_id = s.id
           ), '[]'::json)                             AS actividades
       FROM salida_unidad s
       JOIN unidad u ON s.unidad_id = u.id
       LEFT JOIN ruta r ON s.ruta_inicial_id = r.id
       WHERE s.unidad_id = $1
         AND ($3::date IS NULL OR s.fecha_hora_salida >= $3::date)
       ORDER BY s.fecha_hora_salida DESC
       LIMIT $2`,
      [unidadId, limit, fechaDesde ?? null],
    );
  },
};
