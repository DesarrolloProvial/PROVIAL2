import { db } from '../../config/database';

// ============================================
// SERVICIO DE ESTADÍSTICAS DE ACCIDENTOLOGÍA
// ============================================

interface EstadisticasFilters {
  fecha_inicio?: string;
  fecha_fin?: string;
  sede_id?: number;
  departamento_id?: number;
  ruta_id?: number;
  tipo_situacion?: string;
  origen_datos?: string; // 'APP' | 'EXCEL_2025' | 'ALL'
  clima?: string;
  area?: string;
}

interface DetalleFilters extends EstadisticasFilters {
  // Filtros de dimensión específica (al hacer click en una gráfica)
  mes?: string;        // 'YYYY-MM'
  dia_semana?: number; // 0=Domingo..6=Sabado
  hora?: number;       // 0..23
  causa_probable?: string;
  sede_nombre?: string;
  tipo_vehiculo?: string;
  departamento_nombre?: string;
  ruta_codigo?: string;
}

// Helper: construir WHERE dinámico con parámetros numerados
function buildWhere(f: EstadisticasFilters): { clause: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];
  let i = 1;

  if (f.fecha_inicio) {
    conditions.push(`COALESCE(s.fecha_hora_aviso, s.created_at) >= $${i}`);
    params.push(f.fecha_inicio);
    i++;
  }
  if (f.fecha_fin) {
    conditions.push(`COALESCE(s.fecha_hora_aviso, s.created_at) <= $${i}::date + INTERVAL '1 day'`);
    params.push(f.fecha_fin);
    i++;
  }
  if (f.sede_id) {
    conditions.push(`u.sede_id = $${i}`);
    params.push(f.sede_id);
    i++;
  }
  if (f.departamento_id) {
    conditions.push(`s.departamento_id = $${i}`);
    params.push(f.departamento_id);
    i++;
  }
  if (f.ruta_id) {
    conditions.push(`s.ruta_id = $${i}`);
    params.push(f.ruta_id);
    i++;
  }
  if (f.tipo_situacion) {
    // 'ASISTENCIA_ALL' = ASISTENCIA + ASISTENCIA_VEHICULAR (para comunicación social)
    if (f.tipo_situacion === 'ASISTENCIA_ALL') {
      conditions.push(`s.tipo_situacion IN ('ASISTENCIA', 'ASISTENCIA_VEHICULAR')`);
    } else {
      conditions.push(`s.tipo_situacion = $${i}`);
      params.push(f.tipo_situacion);
      i++;
    }
  }
  if (f.origen_datos && f.origen_datos !== 'ALL') {
    conditions.push(`s.origen_datos = $${i}`);
    params.push(f.origen_datos);
    i++;
  }
  if (f.clima) {
    conditions.push(`s.clima = $${i}`);
    params.push(f.clima);
    i++;
  }
  if (f.area) {
    conditions.push(`s.area = $${i}`);
    params.push(f.area);
    i++;
  }

  const needsUnidadJoin = !!f.sede_id;
  const joinClause = needsUnidadJoin ? 'LEFT JOIN unidad u ON s.unidad_id = u.id' : '';
  // Siempre usar WHERE 1=1 para que los AND adicionales en queries funcionen
  const whereClause = 'WHERE 1=1' + (conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '');

  return { clause: `FROM situacion s ${joinClause} ${whereClause}`, params };
}

export const EstadisticasService = {

  async obtenerKPIs(f: EstadisticasFilters) {
    const { clause, params } = buildWhere(f);
    const result = await db.one(
      `SELECT
        COUNT(*) AS total_situaciones,
        COALESCE(SUM(s.heridos), 0) AS total_heridos,
        COALESCE(SUM(s.fallecidos), 0) AS total_fallecidos,
        COALESCE(SUM(s.ilesos), 0) AS total_ilesos,
        COALESCE(SUM(s.trasladados), 0) AS total_trasladados,
        (SELECT COUNT(*) FROM situacion_vehiculo sv
         INNER JOIN situacion sit ON sv.situacion_id = sit.id
         ${f.sede_id ? 'INNER JOIN unidad u2 ON sit.unidad_id = u2.id' : ''}
         WHERE 1=1
         ${f.fecha_inicio ? `AND COALESCE(sit.fecha_hora_aviso, sit.created_at) >= $${params.indexOf(f.fecha_inicio) + 1}` : ''}
         ${f.fecha_fin ? `AND COALESCE(sit.fecha_hora_aviso, sit.created_at) <= $${params.indexOf(f.fecha_fin) + 1}::date + INTERVAL '1 day'` : ''}
         ${f.origen_datos && f.origen_datos !== 'ALL' ? `AND sit.origen_datos = $${params.indexOf(f.origen_datos) + 1}` : ''}
        ) AS total_vehiculos
      ${clause}`,
      params
    );

    return {
      total_situaciones: parseInt(result.total_situaciones) || 0,
      total_heridos: parseInt(result.total_heridos) || 0,
      total_fallecidos: parseInt(result.total_fallecidos) || 0,
      total_ilesos: parseInt(result.total_ilesos) || 0,
      total_trasladados: parseInt(result.total_trasladados) || 0,
      total_vehiculos: parseInt(result.total_vehiculos) || 0,
    };
  },

  async situacionesPorMes(f: EstadisticasFilters) {
    const { clause, params } = buildWhere(f);
    const result = await db.any(
      `SELECT
        TO_CHAR(DATE_TRUNC('month', COALESCE(s.fecha_hora_aviso, s.created_at)), 'YYYY-MM') AS mes,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE s.tipo_situacion = 'INCIDENTE') AS incidentes,
        COUNT(*) FILTER (WHERE s.tipo_situacion IN ('ASISTENCIA', 'ASISTENCIA_VEHICULAR')) AS asistencias,
        COUNT(*) FILTER (WHERE s.tipo_situacion = 'EMERGENCIA') AS emergencias
      ${clause}
      GROUP BY DATE_TRUNC('month', COALESCE(s.fecha_hora_aviso, s.created_at))
      ORDER BY mes`,
      params
    );

    return result.map((r: any) => ({
      mes: r.mes,
      total: parseInt(r.total) || 0,
      incidentes: parseInt(r.incidentes) || 0,
      asistencias: parseInt(r.asistencias) || 0,
      emergencias: parseInt(r.emergencias) || 0,
    }));
  },

  async distribucionPorTipo(f: EstadisticasFilters) {
    const { clause, params } = buildWhere(f);
    const result = await db.any(
      `SELECT s.tipo_situacion AS tipo, COUNT(*) AS cantidad
      ${clause}
      GROUP BY s.tipo_situacion
      ORDER BY cantidad DESC`,
      params
    );

    return result.map((r: any) => ({
      tipo: r.tipo,
      cantidad: parseInt(r.cantidad) || 0,
    }));
  },

  async porDepartamento(f: EstadisticasFilters) {
    const { clause, params } = buildWhere(f);
    const result = await db.any(
      `SELECT COALESCE(d.nombre, 'No especificado') AS departamento, COUNT(*) AS cantidad
      ${clause.replace('FROM situacion s', 'FROM situacion s LEFT JOIN departamento d ON s.departamento_id = d.id')}
      GROUP BY d.nombre
      ORDER BY cantidad DESC
      LIMIT 25`,
      params
    );

    return result.map((r: any) => ({
      departamento: r.departamento,
      cantidad: parseInt(r.cantidad) || 0,
    }));
  },

  async porRuta(f: EstadisticasFilters) {
    const { clause, params } = buildWhere(f);
    const result = await db.any(
      `SELECT COALESCE(r.codigo, 'Sin ruta') AS ruta, COUNT(*) AS cantidad
      ${clause.replace('FROM situacion s', 'FROM situacion s LEFT JOIN ruta r ON s.ruta_id = r.id')}
      GROUP BY r.codigo
      ORDER BY cantidad DESC
      LIMIT 20`,
      params
    );

    return result.map((r: any) => ({
      ruta: r.ruta,
      cantidad: parseInt(r.cantidad) || 0,
    }));
  },

  async heridosFallecidosPorMes(f: EstadisticasFilters) {
    const { clause, params } = buildWhere(f);
    const result = await db.any(
      `SELECT
        TO_CHAR(DATE_TRUNC('month', COALESCE(s.fecha_hora_aviso, s.created_at)), 'YYYY-MM') AS mes,
        COALESCE(SUM(s.heridos), 0) AS heridos,
        COALESCE(SUM(s.fallecidos), 0) AS fallecidos
      ${clause}
      GROUP BY DATE_TRUNC('month', COALESCE(s.fecha_hora_aviso, s.created_at))
      ORDER BY mes`,
      params
    );

    return result.map((r: any) => ({
      mes: r.mes,
      heridos: parseInt(r.heridos) || 0,
      fallecidos: parseInt(r.fallecidos) || 0,
    }));
  },

  async tipoVehiculoInvolucrado(f: EstadisticasFilters) {
    const { clause, params } = buildWhere(f);
    const result = await db.any(
      `SELECT COALESCE(tv.nombre, 'Desconocido') AS tipo, COUNT(*) AS cantidad
      ${clause.replace(
        'FROM situacion s',
        'FROM situacion s INNER JOIN situacion_vehiculo sv ON sv.situacion_id = s.id INNER JOIN vehiculo v ON sv.vehiculo_id = v.id LEFT JOIN tipo_vehiculo tv ON v.tipo_vehiculo_id = tv.id'
      )}
      GROUP BY tv.nombre
      ORDER BY cantidad DESC
      LIMIT 15`,
      params
    );

    return result.map((r: any) => ({
      tipo: r.tipo,
      cantidad: parseInt(r.cantidad) || 0,
    }));
  },

  async distribucionPorHora(f: EstadisticasFilters) {
    const { clause, params } = buildWhere(f);
    const result = await db.any(
      `SELECT
        EXTRACT(HOUR FROM COALESCE(s.fecha_hora_aviso, s.created_at))::INTEGER AS hora,
        COUNT(*) AS cantidad
      ${clause}
      GROUP BY hora
      ORDER BY hora`,
      params
    );

    const horasCompletas = [];
    for (let h = 0; h < 24; h++) {
      const found = result.find((r: any) => r.hora === h);
      horasCompletas.push({ hora: h, cantidad: found ? parseInt(found.cantidad) : 0 });
    }
    return horasCompletas;
  },

  async distribucionPorDiaSemana(f: EstadisticasFilters) {
    const { clause, params } = buildWhere(f);
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    const result = await db.any(
      `SELECT
        EXTRACT(DOW FROM COALESCE(s.fecha_hora_aviso, s.created_at))::INTEGER AS dow,
        COUNT(*) AS cantidad
      ${clause}
      GROUP BY dow
      ORDER BY dow`,
      params
    );

    return dias.map((nombre, i) => {
      const found = result.find((r: any) => r.dow === i);
      return { dia: nombre, cantidad: found ? parseInt(found.cantidad) : 0 };
    });
  },

  async distribucionPorClima(f: EstadisticasFilters) {
    const { clause, params } = buildWhere(f);
    const result = await db.any(
      `SELECT COALESCE(s.clima, 'No registrado') AS clima, COUNT(*) AS cantidad
      ${clause}
      GROUP BY s.clima
      ORDER BY cantidad DESC`,
      params
    );

    return result.map((r: any) => ({
      clima: r.clima,
      cantidad: parseInt(r.cantidad) || 0,
    }));
  },

  async areaUrbanaVsRural(f: EstadisticasFilters) {
    const { clause, params } = buildWhere(f);
    const result = await db.any(
      `SELECT COALESCE(s.area, 'No registrado') AS area, COUNT(*) AS cantidad
      ${clause}
      GROUP BY s.area
      ORDER BY cantidad DESC`,
      params
    );

    return result.map((r: any) => ({
      area: r.area,
      cantidad: parseInt(r.cantidad) || 0,
    }));
  },

  async porOrigen(f: EstadisticasFilters) {
    const { clause, params } = buildWhere(f);
    const result = await db.any(
      `SELECT COALESCE(s.origen_datos, 'APP') AS origen, COUNT(*) AS cantidad
      ${clause}
      GROUP BY s.origen_datos
      ORDER BY cantidad DESC`,
      params
    );

    return result.map((r: any) => ({
      origen: r.origen === 'EXCEL_2025' ? 'Excel (historico)' : r.origen === 'APP' ? 'App movil' : r.origen,
      cantidad: parseInt(r.cantidad) || 0,
    }));
  },

  async topCausas(f: EstadisticasFilters) {
    const { clause, params } = buildWhere(f);
    const result = await db.any(
      `SELECT COALESCE(s.causa_probable, 'No registrada') AS causa, COUNT(*) AS cantidad
      ${clause}
      AND s.causa_probable IS NOT NULL AND s.causa_probable != ''
      GROUP BY s.causa_probable
      ORDER BY cantidad DESC
      LIMIT 15`,
      params
    );

    return result.map((r: any) => ({
      causa: r.causa,
      cantidad: parseInt(r.cantidad) || 0,
    }));
  },

  async tiemposRespuesta(f: EstadisticasFilters) {
    // Solo aplica para datos APP (Excel no tiene timestamps de aviso/llegada)
    const fApp = { ...f, origen_datos: 'APP' };
    const { clause, params } = buildWhere(fApp);
    const result = await db.any(
      `SELECT
        s.tipo_situacion AS tipo,
        AVG(EXTRACT(EPOCH FROM (s.fecha_hora_llegada - s.fecha_hora_aviso)) / 60)::INTEGER AS promedio_min,
        COUNT(*) AS muestra
      ${clause}
      AND s.fecha_hora_aviso IS NOT NULL
      AND s.fecha_hora_llegada IS NOT NULL
      AND s.fecha_hora_llegada > s.fecha_hora_aviso
      GROUP BY s.tipo_situacion`,
      params
    );

    return result.map((r: any) => ({
      tipo: r.tipo,
      promedio_min: parseInt(r.promedio_min) || 0,
      muestra: parseInt(r.muestra) || 0,
    }));
  },

  async porSede(f: EstadisticasFilters) {
    const { clause, params } = buildWhere(f);
    const q = clause.includes('LEFT JOIN unidad u')
      ? clause
      : clause.replace('FROM situacion s', 'FROM situacion s LEFT JOIN unidad u ON s.unidad_id = u.id');
    const result = await db.any(
      `SELECT COALESCE(se.nombre, 'Sin sede') AS sede, COUNT(*) AS cantidad
      ${q.replace(
        'LEFT JOIN unidad u ON s.unidad_id = u.id',
        'LEFT JOIN unidad u ON s.unidad_id = u.id LEFT JOIN sede se ON u.sede_id = se.id'
      )}
      GROUP BY se.nombre
      ORDER BY cantidad DESC`,
      params
    );

    return result.map((r: any) => ({
      sede: r.sede,
      cantidad: parseInt(r.cantidad) || 0,
    }));
  },

  async obtenerDetalle(f: DetalleFilters) {
    const conditions: string[] = [];
    const params: any[] = [];
    let i = 1;
    const joins: string[] = [];

    // Filtros base (mismos que buildWhere)
    if (f.fecha_inicio) {
      conditions.push(`COALESCE(s.fecha_hora_aviso, s.created_at) >= $${i}`);
      params.push(f.fecha_inicio); i++;
    }
    if (f.fecha_fin) {
      conditions.push(`COALESCE(s.fecha_hora_aviso, s.created_at) <= $${i}::date + INTERVAL '1 day'`);
      params.push(f.fecha_fin); i++;
    }
    if (f.sede_id) {
      conditions.push(`u.sede_id = $${i}`);
      params.push(f.sede_id); i++;
    }
    if (f.departamento_id) {
      conditions.push(`s.departamento_id = $${i}`);
      params.push(f.departamento_id); i++;
    }
    if (f.ruta_id) {
      conditions.push(`s.ruta_id = $${i}`);
      params.push(f.ruta_id); i++;
    }
    if (f.tipo_situacion) {
      conditions.push(`s.tipo_situacion = $${i}`);
      params.push(f.tipo_situacion); i++;
    }
    if (f.origen_datos && f.origen_datos !== 'ALL') {
      conditions.push(`s.origen_datos = $${i}`);
      params.push(f.origen_datos); i++;
    }
    if (f.clima) {
      conditions.push(`s.clima = $${i}`);
      params.push(f.clima); i++;
    }
    if (f.area) {
      conditions.push(`s.area = $${i}`);
      params.push(f.area); i++;
    }

    // Filtros de dimensión (click en gráficas)
    if (f.mes) {
      conditions.push(`TO_CHAR(DATE_TRUNC('month', COALESCE(s.fecha_hora_aviso, s.created_at)), 'YYYY-MM') = $${i}`);
      params.push(f.mes); i++;
    }
    if (f.dia_semana !== undefined && f.dia_semana !== null) {
      conditions.push(`EXTRACT(DOW FROM COALESCE(s.fecha_hora_aviso, s.created_at))::INTEGER = $${i}`);
      params.push(f.dia_semana); i++;
    }
    if (f.hora !== undefined && f.hora !== null) {
      conditions.push(`EXTRACT(HOUR FROM COALESCE(s.fecha_hora_aviso, s.created_at))::INTEGER = $${i}`);
      params.push(f.hora); i++;
    }
    if (f.causa_probable) {
      conditions.push(`s.causa_probable = $${i}`);
      params.push(f.causa_probable); i++;
    }
    if (f.sede_nombre) {
      joins.push('LEFT JOIN sede se ON u.sede_id = se.id');
      conditions.push(`se.nombre = $${i}`);
      params.push(f.sede_nombre); i++;
    }
    if (f.tipo_vehiculo) {
      joins.push('INNER JOIN situacion_vehiculo sv2 ON sv2.situacion_id = s.id');
      joins.push('INNER JOIN vehiculo v2 ON sv2.vehiculo_id = v2.id');
      joins.push('LEFT JOIN tipo_vehiculo tv2 ON v2.tipo_vehiculo_id = tv2.id');
      conditions.push(`tv2.nombre = $${i}`);
      params.push(f.tipo_vehiculo); i++;
    }
    if (f.departamento_nombre) {
      conditions.push(`d.nombre = $${i}`);
      params.push(f.departamento_nombre); i++;
    }
    if (f.ruta_codigo) {
      conditions.push(`r.codigo = $${i}`);
      params.push(f.ruta_codigo); i++;
    }

    // Siempre necesitamos estos joins para los nombres
    const needsUnidad = !!f.sede_id || !!f.sede_nombre;
    const baseJoins = [
      needsUnidad ? 'LEFT JOIN unidad u ON s.unidad_id = u.id' : 'LEFT JOIN unidad u ON s.unidad_id = u.id',
      'LEFT JOIN departamento d ON s.departamento_id = d.id',
      'LEFT JOIN municipio m ON s.municipio_id = m.id',
      'LEFT JOIN ruta r ON s.ruta_id = r.id',
      'LEFT JOIN catalogo_tipo_situacion cts ON s.tipo_situacion_id = cts.id',
      ...joins,
    ];

    const where = 'WHERE 1=1' + (conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '');

    const result = await db.any(
      `SELECT DISTINCT ON (s.id)
        s.id,
        s.codigo_boleta,
        s.tipo_situacion,
        cts.nombre AS tipo_situacion_nombre,
        s.estado,
        COALESCE(s.fecha_hora_aviso, s.created_at) AS fecha,
        s.km,
        s.sentido,
        d.nombre AS departamento,
        m.nombre AS municipio,
        r.codigo AS ruta,
        s.clima,
        s.area,
        s.origen_datos,
        s.heridos,
        s.fallecidos,
        s.ilesos,
        s.trasladados,
        s.causa_probable,
        s.observaciones,
        u.codigo AS unidad,
        s.latitud,
        s.longitud
      FROM situacion s
      ${baseJoins.join('\n')}
      ${where}
      ORDER BY s.id, COALESCE(s.fecha_hora_aviso, s.created_at) DESC
      LIMIT 500`,
      params
    );

    return result;
  },

  // Obtener TODO en una sola llamada
  async obtenerTodo(f: EstadisticasFilters) {
    const [
      kpis,
      por_mes,
      por_tipo,
      por_departamento,
      por_ruta,
      heridos_fallecidos,
      por_vehiculo,
      por_hora,
      por_dia_semana,
      por_clima,
      por_area,
      por_origen,
      top_causas,
      tiempos_respuesta,
      por_sede,
    ] = await Promise.all([
      this.obtenerKPIs(f),
      this.situacionesPorMes(f),
      this.distribucionPorTipo(f),
      this.porDepartamento(f),
      this.porRuta(f),
      this.heridosFallecidosPorMes(f),
      this.tipoVehiculoInvolucrado(f),
      this.distribucionPorHora(f),
      this.distribucionPorDiaSemana(f),
      this.distribucionPorClima(f),
      this.areaUrbanaVsRural(f),
      this.porOrigen(f),
      this.topCausas(f),
      this.tiemposRespuesta(f),
      this.porSede(f),
    ]);

    return {
      kpis,
      por_mes,
      por_tipo,
      por_departamento,
      por_ruta,
      heridos_fallecidos,
      por_vehiculo,
      por_hora,
      por_dia_semana,
      por_clima,
      por_area,
      por_origen,
      top_causas,
      tiempos_respuesta,
      por_sede,
    };
  },
};

export default EstadisticasService;
