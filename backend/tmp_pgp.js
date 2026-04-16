const pgp = require('pg-promise')();
const db = pgp('postgresql://postgres:ifbdslrLVlNfacUAHUHirdDQKOODrSuT@maglev.proxy.rlwy.net:31911/railway');

async function test() {
  try {
    const unidad_id = 378;
    const limit = 50;
    const filters = { limit };
    const params = { unidad_id };
    
    // Exact same query string as in getBitacoraUnidad
    const query = `
      WITH salidas AS (
        SELECT su.id, su.unidad_id, su.estado, su.fecha_hora_salida, su.fecha_hora_regreso,
               su.ruta_inicial_id, su.km_inicial, su.combustible_inicial, su.km_final,
               su.combustible_final,
               COALESCE(su.tripulacion, '[]'::jsonb) as tripulacion,
               su.observaciones_salida,
               su.observaciones_regreso, su.finalizada_por
        FROM salida_unidad su
        WHERE su.unidad_id = $/unidad_id/
        ORDER BY su.fecha_hora_salida DESC
        LIMIT ${limit}
      )
      -- UNION: salidas + situaciones de esas salidas + actividades de esas salidas
      SELECT * FROM (
        -- 1) Las salidas como registros de jornada
        SELECT
          sal.id,
          'SALIDA' as tipo_registro,
          CASE sal.estado WHEN 'EN_SALIDA' THEN 'INICIO_JORNADA' ELSE 'FIN_JORNADA' END as tipo_situacion,
          CASE sal.estado WHEN 'EN_SALIDA' THEN 'Inicio de Jornada' ELSE 'Fin de Jornada' END as subtipo_nombre,
          sal.estado,
          sal.observaciones_salida as descripcion,
          CASE 
            WHEN sal.observaciones_regreso IS NULL THEN '[]'::jsonb 
            ELSE jsonb_build_array(jsonb_build_object('usuario', 'Sistema', 'hora', to_char(sal.fecha_hora_salida, 'HH24:MI'), 'mensaje', sal.observaciones_regreso)) 
          END as observaciones,
          sal.fecha_hora_salida as created_at,
          r.codigo as ruta_codigo,
          sal.km_inicial as km,
          NULL::text as sentido,
          sal.id as salida_id,
          u.codigo as unidad_codigo,
          u.tipo_unidad,
          uf.nombre_completo as creado_por_nombre,
          NULL::text as icono,
          NULL::text as color,
          sal.fecha_hora_salida,
          r.codigo as salida_ruta_codigo,
          sal.km_inicial as salida_km_inicial,
          sal.combustible_inicial as salida_combustible_inicial,
          sal.tripulacion,
          NULL::jsonb as datos
        FROM salidas sal
        LEFT JOIN unidad u ON sal.unidad_id = u.id
        LEFT JOIN ruta r ON sal.ruta_inicial_id = r.id
        LEFT JOIN usuario uf ON sal.finalizada_por = uf.id

        UNION ALL

        -- 2) Situaciones vinculadas a esas salidas
        SELECT
          s.id,
          'SITUACION' as tipo_registro,
          s.tipo_situacion,
          cts.nombre as subtipo_nombre,
          s.estado,
          COALESCE(s.observaciones->0->>'mensaje', '')::text as descripcion,
          COALESCE(s.observaciones, '[]'::jsonb) as observaciones,
          s.created_at,
          r.codigo as ruta_codigo,
          s.km,
          s.sentido,
          s.salida_unidad_id as salida_id,
          u.codigo as unidad_codigo,
          u.tipo_unidad,
          us.nombre_completo as creado_por_nombre,
          cts.icono as icono,
          cts.color as color,
          NULL::timestamptz as fecha_hora_salida,
          NULL::text as salida_ruta_codigo,
          NULL::numeric as salida_km_inicial,
          NULL::numeric as salida_combustible_inicial,
          sal.tripulacion,
          NULL::jsonb as datos
        FROM situacion s
        INNER JOIN salidas sal ON s.salida_unidad_id = sal.id
        LEFT JOIN unidad u ON s.unidad_id = u.id
        LEFT JOIN ruta r ON s.ruta_id = r.id
        LEFT JOIN catalogo_tipo_situacion cts ON s.tipo_situacion_id = cts.id
        LEFT JOIN usuario us ON s.creado_por = us.id

        UNION ALL

        -- 3) Actividades vinculadas a esas salidas
        SELECT
          a.id,
          'ACTIVIDAD' as tipo_registro,
          cts.nombre as tipo_situacion,
          cts.nombre as subtipo_nombre,
          a.estado,
          COALESCE(a.observaciones->0->>'mensaje', '')::text as descripcion,
          COALESCE(a.observaciones, '[]'::jsonb) as observaciones,
          a.created_at,
          r.codigo as ruta_codigo,
          a.km,
          a.sentido,
          a.salida_unidad_id as salida_id,
          u.codigo as unidad_codigo,
          u.tipo_unidad,
          us.nombre_completo as creado_por_nombre,
          cts.icono as icono,
          cts.color as color,
          NULL::timestamptz as fecha_hora_salida,
          NULL::text as salida_ruta_codigo,
          NULL::numeric as salida_km_inicial,
          NULL::numeric as salida_combustible_inicial,
          sal.tripulacion,
          a.datos
        FROM actividad a
        INNER JOIN salidas sal ON a.salida_unidad_id = sal.id
        LEFT JOIN unidad u ON a.unidad_id = u.id
        LEFT JOIN ruta r ON a.ruta_id = r.id
        LEFT JOIN catalogo_tipo_situacion cts ON a.tipo_actividad_id = cts.id
        LEFT JOIN usuario us ON a.creado_por = us.id
      ) combined
      ORDER BY created_at DESC
    `;
    
    const bitacora = await db.manyOrNone(query, params);
    console.log("Success with pg-promise, rows:", bitacora.length);
  } catch(e) {
    console.error("PG-PROMISE ERROR:", e);
  }
}

test();
