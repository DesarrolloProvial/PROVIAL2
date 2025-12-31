/**
 * Modelo para funcionalidades avanzadas de asignaciones
 * - Asignaciones por sede con tripulación detallada
 * - Historial de rutas para alertas de rotación
 * - Avisos en asignaciones
 * - Sistema de borradores (publicación)
 */

import { db } from '../config/database';

// =====================================================
// INTERFACES
// =====================================================

export interface AsignacionPorSede {
  turno_id: number;
  fecha: Date;
  turno_estado: string;
  publicado: boolean;
  fecha_publicacion: Date | null;
  sede_id: number;
  sede_nombre: string;
  sede_codigo: string;
  creado_por: number;
  creado_por_nombre: string;
  // Configuración visual
  color_fondo: string;
  color_fondo_header: string;
  color_texto: string;
  color_acento: string;
  fuente: string;
  tamano_fuente: string;
  alerta_rotacion_rutas_activa: boolean;
  umbral_rotacion_rutas: number;
  // Asignación
  asignacion_id: number;
  unidad_id: number;
  unidad_codigo: string;
  tipo_unidad: string;
  unidad_placa: string;
  // Ruta
  ruta_id: number | null;
  ruta_codigo: string | null;
  ruta_nombre: string | null;
  km_inicio: number | null;
  km_final: number | null;
  sentido: string | null;
  // Acciones
  acciones: string | null;
  acciones_formato: string | null;
  hora_salida: string | null;
  // Situación fija
  situacion_fija_id: number | null;
  situacion_fija_titulo: string | null;
  situacion_fija_tipo: string | null;
  // Estado
  en_ruta: boolean;
  salida_estado: string | null;
  // Datos adicionales (se agregan después)
  tripulacion?: TripulacionDetalle[];
  avisos?: AvisoAsignacion[];
}

export interface TripulacionDetalle {
  usuario_id: number;
  nombre_completo: string;
  chapa: string;
  telefono: string | null;
  rol_tripulacion: string;
  licencia_tipo: string | null;
  rol_brigada: string | null;
  // Alertas de rotación
  veces_en_ruta?: number;
  veces_en_situacion?: number;
}

export interface AvisoAsignacion {
  id: number;
  asignacion_id: number;
  tipo: 'ADVERTENCIA' | 'INFO' | 'URGENTE';
  mensaje: string;
  color: string;
  creado_por: number;
  creador_nombre?: string;
  created_at: Date;
}

export interface SedeConAsignaciones {
  sede_id: number;
  sede_nombre: string;
  sede_codigo: string;
  color_fondo: string;
  color_fondo_header: string;
  color_texto: string;
  color_acento: string;
  fuente: string;
  tamano_fuente: string;
  alerta_rotacion_rutas_activa: boolean;
  umbral_rotacion_rutas: number;
  turno_id: number | null;
  turno_estado: string | null;
  publicado: boolean;
  fecha_publicacion: Date | null;
  creado_por: number | null;
  creado_por_nombre: string | null;
  asignaciones: AsignacionConDetalle[];
}

export interface AsignacionConDetalle {
  asignacion_id: number;
  unidad_id: number;
  unidad_codigo: string;
  tipo_unidad: string;
  unidad_placa: string;
  ruta_id: number | null;
  ruta_codigo: string | null;
  ruta_nombre: string | null;
  km_inicio: number | null;
  km_final: number | null;
  sentido: string | null;
  acciones: string | null;
  acciones_formato: string | null;
  hora_salida: string | null;
  situacion_fija_id: number | null;
  situacion_fija_titulo: string | null;
  situacion_fija_tipo: string | null;
  en_ruta: boolean;
  salida_estado: string | null;
  tripulacion: TripulacionDetalle[];
  avisos: AvisoAsignacion[];
}

// =====================================================
// MODELO
// =====================================================

export const AsignacionAvanzadaModel = {
  /**
   * Obtener asignaciones agrupadas por sede para una fecha
   */
  async getAsignacionesPorSede(fecha: string | null, options?: {
    sedeId?: number;
    incluirBorradores?: boolean;
    mostrarPendientes?: boolean; // true = mostrar hoy y futuras
  }): Promise<SedeConAsignaciones[]> {
    // 1. Obtener asignaciones básicas
    let whereClause = '';
    const params: any[] = [];

    if (options?.mostrarPendientes) {
      // Mostrar todas las asignaciones pendientes (hoy y futuras)
      whereClause = 'WHERE fecha >= CURRENT_DATE';
    } else if (fecha) {
      params.push(fecha);
      whereClause = 'WHERE fecha = $1';
    } else {
      // Sin fecha = hoy
      whereClause = 'WHERE fecha = CURRENT_DATE';
    }

    if (options?.sedeId) {
      params.push(options.sedeId);
      whereClause += ` AND sede_id = $${params.length}`;
    }

    if (!options?.incluirBorradores) {
      whereClause += ` AND (publicado = true OR publicado IS NULL)`;
    }

    const asignaciones = await db.manyOrNone(
      `SELECT * FROM v_asignaciones_por_sede ${whereClause} ORDER BY fecha, hora_salida`,
      params
    );

    // 2. Obtener todas las sedes con su configuración (incluso sin asignaciones)
    const sedes = await db.manyOrNone(
      `SELECT s.id as sede_id, s.nombre as sede_nombre, s.codigo as sede_codigo,
              COALESCE(cv.color_fondo, '#ffffff') as color_fondo,
              COALESCE(cv.color_fondo_header, '#f3f4f6') as color_fondo_header,
              COALESCE(cv.color_texto, '#1f2937') as color_texto,
              COALESCE(cv.color_acento, '#3b82f6') as color_acento,
              COALESCE(cv.fuente, 'Inter') as fuente,
              COALESCE(cv.tamano_fuente, 'normal') as tamano_fuente,
              COALESCE(cv.alerta_rotacion_rutas_activa, true) as alerta_rotacion_rutas_activa,
              COALESCE(cv.umbral_rotacion_rutas, 3) as umbral_rotacion_rutas
       FROM sede s
       LEFT JOIN configuracion_visual_sede cv ON s.id = cv.sede_id
       WHERE s.activa = true
       ORDER BY s.nombre`
    );

    // 3. Obtener IDs únicos de asignaciones
    const asignacionIds = [...new Set(asignaciones.filter(a => a.asignacion_id).map(a => a.asignacion_id))];

    // 4. Obtener tripulación con detalles
    let tripulacionMap: Map<number, TripulacionDetalle[]> = new Map();
    if (asignacionIds.length > 0) {
      const tripulacion = await db.manyOrNone(
        `SELECT tt.asignacion_id,
                tt.usuario_id,
                u.nombre_completo,
                u.chapa,
                u.telefono,
                tt.rol_tripulacion,
                u.rol_brigada,
                NULL as licencia_tipo
         FROM tripulacion_turno tt
         JOIN usuario u ON tt.usuario_id = u.id
         WHERE tt.asignacion_id = ANY($1)
         ORDER BY tt.rol_tripulacion`,
        [asignacionIds]
      );

      for (const t of tripulacion) {
        if (!tripulacionMap.has(t.asignacion_id)) {
          tripulacionMap.set(t.asignacion_id, []);
        }
        tripulacionMap.get(t.asignacion_id)!.push(t);
      }
    }

    // 5. Obtener avisos
    let avisosMap: Map<number, AvisoAsignacion[]> = new Map();
    if (asignacionIds.length > 0) {
      const avisos = await db.manyOrNone(
        `SELECT aa.*, u.nombre_completo as creador_nombre
         FROM aviso_asignacion aa
         JOIN usuario u ON aa.creado_por = u.id
         WHERE aa.asignacion_id = ANY($1)
         ORDER BY aa.created_at`,
        [asignacionIds]
      );

      for (const a of avisos) {
        if (!avisosMap.has(a.asignacion_id)) {
          avisosMap.set(a.asignacion_id, []);
        }
        avisosMap.get(a.asignacion_id)!.push(a);
      }
    }

    // 6. Agrupar por sede
    const sedesMap: Map<number, SedeConAsignaciones> = new Map();

    // Inicializar todas las sedes
    for (const sede of sedes) {
      if (options?.sedeId && sede.sede_id !== options.sedeId) continue;

      sedesMap.set(sede.sede_id, {
        ...sede,
        turno_id: null,
        turno_estado: null,
        publicado: true,
        fecha_publicacion: null,
        creado_por: null,
        creado_por_nombre: null,
        asignaciones: []
      });
    }

    // Agregar asignaciones a cada sede
    for (const asig of asignaciones) {
      if (!asig.sede_id) continue;

      let sede = sedesMap.get(asig.sede_id);
      if (!sede) {
        // Sede sin configuración visual, crear con defaults
        sede = {
          sede_id: asig.sede_id,
          sede_nombre: asig.sede_nombre || `Sede ${asig.sede_id}`,
          sede_codigo: asig.sede_codigo || '',
          color_fondo: asig.color_fondo || '#ffffff',
          color_fondo_header: asig.color_fondo_header || '#f3f4f6',
          color_texto: asig.color_texto || '#1f2937',
          color_acento: asig.color_acento || '#3b82f6',
          fuente: asig.fuente || 'Inter',
          tamano_fuente: asig.tamano_fuente || 'normal',
          alerta_rotacion_rutas_activa: asig.alerta_rotacion_rutas_activa ?? true,
          umbral_rotacion_rutas: asig.umbral_rotacion_rutas || 3,
          turno_id: asig.turno_id,
          turno_estado: asig.turno_estado,
          publicado: asig.publicado ?? true,
          fecha_publicacion: asig.fecha_publicacion,
          creado_por: asig.creado_por,
          creado_por_nombre: asig.creado_por_nombre,
          asignaciones: []
        };
        sedesMap.set(asig.sede_id, sede);
      } else {
        // Actualizar info del turno
        if (asig.turno_id) {
          sede.turno_id = asig.turno_id;
          sede.turno_estado = asig.turno_estado;
          sede.publicado = asig.publicado ?? true;
          sede.fecha_publicacion = asig.fecha_publicacion;
          sede.creado_por = asig.creado_por;
          sede.creado_por_nombre = asig.creado_por_nombre;
        }
      }

      if (asig.asignacion_id) {
        sede.asignaciones.push({
          asignacion_id: asig.asignacion_id,
          unidad_id: asig.unidad_id,
          unidad_codigo: asig.unidad_codigo,
          tipo_unidad: asig.tipo_unidad,
          unidad_placa: asig.unidad_placa,
          ruta_id: asig.ruta_id,
          ruta_codigo: asig.ruta_codigo,
          ruta_nombre: asig.ruta_nombre,
          km_inicio: asig.km_inicio,
          km_final: asig.km_final,
          sentido: asig.sentido,
          acciones: asig.acciones,
          acciones_formato: asig.acciones_formato,
          hora_salida: asig.hora_salida,
          situacion_fija_id: asig.situacion_fija_id,
          situacion_fija_titulo: asig.situacion_fija_titulo,
          situacion_fija_tipo: asig.situacion_fija_tipo,
          en_ruta: asig.en_ruta,
          salida_estado: asig.salida_estado,
          tripulacion: tripulacionMap.get(asig.asignacion_id) || [],
          avisos: avisosMap.get(asig.asignacion_id) || []
        });
      }
    }

    return Array.from(sedesMap.values());
  },

  /**
   * Publicar turno (hacer visible para brigadas)
   */
  async publicarTurno(turnoId: number, userId: number): Promise<boolean> {
    const result = await db.result(
      `UPDATE turno
       SET publicado = true,
           fecha_publicacion = NOW(),
           publicado_por = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [turnoId, userId]
    );
    return result.rowCount > 0;
  },

  /**
   * Despublicar turno (volver a borrador)
   */
  async despublicarTurno(turnoId: number): Promise<boolean> {
    const result = await db.result(
      `UPDATE turno
       SET publicado = false,
           fecha_publicacion = NULL,
           publicado_por = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [turnoId]
    );
    return result.rowCount > 0;
  },

  /**
   * Registrar asignación en historial de rutas
   */
  async registrarHistorialRuta(params: {
    usuarioId: number;
    rutaId: number;
    fecha: string;
    turnoId?: number;
    asignacionId?: number;
  }): Promise<void> {
    await db.none(
      `INSERT INTO historial_ruta_brigada (usuario_id, ruta_id, fecha, turno_id, asignacion_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [params.usuarioId, params.rutaId, params.fecha, params.turnoId || null, params.asignacionId || null]
    );
  },

  /**
   * Registrar asignación en historial de situaciones
   */
  async registrarHistorialSituacion(params: {
    usuarioId: number;
    situacionFijaId: number;
    fecha: string;
    turnoId?: number;
    asignacionId?: number;
  }): Promise<void> {
    await db.none(
      `INSERT INTO historial_situacion_brigada (usuario_id, situacion_fija_id, fecha, turno_id, asignacion_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [params.usuarioId, params.situacionFijaId, params.fecha, params.turnoId || null, params.asignacionId || null]
    );
  },

  /**
   * Obtener alertas de rotación para un brigada
   */
  async getAlertasRotacion(usuarioId: number, rutaId?: number, situacionFijaId?: number, umbral: number = 3): Promise<{
    alertaRuta: boolean;
    vecesEnRuta: number;
    alertaSituacion: boolean;
    vecesEnSituacion: number;
  }> {
    let vecesEnRuta = 0;
    let vecesEnSituacion = 0;

    if (rutaId) {
      const resultRuta = await db.one(
        `SELECT contar_veces_en_ruta($1, $2, 30) as count`,
        [usuarioId, rutaId]
      );
      vecesEnRuta = resultRuta.count;
    }

    if (situacionFijaId) {
      const resultSituacion = await db.one(
        `SELECT contar_veces_en_situacion($1, $2, 30) as count`,
        [usuarioId, situacionFijaId]
      );
      vecesEnSituacion = resultSituacion.count;
    }

    return {
      alertaRuta: vecesEnRuta >= umbral,
      vecesEnRuta,
      alertaSituacion: vecesEnSituacion >= umbral,
      vecesEnSituacion
    };
  },

  /**
   * Crear aviso en asignación
   */
  async crearAviso(params: {
    asignacionId: number;
    tipo: 'ADVERTENCIA' | 'INFO' | 'URGENTE';
    mensaje: string;
    color?: string;
    creadoPor: number;
  }): Promise<AvisoAsignacion> {
    return db.one(
      `INSERT INTO aviso_asignacion (asignacion_id, tipo, mensaje, color, creado_por)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [params.asignacionId, params.tipo, params.mensaje, params.color || '#f59e0b', params.creadoPor]
    );
  },

  /**
   * Eliminar aviso
   */
  async eliminarAviso(avisoId: number): Promise<boolean> {
    const result = await db.result(
      `DELETE FROM aviso_asignacion WHERE id = $1`,
      [avisoId]
    );
    return result.rowCount > 0;
  },

  /**
   * Actualizar acciones con formato
   */
  async actualizarAccionesFormato(asignacionId: number, accionesFormato: string): Promise<boolean> {
    const result = await db.result(
      `UPDATE asignacion_unidad
       SET acciones_formato = $2, updated_at = NOW()
       WHERE id = $1`,
      [asignacionId, accionesFormato]
    );
    return result.rowCount > 0;
  },

  /**
   * Vincular asignación con situación fija
   */
  async vincularSituacionFija(asignacionId: number, situacionFijaId: number): Promise<boolean> {
    const result = await db.result(
      `UPDATE asignacion_unidad
       SET situacion_fija_id = $2, updated_at = NOW()
       WHERE id = $1`,
      [asignacionId, situacionFijaId]
    );
    return result.rowCount > 0;
  }
};
