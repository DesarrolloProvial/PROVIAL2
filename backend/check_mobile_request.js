
const API_URL = 'https://provial-production.up.railway.app/api';
// Using the "BRIGADA" user credentials directly
const USERNAME = '1022';
const PASSWORD = 'provial123';

async function checkMobileView() {
    console.log(`📱 Simulating Mobile App Request for User ${USERNAME}...`);

    try {
        // 1. Login
        console.log('1️⃣ Logging in as 1022...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: USERNAME, password: PASSWORD })
        });

        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.status}`);
        }

        const loginData = await loginRes.json();
        const token = loginData.accessToken;
        console.log('✅ Login successful.');
        console.log(`   User ID in token: ${loginData.user.id}`);


        // 2. GET /asignaciones/mi-asignacion
        console.log('2️⃣ Calling GET /asignaciones/mi-asignacion...');
        const res = await fetch(`${API_URL}/asignaciones/mi-asignacion`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            if (data.asignacion) {
                console.log('✅ SUCCESS! The API returned an assignment:');
                console.log(`   - ID: ${data.asignacion.id}`);
                console.log(`   - Unit: ${data.asignacion.unidad_codigo}`);
                console.log(`   - Status: ${data.asignacion.estado}`);
                console.log(`   - Date: ${data.asignacion.fecha_programada}`);
            } else {
                console.log('⚠️ API returned OK 200, but "asignacion" is NULL.');
                console.log('   Response:', JSON.stringify(data));
            }
        } else {
            console.error(`❌ API Error: ${res.status}`);
            const txt = await res.text();
            console.log('   Body:', txt);
        }

    } catch (err) {
        console.error('🚨 Error:', err.message);
    }
}

checkMobileView();
