import axios from 'axios';

// API pública de slv-publico — sin autenticación
const publicApi = axios.create({
    baseURL: 'https://slv-publico-production.up.railway.app/api',
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

export const verificarPlaca = async (placa: string) => {
    const sanitized = placa.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const response = await publicApi.get(`/verificar/placa/${sanitized}`);
    return response.data;
};
