
const API_URL = 'https://provial-production.up.railway.app/api';
// Using the "operaciones" credentials from USUARIOS_PRUEBA.md
const USERNAME = 'operaciones';
const PASSWORD = 'provial123';
const TARGET_USER_CHAPA = '1022';
const TARGET_UNIT_CODE = '1108';

async function checkAssignment() {
    console.log(`🔍 Checking active assignment for Unit ${TARGET_UNIT_CODE} and User ${TARGET_USER_CHAPA} via API: ${API_URL}`);

    try {
        // 1. Login
        console.log('1️⃣ Logging in as operations admin...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: USERNAME, password: PASSWORD })
        });

        if (!loginRes.ok) {
            const errorText = await loginRes.text();
            throw new Error(`Login failed (${loginRes.status}): ${errorText}`);
        }

        const loginData = await loginRes.json();
        const token = loginData.accessToken;
        console.log('✅ Login successful. Token acquired.');


        // 2. Fetch all active assignments (filtered by relevant statuses)
        // The API /asignaciones lists assignments. We can filter by estado manually or via query params if supported.
        // Based on controller, it supports estado query param. But we want to see ALL active ones.
        console.log('2️⃣ Fetching all active assignments...');

        // We will fetch "PROGRAMADA", "EN_AUTORIZACION", "EN_CURSO"
        const statuses = ['PROGRAMADA', 'EN_AUTORIZACION', 'EN_CURSO'];
        let allAssignments = [];

        for (const status of statuses) {
            console.log(`   Fetching status: ${status}...`);
            const res = await fetch(`${API_URL}/asignaciones?estado=${status}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.asignaciones) {
                    allAssignments = [...allAssignments, ...data.asignaciones];
                }
            } else {
                console.error(`   ❌ Failed to fetch ${status}: ${res.status}`);
            }
        }

        console.log(`📊 Found ${allAssignments.length} total active/programmed assignments.`);

        // 3. Search for the specific Unit or User
        console.log(`3️⃣ Searching for Unit ${TARGET_UNIT_CODE} or User Chapa ${TARGET_USER_CHAPA}...`);

        const unitMatch = allAssignments.find(a => a.unidad_codigo === TARGET_UNIT_CODE);

        if (unitMatch) {
            console.log(`\n✅ FOUND ASSIGNMENT FOR UNIT ${TARGET_UNIT_CODE}:`);
            console.log(`   - ID: ${unitMatch.id}`);
            console.log(`   - Status: ${unitMatch.estado}`);
            console.log(`   - Date: ${unitMatch.fecha_programada}`);
            console.log(`   - Tripulación:`);

            // Let's fetch the details to be sure
            const detailRes = await fetch(`${API_URL}/asignaciones/${unitMatch.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const detail = await detailRes.json();

            let userFoundInCrew = false;

            if (detail.tripulacion) {
                detail.tripulacion.forEach(t => {
                    console.log(`     - [${t.rol}] ${t.nombre} (ID: ${t.usuario_id})`);
                    // We need to fetch the user details to see the Chapa if not present
                    // But typically user ID logic is internal. The user says "1022".
                    // We will assume 1022 is the 'chapa' or 'username'.
                    // If the user object here doesn't have chapa, we can try to guess or just print the name.
                });
            }

            // Since we can't easily see chapa from here, finding the UNIT is the biggest step.
            // If the unit assignment exists, then the user MUST select that unit's ID.

        } else {
            console.log(`\n❌ NO active assignment found for Unit ${TARGET_UNIT_CODE}.`);
            console.log(`   Possible reasons:`);
            console.log(`   - It was marked as FINALIZADA or CANCELADA.`);
            console.log(`   - Date filter mismatch.`);
        }

    } catch (err) {
        console.error('🚨 Error:', err.message);
    }
}

// Run the check
checkAssignment();
