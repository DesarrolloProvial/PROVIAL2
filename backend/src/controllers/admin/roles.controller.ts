import { Request, Response } from 'express';
import { RolModel } from '../../models/admin/rol.model';
import { normalizeId } from '../../utils/db.utils';

export async function listarRoles(_req: Request, res: Response) {
  try {
    const roles = await RolModel.listar();
    return res.json(roles);
  } catch (error) {
    console.error('Error listing roles:', error);
    return res.status(500).json({ error: 'Error al listar roles' });
  }
}

export async function listarPermisos(_req: Request, res: Response) {
  try {
    const permisos = await RolModel.listarPermisos();
    return res.json(permisos);
  } catch (error) {
    console.error('Error listing permissions:', error);
    return res.status(500).json({ error: 'Error al listar permisos' });
  }
}

export async function crearRol(req: Request, res: Response) {
  try {
    const { nombre, descripcion, permisos_ids } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre es requerido' });
    const permisosIds: number[] = Array.isArray(permisos_ids)
      ? permisos_ids.map(Number).filter(n => Number.isInteger(n) && n > 0)
      : [];
    const rol = await RolModel.crear(nombre, descripcion || null, permisosIds);
    return res.status(201).json(rol);
  } catch (error) {
    console.error('Error creating role:', error);
    return res.status(500).json({ error: 'Error al crear rol' });
  }
}

export async function actualizarRol(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    const { nombre, descripcion, permisos_ids } = req.body;
    const permisosIds = Array.isArray(permisos_ids)
      ? permisos_ids.map(Number).filter(n => Number.isInteger(n) && n > 0)
      : null;
    await RolModel.actualizar(id, nombre || null, descripcion || null, permisosIds);
    return res.json({ message: 'Rol actualizado' });
  } catch (error) {
    console.error('Error updating role:', error);
    return res.status(500).json({ error: 'Error al actualizar rol' });
  }
}

export async function eliminarRol(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    const count = await RolModel.contarUsuarios(id);
    if (count > 0) return res.status(400).json({ error: 'No se puede eliminar rol con usuarios asignados' });
    await RolModel.eliminar(id);
    return res.json({ message: 'Rol eliminado' });
  } catch (error) {
    console.error('Error deleting role:', error);
    return res.status(500).json({ error: 'Error al eliminar rol' });
  }
}
