import { Request, Response } from 'express';
import { AdministracionModel } from '../models/administracion.model';
import { esSuperAdmin, puedeVerTodosDepartamentos } from '../middlewares/superAdmin';

// =====================================================
// DEPARTAMENTOS
// =====================================================

export async function getDepartamentos(_req: Request, res: Response) {
  try {
    const departamentos = await AdministracionModel.getDepartamentos();
    res.json(departamentos);
  } catch (error) {
    console.error('Error al obtener departamentos:', error);
    res.status(500).json({ error: 'Error al obtener departamentos' });
  }
}

// =====================================================
// ESTADO DE GRUPOS
// =====================================================

export async function getEstadoGrupos(req: Request, res: Response) {
  try {
    const { sede_id, departamento_id } = req.query;

    // Si no puede ver todos los departamentos, filtrar por su sede
    let sedeIdFiltro = sede_id ? parseInt(sede_id as string) : undefined;
    if (!await puedeVerTodosDepartamentos(req) && req.user?.sede) {
      sedeIdFiltro = req.user.sede;
    }

    const estados = await AdministracionModel.getEstadoGrupos(
      sedeIdFiltro,
      departamento_id ? parseInt(departamento_id as string) : undefined
    );

    res.json(estados);
  } catch (error) {
    console.error('Error al obtener estado de grupos:', error);
    res.status(500).json({ error: 'Error al obtener estado de grupos' });
  }
}

export async function toggleGrupo(req: Request, res: Response) {
  try {
    const { departamento_id, sede_id, grupo, activo, observaciones, aplicar_todas_sedes, aplicar_todos_departamentos } = req.body;

    if (departamento_id === undefined || grupo === undefined || activo === undefined) {
      return res.status(400).json({ error: 'Faltan parametros requeridos' });
    }

    const modificadoPor = req.user!.userId;
    let registrosAfectados = 0;

    if (aplicar_todas_sedes) {
      // Aplicar a todas las sedes para un departamento
      registrosAfectados = await AdministracionModel.toggleGrupoTodasSedes(
        departamento_id, grupo, activo, modificadoPor, observaciones
      );
    } else if (aplicar_todos_departamentos && sede_id) {
      // Aplicar a todos los departamentos para una sede
      registrosAfectados = await AdministracionModel.toggleGrupoTodosDepartamentos(
        sede_id, grupo, activo, modificadoPor, observaciones
      );
    } else if (sede_id) {
      // Aplicar solo a un departamento/sede especifica
      await AdministracionModel.toggleGrupo(
        departamento_id, sede_id, grupo, activo, modificadoPor, observaciones
      );
      registrosAfectados = 1;
    } else {
      return res.status(400).json({ error: 'Debe especificar sede_id o aplicar_todas_sedes' });
    }

    // Registrar en log
    await AdministracionModel.registrarAccion('TOGGLE_GRUPO', modificadoPor, {
      tablaAfectada: 'estado_grupo_departamento',
      datosNuevos: { departamento_id, sede_id, grupo, activo, observaciones },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Grupo ${activo ? 'activado' : 'desactivado'} correctamente`,
      registros_afectados: registrosAfectados
    });
  } catch (error) {
    console.error('Error al cambiar estado de grupo:', error);
    res.status(500).json({ error: 'Error al cambiar estado de grupo' });
  }
}

// =====================================================
// ENCARGADOS
// =====================================================

export async function getEncargados(req: Request, res: Response) {
  try {
    const { sede_id } = req.query;

    let sedeIdFiltro = sede_id ? parseInt(sede_id as string) : undefined;
    if (!await puedeVerTodosDepartamentos(req) && req.user?.sede) {
      sedeIdFiltro = req.user.sede;
    }

    const encargados = await AdministracionModel.getEncargadosActuales(sedeIdFiltro);
    res.json(encargados);
  } catch (error) {
    console.error('Error al obtener encargados:', error);
    res.status(500).json({ error: 'Error al obtener encargados' });
  }
}

export async function asignarEncargado(req: Request, res: Response) {
  try {
    const { usuario_id, sede_id, grupo, motivo } = req.body;

    if (!usuario_id || !sede_id || grupo === undefined) {
      return res.status(400).json({ error: 'Faltan parametros requeridos' });
    }

    const asignadoPor = req.user!.userId;

    // Verificar si ya hay encargado y obtener datos para log
    const encargadoAnterior = await AdministracionModel.getEncargadoPorSedeGrupo(sede_id, grupo);

    const asignacionId = await AdministracionModel.asignarEncargado(
      usuario_id, sede_id, grupo, asignadoPor, motivo
    );

    // Registrar en log
    await AdministracionModel.registrarAccion('ASIGNAR_ENCARGADO', asignadoPor, {
      tablaAfectada: 'historial_encargado_sede_grupo',
      registroId: asignacionId,
      usuarioAfectadoId: usuario_id,
      datosAnteriores: encargadoAnterior ? { usuario_id: encargadoAnterior.usuario_id } : undefined,
      datosNuevos: { usuario_id, sede_id, grupo, motivo },
      ipAddress: req.ip
    });

    // Obtener datos del nuevo encargado
    const nuevoEncargado = await AdministracionModel.getEncargadoPorSedeGrupo(sede_id, grupo);

    res.json({
      success: true,
      message: 'Encargado asignado correctamente',
      asignacion_id: asignacionId,
      encargado: nuevoEncargado
    });
  } catch (error) {
    console.error('Error al asignar encargado:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    res.status(500).json({ error: 'Error al asignar encargado', message: errorMessage });
  }
}

export async function removerEncargado(req: Request, res: Response) {
  try {
    const { sede_id, grupo } = req.params;
    const { motivo } = req.body;

    if (!sede_id || grupo === undefined) {
      return res.status(400).json({ error: 'Faltan parametros requeridos' });
    }

    const removidoPor = req.user!.userId;

    // Obtener encargado actual para log
    const encargadoActual = await AdministracionModel.getEncargadoPorSedeGrupo(
      parseInt(sede_id), parseInt(grupo) as 0 | 1 | 2
    );

    const removido = await AdministracionModel.removerEncargado(
      parseInt(sede_id), parseInt(grupo) as 0 | 1 | 2, removidoPor, motivo
    );

    if (!removido) {
      return res.status(404).json({ error: 'No hay encargado asignado para esta sede/grupo' });
    }

    // Registrar en log
    await AdministracionModel.registrarAccion('REMOVER_ENCARGADO', removidoPor, {
      tablaAfectada: 'historial_encargado_sede_grupo',
      usuarioAfectadoId: encargadoActual?.usuario_id,
      datosAnteriores: encargadoActual ? { usuario_id: encargadoActual.usuario_id } : undefined,
      datosNuevos: { motivo },
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Encargado removido correctamente' });
  } catch (error) {
    console.error('Error al remover encargado:', error);
    res.status(500).json({ error: 'Error al remover encargado' });
  }
}

export async function getHistorialEncargados(req: Request, res: Response) {
  try {
    const { sede_id } = req.params;
    const { grupo } = req.query;

    const historial = await AdministracionModel.getHistorialEncargados(
      parseInt(sede_id),
      grupo !== undefined ? parseInt(grupo as string) as 0 | 1 | 2 : undefined
    );

    res.json(historial);
  } catch (error) {
    console.error('Error al obtener historial de encargados:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
}

// =====================================================
// USUARIOS
// =====================================================

export async function getUsuarios(req: Request, res: Response) {
  try {
    const { departamento, sede_id, grupo, activo, busqueda } = req.query;

    // Si no puede ver todos los departamentos, filtrar por su sede
    let sedeIdFiltro = sede_id ? parseInt(sede_id as string) : undefined;
    if (!await puedeVerTodosDepartamentos(req) && req.user?.sede) {
      sedeIdFiltro = req.user.sede;
    }

    const usuarios = await AdministracionModel.getUsuarios({
      departamento: departamento as string,
      sedeId: sedeIdFiltro,
      grupo: grupo !== undefined
        ? (grupo === 'null' ? null : parseInt(grupo as string) as 0 | 1 | 2)
        : undefined,
      activo: activo !== undefined ? activo === 'true' : undefined,
      busqueda: busqueda as string
    });

    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
}

export async function getUsuario(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const usuario = await AdministracionModel.getUsuario(parseInt(id));

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
}

export async function toggleUsuario(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    if (activo === undefined) {
      return res.status(400).json({ error: 'Falta parametro activo' });
    }

    const usuarioId = parseInt(id);
    const modificadoPor = req.user!.userId;

    // Obtener datos anteriores
    const usuarioAnterior = await AdministracionModel.getUsuario(usuarioId);
    if (!usuarioAnterior) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await AdministracionModel.toggleAccesoUsuario(usuarioId, activo);

    // Registrar en log
    await AdministracionModel.registrarAccion('TOGGLE_USUARIO', modificadoPor, {
      tablaAfectada: 'usuario',
      registroId: usuarioId,
      usuarioAfectadoId: usuarioId,
      datosAnteriores: { activo: usuarioAnterior.activo },
      datosNuevos: { activo },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Usuario ${activo ? 'activado' : 'desactivado'} correctamente`
    });
  } catch (error) {
    console.error('Error al cambiar estado de usuario:', error);
    res.status(500).json({ error: 'Error al cambiar estado de usuario' });
  }
}

export async function toggleAccesoApp(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { acceso_app_activo } = req.body;

    if (acceso_app_activo === undefined) {
      return res.status(400).json({ error: 'Falta parametro acceso_app_activo' });
    }

    const usuarioId = parseInt(id);
    const modificadoPor = req.user!.userId;

    const usuarioAnterior = await AdministracionModel.getUsuario(usuarioId);
    if (!usuarioAnterior) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await AdministracionModel.toggleAccesoAppUsuario(usuarioId, acceso_app_activo);

    await AdministracionModel.registrarAccion('TOGGLE_ACCESO_APP', modificadoPor, {
      tablaAfectada: 'usuario',
      registroId: usuarioId,
      usuarioAfectadoId: usuarioId,
      datosAnteriores: { acceso_app_activo: usuarioAnterior.acceso_app_activo },
      datosNuevos: { acceso_app_activo },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Acceso a app ${acceso_app_activo ? 'activado' : 'desactivado'} correctamente`
    });
  } catch (error) {
    console.error('Error al cambiar acceso a app:', error);
    res.status(500).json({ error: 'Error al cambiar acceso a app' });
  }
}

export async function cambiarGrupoUsuario(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { grupo } = req.body;

    // grupo puede ser 0, 1, 2 o null
    if (grupo !== null && grupo !== 0 && grupo !== 1 && grupo !== 2) {
      return res.status(400).json({ error: 'Grupo debe ser 0, 1, 2 o null' });
    }

    const usuarioId = parseInt(id);
    const modificadoPor = req.user!.userId;

    const usuarioAnterior = await AdministracionModel.getUsuario(usuarioId);
    if (!usuarioAnterior) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await AdministracionModel.cambiarGrupoUsuario(usuarioId, grupo);

    await AdministracionModel.registrarAccion('CAMBIAR_GRUPO', modificadoPor, {
      tablaAfectada: 'usuario',
      registroId: usuarioId,
      usuarioAfectadoId: usuarioId,
      datosAnteriores: { grupo: usuarioAnterior.grupo },
      datosNuevos: { grupo },
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Grupo cambiado correctamente' });
  } catch (error) {
    console.error('Error al cambiar grupo:', error);
    res.status(500).json({ error: 'Error al cambiar grupo' });
  }
}

export async function cambiarRolUsuario(req: Request, res: Response) {
  try {
    // Solo SUPER_ADMIN puede cambiar roles
    if (!esSuperAdmin(req)) {
      return res.status(403).json({ error: 'Solo SUPER_ADMIN puede cambiar roles' });
    }

    const { id } = req.params;
    const { rol_id } = req.body;

    if (!rol_id) {
      return res.status(400).json({ error: 'Falta parametro rol_id' });
    }

    const usuarioId = parseInt(id);
    const modificadoPor = req.user!.userId;

    const usuarioAnterior = await AdministracionModel.getUsuario(usuarioId);
    if (!usuarioAnterior) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await AdministracionModel.cambiarRolUsuario(usuarioId, rol_id);

    await AdministracionModel.registrarAccion('CAMBIAR_ROL', modificadoPor, {
      tablaAfectada: 'usuario',
      registroId: usuarioId,
      usuarioAfectadoId: usuarioId,
      datosAnteriores: { rol: usuarioAnterior.rol_codigo },
      datosNuevos: { rol_id },
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Rol cambiado correctamente' });
  } catch (error) {
    console.error('Error al cambiar rol:', error);
    res.status(500).json({ error: 'Error al cambiar rol' });
  }
}

export async function cambiarSubRolCop(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { sub_rol_cop_id } = req.body;

    const usuarioId = parseInt(id);
    const modificadoPor = req.user!.userId;

    const usuarioAnterior = await AdministracionModel.getUsuario(usuarioId);
    if (!usuarioAnterior) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que el usuario es COP
    if (usuarioAnterior.rol_codigo !== 'COP') {
      return res.status(400).json({ error: 'Solo usuarios COP pueden tener sub-rol COP' });
    }

    await AdministracionModel.cambiarSubRolCop(usuarioId, sub_rol_cop_id || null);

    await AdministracionModel.registrarAccion('CAMBIAR_SUBROL_COP', modificadoPor, {
      tablaAfectada: 'usuario',
      registroId: usuarioId,
      usuarioAfectadoId: usuarioId,
      datosAnteriores: { sub_rol_cop: usuarioAnterior.sub_rol_cop_codigo },
      datosNuevos: { sub_rol_cop_id },
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Sub-rol COP cambiado correctamente' });
  } catch (error) {
    console.error('Error al cambiar sub-rol COP:', error);
    res.status(500).json({ error: 'Error al cambiar sub-rol COP' });
  }
}

export async function cambiarSedeUsuario(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { sede_id } = req.body;

    const usuarioId = parseInt(id);
    const modificadoPor = req.user!.userId;

    const usuarioAnterior = await AdministracionModel.getUsuario(usuarioId);
    if (!usuarioAnterior) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await AdministracionModel.cambiarSedeUsuario(usuarioId, sede_id || null);

    await AdministracionModel.registrarAccion('CAMBIAR_SEDE', modificadoPor, {
      tablaAfectada: 'usuario',
      registroId: usuarioId,
      usuarioAfectadoId: usuarioId,
      datosAnteriores: { sede_id: usuarioAnterior.sede_id },
      datosNuevos: { sede_id },
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Sede cambiada correctamente' });
  } catch (error) {
    console.error('Error al cambiar sede:', error);
    res.status(500).json({ error: 'Error al cambiar sede' });
  }
}

// =====================================================
// CONFIGURACION
// =====================================================

export async function getConfiguracion(_req: Request, res: Response) {
  try {
    const configuracion = await AdministracionModel.getConfiguracion();
    res.json(configuracion);
  } catch (error) {
    console.error('Error al obtener configuracion:', error);
    res.status(500).json({ error: 'Error al obtener configuracion' });
  }
}

export async function setConfiguracion(req: Request, res: Response) {
  try {
    const { clave, valor } = req.body;

    if (!clave || valor === undefined) {
      return res.status(400).json({ error: 'Faltan parametros clave y valor' });
    }

    const modificadoPor = req.user!.userId;

    const configAnterior = await AdministracionModel.getConfiguracionPorClave(clave);

    await AdministracionModel.setConfiguracion(clave, valor, modificadoPor);

    await AdministracionModel.registrarAccion('CAMBIAR_CONFIG', modificadoPor, {
      tablaAfectada: 'configuracion_sistema',
      datosAnteriores: configAnterior ? { valor: configAnterior.valor } : undefined,
      datosNuevos: { clave, valor },
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Configuracion actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar configuracion:', error);
    res.status(500).json({ error: 'Error al actualizar configuracion' });
  }
}

// =====================================================
// ROLES Y SUB-ROLES
// =====================================================

export async function getRoles(_req: Request, res: Response) {
  try {
    const roles = await AdministracionModel.getRoles();
    res.json(roles);
  } catch (error) {
    console.error('Error al obtener roles:', error);
    res.status(500).json({ error: 'Error al obtener roles' });
  }
}

export async function getSubRolesCop(_req: Request, res: Response) {
  try {
    const subRoles = await AdministracionModel.getSubRolesCop();
    res.json(subRoles);
  } catch (error) {
    console.error('Error al obtener sub-roles COP:', error);
    res.status(500).json({ error: 'Error al obtener sub-roles COP' });
  }
}

// =====================================================
// LOG Y AUDITORIA
// =====================================================

export async function getLogAdministracion(req: Request, res: Response) {
  try {
    const { accion, usuario_afectado_id, realizado_por, fecha_desde, fecha_hasta, limite } = req.query;

    const log = await AdministracionModel.getLogAdministracion({
      accion: accion as string,
      usuarioAfectadoId: usuario_afectado_id ? parseInt(usuario_afectado_id as string) : undefined,
      realizadoPor: realizado_por ? parseInt(realizado_por as string) : undefined,
      fechaDesde: fecha_desde ? new Date(fecha_desde as string) : undefined,
      fechaHasta: fecha_hasta ? new Date(fecha_hasta as string) : undefined,
      limite: limite ? parseInt(limite as string) : undefined
    });

    res.json(log);
  } catch (error) {
    console.error('Error al obtener log de administracion:', error);
    res.status(500).json({ error: 'Error al obtener log' });
  }
}

// =====================================================
// ESTADISTICAS
// =====================================================

export async function getEstadisticas(_req: Request, res: Response) {
  try {
    const estadisticas = await AdministracionModel.getEstadisticasAdmin();
    res.json(estadisticas);
  } catch (error) {
    console.error('Error al obtener estadisticas:', error);
    res.status(500).json({ error: 'Error al obtener estadisticas' });
  }
}
