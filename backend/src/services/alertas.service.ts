import { db } from '../config/database';
import { PushNotificationService } from './firebase.service';

// ============================================
// INTERFACES
// ============================================

export interface Alerta {
  id: number;
  tipo: string;
  severidad: string;
  estado: string;
  titulo: string;
  mensaje: string;
  datos: any;
  sede_id: number | null;
  unidad_id: number | null;
  brigada_id: number | null;
  situacion_id: number | null;
  atendida_por: number | null;
  fecha_atencion: Date | null;
  nota_resolucion: string | null;
  fecha_expiracion: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AlertaConDetalles extends Alerta {
  sede_nombre: string | null;
  unidad_codigo: string | null;
  tipo_unidad: string | null;
  brigada_nombre: string | null;
  brigada_chapa: string | null;
  atendida_por_nombre: string | null;
  minutos_activa: number;
}

export interface ConfiguracionAlerta {
  id: number;
  tipo: string;
  nombre: string;
  descripcion: string | null;
  severidad_default: string;
  activa: boolean;
  tiempo_inactividad_minutos: number;
  umbral_combustible: number;
  umbral_km: number;
  notificar_push: boolean;
  notificar_email: boolean;
  notificar_sms: boolean;
  roles_destino: string[];
}

// ============================================
// SERVICIO DE ALERTAS
// ============================================

export const AlertasService = {
  /**
   * Crear una alerta
   */
  async crearAlerta(data: {
    tipo: string;
    titulo: string;
    mensaje: string;
    severidad?: string;
    datos?: any;
    sede_id?: number;
    unidad_id?: number;
    brigada_id?: number;
    situacion_id?: number;
    expira_en_minutos?: number;
  }): Promise<Alerta | null> {
    const alerta = await db.oneOrNone<Alerta>(
      `SELECT * FROM crear_alerta($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        data.tipo,
        data.titulo,
        data.mensaje,
        data.severidad || null,
        data.datos ? JSON.stringify(data.datos) : null,
        data.sede_id || null,
        data.unidad_id || null,
        data.brigada_id || null,
        data.situacion_id || null,
        data.expira_en_minutos || null,
      ]
    );

    // Enviar notificación push si la alerta se creó
    if (alerta) {
      await this.enviarNotificacionPush(alerta);
    }

    return alerta;
  },

  /**
   * Enviar notificación push de alerta
   */
  async enviarNotificacionPush(alerta: Alerta): Promise<void> {
    try {
      // Obtener configuración
      const config = await db.oneOrNone<ConfiguracionAlerta>(
        `SELECT * FROM configuracion_alerta WHERE tipo = $1`,
        [alerta.tipo]
      );

      if (!config || !config.notificar_push) return;

      // Obtener usuarios que deben recibir la alerta
      const usuarios = await db.any(
        `SELECT u.id, d.push_token
         FROM usuario u
         JOIN dispositivo_push d ON u.id = d.usuario_id
         WHERE u.rol = ANY($1)
           AND u.activo = TRUE
           AND d.activo = TRUE
           AND ($2::INTEGER IS NULL OR u.sede_id = $2 OR u.puede_ver_todas_sedes = TRUE)`,
        [config.roles_destino, alerta.sede_id]
      );

      // Enviar push a cada usuario
      for (const usuario of usuarios) {
        await PushNotificationService.enviarAUsuario({
          usuarioId: usuario.id,
          tipo: 'ALERTA',
          titulo: alerta.titulo,
          mensaje: alerta.mensaje,
          datos: {
            alerta_id: alerta.id,
            tipo_alerta: alerta.tipo,
            severidad: alerta.severidad,
          },
        });
      }
    } catch (error) {
      console.error('Error enviando notificación push de alerta:', error);
    }
  },

  /**
   * Obtener alertas activas
   */
  async obtenerAlertasActivas(filtros?: {
    sede_id?: number;
    tipo?: string;
    severidad?: string;
    limit?: number;
  }): Promise<AlertaConDetalles[]> {
    let query = `SELECT * FROM v_alertas_activas WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (filtros?.sede_id) {
      query += ` AND (sede_id = $${paramIndex++} OR sede_id IS NULL)`;
      params.push(filtros.sede_id);
    }

    if (filtros?.tipo) {
      query += ` AND tipo = $${paramIndex++}`;
      params.push(filtros.tipo);
    }

    if (filtros?.severidad) {
      query += ` AND severidad = $${paramIndex++}`;
      params.push(filtros.severidad);
    }

    if (filtros?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filtros.limit);
    }

    return db.any<AlertaConDetalles>(query, params);
  },

  /**
   * Obtener alerta por ID
   */
  async obtenerAlertaPorId(id: number): Promise<AlertaConDetalles | null> {
    return db.oneOrNone<AlertaConDetalles>(
      `SELECT
         a.*,
         s.nombre AS sede_nombre,
         u.codigo AS unidad_codigo,
         u.tipo_unidad,
         b.nombre AS brigada_nombre,
         b.codigo AS brigada_chapa,
         aten.nombre_completo AS atendida_por_nombre,
         EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.created_at)) / 60 AS minutos_activa
       FROM alerta a
       LEFT JOIN sede s ON a.sede_id = s.id
       LEFT JOIN unidad u ON a.unidad_id = u.id
       LEFT JOIN brigada b ON a.brigada_id = b.id
       LEFT JOIN usuario aten ON a.atendida_por = aten.id
       WHERE a.id = $1`,
      [id]
    );
  },

  /**
   * Atender alerta
   */
  async atenderAlerta(
    alertaId: number,
    usuarioId: number,
    nota?: string
  ): Promise<{ success: boolean; mensaje: string }> {
    return db.one<{ success: boolean; mensaje: string }>(
      `SELECT * FROM atender_alerta($1, $2, $3)`,
      [alertaId, usuarioId, nota || null]
    );
  },

  /**
   * Resolver alerta
   */
  async resolverAlerta(
    alertaId: number,
    usuarioId: number,
    nota?: string
  ): Promise<{ success: boolean; mensaje: string }> {
    return db.one<{ success: boolean; mensaje: string }>(
      `SELECT * FROM resolver_alerta($1, $2, $3)`,
      [alertaId, usuarioId, nota || null]
    );
  },

  /**
   * Ignorar alerta
   */
  async ignorarAlerta(
    alertaId: number,
    usuarioId: number
  ): Promise<boolean> {
    const result = await db.result(
      `UPDATE alerta
       SET estado = 'IGNORADA',
           atendida_por = $2,
           fecha_atencion = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND estado = 'ACTIVA'`,
      [alertaId, usuarioId]
    );
    return result.rowCount > 0;
  },

  /**
   * Marcar alerta como leída
   */
  async marcarComoLeida(alertaId: number, usuarioId: number): Promise<void> {
    await db.none(
      `INSERT INTO alerta_leida (alerta_id, usuario_id)
       VALUES ($1, $2)
       ON CONFLICT (alerta_id, usuario_id) DO NOTHING`,
      [alertaId, usuarioId]
    );
  },

  /**
   * Obtener alertas no leídas por usuario
   */
  async obtenerAlertasNoLeidas(
    usuarioId: number,
    sedeId?: number
  ): Promise<AlertaConDetalles[]> {
    return db.any<AlertaConDetalles>(
      `SELECT
         a.*,
         s.nombre AS sede_nombre,
         u.codigo AS unidad_codigo,
         b.nombre AS brigada_nombre,
         EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.created_at)) / 60 AS minutos_activa
       FROM v_mis_alertas_no_leidas a
       LEFT JOIN sede s ON a.sede_id = s.id
       LEFT JOIN unidad u ON a.unidad_id = u.id
       LEFT JOIN brigada b ON a.brigada_id = b.id
       WHERE NOT EXISTS (
         SELECT 1 FROM alerta_leida al
         WHERE al.alerta_id = a.id AND al.usuario_id = $1
       )
       AND ($2::INTEGER IS NULL OR a.sede_id = $2 OR a.sede_id IS NULL)
       ORDER BY
         CASE a.severidad
           WHEN 'CRITICA' THEN 1
           WHEN 'ALTA' THEN 2
           WHEN 'MEDIA' THEN 3
           ELSE 4
         END,
         a.created_at DESC
       LIMIT 50`,
      [usuarioId, sedeId || null]
    );
  },

  /**
   * Contar alertas no leídas
   */
  async contarAlertasNoLeidas(usuarioId: number, sedeId?: number): Promise<{
    total: number;
    criticas: number;
    altas: number;
  }> {
    const result = await db.one(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE severidad = 'CRITICA') AS criticas,
         COUNT(*) FILTER (WHERE severidad = 'ALTA') AS altas
       FROM v_mis_alertas_no_leidas a
       WHERE NOT EXISTS (
         SELECT 1 FROM alerta_leida al
         WHERE al.alerta_id = a.id AND al.usuario_id = $1
       )
       AND ($2::INTEGER IS NULL OR a.sede_id = $2 OR a.sede_id IS NULL)`,
      [usuarioId, sedeId || null]
    );

    return {
      total: parseInt(result.total) || 0,
      criticas: parseInt(result.criticas) || 0,
      altas: parseInt(result.altas) || 0,
    };
  },

  /**
   * Obtener historial de alertas
   */
  async obtenerHistorial(filtros: {
    sede_id?: number;
    tipo?: string;
    estado?: string;
    fecha_inicio?: Date;
    fecha_fin?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ alertas: AlertaConDetalles[]; total: number }> {
    let whereClause = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filtros.sede_id) {
      whereClause += ` AND a.sede_id = $${paramIndex++}`;
      params.push(filtros.sede_id);
    }

    if (filtros.tipo) {
      whereClause += ` AND a.tipo = $${paramIndex++}`;
      params.push(filtros.tipo);
    }

    if (filtros.estado) {
      whereClause += ` AND a.estado = $${paramIndex++}`;
      params.push(filtros.estado);
    }

    if (filtros.fecha_inicio) {
      whereClause += ` AND a.created_at >= $${paramIndex++}`;
      params.push(filtros.fecha_inicio);
    }

    if (filtros.fecha_fin) {
      whereClause += ` AND a.created_at <= $${paramIndex++}`;
      params.push(filtros.fecha_fin);
    }

    // Contar total
    const countResult = await db.one(
      `SELECT COUNT(*) FROM alerta a WHERE ${whereClause}`,
      params
    );

    // Obtener alertas
    const limit = filtros.limit || 50;
    const offset = filtros.offset || 0;
    params.push(limit, offset);

    const alertas = await db.any<AlertaConDetalles>(
      `SELECT
         a.*,
         s.nombre AS sede_nombre,
         u.codigo AS unidad_codigo,
         u.tipo_unidad,
         b.nombre AS brigada_nombre,
         b.codigo AS brigada_chapa,
         aten.nombre_completo AS atendida_por_nombre,
         EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.created_at)) / 60 AS minutos_activa
       FROM alerta a
       LEFT JOIN sede s ON a.sede_id = s.id
       LEFT JOIN unidad u ON a.unidad_id = u.id
       LEFT JOIN brigada b ON a.brigada_id = b.id
       LEFT JOIN usuario aten ON a.atendida_por = aten.id
       WHERE ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    return {
      alertas,
      total: parseInt(countResult.count),
    };
  },

  /**
   * Obtener configuración de alertas
   */
  async obtenerConfiguracion(): Promise<ConfiguracionAlerta[]> {
    return db.any<ConfiguracionAlerta>(
      `SELECT * FROM configuracion_alerta ORDER BY tipo`
    );
  },

  /**
   * Actualizar configuración de alerta
   */
  async actualizarConfiguracion(
    tipo: string,
    datos: Partial<ConfiguracionAlerta>
  ): Promise<ConfiguracionAlerta | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (datos.activa !== undefined) {
      updates.push(`activa = $${paramIndex++}`);
      values.push(datos.activa);
    }
    if (datos.severidad_default !== undefined) {
      updates.push(`severidad_default = $${paramIndex++}`);
      values.push(datos.severidad_default);
    }
    if (datos.tiempo_inactividad_minutos !== undefined) {
      updates.push(`tiempo_inactividad_minutos = $${paramIndex++}`);
      values.push(datos.tiempo_inactividad_minutos);
    }
    if (datos.notificar_push !== undefined) {
      updates.push(`notificar_push = $${paramIndex++}`);
      values.push(datos.notificar_push);
    }
    if (datos.notificar_email !== undefined) {
      updates.push(`notificar_email = $${paramIndex++}`);
      values.push(datos.notificar_email);
    }
    if (datos.roles_destino !== undefined) {
      updates.push(`roles_destino = $${paramIndex++}`);
      values.push(datos.roles_destino);
    }

    if (updates.length === 0) return null;

    values.push(tipo);

    return db.oneOrNone<ConfiguracionAlerta>(
      `UPDATE configuracion_alerta
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE tipo = $${paramIndex}
       RETURNING *`,
      values
    );
  },

  /**
   * Ejecutar verificaciones automáticas de alertas
   */
  async ejecutarVerificaciones(): Promise<{
    unidades_inactivas: number;
    inspecciones_pendientes: number;
  }> {
    const unidadesInactivas = await db.one<{ verificar_unidades_inactivas: number }>(
      `SELECT verificar_unidades_inactivas(60)`
    );

    const inspeccionesPendientes = await db.one<{ verificar_inspecciones_pendientes: number }>(
      `SELECT verificar_inspecciones_pendientes(30)`
    );

    return {
      unidades_inactivas: unidadesInactivas.verificar_unidades_inactivas,
      inspecciones_pendientes: inspeccionesPendientes.verificar_inspecciones_pendientes,
    };
  },

  /**
   * Limpiar alertas expiradas
   */
  async limpiarExpiradas(): Promise<number> {
    const result = await db.result(
      `UPDATE alerta
       SET estado = 'EXPIRADA', updated_at = CURRENT_TIMESTAMP
       WHERE estado = 'ACTIVA'
         AND fecha_expiracion IS NOT NULL
         AND fecha_expiracion < CURRENT_TIMESTAMP`
    );
    return result.rowCount;
  },

  /**
   * Obtener estadísticas de alertas
   */
  async obtenerEstadisticas(dias: number = 30): Promise<{
    total: number;
    por_tipo: { tipo: string; cantidad: number }[];
    por_severidad: { severidad: string; cantidad: number }[];
    por_estado: { estado: string; cantidad: number }[];
    tiempo_promedio_atencion: number;
  }> {
    const stats = await db.one(
      `SELECT
         COUNT(*) AS total,
         AVG(EXTRACT(EPOCH FROM (fecha_atencion - created_at)) / 60)::INTEGER AS tiempo_promedio
       FROM alerta
       WHERE created_at >= CURRENT_DATE - INTERVAL '$1 days'`,
      [dias]
    );

    const porTipo = await db.any(
      `SELECT tipo, COUNT(*) AS cantidad
       FROM alerta
       WHERE created_at >= CURRENT_DATE - INTERVAL '$1 days'
       GROUP BY tipo
       ORDER BY cantidad DESC`,
      [dias]
    );

    const porSeveridad = await db.any(
      `SELECT severidad, COUNT(*) AS cantidad
       FROM alerta
       WHERE created_at >= CURRENT_DATE - INTERVAL '$1 days'
       GROUP BY severidad
       ORDER BY cantidad DESC`,
      [dias]
    );

    const porEstado = await db.any(
      `SELECT estado, COUNT(*) AS cantidad
       FROM alerta
       WHERE created_at >= CURRENT_DATE - INTERVAL '$1 days'
       GROUP BY estado`,
      [dias]
    );

    return {
      total: parseInt(stats.total) || 0,
      por_tipo: porTipo.map((r: any) => ({ tipo: r.tipo, cantidad: parseInt(r.cantidad) })),
      por_severidad: porSeveridad.map((r: any) => ({ severidad: r.severidad, cantidad: parseInt(r.cantidad) })),
      por_estado: porEstado.map((r: any) => ({ estado: r.estado, cantidad: parseInt(r.cantidad) })),
      tiempo_promedio_atencion: parseInt(stats.tiempo_promedio) || 0,
    };
  },
};

export default AlertasService;
