import { db } from '../config/database';
import { VehiculoModel } from './vehiculo.model';
import { PilotoModel } from './piloto.model';

// ========================================
// INTERFACES
// ========================================

export interface Incidente {
  id: number;
  uuid: string;
  numero_reporte: string | null;
  origen: 'BRIGADA' | 'USUARIO_PUBLICO' | 'CENTRO_CONTROL';
  estado: 'REPORTADO' | 'EN_ATENCION' | 'REGULACION' | 'CERRADO' | 'NO_ATENDIDO';
  tipo_hecho_id: number;
  subtipo_hecho_id: number | null;
  ruta_id: number;
  km: number;
  sentido: string | null;
  referencia_ubicacion: string | null;
  latitud: number | null;
  longitud: number | null;
  unidad_id: number | null;
  brigada_id: number | null;
  fecha_hora_aviso: Date;
  fecha_hora_asignacion: Date | null;
  fecha_hora_llegada: Date | null;
  fecha_hora_estabilizacion: Date | null;
  fecha_hora_finalizacion: Date | null;
  hay_heridos: boolean;
  cantidad_heridos: number;
  hay_fallecidos: boolean;
  cantidad_fallecidos: number;
  requiere_bomberos: boolean;
  requiere_pnc: boolean;
  requiere_ambulancia: boolean;
  observaciones_iniciales: string | null;
  observaciones_finales: string | null;
  condiciones_climaticas: string | null;
  tipo_pavimento: string | null;
  iluminacion: string | null;
  senalizacion: string | null;
  visibilidad: string | null;
  causa_probable: string | null;
  reportado_por_nombre: string | null;
  reportado_por_telefono: string | null;
  reportado_por_email: string | null;
  foto_url: string | null;
  jurisdiccion: string | null;
  direccion_detallada: string | null;
  obstruccion_detalle: any | null;
  danios_infraestructura_desc: string | null;
  danios_materiales: boolean;
  danios_infraestructura: boolean;
  creado_por: number;
  actualizado_por: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface IncidenteCompleto extends Incidente {
  tipo_hecho: string;
  subtipo_hecho: string | null;
  tipo_hecho_color: string;
  tipo_hecho_icono: string;
  ruta_codigo: string;
  ruta_nombre: string;
  unidad_codigo: string | null;
  brigada_nombre: string | null;
  creado_por_nombre: string;
  vehiculos?: VehiculoIncidente[];
  obstruccion?: ObstruccionIncidente;
  recursos?: RecursoIncidente[];
  sede_id?: number; // Agregado para filtros
}

export interface VehiculoIncidente {
  id: number;
  incidente_id: number;
  tipo_vehiculo_id: number | null;
  marca_id: number | null;
  modelo: string | null;
  anio: number | null;
  color: string | null;
  placa: string | null;
  estado_piloto: string | null;
  nombre_piloto: string | null;
  licencia_piloto: string | null;
  heridos_en_vehiculo: number;
  fallecidos_en_vehiculo: number;
  danos_estimados: string | null;
  observaciones: string | null;
  tarjeta_circulacion: string | null;
  nit: string | null;
  direccion_propietario: string | null;
  nombre_propietario: string | null;
  licencia_tipo: string | null;
  licencia_numero: string | null;
  licencia_vencimiento: Date | null;
  licencia_antiguedad: number | null;
  piloto_nacimiento: Date | null;
  piloto_etnia: string | null;
  piloto_edad: number | null;
  piloto_sexo: string | null;
  cargado: boolean;
  carga_tipo: string | null;
  carga_detalle: any | null;
  contenedor: boolean;
  doble_remolque: boolean;
  contenedor_detalle: any | null;
  bus_extraurbano: boolean;
  bus_detalle: any | null;
  sancion: boolean;
  sancion_detalle: any | null;
  personas_asistidas: number;
  created_at: Date;
}

export interface ObstruccionIncidente {
  id: number;
  incidente_id: number;
  descripcion_generada: string | null;
  datos_carriles_json: any;
  created_at: Date;
  updated_at: Date;
}

export interface RecursoIncidente {
  id: number;
  incidente_id: number;
  tipo_recurso: 'GRUA' | 'BOMBEROS' | 'PNC' | 'AMBULANCIA' | 'AJUSTADOR' | 'OTRO';
  descripcion: string | null;
  hora_solicitud: Date | null;
  hora_llegada: Date | null;
  observaciones: string | null;
  created_at: Date;
}

// ========================================
// MODEL
// ========================================

export const IncidenteModel = {
  /**
   * Crear un nuevo incidente
   */
  async create(data: {
    origen: string;
    tipo_hecho_id: number;
    subtipo_hecho_id?: number;
    ruta_id: number;
    km: number;
    sentido?: string;
    referencia_ubicacion?: string;
    latitud?: number;
    longitud?: number;
    unidad_id?: number;
    brigada_id?: number;
    fecha_hora_aviso: Date;
    hay_heridos?: boolean;
    cantidad_heridos?: number;
    hay_fallecidos?: boolean;
    cantidad_fallecidos?: number;
    requiere_bomberos?: boolean;
    requiere_pnc?: boolean;
    requiere_ambulancia?: boolean;
    observaciones_iniciales?: string;
    reportado_por_nombre?: string;
    reportado_por_telefono?: string;
    jurisdiccion?: string;
    direccion_detallada?: string;
    danios_infraestructura_desc?: string;
    danios_materiales?: boolean;
    danios_infraestructura?: boolean;
    creado_por: number;
  }): Promise<Incidente> {
    const query = `
      INSERT INTO incidente (
        origen, tipo_hecho_id, subtipo_hecho_id, ruta_id, km, sentido, referencia_ubicacion,
        latitud, longitud, unidad_id, brigada_id, fecha_hora_aviso,
        hay_heridos, cantidad_heridos, hay_fallecidos, cantidad_fallecidos,
        requiere_bomberos, requiere_pnc, requiere_ambulancia,
        observaciones_iniciales, reportado_por_nombre, reportado_por_telefono,
        jurisdiccion, direccion_detallada, danios_infraestructura_desc,
        danios_materiales, danios_infraestructura,
        creado_por
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
        $23, $24, $25, $26, $27, $28
      ) RETURNING *
    `;

    return db.one(query, [
      data.origen,
      data.tipo_hecho_id,
      data.subtipo_hecho_id || null,
      data.ruta_id,
      data.km,
      data.sentido || null,
      data.referencia_ubicacion || null,
      data.latitud || null,
      data.longitud || null,
      data.unidad_id || null,
      data.brigada_id || null,
      data.fecha_hora_aviso,
      data.hay_heridos || false,
      data.cantidad_heridos || 0,
      data.hay_fallecidos || false,
      data.cantidad_fallecidos || 0,
      data.requiere_bomberos || false,
      data.requiere_pnc || false,
      data.requiere_ambulancia || false,
      data.observaciones_iniciales || null,
      data.reportado_por_nombre || null,
      data.reportado_por_telefono || null,
      data.jurisdiccion || null,
      data.direccion_detallada || null,
      data.danios_infraestructura_desc || null,
      data.danios_materiales || false,
      data.danios_infraestructura || false,
      data.creado_por,
    ]);
  },

  /**
   * Obtener incidente por ID (vista completa)
   */
  async getById(id: number): Promise<IncidenteCompleto | null> {
    return db.oneOrNone('SELECT * FROM v_incidentes_completos WHERE id = $1', [id]);
  },

  /**
   * Obtener incidente por UUID
   */
  async getByUuid(uuid: string): Promise<IncidenteCompleto | null> {
    return db.oneOrNone('SELECT * FROM v_incidentes_completos WHERE uuid = $1', [uuid]);
  },

  /**
   * Listar incidentes activos (REPORTADO, EN_ATENCION, REGULACION)
   */
  async getActivos(filters?: {
    ruta_id?: number;
    unidad_id?: number;
    sede_id?: number;
    desde?: Date;
  }): Promise<IncidenteCompleto[]> {
    let query = `
      SELECT i.*, u.sede_id
      FROM v_incidentes_completos i
      LEFT JOIN unidad u ON i.unidad_id = u.id
      WHERE i.estado IN ('REPORTADO', 'EN_ATENCION', 'REGULACION')
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.ruta_id) {
      query += ` AND i.ruta_id = $${paramIndex++}`;
      params.push(filters.ruta_id);
    }

    if (filters?.unidad_id) {
      query += ` AND i.unidad_id = $${paramIndex++}`;
      params.push(filters.unidad_id);
    }

    if (filters?.sede_id) {
      query += ` AND u.sede_id = $${paramIndex++}`;
      params.push(filters.sede_id);
    }

    if (filters?.desde) {
      query += ` AND i.fecha_hora_aviso >= $${paramIndex++}`;
      params.push(filters.desde);
    }

    query += ' ORDER BY i.fecha_hora_aviso DESC';

    return db.manyOrNone(query, params);
  },

  /**
   * Listar todos los incidentes con filtros
   */
  async getAll(filters?: {
    estado?: string;
    ruta_id?: number;
    desde?: Date;
    hasta?: Date;
    limit?: number;
    offset?: number;
  }): Promise<IncidenteCompleto[]> {
    let query = 'SELECT * FROM v_incidentes_completos WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.estado) {
      query += ` AND estado = $${paramIndex++}`;
      params.push(filters.estado);
    }

    if (filters?.ruta_id) {
      query += ` AND ruta_id = $${paramIndex++}`;
      params.push(filters.ruta_id);
    }

    if (filters?.desde) {
      query += ` AND fecha_hora_aviso >= $${paramIndex++}`;
      params.push(filters.desde);
    }

    if (filters?.hasta) {
      query += ` AND fecha_hora_aviso <= $${paramIndex++}`;
      params.push(filters.hasta);
    }

    query += ' ORDER BY fecha_hora_aviso DESC';

    if (filters?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }

    return db.manyOrNone(query, params);
  },

  /**
   * Actualizar estado del incidente
   */
  async updateEstado(
    id: number,
    estado: string,
    actualizado_por: number,
    fecha_hora?: Date
  ): Promise<Incidente> {
    let query = `
      UPDATE incidente
      SET estado = $1, actualizado_por = $2, updated_at = NOW()
    `;

    const params: any[] = [estado, actualizado_por];
    let paramIndex = 3;

    // Actualizar timestamp correspondiente según el estado
    if (estado === 'EN_ATENCION' && fecha_hora) {
      query += `, fecha_hora_llegada = $${paramIndex++}`;
      params.push(fecha_hora);
    } else if (estado === 'REGULACION' && fecha_hora) {
      query += `, fecha_hora_estabilizacion = $${paramIndex++}`;
      params.push(fecha_hora);
    } else if (estado === 'CERRADO' && fecha_hora) {
      query += `, fecha_hora_finalizacion = $${paramIndex++}`;
      params.push(fecha_hora);
    }

    query += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(id);

    return db.one(query, params);
  },

  /**
   * Actualizar campos del incidente
   */
  async update(
    id: number,
    data: Partial<Incidente>,
    actualizado_por: number
  ): Promise<Incidente> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Construir SET dinámicamente
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'uuid' && key !== 'created_at') {
        fields.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    });

    fields.push(`actualizado_por = $${paramIndex++}`);
    values.push(actualizado_por);

    fields.push(`updated_at = NOW()`);

    values.push(id); // Para el WHERE

    const query = `
      UPDATE incidente
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    return db.one(query, values);
  },

  /**
   * Agregar vehículo a un incidente (usando tablas normalizadas)
   */
  async addVehiculo(data: {
    incidente_id: number;
    tipo_vehiculo_id?: number;
    marca_id?: number;
    modelo?: string;
    anio?: number;
    color?: string;
    placa?: string;
    es_extranjero?: boolean;
    estado_piloto?: string;
    nombre_piloto?: string;
    licencia_piloto?: string;
    heridos_en_vehiculo?: number;
    fallecidos_en_vehiculo?: number;
    danos_estimados?: string;
    observaciones?: string;
    tarjeta_circulacion?: string;
    nit?: string;
    direccion_propietario?: string;
    nombre_propietario?: string;
    licencia_tipo?: string;
    licencia_numero?: string;
    licencia_vencimiento?: Date;
    licencia_antiguedad?: number;
    piloto_nacimiento?: Date;
    piloto_etnia?: string;
    piloto_edad?: number;
    piloto_sexo?: string;
    cargado?: boolean;
    carga_tipo?: string;
    carga_detalle?: any;
    contenedor?: boolean;
    doble_remolque?: boolean;
    contenedor_detalle?: any;
    bus_extraurbano?: boolean;
    bus_detalle?: any;
    sancion?: boolean;
    sancion_detalle?: any;
    personas_asistidas?: number;
    aseguradora_id?: number;
    numero_poliza?: string;
  }): Promise<VehiculoIncidente> {
    // 1. Crear/actualizar vehículo en tabla maestra
    const vehiculo = await VehiculoModel.upsert({
      placa: data.placa || '',
      tipo_vehiculo_id: data.tipo_vehiculo_id,
      marca_id: data.marca_id,
      color: data.color,
      es_extranjero: data.es_extranjero || false,
      cargado: data.cargado || false,
      tipo_carga: data.carga_tipo,
    });

    // 2. Crear/actualizar piloto en tabla maestra (si hay datos de piloto)
    let piloto_id: number | null = null;
    if (data.licencia_numero && data.nombre_piloto) {
      // Solo crear piloto si tenemos licencia_numero válida y nombre
      const piloto = await PilotoModel.upsert({
        licencia_numero: BigInt(data.licencia_numero),
        licencia_tipo: data.licencia_tipo as 'M' | 'A' | 'B' | 'C' | 'E' | undefined,
        licencia_vencimiento: data.licencia_vencimiento,
        nombre: data.nombre_piloto,
        fecha_nacimiento: data.piloto_nacimiento,
        licencia_antiguedad: data.licencia_antiguedad,
        etnia: data.piloto_etnia,
      });
      piloto_id = piloto.id;
    }

    // 3. Crear relación en incidente_vehiculo
    const query = `
      INSERT INTO incidente_vehiculo (
        incidente_id, vehiculo_id, piloto_id, estado_piloto, personas_asistidas,
        aseguradora_id, numero_poliza
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const incidenteVehiculo = await db.one(query, [
      data.incidente_id,
      vehiculo.id,
      piloto_id,
      data.estado_piloto || null,
      data.personas_asistidas || 0,
      data.aseguradora_id || null,
      data.numero_poliza || null,
    ]);

    // 4. Si hay tarjeta de circulación, agregarla
    if (data.tarjeta_circulacion) {
      await VehiculoModel.createTarjetaCirculacion({
        vehiculo_id: vehiculo.id,
        numero: BigInt(data.tarjeta_circulacion),
        nit: data.nit ? BigInt(data.nit) : null,
        direccion_propietario: data.direccion_propietario || null,
        nombre_propietario: data.nombre_propietario || null,
        modelo: data.anio || null,
      });
    }

    // 5. Si es contenedor, agregar detalles
    if (data.contenedor && data.contenedor_detalle) {
      await VehiculoModel.createContenedor({
        vehiculo_id: vehiculo.id,
        ...data.contenedor_detalle,
      });
    }

    // 6. Si es bus extraurbano, agregar detalles
    if (data.bus_extraurbano && data.bus_detalle) {
      await VehiculoModel.createBus({
        vehiculo_id: vehiculo.id,
        ...data.bus_detalle,
      });
    }

    // 7. Si hay sanción, crearla
    if (data.sancion && data.sancion_detalle) {
      await db.none(
        `INSERT INTO sancion (incidente_id, vehiculo_id, piloto_id, descripcion, monto)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          data.incidente_id,
          vehiculo.id,
          piloto_id,
          data.sancion_detalle.descripcion || null,
          data.sancion_detalle.monto || null,
        ]
      );
    }

    // Retornar en el formato antiguo para mantener compatibilidad
    return {
      id: incidenteVehiculo.id,
      incidente_id: data.incidente_id,
      tipo_vehiculo_id: data.tipo_vehiculo_id || null,
      marca_id: data.marca_id || null,
      modelo: data.modelo || null,
      anio: data.anio || null,
      color: data.color || null,
      placa: data.placa || null,
      estado_piloto: data.estado_piloto || null,
      nombre_piloto: data.nombre_piloto || null,
      licencia_piloto: data.licencia_numero || null,
      heridos_en_vehiculo: data.heridos_en_vehiculo || 0,
      fallecidos_en_vehiculo: data.fallecidos_en_vehiculo || 0,
      danos_estimados: data.danos_estimados || null,
      observaciones: data.observaciones || null,
      tarjeta_circulacion: data.tarjeta_circulacion || null,
      nit: data.nit || null,
      direccion_propietario: data.direccion_propietario || null,
      nombre_propietario: data.nombre_propietario || null,
      licencia_tipo: data.licencia_tipo || null,
      licencia_numero: data.licencia_numero || null,
      licencia_vencimiento: data.licencia_vencimiento || null,
      licencia_antiguedad: data.licencia_antiguedad || null,
      piloto_nacimiento: data.piloto_nacimiento || null,
      piloto_etnia: data.piloto_etnia || null,
      piloto_edad: data.piloto_edad || null,
      piloto_sexo: data.piloto_sexo || null,
      cargado: data.cargado || false,
      carga_tipo: data.carga_tipo || null,
      carga_detalle: data.carga_detalle || null,
      contenedor: data.contenedor || false,
      doble_remolque: data.doble_remolque || false,
      contenedor_detalle: data.contenedor_detalle || null,
      bus_extraurbano: data.bus_extraurbano || false,
      bus_detalle: data.bus_detalle || null,
      sancion: data.sancion || false,
      sancion_detalle: data.sancion_detalle || null,
      personas_asistidas: data.personas_asistidas || 0,
      created_at: incidenteVehiculo.created_at,
    } as VehiculoIncidente;
  },

  /**
   * Obtener vehículos de un incidente (desde tablas normalizadas)
   */
  async getVehiculos(incidente_id: number): Promise<VehiculoIncidente[]> {
    const query = `
      SELECT
        iv.id,
        iv.incidente_id,
        iv.estado_piloto,
        iv.personas_asistidas,
        iv.aseguradora_id,
        iv.numero_poliza,
        iv.created_at,

        -- Datos del vehículo
        v.id as vehiculo_master_id,
        v.placa,
        v.tipo_vehiculo_id,
        v.marca_id,
        v.modelo,
        v.anio,
        v.color,
        v.es_extranjero,
        v.propietario_nombre as nombre_propietario,
        v.propietario_nit as nit,
        v.propietario_direccion as direccion_propietario,
        v.cargado,
        v.carga_tipo,

        -- Datos del piloto
        p.id as piloto_master_id,
        p.licencia_numero,
        p.licencia_tipo,
        p.licencia_vencimiento,
        p.nombre as nombre_piloto,
        p.fecha_nacimiento as piloto_nacimiento,
        p.edad as piloto_edad,
        p.sexo as piloto_sexo,
        p.etnia as piloto_etnia,

        -- Tarjeta de circulación
        tc.numero_tc as tarjeta_circulacion

      FROM incidente_vehiculo iv
      INNER JOIN vehiculo v ON iv.vehiculo_id = v.id
      LEFT JOIN piloto p ON iv.piloto_id = p.id
      LEFT JOIN tarjeta_circulacion tc ON tc.vehiculo_id = v.id
      WHERE iv.incidente_id = $1
      ORDER BY iv.created_at
    `;

    const rows = await db.manyOrNone(query, [incidente_id]);

    // Transformar al formato VehiculoIncidente para mantener compatibilidad
    return rows.map((row: any) => ({
      id: row.id,
      incidente_id: row.incidente_id,
      tipo_vehiculo_id: row.tipo_vehiculo_id,
      marca_id: row.marca_id,
      modelo: row.modelo,
      anio: row.anio,
      color: row.color,
      placa: row.placa,
      estado_piloto: row.estado_piloto,
      nombre_piloto: row.nombre_piloto,
      licencia_piloto: row.licencia_numero,
      heridos_en_vehiculo: 0, // No disponible en nueva estructura
      fallecidos_en_vehiculo: 0, // No disponible en nueva estructura
      danos_estimados: null, // No disponible en nueva estructura
      observaciones: null, // No disponible en nueva estructura
      tarjeta_circulacion: row.tarjeta_circulacion,
      nit: row.nit ? row.nit.toString() : null,
      direccion_propietario: row.direccion_propietario,
      nombre_propietario: row.nombre_propietario,
      licencia_tipo: row.licencia_tipo,
      licencia_numero: row.licencia_numero,
      licencia_vencimiento: row.licencia_vencimiento,
      licencia_antiguedad: null, // No disponible en nueva estructura
      piloto_nacimiento: row.piloto_nacimiento,
      piloto_etnia: row.piloto_etnia,
      piloto_edad: row.piloto_edad,
      piloto_sexo: row.piloto_sexo,
      cargado: row.cargado,
      carga_tipo: row.carga_tipo,
      carga_detalle: null, // No disponible en nueva estructura
      contenedor: false, // Requiere consulta adicional
      doble_remolque: false, // No disponible en nueva estructura
      contenedor_detalle: null, // Requiere consulta adicional
      bus_extraurbano: false, // Requiere consulta adicional
      bus_detalle: null, // Requiere consulta adicional
      sancion: false, // Requiere consulta adicional
      sancion_detalle: null, // Requiere consulta adicional
      personas_asistidas: row.personas_asistidas,
      created_at: row.created_at,
    }));
  },

  /**
   * Agregar/actualizar información de obstrucción
   */
  async setObstruccion(data: {
    incidente_id: number;
    descripcion_generada: string;
    datos_carriles_json: any;
  }): Promise<ObstruccionIncidente> {
    const query = `
      INSERT INTO obstruccion_incidente (incidente_id, descripcion_generada, datos_carriles_json)
      VALUES ($1, $2, $3)
      ON CONFLICT (incidente_id)
      DO UPDATE SET
        descripcion_generada = EXCLUDED.descripcion_generada,
        datos_carriles_json = EXCLUDED.datos_carriles_json,
        updated_at = NOW()
      RETURNING *
    `;

    return db.one(query, [
      data.incidente_id,
      data.descripcion_generada,
      data.datos_carriles_json,
    ]);
  },

  /**
   * Obtener obstrucción de un incidente
   */
  async getObstruccion(incidente_id: number): Promise<ObstruccionIncidente | null> {
    return db.oneOrNone(
      'SELECT * FROM obstruccion_incidente WHERE incidente_id = $1',
      [incidente_id]
    );
  },

  /**
   * Agregar recurso solicitado
   */
  async addRecurso(data: {
    incidente_id: number;
    tipo_recurso: string;
    descripcion?: string;
    hora_solicitud?: Date;
    hora_llegada?: Date;
    observaciones?: string;
  }): Promise<RecursoIncidente> {
    const query = `
      INSERT INTO recurso_incidente (
        incidente_id, tipo_recurso, descripcion, hora_solicitud, hora_llegada, observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    return db.one(query, [
      data.incidente_id,
      data.tipo_recurso,
      data.descripcion || null,
      data.hora_solicitud || null,
      data.hora_llegada || null,
      data.observaciones || null,
    ]);
  },

  /**
   * Obtener recursos de un incidente
   */
  async getRecursos(incidente_id: number): Promise<RecursoIncidente[]> {
    return db.manyOrNone(
      'SELECT * FROM recurso_incidente WHERE incidente_id = $1 ORDER BY created_at',
      [incidente_id]
    );
  },

  /**
   * Cerrar incidente
   */
  async cerrar(
    id: number,
    data: {
      observaciones_finales?: string;
      condiciones_climaticas?: string;
      causa_probable?: string;
      actualizado_por: number;
    }
  ): Promise<Incidente> {
    const query = `
      UPDATE incidente
      SET
        estado = 'CERRADO',
        fecha_hora_finalizacion = NOW(),
        observaciones_finales = $1,
        condiciones_climaticas = $2,
        causa_probable = $3,
        actualizado_por = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;

    return db.one(query, [
      data.observaciones_finales || null,
      data.condiciones_climaticas || null,
      data.causa_probable || null,
      data.actualizado_por,
      id,
    ]);
  },

  /**
   * Generar número de reporte automático
   */
  async generateNumeroReporte(year?: number): Promise<string> {
    const currentYear = year || new Date().getFullYear();
    const result = await db.one(
      `SELECT COALESCE(MAX(
        CAST(SUBSTRING(numero_reporte FROM 'INC-${currentYear}-(\\d+)') AS INT)
      ), 0) + 1 AS next_number
      FROM incidente
      WHERE numero_reporte LIKE 'INC-${currentYear}-%'`
    );

    const nextNumber = String(result.next_number).padStart(4, '0');
    return `INC-${currentYear}-${nextNumber}`;
  },
};
