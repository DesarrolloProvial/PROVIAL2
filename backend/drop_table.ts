import { db } from './src/config/database';

async function run() {
  try {
    await db.none('DROP TABLE IF EXISTS aviso_asignacion CASCADE;');
    console.log('Tabla eliminada exitosamente.');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

run();
