import { db } from '../config/database';

// ============================================
// INTERFACES
// ============================================

export interface HojaAccidentologia {
  id?: number;
  situacion_id: number;
  incidente_id?: number; // Relación 1:1 con incidente
  tipo_accidente: string;
  descripcion_accidente?: string;
  condiciones_climaticas?: string;
  condiciones_via?: string;
  iluminacion?: string;
  visibilidad?: string;
  kilometro?: number;
  referencia_ubicacion?: string;
  sentido_via?: string;
  tipo_zona?: string;
  causa_principal?: string;
  causas_contribuyentes?: string[];
  pnc_presente?: boolean;
  pnc_agente?: string;
  bomberos_presente?: boolean;
  bomberos_unidad?: string;
  mp_presente?: boolean;
  mp_fiscal?: string;
  otras_autoridades?: string;
  requiere_peritaje?: boolean;
  numero_caso_pnc?: string;
  numero_caso_mp?: string;
  elaborado_por?: number;
  revisado_por?: number;
  estado?: string;
  // Nuevos campos boleta (migración 094)
  area?: string;
  material_via?: string;
  no_grupo_operativo?: string;
  // Campos de vía (migración 091)
  estado_via_id?: number;
  topografia_id?: number;
  geometria_via_id?: number;
  numero_carriles?: number;
}

export interface VehiculoAccidente {
  id?: number;
  hoja_accidentologia_id: number;
  numero_vehiculo: number;
  tipo_vehiculo: string;
  placa?: string;
  marca?: string;
  linea?: string;
  modelo_anio?: number;
  color?: string;
  numero_chasis?: string;
  numero_motor?: string;
  danos_descripcion?: string;
  danos_estimados?: number;
  posicion_final?: string;
  propietario_nombre?: string;
  propietario_dpi?: string;
  propietario_telefono?: string;
  propietario_direccion?: string;
  conductor_nombre?: string;
  conductor_dpi?: string;
  conductor_licencia_tipo?: string;
  conductor_licencia_numero?: string;
  conductor_telefono?: string;
  conductor_direccion?: string;
  conductor_estado?: string;
  tiene_seguro?: boolean;
  aseguradora?: string;
  numero_poliza?: string;
  fotos?: string[];
  // Nuevos campos documentos consignados (migración 094)
  doc_consignado_licencia?: boolean;
  doc_consignado_tarjeta?: boolean;
  doc_consignado_tarjeta_circulacion?: boolean;
  doc_consignado_licencia_transporte?: boolean;
  doc_consignado_tarjeta_operaciones?: boolean;
  doc_consignado_poliza?: boolean;
  doc_consignado_por?: string;
  tipo_servicio?: string;
}

export interface PersonaAccidente {
  id?: number;
  hoja_accidentologia_id: number;
  vehiculo_accidente_id?: number;
  tipo_persona: string;
  nombre_completo?: string;
  dpi?: string;
  edad?: number;
  genero?: string;
  telefono?: string;
  direccion?: string;
  estado: string;
  tipo_lesion?: string;
  descripcion_lesiones?: string;
  requirio_atencion?: boolean;
  hospital_trasladado?: string;
  ambulancia_unidad?: string;
  hora_traslado?: string;
  hora_fallecimiento?: string;
  lugar_fallecimiento?: string;
}

// ============================================
// MODELO DE ACCIDENTOLOGÍA
// ============================================

export const AccidentologiaModel = {
  /**
   * Crear hoja de accidentología
   */
  async crear(data: HojaAccidentologia): Promise<number> {
    const result = await db.one(`
      INSERT INTO hoja_accidentologia (
        situacion_id, incidente_id, tipo_accidente, descripcion_accidente,
        condiciones_climaticas, condiciones_via, iluminacion, visibilidad,
        kilometro, referencia_ubicacion, sentido_via, tipo_zona,
        causa_principal, causas_contribuyentes,
        pnc_presente, pnc_agente, bomberos_presente, bomberos_unidad,
        mp_presente, mp_fiscal, otras_autoridades,
        requiere_peritaje, numero_caso_pnc, numero_caso_mp,
        elaborado_por, estado,
        area, material_via, no_grupo_operativo,
        estado_via_id, topografia_id, geometria_via_id, numero_carriles
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
        $27, $28, $29, $30, $31, $32, $33
      ) RETURNING id
    `, [
      data.situacion_id, data.incidente_id, data.tipo_accidente, data.descripcion_accidente,
      data.condiciones_climaticas, data.condiciones_via, data.iluminacion, data.visibilidad,
      data.kilometro, data.referencia_ubicacion, data.sentido_via, data.tipo_zona,
      data.causa_principal, data.causas_contribuyentes,
      data.pnc_presente || false, data.pnc_agente, data.bomberos_presente || false, data.bomberos_unidad,
      data.mp_presente || false, data.mp_fiscal, data.otras_autoridades,
      data.requiere_peritaje || false, data.numero_caso_pnc, data.numero_caso_mp,
      data.elaborado_por, data.estado || 'BORRADOR',
      data.area, data.material_via, data.no_grupo_operativo,
      data.estado_via_id, data.topografia_id, data.geometria_via_id, data.numero_carriles
    ]);
    return result.id;
  },

  /**
   * Actualizar hoja de accidentología
   */
  async actualizar(id: number, data: Partial<HojaAccidentologia>): Promise<void> {
    const campos: string[] = [];
    const valores: any[] = [];
    let idx = 1;

    const camposPermitidos = [
      'tipo_accidente', 'descripcion_accidente', 'condiciones_climaticas',
      'condiciones_via', 'iluminacion', 'visibilidad', 'kilometro',
      'referencia_ubicacion', 'sentido_via', 'tipo_zona', 'causa_principal',
      'causas_contribuyentes', 'pnc_presente', 'pnc_agente', 'bomberos_presente',
      'bomberos_unidad', 'mp_presente', 'mp_fiscal', 'otras_autoridades',
      'requiere_peritaje', 'numero_caso_pnc', 'numero_caso_mp', 'revisado_por', 'estado',
      // Nuevos campos boleta
      'area', 'material_via', 'no_grupo_operativo',
      'estado_via_id', 'topografia_id', 'geometria_via_id', 'numero_carriles',
      'incidente_id'
    ];

    for (const campo of camposPermitidos) {
      if (data[campo as keyof HojaAccidentologia] !== undefined) {
        campos.push(`${campo} = $${idx}`);
        valores.push(data[campo as keyof HojaAccidentologia]);
        idx++;
      }
    }

    if (campos.length === 0) return;

    campos.push('updated_at = NOW()');
    valores.push(id);

    await db.none(`
      UPDATE hoja_accidentologia
      SET ${campos.join(', ')}
      WHERE id = $${idx}
    `, valores);
  },

  /**
   * Obtener hoja por ID
   */
  async obtenerPorId(id: number): Promise<any> {
    return db.oneOrNone(`
      SELECT ha.*,
             s.numero_situacion, s.tipo_situacion, s.descripcion AS situacion_descripcion,
             m.nombre AS municipio, d.nombre AS departamento,
             u.nombre_completo AS elaborado_por_nombre,
             ur.nombre_completo AS revisado_por_nombre
      FROM hoja_accidentologia ha
      JOIN situacion s ON ha.situacion_id = s.id
      LEFT JOIN municipio m ON s.municipio_id = m.id
      LEFT JOIN departamento d ON m.departamento_id = d.id
      LEFT JOIN usuario u ON ha.elaborado_por = u.id
      LEFT JOIN usuario ur ON ha.revisado_por = ur.id
      WHERE ha.id = $1
    `, [id]);
  },

  /**
   * Obtener hoja por situación
   */
  async obtenerPorSituacion(situacionId: number): Promise<any> {
    return db.oneOrNone(`
      SELECT * FROM hoja_accidentologia WHERE situacion_id = $1
    `, [situacionId]);
  },

  /**
   * Listar hojas con filtros
   */
  async listar(filtros: {
    sede_id?: number;
    tipo_accidente?: string;
    estado?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let query = `
      SELECT * FROM v_resumen_accidentologia
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (filtros.tipo_accidente) {
      query += ` AND tipo_accidente = $${idx}`;
      params.push(filtros.tipo_accidente);
      idx++;
    }

    if (filtros.estado) {
      query += ` AND estado = $${idx}`;
      params.push(filtros.estado);
      idx++;
    }

    if (filtros.fecha_desde) {
      query += ` AND created_at >= $${idx}`;
      params.push(filtros.fecha_desde);
      idx++;
    }

    if (filtros.fecha_hasta) {
      query += ` AND created_at <= $${idx}`;
      params.push(filtros.fecha_hasta);
      idx++;
    }

    query += ` ORDER BY created_at DESC`;
    query += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(filtros.limit || 50, filtros.offset || 0);

    return db.any(query, params);
  },

  /**
   * Cambiar estado de la hoja
   */
  async cambiarEstado(id: number, estado: string, revisadoPor?: number): Promise<void> {
    await db.none(`
      UPDATE hoja_accidentologia
      SET estado = $1, revisado_por = $2, updated_at = NOW()
      WHERE id = $3
    `, [estado, revisadoPor, id]);
  },

  // ============================================
  // VEHÍCULOS
  // ============================================

  /**
   * Agregar vehículo a la hoja
   */
  async agregarVehiculo(data: VehiculoAccidente): Promise<number> {
    const result = await db.one(`
      INSERT INTO vehiculo_accidente (
        hoja_accidentologia_id, numero_vehiculo, tipo_vehiculo,
        placa, marca, linea, modelo_anio, color, numero_chasis, numero_motor,
        danos_descripcion, danos_estimados, posicion_final,
        propietario_nombre, propietario_dpi, propietario_telefono, propietario_direccion,
        conductor_nombre, conductor_dpi, conductor_licencia_tipo, conductor_licencia_numero,
        conductor_telefono, conductor_direccion, conductor_estado,
        tiene_seguro, aseguradora, numero_poliza, fotos,
        doc_consignado_licencia, doc_consignado_tarjeta, doc_consignado_tarjeta_circulacion,
        doc_consignado_licencia_transporte, doc_consignado_tarjeta_operaciones, doc_consignado_poliza,
        doc_consignado_por, tipo_servicio
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, 
        $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36
      ) RETURNING id
    `, [
      data.hoja_accidentologia_id, data.numero_vehiculo, data.tipo_vehiculo,
      data.placa, data.marca, data.linea, data.modelo_anio, data.color,
      data.numero_chasis, data.numero_motor, data.danos_descripcion,
      data.danos_estimados, data.posicion_final, data.propietario_nombre,
      data.propietario_dpi, data.propietario_telefono, data.propietario_direccion,
      data.conductor_nombre, data.conductor_dpi, data.conductor_licencia_tipo,
      data.conductor_licencia_numero, data.conductor_telefono, data.conductor_direccion,
      data.conductor_estado, data.tiene_seguro || false, data.aseguradora,
      data.numero_poliza, data.fotos || [],
      data.doc_consignado_licencia || false, data.doc_consignado_tarjeta || false,
      data.doc_consignado_tarjeta_circulacion || false, data.doc_consignado_licencia_transporte || false,
      data.doc_consignado_tarjeta_operaciones || false, data.doc_consignado_poliza || false,
      data.doc_consignado_por, data.tipo_servicio
    ]);
    return result.id;
  },

  /**
   * Actualizar vehículo
   */
  async actualizarVehiculo(id: number, data: Partial<VehiculoAccidente>): Promise<void> {
    const campos: string[] = [];
    const valores: any[] = [];
    let idx = 1;

    const camposPermitidos = [
      'tipo_vehiculo', 'placa', 'marca', 'linea', 'modelo_anio', 'color',
      'numero_chasis', 'numero_motor', 'danos_descripcion', 'danos_estimados',
      'posicion_final', 'propietario_nombre', 'propietario_dpi', 'propietario_telefono',
      'propietario_direccion', 'conductor_nombre', 'conductor_dpi', 'conductor_licencia_tipo',
      'conductor_licencia_numero', 'conductor_telefono', 'conductor_direccion',
      'conductor_estado', 'tiene_seguro', 'aseguradora', 'numero_poliza', 'fotos',
      // Nuevos campos documentos consignados
      'doc_consignado_licencia', 'doc_consignado_tarjeta', 'doc_consignado_tarjeta_circulacion',
      'doc_consignado_licencia_transporte', 'doc_consignado_tarjeta_operaciones', 'doc_consignado_poliza',
      'doc_consignado_por', 'tipo_servicio'
    ];

    for (const campo of camposPermitidos) {
      if (data[campo as keyof VehiculoAccidente] !== undefined) {
        campos.push(`${campo} = $${idx}`);
        valores.push(data[campo as keyof VehiculoAccidente]);
        idx++;
      }
    }

    if (campos.length === 0) return;

    valores.push(id);
    await db.none(`
      UPDATE vehiculo_accidente SET ${campos.join(', ')} WHERE id = $${idx}
    `, valores);
  },

  /**
   * Obtener vehículos de una hoja
   */
  async obtenerVehiculos(hojaId: number): Promise<any[]> {
    return db.any(`
      SELECT * FROM vehiculo_accidente
      WHERE hoja_accidentologia_id = $1
      ORDER BY numero_vehiculo
    `, [hojaId]);
  },

  /**
   * Eliminar vehículo
   */
  async eliminarVehiculo(id: number): Promise<void> {
    await db.none('DELETE FROM vehiculo_accidente WHERE id = $1', [id]);
  },

  // ============================================
  // PERSONAS
  // ============================================

  /**
   * Agregar persona afectada
   */
  async agregarPersona(data: PersonaAccidente): Promise<number> {
    const result = await db.one(`
      INSERT INTO persona_accidente (
        hoja_accidentologia_id, vehiculo_accidente_id, tipo_persona,
        nombre_completo, dpi, edad, genero, telefono, direccion,
        estado, tipo_lesion, descripcion_lesiones,
        requirio_atencion, hospital_trasladado, ambulancia_unidad, hora_traslado,
        hora_fallecimiento, lugar_fallecimiento
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING id
    `, [
      data.hoja_accidentologia_id, data.vehiculo_accidente_id, data.tipo_persona,
      data.nombre_completo, data.dpi, data.edad, data.genero, data.telefono, data.direccion,
      data.estado, data.tipo_lesion, data.descripcion_lesiones,
      data.requirio_atencion || false, data.hospital_trasladado, data.ambulancia_unidad,
      data.hora_traslado, data.hora_fallecimiento, data.lugar_fallecimiento
    ]);
    return result.id;
  },

  /**
   * Actualizar persona
   */
  async actualizarPersona(id: number, data: Partial<PersonaAccidente>): Promise<void> {
    const campos: string[] = [];
    const valores: any[] = [];
    let idx = 1;

    const camposPermitidos = [
      'vehiculo_accidente_id', 'tipo_persona', 'nombre_completo', 'dpi', 'edad',
      'genero', 'telefono', 'direccion', 'estado', 'tipo_lesion', 'descripcion_lesiones',
      'requirio_atencion', 'hospital_trasladado', 'ambulancia_unidad', 'hora_traslado',
      'hora_fallecimiento', 'lugar_fallecimiento'
    ];

    for (const campo of camposPermitidos) {
      if (data[campo as keyof PersonaAccidente] !== undefined) {
        campos.push(`${campo} = $${idx}`);
        valores.push(data[campo as keyof PersonaAccidente]);
        idx++;
      }
    }

    if (campos.length === 0) return;

    valores.push(id);
    await db.none(`
      UPDATE persona_accidente SET ${campos.join(', ')} WHERE id = $${idx}
    `, valores);
  },

  /**
   * Obtener personas de una hoja
   */
  async obtenerPersonas(hojaId: number): Promise<any[]> {
    return db.any(`
      SELECT pa.*, va.numero_vehiculo, va.tipo_vehiculo, va.placa
      FROM persona_accidente pa
      LEFT JOIN vehiculo_accidente va ON pa.vehiculo_accidente_id = va.id
      WHERE pa.hoja_accidentologia_id = $1
      ORDER BY pa.estado DESC, pa.id
    `, [hojaId]);
  },

  /**
   * Eliminar persona
   */
  async eliminarPersona(id: number): Promise<void> {
    await db.none('DELETE FROM persona_accidente WHERE id = $1', [id]);
  },

  /**
   * Obtener hoja completa con vehículos y personas
   */
  async obtenerHojaCompleta(id: number): Promise<any> {
    const hoja = await this.obtenerPorId(id);
    if (!hoja) return null;

    const vehiculos = await this.obtenerVehiculos(id);
    const personas = await this.obtenerPersonas(id);

    return {
      ...hoja,
      vehiculos,
      personas
    };
  },

  /**
   * Estadísticas de accidentología
   */
  async obtenerEstadisticas(filtros: {
    fecha_desde?: string;
    fecha_hasta?: string;
    sede_id?: number;
  }): Promise<any> {
    let whereClause = '1=1';
    const params: any[] = [];
    let idx = 1;

    if (filtros.fecha_desde) {
      whereClause += ` AND ha.created_at >= $${idx}`;
      params.push(filtros.fecha_desde);
      idx++;
    }

    if (filtros.fecha_hasta) {
      whereClause += ` AND ha.created_at <= $${idx}`;
      params.push(filtros.fecha_hasta);
      idx++;
    }

    const result = await db.one(`
      SELECT
        COUNT(*) AS total_accidentes,
        COUNT(*) FILTER (WHERE ha.tipo_accidente = 'COLISION_FRONTAL') AS colisiones_frontales,
        COUNT(*) FILTER (WHERE ha.tipo_accidente = 'COLISION_LATERAL') AS colisiones_laterales,
        COUNT(*) FILTER (WHERE ha.tipo_accidente = 'VOLCADURA') AS volcaduras,
        COUNT(*) FILTER (WHERE ha.tipo_accidente = 'ATROPELLO') AS atropellos,
        (SELECT COUNT(*) FROM persona_accidente pa
         JOIN hoja_accidentologia h ON pa.hoja_accidentologia_id = h.id
         WHERE ${whereClause.replace(/ha\./g, 'h.')} AND pa.estado = 'FALLECIDO') AS total_fallecidos,
        (SELECT COUNT(*) FROM persona_accidente pa
         JOIN hoja_accidentologia h ON pa.hoja_accidentologia_id = h.id
         WHERE ${whereClause.replace(/ha\./g, 'h.')} AND pa.estado IN ('HERIDO_LEVE', 'HERIDO_MODERADO', 'HERIDO_GRAVE')) AS total_heridos,
        (SELECT COUNT(*) FROM vehiculo_accidente va
         JOIN hoja_accidentologia h ON va.hoja_accidentologia_id = h.id
         WHERE ${whereClause.replace(/ha\./g, 'h.')}) AS total_vehiculos
      FROM hoja_accidentologia ha
      WHERE ${whereClause}
    `, params);

    return result;
  },

  /**
   * Obtener datos completos para PDF/reportes usando la vista v_accidentologia_completa
   */
  async obtenerCompleto(incidenteId: number): Promise<any> {
    const data = await db.oneOrNone(`
      SELECT * FROM v_accidentologia_completa WHERE incidente_id = $1
    `, [incidenteId]);

    if (!data) return null;

    // Obtener vehículos del incidente
    const vehiculos = await db.any(`
      SELECT va.*,
             tv.nombre AS tipo_vehiculo_nombre,
             m.nombre AS marca_nombre
      FROM vehiculo_accidente va
      LEFT JOIN tipo_vehiculo tv ON va.tipo_vehiculo_id = tv.id
      LEFT JOIN marca_vehiculo m ON va.marca_id = m.id
      WHERE va.hoja_accidentologia_id = $1
      ORDER BY va.numero_vehiculo
    `, [data.hoja_id]);

    // Obtener personas del incidente
    const personas = await db.any(`
      SELECT pa.*
      FROM persona_accidente pa
      WHERE pa.hoja_accidentologia_id = $1
      ORDER BY pa.id
    `, [data.hoja_id]);

    // Obtener causas del incidente
    const causas = await db.any(`
      SELECT ic.*, cc.nombre AS causa_nombre, cc.codigo AS causa_codigo
      FROM incidente_causa ic
      JOIN catalogo_causa cc ON ic.causa_id = cc.id
      WHERE ic.incidente_id = $1
    `, [incidenteId]);

    return {
      ...data,
      vehiculos,
      personas,
      causas
    };
  },

  /**
   * Obtener por incidente_id (relación 1:1)
   */
  async obtenerPorIncidente(incidenteId: number): Promise<any> {
    return db.oneOrNone(`
      SELECT * FROM hoja_accidentologia WHERE incidente_id = $1
    `, [incidenteId]);
  }
};

export default AccidentologiaModel;
