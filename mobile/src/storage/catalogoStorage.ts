import { openDatabase } from './db';

export interface CatalogoItem {
    id: number;
    codigo?: string;
    nombre: string;
    activo?: boolean;
}

class CatalogoStorage {

    // Simular métodos que ya esperaba catalogResolver
    async getTiposVehiculo(): Promise<CatalogoItem[]> {
        // En fase real: SELECT * FROM tipo_vehiculo
        return [
            { id: 1, nombre: 'Automóvil' },
            { id: 2, nombre: 'Motocicleta' },
            { id: 3, nombre: 'Camioneta' },
            { id: 4, nombre: 'Pick-up' },
            { id: 5, nombre: 'Camión' }
        ];
    }

    async getMarcasVehiculo(): Promise<CatalogoItem[]> {
        return [
            { id: 1, nombre: 'Toyota' },
            { id: 2, nombre: 'Honda' },
            { id: 3, nombre: 'Mazda' },
            { id: 4, nombre: 'Nissan' }
        ];
    }

    async getAutoridades(): Promise<CatalogoItem[]> {
        return [
            { id: 1, nombre: 'PNC' },
            { id: 2, nombre: 'PMT' },
            { id: 3, nombre: 'PROVIAL' }
        ];
    }

    async getSocorro(): Promise<CatalogoItem[]> {
        return [
            { id: 1, nombre: 'Bomberos Voluntarios' },
            { id: 2, nombre: 'Bomberos Municipales' },
            { id: 3, nombre: 'Cruz Roja' }
        ];
    }
}

export const catalogoStorage = new CatalogoStorage();
