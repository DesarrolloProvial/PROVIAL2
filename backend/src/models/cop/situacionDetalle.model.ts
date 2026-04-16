import { db } from '../../config/database';
import { VehiculoModel } from '../common/vehiculo.model';
import { PilotoModel } from '../common/piloto.model';

// ========================================
// INTERFACES
// ========================================

export interface SituacionVehiculo {
  id: number;
  situacion_id: number;
  vehiculo_id: number;
  piloto_id: number | null;
  estado_piloto: string | null;
  numero_poliza: string | null;
  personas_asistidas: number;
  heridos_en_vehiculo: number;
  fallecidos_en_vehiculo: number;
  danos_estimados: string | null;
  observaciones: string | null;
  sancion: boolean;
  sancion_detalle: any | null;
  documentos_consignados: any | null;
  created_at: Date;
}

export interface Autoridad {
  id: number;
  situacion_id: number;
  tipo: string;
  hora_llegada: Date | null;
  hora_salida: Date | null;
  datos: any;
  created_at: Date;
}

export interface VehiculoGrua {
  id: number;
  situacion_vehiculo_id: number;
  grua_id: number;
  datos: any;
  created_at: Date;
}

export interface VehiculoAjustador {
  id: number;
  situacion_vehiculo_id: number;
  aseguradora_id: number | null;
  datos: any;
  created_at: Date;
}

export interface SituacionDetallesCompletos {
  vehiculos: any[];
  autoridades: Autoridad[];
  gruas: any[];
  ajustadores: any[];
}

// ========================================
// MODEL
// ========================================

export const SituacionDetalleModel = {

  // ==========================================
  // VEHICULOS (junction situacion <-> vehiculo master)
  // ==========================================

  /**
   * Agregar vehiculo a situacion.
   * Upsert vehiculo master por placa -> upsert piloto master por licencia -> crear junction.
   * @param conn  Conexión activa (db o task de transacción). Los upserts de tablas master
   *              siempre usan `db` (son idempotentes). Solo el INSERT de la junction y sus
   *              hijos usan `conn` para participar en la transacción del llamador.
   */
  async addVehiculo(situacionId: number, data: any, conn: any = db): Promise<SituacionVehiculo> {
    // Resolver tipo_vehiculo_id desde nombre si no viene como ID
    let tipoVehiculoId = data.tipo_vehiculo_id || null;
    if (!tipoVehiculoId && data.tipo_vehiculo) {
      const tv = await db.oneOrNone(
        'SELECT id FROM tipo_vehiculo WHERE LOWER(nombre) = LOWER($1)',
        [data.tipo_vehiculo]
      );
      if (tv) tipoVehiculoId = tv.id;
    }

    let marcaId = data.marca_id || null;
    if (!marcaId && data.marca) {
      const mv = await db.oneOrNone(
        'SELECT id FROM marca_vehiculo WHERE LOWER(nombre) = LOWER($1)',
        [data.marca]
      );
      if (mv) marcaId = mv.id;
    }

    // Upsert vehiculo en tabla maestra (por placa) — usa db porque es master idempotente
    const vehiculo = await VehiculoModel.upsert({
      placa: data.placa || '',
      tipo_vehiculo_id: tipoVehiculoId,
      marca_id: marcaId,
      color: data.color,
      es_extranjero: data.es_extranjero || data.placa_extranjera || false,
      cargado: data.cargado || false,
      tipo_carga: data.carga_tipo || data.tipo_carga,
    });

    // Upsert piloto en tabla maestra (por licencia_numero) — usa db
    let piloto_id: number | null = null;
    const nombrePiloto = data.piloto_nombre || data.nombre_piloto;
    if (data.licencia_numero && nombrePiloto) {
      const piloto = await PilotoModel.upsert({
        licencia_numero: BigInt(data.licencia_numero),
        licencia_tipo: data.licencia_tipo as 'M' | 'A' | 'B' | 'C' | 'E' | undefined,
        licencia_vencimiento: data.licencia_vencimiento,
        nombre: nombrePiloto,
        fecha_nacimiento: data.piloto_nacimiento || data.fecha_nacimiento_piloto,
        licencia_antiguedad: data.licencia_antiguedad,
        etnia: data.piloto_etnia || data.etnia_piloto,
        sexo: data.sexo_piloto,
      });
      piloto_id = piloto.id;
    }

    const datos_piloto = data.datos_piloto || null;

    // INSERT junction situacion_vehiculo — usa conn (participa en la transacción del llamador)
    let result: any;
    try {
      result = await conn.one(
        `INSERT INTO situacion_vehiculo (
          situacion_id, vehiculo_id, piloto_id,
          estado_piloto, numero_poliza, personas_asistidas,
          heridos_en_vehiculo, fallecidos_en_vehiculo,
          danos_estimados, observaciones,
          sancion, sancion_detalle, documentos_consignados,
          datos_piloto, custodia_estado, custodia_datos,
          edad_conductor, trasladados_en_vehiculo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *`,
        [
          situacionId,
          vehiculo.id,
          piloto_id,
          data.estado_piloto || null,
          data.numero_poliza || null,
          data.personas_asistidas || 0,
          data.heridos_en_vehiculo || 0,
          data.fallecidos_en_vehiculo || 0,
          data.danos_estimados || null,
          data.observaciones || null,
          data.sancion || false,
          data.sancion_detalle || null,
          data.documentos_consignados || null,
          datos_piloto ? JSON.stringify(datos_piloto) : null,
          data.custodia_estado || null,
          data.custodia_datos ? JSON.stringify(data.custodia_datos) : null,
          data.edad_conductor ?? null,
          data.trasladados_en_vehiculo ?? 0,
        ]
      );
    } catch (insertErr: any) {
      // Fallback: columns datos_piloto/custodia_* may not exist (migration 113 not run)
      if (insertErr.message?.includes('datos_piloto') || insertErr.message?.includes('custodia_')) {
        result = await conn.one(
          `INSERT INTO situacion_vehiculo (
            situacion_id, vehiculo_id, piloto_id,
            estado_piloto, numero_poliza, personas_asistidas,
            heridos_en_vehiculo, fallecidos_en_vehiculo,
            danos_estimados, observaciones,
            sancion, sancion_detalle, documentos_consignados
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *`,
          [
            situacionId,
            vehiculo.id,
            piloto_id,
            data.estado_piloto || null,
            data.numero_poliza || null,
            data.personas_asistidas || 0,
            data.heridos_en_vehiculo || 0,
            data.fallecidos_en_vehiculo || 0,
            data.danos_estimados || null,
            data.observaciones || null,
            data.sancion || false,
            data.sancion_detalle || null,
            data.documentos_consignados || null,
          ]
        );
      } else {
        throw insertErr;
      }
    }

    // Tarjeta de circulacion (FK a vehiculo master, idempotente)
    if (data.tarjeta_circulacion) {
      try {
        await VehiculoModel.createTarjetaCirculacion({
          vehiculo_id: vehiculo.id,
          numero: BigInt(data.tarjeta_circulacion),
          nit: data.nit ? BigInt(data.nit) : null,
          direccion_propietario: data.direccion_propietario || null,
          nombre_propietario: data.nombre_propietario || null,
          modelo: data.modelo || data.anio || null,
        });
      } catch { /* ya existe — ignorar */ }
    }

    // Detalles adicionales del vehiculo master
    if (data.contenedor && data.contenedor_detalle) {
      await VehiculoModel.createContenedor({ vehiculo_id: vehiculo.id, ...data.contenedor_detalle });
    }
    if (data.bus_extraurbano && data.bus_detalle) {
      await VehiculoModel.createBus({ vehiculo_id: vehiculo.id, ...data.bus_detalle });
    }

    // Gruas y ajustadores inline — pasan conn para quedar en la misma transacción
    if (data.gruas && Array.isArray(data.gruas)) {
      for (const g of data.gruas) {
        await this.addGrua(result.id, g, conn);
      }
    }
    if (data.ajustadores && Array.isArray(data.ajustadores)) {
      for (const a of data.ajustadores) {
        await this.addAjustador(result.id, a, conn);
      }
    }

    // Personas (acompañantes / peatones)
    if (data.personas && Array.isArray(data.personas) && data.personas.length > 0) {
      try {
        await conn.none(
          `UPDATE situacion_vehiculo
           SET datos_piloto = COALESCE(datos_piloto, '{}'::jsonb) || jsonb_build_object('personas', $2::jsonb)
           WHERE id = $1`,
          [result.id, JSON.stringify(data.personas)]
        );
      } catch (e) {
        console.warn('Error guardando personas en situacion_vehiculo:', e);
      }
    }

    // Dispositivos de seguridad
    if (data.dispositivos && Array.isArray(data.dispositivos)) {
      await this.addDispositivos(result.id, data.dispositivos, conn);
    }

    return result;
  },

  async addPersona(situacionId: number, situacionVehiculoId: number, data: any): Promise<any> {
    return db.one(
      `INSERT INTO persona_accidente (
        situacion_id, situacion_vehiculo_id, nombre, dpi, edad, genero,
        tipo_persona, estado, hospital_traslado, descripcion_lesiones, datos_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        situacionId, situacionVehiculoId,
        data.nombre || null, data.dpi || null, data.edad || null, data.genero || null,
        data.tipo_persona || 'ACOMPANANTE', data.estado || 'ILESO',
        data.hospital_traslado || null, data.descripcion_lesiones || null,
        data.datos_json ? JSON.stringify(data.datos_json) : null,
      ]
    );
  },

  async addDispositivos(
    situacionVehiculoId: number,
    dispositivos: { id: number; estado: string }[],
    conn: any = db
  ): Promise<void> {
    try {
      for (const d of dispositivos) {
        await conn.none(
          `INSERT INTO situacion_vehiculo_dispositivo (situacion_vehiculo_id, dispositivo_seguridad_id, estado)
           VALUES ($1, $2, $3)
           ON CONFLICT (situacion_vehiculo_id, dispositivo_seguridad_id) DO UPDATE SET estado = $3`,
          [situacionVehiculoId, d.id, d.estado || 'FUNCIONANDO']
        );
      }
    } catch (e) {
      console.warn('addDispositivos failed (table may not exist):', e);
    }
  },

  async getVehiculos(situacionId: number): Promise<any[]> {
    return db.manyOrNone(`
      SELECT
        sv.id, sv.situacion_id, sv.estado_piloto, sv.numero_poliza,
        sv.personas_asistidas, sv.heridos_en_vehiculo, sv.fallecidos_en_vehiculo,
        sv.danos_estimados, sv.observaciones, sv.sancion, sv.sancion_detalle,
        sv.documentos_consignados, sv.custodia_estado, sv.custodia_datos, sv.created_at,
        v.id as vehiculo_id, v.placa, v.tipo_vehiculo_id, v.marca_id,
        v.color, v.es_extranjero, v.cargado, v.tipo_carga,
        tv.nombre as tipo_vehiculo_nombre,
        mv.nombre as marca_nombre,
        p.id as piloto_id, p.nombre as nombre_piloto,
        p.licencia_numero, p.licencia_tipo, p.licencia_vencimiento,
        p.licencia_antiguedad, p.fecha_nacimiento as piloto_nacimiento,
        p.etnia as piloto_etnia, p.sexo as sexo_piloto,
        tc.numero as tarjeta_circulacion, tc.nit, tc.nombre_propietario,
        tc.direccion_propietario, tc.modelo,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', vg.id, 'grua_id', vg.grua_id, 'datos', vg.datos,
            'grua_placa', g.placa, 'grua_nombre', g.nombre,
            'grua_empresa', g.empresa, 'grua_tipo', g.tipo_grua
          ) ORDER BY vg.created_at)
          FROM vehiculo_grua vg INNER JOIN grua g ON vg.grua_id = g.id
          WHERE vg.situacion_vehiculo_id = sv.id),
          '[]'
        ) as gruas,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', va.id, 'aseguradora_id', va.aseguradora_id, 'datos', va.datos,
            'aseguradora_nombre', a.nombre, 'aseguradora_empresa', a.empresa
          ) ORDER BY va.created_at)
          FROM vehiculo_aseguradora va LEFT JOIN aseguradora a ON va.aseguradora_id = a.id
          WHERE va.situacion_vehiculo_id = sv.id),
          '[]'
        ) as ajustadores
      FROM situacion_vehiculo sv
      INNER JOIN vehiculo v ON sv.vehiculo_id = v.id
      LEFT JOIN tipo_vehiculo tv ON v.tipo_vehiculo_id = tv.id
      LEFT JOIN marca_vehiculo mv ON v.marca_id = mv.id
      LEFT JOIN piloto p ON sv.piloto_id = p.id
      LEFT JOIN LATERAL (
        SELECT * FROM tarjeta_circulacion WHERE vehiculo_id = v.id ORDER BY fecha_registro DESC LIMIT 1
      ) tc ON true
      WHERE sv.situacion_id = $1
      ORDER BY sv.created_at
    `, [situacionId]);
  },

  async deleteVehiculo(id: number): Promise<void> {
    await db.none('DELETE FROM situacion_vehiculo WHERE id = $1', [id]);
  },

  // ==========================================
  // GRUAS (junction situacion_vehiculo <-> grua master)
  // ==========================================

  async addGrua(situacionVehiculoId: number, data: any, conn: any = db): Promise<VehiculoGrua> {
    // Upsert grua en tabla maestra — usa db (idempotente)
    const grua = await db.one(
      `INSERT INTO grua (nombre, placa, telefono, empresa, tipo_grua, rango_km, tipos_vehiculo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (placa) DO UPDATE SET
         nombre    = COALESCE(EXCLUDED.nombre,    grua.nombre),
         telefono  = COALESCE(EXCLUDED.telefono,  grua.telefono),
         empresa   = COALESCE(EXCLUDED.empresa,   grua.empresa),
         tipo_grua = COALESCE(EXCLUDED.tipo_grua, grua.tipo_grua),
         updated_at = NOW()
       RETURNING id`,
      [
        data.nombre || data.piloto || null,
        data.placa || '',
        data.telefono || null,
        data.empresa || null,
        data.tipo_grua || data.tipo || null,
        data.rango_km || null,
        data.tipos_vehiculo || null,
      ]
    );

    const datosSituacion = {
      traslado:      data.traslado      || false,
      traslado_a:    data.traslado_a    || null,
      costo_traslado:data.costo_traslado|| null,
      color:         data.color         || null,
      marca:         data.marca         || null,
      observaciones: data.observaciones || null,
    };

    // INSERT junction vehiculo_grua — usa conn
    return conn.one(
      `INSERT INTO vehiculo_grua (situacion_vehiculo_id, grua_id, datos)
       VALUES ($1, $2, $3) RETURNING *`,
      [situacionVehiculoId, grua.id, datosSituacion]
    );
  },

  async getGruas(situacionId: number): Promise<any[]> {
    return db.manyOrNone(
      `SELECT vg.*, g.placa, g.nombre, g.empresa, g.tipo_grua, g.telefono,
              sv.situacion_id, sv.vehiculo_id
       FROM vehiculo_grua vg
       INNER JOIN grua g ON vg.grua_id = g.id
       INNER JOIN situacion_vehiculo sv ON vg.situacion_vehiculo_id = sv.id
       WHERE sv.situacion_id = $1 ORDER BY vg.created_at`,
      [situacionId]
    );
  },

  async deleteGrua(id: number): Promise<void> {
    await db.none('DELETE FROM vehiculo_grua WHERE id = $1', [id]);
  },

  // ==========================================
  // AJUSTADORES (junction situacion_vehiculo <-> aseguradora)
  // ==========================================

  async addAjustador(situacionVehiculoId: number, data: any, conn: any = db): Promise<VehiculoAjustador> {
    // Upsert aseguradora en tabla maestra — usa db (idempotente)
    let aseguradora_id = data.aseguradora_id || null;
    if (!aseguradora_id && (data.aseguradora_nombre || data.empresa)) {
      const nombre = data.aseguradora_nombre || data.empresa;
      const aseg = await db.one(
        `INSERT INTO aseguradora (nombre) VALUES ($1)
         ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
         RETURNING id`,
        [nombre]
      );
      aseguradora_id = aseg.id;
    }

    const datosAjustador = {
      nombre:         data.nombre         || null,
      telefono:       data.telefono       || null,
      vehiculo_placa: data.vehiculo_placa || null,
      vehiculo_marca: data.vehiculo_marca || null,
      vehiculo_color: data.vehiculo_color || null,
      observaciones:  data.observaciones  || null,
    };

    // INSERT junction vehiculo_aseguradora — usa conn
    return conn.one(
      `INSERT INTO vehiculo_aseguradora (situacion_vehiculo_id, aseguradora_id, datos)
       VALUES ($1, $2, $3) RETURNING *`,
      [situacionVehiculoId, aseguradora_id, datosAjustador]
    );
  },

  async getAjustadores(situacionId: number): Promise<any[]> {
    return db.manyOrNone(
      `SELECT va.*, a.nombre as aseguradora_nombre, a.empresa as aseguradora_empresa,
              sv.situacion_id, sv.vehiculo_id
       FROM vehiculo_aseguradora va
       LEFT JOIN aseguradora a ON va.aseguradora_id = a.id
       INNER JOIN situacion_vehiculo sv ON va.situacion_vehiculo_id = sv.id
       WHERE sv.situacion_id = $1 ORDER BY va.created_at`,
      [situacionId]
    );
  },

  async deleteAjustador(id: number): Promise<void> {
    await db.none('DELETE FROM vehiculo_aseguradora WHERE id = $1', [id]);
  },

  // ==========================================
  // AUTORIDADES (per-situacion, múltiples)
  // ==========================================

  async addAutoridad(situacionId: number, data: any, conn: any = db): Promise<Autoridad> {
    const { tipo, hora_llegada, hora_salida, ...resto } = data;
    // INSERT autoridad — usa conn
    return conn.one(
      `INSERT INTO autoridad (situacion_id, tipo, hora_llegada, hora_salida, datos)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [situacionId, tipo || data.nombre || 'OTRO', hora_llegada || null, hora_salida || null, resto]
    );
  },

  async getAutoridades(situacionId: number): Promise<Autoridad[]> {
    return db.manyOrNone(
      'SELECT * FROM autoridad WHERE situacion_id = $1 ORDER BY created_at',
      [situacionId]
    );
  },

  async deleteAutoridad(id: number): Promise<void> {
    await db.none('DELETE FROM autoridad WHERE id = $1', [id]);
  },

  // ==========================================
  // TODOS LOS DETALLES
  // ==========================================

  async getAllDetalles(situacionId: number): Promise<SituacionDetallesCompletos> {
    const [vehiculos, autoridades, gruas, ajustadores] = await Promise.all([
      this.getVehiculos(situacionId),
      this.getAutoridades(situacionId),
      this.getGruas(situacionId),
      this.getAjustadores(situacionId),
    ]);
    return { vehiculos, autoridades, gruas, ajustadores };
  },

  // ==========================================
  // ROUTER GENÉRICO (para rutas /detalles)
  // ==========================================

  async createByTipo(situacionId: number, tipoDetalle: string, datos: any, conn: any = db): Promise<any> {
    switch (tipoDetalle) {
      case 'VEHICULO':
        return this.addVehiculo(situacionId, datos, conn);
      case 'AUTORIDAD':
      case 'AUTORIDADES_SOCORRO':
        return this.addAutoridad(situacionId, datos, conn);
      case 'GRUA': {
        if (datos.situacion_vehiculo_id) {
          return this.addGrua(datos.situacion_vehiculo_id, datos, conn);
        }
        const sv = await conn.oneOrNone(
          'SELECT id FROM situacion_vehiculo WHERE situacion_id = $1 LIMIT 1',
          [situacionId]
        );
        if (sv) return this.addGrua(sv.id, datos, conn);
        throw new Error('No hay vehiculo asociado para asignar la grua');
      }
      case 'AJUSTADOR':
      case 'ASEGURADORA': {
        if (datos.situacion_vehiculo_id) {
          return this.addAjustador(datos.situacion_vehiculo_id, datos, conn);
        }
        const svAj = await conn.oneOrNone(
          'SELECT id FROM situacion_vehiculo WHERE situacion_id = $1 LIMIT 1',
          [situacionId]
        );
        if (svAj) return this.addAjustador(svAj.id, datos, conn);
        throw new Error('No hay vehiculo asociado para asignar el ajustador');
      }
      default:
        return this.addAutoridad(situacionId, { ...datos, tipo: tipoDetalle }, conn);
    }
  },

  async deleteByTipo(tipoDetalle: string, id: number): Promise<void> {
    switch (tipoDetalle) {
      case 'VEHICULO':          return this.deleteVehiculo(id);
      case 'AUTORIDAD':
      case 'AUTORIDADES_SOCORRO': return this.deleteAutoridad(id);
      case 'GRUA':              return this.deleteGrua(id);
      case 'AJUSTADOR':
      case 'ASEGURADORA':       return this.deleteAjustador(id);
      default:                  return this.deleteAutoridad(id);
    }
  },
};
