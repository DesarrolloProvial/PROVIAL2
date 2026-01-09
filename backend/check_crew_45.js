
const API_URL = 'https://provial-production.up.railway.app/api';
const USERNAME = 'operaciones';
const PASSWORD = 'provial123';
const TARGET_ID = '45';

async function checkCrew() {
    console.log(`Checking Crew for Assignment ${TARGET_ID}...`);

    try {
        // Login
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: USERNAME, password: PASSWORD })
        });
        const { accessToken } = await loginRes.json();

        // Fetch Assignment
        const res = await fetch(`${API_URL}/asignaciones/${TARGET_ID}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await res.json();

        console.log(`\n📋 Assignment ${data.id} - Unit: ${data.unidad_codigo}`);
        console.log(`   Status: ${data.estado}`);
        console.log(`   Date: ${data.fecha_programada}`);

        console.log('\n👥 Tripulación (Crew):');
        if (data.tripulacion) {
            data.tripulacion.forEach(t => {
                console.log(`   - ID: ${t.usuario_id} | Name: ${t.nombre} | Rol: ${t.rol_tripulacion} | Chapa: ${t.chapa || 'N/A'}`);
            });
        } else {
            console.log('   (No crew data found)');
        }

    } catch (err) {
        console.error(err);
    }
}

checkCrew();
