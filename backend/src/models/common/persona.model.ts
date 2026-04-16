import { db } from '../config/database';

export interface PersonaInvolucrada {
    id: number;
    incidente_id: number;
    vehiculo_id: number | null;
    tipo: 'PILOTO' | 'COPILOTO' | 'PASAJERO' | 'PEATON';
    nombre: string | null;
    genero: string | null;
    edad: number | null;
    estado: 'ILESO' | 'HERIDO' | 'FALLECIDO' | 'CRISIS_NERVIOSA';
    trasladado: boolean;
    lugar_traslado: string | null;
    consignado: boolean;
    lugar_consignacion: string | null;
    observaciones: string | null;
    created_at: Date;
    updated_at: Date;
}

export const PersonaModel = {
    async create(data: Omit<PersonaInvolucrada, 'id' | 'created_at' | 'updated_at'>): Promise<PersonaInvolucrada> {
        const query = `
      INSERT INTO persona_involucrada (
        incidente_id, vehiculo_id, tipo, nombre, genero, edad, estado, traslado, lugar_traslado, consignado, lugar_consignacion, observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
        return db.one(query, [
            data.incidente_id,
            data.vehiculo_id,
            data.tipo,
            data.nombre,
            data.genero,
            data.edad,
            data.estado,
            data.trasladado,
            data.lugar_traslado,
            data.consignado,
            data.lugar_consignacion,
            data.observaciones
        ]);
    },

    async getByIncidente(incidenteId: number): Promise<PersonaInvolucrada[]> {
        return db.manyOrNone('SELECT * FROM persona_involucrada WHERE incidente_id = $1', [incidenteId]);
    }
};
