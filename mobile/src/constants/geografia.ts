export const DEPARTAMENTOS = [
    { id: 1, nombre: 'Guatemala' },
    { id: 2, nombre: 'El Progreso' },
    { id: 3, nombre: 'Sacatepéquez' },
    { id: 4, nombre: 'Chimaltenango' },
    { id: 5, nombre: 'Escuintla' },
    { id: 6, nombre: 'Santa Rosa' },
    { id: 7, nombre: 'Sololá' },
    { id: 8, nombre: 'Totonicapán' },
    { id: 9, nombre: 'Quetzaltenango' },
    { id: 10, nombre: 'Suchitepéquez' },
    { id: 11, nombre: 'Retalhuleu' },
    { id: 12, nombre: 'San Marcos' },
    { id: 13, nombre: 'Huehuetenango' },
    { id: 14, nombre: 'Quiché' },
    { id: 15, nombre: 'Baja Verapaz' },
    { id: 16, nombre: 'Alta Verapaz' },
    { id: 17, nombre: 'Petén' },
    { id: 18, nombre: 'Izabal' },
    { id: 19, nombre: 'Zacapa' },
    { id: 20, nombre: 'Chiquimula' },
    { id: 21, nombre: 'Jalapa' },
    { id: 22, nombre: 'Jutiapa' }
];

// Municipios simplificados (idealmente vendrían de BD, pero esto saca el apuro UI)
// Por brevedad, pondré solo algunos ejemplos o un array vacío que se llenaría dinámicamente si tuvieramos el endpoint
export const MUNICIPIOS_MOCK: Record<string, { id: number, nombre: string }[]> = {
    '1': [{ id: 101, nombre: 'Guatemala' }, { id: 102, nombre: 'Santa Catarina Pinula' }, { id: 103, nombre: 'San José Pinula' }],
    // ... se requeriria una lista gigante. 
    // Mejor estrategia: Un input de texto para municipio si no hay endpoint, o un selector generico.
    // El usuario pidio Depto/Muni explicitamente.
};

export const CLIMA_OPCIONES = [
    'Soleado', 'Nublado', 'Lluvioso', 'Neblina', 'Tormenta', 'Granizo'
];

export const CARGA_VEHICULAR_OPCIONES = [
    'Leve', 'Moderada', 'Alta', 'Congestionada'
];
