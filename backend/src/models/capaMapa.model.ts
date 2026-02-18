import { db } from '../config/database';

export const CapaMapaModel = {
  async listarCapas() {
    return db.manyOrNone(`
      SELECT c.*, COUNT(p.id) FILTER (WHERE p.activo = TRUE) AS total_puntos
      FROM capa_mapa c
      LEFT JOIN punto_mapa p ON p.capa_id = c.id
      WHERE c.activo = TRUE
      GROUP BY c.id
      ORDER BY c.orden, c.nombre
    `);
  },

  async crearCapa(data: {
    nombre: string; descripcion?: string; color?: string;
    icono?: string; visible?: boolean; orden?: number; created_by: number;
  }) {
    return db.one(`
      INSERT INTO capa_mapa (nombre, descripcion, color, icono, visible, orden, created_by)
      VALUES ($/nombre/, $/descripcion/, $/color/, $/icono/, $/visible/, $/orden/, $/created_by/)
      RETURNING *
    `, { visible: true, color: '#3B82F6', icono: 'map-pin', orden: 0, descripcion: null, ...data });
  },

  async actualizarCapa(id: number, data: Partial<{
    nombre: string; descripcion: string; color: string;
    icono: string; visible: boolean; orden: number;
  }>) {
    const sets: string[] = ['updated_at = NOW()'];
    const params: any = { id };
    if (data.nombre !== undefined)      { sets.push('nombre = $/nombre/');           params.nombre = data.nombre; }
    if (data.descripcion !== undefined) { sets.push('descripcion = $/descripcion/'); params.descripcion = data.descripcion; }
    if (data.color !== undefined)       { sets.push('color = $/color/');             params.color = data.color; }
    if (data.icono !== undefined)       { sets.push('icono = $/icono/');             params.icono = data.icono; }
    if (data.visible !== undefined)     { sets.push('visible = $/visible/');         params.visible = data.visible; }
    if (data.orden !== undefined)       { sets.push('orden = $/orden/');             params.orden = data.orden; }
    return db.oneOrNone(`UPDATE capa_mapa SET ${sets.join(', ')} WHERE id = $/id/ AND activo = TRUE RETURNING *`, params);
  },

  async eliminarCapa(id: number) {
    return db.result(`UPDATE capa_mapa SET activo = FALSE, updated_at = NOW() WHERE id = $1`, [id]);
  },

  async getPuntosDeCapa(capaId: number) {
    return db.manyOrNone(`
      SELECT p.*, u.nombre_completo AS creado_por_nombre
      FROM punto_mapa p
      LEFT JOIN usuario u ON p.created_by = u.id
      WHERE p.capa_id = $/capa_id/ AND p.activo = TRUE
      ORDER BY p.created_at DESC
    `, { capa_id: capaId });
  },

  async getTodosPuntos() {
    return db.manyOrNone(`
      SELECT p.*, c.nombre AS capa_nombre, c.color AS capa_color, c.icono AS capa_icono
      FROM punto_mapa p
      JOIN capa_mapa c ON p.capa_id = c.id
      WHERE p.activo = TRUE AND c.activo = TRUE
      ORDER BY p.capa_id, p.created_at DESC
    `);
  },

  async crearPunto(data: {
    capa_id: number; titulo: string; descripcion?: string;
    latitud: number; longitud: number; categoria?: string;
    icono_url?: string; datos?: object; created_by: number;
  }) {
    return db.one(`
      INSERT INTO punto_mapa (capa_id, titulo, descripcion, latitud, longitud, categoria, icono_url, datos, created_by)
      VALUES ($/capa_id/, $/titulo/, $/descripcion/, $/latitud/, $/longitud/, $/categoria/, $/icono_url/, $/datos/, $/created_by/)
      RETURNING *
    `, { descripcion: null, categoria: null, icono_url: null, datos: null, ...data });
  },

  async actualizarPunto(id: number, data: Partial<{
    titulo: string; descripcion: string; latitud: number; longitud: number;
    categoria: string; icono_url: string; datos: object;
  }>) {
    const sets: string[] = ['updated_at = NOW()'];
    const params: any = { id };
    if (data.titulo !== undefined)      { sets.push('titulo = $/titulo/');           params.titulo = data.titulo; }
    if (data.descripcion !== undefined) { sets.push('descripcion = $/descripcion/'); params.descripcion = data.descripcion; }
    if (data.latitud !== undefined)     { sets.push('latitud = $/latitud/');         params.latitud = data.latitud; }
    if (data.longitud !== undefined)    { sets.push('longitud = $/longitud/');       params.longitud = data.longitud; }
    if (data.categoria !== undefined)   { sets.push('categoria = $/categoria/');     params.categoria = data.categoria; }
    if (data.icono_url !== undefined)   { sets.push('icono_url = $/icono_url/');     params.icono_url = data.icono_url; }
    if (data.datos !== undefined)       { sets.push('datos = $/datos/');             params.datos = data.datos; }
    return db.oneOrNone(`UPDATE punto_mapa SET ${sets.join(', ')} WHERE id = $/id/ AND activo = TRUE RETURNING *`, params);
  },

  async eliminarPunto(id: number) {
    return db.result(`UPDATE punto_mapa SET activo = FALSE, updated_at = NOW() WHERE id = $1`, [id]);
  },
};
