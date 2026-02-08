import { db } from '../config/database';
import { VehiculoModel } from './vehiculo.model';
import { PilotoModel } from './piloto.model';

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
   * Agregar vehiculo a situacion
   * Upsert vehiculo master por placa -> upsert piloto master por licencia -> crear junction
   */
  async addVehiculo(situacionId: number, data: any): Promise<SituacionVehiculo> {
    // 1. Upsert vehiculo en tabla maestra (por placa)
    const vehiculo = await VehiculoModel.upsert({
      placa: data.placa || '',
      tipo_vehiculo_id: data.tipo_vehiculo_id,
      marca_id: data.marca_id,
      color: data.color,
      es_extranjero: data.es_extranjero || false,
      cargado: data.cargado || false,
      tipo_carga: data.carga_tipo || data.tipo_carga,
    });

    // 2. Upsert piloto en tabla maestra (por licencia_numero/DPI)
    let piloto_id: number | null = null;
    if (data.licencia_numero && data.nombre_piloto) {
      const piloto = await PilotoModel.upsert({
        licencia_numero: BigInt(data.licencia_numero),
        licencia_tipo: data.licencia_tipo as 'M' | 'A' | 'B' | 'C' | 'E' | undefined,
        licencia_vencimiento: data.licencia_vencimiento,
        nombre: data.nombre_piloto,
        fecha_nacimiento: data.piloto_nacimiento,
        licencia_antiguedad: data.licencia_antiguedad,
        etnia: data.piloto_etnia,
        sexo: data.sexo_piloto,
      });
      piloto_id = piloto.id;
    }

    // 3. Construir datos_piloto snapshot JSON
    const datos_piloto = data.datos_piloto || null;

    // 4. Crear junction situacion_vehiculo (with fallback if new columns don't exist yet)
    let result: any;
    try {
      result = await db.one(
        `INSERT INTO situacion_vehiculo (
          situacion_id, vehiculo_id, piloto_id,
          estado_piloto, numero_poliza, personas_asistidas,
          heridos_en_vehiculo, fallecidos_en_vehiculo,
          danos_estimados, observaciones,
          sancion, sancion_detalle, documentos_consignados,
          datos_piloto, custodia_estado, custodia_datos
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
        ]
      );
    } catch (insertErr: any) {
      // Fallback: columns datos_piloto/custodia_estado/custodia_datos may not exist (migration 113 not run)
      if (insertErr.message?.includes('datos_piloto') || insertErr.message?.includes('custodia_')) {
        result = await db.one(
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

    // 4. Si hay tarjeta de circulacion, agregarla (unica por vehiculo)
    if (data.tarjeta_circulacion) {
      try {
        await VehiculoModel.createTarjetaCirculacion({
          vehiculo_id: vehiculo.id,
          numero: BigInt(data.tarjeta_circulacion),
          nit: data.nit ? BigInt(data.nit) : null,
          direccion_propietario: data.direccion_propietario || null,
          nombre_propietario: data.nombre_propietario || null,
          modelo: data.anio || null,
        });
      } catch {
        // Tarjeta ya existe - ignorar
      }
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

    // 7. Si vienen gruas, asociarlas al vehiculo
    if (data.gruas && Array.isArray(data.gruas)) {
      for (const g of data.gruas) {
        await this.addGrua(result.id, g);
      }
    }

    // 8. Si vienen ajustadores, asociarlos al vehiculo
    if (data.ajustadores && Array.isArray(data.ajustadores)) {
      for (const a of data.ajustadores) {
        await this.addAjustador(result.id, a);
      }
    }

    // 9. Si vienen personas (acompanantes/peatones), guardar como JSON en situacion_vehiculo
    if (data.personas && Array.isArray(data.personas) && data.personas.length > 0) {
      try {
        await db.none(
          `UPDATE situacion_vehiculo SET datos_piloto = COALESCE(datos_piloto, '{}'::jsonb) || jsonb_build_object('personas', $2::jsonb) WHERE id = $1`,
          [result.id, JSON.stringify(data.personas)]
        );
      } catch (e) {
        console.warn('Error guardando personas en situacion_vehiculo:', e);
      }
    }

    // 10. Si vienen dispositivos de seguridad, crear junction rows
    if (data.dispositivos && Array.isArray(data.dispositivos)) {
      await this.addDispositivos(result.id, data.dispositivos);
    }

    return result;
  },

  /**
   * Agregar persona (acompanante/peaton/pasajero) a un vehiculo en situacion
   */
  async addPersona(situacionId: number, situacionVehiculoId: number, data: any): Promise<any> {
    return db.one(
      `INSERT INTO persona_accidente (
        situacion_id, situacion_vehiculo_id, nombre, dpi, edad, genero,
        tipo_persona, estado, hospital_traslado, descripcion_lesiones, datos_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        situacionId,
        situacionVehiculoId,
        data.nombre || null,
        data.dpi || null,
        data.edad || null,
        data.genero || null,
        data.tipo_persona || 'ACOMPANANTE',
        data.estado || 'ILESO',
        data.hospital_traslado || null,
        data.descripcion_lesiones || null,
        data.datos_json ? JSON.stringify(data.datos_json) : null,
      ]
    );
  },

  /**
   * Agregar dispositivos de seguridad a un vehiculo en situacion (bulk)
   */
  async addDispositivos(situacionVehiculoId: number, dispositivos: { id: number; estado: string }[]): Promise<void> {
    try {
      for (const d of dispositivos) {
        await db.none(
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

  /**
   * Obtener vehiculos de una situacion (JOIN con maestros + gruas + ajustadores + personas + dispositivos)
   */
  async getVehiculos(situacionId: number): Promise<any[]> {
    // Query simple sin subqueries que puedan fallar por tablas inexistentes
    const querySimple = `
      SELECT
        sv.id,
        sv.situacion_id,
        sv.estado_piloto,
        sv.numero_poliza,
        sv.personas_asistidas,
        sv.heridos_en_vehiculo,
        sv.fallecidos_en_vehiculo,
        sv.danos_estimados,
        sv.observaciones,
        sv.sancion,
        sv.sancion_detalle,
        sv.documentos_consignados,
        sv.created_at,

        -- Vehiculo master
        v.id as vehiculo_id,
        v.placa,
        v.tipo_vehiculo_id,
        v.marca_id,
        v.color,
        v.es_extranjero,
        v.cargado,
        v.tipo_carga,
        tv.nombre as tipo_vehiculo_nombre,
        mv.nombre as marca_nombre,

        -- Piloto master
        p.id as piloto_id,
        p.nombre as nombre_piloto,
        p.licencia_numero,
        p.licencia_tipo,
        p.licencia_vencimiento,
        p.licencia_antiguedad,
        p.fecha_nacimiento as piloto_nacimiento,
        p.etnia as piloto_etnia

      FROM situacion_vehiculo sv
      INNER JOIN vehiculo v ON sv.vehiculo_id = v.id
      LEFT JOIN tipo_vehiculo tv ON v.tipo_vehiculo_id = tv.id
      LEFT JOIN marca_vehiculo mv ON v.marca_id = mv.id
      LEFT JOIN piloto p ON sv.piloto_id = p.id
      WHERE sv.situacion_id = $1
      ORDER BY sv.created_at
    `;

    return db.manyOrNone(querySimple, [situacionId]);
  },

  async deleteVehiculo(id: number): Promise<void> {
    // CASCADE borra vehiculo_grua y vehiculo_aseguradora automaticamente
    await db.none('DELETE FROM situacion_vehiculo WHERE id = $1', [id]);
  },

  // ==========================================
  // GRUAS (junction situacion_vehiculo <-> grua master)
  // ==========================================

  /**
   * Agregar grua a un vehiculo en situacion
   * Upsert grua master por placa -> crear junction vehiculo_grua
   */
  async addGrua(situacionVehiculoId: number, data: any): Promise<VehiculoGrua> {
    // Upsert grua en tabla maestra (por placa)
    const grua = await db.one(
      `INSERT INTO grua (nombre, placa, telefono, empresa, tipo_grua, rango_km, tipos_vehiculo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (placa) DO UPDATE SET
         nombre = COALESCE(EXCLUDED.nombre, grua.nombre),
         telefono = COALESCE(EXCLUDED.telefono, grua.telefono),
         empresa = COALESCE(EXCLUDED.empresa, grua.empresa),
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

    // Extraer datos per-situacion al JSONB (traslado, costo, etc.)
    const datosSituacion = {
      traslado: data.traslado || false,
      traslado_a: data.traslado_a || null,
      costo_traslado: data.costo_traslado || null,
      color: data.color || null,
      marca: data.marca || null,
      observaciones: data.observaciones || null,
    };

    return db.one(
      `INSERT INTO vehiculo_grua (situacion_vehiculo_id, grua_id, datos)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [situacionVehiculoId, grua.id, datosSituacion]
    );
  },

  /**
   * Obtener todas las gruas de una situacion (a traves de vehiculos)
   */
  async getGruas(situacionId: number): Promise<any[]> {
    return db.manyOrNone(
      `SELECT vg.*, g.placa, g.nombre, g.empresa, g.tipo_grua, g.telefono,
              sv.situacion_id, sv.vehiculo_id
       FROM vehiculo_grua vg
       INNER JOIN grua g ON vg.grua_id = g.id
       INNER JOIN situacion_vehiculo sv ON vg.situacion_vehiculo_id = sv.id
       WHERE sv.situacion_id = $1
       ORDER BY vg.created_at`,
      [situacionId]
    );
  },

  async deleteGrua(id: number): Promise<void> {
    await db.none('DELETE FROM vehiculo_grua WHERE id = $1', [id]);
  },

  // ==========================================
  // AJUSTADORES (junction situacion_vehiculo <-> aseguradora)
  // ==========================================

  /**
   * Agregar ajustador a un vehiculo en situacion
   * Solo empresa es mapeable (FK a aseguradora), resto en JSONB
   */
  async addAjustador(situacionVehiculoId: number, data: any): Promise<VehiculoAjustador> {
    // getOrCreate aseguradora si viene nombre de empresa
    let aseguradora_id = data.aseguradora_id || null;
    if (!aseguradora_id && (data.aseguradora_nombre || data.empresa)) {
      const nombre = data.aseguradora_nombre || data.empresa;
      const aseg = await db.one(
        `INSERT INTO aseguradora (nombre)
         VALUES ($1)
         ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
         RETURNING id`,
        [nombre]
      );
      aseguradora_id = aseg.id;
    }

    // Todo lo demas va al JSONB
    const datosAjustador = {
      nombre: data.nombre || null,
      telefono: data.telefono || null,
      vehiculo_placa: data.vehiculo_placa || null,
      vehiculo_marca: data.vehiculo_marca || null,
      vehiculo_color: data.vehiculo_color || null,
      observaciones: data.observaciones || null,
    };

    return db.one(
      `INSERT INTO vehiculo_aseguradora (situacion_vehiculo_id, aseguradora_id, datos)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [situacionVehiculoId, aseguradora_id, datosAjustador]
    );
  },

  /**
   * Obtener todos los ajustadores de una situacion (a traves de vehiculos)
   */
  async getAjustadores(situacionId: number): Promise<any[]> {
    return db.manyOrNone(
      `SELECT va.*, a.nombre as aseguradora_nombre, a.empresa as aseguradora_empresa,
              sv.situacion_id, sv.vehiculo_id
       FROM vehiculo_aseguradora va
       LEFT JOIN aseguradora a ON va.aseguradora_id = a.id
       INNER JOIN situacion_vehiculo sv ON va.situacion_vehiculo_id = sv.id
       WHERE sv.situacion_id = $1
       ORDER BY va.created_at`,
      [situacionId]
    );
  },

  async deleteAjustador(id: number): Promise<void> {
    await db.none('DELETE FROM vehiculo_aseguradora WHERE id = $1', [id]);
  },

  // ==========================================
  // AUTORIDADES (per-situacion, multiples)
  // ==========================================

  /**
   * Agregar autoridad a situacion
   * Mapeables: tipo, hora_llegada, hora_salida
   * Resto: datos JSONB
   */
  async addAutoridad(situacionId: number, data: any): Promise<Autoridad> {
    // Separar campos mapeables del resto
    const { tipo, hora_llegada, hora_salida, ...resto } = data;

    return db.one(
      `INSERT INTO autoridad (situacion_id, tipo, hora_llegada, hora_salida, datos)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        situacionId,
        tipo || data.nombre || 'OTRO',
        hora_llegada || null,
        hora_salida || null,
        resto,
      ]
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
    // Cada query es independiente - si una falla no afecta a las demás
    let vehiculos: any[] = [];
    let autoridades: any[] = [];
    let gruas: any[] = [];
    let ajustadores: any[] = [];

    try { vehiculos = await this.getVehiculos(situacionId); }
    catch (e: any) { console.warn('[getAllDetalles] getVehiculos falló:', e.message); }

    try { autoridades = await this.getAutoridades(situacionId); }
    catch (e: any) { console.warn('[getAllDetalles] getAutoridades falló:', e.message); }

    try { gruas = await this.getGruas(situacionId); }
    catch (e: any) { console.warn('[getAllDetalles] getGruas falló:', e.message); }

    try { ajustadores = await this.getAjustadores(situacionId); }
    catch (e: any) { console.warn('[getAllDetalles] getAjustadores falló:', e.message); }

    return { vehiculos, autoridades, gruas, ajustadores };
  },

  // ==========================================
  // ROUTER GENERICO (para rutas /detalles)
  // ==========================================

  async createByTipo(situacionId: number, tipoDetalle: string, datos: any): Promise<any> {
    switch (tipoDetalle) {
      case 'VEHICULO':
        return this.addVehiculo(situacionId, datos);
      case 'AUTORIDAD':
      case 'AUTORIDADES_SOCORRO':
        return this.addAutoridad(situacionId, datos);
      case 'GRUA':
        // Grua necesita situacion_vehiculo_id, si viene directo con vehiculo_id lo buscamos
        if (datos.situacion_vehiculo_id) {
          return this.addGrua(datos.situacion_vehiculo_id, datos);
        }
        // Fallback: buscar primer vehiculo de la situacion
        const sv = await db.oneOrNone(
          'SELECT id FROM situacion_vehiculo WHERE situacion_id = $1 LIMIT 1',
          [situacionId]
        );
        if (sv) return this.addGrua(sv.id, datos);
        throw new Error('No hay vehiculo asociado para asignar la grua');
      case 'AJUSTADOR':
      case 'ASEGURADORA':
        if (datos.situacion_vehiculo_id) {
          return this.addAjustador(datos.situacion_vehiculo_id, datos);
        }
        const svAj = await db.oneOrNone(
          'SELECT id FROM situacion_vehiculo WHERE situacion_id = $1 LIMIT 1',
          [situacionId]
        );
        if (svAj) return this.addAjustador(svAj.id, datos);
        throw new Error('No hay vehiculo asociado para asignar el ajustador');
      default:
        return this.addAutoridad(situacionId, { ...datos, tipo: tipoDetalle });
    }
  },

  async deleteByTipo(tipoDetalle: string, id: number): Promise<void> {
    switch (tipoDetalle) {
      case 'VEHICULO':
        return this.deleteVehiculo(id);
      case 'AUTORIDAD':
      case 'AUTORIDADES_SOCORRO':
        return this.deleteAutoridad(id);
      case 'GRUA':
        return this.deleteGrua(id);
      case 'AJUSTADOR':
      case 'ASEGURADORA':
        return this.deleteAjustador(id);
      default:
        return this.deleteAutoridad(id);
    }
  },
};
