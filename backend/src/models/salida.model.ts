import { db } from '../config/database';

// ========================================
// INTERFACES
// ========================================

export interface BrigadaUnidad {
  id: number;
  brigada_id: number;
  unidad_id: number;
  rol_tripulacion: 'PILOTO' | 'COPILOTO' | 'ACOMPAÑANTE';
  fecha_asignacion: Date;
  fecha_fin: Date | null;
  activo: boolean;
  observaciones: string | null;
  asignado_por: number | null;
  created_at: Date;
  updated_at: Date;
}

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

export interface MiUnidadAsignada {
  brigada_id: number;
  username: string;
  chapa: string | null;
  nombre_completo: string;
  asignacion_id: number;
  unidad_id: number;
  unidad_codigo: string;
  tipo_unidad: string;
  mi_rol: string;
  fecha_asignacion: Date;
  activo: boolean;
  companeros: any | null; // JSON array
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
  tipo_asignacion: 'PERMANENTE' | 'TURNO';
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
  // ASIGNACIONES PERMANENTES
  // ========================================

  /**
   * Obtener mi unidad asignada permanentemente
   */
  async getMiUnidadAsignada(brigadaId: number): Promise<MiUnidadAsignada | null> {
    return db.oneOrNone(
      'SELECT * FROM v_mi_unidad_asignada WHERE brigada_id = $1',
      [brigadaId]
    );
  },

  /**
   * Asignar brigadista a unidad permanentemente
   */
  async asignarBrigadaAUnidad(data: {
    brigada_id: number;
    unidad_id: number;
    rol_tripulacion: 'PILOTO' | 'COPILOTO' | 'ACOMPAÑANTE';
    asignado_por: number;
    observaciones?: string;
  }): Promise<BrigadaUnidad> {
    return db.one(
      `INSERT INTO brigada_unidad
       (brigada_id, unidad_id, rol_tripulacion, asignado_por, observaciones)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.brigada_id,
        data.unidad_id,
        data.rol_tripulacion,
        data.asignado_por,
        data.observaciones || null
      ]
    );
  },

  /**
   * Finalizar asignación permanente (por reasignación o baja)
   */
  async finalizarAsignacion(asignacionId: number): Promise<BrigadaUnidad> {
    return db.one(
      `UPDATE brigada_unidad
       SET activo = FALSE,
           fecha_fin = NOW()
       WHERE id = $1
       RETURNING *`,
      [asignacionId]
    );
  },

  /**
   * Obtener tripulación de una unidad
   */
  async getTripulacionUnidad(unidadId: number): Promise<any[]> {
    return db.any(
      `SELECT bu.*, u.username, u.chapa, u.nombre_completo
       FROM brigada_unidad bu
       JOIN usuario u ON bu.brigada_id = u.id
       WHERE bu.unidad_id = $1
         AND bu.activo = TRUE
       ORDER BY
         CASE bu.rol_tripulacion
           WHEN 'PILOTO' THEN 1
           WHEN 'COPILOTO' THEN 2
           WHEN 'ACOMPAÑANTE' THEN 3
         END`,
      [unidadId]
    );
  },

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
   * Obtener mi salida de hoy (activa o finalizada)
   * Incluye resumen de situaciones del día
   */
  async getMiSalidaHoy(brigadaId: number): Promise<any | null> {
    // Primero buscar en asignaciones permanentes
    const salidaPermanente = await db.oneOrNone(`
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
        bu.rol_tripulacion AS mi_rol,
        'PERMANENTE' AS tipo_asignacion,
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
      JOIN brigada_unidad bu ON u.id = bu.brigada_id AND bu.activo = true
      JOIN unidad un ON bu.unidad_id = un.id
      JOIN salida_unidad s ON un.id = s.unidad_id
        AND DATE(s.fecha_hora_salida) = CURRENT_DATE
      LEFT JOIN ruta r ON s.ruta_inicial_id = r.id
      WHERE u.id = $1
      ORDER BY s.fecha_hora_salida DESC
      LIMIT 1
    `, [brigadaId]);

    if (salidaPermanente) {
      return salidaPermanente;
    }

    // Si no hay permanente, buscar por turno (hoy, mañana, o rango que incluya hoy)
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
          -- Turno de hoy
          t.fecha = CURRENT_DATE
          -- Turno de mañana (permite trabajo adelantado)
          OR t.fecha = CURRENT_DATE + INTERVAL '1 day'
          -- Turno con rango que incluye hoy
          OR (t.fecha <= CURRENT_DATE AND COALESCE(t.fecha_fin, t.fecha) >= CURRENT_DATE)
          -- Turno activo o planificado reciente
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
      `SELECT * FROM salida_unidad
       WHERE unidad_id = $1
       ORDER BY fecha_hora_salida DESC
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

  /**
   * Verificar permisos de usuario sobre sede
   */
  async tienePermisoSede(usuarioId: number, sedeId: number): Promise<boolean> {
    const result = await db.one(
      `SELECT tiene_permiso_sede($1, $2) AS tiene_permiso`,
      [usuarioId, sedeId]
    );

    return result.tiene_permiso;
  },

  // ========================================
  // REASIGNACIONES
  // ========================================

  /**
   * Crear reasignación
   */
  async crearReasignacion(data: {
    tipo: 'USUARIO' | 'UNIDAD';
    recurso_id: number;
    sede_origen_id: number;
    sede_destino_id: number;
    fecha_inicio: string;
    fecha_fin?: string;
    es_permanente: boolean;
    motivo?: string;
    autorizado_por: number;
  }): Promise<any> {
    return db.one(
      `INSERT INTO reasignacion_sede
       (tipo, recurso_id, sede_origen_id, sede_destino_id,
        fecha_inicio, fecha_fin, es_permanente, motivo, autorizado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.tipo,
        data.recurso_id,
        data.sede_origen_id,
        data.sede_destino_id,
        data.fecha_inicio,
        data.fecha_fin || null,
        data.es_permanente,
        data.motivo || null,
        data.autorizado_por
      ]
    );
  },

  /**
   * Obtener reasignaciones activas
   */
  async getReasignacionesActivas(): Promise<any[]> {
    return db.any(
      `SELECT r.*,
              so.codigo AS sede_origen_codigo,
              so.nombre AS sede_origen_nombre,
              sd.codigo AS sede_destino_codigo,
              sd.nombre AS sede_destino_nombre,
              CASE
                WHEN r.tipo = 'USUARIO' THEN u.nombre_completo
                WHEN r.tipo = 'UNIDAD' THEN un.codigo
              END AS recurso_nombre
       FROM reasignacion_sede r
       JOIN sede so ON r.sede_origen_id = so.id
       JOIN sede sd ON r.sede_destino_id = sd.id
       LEFT JOIN usuario u ON r.tipo = 'USUARIO' AND r.recurso_id = u.id
       LEFT JOIN unidad un ON r.tipo = 'UNIDAD' AND r.recurso_id = un.id
       WHERE r.estado = 'ACTIVA'
       ORDER BY r.created_at DESC`
    );
  },

  /**
   * Finalizar reasignación
   */
  async finalizarReasignacion(reasignacionId: number): Promise<any> {
    return db.one(
      `UPDATE reasignacion_sede
       SET estado = 'FINALIZADA',
           fecha_fin = CURRENT_DATE
       WHERE id = $1
       RETURNING *`,
      [reasignacionId]
    );
  },
};
