/**
 * Modelo para Configuración Visual de Sede
 * Maneja personalización de colores, tipografía y alertas por sede
 */

import { db } from '../config/database';

export interface ConfiguracionVisualSede {
  id: number;
  sede_id: number;
  color_fondo: string;
  color_fondo_header: string;
  color_texto: string;
  color_acento: string;
  fuente: string;
  tamano_fuente: 'small' | 'normal' | 'large';
  alerta_rotacion_rutas_activa: boolean;
  umbral_rotacion_rutas: number;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateConfiguracionParams {
  color_fondo?: string;
  color_fondo_header?: string;
  color_texto?: string;
  color_acento?: string;
  fuente?: string;
  tamano_fuente?: 'small' | 'normal' | 'large';
  alerta_rotacion_rutas_activa?: boolean;
  umbral_rotacion_rutas?: number;
}

export const ConfiguracionSedeModel = {
  /**
   * Obtener configuración de una sede
   */
  async getBySede(sedeId: number): Promise<ConfiguracionVisualSede | null> {
    return db.oneOrNone(
      `SELECT * FROM configuracion_visual_sede WHERE sede_id = $1`,
      [sedeId]
    );
  },

  /**
   * Obtener configuración de todas las sedes
   */
  async getAll(): Promise<ConfiguracionVisualSede[]> {
    return db.manyOrNone(
      `SELECT cv.*, s.nombre as sede_nombre, s.codigo as sede_codigo
       FROM configuracion_visual_sede cv
       JOIN sede s ON cv.sede_id = s.id
       ORDER BY s.nombre`
    );
  },

  /**
   * Crear o actualizar configuración de sede
   */
  async upsert(sedeId: number, config: UpdateConfiguracionParams): Promise<ConfiguracionVisualSede> {
    const fields: string[] = [];
    const values: any[] = [sedeId];
    let paramCount = 2;

    if (config.color_fondo !== undefined) {
      fields.push(`color_fondo = $${paramCount++}`);
      values.push(config.color_fondo);
    }
    if (config.color_fondo_header !== undefined) {
      fields.push(`color_fondo_header = $${paramCount++}`);
      values.push(config.color_fondo_header);
    }
    if (config.color_texto !== undefined) {
      fields.push(`color_texto = $${paramCount++}`);
      values.push(config.color_texto);
    }
    if (config.color_acento !== undefined) {
      fields.push(`color_acento = $${paramCount++}`);
      values.push(config.color_acento);
    }
    if (config.fuente !== undefined) {
      fields.push(`fuente = $${paramCount++}`);
      values.push(config.fuente);
    }
    if (config.tamano_fuente !== undefined) {
      fields.push(`tamano_fuente = $${paramCount++}`);
      values.push(config.tamano_fuente);
    }
    if (config.alerta_rotacion_rutas_activa !== undefined) {
      fields.push(`alerta_rotacion_rutas_activa = $${paramCount++}`);
      values.push(config.alerta_rotacion_rutas_activa);
    }
    if (config.umbral_rotacion_rutas !== undefined) {
      fields.push(`umbral_rotacion_rutas = $${paramCount++}`);
      values.push(config.umbral_rotacion_rutas);
    }

    if (fields.length === 0) {
      const existing = await this.getBySede(sedeId);
      if (existing) return existing;
      // Crear con valores por defecto
      return db.one(
        `INSERT INTO configuracion_visual_sede (sede_id)
         VALUES ($1)
         RETURNING *`,
        [sedeId]
      );
    }

    return db.one(
      `INSERT INTO configuracion_visual_sede (sede_id, ${fields.map(f => f.split(' = ')[0]).join(', ')})
       VALUES ($1, ${values.slice(1).map((_, i) => `$${i + 2}`).join(', ')})
       ON CONFLICT (sede_id) DO UPDATE SET
         ${fields.join(', ')},
         updated_at = NOW()
       RETURNING *`,
      values
    );
  },

  /**
   * Actualizar configuración existente
   */
  async update(sedeId: number, config: UpdateConfiguracionParams): Promise<ConfiguracionVisualSede | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (config.color_fondo !== undefined) {
      updates.push(`color_fondo = $${paramCount++}`);
      values.push(config.color_fondo);
    }
    if (config.color_fondo_header !== undefined) {
      updates.push(`color_fondo_header = $${paramCount++}`);
      values.push(config.color_fondo_header);
    }
    if (config.color_texto !== undefined) {
      updates.push(`color_texto = $${paramCount++}`);
      values.push(config.color_texto);
    }
    if (config.color_acento !== undefined) {
      updates.push(`color_acento = $${paramCount++}`);
      values.push(config.color_acento);
    }
    if (config.fuente !== undefined) {
      updates.push(`fuente = $${paramCount++}`);
      values.push(config.fuente);
    }
    if (config.tamano_fuente !== undefined) {
      updates.push(`tamano_fuente = $${paramCount++}`);
      values.push(config.tamano_fuente);
    }
    if (config.alerta_rotacion_rutas_activa !== undefined) {
      updates.push(`alerta_rotacion_rutas_activa = $${paramCount++}`);
      values.push(config.alerta_rotacion_rutas_activa);
    }
    if (config.umbral_rotacion_rutas !== undefined) {
      updates.push(`umbral_rotacion_rutas = $${paramCount++}`);
      values.push(config.umbral_rotacion_rutas);
    }

    if (updates.length === 0) return this.getBySede(sedeId);

    updates.push(`updated_at = NOW()`);
    values.push(sedeId);

    return db.oneOrNone(
      `UPDATE configuracion_visual_sede
       SET ${updates.join(', ')}
       WHERE sede_id = $${paramCount}
       RETURNING *`,
      values
    );
  }
};
