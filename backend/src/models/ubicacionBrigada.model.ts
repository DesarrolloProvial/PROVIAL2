import { db } from '../config/database';

// ========================================
// INTERFACES
// ========================================

export type EstadoUbicacionBrigada = 'CON_UNIDAD' | 'EN_PUNTO_FIJO' | 'PRESTADO';

export interface UbicacionBrigada {
  id: number;
  usuario_id: number;
  asignacion_origen_id: number;
  unidad_origen_id: number;
  unidad_actual_id: number | null;
  asignacion_actual_id: number | null;
  estado: EstadoUbicacionBrigada;
  punto_fijo_km: number | null;
  punto_fijo_sentido: string | null;
  punto_fijo_ruta_id: number | null;
  punto_fijo_latitud: number | null;
  punto_fijo_longitud: number | null;
  punto_fijo_descripcion: string | null;
  situacion_persistente_id: number | null;
  inicio_ubicacion: Date;
  fin_ubicacion: Date | null;
  creado_por: number | null;
  motivo: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UbicacionActualBrigada {
  usuario_id: number;
  nombre_completo: string;
  username: string;
  estado: EstadoUbicacionBrigada;
  unidad_actual_id: number | null;
  unidad_actual_codigo: string | null;
  unidad_origen_id: number;
  unidad_origen_codigo: string;
  punto_fijo_km: number | null;
  punto_fijo_sentido: string | null;
  punto_fijo_ruta_id: number | null;
  punto_fijo_ruta_codigo: string | null;
  punto_fijo_latitud: number | null;
  punto_fijo_longitud: number | null;
  punto_fijo_descripcion: string | null;
  situacion_persistente_id: number | null;
  situacion_persistente_titulo: string | null;
  situacion_persistente_tipo: string | null;
  inicio_ubicacion: Date;
  motivo: string | null;
}

// ========================================
// MODEL
// ========================================

export const UbicacionBrigadaModel = {
  /**
   * Obtener ubicación actual de un usuario
   */
  async getUbicacionActual(usuario_id: number): Promise<UbicacionActualBrigada | null> {
    const query = `
      SELECT * FROM v_ubicacion_actual_brigada
      WHERE usuario_id = $1
    `;
    return db.oneOrNone(query, [usuario_id]);
  },

  /**
   * Obtener todas las ubicaciones activas
   */
  async getAllUbicacionesActivas(): Promise<UbicacionActualBrigada[]> {
    return db.manyOrNone('SELECT * FROM v_ubicacion_actual_brigada ORDER BY nombre_completo');
  },

  /**
   * Obtener ubicaciones activas de una unidad
   */
  async getUbicacionesByUnidad(unidad_id: number): Promise<UbicacionActualBrigada[]> {
    const query = `
      SELECT * FROM v_ubicacion_actual_brigada
      WHERE unidad_actual_id = $1
      ORDER BY nombre_completo
    `;
    return db.manyOrNone(query, [unidad_id]);
  },

  /**
   * Inicializar ubicación de brigada al iniciar turno
   */
  async inicializarUbicacion(data: {
    usuario_id: number;
    asignacion_origen_id: number;
    unidad_origen_id: number;
    creado_por?: number;
  }): Promise<UbicacionBrigada> {
    // Primero cerrar cualquier ubicación activa anterior
    await db.none(`
      UPDATE ubicacion_brigada
      SET fin_ubicacion = NOW(), updated_at = NOW()
      WHERE usuario_id = $1 AND fin_ubicacion IS NULL
    `, [data.usuario_id]);

    // Crear nueva ubicación
    const query = `
      INSERT INTO ubicacion_brigada (
        usuario_id, asignacion_origen_id, unidad_origen_id,
        unidad_actual_id, asignacion_actual_id, estado, creado_por
      ) VALUES ($1, $2, $3, $3, $2, 'CON_UNIDAD', $4)
      RETURNING *
    `;

    return db.one(query, [
      data.usuario_id,
      data.asignacion_origen_id,
      data.unidad_origen_id,
      data.creado_por || data.usuario_id
    ]);
  },

  /**
   * Registrar préstamo de brigada a otra unidad
   */
  async registrarPrestamo(data: {
    usuario_id: number;
    unidad_destino_id: number;
    asignacion_destino_id: number;
    motivo: string;
    km: number;
    ruta_id: number;
    latitud?: number;
    longitud?: number;
    ejecutado_por: number;
  }): Promise<UbicacionBrigada> {
    // Cerrar ubicación actual
    const ubicacionAnterior = await db.oneOrNone(`
      UPDATE ubicacion_brigada
      SET fin_ubicacion = NOW(), updated_at = NOW()
      WHERE usuario_id = $1 AND fin_ubicacion IS NULL
      RETURNING *
    `, [data.usuario_id]);

    if (!ubicacionAnterior) {
      throw new Error('El brigada no tiene ubicación activa');
    }

    // Crear registro de movimiento
    await db.none(`
      INSERT INTO movimiento_brigada (
        usuario_id, origen_unidad_id, origen_asignacion_id,
        destino_unidad_id, destino_asignacion_id,
        tipo_movimiento, ruta_id, km, latitud, longitud, motivo, creado_por
      ) VALUES ($1, $2, $3, $4, $5, 'PRESTAMO', $6, $7, $8, $9, $10, $11)
    `, [
      data.usuario_id,
      ubicacionAnterior.unidad_origen_id,
      ubicacionAnterior.asignacion_origen_id,
      data.unidad_destino_id,
      data.asignacion_destino_id,
      data.ruta_id,
      data.km,
      data.latitud || null,
      data.longitud || null,
      data.motivo,
      data.ejecutado_por
    ]);

    // Crear nueva ubicación como PRESTADO
    const query = `
      INSERT INTO ubicacion_brigada (
        usuario_id, asignacion_origen_id, unidad_origen_id,
        unidad_actual_id, asignacion_actual_id, estado,
        creado_por, motivo
      ) VALUES ($1, $2, $3, $4, $5, 'PRESTADO', $6, $7)
      RETURNING *
    `;

    return db.one(query, [
      data.usuario_id,
      ubicacionAnterior.asignacion_origen_id,
      ubicacionAnterior.unidad_origen_id,
      data.unidad_destino_id,
      data.asignacion_destino_id,
      data.ejecutado_por,
      data.motivo
    ]);
  },

  /**
   * Retornar brigada de préstamo a unidad original
   */
  async retornarDePrestamo(data: {
    usuario_id: number;
    motivo?: string;
    km: number;
    ruta_id: number;
    latitud?: number;
    longitud?: number;
    ejecutado_por: number;
  }): Promise<UbicacionBrigada> {
    // Obtener ubicación actual
    const ubicacionActual = await db.oneOrNone(`
      SELECT * FROM ubicacion_brigada
      WHERE usuario_id = $1 AND fin_ubicacion IS NULL
    `, [data.usuario_id]);

    if (!ubicacionActual) {
      throw new Error('El brigada no tiene ubicación activa');
    }

    if (ubicacionActual.estado !== 'PRESTADO') {
      throw new Error('El brigada no está en estado PRESTADO');
    }

    // Cerrar ubicación actual
    await db.none(`
      UPDATE ubicacion_brigada
      SET fin_ubicacion = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [ubicacionActual.id]);

    // Registrar movimiento de retorno
    await db.none(`
      INSERT INTO movimiento_brigada (
        usuario_id, origen_unidad_id, origen_asignacion_id,
        destino_unidad_id, destino_asignacion_id,
        tipo_movimiento, ruta_id, km, latitud, longitud, motivo, creado_por
      ) VALUES ($1, $2, $3, $4, $5, 'RELEVO', $6, $7, $8, $9, $10, $11)
    `, [
      data.usuario_id,
      ubicacionActual.unidad_actual_id,
      ubicacionActual.asignacion_actual_id,
      ubicacionActual.unidad_origen_id,
      ubicacionActual.asignacion_origen_id,
      data.ruta_id,
      data.km,
      data.latitud || null,
      data.longitud || null,
      data.motivo || 'Retorno de préstamo',
      data.ejecutado_por
    ]);

    // Crear nueva ubicación de vuelta con unidad original
    const query = `
      INSERT INTO ubicacion_brigada (
        usuario_id, asignacion_origen_id, unidad_origen_id,
        unidad_actual_id, asignacion_actual_id, estado,
        creado_por, motivo
      ) VALUES ($1, $2, $3, $3, $2, 'CON_UNIDAD', $4, $5)
      RETURNING *
    `;

    return db.one(query, [
      data.usuario_id,
      ubicacionActual.asignacion_origen_id,
      ubicacionActual.unidad_origen_id,
      data.ejecutado_por,
      data.motivo || 'Retorno de préstamo'
    ]);
  },

  /**
   * Registrar división de fuerza (brigada se queda en punto fijo)
   */
  async registrarDivision(data: {
    usuario_id: number;
    km: number;
    sentido: string;
    ruta_id: number;
    latitud?: number;
    longitud?: number;
    descripcion?: string;
    situacion_persistente_id?: number;
    motivo: string;
    ejecutado_por: number;
  }): Promise<UbicacionBrigada> {
    // Obtener ubicación actual
    const ubicacionActual = await db.oneOrNone(`
      SELECT * FROM ubicacion_brigada
      WHERE usuario_id = $1 AND fin_ubicacion IS NULL
    `, [data.usuario_id]);

    if (!ubicacionActual) {
      throw new Error('El brigada no tiene ubicación activa');
    }

    // Cerrar ubicación actual
    await db.none(`
      UPDATE ubicacion_brigada
      SET fin_ubicacion = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [ubicacionActual.id]);

    // Registrar movimiento de división
    await db.none(`
      INSERT INTO movimiento_brigada (
        usuario_id, origen_unidad_id, origen_asignacion_id,
        tipo_movimiento, ruta_id, km, latitud, longitud, motivo, creado_por
      ) VALUES ($1, $2, $3, 'DIVISION_FUERZA', $4, $5, $6, $7, $8, $9)
    `, [
      data.usuario_id,
      ubicacionActual.unidad_actual_id,
      ubicacionActual.asignacion_actual_id,
      data.ruta_id,
      data.km,
      data.latitud || null,
      data.longitud || null,
      data.motivo,
      data.ejecutado_por
    ]);

    // Crear nueva ubicación en punto fijo
    const query = `
      INSERT INTO ubicacion_brigada (
        usuario_id, asignacion_origen_id, unidad_origen_id,
        unidad_actual_id, asignacion_actual_id, estado,
        punto_fijo_km, punto_fijo_sentido, punto_fijo_ruta_id,
        punto_fijo_latitud, punto_fijo_longitud, punto_fijo_descripcion,
        situacion_persistente_id, creado_por, motivo
      ) VALUES ($1, $2, $3, NULL, NULL, 'EN_PUNTO_FIJO',
        $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    return db.one(query, [
      data.usuario_id,
      ubicacionActual.asignacion_origen_id,
      ubicacionActual.unidad_origen_id,
      data.km,
      data.sentido,
      data.ruta_id,
      data.latitud || null,
      data.longitud || null,
      data.descripcion || null,
      data.situacion_persistente_id || null,
      data.ejecutado_por,
      data.motivo
    ]);
  },

  /**
   * Reunir brigada con su unidad (después de división)
   */
  async reunirConUnidad(data: {
    usuario_id: number;
    unidad_id: number;
    asignacion_id: number;
    km: number;
    ruta_id: number;
    latitud?: number;
    longitud?: number;
    motivo?: string;
    ejecutado_por: number;
  }): Promise<UbicacionBrigada> {
    // Obtener ubicación actual
    const ubicacionActual = await db.oneOrNone(`
      SELECT * FROM ubicacion_brigada
      WHERE usuario_id = $1 AND fin_ubicacion IS NULL
    `, [data.usuario_id]);

    if (!ubicacionActual) {
      throw new Error('El brigada no tiene ubicación activa');
    }

    if (ubicacionActual.estado !== 'EN_PUNTO_FIJO') {
      throw new Error('El brigada no está en punto fijo');
    }

    // Cerrar ubicación actual
    await db.none(`
      UPDATE ubicacion_brigada
      SET fin_ubicacion = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [ubicacionActual.id]);

    // Registrar movimiento de reunión
    await db.none(`
      INSERT INTO movimiento_brigada (
        usuario_id, origen_unidad_id, destino_unidad_id, destino_asignacion_id,
        tipo_movimiento, ruta_id, km, latitud, longitud, motivo, creado_por
      ) VALUES ($1, $2, $3, $4, 'RELEVO', $5, $6, $7, $8, $9, $10)
    `, [
      data.usuario_id,
      ubicacionActual.unidad_origen_id,
      data.unidad_id,
      data.asignacion_id,
      data.ruta_id,
      data.km,
      data.latitud || null,
      data.longitud || null,
      data.motivo || 'Reunión con unidad',
      data.ejecutado_por
    ]);

    // Crear nueva ubicación con unidad
    const query = `
      INSERT INTO ubicacion_brigada (
        usuario_id, asignacion_origen_id, unidad_origen_id,
        unidad_actual_id, asignacion_actual_id, estado,
        creado_por, motivo
      ) VALUES ($1, $2, $3, $4, $5, 'CON_UNIDAD', $6, $7)
      RETURNING *
    `;

    return db.one(query, [
      data.usuario_id,
      ubicacionActual.asignacion_origen_id,
      ubicacionActual.unidad_origen_id,
      data.unidad_id,
      data.asignacion_id,
      data.ejecutado_por,
      data.motivo || 'Reunión con unidad'
    ]);
  },

  /**
   * Finalizar todas las ubicaciones al terminar jornada
   */
  async finalizarJornada(usuario_id: number): Promise<void> {
    await db.none(`
      UPDATE ubicacion_brigada
      SET fin_ubicacion = NOW(), updated_at = NOW()
      WHERE usuario_id = $1 AND fin_ubicacion IS NULL
    `, [usuario_id]);
  },

  /**
   * Obtener la unidad donde el brigada puede crear/ver situaciones
   * Esto determina los permisos de bitácora
   */
  async getUnidadPermisos(usuario_id: number): Promise<{ unidad_id: number | null; puede_crear: boolean }> {
    const ubicacion = await this.getUbicacionActual(usuario_id);

    if (!ubicacion) {
      return { unidad_id: null, puede_crear: false };
    }

    switch (ubicacion.estado) {
      case 'CON_UNIDAD':
      case 'PRESTADO':
        // Puede crear situaciones para la unidad actual
        return { unidad_id: ubicacion.unidad_actual_id, puede_crear: true };

      case 'EN_PUNTO_FIJO':
        // Solo puede ver, no crear nuevas situaciones regulares
        // (pero puede agregar a situaciones persistentes)
        return { unidad_id: null, puede_crear: false };

      default:
        return { unidad_id: null, puede_crear: false };
    }
  },
};
