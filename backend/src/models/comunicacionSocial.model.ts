import { db } from '../config/database';

// ============================================
// INTERFACES
// ============================================

export interface PlantillaComunicacion {
  id?: number;
  nombre: string;
  descripcion?: string;
  tipo_situacion?: string;
  tipo_accidente?: string;
  contenido_plantilla: string;
  activa?: boolean;
  es_predefinida?: boolean;
  hashtags?: string[];
  creado_por?: number;
}

export interface PublicacionSocial {
  id?: number;
  situacion_id?: number;
  hoja_accidentologia_id?: number;
  plantilla_id?: number;
  contenido_texto: string;
  contenido_editado?: string;
  hashtags?: string[];
  fotos_urls?: string[];
  publicado_facebook?: boolean;
  publicado_twitter?: boolean;
  publicado_instagram?: boolean;
  publicado_whatsapp?: boolean;
  publicado_threads?: boolean;
  publicado_por?: number;
  estado?: string;
  fecha_programada?: string;
}

// ============================================
// MODELO DE COMUNICACIÓN SOCIAL
// ============================================

export const ComunicacionSocialModel = {
  // ============================================
  // PLANTILLAS
  // ============================================

  /**
   * Crear plantilla de comunicación
   */
  async crearPlantilla(data: PlantillaComunicacion): Promise<number> {
    const result = await db.one(`
      INSERT INTO plantilla_comunicacion (
        nombre, descripcion, tipo_situacion, tipo_accidente,
        contenido_plantilla, activa, es_predefinida, hashtags, creado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      data.nombre, data.descripcion, data.tipo_situacion, data.tipo_accidente,
      data.contenido_plantilla, data.activa !== false, data.es_predefinida || false,
      data.hashtags || [], data.creado_por
    ]);
    return result.id;
  },

  /**
   * Actualizar plantilla
   */
  async actualizarPlantilla(id: number, data: Partial<PlantillaComunicacion>): Promise<void> {
    // No permitir editar plantillas predefinidas
    const plantilla = await db.oneOrNone('SELECT es_predefinida FROM plantilla_comunicacion WHERE id = $1', [id]);
    if (plantilla?.es_predefinida) {
      throw new Error('No se pueden editar plantillas predefinidas');
    }

    const campos: string[] = [];
    const valores: any[] = [];
    let idx = 1;

    const camposPermitidos = [
      'nombre', 'descripcion', 'tipo_situacion', 'tipo_accidente',
      'contenido_plantilla', 'activa', 'hashtags'
    ];

    for (const campo of camposPermitidos) {
      if (data[campo as keyof PlantillaComunicacion] !== undefined) {
        campos.push(`${campo} = $${idx}`);
        valores.push(data[campo as keyof PlantillaComunicacion]);
        idx++;
      }
    }

    if (campos.length === 0) return;

    campos.push('updated_at = NOW()');
    valores.push(id);

    await db.none(`
      UPDATE plantilla_comunicacion
      SET ${campos.join(', ')}
      WHERE id = $${idx}
    `, valores);
  },

  /**
   * Eliminar plantilla
   */
  async eliminarPlantilla(id: number): Promise<void> {
    // No permitir eliminar plantillas predefinidas
    const plantilla = await db.oneOrNone('SELECT es_predefinida FROM plantilla_comunicacion WHERE id = $1', [id]);
    if (plantilla?.es_predefinida) {
      throw new Error('No se pueden eliminar plantillas predefinidas');
    }

    await db.none('DELETE FROM plantilla_comunicacion WHERE id = $1', [id]);
  },

  /**
   * Obtener plantilla por ID
   */
  async obtenerPlantilla(id: number): Promise<any> {
    return db.oneOrNone(`
      SELECT pc.*, u.nombre_completo AS creado_por_nombre
      FROM plantilla_comunicacion pc
      LEFT JOIN usuario u ON pc.creado_por = u.id
      WHERE pc.id = $1
    `, [id]);
  },

  /**
   * Listar plantillas
   */
  async listarPlantillas(filtros: {
    tipo_situacion?: string;
    tipo_accidente?: string;
    solo_activas?: boolean;
  }): Promise<any[]> {
    let query = `
      SELECT pc.*, u.nombre_completo AS creado_por_nombre
      FROM plantilla_comunicacion pc
      LEFT JOIN usuario u ON pc.creado_por = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (filtros.solo_activas !== false) {
      query += ' AND pc.activa = TRUE';
    }

    if (filtros.tipo_situacion) {
      query += ` AND (pc.tipo_situacion = $${idx} OR pc.tipo_situacion IS NULL)`;
      params.push(filtros.tipo_situacion);
      idx++;
    }

    if (filtros.tipo_accidente) {
      query += ` AND (pc.tipo_accidente = $${idx} OR pc.tipo_accidente IS NULL)`;
      params.push(filtros.tipo_accidente);
      idx++;
    }

    query += ' ORDER BY pc.es_predefinida DESC, pc.nombre';

    return db.any(query, params);
  },

  /**
   * Generar mensaje desde plantilla usando la función de BD
   */
  async generarMensaje(plantillaId: number, situacionId: number): Promise<string | null> {
    const result = await db.oneOrNone(`
      SELECT generar_mensaje_plantilla($1, $2) AS mensaje
    `, [plantillaId, situacionId]);
    return result?.mensaje || null;
  },

  // ============================================
  // PUBLICACIONES
  // ============================================

  /**
   * Crear publicación
   */
  async crearPublicacion(data: PublicacionSocial): Promise<number> {
    const result = await db.one(`
      INSERT INTO publicacion_social (
        situacion_id, hoja_accidentologia_id, plantilla_id,
        contenido_texto, contenido_editado, hashtags, fotos_urls,
        publicado_facebook, publicado_twitter, publicado_instagram,
        publicado_whatsapp, publicado_threads, publicado_por, estado, fecha_programada
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `, [
      data.situacion_id, data.hoja_accidentologia_id, data.plantilla_id,
      data.contenido_texto, data.contenido_editado, data.hashtags || [],
      data.fotos_urls || [], data.publicado_facebook || false,
      data.publicado_twitter || false, data.publicado_instagram || false,
      data.publicado_whatsapp || false, data.publicado_threads || false,
      data.publicado_por, data.estado || 'BORRADOR', data.fecha_programada
    ]);
    return result.id;
  },

  /**
   * Actualizar publicación
   */
  async actualizarPublicacion(id: number, data: Partial<PublicacionSocial>): Promise<void> {
    const campos: string[] = [];
    const valores: any[] = [];
    let idx = 1;

    const camposPermitidos = [
      'contenido_texto', 'contenido_editado', 'hashtags', 'fotos_urls',
      'publicado_facebook', 'publicado_twitter', 'publicado_instagram',
      'publicado_whatsapp', 'publicado_threads', 'estado', 'fecha_programada'
    ];

    for (const campo of camposPermitidos) {
      if (data[campo as keyof PublicacionSocial] !== undefined) {
        campos.push(`${campo} = $${idx}`);
        valores.push(data[campo as keyof PublicacionSocial]);
        idx++;
      }
    }

    if (campos.length === 0) return;

    valores.push(id);
    await db.none(`
      UPDATE publicacion_social SET ${campos.join(', ')} WHERE id = $${idx}
    `, valores);
  },

  /**
   * Marcar como publicado en red social
   */
  async marcarPublicado(id: number, red: string): Promise<void> {
    const columna = `publicado_${red.toLowerCase()}`;
    await db.none(`
      UPDATE publicacion_social
      SET ${columna} = TRUE, estado = 'PUBLICADO', fecha_publicacion = NOW()
      WHERE id = $1
    `, [id]);
  },

  /**
   * Obtener publicación por ID
   */
  async obtenerPublicacion(id: number): Promise<any> {
    return db.oneOrNone(`
      SELECT ps.*,
             u.nombre_completo AS publicado_por_nombre,
             pl.nombre AS plantilla_nombre,
             s.numero_situacion, s.tipo_situacion
      FROM publicacion_social ps
      LEFT JOIN usuario u ON ps.publicado_por = u.id
      LEFT JOIN plantilla_comunicacion pl ON ps.plantilla_id = pl.id
      LEFT JOIN situacion s ON ps.situacion_id = s.id
      WHERE ps.id = $1
    `, [id]);
  },

  /**
   * Listar publicaciones
   */
  async listarPublicaciones(filtros: {
    situacion_id?: number;
    estado?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let query = `
      SELECT ps.*,
             u.nombre_completo AS publicado_por_nombre,
             pl.nombre AS plantilla_nombre,
             s.numero_situacion, s.tipo_situacion
      FROM publicacion_social ps
      LEFT JOIN usuario u ON ps.publicado_por = u.id
      LEFT JOIN plantilla_comunicacion pl ON ps.plantilla_id = pl.id
      LEFT JOIN situacion s ON ps.situacion_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (filtros.situacion_id) {
      query += ` AND ps.situacion_id = $${idx}`;
      params.push(filtros.situacion_id);
      idx++;
    }

    if (filtros.estado) {
      query += ` AND ps.estado = $${idx}`;
      params.push(filtros.estado);
      idx++;
    }

    if (filtros.fecha_desde) {
      query += ` AND ps.created_at >= $${idx}`;
      params.push(filtros.fecha_desde);
      idx++;
    }

    if (filtros.fecha_hasta) {
      query += ` AND ps.created_at <= $${idx}`;
      params.push(filtros.fecha_hasta);
      idx++;
    }

    query += ' ORDER BY ps.created_at DESC';
    query += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(filtros.limit || 50, filtros.offset || 0);

    return db.any(query, params);
  },

  /**
   * Obtener publicaciones de una situación
   */
  async obtenerPublicacionesSituacion(situacionId: number): Promise<any[]> {
    return db.any(`
      SELECT ps.*,
             u.nombre_completo AS publicado_por_nombre,
             pl.nombre AS plantilla_nombre
      FROM publicacion_social ps
      LEFT JOIN usuario u ON ps.publicado_por = u.id
      LEFT JOIN plantilla_comunicacion pl ON ps.plantilla_id = pl.id
      WHERE ps.situacion_id = $1
      ORDER BY ps.created_at DESC
    `, [situacionId]);
  },

  /**
   * Obtener fotos de una situación para compartir
   */
  async obtenerFotosSituacion(situacionId: number): Promise<string[]> {
    const result = await db.any(`
      SELECT fs.url
      FROM foto_situacion fs
      WHERE fs.situacion_id = $1
      ORDER BY fs.created_at DESC
    `, [situacionId]);
    return result.map(r => r.url);
  },

  /**
   * Generar links de compartir para redes sociales
   */
  generarLinksCompartir(contenido: string, hashtags: string[], fotos: string[]): {
    facebook: string;
    twitter: string;
    whatsapp: string;
    linkedin: string;
  } {
    const texto = encodeURIComponent(contenido);
    const hashtagsStr = hashtags.map(h => `#${h}`).join(' ');
    const textoConHashtags = encodeURIComponent(`${contenido}\n\n${hashtagsStr}`);
    const primeraFoto = fotos.length > 0 ? encodeURIComponent(fotos[0]) : '';

    return {
      // Facebook Share Dialog (requiere app ID en producción)
      facebook: `https://www.facebook.com/sharer/sharer.php?quote=${texto}`,

      // Twitter/X Web Intent
      twitter: `https://twitter.com/intent/tweet?text=${textoConHashtags}`,

      // WhatsApp
      whatsapp: `https://wa.me/?text=${textoConHashtags}${primeraFoto ? `%0A${primeraFoto}` : ''}`,

      // LinkedIn
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${primeraFoto}`
    };
  },

  /**
   * Preparar datos para compartir en móvil (usando Share API nativo)
   */
  prepararDatosCompartir(publicacion: any, fotos: string[]): {
    titulo: string;
    mensaje: string;
    urls: string[];
  } {
    const hashtagsStr = publicacion.hashtags?.map((h: string) => `#${h}`).join(' ') || '';

    return {
      titulo: 'PROVIAL - Comunicado Oficial',
      mensaje: `${publicacion.contenido_editado || publicacion.contenido_texto}\n\n${hashtagsStr}`,
      urls: fotos
    };
  }
};

export default ComunicacionSocialModel;
