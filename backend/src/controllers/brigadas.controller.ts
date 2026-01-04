import { Request, Response } from 'express';
import { db } from '../config/database';

// GET /api/brigadas - Listar todas las brigadas (usuarios con rol BRIGADA)
export async function listarBrigadas(req: Request, res: Response) {
  try {
    const { sede_id, activa, search } = req.query;
    const user = req.user!;

    let query = `
      SELECT
        u.id,
        u.chapa,
        u.nombre_completo as nombre,
        u.telefono,
        u.email,
        u.sede_id,
        s.nombre as sede_nombre,
        u.grupo,
        u.activo as activa,
        u.rol_brigada,
        u.custom_fields,
        u.created_at
      FROM usuario u
      JOIN sede s ON u.sede_id = s.id
      JOIN rol r ON u.rol_id = r.id
      WHERE r.nombre = 'BRIGADA'
    `;
    const params: any[] = [];
    let paramCount = 0;

    // ENCARGADO_NOMINAS sin puede_ver_todas_sedes solo ve su sede
    // (Si tiene puede_ver_todas_sedes=true, puede ver todas pero en modo lectura)
    const filtrarPorSedeDelUsuario = user.rol === 'ENCARGADO_NOMINAS' && !user.puede_ver_todas_sedes;

    if (filtrarPorSedeDelUsuario && user.sede) {
      params.push(user.sede);
      query += ` AND u.sede_id = $${++paramCount}`;
    } else if (sede_id) {
      params.push(sede_id);
      query += ` AND u.sede_id = $${++paramCount}`;
    }

    if (activa !== undefined) {
      params.push(activa === 'true');
      query += ` AND u.activo = $${++paramCount}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (u.nombre_completo ILIKE $${++paramCount} OR u.chapa ILIKE $${paramCount})`;
    }

    query += ' ORDER BY u.nombre_completo';

    const brigadas = await db.manyOrNone(query, params);
    return res.json({ brigadas, total: brigadas.length });
  } catch (error) {
    console.error('Error en listarBrigadas:', error);
    return res.status(500).json({ error: 'Error al listar brigadas' });
  }
}

// GET /api/brigadas/:id - Obtener una brigada
export async function obtenerBrigada(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const brigada = await db.oneOrNone(`
      SELECT
        u.id,
        u.chapa,
        u.nombre_completo as nombre,
        u.telefono,
        u.email,
        u.sede_id,
        s.nombre as sede_nombre,
        u.grupo,
        u.activo as activa,
        u.rol_brigada,
        u.custom_fields,
        u.created_at
      FROM usuario u
      JOIN sede s ON u.sede_id = s.id
      JOIN rol r ON u.rol_id = r.id
      WHERE u.id = $1 AND r.nombre = 'BRIGADA'
    `, [id]);

    if (!brigada) {
      return res.status(404).json({ error: 'Brigada no encontrada' });
    }

    return res.json(brigada);
  } catch (error) {
    console.error('Error en obtenerBrigada:', error);
    return res.status(500).json({ error: 'Error al obtener brigada' });
  }
}

// POST /api/brigadas - Crear brigada (nuevo usuario con rol BRIGADA)
export async function crearBrigada(req: Request, res: Response) {
  try {
    const {
      chapa,
      nombre,
      sede_id,
      telefono,
      email,
      grupo,
      rol_brigada
    } = req.body;

    if (!chapa || !nombre || !sede_id) {
      return res.status(400).json({ error: 'Chapa, nombre y sede_id son requeridos' });
    }

    // Verificar que no exista la chapa
    const existe = await db.oneOrNone('SELECT id FROM usuario WHERE chapa = $1', [chapa]);
    if (existe) {
      return res.status(409).json({ error: 'Ya existe un usuario con esa chapa' });
    }

    // Obtener rol BRIGADA
    const rolBrigada = await db.one("SELECT id FROM rol WHERE nombre = 'BRIGADA'");

    // password123 - hash bcrypt
    const passwordHash = '$2a$10$4iU3aBD9Xbl2jPuGqIejme7Mcu0X7XMocqnfW7yhu9f2ku8hu65Xm';

    const brigada = await db.one(`
      INSERT INTO usuario (username, password_hash, nombre_completo, email, telefono, rol_id, sede_id, chapa, grupo, rol_brigada)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $1, $8, $9)
      RETURNING id, chapa, nombre_completo as nombre, telefono, email, sede_id, grupo, rol_brigada, activo as activa
    `, [chapa, passwordHash, nombre, email, telefono, rolBrigada.id, sede_id, grupo, rol_brigada]);

    return res.status(201).json({ message: 'Brigada creada exitosamente', brigada });
  } catch (error: any) {
    console.error('Error en crearBrigada:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'La chapa o email ya existe' });
    }
    return res.status(500).json({ error: 'Error al crear brigada' });
  }
}

// PUT /api/brigadas/:id - Actualizar brigada
export async function actualizarBrigada(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user!;
    const {
      nombre,
      sede_id,
      telefono,
      email,
      grupo,
      rol_brigada
    } = req.body;

    const brigada = await db.oneOrNone(`
      SELECT u.id, u.sede_id, u.chapa FROM usuario u
      JOIN rol r ON u.rol_id = r.id
      WHERE u.id = $1 AND r.nombre = 'BRIGADA'
    `, [id]);

    if (!brigada) {
      return res.status(404).json({ error: 'Brigada no encontrada' });
    }

    // ENCARGADO_NOMINAS sin puede_ver_todas_sedes solo puede editar brigadas de su sede
    if (user.rol === 'ENCARGADO_NOMINAS' && !user.puede_ver_todas_sedes && brigada.sede_id !== user.sede) {
      return res.status(403).json({ error: 'No tiene permiso para editar brigadas de otras sedes' });
    }

    // Verificar si la chapa cambió y si está disponible
    if (req.body.chapa && req.body.chapa.toUpperCase() !== brigada.chapa) {
      const existe = await db.oneOrNone('SELECT id FROM usuario WHERE chapa = $1', [req.body.chapa.toUpperCase()]);
      if (existe) {
        return res.status(409).json({ error: 'Ya existe un usuario con esa chapa' });
      }
    }

    const emailValue = email && email.trim() !== '' ? email.trim() : null;
    const telefonoValue = telefono && telefono.trim() !== '' ? telefono.trim() : null;
    const chapaValue = req.body.chapa ? req.body.chapa.toUpperCase() : undefined;

    const result = await db.one(`
      UPDATE usuario SET
        nombre_completo = COALESCE($1, nombre_completo),
        sede_id = COALESCE($2, sede_id),
        telefono = $3,
        email = $4,

        grupo = $5,
        rol_brigada = $6,
        chapa = COALESCE($7, chapa),
        username = COALESCE($7, username),
        custom_fields = COALESCE($9, custom_fields),
        updated_at = NOW()
      WHERE id = $8
      RETURNING id, chapa, nombre_completo as nombre, telefono, email, sede_id, grupo, rol_brigada, custom_fields, activo as activa
    `, [nombre, sede_id, telefonoValue, emailValue, grupo, rol_brigada, chapaValue, id, req.body.custom_fields || null]);

    return res.json({ message: 'Brigada actualizada exitosamente', brigada: result });
  } catch (error) {
    console.error('Error en actualizarBrigada:', error);
    return res.status(500).json({ error: 'Error al actualizar brigada' });
  }
}

// PUT /api/brigadas/:id/desactivar - Desactivar brigada con motivo
export async function desactivarBrigada(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { motivo_codigo, fecha_fin_estimada, observaciones } = req.body;
    const user = req.user!;

    if (!motivo_codigo) {
      return res.status(400).json({ error: 'motivo_codigo es requerido' });
    }

    const brigada = await db.oneOrNone(`
      SELECT u.id, u.nombre_completo, u.sede_id FROM usuario u
      JOIN rol r ON u.rol_id = r.id
      WHERE u.id = $1 AND r.nombre = 'BRIGADA'
    `, [id]);

    if (!brigada) {
      return res.status(404).json({ error: 'Brigada no encontrada' });
    }

    // ENCARGADO_NOMINAS sin puede_ver_todas_sedes solo puede desactivar brigadas de su sede
    if (user.rol === 'ENCARGADO_NOMINAS' && !user.puede_ver_todas_sedes && brigada.sede_id !== user.sede) {
      return res.status(403).json({ error: 'No tiene permiso para desactivar brigadas de otras sedes' });
    }

    // Obtener el motivo del catálogo
    const motivo = await db.oneOrNone(`
      SELECT id, nombre, requiere_fecha_fin FROM catalogo_motivo_inactividad WHERE codigo = $1 AND activo = true
    `, [motivo_codigo]);

    if (!motivo) {
      return res.status(400).json({ error: 'Motivo de inactividad no válido' });
    }

    // Validar fecha_fin_estimada si el motivo lo requiere
    if (motivo.requiere_fecha_fin && !fecha_fin_estimada) {
      return res.status(400).json({
        error: `El motivo "${motivo.nombre}" requiere fecha estimada de regreso`
      });
    }

    // Desactivar usuario
    await db.none('UPDATE usuario SET activo = false WHERE id = $1', [id]);

    // Registrar motivo de inactividad
    await db.none(`
      INSERT INTO usuario_inactividad (usuario_id, motivo_id, fecha_fin_estimada, observaciones, registrado_por)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, motivo.id, fecha_fin_estimada || null, observaciones || null, user.userId]);

    return res.json({
      message: 'Brigada desactivada exitosamente',
      brigada: brigada.nombre_completo,
      motivo: motivo.nombre,
      fecha_fin_estimada
    });
  } catch (error) {
    console.error('Error en desactivarBrigada:', error);
    return res.status(500).json({ error: 'Error al desactivar brigada' });
  }
}

// PUT /api/brigadas/:id/activar - Activar brigada (cerrar periodo de inactividad)
export async function activarBrigada(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user!;

    const brigada = await db.oneOrNone(`
      SELECT u.id, u.nombre_completo, u.sede_id FROM usuario u
      JOIN rol r ON u.rol_id = r.id
      WHERE u.id = $1 AND r.nombre = 'BRIGADA'
    `, [id]);

    if (!brigada) {
      return res.status(404).json({ error: 'Brigada no encontrada' });
    }

    // ENCARGADO_NOMINAS sin puede_ver_todas_sedes solo puede activar brigadas de su sede
    if (user.rol === 'ENCARGADO_NOMINAS' && !user.puede_ver_todas_sedes && brigada.sede_id !== user.sede) {
      return res.status(403).json({ error: 'No tiene permiso para activar brigadas de otras sedes' });
    }

    // Activar usuario
    await db.none('UPDATE usuario SET activo = true WHERE id = $1', [id]);

    // Cerrar registros de inactividad abiertos
    await db.none(`
      UPDATE usuario_inactividad
      SET fecha_fin_real = CURRENT_DATE, reactivado_por = $2, updated_at = NOW()
      WHERE usuario_id = $1 AND fecha_fin_real IS NULL
    `, [id, user.userId]);

    return res.json({
      message: 'Brigada activada exitosamente',
      brigada: brigada.nombre_completo
    });
  } catch (error) {
    console.error('Error en activarBrigada:', error);
    return res.status(500).json({ error: 'Error al activar brigada' });
  }
}

// PUT /api/brigadas/:id/transferir - Transferir brigada a otra sede
export async function transferirBrigada(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { nueva_sede_id } = req.body;
    const user = req.user!;

    if (!nueva_sede_id) {
      return res.status(400).json({ error: 'nueva_sede_id es requerido' });
    }

    const brigada = await db.oneOrNone(`
      SELECT u.id, u.sede_id FROM usuario u
      JOIN rol r ON u.rol_id = r.id
      WHERE u.id = $1 AND r.nombre = 'BRIGADA'
    `, [id]);

    if (!brigada) {
      return res.status(404).json({ error: 'Brigada no encontrada' });
    }

    // ENCARGADO_NOMINAS sin puede_ver_todas_sedes solo puede transferir brigadas de su sede
    if (user.rol === 'ENCARGADO_NOMINAS' && !user.puede_ver_todas_sedes && brigada.sede_id !== user.sede) {
      return res.status(403).json({ error: 'No tiene permiso para transferir brigadas de otras sedes' });
    }

    // Verificar que la nueva sede existe
    const sede = await db.oneOrNone('SELECT id FROM sede WHERE id = $1', [nueva_sede_id]);
    if (!sede) {
      return res.status(404).json({ error: 'Sede destino no encontrada' });
    }

    // Solo actualizar la sede del usuario (sin registrar en reasignacion_sede por ahora)
    await db.none('UPDATE usuario SET sede_id = $1 WHERE id = $2', [nueva_sede_id, id]);

    return res.json({ message: 'Brigada transferida exitosamente' });
  } catch (error) {
    console.error('Error en transferirBrigada:', error);
    return res.status(500).json({ error: 'Error al transferir brigada' });
  }
}

// DELETE /api/brigadas/:id - Eliminar brigada (solo si no tiene historial)
export async function eliminarBrigada(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user!;

    const brigada = await db.oneOrNone(`
      SELECT u.id, u.nombre_completo, u.sede_id FROM usuario u
      JOIN rol r ON u.rol_id = r.id
      WHERE u.id = $1 AND r.nombre = 'BRIGADA'
    `, [id]);

    if (!brigada) {
      return res.status(404).json({ error: 'Brigada no encontrada' });
    }

    // ENCARGADO_NOMINAS sin puede_ver_todas_sedes solo puede eliminar brigadas de su sede
    if (user.rol === 'ENCARGADO_NOMINAS' && !user.puede_ver_todas_sedes && brigada.sede_id !== user.sede) {
      return res.status(403).json({ error: 'No tiene permiso para eliminar brigadas de otras sedes' });
    }

    // Verificar que no tenga historial en ninguna tabla
    const verificaciones = await db.one(`
      SELECT
        (SELECT COUNT(*) FROM tripulacion_turno WHERE usuario_id = $1) as turnos,
        (SELECT COUNT(*) FROM situacion WHERE creado_por = $1) as situaciones,
        (SELECT COUNT(*) FROM incidente WHERE creado_por = $1) as incidentes,
        (SELECT COUNT(*) FROM salida_unidad WHERE brigada_id = $1) as salidas,
        (SELECT COUNT(*) FROM movimiento_brigada WHERE usuario_id = $1) as movimientos
    `, [id]);

    const historial: string[] = [];
    if (parseInt(verificaciones.turnos) > 0) historial.push(`${verificaciones.turnos} turnos`);
    if (parseInt(verificaciones.situaciones) > 0) historial.push(`${verificaciones.situaciones} situaciones`);
    if (parseInt(verificaciones.incidentes) > 0) historial.push(`${verificaciones.incidentes} incidentes`);
    if (parseInt(verificaciones.salidas) > 0) historial.push(`${verificaciones.salidas} salidas`);
    if (parseInt(verificaciones.movimientos) > 0) historial.push(`${verificaciones.movimientos} movimientos`);

    if (historial.length > 0) {
      return res.status(400).json({
        error: `No se puede eliminar la brigada porque tiene historial: ${historial.join(', ')}. Use desactivar en su lugar.`
      });
    }

    // Eliminar registros relacionados (los que tienen CASCADE se eliminan automáticamente)
    // Solo necesitamos eliminar manualmente los que NO tienen CASCADE
    await db.none('DELETE FROM brigada_unidad WHERE brigada_id = $1', [id]);
    await db.none('DELETE FROM brigada WHERE usuario_id = $1', [id]);

    // Eliminar usuario
    await db.none('DELETE FROM usuario WHERE id = $1', [id]);

    return res.json({ message: 'Brigada eliminada exitosamente', brigada: brigada.nombre_completo });
  } catch (error: any) {
    console.error('Error en eliminarBrigada:', error);
    // Manejar errores de FK que no detectamos
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'No se puede eliminar la brigada porque tiene registros asociados. Use desactivar en su lugar.'
      });
    }
    return res.status(500).json({ error: 'Error al eliminar brigada' });
  }
}

// =====================================================
// GESTIÓN DE ROLES
// =====================================================

// GET /api/brigadas/catalogo/motivos-inactividad - Obtener catálogo de motivos
export async function getMotivosInactividad(_req: Request, res: Response) {
  try {
    const motivos = await db.manyOrNone(`
      SELECT codigo, nombre, descripcion, requiere_fecha_fin
      FROM catalogo_motivo_inactividad
      WHERE activo = true
      ORDER BY orden
    `);
    return res.json({ motivos });
  } catch (error) {
    console.error('Error en getMotivosInactividad:', error);
    return res.status(500).json({ error: 'Error al obtener motivos de inactividad' });
  }
}

// GET /api/brigadas/catalogo/roles - Obtener roles disponibles para asignar
export async function getRolesDisponibles(_req: Request, res: Response) {
  try {
    const roles = await db.manyOrNone(`
      SELECT id, nombre, descripcion
      FROM rol
      WHERE nombre IN ('COP', 'OPERACIONES', 'ACCIDENTOLOGIA', 'ENCARGADO_NOMINAS', 'BRIGADA')
      ORDER BY nombre
    `);
    return res.json({ roles });
  } catch (error) {
    console.error('Error en getRolesDisponibles:', error);
    return res.status(500).json({ error: 'Error al obtener roles' });
  }
}

// GET /api/brigadas/usuarios-sistema - Obtener usuarios con roles del sistema (no BRIGADA)
export async function getUsuariosSistema(req: Request, res: Response) {
  try {
    const user = req.user!;

    // Solo ENCARGADO_NOMINAS Central o ADMIN pueden ver esto
    if (user.rol !== 'ADMIN' && !(user.rol === 'ENCARGADO_NOMINAS' && user.puede_ver_todas_sedes)) {
      return res.status(403).json({ error: 'No tiene permiso para acceder a esta informacion' });
    }

    const usuarios = await db.manyOrNone(`
      SELECT
        u.id,
        u.username,
        u.nombre_completo,
        u.rol_id,
        r.nombre as rol_nombre,
        u.sede_id,
        s.nombre as sede_nombre,
        u.activo,
        u.puede_ver_todas_sedes
      FROM usuario u
      JOIN rol r ON u.rol_id = r.id
      LEFT JOIN sede s ON u.sede_id = s.id
      WHERE r.nombre != 'BRIGADA'
      ORDER BY r.nombre, u.nombre_completo
    `);

    return res.json({ usuarios, total: usuarios.length });
  } catch (error) {
    console.error('Error en getUsuariosSistema:', error);
    return res.status(500).json({ error: 'Error al obtener usuarios del sistema' });
  }
}

// GET /api/brigadas/:id/roles - Obtener roles de una brigada
export async function getRolesBrigada(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const roles = await db.manyOrNone(`
      SELECT
        ur.id,
        ur.rol_id,
        r.nombre as rol_nombre,
        ur.sede_id,
        s.nombre as sede_nombre,
        ur.es_rol_principal,
        ur.activo,
        ur.fecha_asignacion
      FROM usuario_rol ur
      JOIN rol r ON ur.rol_id = r.id
      LEFT JOIN sede s ON ur.sede_id = s.id
      WHERE ur.usuario_id = $1
      ORDER BY ur.es_rol_principal DESC, r.nombre
    `, [id]);

    return res.json({ roles });
  } catch (error) {
    console.error('Error en getRolesBrigada:', error);
    return res.status(500).json({ error: 'Error al obtener roles de brigada' });
  }
}

// POST /api/brigadas/:id/roles - Asignar rol a brigada
export async function asignarRolBrigada(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { rol_id, sede_id, es_rol_principal } = req.body;
    const user = req.user!;

    // ENCARGADO_NOMINAS sin puede_ver_todas_sedes NO puede asignar roles
    if (user.rol === 'ENCARGADO_NOMINAS' && !user.puede_ver_todas_sedes) {
      return res.status(403).json({ error: 'No tiene permiso para asignar roles' });
    }

    if (!rol_id) {
      return res.status(400).json({ error: 'rol_id es requerido' });
    }

    // Verificar que el usuario existe
    const usuario = await db.oneOrNone('SELECT id, sede_id FROM usuario WHERE id = $1', [id]);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que el rol existe y es asignable
    const rol = await db.oneOrNone(`
      SELECT id, nombre FROM rol WHERE id = $1 AND nombre IN ('COP', 'OPERACIONES', 'ACCIDENTOLOGIA', 'ENCARGADO_NOMINAS', 'BRIGADA')
    `, [rol_id]);

    if (!rol) {
      return res.status(400).json({ error: 'Rol no válido o no asignable' });
    }

    // Si es rol principal, quitar el flag de otros roles
    if (es_rol_principal) {
      await db.none('UPDATE usuario_rol SET es_rol_principal = false WHERE usuario_id = $1', [id]);
      // También actualizar el rol_id principal en la tabla usuario
      await db.none('UPDATE usuario SET rol_id = $1 WHERE id = $2', [rol_id, id]);
    }

    // Insertar o actualizar el rol
    const result = await db.one(`
      INSERT INTO usuario_rol (usuario_id, rol_id, sede_id, es_rol_principal, asignado_por)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (usuario_id, rol_id, sede_id)
      DO UPDATE SET activo = true, es_rol_principal = $4, fecha_revocacion = NULL
      RETURNING id
    `, [id, rol_id, sede_id || null, es_rol_principal || false, user.userId]);

    return res.json({
      message: 'Rol asignado exitosamente',
      usuario_rol_id: result.id,
      rol: rol.nombre
    });
  } catch (error) {
    console.error('Error en asignarRolBrigada:', error);
    return res.status(500).json({ error: 'Error al asignar rol' });
  }
}

// DELETE /api/brigadas/:id/roles/:rolId - Revocar rol de brigada
export async function revocarRolBrigada(req: Request, res: Response) {
  try {
    const { id, rolId } = req.params;
    const user = req.user!;

    // ENCARGADO_NOMINAS sin puede_ver_todas_sedes NO puede revocar roles
    if (user.rol === 'ENCARGADO_NOMINAS' && !user.puede_ver_todas_sedes) {
      return res.status(403).json({ error: 'No tiene permiso para revocar roles' });
    }

    // No permitir revocar el rol BRIGADA si es el único
    const rolesActivos = await db.one(`
      SELECT COUNT(*) as total FROM usuario_rol WHERE usuario_id = $1 AND activo = true
    `, [id]);

    if (parseInt(rolesActivos.total) <= 1) {
      return res.status(400).json({ error: 'No se puede revocar el único rol activo' });
    }

    await db.none(`
      UPDATE usuario_rol
      SET activo = false, fecha_revocacion = NOW()
      WHERE usuario_id = $1 AND rol_id = $2
    `, [id, rolId]);

    return res.json({ message: 'Rol revocado exitosamente' });
  } catch (error) {
    console.error('Error en revocarRolBrigada:', error);
    return res.status(500).json({ error: 'Error al revocar rol' });
  }
}

// GET /api/brigadas/:id/inactividad - Obtener historial de inactividad
export async function getHistorialInactividad(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const historial = await db.manyOrNone(`
      SELECT
        ui.id,
        c.codigo as motivo_codigo,
        c.nombre as motivo_nombre,
        ui.fecha_inicio,
        ui.fecha_fin_estimada,
        ui.fecha_fin_real,
        ui.observaciones,
        reg.nombre_completo as registrado_por_nombre,
        react.nombre_completo as reactivado_por_nombre,
        ui.created_at
      FROM usuario_inactividad ui
      JOIN catalogo_motivo_inactividad c ON ui.motivo_id = c.id
      LEFT JOIN usuario reg ON ui.registrado_por = reg.id
      LEFT JOIN usuario react ON ui.reactivado_por = react.id
      WHERE ui.usuario_id = $1
      ORDER BY ui.fecha_inicio DESC
    `, [id]);

    // Obtener el motivo actual si está inactivo
    const motivoActual = await db.oneOrNone(`
      SELECT * FROM get_motivo_inactividad_actual($1)
    `, [id]);

    return res.json({ historial, motivo_actual: motivoActual });
  } catch (error) {
    console.error('Error en getHistorialInactividad:', error);
    return res.status(500).json({ error: 'Error al obtener historial de inactividad' });
  }
}
