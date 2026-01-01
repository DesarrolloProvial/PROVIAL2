import { db } from '../config/database';

// ============================================
// SERVICIO DE DASHBOARD EJECUTIVO
// ============================================

export const DashboardService = {
  /**
   * Obtener resumen general del sistema
   */
  async obtenerResumenGeneral(sedeId?: number): Promise<{
    brigadas_activas: number;
    unidades_activas: number;
    situaciones_hoy: number;
    km_recorridos_hoy: number;
  }> {
    const params = sedeId ? [sedeId] : [];

    const result = await db.one(
      `SELECT
         (SELECT COUNT(*) FROM brigada b
          WHERE b.activa = TRUE
          ${sedeId ? 'AND b.sede_id = $1' : ''}) AS brigadas_activas,
         (SELECT COUNT(*) FROM unidad u
          WHERE u.activa = TRUE
          ${sedeId ? 'AND u.sede_id = $1' : ''}) AS unidades_activas,
         (SELECT COUNT(*) FROM situacion sit
          ${sedeId ? 'JOIN unidad u ON sit.unidad_id = u.id' : ''}
          WHERE DATE(sit.created_at) = CURRENT_DATE
          ${sedeId ? 'AND u.sede_id = $1' : ''}) AS situaciones_hoy,
         (SELECT COALESCE(SUM(su.km_final - su.km_inicial), 0)
          FROM salida_unidad su
          ${sedeId ? 'JOIN unidad u ON su.unidad_id = u.id' : ''}
          WHERE DATE(su.fecha_hora_salida) = CURRENT_DATE
          AND su.km_final IS NOT NULL
          ${sedeId ? 'AND u.sede_id = $1' : ''}) AS km_recorridos_hoy`,
      params
    );

    return {
      brigadas_activas: parseInt(result.brigadas_activas) || 0,
      unidades_activas: parseInt(result.unidades_activas) || 0,
      situaciones_hoy: parseInt(result.situaciones_hoy) || 0,
      km_recorridos_hoy: parseInt(result.km_recorridos_hoy) || 0,
    };
  },

  /**
   * Obtener situaciones por tipo (últimos N días)
   */
  async obtenerSituacionesPorTipo(dias: number = 30, sedeId?: number): Promise<{
    tipo: string;
    cantidad: number;
    color: string;
  }[]> {
    const sedeCondition = sedeId
      ? 'JOIN unidad u ON s.unidad_id = u.id WHERE u.sede_id = $2 AND'
      : 'WHERE';
    const params = sedeId ? [dias, sedeId] : [dias];

    const result = await db.any(
      `SELECT
         s.tipo_situacion AS tipo,
         COUNT(*) AS cantidad
       FROM situacion s
       ${sedeCondition}
       s.created_at >= CURRENT_DATE - INTERVAL '$1 days'
       GROUP BY s.tipo_situacion
       ORDER BY cantidad DESC`,
      params
    );

    const colores: Record<string, string> = {
      INCIDENTE: '#ef4444',
      ASISTENCIA: '#3b82f6',
      EMERGENCIA: '#f59e0b',
      OTRO: '#6b7280',
    };

    return result.map((r: any) => ({
      tipo: r.tipo,
      cantidad: parseInt(r.cantidad),
      color: colores[r.tipo] || '#6b7280',
    }));
  },

  /**
   * Obtener situaciones por día (últimos N días)
   */
  async obtenerSituacionesPorDia(dias: number = 30, sedeId?: number): Promise<{
    fecha: string;
    incidentes: number;
    asistencias: number;
    emergencias: number;
    total: number;
  }[]> {
    const sedeCondition = sedeId
      ? 'JOIN unidad u ON s.unidad_id = u.id WHERE u.sede_id = $2 AND'
      : 'WHERE';
    const params = sedeId ? [dias, sedeId] : [dias];

    const result = await db.any(
      `SELECT
         DATE(s.created_at) AS fecha,
         COUNT(*) FILTER (WHERE s.tipo_situacion = 'INCIDENTE') AS incidentes,
         COUNT(*) FILTER (WHERE s.tipo_situacion = 'ASISTENCIA') AS asistencias,
         COUNT(*) FILTER (WHERE s.tipo_situacion = 'EMERGENCIA') AS emergencias,
         COUNT(*) AS total
       FROM situacion s
       ${sedeCondition}
       s.created_at >= CURRENT_DATE - INTERVAL '$1 days'
       GROUP BY DATE(s.created_at)
       ORDER BY fecha`,
      params
    );

    return result.map((r: any) => ({
      fecha: r.fecha.toISOString().split('T')[0],
      incidentes: parseInt(r.incidentes) || 0,
      asistencias: parseInt(r.asistencias) || 0,
      emergencias: parseInt(r.emergencias) || 0,
      total: parseInt(r.total) || 0,
    }));
  },

  /**
   * Obtener rendimiento de brigadas
   */
  async obtenerRendimientoBrigadas(dias: number = 30, sedeId?: number, limit: number = 10): Promise<{
    brigada_id: number;
    nombre: string;
    chapa: string;
    situaciones_atendidas: number;
    km_recorridos: number;
    horas_servicio: number;
  }[]> {
    const sedeCondition = sedeId ? 'WHERE b.sede_id = $3' : '';
    const params = sedeId ? [dias, limit, sedeId] : [dias, limit];

    const result = await db.any(
      `SELECT
         b.id AS brigada_id,
         b.nombre AS nombre,
         b.codigo AS chapa,
         COUNT(DISTINCT sit.id) AS situaciones_atendidas,
         COALESCE(SUM(su.km_final - su.km_inicial), 0)::INTEGER AS km_recorridos,
         COALESCE(
           EXTRACT(EPOCH FROM SUM(su.fecha_hora_regreso - su.fecha_hora_salida)) / 3600,
           0
         )::INTEGER AS horas_servicio
       FROM brigada b
       LEFT JOIN brigada_unidad bu ON b.id = bu.brigada_id AND bu.activo = TRUE
       LEFT JOIN salida_unidad su ON bu.unidad_id = su.unidad_id
         AND su.fecha_hora_salida >= CURRENT_DATE - INTERVAL '$1 days'
       LEFT JOIN situacion sit ON bu.unidad_id = sit.unidad_id
         AND sit.created_at >= CURRENT_DATE - INTERVAL '$1 days'
       ${sedeCondition}
       GROUP BY b.id, b.nombre, b.codigo
       ORDER BY situaciones_atendidas DESC
       LIMIT $2`,
      params
    );

    return result.map((r: any) => ({
      brigada_id: r.brigada_id,
      nombre: r.nombre,
      chapa: r.chapa,
      situaciones_atendidas: parseInt(r.situaciones_atendidas) || 0,
      km_recorridos: parseInt(r.km_recorridos) || 0,
      horas_servicio: parseInt(r.horas_servicio) || 0,
    }));
  },

  /**
   * Obtener estado de unidades
   */
  async obtenerEstadoUnidades(sedeId?: number): Promise<{
    en_servicio: number;
    disponibles: number;
    en_mantenimiento: number;
    total: number;
  }> {
    const sedeCondition = sedeId ? 'WHERE u.sede_id = $1' : '';
    const params = sedeId ? [sedeId] : [];

    const result = await db.one(
      `SELECT
         COUNT(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM salida_unidad su
           WHERE su.unidad_id = u.id
           AND su.fecha_hora_salida IS NOT NULL
           AND su.fecha_hora_regreso IS NULL
         )) AS en_servicio,
         COUNT(*) FILTER (WHERE u.activa = TRUE AND NOT EXISTS (
           SELECT 1 FROM salida_unidad su
           WHERE su.unidad_id = u.id
           AND su.fecha_hora_salida IS NOT NULL
           AND su.fecha_hora_regreso IS NULL
         )) AS disponibles,
         COUNT(*) FILTER (WHERE u.activa = FALSE) AS en_mantenimiento,
         COUNT(*) AS total
       FROM unidad u
       ${sedeCondition}`,
      params
    );

    return {
      en_servicio: parseInt(result.en_servicio) || 0,
      disponibles: parseInt(result.disponibles) || 0,
      en_mantenimiento: parseInt(result.en_mantenimiento) || 0,
      total: parseInt(result.total) || 0,
    };
  },

  /**
   * Obtener situaciones por hora del día
   */
  async obtenerSituacionesPorHora(dias: number = 30, sedeId?: number): Promise<{
    hora: number;
    cantidad: number;
  }[]> {
    const sedeCondition = sedeId
      ? 'JOIN unidad u ON s.unidad_id = u.id WHERE u.sede_id = $2 AND'
      : 'WHERE';
    const params = sedeId ? [dias, sedeId] : [dias];

    const result = await db.any(
      `SELECT
         EXTRACT(HOUR FROM s.created_at)::INTEGER AS hora,
         COUNT(*) AS cantidad
       FROM situacion s
       ${sedeCondition}
       s.created_at >= CURRENT_DATE - INTERVAL '$1 days'
       GROUP BY EXTRACT(HOUR FROM s.created_at)
       ORDER BY hora`,
      params
    );

    // Llenar horas faltantes con 0
    const horasCompletas = [];
    for (let h = 0; h < 24; h++) {
      const encontrado = result.find((r: any) => r.hora === h);
      horasCompletas.push({
        hora: h,
        cantidad: encontrado ? parseInt(encontrado.cantidad) : 0,
      });
    }

    return horasCompletas;
  },

  /**
   * Obtener situaciones por departamento
   */
  async obtenerSituacionesPorDepartamento(dias: number = 30, sedeId?: number): Promise<{
    departamento: string;
    cantidad: number;
  }[]> {
    const sedeCondition = sedeId
      ? 'JOIN unidad u ON s.unidad_id = u.id WHERE u.sede_id = $2 AND'
      : 'WHERE';
    const params = sedeId ? [dias, sedeId] : [dias];

    const result = await db.any(
      `SELECT
         COALESCE(d.nombre, 'No especificado') AS departamento,
         COUNT(*) AS cantidad
       FROM situacion s
       LEFT JOIN municipio m ON s.municipio_id = m.id
       LEFT JOIN departamento d ON m.departamento_id = d.id
       ${sedeCondition}
       s.created_at >= CURRENT_DATE - INTERVAL '$1 days'
       GROUP BY d.nombre
       ORDER BY cantidad DESC
       LIMIT 10`,
      params
    );

    return result.map((r: any) => ({
      departamento: r.departamento,
      cantidad: parseInt(r.cantidad),
    }));
  },

  /**
   * Obtener tiempo promedio de respuesta
   */
  async obtenerTiempoPromedioRespuesta(dias: number = 30, sedeId?: number): Promise<{
    promedio_minutos: number;
    por_tipo: { tipo: string; promedio: number }[];
  }> {
    // Esta métrica requiere trackear tiempo desde asignación hasta llegada
    // Por ahora retornamos datos simulados basados en situaciones
    const params = sedeId ? [dias, sedeId] : [dias];

    const result = await db.any(
      `SELECT
         s.tipo_situacion AS tipo,
         AVG(EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 60)::INTEGER AS promedio_minutos
       FROM situacion s
       ${sedeId ? 'JOIN unidad u ON s.unidad_id = u.id WHERE u.sede_id = $2 AND' : 'WHERE'}
       s.created_at >= CURRENT_DATE - INTERVAL '$1 days'
       GROUP BY s.tipo_situacion`,
      params
    );

    const porTipo = result.map((r: any) => ({
      tipo: r.tipo,
      promedio: parseInt(r.promedio_minutos) || 0,
    }));

    const promedio = porTipo.length > 0
      ? Math.round(porTipo.reduce((acc, t) => acc + t.promedio, 0) / porTipo.length)
      : 0;

    return {
      promedio_minutos: promedio,
      por_tipo: porTipo,
    };
  },

  /**
   * Obtener comparativa mensual
   */
  async obtenerComparativaMensual(sedeId?: number): Promise<{
    mes_actual: { situaciones: number; km: number };
    mes_anterior: { situaciones: number; km: number };
    variacion_situaciones: number;
    variacion_km: number;
  }> {
    const sedeCondition = sedeId
      ? 'JOIN unidad u ON s.unidad_id = u.id WHERE u.sede_id = $1 AND'
      : 'WHERE';
    const params = sedeId ? [sedeId] : [];

    const situacionesMesActual = await db.one(
      `SELECT COUNT(*) AS cantidad FROM situacion s
       ${sedeCondition}
       DATE_TRUNC('month', s.created_at) = DATE_TRUNC('month', CURRENT_DATE)`,
      params
    );

    const situacionesMesAnterior = await db.one(
      `SELECT COUNT(*) AS cantidad FROM situacion s
       ${sedeCondition}
       DATE_TRUNC('month', s.created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')`,
      params
    );

    const kmMesActual = await db.one(
      `SELECT COALESCE(SUM(su.km_final - su.km_inicial), 0) AS total FROM salida_unidad su
       ${sedeId ? 'JOIN unidad u ON su.unidad_id = u.id WHERE u.sede_id = $1 AND' : 'WHERE'}
       DATE_TRUNC('month', su.fecha_hora_salida) = DATE_TRUNC('month', CURRENT_DATE)
       AND su.km_final IS NOT NULL`,
      params
    );

    const kmMesAnterior = await db.one(
      `SELECT COALESCE(SUM(su.km_final - su.km_inicial), 0) AS total FROM salida_unidad su
       ${sedeId ? 'JOIN unidad u ON su.unidad_id = u.id WHERE u.sede_id = $1 AND' : 'WHERE'}
       DATE_TRUNC('month', su.fecha_hora_salida) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
       AND su.km_final IS NOT NULL`,
      params
    );

    const sitActual = parseInt(situacionesMesActual.cantidad) || 0;
    const sitAnterior = parseInt(situacionesMesAnterior.cantidad) || 0;
    const kmActual = parseInt(kmMesActual.total) || 0;
    const kmAnterior = parseInt(kmMesAnterior.total) || 0;

    return {
      mes_actual: { situaciones: sitActual, km: kmActual },
      mes_anterior: { situaciones: sitAnterior, km: kmAnterior },
      variacion_situaciones: sitAnterior > 0
        ? Math.round(((sitActual - sitAnterior) / sitAnterior) * 100)
        : 0,
      variacion_km: kmAnterior > 0
        ? Math.round(((kmActual - kmAnterior) / kmAnterior) * 100)
        : 0,
    };
  },

  /**
   * Obtener dashboard completo
   */
  async obtenerDashboardCompleto(dias: number = 30, sedeId?: number) {
    const [
      resumen,
      situacionesPorTipo,
      situacionesPorDia,
      estadoUnidades,
      situacionesPorHora,
      situacionesPorDepto,
      comparativaMensual,
      rendimientoBrigadas,
    ] = await Promise.all([
      this.obtenerResumenGeneral(sedeId),
      this.obtenerSituacionesPorTipo(dias, sedeId),
      this.obtenerSituacionesPorDia(dias, sedeId),
      this.obtenerEstadoUnidades(sedeId),
      this.obtenerSituacionesPorHora(dias, sedeId),
      this.obtenerSituacionesPorDepartamento(dias, sedeId),
      this.obtenerComparativaMensual(sedeId),
      this.obtenerRendimientoBrigadas(dias, sedeId),
    ]);

    return {
      resumen,
      situaciones_por_tipo: situacionesPorTipo,
      situaciones_por_dia: situacionesPorDia,
      estado_unidades: estadoUnidades,
      situaciones_por_hora: situacionesPorHora,
      situaciones_por_departamento: situacionesPorDepto,
      comparativa_mensual: comparativaMensual,
      rendimiento_brigadas: rendimientoBrigadas,
    };
  },
};

export default DashboardService;
