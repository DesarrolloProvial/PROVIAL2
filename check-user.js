const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'provabordo',
    user: 'postgres',
    password: 'postgres'
  });

  try {
    await client.connect();
    console.log('Conectado a la base de datos');

    // Buscar usuario 19109
    const result = await client.query(`
      SELECT id, username, chapa, nombre_completo, rol_id, activo, acceso_app,
             password_hash, email,
             r.nombre as rol_nombre
      FROM usuario u
      JOIN rol r ON u.rol_id = r.id
      WHERE u.chapa = '19109' OR u.id = 19109 OR u.username = '19109'
    `);

    if (result.rows.length === 0) {
      console.log('Usuario no encontrado');
    } else {
      const user = result.rows[0];
      console.log('Usuario encontrado:');
      console.log('  ID:', user.id);
      console.log('  Username:', user.username);
      console.log('  Chapa:', user.chapa);
      console.log('  Nombre:', user.nombre_completo);
      console.log('  Rol ID:', user.rol_id, '(' + user.rol_nombre + ')');
      console.log('  Activo:', user.activo);
      console.log('  Acceso App:', user.acceso_app);
      console.log('  Password hash (primeros 20 chars):', user.password_hash?.substring(0, 20));
      console.log('  Password hash length:', user.password_hash?.length);

      // Verificar si el hash es válido
      if (user.password_hash) {
        const bcrypt = require('bcryptjs');
        const isValid = await bcrypt.compare('password123', user.password_hash);
        console.log('  Password "password123" válida:', isValid);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

main();
