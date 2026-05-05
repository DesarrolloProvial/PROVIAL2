import { db } from '../../config/database';

export interface Turno {
  id: number;
  fecha: string; // DATE
  estado: 'PLANIFICADO' | 'ACTIVO' | 'CERRADO';
  observaciones: string | null;
  creado_por: number;
  aprobado_por: number | null;
  fecha_aprobacion: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AsignacionUnidad {
  id: number;
  turno_id: number;
  unidad_id: number;
  ruta_id: number | null;
  km_inicio: number | null;
  km_final: number | null;
  sentido: string | null;
  acciones: string | null;
  combustible_inicial: number | null;
  combustible_asignado: number | null;
  hora_salida: string | null; // TIME
  hora_entrada_estimada: string | null; // TIME
  hora_salida_real: Date | null;
  hora_entrada_real: Date | null;
  combustible_final: number | null;
  km_recorridos: number | null;
  observaciones_finales: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TripulacionTurno {
  id: number;
  asignacion_id: number;
  usuario_id: number;
  rol_tripulacion: 'PILOTO' | 'COPILOTO' | 'ACOMPAÑANTE';
  presente: boolean;
  observaciones: string | null;
  created_at: Date;
}

export interface ReporteHorario {
  id: number;
  asignacion_id: number;
  km_actual: number;
  sentido_actual: string | null;
  latitud: number | null;
  longitud: number | null;
  novedad: string | null;
  reportado_por: number;
  created_at: Date;
}

export interface MiAsignacionHoy {
  usuario_id: number;
  nombre_completo: string;
  turno_id: number;
  fecha: string;
  fecha_fin: string | null;
  turno_estado: string;
  asignacion_id: number;
  unidad_id: number;
  unidad_codigo: string;
  tipo_unidad: string;
  mi_rol: string;
  ruta_id: number | null;
  ruta_codigo: string | null;
  ruta_nombre: string | null;
  km_inicio: number | null;
  km_final: number | null;
  sentido: string | null;
  acciones: string | null;
  hora_salida: string | null;
  hora_entrada_estimada: string | null;
  hora_salida_real: string | null;
  dias_para_salida: number;
  companeros: Array<{ usuario_id: number; nombre: string; chapa: string; rol: string; telefono: string | null }> | null;
}

export const TurnoModel = {
  // Obtener turno por fecha y sede (fuente de verdad para multi-sede)
  async findByFechaYSede(fecha: string, sedeId: number): Promise<Turno | null> {
    return db.oneOrNone(
      'SELECT * FROM turno WHERE fecha = $1 AND sede_id = $2',
      [fecha, sedeId]
    );
  },

  // Compatibilidad: busca por fecha restringido a una sede (evita ambigüedad multi-sede)
  async findByFecha(fecha: string, sedeId?: number): Promise<Turno | null> {
    if (sedeId) {
      return db.oneOrNone(
        'SELECT * FROM turno WHERE fecha = $1 AND sede_id = $2',
        [fecha, sedeId]
      );
    }
    return db.oneOrNone(
      'SELECT * FROM turno WHERE fecha = $1 ORDER BY id LIMIT 1',
      [fecha]
    );
  },

  // Obtener turno de hoy (filtrado por sede si se proporciona)
  async findHoy(sedeId?: number): Promise<Turno | null> {
    if (sedeId) {
      return db.oneOrNone(
        "SELECT * FROM turno WHERE fecha = CURRENT_DATE AND sede_id = $1",
        [sedeId]
      );
    }
    // Si no hay sede, devolver el primer turno activo de hoy
    return db.oneOrNone(
      "SELECT * FROM turno WHERE fecha = CURRENT_DATE ORDER BY estado = 'ACTIVO' DESC, id LIMIT 1"
    );
  },

  // Obtener todos los turnos de hoy
  async findAllHoy(): Promise<Turno[]> {
    return db.any(
      "SELECT * FROM turno WHERE fecha = CURRENT_DATE ORDER BY sede_id"
    );
  },

  // Crear turno
  async create(data: { fecha: string; fecha_fin?: string | null; observaciones?: string; creado_por: number; sede_id?: number }): Promise<Turno> {
    return db.one(
      `INSERT INTO turno (fecha, fecha_fin, estado, observaciones, creado_por, sede_id)
       VALUES ($1, $2, 'PLANIFICADO', $3, $4, $5)
       RETURNING *`,
      [data.fecha, data.fecha_fin || null, data.observaciones, data.creado_por, data.sede_id || null]
    );
  },

  // Actualizar estado del turno
  async updateEstado(id: number, estado: Turno['estado']): Promise<Turno> {
    return db.one(
      'UPDATE turno SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [estado, id]
    );
  },

  // Obtener asignaciones de un turno
  async getAsignaciones(turnoId: number): Promise<any[]> {
    return db.any(
      `SELECT * FROM v_turnos_completos WHERE turno_id = $1 ORDER BY unidad_codigo`,
      [turnoId]
    );
  },

  // Obtener mi asignación de hoy (para app móvil)
  async getMiAsignacionHoy(usuarioId: number): Promise<MiAsignacionHoy | null> {
    return db.oneOrNone(
      `SELECT * FROM v_mi_asignacion_hoy
       WHERE usuario_id = $1`,
      [usuarioId]
    );
  },

  // Obtener última asignación de una unidad
  async getLastAsignacionByUnidad(unidadId: number): Promise<AsignacionUnidad | null> {
    return db.oneOrNone(
      `SELECT * FROM asignacion_unidad
       WHERE unidad_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [unidadId]
    );
  },

  // Crear asignación de unidad
  async createAsignacion(data: {
    turno_id: number;
    tipo_asignacion?: string;
    unidad_id?: number | null;
    ruta_id?: number | null;
    km_inicio?: number;
    km_final?: number;
    sentido?: string;
    acciones?: string;
    combustible_inicial?: number;
    combustible_asignado?: number;
    hora_salida?: string;
    hora_entrada_estimada?: string;
    estado_nomina?: 'BORRADOR' | 'LIBERADA';
  }): Promise<AsignacionUnidad> {
    return db.one(
      `INSERT INTO asignacion_unidad
       (turno_id, tipo_asignacion, unidad_id, ruta_id, km_inicio, km_final, sentido, acciones,
        combustible_inicial, combustible_asignado, hora_salida, hora_entrada_estimada, estado_nomina)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        data.turno_id, data.tipo_asignacion || 'PATRULLA', data.unidad_id, data.ruta_id, data.km_inicio, data.km_final,
        data.sentido, data.acciones, data.combustible_inicial, data.combustible_asignado,
        data.hora_salida, data.hora_entrada_estimada, data.estado_nomina || 'BORRADOR'
      ]
    );
  },

  // Agregar tripulación a asignación
  async addTripulacion(data: {
    asignacion_id: number;
    usuario_id: number;
    rol_tripulacion: TripulacionTurno['rol_tripulacion'];
    es_comandante?: boolean;
  }): Promise<TripulacionTurno> {
    return db.one(
      `INSERT INTO tripulacion_turno (asignacion_id, usuario_id, rol_tripulacion, es_comandante)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.asignacion_id, data.usuario_id, data.rol_tripulacion, data.es_comandante || false]
    );
  },

  // Marcar salida
  async marcarSalida(asignacionId: number): Promise<AsignacionUnidad> {
    return db.one(
      `UPDATE asignacion_unidad
       SET hora_salida_real = NOW()
       WHERE id = $1
       RETURNING *`,
      [asignacionId]
    );
  },

  // Marcar entrada
  async marcarEntrada(asignacionId: number, data: {
    combustible_final?: number;
    observaciones_finales?: string;
  }): Promise<AsignacionUnidad> {
    return db.tx(async (t) => {
      const result = await t.one(
        `UPDATE asignacion_unidad
        SET hora_entrada_real = NOW(),
            combustible_final = $2,
            observaciones_finales = $3
        WHERE id = $1
        RETURNING *`,
        [asignacionId, data.combustible_final, data.observaciones_finales]
      );

      if (data.combustible_final !== undefined && data.combustible_final !== null) {
        const asignacion = await t.one('SELECT unidad_id FROM asignacion_unidad WHERE id = $1', [asignacionId]);
        await t.none('UPDATE unidad SET combustible_actual = $1 WHERE id = $2', [data.combustible_final, asignacion.unidad_id]);
      }
      return result;
    });
  },

  // Crear reporte horario
  async createReporteHorario(data: {
    asignacion_id: number;
    km_actual: number;
    sentido_actual?: string;
    latitud?: number;
    longitud?: number;
    novedad?: string;
    reportado_por: number;
  }): Promise<ReporteHorario> {
    return db.tx(async (t) => {
      const reporte = await t.one(
        `INSERT INTO reporte_horario
        (asignacion_id, km_actual, sentido_actual, latitud, longitud, novedad, reportado_por)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          data.asignacion_id, data.km_actual, data.sentido_actual,
          data.latitud, data.longitud, data.novedad, data.reportado_por
        ]
      );

      // Actualizar odómetro de la unidad
      const asignacion = await t.one('SELECT unidad_id FROM asignacion_unidad WHERE id = $1', [data.asignacion_id]);
      await t.none('UPDATE unidad SET odometro_actual = $1, updated_at = NOW() WHERE id = $2', [data.km_actual, asignacion.unidad_id]);

      return reporte;
    });
  },

  // Obtener reportes horarios de una asignación
  async getReportesHorarios(asignacionId: number): Promise<ReporteHorario[]> {
    return db.any(
      `SELECT rh.*, u.nombre_completo as reportado_por_nombre
       FROM reporte_horario rh
       JOIN usuario u ON rh.reportado_por = u.id
       WHERE rh.asignacion_id = $1
       ORDER BY rh.created_at DESC`,
      [asignacionId]
    );
  },

  // Cambiar ruta activa de una asignación
  async cambiarRutaActiva(asignacionId: number, nuevaRutaId: number): Promise<AsignacionUnidad> {
    return db.one(
      `UPDATE asignacion_unidad
       SET ruta_activa_id = $1,
           hora_ultima_actualizacion_ruta = NOW()
       WHERE id = $2
       RETURNING *`,
      [nuevaRutaId, asignacionId]
    );
  },

  // Verificar si un usuario pertenece a la tripulación de una unidad hoy
  // FIX: Se elimina restricción de fecha estricta, ahora se valida que el turno esté ACTIVO
  async esMiembroTripulacion(usuarioId: number, unidadId: number): Promise<boolean> {
    const result = await db.oneOrNone(
      `SELECT 1
       FROM tripulacion_turno tt
       JOIN asignacion_unidad au ON tt.asignacion_id = au.id
       JOIN turno t ON au.turno_id = t.id
       WHERE tt.usuario_id = $1
         AND au.unidad_id = $2
         AND t.estado = 'ACTIVO'`, // Se reemplaza t.fecha = CURRENT_DATE por estado ACTIVO
      [usuarioId, unidadId]
    );
    return !!result;
  },

  // Obtener la tripulación de una asignación
  async getTripulacion(asignacionId: number): Promise<any[]> {
    return db.manyOrNone(
      `SELECT tt.*, u.nombre_completo, u.rol_id
       FROM tripulacion_turno tt
       JOIN usuario u ON tt.usuario_id = u.id
       WHERE tt.asignacion_id = $1`,
      [asignacionId]
    );
  },

  // Registrar combustible
  async registrarCombustible(data: {
    asignacion_id: number;
    nivel_fraccion: string;
    nivel_decimal: number;
    tipo: 'INICIAL' | 'ACTUAL' | 'FINAL';
    observaciones?: string;
    registrado_por: number;
  }): Promise<any> {
    return db.tx(async (t) => {
      const registro = await t.one(
        `INSERT INTO registro_combustible
        (asignacion_id, nivel_fraccion, tipo, observaciones, registrado_por)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [data.asignacion_id, data.nivel_fraccion, data.tipo, data.observaciones, data.registrado_por]
      );

      // Actualizar nivel de combustible de la unidad
      const asignacion = await t.one('SELECT unidad_id FROM asignacion_unidad WHERE id = $1', [data.asignacion_id]);
      await t.none(
        'UPDATE unidad SET combustible_actual = $1, nivel_combustible = $2, updated_at = NOW() WHERE id = $3',
        [data.nivel_decimal, data.nivel_fraccion, asignacion.unidad_id]
      );

      return registro;
    });
  },

  // Obtener asignación por ID
  async getAsignacionById(id: number): Promise<AsignacionUnidad | null> {
    return db.oneOrNone(
      'SELECT * FROM asignacion_unidad WHERE id = $1',
      [id]
    );
  },

  // Obtener asignación activa de una unidad específica
  async getAsignacionActivaUnidad(unidadId: number): Promise<any | null> {
    return db.oneOrNone(`
      SELECT au.*, t.fecha as turno_fecha, r.codigo as ruta_codigo
      FROM asignacion_unidad au
      JOIN turno t ON au.turno_id = t.id
      LEFT JOIN ruta r ON au.ruta_id = r.id
      WHERE au.unidad_id = $1
        AND t.fecha = CURRENT_DATE
        AND t.estado IN ('PLANIFICADO', 'ACTIVO')
      ORDER BY au.id DESC
      LIMIT 1
    `, [unidadId]);
  },

  // Actualizar asignación
  async updateAsignacion(id: number, data: {
    ruta_id?: number;
    km_inicio?: number;
    km_final?: number;
    sentido?: string;
    acciones?: string;
    hora_salida?: string;
    hora_entrada_estimada?: string;
  }): Promise<AsignacionUnidad> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (data.ruta_id !== undefined) {
      updates.push(`ruta_id = $${++paramCount}`);
      values.push(data.ruta_id);
    }
    if (data.km_inicio !== undefined) {
      updates.push(`km_inicio = $${++paramCount}`);
      values.push(data.km_inicio);
    }
    if (data.km_final !== undefined) {
      updates.push(`km_final = $${++paramCount}`);
      values.push(data.km_final);
    }
    if (data.sentido !== undefined) {
      updates.push(`sentido = $${++paramCount}`);
      values.push(data.sentido);
    }
    if (data.acciones !== undefined) {
      updates.push(`acciones = $${++paramCount}`);
      values.push(data.acciones);
    }
    if (data.hora_salida !== undefined) {
      updates.push(`hora_salida = $${++paramCount}`);
      values.push(data.hora_salida);
    }
    if (data.hora_entrada_estimada !== undefined) {
      updates.push(`hora_entrada_estimada = $${++paramCount}`);
      values.push(data.hora_entrada_estimada);
    }

    if (updates.length === 0) {
      // Si no hay nada que actualizar, devolver la asignación actual
      return this.getAsignacionById(id) as Promise<AsignacionUnidad>;
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    return db.one(
      `UPDATE asignacion_unidad
       SET ${updates.join(', ')}
       WHERE id = $${paramCount + 1}
       RETURNING *`,
      values
    );
  },

  // Eliminar asignación
  async deleteAsignacion(id: number): Promise<void> {
    await db.none('DELETE FROM asignacion_unidad WHERE id = $1', [id]);
  },

  // Eliminar tripulación de una asignación
  async deleteTripulacion(asignacionId: number): Promise<void> {
    await db.none('DELETE FROM tripulacion_turno WHERE asignacion_id = $1', [asignacionId]);
  },

  // Liberar nómina (cambiar asignaciones de BORRADOR a LIBERADA)
  // asignacionIds: si se provee, solo libera esas asignaciones; sino libera todas las BORRADOR de la sede
  async liberarNomina(turnoId: number, sedeId?: number, asignacionIds?: number[]): Promise<{ count: number; codigos: string[] }> {
    let query = `
      UPDATE asignacion_unidad au
      SET estado_nomina = 'LIBERADA'
      FROM unidad u
      WHERE au.unidad_id = u.id
        AND au.turno_id = $1
        AND au.estado_nomina = 'BORRADOR'
    `;
    const params: any[] = [turnoId];
    let paramCount = 1;

    if (sedeId) {
      params.push(sedeId);
      query += ` AND u.sede_id = $${++paramCount}`;
    }

    if (asignacionIds && asignacionIds.length > 0) {
      params.push(asignacionIds);
      query += ` AND au.id = ANY($${++paramCount}::int[])`;
    }

    query += ` RETURNING u.codigo`;

    const result = await db.result(query, params);
    const codigos = (result.rows as { codigo: string }[]).map(r => r.codigo);
    return { count: result.rowCount, codigos };
  },

  async getAsignacionesPendientes(sedeId: number): Promise<any[]> {
    return db.any(
      `SELECT * FROM v_asignaciones_pendientes
       WHERE sede_id = $1
         AND (salida_estado IS NULL OR salida_estado != 'FINALIZADA')
       ORDER BY fecha, hora_salida`,
      [sedeId]
    );
  },

  async findTurnoExistente(fecha: string, sedeId: number | null): Promise<any | null> {
    return db.oneOrNone(
      `SELECT * FROM turno
       WHERE fecha = $1 AND (sede_id = $2 OR ($2 IS NULL AND sede_id IS NULL))`,
      [fecha, sedeId]
    );
  },

  async crearAsignacionConTripulacion(
    turnoId: number,
    tipo: string,
    data: Record<string, any>,
    tripulacion: Array<{ usuario_id: number; rol_tripulacion: string; es_comandante?: boolean; telefono_contacto?: string }>
  ): Promise<{ asignacion: any; tripulacionCreada: any[] }> {
    // Validación de sede antes de abrir transacción
    if (data.unidad_id) {
      const [turno, unidad] = await Promise.all([
        db.oneOrNone<{ sede_id: number }>('SELECT sede_id FROM turno WHERE id = $1', [turnoId]),
        db.oneOrNone<{ sede_id: number }>('SELECT sede_id FROM unidad WHERE id = $1', [data.unidad_id]),
      ]);
      if (turno && unidad && turno.sede_id !== unidad.sede_id) {
        throw Object.assign(new Error('SEDE_MISMATCH: La unidad no pertenece a la sede de este turno'), { code: 'P0001' });
      }
    }

    return db.tx(async (t) => {
      const asignacion = await t.one(
        `INSERT INTO asignacion_unidad
         (turno_id, tipo_asignacion, unidad_id, ruta_id, km_inicio, km_final, sentido, acciones,
          combustible_inicial, combustible_asignado, hora_salida, hora_entrada_estimada)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [turnoId, tipo, data.unidad_id, data.ruta_id, data.km_inicio, data.km_final,
          data.sentido, data.acciones, data.combustible_inicial, data.combustible_asignado,
          data.hora_salida, data.hora_entrada_estimada]
      );

      const tripulacionCreada: any[] = [];
      if (tripulacion.length > 0) {
        const ordenada = [...tripulacion].sort((a: any, b: any) => {
          const orden: Record<string, number> = { PILOTO: 1, COPILOTO: 2, ACOMPANANTE: 3 };
          return (orden[a.rol_tripulacion] || 4) - (orden[b.rol_tripulacion] || 4);
        });

        let comandanteAsignado = ordenada.some((m) => m.es_comandante);

        for (let i = 0; i < ordenada.length; i++) {
          const miembro = ordenada[i];

          const inactividad = await t.oneOrNone(
            `SELECT * FROM get_motivo_inactividad_actual($1)`,
            [miembro.usuario_id]
          );
          if (inactividad?.codigo) {
            throw new Error(`INACTIVO:${miembro.usuario_id}:${inactividad.nombre}`);
          }

          let esComandante = miembro.es_comandante || false;
          if (!comandanteAsignado && i === 0) {
            esComandante = true;
            comandanteAsignado = true;
          }

          const tripulante = await t.one(
            `INSERT INTO tripulacion_turno (asignacion_id, usuario_id, rol_tripulacion, es_comandante, telefono_contacto)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [asignacion.id, miembro.usuario_id, miembro.rol_tripulacion, esComandante, miembro.telefono_contacto || null]
          );
          tripulacionCreada.push(tripulante);
        }
      }

      return { asignacion, tripulacionCreada };
    });
  },

  async getAsignacionConSede(id: number): Promise<any | null> {
    return db.oneOrNone(
      `SELECT au.*, t.sede_id, u.codigo AS unidad_codigo
       FROM asignacion_unidad au
       JOIN turno t  ON au.turno_id  = t.id
       JOIN unidad u ON au.unidad_id = u.id
       WHERE au.id = $1`,
      [id]
    );
  },

  async getSalidaActivaPorUnidad(unidadId: number): Promise<any | null> {
    return db.oneOrNone(
      `SELECT id, fecha_hora_salida FROM salida_unidad WHERE unidad_id = $1 AND estado = 'EN_SALIDA'`,
      [unidadId]
    );
  },

  async cerrarSalidaForzada(salidaId: number): Promise<void> {
    await db.none(
      `UPDATE salida_unidad
       SET estado = 'CANCELADA',
           fecha_hora_regreso = NOW(),
           observaciones_regreso = 'Cerrada forzosamente al eliminar asignación'
       WHERE id = $1`,
      [salidaId]
    );
  },

  async limpiarTurnoVacio(turnoId: number): Promise<void> {
    await db.none(
      `DELETE FROM turno t
       WHERE NOT EXISTS (SELECT 1 FROM asignacion_unidad au WHERE au.turno_id = t.id)
         AND t.id = $1`,
      [turnoId]
    );
  },

  // Contar asignaciones en borrador
  async countBorradores(turnoId: number, sedeId?: number): Promise<number> {
    let query = `
      SELECT COUNT(*) as count
      FROM asignacion_unidad au
      JOIN unidad u ON au.unidad_id = u.id
      WHERE au.turno_id = $1 AND au.estado_nomina = 'BORRADOR'
    `;
    const params: any[] = [turnoId];

    if (sedeId) {
      query += ` AND u.sede_id = $2`;
      params.push(sedeId);
    }

    const result = await db.one<{ count: string }>(query, params);
    return parseInt(result.count);
  },
};

