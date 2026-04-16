import { db } from '../config/database';

export interface GruaInvolucrada {
    id: number;
    incidente_id: number;
    vehiculo_asignado_id: number | null;
    tipo: string | null;
    placa: string | null;
    empresa: string | null;
    piloto: string | null;
    color: string | null;
    marca: string | null;
    traslado: boolean;
    traslado_a: string | null;
    created_at: Date;
    updated_at: Date;
}

export const GruaModel = {
    async create(data: Omit<GruaInvolucrada, 'id' | 'created_at' | 'updated_at'>): Promise<GruaInvolucrada> {
        const query = `
      INSERT INTO grua_involucrada (
        incidente_id, vehiculo_asignado_id, tipo, placa, empresa, piloto, color, marca, traslado, traslado_a
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
        return db.one(query, [
            data.incidente_id,
            data.vehiculo_asignado_id,
            data.tipo,
            data.placa,
            data.empresa,
            data.piloto,
            data.color,
            data.marca,
            data.traslado,
            data.traslado_a
        ]);
    },

    async getByIncidente(incidenteId: number): Promise<GruaInvolucrada[]> {
        return db.manyOrNone('SELECT * FROM grua_involucrada WHERE incidente_id = $1', [incidenteId]);
    }
};
