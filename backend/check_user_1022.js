
const API_URL = 'https://provial-production.up.railway.app/api';
const USERNAME = 'operaciones';
const PASSWORD = 'provial123';
const TARGET_USERNAME = '1022';

async function checkUser() {
    console.log(`Checking User Details for Username: ${TARGET_USERNAME}...`);

    try {
        // Login
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: USERNAME, password: PASSWORD })
        });
        const { accessToken } = await loginRes.json();

        // To check a specific user, we usually need an Admin endpoint like /usuarios
        // Let's try fetching all BRIGADA users and finding 1022, or if there is a search endpoint.
        // Based on `usuariosController`, maybe there is a list endpoint.
        // `backend/src/routes/usuarios.routes.ts` or similar? 
        // I'll try /usuarios first (if I am admin/operaciones I might see them).

        // Attempt to list users and find 1022
        const res = await fetch(`${API_URL}/brigadas`, { // Try brigadas endpoint first
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (res.ok) {
            const data = await res.json();
            // data.brigadas usually
            const brigadas = data.brigadas || data;

            const match = brigadas.find(u => u.usuario === TARGET_USERNAME || u.chapa === TARGET_USERNAME);

            if (match) {
                console.log(`\n✅ FOUND User ${TARGET_USERNAME}:`);
                console.log(`   - ID: ${match.id}`);
                console.log(`   - Nombre: ${match.nombre || match.nombre_completo}`);
                console.log(`   - Chapa: ${match.chapa}`);
                console.log(`   - Usuario: ${match.usuario}`);

                // Now compare with Crew IDs from previous check (20, 28)
                if (match.id === 20 || match.id === 28) {
                    console.log(`\n🎉 MATCH! This user IS in the crew of Assignment 45.`);
                } else {
                    console.log(`\n🚫 MISMATCH! This user's ID (${match.id}) is NOT in the crew of Assignment 45 (Ids: 20, 28).`);
                    console.log(`   This explains why they cannot see the assignment.`);
                }

            } else {
                console.log(`\n❌ User ${TARGET_USERNAME} not found in /brigadas list.`);
            }
        } else {
            console.log(`Failed to fetch /brigadas: ${res.status}`);
        }

    } catch (err) {
        console.error(err);
    }
}

checkUser();
