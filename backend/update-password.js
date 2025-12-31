const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/provial_db'
});

async function main() {
  try {
    const hash = await bcrypt.hash('test123', 10);
    console.log('Hash:', hash);

    const result = await pool.query(
      'UPDATE usuario SET password_hash = $1 WHERE username = $2',
      [hash, 'admin']
    );

    console.log('Rows updated:', result.rowCount);

    // Also update COP user 17045
    const hash2 = await bcrypt.hash('test123', 10);
    await pool.query(
      'UPDATE usuario SET password_hash = $1 WHERE username = $2',
      [hash2, '17045']
    );
    console.log('Updated 17045 too');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
