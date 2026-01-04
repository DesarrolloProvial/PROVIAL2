import { Request, Response } from 'express';
import { db } from '../config/database';

// GET /api/roles - Listar roles con sus permisos
export async function listarRoles(req: Request, res: Response) {
    try {
        const roles = await db.any(`
      SELECT r.id, r.nombre, r.descripcion,
             COALESCE(json_agg(p.*) FILTER (WHERE p.id IS NOT NULL), '[]') as permisos
      FROM rol r
      LEFT JOIN rol_permiso rp ON r.id = rp.rol_id
      LEFT JOIN permiso p ON rp.permiso_id = p.id
      GROUP BY r.id
      ORDER BY r.nombre
    `);
        return res.json(roles);
    } catch (error) {
        console.error('Error listing roles:', error);
        return res.status(500).json({ error: 'Error al listar roles' });
    }
}

// GET /api/roles/permisos - Listar permisos disponibles
export async function listarPermisos(req: Request, res: Response) {
    try {
        const permisos = await db.any('SELECT * FROM permiso ORDER BY modulo, nombre');
        return res.json(permisos);
    } catch (error) {
        console.error('Error listing permissions:', error);
        return res.status(500).json({ error: 'Error al listar permisos' });
    }
}

// POST /api/roles - Crear rol
export async function crearRol(req: Request, res: Response) {
    try {
        const { nombre, descripcion, permisos_ids } = req.body;
        if (!nombre) return res.status(400).json({ error: 'Nombre es requerido' });

        const rol = await db.tx(async t => {
            const r = await t.one('INSERT INTO rol (nombre, descripcion) VALUES ($1, $2) RETURNING *', [nombre, descripcion]);

            if (permisos_ids && Array.isArray(permisos_ids) && permisos_ids.length > 0) {
                const insertValues = permisos_ids.map((pid: number) => `(${r.id}, ${pid})`).join(',');
                await t.none(`INSERT INTO rol_permiso (rol_id, permiso_id) VALUES ${insertValues}`);
            }

            return r;
        });

        return res.status(201).json(rol);
    } catch (error) {
        console.error('Error creating role:', error);
        return res.status(500).json({ error: 'Error al crear rol' });
    }
}

// PUT /api/roles/:id - Actualizar rol
export async function actualizarRol(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { nombre, descripcion, permisos_ids } = req.body;

        await db.tx(async t => {
            if (nombre) {
                await t.none('UPDATE rol SET nombre = $1, descripcion = COALESCE($2, descripcion) WHERE id = $3', [nombre, descripcion, id]);
            }

            if (permisos_ids && Array.isArray(permisos_ids)) {
                // Replace permissions
                await t.none('DELETE FROM rol_permiso WHERE rol_id = $1', [id]);
                if (permisos_ids.length > 0) {
                    const insertValues = permisos_ids.map((pid: number) => `(${id}, ${pid})`).join(',');
                    await t.none(`INSERT INTO rol_permiso (rol_id, permiso_id) VALUES ${insertValues}`);
                }
            }
        });

        return res.json({ message: 'Rol actualizado' });
    } catch (error) {
        console.error('Error updating role:', error);
        return res.status(500).json({ error: 'Error al actualizar rol' });
    }
}

// DELETE /api/roles/:id - Eliminar rol
export async function eliminarRol(req: Request, res: Response) {
    try {
        const { id } = req.params;
        // Check usage? Cascade delete will handle rol_permiso, but usuario reference might fail if FK exists?
        // User table likely references rol(id).
        // Should check if users exist.
        const usersCount = await db.one('SELECT count(*) FROM usuario WHERE rol_id = $1', [id]);
        if (parseInt(usersCount.count) > 0) {
            return res.status(400).json({ error: 'No se puede eliminar rol con usuarios asignados' });
        }

        await db.none('DELETE FROM rol WHERE id = $1', [id]);
        return res.json({ message: 'Rol eliminado' });
    } catch (error) {
        console.error('Error deleting role:', error);
        return res.status(500).json({ error: 'Error al eliminar rol' });
    }
}
