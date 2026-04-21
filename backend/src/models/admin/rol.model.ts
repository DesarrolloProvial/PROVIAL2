import { db } from '../../config/database';

export const RolModel = {
  async listar(): Promise<any[]> {
    return db.any(`
      SELECT r.id, r.nombre, r.descripcion,
             COALESCE(json_agg(p.*) FILTER (WHERE p.id IS NOT NULL), '[]') as permisos
      FROM rol r
      LEFT JOIN rol_permiso rp ON r.id = rp.rol_id
      LEFT JOIN permiso p ON rp.permiso_id = p.id
      GROUP BY r.id
      ORDER BY r.nombre
    `);
  },

  async listarPermisos(): Promise<any[]> {
    return db.any('SELECT * FROM permiso ORDER BY modulo, nombre');
  },

  async contarUsuarios(rolId: number): Promise<number> {
    const r = await db.one('SELECT count(*) FROM usuario WHERE rol_id = $1', [rolId]);
    return parseInt(r.count);
  },

  async crear(nombre: string, descripcion: string | null, permisosIds: number[]): Promise<any> {
    return db.tx(async t => {
      const rol = await t.one(
        'INSERT INTO rol (nombre, descripcion) VALUES ($1, $2) RETURNING *',
        [nombre, descripcion]
      );
      for (const pid of permisosIds) {
        await t.none('INSERT INTO rol_permiso (rol_id, permiso_id) VALUES ($1, $2)', [rol.id, pid]);
      }
      return rol;
    });
  },

  async actualizar(id: number, nombre: string | null, descripcion: string | null, permisosIds: number[] | null): Promise<void> {
    return db.tx(async t => {
      if (nombre) {
        await t.none(
          'UPDATE rol SET nombre = $1, descripcion = COALESCE($2, descripcion) WHERE id = $3',
          [nombre, descripcion, id]
        );
      }
      if (permisosIds !== null) {
        await t.none('DELETE FROM rol_permiso WHERE rol_id = $1', [id]);
        for (const pid of permisosIds) {
          await t.none('INSERT INTO rol_permiso (rol_id, permiso_id) VALUES ($1, $2)', [id, pid]);
        }
      }
    });
  },

  async eliminar(id: number): Promise<void> {
    await db.none('DELETE FROM rol WHERE id = $1', [id]);
  },
};
