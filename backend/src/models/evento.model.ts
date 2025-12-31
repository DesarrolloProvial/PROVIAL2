import { db } from '../config/database';

export interface EventoPersistente {
    id: number;
    titulo: string;
    descripcion: string | null;
    tipo: 'DERRUMBE' | 'OBRA' | 'MANIFESTACION' | 'ACCIDENTE_GRAVE' | 'EVENTO_NATURAL' | 'OTRO';
    ruta_id: number | null;
    ruta_nombre?: string;
    km: number | null;
    latitud: number | null;
    longitud: number | null;
    estado: 'ACTIVO' | 'FINALIZADO' | 'CANCELADO';
    importancia: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
    creado_por: number;
    actualizado_por: number | null;
    created_at: Date;
    updated_at: Date;
    // Campos computados
    total_unidades_asignadas?: number;
}

export const EventoModel = {
    /**
     * Crear nuevo evento
     */
    async create(data: {
        titulo: string;
        descripcion?: string;
        tipo: string;
        ruta_id?: number;
        km?: number;
        latitud?: number;
        longitud?: number;
        importancia?: string;
        creado_por: number;
    }): Promise<EventoPersistente> {
        return db.one(
            `INSERT INTO evento_persistente (
        titulo, descripcion, tipo, ruta_id, km, latitud, longitud, 
        importancia, creado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
            [
                data.titulo,
                data.descripcion || null,
                data.tipo,
                data.ruta_id || null,
                data.km || null,
                data.latitud || null,
                data.longitud || null,
                data.importancia || 'MEDIA',
                data.creado_por
            ]
        );
    },

    /**
     * Listar eventos activos (con conteo de unidades presentes actualmente)
     */
    async getActivos(): Promise<EventoPersistente[]> {
        return db.any(`
      SELECT 
        e.*,
        r.nombre as ruta_nombre,
        (
          SELECT COUNT(*)
          FROM situacion s
          JOIN salida_unidad sal ON s.salida_unidad_id = sal.id
          WHERE s.evento_persistente_id = e.id
            AND s.estado = 'ACTIVA'
            AND sal.estado = 'EN_SALIDA'
        ) as total_unidades_asignadas
      FROM evento_persistente e
      LEFT JOIN ruta r ON e.ruta_id = r.id
      WHERE e.estado = 'ACTIVO'
      ORDER BY e.importancia DESC, e.created_at DESC
    `);
    },

    /**
     * Listar todos los eventos (histórico)
     */
    async getAll(limit: number = 50, offset: number = 0): Promise<EventoPersistente[]> {
        return db.any(`
      SELECT e.*, r.nombre as ruta_nombre
      FROM evento_persistente e
      LEFT JOIN ruta r ON e.ruta_id = r.id
      ORDER BY e.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    },

    /**
     * Obtener evento por ID
     */
    async getById(id: number): Promise<EventoPersistente | null> {
        return db.oneOrNone(`
      SELECT e.*, r.nombre as ruta_nombre
      FROM evento_persistente e
      LEFT JOIN ruta r ON e.ruta_id = r.id
      WHERE e.id = $1
    `, [id]);
    },

    /**
     * Actualizar evento
     */
    async update(id: number, data: {
        titulo?: string;
        descripcion?: string;
        estado?: string;
        importancia?: string;
        actualizado_por: number;
    }): Promise<EventoPersistente> {
        // Construcción dinámica de query
        const finalParams: (string | number)[] = [data.actualizado_por];
        const finalSets = ['actualizado_por = $1', 'updated_at = NOW()'];
        let finalIdx = 2;

        if (data.titulo) { finalSets.push(`titulo = $${finalIdx++}`); finalParams.push(data.titulo); }
        if (data.descripcion !== undefined) { finalSets.push(`descripcion = $${finalIdx++}`); finalParams.push(data.descripcion); }
        if (data.estado) { finalSets.push(`estado = $${finalIdx++}`); finalParams.push(data.estado); }
        if (data.importancia) { finalSets.push(`importancia = $${finalIdx++}`); finalParams.push(data.importancia); }

        finalParams.push(id); // ID al final

        return db.one(`
      UPDATE evento_persistente
      SET ${finalSets.join(', ')}
      WHERE id = $${finalIdx}
      RETURNING *
    `, finalParams);
    },

    /**
     * Asignar unidad a evento (Crear situación vinculada)
     */
    async asignarUnidad(data: {
        evento_id: number;
        unidad_id: number;
        usuario_id: number; // Quien asigna (COP)
    }) {
        // 1. Obtener datos del evento
        const evento = await this.getById(data.evento_id);
        if (!evento) throw new Error('Evento no encontrado');

        // 2. Obtener salida activa de la unidad
        const salida = await db.oneOrNone(`
      SELECT id, ruta_inicial_id FROM salida_unidad 
      WHERE unidad_id = $1 AND estado = 'EN_SALIDA'
    `, [data.unidad_id]);

        if (!salida) throw new Error('La unidad no tiene una salida activa');

        // 3. Crear situación de tipo 'APOYO' (o generica) vinculada al evento
        // Usamos 'OTROS' o 'REGULACION_TRAFICO' o lo que sea apropiado según el tipo de evento.
        // Por defecto usaremos 'OTROS' y en descripción ponemos "Asignado a evento: Título"

        return db.one(`
      INSERT INTO situacion (
        tipo_situacion, unidad_id, salida_unidad_id, 
        evento_persistente_id,
        ruta_id, km, latitud, longitud,
        descripcion, creado_por, estado
      ) VALUES (
        'OTROS', $1, $2, 
        $3,
        $4, $5, $6, $7,
        $8, $9, 'ACTIVA'
      ) RETURNING *
    `, [
            data.unidad_id,
            salida.id,
            data.evento_id,
            evento.ruta_id || salida.ruta_inicial_id, // Usar ruta del evento o de la unidad
            evento.km,
            evento.latitud,
            evento.longitud,
            `Asignado a evento: ${evento.titulo}`,
            data.usuario_id
        ]);
    }
};
