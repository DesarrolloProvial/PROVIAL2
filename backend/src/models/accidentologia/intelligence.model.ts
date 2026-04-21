import { db } from '../../config/database';

export const IntelligenceModel = {
  async getVehiculoHistorial(placa: string) {
    return db.oneOrNone(
      `SELECT * FROM mv_vehiculo_historial WHERE UPPER(placa) = UPPER($1)`,
      [placa],
    );
  },

  async getPilotoHistorial(licencia: string) {
    return db.oneOrNone(
      `SELECT * FROM mv_piloto_historial WHERE licencia_numero = $1`,
      [licencia],
    );
  },

  async getVehiculosReincidentes(limit: number, nivel_riesgo?: string) {
    let query = `SELECT * FROM mv_vehiculos_reincidentes WHERE 1=1`;
    const params: any[] = [];

    if (nivel_riesgo) {
      params.push(nivel_riesgo);
      query += ` AND nivel_riesgo >= $${params.length}`;
    }

    query += ` ORDER BY nivel_riesgo DESC, total_incidentes DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    return db.manyOrNone(query, params);
  },

  async getVehiculoByPlaca(placa: string) {
    return db.oneOrNone(
      `SELECT * FROM mv_vehiculos_reincidentes WHERE placa = $1`,
      [placa],
    );
  },

  async getPilotosProblematicos(limit: number, nivel_riesgo?: string, licencia_vencida?: boolean) {
    let query = `SELECT * FROM mv_pilotos_problematicos WHERE 1=1`;
    const params: any[] = [];

    if (nivel_riesgo) {
      params.push(nivel_riesgo);
      query += ` AND nivel_riesgo >= $${params.length}`;
    }
    if (licencia_vencida) {
      query += ` AND licencia_vencida = TRUE`;
    }

    query += ` ORDER BY nivel_riesgo DESC, total_incidentes DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    return db.manyOrNone(query, params);
  },

  async getPilotoByLicencia(licencia: string) {
    return db.oneOrNone(
      `SELECT * FROM mv_pilotos_problematicos WHERE licencia_numero = $1`,
      [licencia],
    );
  },

  async getPuntosCalientes(limit: number, ruta_codigo?: string, nivel_peligrosidad?: string) {
    let query = `SELECT * FROM mv_puntos_calientes WHERE 1=1`;
    const params: any[] = [];

    if (ruta_codigo) {
      params.push(ruta_codigo);
      query += ` AND ruta_codigo = $${params.length}`;
    }
    if (nivel_peligrosidad) {
      params.push(nivel_peligrosidad);
      query += ` AND nivel_peligrosidad >= $${params.length}`;
    }

    query += ` ORDER BY nivel_peligrosidad DESC, total_incidentes DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    return db.manyOrNone(query, params);
  },

  async getMapaCalor() {
    return db.manyOrNone(`
      SELECT
        ruta_codigo, ruta_nombre, kilometro,
        latitud_promedio, longitud_promedio,
        total_incidentes, nivel_peligrosidad
      FROM mv_puntos_calientes
      WHERE latitud_promedio IS NOT NULL AND longitud_promedio IS NOT NULL
      ORDER BY nivel_peligrosidad DESC
    `);
  },

  async getTendenciasTemporales(anio?: string, mes?: string) {
    let query = `SELECT * FROM mv_tendencias_temporales WHERE 1=1`;
    const params: any[] = [];

    if (anio) { params.push(anio); query += ` AND anio = $${params.length}`; }
    if (mes)  { params.push(mes);  query += ` AND mes = $${params.length}`; }

    query += ` ORDER BY fecha DESC, hora DESC`;
    return db.manyOrNone(query, params);
  },

  async getAnalisisDiaSemana() {
    return db.manyOrNone(`
      SELECT
        dia_semana, nombre_dia,
        SUM(total_incidentes) as total_incidentes,
        SUM(total_heridos) as total_heridos,
        SUM(total_fallecidos) as total_fallecidos,
        AVG(total_incidentes) as promedio_incidentes
      FROM mv_tendencias_temporales
      GROUP BY dia_semana, nombre_dia
      ORDER BY dia_semana
    `);
  },

  async getAnalisisFranjaHoraria() {
    return db.manyOrNone(`
      SELECT
        franja_horaria,
        SUM(total_incidentes) as total_incidentes,
        SUM(total_heridos) as total_heridos,
        SUM(total_fallecidos) as total_fallecidos,
        AVG(total_incidentes) as promedio_incidentes
      FROM mv_tendencias_temporales
      GROUP BY franja_horaria
      ORDER BY
        CASE franja_horaria
          WHEN 'Madrugada (00:00-05:59)' THEN 1
          WHEN 'Mañana (06:00-11:59)' THEN 2
          WHEN 'Tarde (12:00-17:59)' THEN 3
          WHEN 'Noche (18:00-23:59)' THEN 4
        END
    `);
  },

  async getDashboard() {
    const [vehiculosTop, pilotosTop, puntosTop, tendenciasRecientes, stats] = await Promise.all([
      db.manyOrNone(`SELECT * FROM mv_vehiculos_reincidentes ORDER BY nivel_riesgo DESC LIMIT 5`),
      db.manyOrNone(`SELECT * FROM mv_pilotos_problematicos ORDER BY nivel_riesgo DESC LIMIT 5`),
      db.manyOrNone(`SELECT * FROM mv_puntos_calientes ORDER BY nivel_peligrosidad DESC LIMIT 5`),
      db.manyOrNone(`
        SELECT * FROM mv_tendencias_temporales
        WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY fecha DESC, hora DESC LIMIT 10
      `),
      db.one(`
        SELECT
          (SELECT COUNT(*) FROM mv_vehiculos_reincidentes) as total_vehiculos_reincidentes,
          (SELECT COUNT(*) FROM mv_pilotos_problematicos) as total_pilotos_problematicos,
          (SELECT COUNT(*) FROM mv_puntos_calientes) as total_puntos_calientes,
          (SELECT COUNT(*) FROM vehiculo) as total_vehiculos_registrados,
          (SELECT COUNT(*) FROM piloto) as total_pilotos_registrados
      `),
    ]);
    return { estadisticas: stats, vehiculos_alto_riesgo: vehiculosTop, pilotos_alto_riesgo: pilotosTop, puntos_mas_peligrosos: puntosTop, tendencias_recientes: tendenciasRecientes };
  },

  async getStats() {
    return db.one(`
      SELECT
        (SELECT COUNT(*) FROM vehiculo) as total_vehiculos,
        (SELECT COUNT(*) FROM mv_vehiculo_historial WHERE nivel_alerta = 'ALTO') as vehiculos_alerta_alta,
        (SELECT COUNT(*) FROM mv_vehiculo_historial WHERE nivel_alerta = 'MEDIO') as vehiculos_alerta_media,
        (SELECT COUNT(*) FROM mv_vehiculo_historial WHERE nivel_alerta = 'BAJO') as vehiculos_alerta_baja,
        (SELECT COUNT(*) FROM piloto) as total_pilotos,
        (SELECT COUNT(*) FROM mv_piloto_historial WHERE nivel_alerta = 'ALTO') as pilotos_alerta_alta,
        (SELECT COUNT(*) FROM mv_piloto_historial WHERE nivel_alerta = 'MEDIO') as pilotos_alerta_media,
        (SELECT COUNT(*) FROM mv_piloto_historial WHERE nivel_alerta = 'BAJO') as pilotos_alerta_baja,
        (SELECT COUNT(*) FROM mv_piloto_historial WHERE licencia_vencida = true) as pilotos_licencia_vencida,
        (SELECT COUNT(*) FROM incidente) as total_incidentes,
        (SELECT COUNT(*) FROM incidente WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as incidentes_ultimo_mes,
        (SELECT COUNT(*) FROM incidente WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as incidentes_ultima_semana,
        (SELECT COUNT(*) FROM sancion) as total_sanciones,
        (SELECT COUNT(*) FROM sancion WHERE pagada = false) as sanciones_pendientes,
        (SELECT COALESCE(SUM(monto), 0) FROM sancion WHERE pagada = false) as monto_pendiente_total
    `);
  },

  async getTopReincidentes() {
    return Promise.all([
      db.manyOrNone(`
        SELECT placa, tipo_vehiculo, marca, color, total_incidentes, nivel_alerta, dias_desde_ultimo_incidente
        FROM mv_vehiculo_historial
        WHERE total_incidentes > 0
        ORDER BY total_incidentes DESC, ultimo_incidente DESC LIMIT 10
      `),
      db.manyOrNone(`
        SELECT nombre, licencia_numero, licencia_tipo, total_incidentes, total_sanciones, nivel_alerta, licencia_vencida
        FROM mv_piloto_historial
        WHERE total_incidentes > 0 OR total_sanciones > 0
        ORDER BY (total_incidentes + total_sanciones) DESC, ultimo_incidente DESC LIMIT 10
      `),
    ]);
  },

  async refreshViews(): Promise<void> {
    await db.any(`SELECT refresh_intelligence_views()`);
  },
};
