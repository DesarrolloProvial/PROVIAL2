import { Request, Response } from 'express';
import { UbicacionBrigadaModel } from '../models/ubicacionBrigada.model';
import { db } from '../config/database';

// ========================================
// UBICACIÓN DE BRIGADAS
// ========================================

/**
 * Obtener ubicación actual del usuario autenticado
 */
export const getMiUbicacion = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const ubicacion = await UbicacionBrigadaModel.getUbicacionActual(userId);

    if (!ubicacion) {
      return res.status(404).json({
        error: 'Sin ubicación activa',
        message: 'No tienes una ubicación activa. Inicia un turno primero.'
      });
    }

    res.json(ubicacion);
  } catch (error: any) {
    console.error('Error obteniendo ubicación:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener todas las ubicaciones activas (para COP)
 */
export const getAllUbicaciones = async (_req: Request, res: Response) => {
  try {
    const ubicaciones = await UbicacionBrigadaModel.getAllUbicacionesActivas();
    res.json(ubicaciones);
  } catch (error: any) {
    console.error('Error obteniendo ubicaciones:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener ubicaciones de una unidad específica
 */
export const getUbicacionesByUnidad = async (req: Request, res: Response) => {
  try {
    const unidadId = parseInt(req.params.unidadId);

    if (isNaN(unidadId)) {
      return res.status(400).json({ error: 'unidadId inválido' });
    }

    const ubicaciones = await UbicacionBrigadaModel.getUbicacionesByUnidad(unidadId);
    res.json(ubicaciones);
  } catch (error: any) {
    console.error('Error obteniendo ubicaciones de unidad:', error);
    res.status(500).json({ error: error.message });
  }
};

// ========================================
// PRÉSTAMO DE BRIGADA
// ========================================

/**
 * Prestar brigada a otra unidad
 * Solo COP puede ejecutar esta operación
 */
export const prestarBrigada = async (req: Request, res: Response) => {
  try {
    const ejecutadoPor = req.user?.userId;
    const rol = req.user?.rol;

    if (!ejecutadoPor) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Solo COP puede prestar brigadas
    if (rol !== 'COP' && rol !== 'ADMIN') {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'Solo el COP puede realizar préstamos de brigadas'
      });
    }

    const {
      usuario_id,
      unidad_destino_id,
      asignacion_destino_id,
      motivo,
      km,
      ruta_id,
      latitud,
      longitud
    } = req.body;

    // Validaciones
    if (!usuario_id || !unidad_destino_id || !asignacion_destino_id || !motivo || !km || !ruta_id) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere: usuario_id, unidad_destino_id, asignacion_destino_id, motivo, km, ruta_id'
      });
    }

    const resultado = await UbicacionBrigadaModel.registrarPrestamo({
      usuario_id,
      unidad_destino_id,
      asignacion_destino_id,
      motivo,
      km,
      ruta_id,
      latitud,
      longitud,
      ejecutado_por: ejecutadoPor
    });

    res.status(201).json({
      message: 'Brigada prestado exitosamente',
      ubicacion: resultado
    });
  } catch (error: any) {
    console.error('Error prestando brigada:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Retornar brigada de préstamo a unidad original
 */
export const retornarDePrestamo = async (req: Request, res: Response) => {
  try {
    const ejecutadoPor = req.user?.userId;
    const rol = req.user?.rol;

    if (!ejecutadoPor) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (rol !== 'COP' && rol !== 'ADMIN') {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'Solo el COP puede retornar brigadas de préstamo'
      });
    }

    const { usuario_id, motivo, km, ruta_id, latitud, longitud } = req.body;

    if (!usuario_id || !km || !ruta_id) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere: usuario_id, km, ruta_id'
      });
    }

    const resultado = await UbicacionBrigadaModel.retornarDePrestamo({
      usuario_id,
      motivo,
      km,
      ruta_id,
      latitud,
      longitud,
      ejecutado_por: ejecutadoPor
    });

    res.json({
      message: 'Brigada retornado a unidad original',
      ubicacion: resultado
    });
  } catch (error: any) {
    console.error('Error retornando brigada:', error);
    res.status(500).json({ error: error.message });
  }
};

// ========================================
// DIVISIÓN DE FUERZA
// ========================================

/**
 * Dividir brigada (se queda en punto fijo mientras unidad se va)
 */
export const dividirFuerza = async (req: Request, res: Response) => {
  try {
    const ejecutadoPor = req.user?.userId;
    const rol = req.user?.rol;

    if (!ejecutadoPor) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (rol !== 'COP' && rol !== 'ADMIN') {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'Solo el COP puede dividir fuerzas'
      });
    }

    const {
      usuario_id,
      km,
      sentido,
      ruta_id,
      latitud,
      longitud,
      descripcion,
      situacion_persistente_id,
      motivo
    } = req.body;

    if (!usuario_id || !km || !sentido || !ruta_id || !motivo) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere: usuario_id, km, sentido, ruta_id, motivo'
      });
    }

    const resultado = await UbicacionBrigadaModel.registrarDivision({
      usuario_id,
      km,
      sentido,
      ruta_id,
      latitud,
      longitud,
      descripcion,
      situacion_persistente_id,
      motivo,
      ejecutado_por: ejecutadoPor
    });

    res.status(201).json({
      message: 'División de fuerza registrada',
      ubicacion: resultado
    });
  } catch (error: any) {
    console.error('Error dividiendo fuerza:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Reunir brigada con su unidad (después de división)
 */
export const reunirConUnidad = async (req: Request, res: Response) => {
  try {
    const ejecutadoPor = req.user?.userId;
    const rol = req.user?.rol;

    if (!ejecutadoPor) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (rol !== 'COP' && rol !== 'ADMIN') {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'Solo el COP puede reunir fuerzas'
      });
    }

    const {
      usuario_id,
      unidad_id,
      asignacion_id,
      km,
      ruta_id,
      latitud,
      longitud,
      motivo
    } = req.body;

    if (!usuario_id || !unidad_id || !asignacion_id || !km || !ruta_id) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere: usuario_id, unidad_id, asignacion_id, km, ruta_id'
      });
    }

    const resultado = await UbicacionBrigadaModel.reunirConUnidad({
      usuario_id,
      unidad_id,
      asignacion_id,
      km,
      ruta_id,
      latitud,
      longitud,
      motivo,
      ejecutado_por: ejecutadoPor
    });

    res.json({
      message: 'Brigada reunido con unidad',
      ubicacion: resultado
    });
  } catch (error: any) {
    console.error('Error reuniendo brigada:', error);
    res.status(500).json({ error: error.message });
  }
};

// ========================================
// CAMBIO DE UNIDAD COMPLETO
// ========================================

/**
 * Cambiar toda la tripulación a otra unidad
 */
export const cambiarUnidadCompleta = async (req: Request, res: Response) => {
  try {
    const ejecutadoPor = req.user?.userId;
    const rol = req.user?.rol;

    if (!ejecutadoPor) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (rol !== 'COP' && rol !== 'ADMIN') {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'Solo el COP puede cambiar unidades completas'
      });
    }

    const {
      usuarios_ids,  // Array de IDs de usuarios a mover
      unidad_destino_id,
      asignacion_destino_id,
      motivo,
      km,
      ruta_id,
      latitud,
      longitud
    } = req.body;

    if (!usuarios_ids || !Array.isArray(usuarios_ids) || usuarios_ids.length === 0) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere: usuarios_ids (array de IDs)'
      });
    }

    if (!unidad_destino_id || !asignacion_destino_id || !motivo || !km || !ruta_id) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere: unidad_destino_id, asignacion_destino_id, motivo, km, ruta_id'
      });
    }

    const resultados = [];

    // Procesar cada usuario en una transacción
    for (const usuario_id of usuarios_ids) {
      const resultado = await UbicacionBrigadaModel.registrarPrestamo({
        usuario_id,
        unidad_destino_id,
        asignacion_destino_id,
        motivo: `Cambio de unidad completo: ${motivo}`,
        km,
        ruta_id,
        latitud,
        longitud,
        ejecutado_por: ejecutadoPor
      });
      resultados.push(resultado);
    }

    res.status(201).json({
      message: `${resultados.length} brigadas cambiados de unidad`,
      ubicaciones: resultados
    });
  } catch (error: any) {
    console.error('Error cambiando unidad completa:', error);
    res.status(500).json({ error: error.message });
  }
};

// ========================================
// PERMISOS
// ========================================

/**
 * Obtener la unidad donde el usuario puede crear situaciones
 */
export const getMisPermisos = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const permisos = await UbicacionBrigadaModel.getUnidadPermisos(userId);
    const ubicacion = await UbicacionBrigadaModel.getUbicacionActual(userId);

    res.json({
      ...permisos,
      estado: ubicacion?.estado || null,
      unidad_origen_id: ubicacion?.unidad_origen_id || null,
      unidad_origen_codigo: ubicacion?.unidad_origen_codigo || null,
      unidad_actual_codigo: ubicacion?.unidad_actual_codigo || null,
      situacion_persistente_id: ubicacion?.situacion_persistente_id || null
    });
  } catch (error: any) {
    console.error('Error obteniendo permisos:', error);
    res.status(500).json({ error: error.message });
  }
};

// ========================================
// LISTADOS PARA COP
// ========================================

/**
 * Obtener brigadas disponibles para préstamo desde una unidad
 */
export const getBrigadasParaPrestamo = async (req: Request, res: Response) => {
  try {
    const unidadId = parseInt(req.params.unidadId);

    if (isNaN(unidadId)) {
      return res.status(400).json({ error: 'unidadId inválido' });
    }

    // Brigadas que están CON_UNIDAD en esta unidad
    const brigadas = await db.manyOrNone(`
      SELECT
        ub.usuario_id,
        u.nombre_completo,
        u.username,
        ub.estado,
        ub.unidad_actual_id,
        un.codigo as unidad_codigo,
        ub.inicio_ubicacion
      FROM ubicacion_brigada ub
      JOIN usuario u ON ub.usuario_id = u.id
      JOIN unidad un ON ub.unidad_actual_id = un.id
      WHERE ub.unidad_actual_id = $1
        AND ub.fin_ubicacion IS NULL
        AND ub.estado = 'CON_UNIDAD'
      ORDER BY u.nombre_completo
    `, [unidadId]);

    res.json(brigadas);
  } catch (error: any) {
    console.error('Error obteniendo brigadas para préstamo:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener brigadas actualmente prestados (para retorno)
 */
export const getBrigadasPrestados = async (_req: Request, res: Response) => {
  try {
    const brigadas = await db.manyOrNone(`
      SELECT
        ub.usuario_id,
        u.nombre_completo,
        u.username,
        ub.estado,
        ub.unidad_actual_id,
        ua.codigo as unidad_actual_codigo,
        ub.unidad_origen_id,
        uo.codigo as unidad_origen_codigo,
        ub.inicio_ubicacion,
        ub.motivo
      FROM ubicacion_brigada ub
      JOIN usuario u ON ub.usuario_id = u.id
      LEFT JOIN unidad ua ON ub.unidad_actual_id = ua.id
      LEFT JOIN unidad uo ON ub.unidad_origen_id = uo.id
      WHERE ub.fin_ubicacion IS NULL
        AND ub.estado = 'PRESTADO'
      ORDER BY ub.inicio_ubicacion DESC
    `);

    res.json(brigadas);
  } catch (error: any) {
    console.error('Error obteniendo brigadas prestados:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener brigadas en puntos fijos (para reunión)
 */
export const getBrigadasEnPuntoFijo = async (_req: Request, res: Response) => {
  try {
    const brigadas = await db.manyOrNone(`
      SELECT
        ub.usuario_id,
        u.nombre_completo,
        u.username,
        ub.estado,
        ub.unidad_origen_id,
        uo.codigo as unidad_origen_codigo,
        ub.punto_fijo_km,
        ub.punto_fijo_sentido,
        r.codigo as punto_fijo_ruta_codigo,
        ub.punto_fijo_descripcion,
        ub.situacion_persistente_id,
        sp.titulo as situacion_persistente_titulo,
        ub.inicio_ubicacion,
        ub.motivo
      FROM ubicacion_brigada ub
      JOIN usuario u ON ub.usuario_id = u.id
      LEFT JOIN unidad uo ON ub.unidad_origen_id = uo.id
      LEFT JOIN ruta r ON ub.punto_fijo_ruta_id = r.id
      LEFT JOIN situacion_persistente sp ON ub.situacion_persistente_id = sp.id
      WHERE ub.fin_ubicacion IS NULL
        AND ub.estado = 'EN_PUNTO_FIJO'
      ORDER BY ub.inicio_ubicacion DESC
    `);

    res.json(brigadas);
  } catch (error: any) {
    console.error('Error obteniendo brigadas en punto fijo:', error);
    res.status(500).json({ error: error.message });
  }
};
