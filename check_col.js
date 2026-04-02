const { Client } = require('pg');
const c = new Client('postgresql://postgres:ifbdslrLVlNfacUAHUHirdDQKOODrSuT@maglev.proxy.rlwy.net:31911/railway');
c.connect().then(()=>c.query("SELECT data_type FROM information_schema.columns WHERE table_name='situacion' AND column_name='observaciones'"))
  .then(r => { console.log(r.rows); c.end() });
