/**
 * Modelo para funcionalidades avanzadas de asignaciones
 * - Asignaciones por sede con tripulación detallada
 * - Historial de rutas para alertas de rotación
 * - Avisos en asignaciones
 * - Sistema de borradores (publicación)
 */

import { db } from '../../config/database';

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
  // Estado de nómina
  estado_nomina: string | null;
  // Estado de salida
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
  estado_nomina: string | null;
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
          estado_nomina: asig.estado_nomina,
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
    return await db.tx(async t => {
      // 1. Verificar si el turno está vacío y si hay asignaciones sin unidad
      const stats = await t.one<{ empty: boolean, missing_units: boolean }>(`
        SELECT 
          (COUNT(*) = 0) as empty,
          (COUNT(*) FILTER (WHERE tipo_asignacion = 'PATRULLA' AND unidad_id IS NULL) > 0) as missing_units
        FROM asignacion_unidad
        WHERE turno_id = $1
      `, [turnoId]);

      if (stats.empty) {
        throw new Error('EMPTY_TURNO');
      }

      if (stats.missing_units) {
        throw new Error('MISSING_UNITS');
      }

      const result = await t.result(
        `UPDATE turno
         SET publicado = true,
             fecha_publicacion = NOW(),
             publicado_por = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [turnoId, userId]
      );
      
      return result.rowCount > 0;
    });
  },

  /**
   * Despublicar turno (volver a borrador)
   */
  async despublicarTurno(turnoId: number): Promise<boolean> {
    return await db.tx(async t => {
      const result = await t.result(
        `UPDATE turno
         SET publicado = false,
             fecha_publicacion = NULL,
             publicado_por = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [turnoId]
      );
      return result.rowCount > 0;
    });
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
   * Obtener alertas de rotación y el historial reciente para un brigada
   */
  async getAlertasRotacion(usuarioId: number, rutaId?: number, umbral: number = 3, fechaAsignacion?: string): Promise<{
    alertaRuta: boolean;
    vecesEnRuta: number;
    ultimaRutaNombre: string | null;
    salioAyer: boolean;
  }> {
    let vecesEnRuta = 0;
    let ultimaRutaNombre = null;
    let salioAyer = false;

    // Verificar veces en la ruta proporcionada (lógica actual para rotación)
    if (rutaId) {
      const resultRuta = await db.one(
        `SELECT contar_veces_en_ruta($1, $2, 30) as count`,
        [usuarioId, rutaId]
      );
      vecesEnRuta = parseInt(resultRuta.count, 10) || 0;
    }

    // Obtener la última salida y verificar si salió "ayer"
    // Buscamos la última salida física en la bitácora
    const ultimaSalida = await db.oneOrNone(`
      SELECT r.codigo as ruta_nombre, date(su.fecha_hora_salida) as fecha_salida
      FROM salida_unidad su
      JOIN unidad u ON su.unidad_id = u.id
      LEFT JOIN ruta r ON su.ruta_inicial_id = r.id
      WHERE su.tripulacion @> jsonb_build_array(jsonb_build_object('usuario_id', $1::int))
      ORDER BY su.fecha_hora_salida DESC
      LIMIT 1
    `, [usuarioId]);

    if (ultimaSalida) {
      ultimaRutaNombre = ultimaSalida.ruta_nombre;

      if (fechaAsignacion && ultimaSalida.fecha_salida) {
        // Calcular si "fecha_salida" es exactamente el día calendario anterior a "fechaAsignacion"
        const dAsignacion = new Date(fechaAsignacion);
        const dSalida = new Date(ultimaSalida.fecha_salida);
        
        // Normalizamos a medianoche UTC para comparar días sin ruidos horarios
        dAsignacion.setUTCHours(0, 0, 0, 0);
        dSalida.setUTCHours(0, 0, 0, 0);

        const diffTime = Math.abs(dAsignacion.getTime() - dSalida.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (diffDays === 1) {
          salioAyer = true;
        }
      }
    }

    return {
      alertaRuta: vecesEnRuta >= umbral,
      vecesEnRuta,
      ultimaRutaNombre,
      salioAyer
    };
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

  async getAsignacionById(asignacionId: number): Promise<{ id: number; unidad_id: number; ruta_id: number | null; turno_id: number } | null> {
    return db.oneOrNone(
      `SELECT au.id, au.unidad_id, au.ruta_id, au.turno_id
       FROM asignacion_unidad au
       JOIN turno t ON au.turno_id = t.id
       WHERE au.id = $1 AND t.publicado = true AND t.estado != 'CERRADO'`,
      [asignacionId],
    );
  },
};
