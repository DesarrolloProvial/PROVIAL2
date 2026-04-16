const { Client } = require('pg');
async function test() {
  const client = new Client({connectionString: 'postgresql://postgres:ifbdslrLVlNfacUAHUHirdDQKOODrSuT@maglev.proxy.rlwy.net:31911/railway'});
  await client.connect();
  try {
    const res = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
    console.log(res.rows.map(r => r.table_name).join(', '));
  } catch(e) {
    console.error('SQL ERROR:', e.message);
  }
  await client.end();
}
test();
