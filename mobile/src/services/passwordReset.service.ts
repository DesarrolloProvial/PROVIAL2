import api from './api';

// =====================================================
// SERVICIO DE RESET DE CONTRASEÑA - APP MÓVIL
// =====================================================

export interface VerificarResetResponse {
  necesita_reset: boolean;
  tiene_chapa: boolean;
}

export interface CompletarResetResponse {
  success: boolean;
  message: string;
}

export const passwordResetService = {
  /**
   * Verificar si un usuario necesita reset de contraseña
   */
  verificarNecesitaReset: async (username: string): Promise<VerificarResetResponse> => {
    const response = await api.post('/auth/check-reset-status', { username });
    return {
      necesita_reset: response.data.enabled || false,
      tiene_chapa: true, // Asumimos que todos tienen chapa
    };
  },

  /**
   * Completar el reset de contraseña
   */
  completarReset: async (
    username: string,
    chapa: string | null,
    nueva_password: string
  ): Promise<CompletarResetResponse> => {
    const response = await api.post('/auth/reset-password', {
      username,
      password: nueva_password,
    });
    return response.data;
  },
};

export default passwordResetService;
