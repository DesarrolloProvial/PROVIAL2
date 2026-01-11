import { db } from '../config/database';

// ========================================
// INTERFACES
// ========================================

export interface Plantilla360 {
  id: number;
  tipo_unidad: string;
  nombre: string;
  descripcion: string | null;
  version: number;
  secciones: Seccion360[];
  activa: boolean;
  creado_por: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface Seccion360 {
  nombre: string;
  items: Item360[];
}

export interface Item360 {
  codigo: string;
  descripcion: string;
  tipo: 'CHECKBOX' | 'ESTADO' | 'TEXTO' | 'TEXTO_FOTO' | 'NUMERO';
  requerido: boolean;
  opciones?: string[];
}

export interface Inspeccion360 {
  id: number;
  salida_id: number | null;
  unidad_id: number;
  plantilla_id: number;
  realizado_por: number;
  aprobado_por: number | null;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  fecha_realizacion: Date;
  fecha_aprobacion: Date | null;
  respuestas: Respuesta360[];
  observaciones_inspector: string | null;
  observaciones_comandante: string | null;
  motivo_rechazo: string | null;
  firma_inspector: string | null;
  firma_comandante: string | null;
  fotos: string[] | null;
  created_at: Date;
  updated_at: Date;
}

export interface Respuesta360 {
  codigo: string;
  valor: boolean | string | number;
  foto_url?: string;
  observacion?: string;
}

export interface InspeccionConDetalles extends Inspeccion360 {
  unidad_codigo: string;
  tipo_unidad: string;
  inspector_nombre: string;
  inspector_chapa: string;
  aprobador_nombre?: string;
  aprobador_chapa?: string;
  plantilla_nombre: string;
}

export interface Comandante {
  usuario_id: number;
  nombre_completo: string;
  chapa: string;
  tipo_asignacion: 'PERMANENTE' | 'TURNO';
}

// ========================================
// MODELO: INSPECCION 360
// ========================================

export const Inspeccion360Model = {
  // ========================================
  // PLANTILLAS
  // ========================================

  /**
   * Obtener plantilla activa por tipo de unidad
   */
  async obtenerPlantillaPorTipo(tipoUnidad: string): Promise<Plantilla360 | null> {
    // Primero buscar plantilla específica
    let plantilla = await db.oneOrNone<Plantilla360>(
      `SELECT * FROM plantilla_inspeccion_360
       WHERE tipo_unidad = $1 AND activa = TRUE`,
      [tipoUnidad]
    );

    // Si no existe, usar plantilla DEFAULT
    if (!plantilla) {
      plantilla = await db.oneOrNone<Plantilla360>(
        `SELECT * FROM plantilla_inspeccion_360
         WHERE tipo_unidad = 'DEFAULT' AND activa = TRUE`
      );
    }

    return plantilla;
  },

  /**
   * Obtener todas las plantillas activas
   */
  async obtenerPlantillasActivas(): Promise<Plantilla360[]> {
    return db.any<Plantilla360>(
      `SELECT * FROM plantilla_inspeccion_360
       WHERE activa = TRUE
       ORDER BY tipo_unidad`
    );
  },

  /**
   * Obtener plantilla por ID
   */
  async obtenerPlantillaPorId(id: number): Promise<Plantilla360 | null> {
    return db.oneOrNone<Plantilla360>(
      `SELECT * FROM plantilla_inspeccion_360 WHERE id = $1`,
      [id]
    );
  },

  /**
   * Crear nueva plantilla
   */
  async crearPlantilla(data: {
    tipo_unidad: string;
    nombre: string;
    descripcion?: string;
    secciones: Seccion360[];
    creado_por: number;
  }): Promise<Plantilla360> {
    // Desactivar plantilla anterior del mismo tipo si existe
    await db.none(
      `UPDATE plantilla_inspeccion_360
       SET activa = FALSE
       WHERE tipo_unidad = $1 AND activa = TRUE`,
      [data.tipo_unidad]
    );

    return db.one<Plantilla360>(
      `INSERT INTO plantilla_inspeccion_360
       (tipo_unidad, nombre, descripcion, secciones, creado_por)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.tipo_unidad,
        data.nombre,
        data.descripcion || null,
        JSON.stringify(data.secciones),
        data.creado_por
      ]
    );
  },

  /**
   * Actualizar plantilla (crea nueva versión)
   */
  async actualizarPlantilla(id: number, data: {
    nombre?: string;
    descripcion?: string;
    secciones?: Seccion360[];
    creado_por: number;
  }): Promise<Plantilla360> {
    const plantillaActual = await this.obtenerPlantillaPorId(id);
    if (!plantillaActual) {
      throw new Error('Plantilla no encontrada');
    }

    // Desactivar versión anterior
    await db.none(
      `UPDATE plantilla_inspeccion_360 SET activa = FALSE WHERE id = $1`,
      [id]
    );

    // Crear nueva versión
    return db.one<Plantilla360>(
      `INSERT INTO plantilla_inspeccion_360
       (tipo_unidad, nombre, descripcion, version, secciones, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        plantillaActual.tipo_unidad,
        data.nombre || plantillaActual.nombre,
        data.descripcion !== undefined ? data.descripcion : plantillaActual.descripcion,
        plantillaActual.version + 1,
        JSON.stringify(data.secciones || plantillaActual.secciones),
        data.creado_por
      ]
    );
  },

  // ========================================
  // INSPECCIONES
  // ========================================

  /**
   * Crear nueva inspección 360
   */
  async crearInspeccion(data: {
    salida_id?: number;
    unidad_id: number;
    plantilla_id: number;
    realizado_por: number;
    respuestas: Respuesta360[];
    observaciones_inspector?: string;
    firma_inspector?: string;
    fotos?: string[];
  }): Promise<Inspeccion360> {
    return db.one<Inspeccion360>(
      `INSERT INTO inspeccion_360
       (salida_id, unidad_id, plantilla_id, realizado_por, respuestas,
        observaciones_inspector, firma_inspector, fotos)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.salida_id || null,
        data.unidad_id,
        data.plantilla_id,
        data.realizado_por,
        JSON.stringify(data.respuestas),
        data.observaciones_inspector || null,
        data.firma_inspector || null,
        data.fotos ? JSON.stringify(data.fotos) : null
      ]
    );
  },

  /**
   * Obtener inspección por ID con detalles
   */
  async obtenerInspeccionPorId(id: number): Promise<InspeccionConDetalles | null> {
    return db.oneOrNone<InspeccionConDetalles>(
      `SELECT
         i.*,
         u.codigo AS unidad_codigo,
         u.tipo_unidad,
         insp.nombre_completo AS inspector_nombre,
         insp.chapa AS inspector_chapa,
         apr.nombre_completo AS aprobador_nombre,
         apr.chapa AS aprobador_chapa,
         p.nombre AS plantilla_nombre
       FROM inspeccion_360 i
       JOIN unidad u ON i.unidad_id = u.id
       JOIN usuario insp ON i.realizado_por = insp.id
       LEFT JOIN usuario apr ON i.aprobado_por = apr.id
       JOIN plantilla_inspeccion_360 p ON i.plantilla_id = p.id
       WHERE i.id = $1`,
      [id]
    );
  },

  /**
   * Obtener inspección de una salida
   */
  async obtenerInspeccionPorSalida(salidaId: number): Promise<InspeccionConDetalles | null> {
    return db.oneOrNone<InspeccionConDetalles>(
      `SELECT
         i.*,
         u.codigo AS unidad_codigo,
         u.tipo_unidad,
         insp.nombre_completo AS inspector_nombre,
         insp.chapa AS inspector_chapa,
         apr.nombre_completo AS aprobador_nombre,
         apr.chapa AS aprobador_chapa,
         p.nombre AS plantilla_nombre
       FROM inspeccion_360 i
       JOIN unidad u ON i.unidad_id = u.id
       JOIN usuario insp ON i.realizado_por = insp.id
       LEFT JOIN usuario apr ON i.aprobado_por = apr.id
       JOIN plantilla_inspeccion_360 p ON i.plantilla_id = p.id
       WHERE i.salida_id = $1
         AND i.estado IN ('PENDIENTE', 'APROBADA')
       ORDER BY i.created_at DESC
       LIMIT 1`,
      [salidaId]
    );
  },

  /**
   * Obtener inspección pendiente de una unidad (sin salida asociada aún)
   */
  async obtenerInspeccionPendienteUnidad(unidadId: number): Promise<InspeccionConDetalles | null> {
    return db.oneOrNone<InspeccionConDetalles>(
      `SELECT
         i.*,
         u.codigo AS unidad_codigo,
         u.tipo_unidad,
         insp.nombre_completo AS inspector_nombre,
         insp.chapa AS inspector_chapa,
         apr.nombre_completo AS aprobador_nombre,
         apr.chapa AS aprobador_chapa,
         p.nombre AS plantilla_nombre
       FROM inspeccion_360 i
       JOIN unidad u ON i.unidad_id = u.id
       JOIN usuario insp ON i.realizado_por = insp.id
       LEFT JOIN usuario apr ON i.aprobado_por = apr.id
       JOIN plantilla_inspeccion_360 p ON i.plantilla_id = p.id
       WHERE i.unidad_id = $1
         AND i.salida_id IS NULL
         AND i.estado = 'PENDIENTE'
         AND i.fecha_realizacion > NOW() - INTERVAL '24 hours'
       ORDER BY i.created_at DESC
       LIMIT 1`,
      [unidadId]
    );
  },

  /**
   * Verificar si puede iniciar salida (tiene 360 aprobada)
   */
  async puedeIniciarSalida(salidaId: number): Promise<{
    puede_iniciar: boolean;
    inspeccion_id: number | null;
    estado_inspeccion: string | null;
    mensaje: string;
  }> {
    const result = await db.one<{
      puede_iniciar: boolean;
      inspeccion_id: number | null;
      estado_inspeccion: string | null;
      mensaje: string;
    }>(
      `SELECT * FROM puede_iniciar_salida_con_360($1)`,
      [salidaId]
    );
    return result;
  },

  /**
   * Aprobar inspección 360
   */
  async aprobarInspeccion(
    inspeccionId: number,
    aprobadorId: number,
    firma?: string,
    observaciones?: string
  ): Promise<{ success: boolean; mensaje: string }> {
    const result = await db.one<{ success: boolean; mensaje: string }>(
      `SELECT * FROM aprobar_inspeccion_360($1, $2, $3, $4)`,
      [inspeccionId, aprobadorId, firma || null, observaciones || null]
    );
    return result;
  },

  /**
   * Rechazar inspección 360
   */
  async rechazarInspeccion(
    inspeccionId: number,
    aprobadorId: number,
    motivo: string
  ): Promise<{ success: boolean; mensaje: string }> {
    const result = await db.one<{ success: boolean; mensaje: string }>(
      `SELECT * FROM rechazar_inspeccion_360($1, $2, $3)`,
      [inspeccionId, aprobadorId, motivo]
    );
    return result;
  },

  /**
   * Actualizar inspección (solo si está pendiente)
   */
  async actualizarInspeccion(
    inspeccionId: number,
    data: {
      respuestas?: Respuesta360[];
      observaciones_inspector?: string;
      firma_inspector?: string;
      fotos?: string[];
    }
  ): Promise<Inspeccion360 | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.respuestas) {
      updates.push(`respuestas = $${paramIndex++}`);
      values.push(JSON.stringify(data.respuestas));
    }
    if (data.observaciones_inspector !== undefined) {
      updates.push(`observaciones_inspector = $${paramIndex++}`);
      values.push(data.observaciones_inspector);
    }
    if (data.firma_inspector !== undefined) {
      updates.push(`firma_inspector = $${paramIndex++}`);
      values.push(data.firma_inspector);
    }
    if (data.fotos !== undefined) {
      updates.push(`fotos = $${paramIndex++}`);
      values.push(JSON.stringify(data.fotos));
    }

    if (updates.length === 0) {
      return this.obtenerInspeccionPorId(inspeccionId) as Promise<Inspeccion360 | null>;
    }

    values.push(inspeccionId);

    return db.oneOrNone<Inspeccion360>(
      `UPDATE inspeccion_360
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
         AND estado = 'PENDIENTE'
       RETURNING *`,
      values
    );
  },

  /**
   * Asociar inspección a una salida
   */
  async asociarASalida(inspeccionId: number, salidaId: number): Promise<boolean> {
    const result = await db.result(
      `UPDATE inspeccion_360
       SET salida_id = $2
       WHERE id = $1
         AND salida_id IS NULL
         AND estado IN ('PENDIENTE', 'APROBADA')`,
      [inspeccionId, salidaId]
    );
    return result.rowCount > 0;
  },

  // ========================================
  // HISTORIAL
  // ========================================

  /**
   * Obtener historial de inspecciones de una unidad
   */
  async obtenerHistorialUnidad(unidadId: number, limit: number = 20): Promise<InspeccionConDetalles[]> {
    return db.any<InspeccionConDetalles>(
      `SELECT
         i.*,
         u.codigo AS unidad_codigo,
         u.tipo_unidad,
         insp.nombre_completo AS inspector_nombre,
         insp.chapa AS inspector_chapa,
         apr.nombre_completo AS aprobador_nombre,
         apr.chapa AS aprobador_chapa,
         p.nombre AS plantilla_nombre
       FROM inspeccion_360 i
       JOIN unidad u ON i.unidad_id = u.id
       JOIN usuario insp ON i.realizado_por = insp.id
       LEFT JOIN usuario apr ON i.aprobado_por = apr.id
       JOIN plantilla_inspeccion_360 p ON i.plantilla_id = p.id
       WHERE i.unidad_id = $1
       ORDER BY i.fecha_realizacion DESC
       LIMIT $2`,
      [unidadId, limit]
    );
  },

  /**
   * Obtener inspecciones pendientes (para comandantes)
   */
  async obtenerInspeccionesPendientes(comandanteId?: number): Promise<any[]> {
    if (comandanteId) {
      // Solo inspecciones de unidades donde el usuario es comandante
      return db.any(
        `SELECT * FROM v_inspecciones_360_pendientes
         WHERE comandante_id = $1
         ORDER BY minutos_esperando DESC`,
        [comandanteId]
      );
    }
    // Todas las pendientes (para admins)
    return db.any(
      `SELECT * FROM v_inspecciones_360_pendientes
       ORDER BY minutos_esperando DESC`
    );
  },

  // ========================================
  // COMANDANTE
  // ========================================

  /**
   * Obtener comandante de una unidad
   */
  async obtenerComandante(unidadId: number): Promise<Comandante | null> {
    return db.oneOrNone<Comandante>(
      `SELECT * FROM obtener_comandante_unidad($1)`,
      [unidadId]
    );
  },

  /**
   * Verificar si usuario es comandante de una unidad
   */
  async esComandante(usuarioId: number, unidadId: number): Promise<boolean> {
    // 1. Verificar si es comandante explícito
    const result = await db.oneOrNone(
      `SELECT 1 FROM brigada_unidad
       WHERE brigada_id = $1
         AND unidad_id = $2
         AND activo = TRUE
         AND es_comandante = TRUE
       UNION
       SELECT 1 FROM tripulacion_turno tt
       JOIN asignacion_unidad au ON tt.asignacion_id = au.id
       WHERE tt.usuario_id = $1
         AND au.unidad_id = $2
         AND tt.es_comandante = TRUE`,
      [usuarioId, unidadId]
    );

    if (result) return true;

    // 2. Verificar si es el ÚNICO tripulante de la unidad hoy (Caso especial solicitado)
    // Si solo hay una persona en la unidad, esa persona es responsable/comandante
    const tripulacion = await db.any(
      `SELECT tt.usuario_id 
       FROM tripulacion_turno tt
       JOIN asignacion_unidad au ON tt.asignacion_id = au.id
       JOIN turno t ON au.turno_id = t.id
       WHERE au.unidad_id = $1
         AND t.fecha = CURRENT_DATE
         AND au.estado_nomina = 'LIBERADA'`,
      [unidadId]
    );

    if (tripulacion && tripulacion.length === 1 && tripulacion[0].usuario_id === usuarioId) {
      return true;
    }

    return false;
  },

  /**
   * Establecer comandante de una unidad (asignación permanente)
   */
  async establecerComandante(
    unidadId: number,
    comandanteId: number
  ): Promise<boolean> {
    // Quitar comandante actual
    await db.none(
      `UPDATE brigada_unidad
       SET es_comandante = FALSE
       WHERE unidad_id = $1 AND activo = TRUE`,
      [unidadId]
    );

    // Establecer nuevo comandante
    const result = await db.result(
      `UPDATE brigada_unidad
       SET es_comandante = TRUE
       WHERE unidad_id = $1
         AND brigada_id = $2
         AND activo = TRUE`,
      [unidadId, comandanteId]
    );

    return result.rowCount > 0;
  },

  // ========================================
  // ESTADÍSTICAS
  // ========================================

  /**
   * Obtener estadísticas de inspecciones
   */
  async obtenerEstadisticas(fechaInicio?: Date, fechaFin?: Date): Promise<{
    total: number;
    aprobadas: number;
    rechazadas: number;
    pendientes: number;
    por_tipo_unidad: { tipo: string; cantidad: number }[];
  }> {
    const fechaCondition = fechaInicio && fechaFin
      ? `WHERE i.fecha_realizacion BETWEEN $1 AND $2`
      : '';
    const params = fechaInicio && fechaFin ? [fechaInicio, fechaFin] : [];

    const stats = await db.one(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE estado = 'APROBADA') AS aprobadas,
         COUNT(*) FILTER (WHERE estado = 'RECHAZADA') AS rechazadas,
         COUNT(*) FILTER (WHERE estado = 'PENDIENTE') AS pendientes
       FROM inspeccion_360 i
       ${fechaCondition}`,
      params
    );

    const porTipo = await db.any(
      `SELECT u.tipo_unidad AS tipo, COUNT(*) AS cantidad
       FROM inspeccion_360 i
       JOIN unidad u ON i.unidad_id = u.id
       ${fechaCondition}
       GROUP BY u.tipo_unidad
       ORDER BY cantidad DESC`,
      params
    );

    return {
      total: parseInt(stats.total),
      aprobadas: parseInt(stats.aprobadas),
      rechazadas: parseInt(stats.rechazadas),
      pendientes: parseInt(stats.pendientes),
      por_tipo_unidad: porTipo.map((r: any) => ({
        tipo: r.tipo,
        cantidad: parseInt(r.cantidad)
      }))
    };
  }
};
