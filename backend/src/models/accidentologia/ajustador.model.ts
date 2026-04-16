import { db } from '../config/database';

export interface AjustadorInvolucrado {
    id: number;
    incidente_id: number;
    vehiculo_asignado_id: number | null;
    nombre: string | null;
    empresa: string | null;
    vehiculo_tipo: string | null;
    vehiculo_placa: string | null;
    vehiculo_color: string | null;
    vehiculo_marca: string | null;
    created_at: Date;
    updated_at: Date;
}

export const AjustadorModel = {
    async create(data: Omit<AjustadorInvolucrado, 'id' | 'created_at' | 'updated_at'>): Promise<AjustadorInvolucrado> {
        const query = `
      INSERT INTO ajustador_involucrado (
        incidente_id, vehiculo_asignado_id, nombre, empresa, vehiculo_tipo, vehiculo_placa, vehiculo_color, vehiculo_marca
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
        return db.one(query, [
            data.incidente_id,
            data.vehiculo_asignado_id,
            data.nombre,
            data.empresa,
            data.vehiculo_tipo,
            data.vehiculo_placa,
            data.vehiculo_color,
            data.vehiculo_marca
        ]);
    },

    async getByIncidente(incidenteId: number): Promise<AjustadorInvolucrado[]> {
        return db.manyOrNone('SELECT * FROM ajustador_involucrado WHERE incidente_id = $1', [incidenteId]);
    }
};
